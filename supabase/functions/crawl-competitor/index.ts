const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ARCHITECTURE_TOPICS = [
  { title: 'Architecture Biennale 2024: A New Critical Vocabulary', tags: ['biennale', 'architecture', 'criticism'], content_type: 'Article' },
  { title: 'Spatial Storytelling and the Documentary Turn', tags: ['documentation', 'spatial', 'media', 'architecture'], content_type: 'Article' },
  { title: 'Landscape Architecture in the Climate Era', tags: ['landscape', 'architecture', 'sustainability'], content_type: 'Article' },
  { title: 'Urban Memory: How Cities Negotiate Their Pasts', tags: ['urban', 'memory', 'city', 'architecture'], content_type: 'Article' },
  { title: 'Photography and the Architectural Gaze', tags: ['photography', 'architecture', 'visual'], content_type: 'Photo' },
  { title: 'Biennial Cities: Venice, Chicago, Seoul', tags: ['biennale', 'Venice Biennale', 'Chicago Architecture Biennial', 'architecture'], content_type: 'Article' },
  { title: 'Design Agencies Redefining Architectural Communication', tags: ['agency', 'communications', 'architecture', 'media'], content_type: 'Article' },
  { title: 'Rotterdam and the Post-Pandemic City', tags: ['Rotterdam', 'MVRDV', 'Netherlands', 'urban'], content_type: 'Article' },
  { title: 'The Libeskind Effect: Memory Architecture 30 Years On', tags: ['Studio Libeskind', 'cultural memory', 'Berlin', 'architecture'], content_type: 'Article' },
  { title: 'Press and Publication in the Architecture World', tags: ['press', 'media', 'architecture', 'communications'], content_type: 'Press Release' },
  { title: 'High Line at 15: Urban Infrastructure as Public Art', tags: ['High Line', 'landscape architecture', 'NYC', 'urban'], content_type: 'Article' },
  { title: 'Education and Architecture: New Models of Engagement', tags: ['education', 'architecture', 'Venice Biennale'], content_type: 'Article' },
];

function inferTagsFromText(text: string): string[] {
  const map: Record<string, string> = {
    biennale: 'biennale', biennial: 'biennale', venice: 'Venice Biennale', chicago: 'Chicago Architecture Biennial',
    mvrdv: 'MVRDV', rotterdam: 'Rotterdam', libeskind: 'Studio Libeskind',
    landscape: 'landscape', urban: 'urban', photography: 'photography',
    documentation: 'documentation', communications: 'communications', education: 'education',
    sustainability: 'sustainability', memory: 'memory', housing: 'housing',
  };
  const lower = text.toLowerCase();
  return [...new Set(Object.entries(map).filter(([k]) => lower.includes(k)).map(([, v]) => v))];
}

function generateMockArticles(competitorName: string, competitorUrl: string, today: string): any[] {
  const host = new URL(competitorUrl).hostname;
  return ARCHITECTURE_TOPICS.map((topic, i) => {
    const slug = topic.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return {
      title: topic.title,
      url: `https://${host}/${i % 2 === 0 ? 'architecture' : 'design'}/${slug}`,
      snippet: `${competitorName} examines ${topic.tags[0]} through a contemporary lens, bringing together practitioners, critics, and cultural institutions to explore new frameworks for the field.`,
      content_type: topic.content_type,
      published_at: today,
      tags: topic.tags,
      is_mock: true,
    };
  });
}

async function scrapeWithFirecrawl(url: string, apiKey: string): Promise<any> {
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ url, formats: ['markdown', 'links'], onlyMainContent: true }),
  });
  if (!res.ok) throw new Error(`Firecrawl error ${res.status}: ${await res.text()}`);
  return res.json();
}

function extractArticlesFromFirecrawl(data: any, competitorUrl: string, today: string): any[] {
  const host = new URL(competitorUrl).hostname.replace('www.', '');
  const links = ((data.links || []) as string[]).filter(l => {
    try {
      const u = new URL(l);
      return u.hostname.replace('www.', '').includes(host) &&
        l !== competitorUrl && !l.includes('#') &&
        l.split('/').filter(Boolean).length >= 2;
    } catch { return false; }
  }).slice(0, 15);

  const markdown = data.markdown || '';
  const headings = markdown.split('\n')
    .filter((l: string) => l.startsWith('## ') || l.startsWith('### '))
    .map((l: string) => l.replace(/^#+\s/, '').trim());

  return links.map((url: string, i: number) => {
    const slug = url.split('/').filter(Boolean).pop() || '';
    const title = headings[i] || slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    const tags = inferTagsFromText(url + ' ' + title);
    return {
      url,
      title: title.slice(0, 200),
      snippet: `Crawled from ${new URL(url).hostname}`,
      content_type: url.includes('video') || url.includes('film') ? 'Video' : 'Article',
      published_at: today,
      tags,
      is_mock: false,
    };
  });
}

async function upsertContent(
  competitorId: string,
  articles: any[],
  supabaseUrl: string,
  serviceKey: string,
): Promise<number> {
  if (!articles.length) return 0;

  const rows = articles.map(a => ({ ...a, competitor_id: competitorId }));
  const res = await fetch(`${supabaseUrl}/rest/v1/ps_competitor_content`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DB insert error ${res.status}: ${err}`);
  }
  return articles.length;
}

async function updateLastCrawled(
  competitorId: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<void> {
  await fetch(`${supabaseUrl}/rest/v1/ps_competitors?id=eq.${competitorId}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ last_crawled_at: new Date().toISOString() }),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { competitorId, competitorUrl, competitorName } = await req.json();
    if (!competitorId || !competitorUrl || !competitorName) {
      return new Response(JSON.stringify({ error: 'competitorId, competitorUrl, and competitorName are required' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const today = new Date().toISOString().split('T')[0];

    let articles: any[];
    let mode: string;

    if (FIRECRAWL_API_KEY) {
      const data = await scrapeWithFirecrawl(competitorUrl, FIRECRAWL_API_KEY);
      articles = extractArticlesFromFirecrawl(data, competitorUrl, today);
      mode = 'live';
    } else {
      articles = generateMockArticles(competitorName, competitorUrl, today);
      mode = 'mock';
    }

    await upsertContent(competitorId, articles, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await updateLastCrawled(competitorId, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    return new Response(JSON.stringify({ articles, total: articles.length, mode }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
