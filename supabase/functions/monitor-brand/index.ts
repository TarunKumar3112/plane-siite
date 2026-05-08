const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLATFORM_MAP: Record<string, string> = {
  'archdaily.com': 'Archdaily',
  'dezeen.com': 'Dezeen',
  'archinect.com': 'Archinect',
  'wallpaper.com': 'Wallpaper*',
  'domusweb.it': 'Domus',
  'frame-web.com': 'Frame Magazine',
  'divisare.com': 'Divisare',
  'architizer.com': 'Architizer',
  'archrecord.construction.com': 'Architectural Record',
  'metalocus.es': 'Metalocus',
  'instagram.com': 'Instagram',
  'linkedin.com': 'LinkedIn',
  'vimeo.com': 'Vimeo',
  'youtube.com': 'YouTube',
  'pinterest.com': 'Pinterest',
  'houzz.com': 'Houzz',
  'behance.net': 'Behance',
  'e-flux.com': 'e-flux',
  'azuremagazine.com': 'Azure Magazine',
  'reddit.com': 'Reddit',
  'twitter.com': 'Twitter',
  'x.com': 'X (Twitter)',
  'facebook.com': 'Facebook',
  'medium.com': 'Medium',
  'issuu.com': 'Issuu',
  'designboom.com': 'Designboom',
  'uncubemagazine.com': 'uncube',
};

// Multiple query variants to maximize brand mention discovery
const BRAND_QUERIES = [
  '"plane-site"',
  '"plane—site"',
  '"plane site" architecture',
  '"plane_site"',
  '"plane-site.com"',
];

function extractPlatform(url: string): string {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    for (const [domain, name] of Object.entries(PLATFORM_MAP)) {
      if (host.includes(domain)) return name;
    }
    const seg = host.split('.')[0];
    return seg.charAt(0).toUpperCase() + seg.slice(1);
  } catch {
    return url;
  }
}

function categorize(url: string): string {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    if (['instagram.com', 'twitter.com', 'x.com', 'linkedin.com', 'facebook.com', 'threads.net', 'tiktok.com'].some(d => host.includes(d))) return 'Social';
    if (['archdaily.com', 'dezeen.com', 'archinect.com', 'domusweb.it', 'wallpaper.com', 'archrecord', 'metalocus.es', 'azuremagazine', 'frame-web.com', 'divisare.com', 'architizer.com', 'e-flux.com', 'architecturaldigest.com', 'designboom.com', 'uncubemagazine.com'].some(d => host.includes(d))) return 'Press';
    if (['reddit.com', 'quora.com', 'stackexchange.com', 'forum', 'community'].some(d => host.includes(d))) return 'Forum';
    if (['medium.com', 'substack.com', 'wordpress.com', 'blogspot.com', 'tumblr.com'].some(d => host.includes(d))) return 'Blog';
    return 'News';
  } catch {
    return 'Other';
  }
}

function analyzeSentiment(title: string, snippet: string): 'Positive' | 'Neutral' | 'Negative' {
  const text = ((title || '') + ' ' + (snippet || '')).toLowerCase();

  const positiveTerms = [
    'award', 'excellent', 'stunning', 'impressive', 'beautiful', 'innovative', 'remarkable',
    'outstanding', 'celebrated', 'acclaimed', 'inspiring', 'groundbreaking', 'visionary',
    'brilliant', 'exceptional', 'best', 'leading', 'praised', 'renowned', 'success',
    'winner', 'recognition', 'honor', 'feature', 'recommended', 'influential', 'iconic',
    'praised', 'masterful', 'powerful', 'moving', 'thought-provoking', 'compelling',
  ];
  const negativeTerms = [
    'poor', 'fail', 'failure', 'disappoint', 'criticize', 'criticism', 'controversial',
    'problematic', 'inadequate', 'scandal', 'plagiar', 'stolen', 'copied', 'concern',
    'complaint', 'wrong', 'bad', 'terrible', 'worst', 'misleading', 'false', 'flawed',
  ];

  let score = 0;
  positiveTerms.forEach(w => { if (text.includes(w)) score += 1; });
  negativeTerms.forEach(w => { if (text.includes(w)) score -= 2; });

  if (score > 0) return 'Positive';
  if (score < 0) return 'Negative';
  return 'Neutral';
}

async function searchBrand(query: string, apiKey: string, cseId: string): Promise<any[]> {
  const res = await fetch(
    `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(query)}&num=10`
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Custom Search API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.items || [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    const GOOGLE_CSE_ID = Deno.env.get('GOOGLE_CSE_ID');

    if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_API_KEY and GOOGLE_CSE_ID secrets are required' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const seen = new Set<string>();
    const mentions: any[] = [];

    // Run all queries in parallel, tolerate individual failures
    const results = await Promise.allSettled(
      BRAND_QUERIES.map(q => searchBrand(q, GOOGLE_API_KEY, GOOGLE_CSE_ID))
    );

    BRAND_QUERIES.forEach((query, qi) => {
      const result = results[qi];
      if (result.status !== 'fulfilled') return;

      for (const item of result.value) {
        if (!item.link || seen.has(item.link)) continue;
        // Exclude official domain from brand mentions
        if (item.link.includes('plane-site.com')) continue;
        seen.add(item.link);

        mentions.push({
          id: `bm${Date.now()}-${mentions.length}`,
          query,
          platform: extractPlatform(item.link),
          url: item.link,
          title: item.title || '',
          snippet: item.snippet || '',
          dateDetected: today,
          sentiment: analyzeSentiment(item.title || '', item.snippet || ''),
          category: categorize(item.link),
        });
      }
    });

    return new Response(JSON.stringify(mentions), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
