# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server at localhost:5173 (HMR enabled)
npm run build     # production build → dist/
npm run preview   # preview the production build locally
npm run lint      # run ESLint

# Deploy Edge Function after changes
npx supabase functions deploy scan-content --project-ref ekeetvpiranxffzqolaa --no-verify-jwt

# Set Google API secrets (once user has keys)
npx supabase secrets set GOOGLE_API_KEY=... GOOGLE_CSE_ID=... --project-ref ekeetvpiranxffzqolaa
```

No test suite is configured.

## Architecture

This is a single-page React 19 + Vite 8 application styled entirely with Tailwind CSS v4 (loaded via `@tailwindcss/vite` plugin — no `tailwind.config.js` needed).

**Everything lives in one file: `src/App.jsx`.** The app has no router and no external state library.

### Backend — Supabase Edge Function

The scan logic runs server-side to keep Google API keys out of the browser.

- **Project:** `plane-site` on Supabase (ref: `ekeetvpiranxffzqolaa`, region: ap-south-1)
- **Function:** `supabase/functions/scan-content/index.ts` — deployed at `https://ekeetvpiranxffzqolaa.supabase.co/functions/v1/scan-content`
- **Routing logic:**
  - `Photo` / `Video` → Google Vision API Web Detection (finds pages containing the image)
  - `Article` / `Project` / `Press Release` → Google Custom Search API (finds pages mentioning the title)
- **Required secrets** (set via Supabase dashboard or CLI):
  - `GOOGLE_API_KEY` — Google Cloud API key with Vision API + Custom Search API enabled
  - `GOOGLE_CSE_ID` — Programmable Search Engine ID (only needed for text content types)
- The frontend calls the function via `runScan()` in `App.jsx` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env`

### Data model

All state is managed in the root `App` component with `useState` and `useMemo`. Content is persisted to `localStorage` under the key `ps-content-v1`.

Each content item:
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

### Component structure (all in App.jsx)

- `App` — root; owns all state; renders header, stats grid, two-column layout
- `ContentCard` — accordion card; has a "↺ Rescan" button that re-calls the Edge Function live
- `ScanResultRow` — one row per detection inside an expanded `ContentCard`
- `AddContentForm` — async form; calls `runScan()` then `onAdd()` on submit; shows "Scanning…" state
- `StatCard` — small metric tile used in the stats row
- `runScan()` — top-level async helper that POSTs to the Edge Function

### Styling conventions

- Stone palette (`stone-50` background, `stone-950` for primary dark/accent)
- All UI text uses `font-mono` with `uppercase tracking-widest` for labels
- Status badge colors: blue=Original, amber=Reposted, emerald=Cited, red=Uncredited
- No `App.css` custom classes — all styling is inline Tailwind utilities
