# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server at localhost:5173 (HMR enabled)
npm run build     # production build → dist/
npm run preview   # preview the production build locally
npm run lint      # run ESLint

# Deploy Edge Functions after changes
npx supabase functions deploy scan-content --project-ref ekeetvpiranxffzqolaa --no-verify-jwt
npx supabase functions deploy monitor-brand --project-ref ekeetvpiranxffzqolaa --no-verify-jwt

# Set Google API secrets (once user has keys)
npx supabase secrets set GOOGLE_API_KEY=... GOOGLE_CSE_ID=... --project-ref ekeetvpiranxffzqolaa
```

No test suite is configured.

## Architecture

This is a single-page React 19 + Vite 8 application styled entirely with Tailwind CSS v4 (loaded via `@tailwindcss/vite` plugin — no `tailwind.config.js` needed).

**Everything lives in one file: `src/App.jsx`.** The app has no router and no external state library. Two modules are tab-switched inside the same App component.

### Backend — Supabase Edge Functions

All scan logic runs server-side to keep Google API keys out of the browser.

- **Project:** `plane-site` on Supabase (ref: `ekeetvpiranxffzqolaa`, region: ap-south-1)
- **Required secrets** (set via Supabase dashboard or CLI):
  - `GOOGLE_API_KEY` — Google Cloud API key with Vision API + Custom Search API enabled
  - `GOOGLE_CSE_ID` — Programmable Search Engine ID (web-wide search)

#### Module 1: `supabase/functions/scan-content/index.ts`
Deployed at `…/functions/v1/scan-content`. Tracks where specific published content appears.
- `Photo` / `Video` → Google Vision API Web Detection (reverse image search)
- `Article` / `Project` / `Press Release` → Google Custom Search API (exact title match)
- Called via `runScan()` in `App.jsx`

#### Module 2: `supabase/functions/monitor-brand/index.ts`
Deployed at `…/functions/v1/monitor-brand`. Scans the web for brand mentions of PLANE—SITE.
- Runs 5 query variants in parallel via `Promise.allSettled`: `"plane-site"`, `"plane—site"`, `"plane site" architecture`, `"plane_site"`, `"plane-site.com"`
- Deduplicates by URL; skips the official domain
- Classifies each result: category (Press/Social/Blog/Forum/News) and sentiment (Positive/Neutral/Negative)
- Called via `runBrandScan()` in `App.jsx`

### Data model

All state is managed in the root `App` component with `useState` and `useMemo`.

#### Module 1 — Content items (`localStorage` key: `ps-content-v1`)
```js
{
  id: string,
  title: string,
  type: "Photo" | "Article" | "Project" | "Video" | "Press Release",
  url: string,
  imageUrl: string | null,    // required for Photo/Video — public URL of the image file
  publishedDate: string,      // YYYY-MM-DD
  tags: string[],
  scanResults: ScanResult[],
}
```

Each `ScanResult`:
```js
{
  id: string,
  platform: string,
  url: string,
  dateDetected: string,       // YYYY-MM-DD
  sentiment: "Positive" | "Neutral" | "Negative",
  status: "Original" | "Reposted" | "Cited" | "Uncredited",
}
```

#### Module 2 — Brand mentions (`localStorage` key: `ps-brand-mentions-v1`)
```js
{
  id: string,
  query: string,              // which search query found this result
  platform: string,
  url: string,
  title: string,              // page title from Google search result
  snippet: string,            // text excerpt from Google search result
  dateDetected: string,       // YYYY-MM-DD
  sentiment: "Positive" | "Neutral" | "Negative",
  category: "Press" | "Social" | "Blog" | "Forum" | "News" | "Other",
}
```

### Component structure (all in App.jsx)

**Shared:**
- `App` — root; owns all state for both modules; renders header with module tab nav, agency profile banner, then conditionally renders the active module
- `StatCard` — small metric tile; supports `accent`, `danger`, `positive` props for color variants

**Module 1 components:**
- `AddContentForm` — async form; calls `runScan()` then `onAdd()` on submit; shows "Scanning…" state
- `ContentCard` — accordion card per tracked content item; has "↺ Rescan" button that re-calls the Edge Function live
- `ScanResultRow` — one row per detection inside an expanded `ContentCard`
- `runScan()` — top-level async helper that POSTs to `scan-content` Edge Function

**Module 2 components:**
- `BrandMentionCard` — card showing title, quoted snippet, sentiment badge, category badge, platform, date, and originating search query
- `runBrandScan()` — top-level async helper that POSTs to `monitor-brand` Edge Function

### Styling conventions

- Stone palette (`stone-50` background, `stone-950` for primary dark/accent)
- All UI text uses `font-mono` with `uppercase tracking-widest` for labels
- Module 1 status badge colors: blue=Original, amber=Reposted, emerald=Cited, red=Uncredited
- Module 2 sentiment badge colors: emerald=Positive, stone=Neutral, red=Negative
- Module 2 category badge colors: violet=Press, sky=Social, orange=Blog, teal=Forum, indigo=News
- No `App.css` custom classes — all styling is inline Tailwind utilities
- Negative mentions sorted to top of list in Module 2
