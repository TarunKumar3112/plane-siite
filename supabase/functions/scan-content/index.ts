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
  'google.com': 'Google Images',
  'houzz.com': 'Houzz',
  'behance.net': 'Behance',
  'e-flux.com': 'e-flux',
  'azuremagazine.com': 'Azure Magazine',
};

function extractPlatform(url: string): string {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    for (const [domain, name] of Object.entries(PLATFORM_MAP)) {
      if (host.includes(domain)) return name;
    }
    // Capitalize first segment as fallback
    return host.split('.')[0].charAt(0).toUpperCase() + host.split('.')[0].slice(1);
  } catch {
    return url;
  }
}

function inferSentiment(text: string): 'Positive' | 'Neutral' | 'Negative' {
  const lower = (text || '').toLowerCase();
  const positive = ['award', 'stunning', 'excellent', 'impressive', 'beautiful', 'innovative', 'remarkable', 'outstanding', 'celebrated', 'acclaimed'];
  const negative = ['poor', 'fail', 'disappoint', 'criticize', 'controversial', 'problematic', 'inadequate'];
  if (positive.some((w) => lower.includes(w))) return 'Positive';
  if (negative.some((w) => lower.includes(w))) return 'Negative';
  return 'Neutral';
}

function inferStatus(resultUrl: string, originalUrl: string, snippet: string): 'Original' | 'Reposted' | 'Cited' | 'Uncredited' {
  if (resultUrl === originalUrl) return 'Original';
  const lower = (snippet || '').toLowerCase();
  const creditTerms = ['plane-site', 'plane—site', 'planesite', 'photo by', 'photography by', 'courtesy of', 'credit:', 'via:'];
  if (creditTerms.some((t) => lower.includes(t))) return 'Cited';
  // If the snippet quotes or embeds content but no credit found
  if (lower.includes('repost') || lower.includes('shared from') || lower.includes('originally')) return 'Reposted';
  return 'Uncredited';
}

// ── Vision API: for Photo and Video content ──────────────────────────────────
async function scanWithVision(imageUrl: string, originalUrl: string, apiKey: string) {
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { source: { imageUri: imageUrl } },
          features: [{ type: 'WEB_DETECTION', maxResults: 20 }],
        }],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vision API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const web = data.responses?.[0]?.webDetection;
  if (!web) return [];

  const pages: Array<{ url: string; pageTitle?: string }> = [
    ...(web.pagesWithMatchingImages || []),
  ];

  const today = new Date().toISOString().split('T')[0];

  return pages
    .filter((p) => p.url && !p.url.includes('googleusercontent'))
    .map((p, i) => ({
      id: `r${Date.now()}-${i}`,
      platform: extractPlatform(p.url),
      url: p.url,
      dateDetected: today,
      sentiment: inferSentiment(p.pageTitle || ''),
      status: inferStatus(p.url, originalUrl, p.pageTitle || ''),
    }));
}

// ── Custom Search API: for Article, Project, Press Release ───────────────────
async function scanWithCustomSearch(title: string, originalUrl: string, apiKey: string, cseId: string) {
  const query = encodeURIComponent(`"${title}"`);
  const res = await fetch(
    `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${query}&num=10`
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Custom Search API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  if (!data.items?.length) return [];

  const today = new Date().toISOString().split('T')[0];

  return data.items.map((item: { link: string; snippet: string }, i: number) => ({
    id: `r${Date.now()}-${i}`,
    platform: extractPlatform(item.link),
    url: item.link,
    dateDetected: today,
    sentiment: inferSentiment(item.snippet),
    status: inferStatus(item.link, originalUrl, item.snippet),
  }));
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { contentType, title, imageUrl, originalUrl } = await req.json();

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    const GOOGLE_CSE_ID = Deno.env.get('GOOGLE_CSE_ID');

    if (!GOOGLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_API_KEY secret not set' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    let results = [];

    if (contentType === 'Photo' || contentType === 'Video') {
      if (!imageUrl) {
        return new Response(
          JSON.stringify({ error: 'imageUrl required for Photo/Video content' }),
          { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
        );
      }
      results = await scanWithVision(imageUrl, originalUrl, GOOGLE_API_KEY);
    } else {
      if (!GOOGLE_CSE_ID) {
        return new Response(
          JSON.stringify({ error: 'GOOGLE_CSE_ID secret not set' }),
          { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
        );
      }
      results = await scanWithCustomSearch(title, originalUrl, GOOGLE_API_KEY, GOOGLE_CSE_ID);
    }

    return new Response(JSON.stringify(results), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
