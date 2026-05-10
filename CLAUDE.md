# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server at localhost:5173 (HMR enabled)
npm run build     # production build → dist/
npm run preview   # preview the production build locally
npm run lint      # run ESLint

# Deploy Edge Functions after changes
npx supabase functions deploy scan-content      --project-ref ekeetvpiranxffzqolaa --no-verify-jwt
npx supabase functions deploy monitor-brand     --project-ref ekeetvpiranxffzqolaa --no-verify-jwt
npx supabase functions deploy crawl-competitor  --project-ref ekeetvpiranxffzqolaa --no-verify-jwt
npx supabase functions deploy benchmark-report  --project-ref ekeetvpiranxffzqolaa --no-verify-jwt

# Set secrets
npx supabase secrets set GOOGLE_API_KEY=...    GOOGLE_CSE_ID=...    --project-ref ekeetvpiranxffzqolaa
npx supabase secrets set FIRECRAWL_API_KEY=... ANTHROPIC_API_KEY=... --project-ref ekeetvpiranxffzqolaa
```

No test suite is configured.

## Architecture

Single-page React 19 + Vite 8 app, Tailwind CSS v4, no router, no external state library.

**Everything lives in one file: `src/App.jsx`.** Three modules tab-switched inside one `App` component.

### Backend — Supabase (ref: `ekeetvpiranxffzqolaa`, region: ap-south-1)

#### Secrets (set in Supabase dashboard or CLI)
| Secret | Used by |
|---|---|
| `GOOGLE_API_KEY` | Module 1 (Vision + Custom Search), Module 2 |
| `GOOGLE_CSE_ID` | Module 1, Module 2 |
| `FIRECRAWL_API_KEY` | Module 3 `crawl-competitor` — falls back to demo articles if absent |
| `ANTHROPIC_API_KEY` | Module 3 `benchmark-report` — falls back to structural analysis if absent |

#### Database (applied via `supabase/migrations/benchmark_tables.sql`)
- `ps_competitors` — managed list of competitor sites (seeded with 7 architecture media outlets)
- `ps_competitor_content` — articles crawled from competitors; `is_mock=true` when Firecrawl key absent
- pgvector extension enabled for future embedding support
- Both tables: RLS enabled, anon gets full access (single-tenant tool)

#### Edge Functions

**`supabase/functions/scan-content/index.ts`** — Module 1
- Photo/Video → Google Vision API web detection
- Article/Project/Press Release → Google Custom Search exact title match

**`supabase/functions/monitor-brand/index.ts`** — Module 2
- 5 query variants in parallel; deduplicates by URL; classifies category + sentiment

**`supabase/functions/crawl-competitor/index.ts`** — Module 3
- Input: `{ competitorId, competitorUrl, competitorName }`
- If `FIRECRAWL_API_KEY`: scrapes via `POST https://api.firecrawl.dev/v1/scrape`, extracts article links + titles
- If no key: inserts 12 realistic mock architecture articles (`is_mock=true`)
- Upserts into `ps_competitor_content` (ignores duplicates by URL); updates `last_crawled_at`
- Returns `{ articles, total, mode }` — mode is `"live"` or `"mock"`

**`supabase/functions/benchmark-report/index.ts`** — Module 3
- Input: `{ contentTitle, tags, contentType }`
- Queries `ps_competitor_content` for rows whose `tags` array overlaps with the input tags
- Scores each match by tag overlap count (`overlapScore`)
- Computes `tagCoverage`: per-tag count of competitor matches + which competitors cover it
- If `ANTHROPIC_API_KEY`: calls Claude Haiku with a benchmark prompt → strategic gap analysis
- If no key: generates structural insight text from the coverage data
- Returns `{ matches, tagCoverage, insight, insightMode, totalMatches }`

### Supabase REST API (no SDK)

App uses direct fetch calls — no `@supabase/supabase-js` dependency needed:

```js
// Helpers defined at module level in App.jsx:
sbGet(path)               // GET /rest/v1/{path}
sbPost(path, data, hdrs)  // POST /rest/v1/{path}
sbDelete(path)            // DELETE /rest/v1/{path}

// Edge function callers:
runCrawlCompetitor({ competitorId, competitorUrl, competitorName })
runBenchmarkReport({ contentTitle, tags, contentType })
```

### Data model

#### Module 1 — Content items (`localStorage` key: `ps-content-v1`)
```js
{
  id: string, title: string,
  type: "Photo" | "Article" | "Project" | "Video" | "Press Release",
  url: string, imageUrl: string | null, publishedDate: string, tags: string[],
  scanResults: [{ id, platform, url, dateDetected, sentiment, status }],
}
```

#### Module 2 — Brand mentions (`localStorage` key: `ps-brand-mentions-v1`)
```js
{ id, query, platform, url, title, snippet, dateDetected, sentiment, category }
```

#### Module 3 — Competitors (Supabase `ps_competitors`)
```js
{ id: uuid, name, url, description, active, last_crawled_at, created_at }
```

#### Module 3 — Competitor content (Supabase `ps_competitor_content`)
```js
{ id: uuid, competitor_id: uuid, title, url, snippet, content_type, published_at, tags: string[], is_mock: bool, crawled_at }
```

#### Module 3 — Benchmark report (React state `benchmarkReport`, not persisted)
```js
{
  matches: [{ ...ps_competitor_content row, ps_competitors: { name, url }, overlapScore }],
  tagCoverage: { [tag]: { count: number, competitors: string[] } },
  insight: string | null,    // Claude-generated or structural
  insightMode: "claude" | "structural" | "none",
  totalMatches: number,
}
```

### Component structure (all in App.jsx)

**Shared:** `App`, `StatCard`

**Module 1:** `AddContentForm`, `ContentCard`, `ScanResultRow` + `runScan()`

**Module 2:** `BrandMentionCard` + `runBrandScan()`

**Module 3:**
- `CompetitorCard` — shows name, URL, article count, crawl date, "↓ Crawl" button, delete button
- `AddCompetitorForm` — inline form for adding a new competitor
- `BenchmarkMatchCard` — per-competitor article; highlights which of your tags overlap (emerald badges)
- Two sub-views toggled by `m3View` state: `"competitors"` | `"benchmark"`
- Competitors view: competitor grid + article preview panels per-competitor
- Benchmark view: content selector → "Generate Report" → AI insight block + topic coverage matrix + match list + competitor breakdown sidebar

### Styling conventions

- Stone palette (`stone-50` bg, `stone-950` accent)
- All labels: `font-mono uppercase tracking-widest`
- Module 1 status: blue=Original, amber=Reposted, emerald=Cited, red=Uncredited
- Module 2 sentiment: emerald=Positive, stone=Neutral, red=Negative
- Module 2 category: violet=Press, sky=Social, orange=Blog, teal=Forum, indigo=News
- Module 3 overlap badge: emerald=High (≥3 tags), amber=Medium, stone=Low
- Module 3 tag coverage: emerald=Gap (0), amber=Low (1–2), red=Well covered (≥3)
- Module 3 AI insight block: stone-950 bg if Claude, amber bg if structural-only
- No `App.css` — all styling is inline Tailwind utilities
- Negative mentions sorted to top in Module 2; demo articles marked with amber "demo" badge in Module 3
