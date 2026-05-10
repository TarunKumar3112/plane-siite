const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function queryMatchingContent(
  tags: string[],
  supabaseUrl: string,
  serviceKey: string,
): Promise<any[]> {
  if (!tags.length) return [];

  // Build OR filter: any row whose tags array overlaps with our tag list
  const overlapsFilter = tags.map(t => `tags.cs.{${encodeURIComponent(t)}}`).join(',');
  const url = `${supabaseUrl}/rest/v1/ps_competitor_content?or=(${overlapsFilter})&select=*,ps_competitors(name,url,id)&order=crawled_at.desc&limit=60`;

  const res = await fetch(url, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) throw new Error(`DB query error ${res.status}`);
  return res.json();
}

function computeTagCoverage(
  tags: string[],
  matches: any[],
): Record<string, { competitors: string[]; count: number }> {
  const coverage: Record<string, { competitors: Set<string>; count: number }> = {};
  tags.forEach(t => { coverage[t] = { competitors: new Set(), count: 0 }; });

  matches.forEach(m => {
    const mTags: string[] = m.tags || [];
    tags.forEach(t => {
      if (mTags.some(mt => mt.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(mt.toLowerCase()))) {
        coverage[t].count += 1;
        coverage[t].competitors.add(m.ps_competitors?.name || 'Unknown');
      }
    });
  });

  return Object.fromEntries(
    Object.entries(coverage).map(([t, v]) => [t, { competitors: [...v.competitors], count: v.count }])
  );
}

async function generateClaudeInsight(
  contentTitle: string,
  tags: string[],
  contentType: string,
  matches: any[],
  tagCoverage: Record<string, { competitors: string[]; count: number }>,
  apiKey: string,
): Promise<string> {
  const topMatches = matches.slice(0, 12).map(m =>
    `- ${m.ps_competitors?.name ?? 'Unknown'}: "${m.title}" [${(m.tags || []).join(', ')}]`
  ).join('\n');

  const gaps = Object.entries(tagCoverage)
    .filter(([, v]) => v.count === 0)
    .map(([t]) => t);

  const highCoverage = Object.entries(tagCoverage)
    .filter(([, v]) => v.count >= 3)
    .map(([t, v]) => `${t} (${v.count} competitors)`);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 450,
      messages: [{
        role: 'user',
        content: `You are a content strategist analyzing PLANE—SITE, a Berlin/Boulder architecture communications agency.

THEIR CONTENT: "${contentTitle}" (${contentType})
TOPICS COVERED: ${tags.join(', ')}

COMPETITOR COVERAGE:
${topMatches || 'No competitor content found yet — crawl competitors first.'}

HIGH COMPETITION TOPICS: ${highCoverage.join(', ') || 'none'}
UNDERSERVED TOPICS (competitors not covering): ${gaps.join(', ') || 'none'}

Write a benchmark analysis in 3 short paragraphs:
1. OVERLAP — which topics competitors are saturating and what angle they take
2. GAP — specific themes or framings competitors miss that PLANE—SITE could own
3. MOVE — one concrete content idea PLANE—SITE should publish next

Be specific to architecture communications. No generic advice. Under 180 words total.`,
      }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API error ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { contentTitle, tags, contentType } = await req.json();
    if (!contentTitle || !tags) {
      return new Response(JSON.stringify({ error: 'contentTitle and tags are required' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const matches = await queryMatchingContent(tags, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const tagCoverage = computeTagCoverage(tags, matches);

    // Deduplicate and rank matches
    const seen = new Set<string>();
    const uniqueMatches = matches.filter(m => {
      if (seen.has(m.url)) return false;
      seen.add(m.url);
      return true;
    });

    // Score each match by tag overlap count
    const scoredMatches = uniqueMatches.map(m => {
      const mTags = m.tags || [];
      const overlap = tags.filter(t =>
        mTags.some((mt: string) => mt.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(mt.toLowerCase()))
      ).length;
      return { ...m, overlapScore: overlap };
    }).sort((a, b) => b.overlapScore - a.overlapScore);

    let insight: string | null = null;
    let insightMode = 'none';

    if (ANTHROPIC_API_KEY) {
      insight = await generateClaudeInsight(contentTitle, tags, contentType || 'Article', scoredMatches, tagCoverage, ANTHROPIC_API_KEY);
      insightMode = 'claude';
    } else {
      // Structural insight without AI
      const gaps = Object.entries(tagCoverage).filter(([, v]) => v.count === 0).map(([t]) => t);
      const hot = Object.entries(tagCoverage).filter(([, v]) => v.count >= 3).map(([t, v]) => `${t} (${v.count})`);
      if (gaps.length || hot.length) {
        insight = [
          hot.length ? `High-competition topics: ${hot.join(', ')}.` : '',
          gaps.length ? `Underserved topics where competitors are silent: ${gaps.join(', ')}.` : '',
          'Add ANTHROPIC_API_KEY to unlock AI-generated strategic analysis.',
        ].filter(Boolean).join(' ');
      }
      insightMode = 'structural';
    }

    return new Response(JSON.stringify({
      matches: scoredMatches,
      tagCoverage,
      insight,
      insightMode,
      totalMatches: scoredMatches.length,
    }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
