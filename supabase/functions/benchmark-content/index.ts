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
  'medium.com': 'Medium',
  'designboom.com': 'Designboom',
  'uncubemagazine.com': 'uncube',
  'architecturaldigest.com': 'Architectural Digest',
};

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

function analyzeSentiment(title: string, snippet: string): 'Positive' | 'Neutral' | 'Negative' {
  const text = ((title || '') + ' ' + (snippet || '')).toLowerCase();
  const positive = [
    'award', 'excellent', 'stunning', 'impressive', 'beautiful', 'innovative', 'remarkable',
    'outstanding', 'acclaimed', 'inspiring', 'groundbreaking', 'brilliant', 'exceptional',
    'best', 'leading', 'praised', 'renowned', 'success', 'celebrated', 'powerful', 'compelling',
  ];
  const negative = [
    'poor', 'fail', 'failure', 'disappoint', 'criticize', 'controversial', 'problematic',
    'inadequate', 'scandal', 'concern', 'complaint', 'bad', 'terrible', 'flawed', 'misleading',
  ];
  let score = 0;
  positive.forEach(w => { if (text.includes(w)) score += 1; });
  negative.forEach(w => { if (text.includes(w)) score -= 2; });
  if (score > 0) return 'Positive';
  if (score < 0) return 'Negative';
  return 'Neutral';
}

function inferContentType(title: string, snippet: string, url: string): string {
  const text = ((title || '') + ' ' + (snippet || '') + ' ' + url).toLowerCase();
  if (url.includes('youtube.com') || url.includes('vimeo.com') || text.includes('video') || text.includes('film')) return 'Video';
  if (text.includes('photo essay') || text.includes('photography') || text.includes('photo series')) return 'Photo';
  if (text.includes('press release') || text.includes('announcement')) return 'Press Release';
  if (text.includes('project') || text.includes('installation')) return 'Project';
  return 'Article';
}

// Build search queries from content metadata
function buildQueries(title: string, tags: string[], contentType: string): string[] {
  const queries: string[] = [];

  // Exact title — finds who else covers the same topic
  if (title) queries.push(`"${title}"`);

  // Top tags + field — finds topic coverage across the architecture sphere
  const topTags = (tags || []).slice(0, 3);
  if (topTags.length >= 2) {
    queries.push(`${topTags.join(' ')} architecture`);
  }

  // Tags + medium-specific term — finds competitors in the same format
  const typeKeyword = {
    Photo: 'photography documentation',
    Video: 'video documentary',
    Article: 'essay analysis',
    Project: 'design project',
    'Press Release': 'announcement media',
  }[contentType] ?? 'documentation';

  if (topTags.length >= 1) {
    queries.push(`${topTags.slice(0, 2).join(' ')} ${typeKeyword}`);
  }

  return queries;
}

async function searchContent(query: string, apiKey: string, cseId: string): Promise<any[]> {
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
    const { title, tags, contentType } = await req.json();

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    const GOOGLE_CSE_ID = Deno.env.get('GOOGLE_CSE_ID');

    if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_API_KEY and GOOGLE_CSE_ID secrets are required' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    const queries = buildQueries(title, tags || [], contentType || 'Article');
    const today = new Date().toISOString().split('T')[0];

    const results = await Promise.allSettled(
      queries.map(q => searchContent(q, GOOGLE_API_KEY, GOOGLE_CSE_ID))
    );

    const seen = new Set<string>();
    const items: any[] = [];

    queries.forEach((query, qi) => {
      const result = results[qi];
      if (result.status !== 'fulfilled') return;

      for (const item of result.value) {
        if (!item.link || seen.has(item.link)) continue;
        if (item.link.includes('plane-site.com')) continue;
        seen.add(item.link);

        const text = ((item.title || '') + ' ' + (item.snippet || '')).toLowerCase();
        const matchedTags = (tags || []).filter((t: string) => text.includes(t.toLowerCase()));
        const relevanceScore = Math.min(10, Math.max(1,
          Math.round((matchedTags.length / Math.max(1, (tags || []).length)) * 10)
        ));

        items.push({
          id: `bench${Date.now()}-${items.length}`,
          query,
          platform: extractPlatform(item.link),
          url: item.link,
          title: item.title || '',
          snippet: item.snippet || '',
          dateDetected: today,
          sentiment: analyzeSentiment(item.title || '', item.snippet || ''),
          inferredType: inferContentType(item.title || '', item.snippet || '', item.link),
          matchedTags,
          relevanceScore,
        });
      }
    });

    // Sort by relevance descending
    items.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return new Response(JSON.stringify({ items, queries }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
