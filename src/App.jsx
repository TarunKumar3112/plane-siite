import { useState, useEffect, useMemo, useCallback } from "react";

// ─── Supabase Edge Function URLs ───────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function runScan({ contentType, title, imageUrl, originalUrl }) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/scan-content`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ contentType, title, imageUrl, originalUrl }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Scan failed (${res.status})`);
  }
  return res.json();
}

async function runBrandScan() {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/monitor-brand`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Brand scan failed (${res.status})`);
  }
  return res.json();
}

// ─── Company Profile ───────────────────────────────────────────────────────────
const COMPANY_PROFILE = {
  name: "PLANE—SITE",
  tagline: "Mind your content",
  mission: "Accelerating positive change in design, architecture, ecologies and cities",
  industry: "Content Strategy & Creative Agency",
  services: ["Communications", "Consultancy", "Media Production"],
  locations: ["Berlin, Germany", "Boulder, CO, USA"],
  social: { instagram: "@plane_site", vimeo: "planesite", youtube: "plane-site" },
  clients: [
    "Chicago Architecture Biennial",
    "MVRDV",
    "Venice Architecture Biennale",
    "Ken Smith Workshop",
    "Studio Libeskind",
    "Storefront for Art and Architecture",
    "Berlin University of the Arts",
    "raumlabor",
  ],
};

const CONTENT_TYPES = ["Photo", "Article", "Project", "Video", "Press Release"];
const STATUSES = ["Original", "Reposted", "Cited", "Uncredited"];
const SENTIMENTS = ["Positive", "Neutral", "Negative"];
const CATEGORIES = ["Press", "Social", "Blog", "Forum", "News", "Other"];

const PLATFORMS = [
  "Archdaily", "Dezeen", "Archinect", "Wallpaper*", "Domus",
  "Frame Magazine", "Divisare", "Architizer", "Architectural Record",
  "Metalocus", "Instagram", "LinkedIn", "Vimeo", "YouTube",
  "Pinterest", "Google Images", "Houzz", "Behance", "e-flux", "Azure Magazine",
];

// ─── Pre-seeded Module 1 Content ──────────────────────────────────────────────
const INITIAL_CONTENT = [
  {
    id: "c1",
    title: "Chicago Architecture Biennial 2023 — Opening Week",
    type: "Video",
    url: "https://plane-site.com/projects/cab-2023",
    publishedDate: "2023-09-14",
    tags: ["CAB", "Chicago Architecture Biennial", "biennial", "architecture"],
    scanResults: [
      { id: "c1-0", platform: "Archdaily", url: "https://archdaily.com/articles/chicago-architecture-biennial-2023", dateDetected: "2023-09-16", sentiment: "Positive", status: "Cited" },
      { id: "c1-1", platform: "Instagram", url: "https://instagram.com/p/cab2023-opening-week", dateDetected: "2023-09-18", sentiment: "Positive", status: "Reposted" },
      { id: "c1-2", platform: "Dezeen", url: "https://dezeen.com/2023/chicago-architecture-biennial", dateDetected: "2023-09-21", sentiment: "Positive", status: "Cited" },
      { id: "c1-3", platform: "Pinterest", url: "https://pinterest.com/pin/chicago-architecture-biennial-2023", dateDetected: "2023-10-04", sentiment: "Neutral", status: "Uncredited" },
      { id: "c1-4", platform: "LinkedIn", url: "https://linkedin.com/posts/cab-2023-opening", dateDetected: "2023-09-19", sentiment: "Positive", status: "Reposted" },
    ],
  },
  {
    id: "c2",
    title: "MVRDV — Valley Building Rotterdam Photo Essay",
    type: "Photo",
    url: "https://plane-site.com/projects/mvrdv-valley-rotterdam",
    publishedDate: "2023-06-12",
    tags: ["MVRDV", "Rotterdam", "Valley", "architecture photography", "Netherlands"],
    scanResults: [
      { id: "c2-0", platform: "Archinect", url: "https://archinect.com/news/mvrdv-valley-rotterdam-photo-essay", dateDetected: "2023-06-15", sentiment: "Positive", status: "Cited" },
      { id: "c2-1", platform: "Divisare", url: "https://divisare.com/projects/mvrdv-valley-building", dateDetected: "2023-06-19", sentiment: "Positive", status: "Reposted" },
      { id: "c2-2", platform: "Google Images", url: "https://googleimages.com/search?q=mvrdv+valley+rotterdam", dateDetected: "2023-07-03", sentiment: "Neutral", status: "Uncredited" },
      { id: "c2-3", platform: "Behance", url: "https://behance.net/gallery/mvrdv-valley-photo-essay", dateDetected: "2023-07-12", sentiment: "Neutral", status: "Uncredited" },
      { id: "c2-4", platform: "Wallpaper*", url: "https://wallpaper.com/architecture/mvrdv-valley-rotterdam", dateDetected: "2023-06-27", sentiment: "Positive", status: "Cited" },
    ],
  },
  {
    id: "c3",
    title: "Studio Libeskind — The Art of Memory",
    type: "Article",
    url: "https://plane-site.com/projects/libeskind-art-of-memory",
    publishedDate: "2023-03-08",
    tags: ["Studio Libeskind", "cultural memory", "Berlin", "architecture"],
    scanResults: [
      { id: "c3-0", platform: "e-flux", url: "https://e-flux.com/announcements/studio-libeskind-art-of-memory", dateDetected: "2023-03-10", sentiment: "Positive", status: "Cited" },
      { id: "c3-1", platform: "Architectural Record", url: "https://archrecord.com/2023/libeskind-art-of-memory", dateDetected: "2023-03-16", sentiment: "Positive", status: "Cited" },
      { id: "c3-2", platform: "LinkedIn", url: "https://linkedin.com/posts/libeskind-art-of-memory-feature", dateDetected: "2023-03-13", sentiment: "Positive", status: "Reposted" },
      { id: "c3-3", platform: "Houzz", url: "https://houzz.com/ideabooks/studio-libeskind-memory", dateDetected: "2023-04-07", sentiment: "Neutral", status: "Uncredited" },
    ],
  },
  {
    id: "c4",
    title: "Venice Architecture Biennale — Education Platform",
    type: "Project",
    url: "https://plane-site.com/projects/venice-biennale-education",
    publishedDate: "2023-05-20",
    tags: ["Venice Biennale", "education", "architecture", "Italy"],
    scanResults: [
      { id: "c4-0", platform: "Archdaily", url: "https://archdaily.com/venice-biennale-education-platform-2023", dateDetected: "2023-05-22", sentiment: "Positive", status: "Cited" },
      { id: "c4-1", platform: "Domus", url: "https://domus.com/architecture/venice-biennale-education-plane-site", dateDetected: "2023-05-25", sentiment: "Positive", status: "Cited" },
      { id: "c4-2", platform: "Frame Magazine", url: "https://framemagazine.com/news/venice-biennale-education-2023", dateDetected: "2023-05-29", sentiment: "Neutral", status: "Reposted" },
      { id: "c4-3", platform: "Google Images", url: "https://googleimages.com/search?q=venice+biennale+education", dateDetected: "2023-06-10", sentiment: "Neutral", status: "Uncredited" },
    ],
  },
  {
    id: "c5",
    title: "Ken Smith Workshop — High Line Urban Landscape",
    type: "Photo",
    url: "https://plane-site.com/projects/ken-smith-high-line",
    publishedDate: "2023-01-18",
    tags: ["Ken Smith", "High Line", "landscape architecture", "NYC", "urban"],
    scanResults: [
      { id: "c5-0", platform: "Archinect", url: "https://archinect.com/news/ken-smith-workshop-high-line", dateDetected: "2023-01-21", sentiment: "Positive", status: "Cited" },
      { id: "c5-1", platform: "Architizer", url: "https://architizer.com/projects/high-line-ken-smith-landscape", dateDetected: "2023-01-24", sentiment: "Positive", status: "Reposted" },
      { id: "c5-2", platform: "Pinterest", url: "https://pinterest.com/pin/ken-smith-high-line-landscape", dateDetected: "2023-02-05", sentiment: "Neutral", status: "Uncredited" },
      { id: "c5-3", platform: "Instagram", url: "https://instagram.com/p/ken-smith-high-line-nyc", dateDetected: "2023-01-26", sentiment: "Positive", status: "Reposted" },
    ],
  },
  {
    id: "c6",
    title: "Storefront for Art and Architecture — Annual Press Release",
    type: "Press Release",
    url: "https://plane-site.com/projects/storefront-press-2022",
    publishedDate: "2022-11-04",
    tags: ["Storefront", "art", "architecture", "NYC", "press"],
    scanResults: [
      { id: "c6-0", platform: "Dezeen", url: "https://dezeen.com/2022/storefront-art-architecture-annual", dateDetected: "2022-11-06", sentiment: "Positive", status: "Cited" },
      { id: "c6-1", platform: "Metalocus", url: "https://metalocus.com/en/storefront-art-architecture-2022", dateDetected: "2022-11-09", sentiment: "Neutral", status: "Reposted" },
      { id: "c6-2", platform: "Azure Magazine", url: "https://azuremagazine.com/article/storefront-art-architecture", dateDetected: "2022-11-12", sentiment: "Positive", status: "Cited" },
    ],
  },
];

// ─── Pre-seeded Module 2 Brand Mentions ───────────────────────────────────────
const INITIAL_BRAND_MENTIONS = [
  {
    id: "bm1",
    query: '"plane-site"',
    platform: "Archdaily",
    url: "https://archdaily.com/2023/chicago-biennial-media-partners",
    title: "Chicago Architecture Biennial 2023: Media Partners and Documentation Strategy",
    snippet: "Plane-Site, the Berlin and Boulder-based communications agency, served as the primary documentation partner for this year's biennial, producing a comprehensive video and photo archive of the month-long event.",
    dateDetected: "2023-09-22",
    sentiment: "Positive",
    category: "Press",
  },
  {
    id: "bm2",
    query: '"plane-site"',
    platform: "Archinect",
    url: "https://archinect.com/news/plane-site-venice-biennale-2023",
    title: "Plane-Site's Documentation of Venice Biennale Education Programs Sets New Standard",
    snippet: "The agency's work at the Venice Architecture Biennale has been praised by curators and participants alike. Plane-Site's approach to capturing spatial narratives is both rigorous and visually compelling.",
    dateDetected: "2023-06-14",
    sentiment: "Positive",
    category: "Press",
  },
  {
    id: "bm3",
    query: '"plane site" architecture',
    platform: "Dezeen",
    url: "https://dezeen.com/2023/architecture-media-agencies-berlin",
    title: "Berlin's Architecture Media Scene: Agencies Shaping the Conversation",
    snippet: "Among the standout agencies redefining how architecture is communicated, Plane-Site consistently delivers nuanced, context-driven storytelling for some of the world's most acclaimed practices.",
    dateDetected: "2023-07-05",
    sentiment: "Positive",
    category: "Press",
  },
  {
    id: "bm4",
    query: '"plane_site"',
    platform: "Instagram",
    url: "https://instagram.com/p/BXq8plane-site-mvrdv",
    title: "Instagram post featuring @plane_site",
    snippet: "Stunning documentation by @plane_site of the Valley Building in Rotterdam. The way they capture urban scale is unmatched in the industry right now. #MVRDV #architecture #Rotterdam",
    dateDetected: "2023-06-20",
    sentiment: "Positive",
    category: "Social",
  },
  {
    id: "bm5",
    query: '"plane-site"',
    platform: "LinkedIn",
    url: "https://linkedin.com/posts/arch-community-plane-site-collaboration",
    title: "Collaborating with Plane-Site on Our Latest Publication",
    snippet: "We had the pleasure of working with Plane-Site on our annual report. Their team brought a rare combination of editorial clarity and visual intelligence to the project. Highly recommend.",
    dateDetected: "2023-08-12",
    sentiment: "Positive",
    category: "Social",
  },
  {
    id: "bm6",
    query: '"plane-site"',
    platform: "Reddit",
    url: "https://reddit.com/r/architecture/comments/plane_site_agency",
    title: "Anyone worked with Plane-Site for architectural documentation?",
    snippet: "Looking at hiring them for a biennial project. Their portfolio on plane-site.com looks solid — the CAB 2023 documentation especially. Curious if anyone has direct experience with their process.",
    dateDetected: "2023-10-03",
    sentiment: "Neutral",
    category: "Forum",
  },
  {
    id: "bm7",
    query: '"plane—site"',
    platform: "e-flux",
    url: "https://e-flux.com/announcements/plane-site-libeskind-collaboration",
    title: "Plane—Site × Studio Libeskind: The Art of Memory",
    snippet: "Plane—Site has released a new documentary series in collaboration with Studio Libeskind, exploring themes of memory and architecture in the post-war European context.",
    dateDetected: "2023-03-11",
    sentiment: "Positive",
    category: "Press",
  },
  {
    id: "bm8",
    query: '"plane site" architecture',
    platform: "Medium",
    url: "https://medium.com/arch-notes/on-architectural-communication-plane-site",
    title: "On Architectural Communication: What Plane-Site Gets Right",
    snippet: "There's a thoughtfulness to the way Plane-Site approaches visual storytelling that most agencies miss. They seem to understand that architecture documentation is itself an act of interpretation.",
    dateDetected: "2023-11-18",
    sentiment: "Positive",
    category: "Blog",
  },
  {
    id: "bm9",
    query: '"plane-site"',
    platform: "Wallpaper*",
    url: "https://wallpaper.com/architecture/plane-site-best-agencies-2023",
    title: "The Best Architecture Communication Agencies of 2023",
    snippet: "Plane-Site earns a spot on our list this year for consistently elevating the visual discourse around architecture and urbanism. Their work with MVRDV and the Chicago Biennial was particularly outstanding.",
    dateDetected: "2023-12-01",
    sentiment: "Positive",
    category: "Press",
  },
  {
    id: "bm10",
    query: '"plane-site"',
    platform: "Archinect",
    url: "https://archinect.com/forum/thread/discussion-architecture-documentation",
    title: "Discussion: Is architectural documentation being taken seriously enough?",
    snippet: "Some agencies like Plane-Site are doing interesting work here, though I think the field still struggles to define its own value. The quality of documentation varies wildly project to project.",
    dateDetected: "2023-09-30",
    sentiment: "Neutral",
    category: "Forum",
  },
];

// ─── Style Helpers ─────────────────────────────────────────────────────────────
const statusStyle = (s) => ({
  Original:   "bg-blue-50 text-blue-700 border border-blue-200",
  Reposted:   "bg-amber-50 text-amber-700 border border-amber-200",
  Cited:      "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Uncredited: "bg-red-50 text-red-700 border border-red-200",
}[s] ?? "bg-stone-100 text-stone-600");

const sentimentStyle = (s) => ({
  Positive: "text-emerald-600",
  Neutral:  "text-stone-400",
  Negative: "text-red-500",
}[s] ?? "text-stone-400");

const sentimentBadgeStyle = (s) => ({
  Positive: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Neutral:  "bg-stone-100 text-stone-500 border border-stone-200",
  Negative: "bg-red-50 text-red-700 border border-red-200",
}[s] ?? "bg-stone-100 text-stone-500");

const sentimentDot = (s) => ({
  Positive: "#10b981",
  Neutral:  "#a8a29e",
  Negative: "#ef4444",
}[s] ?? "#a8a29e");

const typeIcon = (t) => ({
  Photo:           "◉",
  Article:         "≡",
  Project:         "◫",
  Video:           "▶",
  "Press Release": "◈",
}[t] ?? "○");

const statusDot = (s) => ({
  Original:   "#3b82f6",
  Reposted:   "#f59e0b",
  Cited:      "#10b981",
  Uncredited: "#ef4444",
}[s] ?? "#6b7280");

const categoryStyle = (c) => ({
  Press:  "bg-violet-50 text-violet-700 border border-violet-200",
  Social: "bg-sky-50 text-sky-700 border border-sky-200",
  Blog:   "bg-orange-50 text-orange-700 border border-orange-200",
  Forum:  "bg-teal-50 text-teal-700 border border-teal-200",
  News:   "bg-indigo-50 text-indigo-700 border border-indigo-200",
  Other:  "bg-stone-100 text-stone-500 border border-stone-200",
}[c] ?? "bg-stone-100 text-stone-500");

// ─── CSV Exports ──────────────────────────────────────────────────────────────
function exportCSV(contents) {
  const rows = [["Content Title", "Type", "Original URL", "Published Date", "Tags", "Platform", "Detection Date", "Status", "Sentiment", "Platform URL"]];
  contents.forEach((c) => {
    c.scanResults.forEach((r) => {
      rows.push([c.title, c.type, c.url, c.publishedDate, c.tags.join("; "), r.platform, r.dateDetected, r.status, r.sentiment, r.url]);
    });
  });
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: "planesite-content-tracking.csv" });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportBrandCSV(mentions) {
  const rows = [["Platform", "Category", "Title", "URL", "Snippet", "Sentiment", "Date Detected", "Search Query"]];
  mentions.forEach((m) => {
    rows.push([m.platform, m.category, m.title, m.url, m.snippet, m.sentiment, m.dateDetected, m.query]);
  });
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: "planesite-brand-mentions.csv" });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Shared Sub-components ─────────────────────────────────────────────────────
function StatCard({ label, value, accent, danger, positive }) {
  return (
    <div className={`p-5 ${
      accent   ? "bg-stone-950 text-white" :
      positive && value > 0 ? "bg-emerald-50 border border-emerald-200" :
      danger   && value > 0 ? "bg-red-50 border border-red-200" :
      "bg-white border border-stone-200"
    }`}>
      <div className={`text-4xl font-bold tracking-tight ${
        accent   ? "text-white" :
        positive && value > 0 ? "text-emerald-700" :
        danger   && value > 0 ? "text-red-600" :
        "text-stone-950"
      }`}>{value}</div>
      <div className="text-xs uppercase tracking-widest mt-1 text-stone-400 font-mono">{label}</div>
    </div>
  );
}

// ─── Module 1 Components ───────────────────────────────────────────────────────
function AddContentForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({ title: "", type: "Article", url: "", imageUrl: "", publishedDate: "", tags: "" });
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const needsImage = form.type === "Photo" || form.type === "Video";
  const valid = form.title.trim() && form.url.trim() && (!needsImage || form.imageUrl.trim());

  const handle = async () => {
    if (!valid || scanning) return;
    setScanning(true); setError(null);
    try {
      const id = `u${Date.now()}`;
      const scanResults = await runScan({
        contentType: form.type,
        title: form.title.trim(),
        imageUrl: form.imageUrl.trim() || null,
        originalUrl: form.url.trim(),
      });
      onAdd({
        id, title: form.title.trim(), type: form.type, url: form.url.trim(),
        imageUrl: form.imageUrl.trim() || null,
        publishedDate: form.publishedDate || new Date().toISOString().split("T")[0],
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        scanResults,
      });
    } catch (e) { setError(e.message); }
    finally { setScanning(false); }
  };

  const inp = "w-full border border-stone-300 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:border-stone-950 transition-colors";
  const lbl = "block text-xs uppercase tracking-widest text-stone-400 mb-1";

  return (
    <div className="bg-white border border-stone-950 p-6">
      <div className="text-xs uppercase tracking-widest text-stone-400 mb-5 font-mono">Track New Content</div>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={lbl}>Content Title *</label>
          <input className={inp} placeholder="e.g. Venice Biennale Education Platform" value={form.title} onChange={set("title")} />
        </div>
        <div>
          <label className={lbl}>Content Type</label>
          <select className={inp} value={form.type} onChange={set("type")}>
            {CONTENT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Published Date</label>
          <input type="date" className={inp} value={form.publishedDate} onChange={set("publishedDate")} />
        </div>
        <div className="col-span-2">
          <label className={lbl}>Original URL *</label>
          <input className={inp} placeholder="https://plane-site.com/projects/…" value={form.url} onChange={set("url")} />
        </div>
        {needsImage && (
          <div className="col-span-2">
            <label className={lbl}>Image URL * <span className="normal-case">(public URL of the image file for reverse search)</span></label>
            <input className={inp} placeholder="https://plane-site.com/images/photo.jpg" value={form.imageUrl} onChange={set("imageUrl")} />
          </div>
        )}
        <div className="col-span-2">
          <label className={lbl}>Tags (comma-separated)</label>
          <input className={inp} placeholder="architecture, MVRDV, Berlin" value={form.tags} onChange={set("tags")} />
        </div>
      </div>
      {error && <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700 font-mono">✕ {error}</div>}
      <div className="flex gap-3 mt-5">
        <button onClick={handle} disabled={!valid || scanning}
          className={`px-6 py-2 text-xs uppercase tracking-widest font-mono transition-colors ${valid && !scanning ? "bg-stone-950 text-white hover:bg-stone-700" : "bg-stone-200 text-stone-400 cursor-not-allowed"}`}>
          {scanning ? "Scanning…" : "Run Scan & Track"}
        </button>
        <button onClick={onCancel} disabled={scanning} className="border border-stone-300 px-6 py-2 text-xs uppercase tracking-widest font-mono hover:bg-stone-50 transition-colors disabled:opacity-50">
          Cancel
        </button>
      </div>
    </div>
  );
}

function ScanResultRow({ result }) {
  return (
    <div className={`px-5 py-2.5 flex items-center gap-3 text-xs font-mono hover:bg-stone-50 transition-colors ${result.status === "Uncredited" ? "bg-red-50 hover:bg-red-100" : ""}`}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: statusDot(result.status) }} />
      <span className="w-32 font-medium text-stone-700 shrink-0">{result.platform}</span>
      <span className="flex-1 text-stone-400 truncate min-w-0" title={result.url}>{result.url}</span>
      <span className="text-stone-400 w-24 shrink-0 text-right">{result.dateDetected}</span>
      <span className={`w-16 text-right shrink-0 ${sentimentStyle(result.sentiment)}`}>{result.sentiment}</span>
      <span className={`px-2 py-0.5 text-xs font-medium shrink-0 w-24 text-center ${statusStyle(result.status)}`}>{result.status}</span>
    </div>
  );
}

function ContentCard({ content, isOpen, onToggle, onRescan }) {
  const [rescanning, setRescanning] = useState(false);
  const [rescanError, setRescanError] = useState(null);
  const uncredited = content.scanResults.filter((r) => r.status === "Uncredited").length;
  const byStatus = STATUSES.reduce((acc, s) => ({ ...acc, [s]: content.scanResults.filter((r) => r.status === s).length }), {});

  const handleRescan = async (e) => {
    e.stopPropagation(); setRescanning(true); setRescanError(null);
    try {
      const results = await runScan({ contentType: content.type, title: content.title, imageUrl: content.imageUrl || null, originalUrl: content.url });
      onRescan(content.id, results);
    } catch (err) { setRescanError(err.message); }
    finally { setRescanning(false); }
  };

  return (
    <div className={`bg-white border transition-all ${isOpen ? "border-stone-950" : "border-stone-200 hover:border-stone-400"}`}>
      <button className="w-full px-5 py-4 text-left flex items-start gap-4" onClick={onToggle}>
        <span className="text-stone-400 font-mono text-base mt-0.5 shrink-0">{typeIcon(content.type)}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-stone-950 leading-snug">{content.title}</div>
          <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-stone-400 font-mono">
            <span>{content.type}</span><span>·</span><span>{content.publishedDate}</span>
          </div>
          {content.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {content.tags.map((t) => <span key={t} className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 font-mono">{t}</span>)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {uncredited > 0 && <span className="text-xs font-mono bg-red-100 text-red-600 px-2 py-0.5 font-semibold border border-red-200">{uncredited} uncredited</span>}
          <div className="flex gap-1.5 items-center">
            {STATUSES.map((s) => byStatus[s] > 0 && <span key={s} className="text-xs font-mono" style={{ color: statusDot(s) }} title={s}>{byStatus[s]}</span>)}
          </div>
          <span className="text-xs text-stone-400 font-mono">{content.scanResults.length} found</span>
          <span className="text-stone-400 text-xs ml-1">{isOpen ? "▲" : "▼"}</span>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-stone-200">
          <div className="px-5 py-2.5 bg-stone-50 flex items-center justify-between gap-4 flex-wrap">
            <div className="text-xs uppercase tracking-widest text-stone-400 font-mono">
              {content.scanResults.length} detections · {new Set(content.scanResults.map((r) => r.platform)).size} platforms
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {STATUSES.map((s) => byStatus[s] > 0 && <span key={s} className={`text-xs px-2 py-0.5 font-mono ${statusStyle(s)}`}>{s}: {byStatus[s]}</span>)}
              <button onClick={handleRescan} disabled={rescanning}
                className="text-xs px-3 py-0.5 font-mono border border-stone-300 hover:border-stone-950 hover:bg-stone-950 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {rescanning ? "Scanning…" : "↺ Rescan"}
              </button>
            </div>
          </div>
          {rescanError && <div className="px-5 py-2 bg-red-50 text-xs text-red-700 font-mono border-b border-red-200">✕ Rescan failed: {rescanError}</div>}
          <div className="divide-y divide-stone-100">
            {content.scanResults.slice().sort((a, b) => (a.status === "Uncredited" ? -1 : b.status === "Uncredited" ? 1 : 0)).map((r) => <ScanResultRow key={r.id} result={r} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Module 2 Components ───────────────────────────────────────────────────────
function BrandMentionCard({ mention }) {
  return (
    <div className={`bg-white border transition-all hover:border-stone-400 ${mention.sentiment === "Negative" ? "border-red-200 bg-red-50" : "border-stone-200"}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 font-mono ${sentimentBadgeStyle(mention.sentiment)}`}>
                {mention.sentiment === "Positive" ? "+" : mention.sentiment === "Negative" ? "−" : "·"} {mention.sentiment}
              </span>
              <span className={`text-xs px-2 py-0.5 font-mono ${categoryStyle(mention.category)}`}>{mention.category}</span>
              <span className="text-xs text-stone-400 font-mono">{mention.platform}</span>
              <span className="text-xs text-stone-300 font-mono ml-auto">{mention.dateDetected}</span>
            </div>

            {/* Title */}
            <a href={mention.url} target="_blank" rel="noopener noreferrer"
              className="block text-sm font-semibold text-stone-950 hover:underline leading-snug mb-2">
              {mention.title || mention.url}
            </a>

            {/* Snippet */}
            {mention.snippet && (
              <p className="text-xs text-stone-500 font-mono leading-relaxed border-l-2 border-stone-200 pl-3 mb-2 line-clamp-3">
                "{mention.snippet}"
              </p>
            )}

            {/* URL + query */}
            <div className="flex items-center gap-3 text-xs text-stone-400 font-mono">
              <span className="truncate min-w-0" title={mention.url}>↳ {mention.url}</span>
              <span className="shrink-0 text-stone-300">via {mention.query}</span>
            </div>
          </div>
          <div className="shrink-0 mt-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: sentimentDot(mention.sentiment) }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  // ── Module 1 state ─────────────────────────────────────────────────────────
  const [contents, setContents] = useState(() => {
    try { const s = localStorage.getItem("ps-content-v1"); return s ? JSON.parse(s) : INITIAL_CONTENT; }
    catch { return INITIAL_CONTENT; }
  });
  const [openId, setOpenId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // ── Module 2 state ─────────────────────────────────────────────────────────
  const [brandMentions, setBrandMentions] = useState(() => {
    try { const s = localStorage.getItem("ps-brand-mentions-v1"); return s ? JSON.parse(s) : INITIAL_BRAND_MENTIONS; }
    catch { return INITIAL_BRAND_MENTIONS; }
  });
  const [brandLastScan, setBrandLastScan] = useState(() => {
    return localStorage.getItem("ps-brand-last-scan") || "Demo data loaded";
  });
  const [brandScanning, setBrandScanning] = useState(false);
  const [brandScanError, setBrandScanError] = useState(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionSentiment, setMentionSentiment] = useState("All");
  const [mentionCategory, setMentionCategory] = useState("All");

  // ── Shared state ───────────────────────────────────────────────────────────
  const [activeModule, setActiveModule] = useState("module1");
  const [toast, setToast] = useState(null);

  const lastScan = new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  // ── Persist to localStorage ────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem("ps-content-v1", JSON.stringify(contents)); }, [contents]);
  useEffect(() => { localStorage.setItem("ps-brand-mentions-v1", JSON.stringify(brandMentions)); }, [brandMentions]);
  useEffect(() => { if (brandLastScan) localStorage.setItem("ps-brand-last-scan", brandLastScan); }, [brandLastScan]);

  // ── Module 1 derived data ──────────────────────────────────────────────────
  const allDetections = useMemo(() => contents.flatMap((c) => c.scanResults), [contents]);
  const uncreditedAll = useMemo(() => contents.flatMap((c) =>
    c.scanResults.filter((r) => r.status === "Uncredited").map((r) => ({ ...r, contentTitle: c.title, contentId: c.id }))
  ), [contents]);
  const totalPlatforms = useMemo(() => new Set(allDetections.map((r) => r.platform)).size, [allDetections]);

  const platformCounts = useMemo(() => {
    const map = {};
    allDetections.forEach((r) => { map[r.platform] = (map[r.platform] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 9);
  }, [allDetections]);

  const statusCounts = useMemo(() =>
    STATUSES.reduce((acc, s) => ({ ...acc, [s]: allDetections.filter((r) => r.status === s).length }), {}),
    [allDetections]);

  const filtered = useMemo(() => contents.filter((c) => {
    const q = query.toLowerCase();
    return (
      (!q || c.title.toLowerCase().includes(q) || c.tags.some((t) => t.toLowerCase().includes(q))) &&
      (typeFilter === "All" || c.type === typeFilter) &&
      (statusFilter === "All" || c.scanResults.some((r) => r.status === statusFilter))
    );
  }), [contents, query, typeFilter, statusFilter]);

  // ── Module 2 derived data ──────────────────────────────────────────────────
  const mentionSentimentCounts = useMemo(() =>
    SENTIMENTS.reduce((acc, s) => ({ ...acc, [s]: brandMentions.filter((m) => m.sentiment === s).length }), {}),
    [brandMentions]);

  const mentionCategoryCounts = useMemo(() => {
    const map = {};
    brandMentions.forEach((m) => { map[m.category] = (map[m.category] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [brandMentions]);

  const mentionPlatformCounts = useMemo(() => {
    const map = {};
    brandMentions.forEach((m) => { map[m.platform] = (map[m.platform] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [brandMentions]);

  const filteredMentions = useMemo(() => brandMentions.filter((m) => {
    const q = mentionQuery.toLowerCase();
    return (
      (!q || m.title.toLowerCase().includes(q) || m.snippet.toLowerCase().includes(q) || m.platform.toLowerCase().includes(q)) &&
      (mentionSentiment === "All" || m.sentiment === mentionSentiment) &&
      (mentionCategory === "All" || m.category === mentionCategory)
    );
  }), [brandMentions, mentionQuery, mentionSentiment, mentionCategory]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAdd = (content) => {
    setContents((p) => [content, ...p]);
    setShowForm(false);
    setOpenId(content.id);
    showToast(`"${content.title}" tracked — ${content.scanResults.length} detections found`);
  };

  const handleRescan = useCallback((id, newResults) => {
    setContents((prev) => prev.map((c) => c.id === id ? { ...c, scanResults: newResults } : c));
    showToast(`Rescan complete — ${newResults.length} detections found`);
  }, []);

  const handleBrandScan = async () => {
    setBrandScanning(true);
    setBrandScanError(null);
    try {
      const mentions = await runBrandScan();
      setBrandMentions(mentions);
      const now = new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
      setBrandLastScan(now);
      showToast(`Brand scan complete — ${mentions.length} mentions found`);
    } catch (e) {
      setBrandScanError(e.message);
    } finally {
      setBrandScanning(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-50">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-stone-950 text-white px-5 py-3 text-xs font-mono uppercase tracking-widest shadow-xl">
          ✓ {toast}
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="bg-stone-950 text-white border-b border-stone-800">
        <div className="max-w-screen-xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <div className="text-xl font-bold tracking-[0.25em] uppercase">PLANE—SITE</div>
            <div className="text-xs text-stone-400 tracking-[0.2em] uppercase mt-0.5 font-mono">
              Content Monitoring System
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-stone-300 tracking-widest font-mono italic">"{COMPANY_PROFILE.tagline}"</div>
            <div className="text-xs text-stone-500 mt-0.5 font-mono">{COMPANY_PROFILE.locations.join(" · ")}</div>
          </div>
        </div>

        {/* Module Tab Navigation */}
        <div className="max-w-screen-xl mx-auto px-6 flex gap-0 border-t border-stone-800">
          <button
            onClick={() => setActiveModule("module1")}
            className={`px-5 py-3 text-xs font-mono uppercase tracking-widest transition-colors ${activeModule === "module1" ? "bg-white text-stone-950 font-semibold" : "text-stone-400 hover:text-stone-200"}`}
          >
            ◫ Module 1 · Content Tracker
          </button>
          <button
            onClick={() => setActiveModule("module2")}
            className={`px-5 py-3 text-xs font-mono uppercase tracking-widest transition-colors flex items-center gap-2 ${activeModule === "module2" ? "bg-white text-stone-950 font-semibold" : "text-stone-400 hover:text-stone-200"}`}
          >
            ◎ Module 2 · Brand Monitor
            {mentionSentimentCounts["Negative"] > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 font-bold">{mentionSentimentCounts["Negative"]}</span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-5">

        {/* ── Agency Profile Banner (shared) ─────────────────────────────── */}
        <div className="bg-white border border-stone-200 p-5 flex flex-wrap gap-8 items-start">
          <div className="flex-1 min-w-52">
            <div className="text-xs text-stone-400 uppercase tracking-widest font-mono mb-1">Agency Profile</div>
            <div className="font-bold text-stone-950 tracking-wide text-base">PLANE—SITE</div>
            <div className="text-xs text-stone-500 mt-1.5 leading-relaxed max-w-64">{COMPANY_PROFILE.mission}</div>
          </div>
          <div>
            <div className="text-xs text-stone-400 uppercase tracking-widest font-mono mb-2">Services</div>
            <div className="flex flex-col gap-1">
              {COMPANY_PROFILE.services.map((s) => <div key={s} className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 font-mono inline-block">{s}</div>)}
            </div>
          </div>
          <div>
            <div className="text-xs text-stone-400 uppercase tracking-widest font-mono mb-2">Key Clients</div>
            <div className="space-y-0.5">
              {COMPANY_PROFILE.clients.slice(0, 5).map((c) => <div key={c} className="text-xs text-stone-600 font-mono">→ {c}</div>)}
              <div className="text-xs text-stone-400 font-mono">+{COMPANY_PROFILE.clients.length - 5} more</div>
            </div>
          </div>
          <div>
            <div className="text-xs text-stone-400 uppercase tracking-widest font-mono mb-2">Social Channels</div>
            <div className="space-y-0.5 font-mono">
              <div className="text-xs text-stone-600">IG: {COMPANY_PROFILE.social.instagram}</div>
              <div className="text-xs text-stone-600">Vimeo: {COMPANY_PROFILE.social.vimeo}</div>
              <div className="text-xs text-stone-600">YouTube: {COMPANY_PROFILE.social.youtube}</div>
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs text-stone-400 uppercase tracking-widest font-mono mb-1">Active Module</div>
            <div className="text-xs font-mono text-stone-200 font-semibold bg-stone-950 px-2 py-0.5">
              {activeModule === "module1" ? "Content Tracker" : "Brand Monitor"}
            </div>
            <div className="text-xs text-stone-400 font-mono mt-1.5">
              {activeModule === "module1" ? `Last scan: ${lastScan}` : `Last scan: ${brandLastScan}`}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* MODULE 1: CONTENT TRACKER                                          */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeModule === "module1" && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Content Tracked" value={contents.length} accent />
              <StatCard label="Platforms Detected" value={totalPlatforms} />
              <StatCard label="Total Detections" value={allDetections.length} />
              <StatCard label="Uncredited Uses" value={uncreditedAll.length} danger />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              {/* Left: Content List */}
              <div className="xl:col-span-2 space-y-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <input type="text" placeholder="Search title or tag…" value={query} onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 min-w-44 border border-stone-300 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:border-stone-950 transition-colors" />
                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                    className="border border-stone-300 bg-white px-3 py-2 text-xs font-mono focus:outline-none focus:border-stone-950 transition-colors">
                    <option value="All">All Types</option>
                    {CONTENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-stone-300 bg-white px-3 py-2 text-xs font-mono focus:outline-none focus:border-stone-950 transition-colors">
                    <option value="All">All Statuses</option>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <button onClick={() => { setShowForm(!showForm); if (!showForm) setOpenId(null); }}
                    className="bg-stone-950 text-white px-4 py-2 text-xs uppercase tracking-widest font-mono hover:bg-stone-700 transition-colors">
                    + Add Content
                  </button>
                  <button onClick={() => exportCSV(contents)}
                    className="border border-stone-300 bg-white px-4 py-2 text-xs uppercase tracking-widest font-mono hover:bg-stone-50 transition-colors">
                    ↓ CSV
                  </button>
                </div>

                {showForm && <AddContentForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />}

                <div className="space-y-2">
                  {filtered.length === 0 ? (
                    <div className="bg-white border border-stone-200 p-12 text-center text-xs text-stone-400 font-mono uppercase tracking-widest">
                      No content matches your filters
                    </div>
                  ) : (
                    filtered.map((c) => (
                      <ContentCard key={c.id} content={c} isOpen={openId === c.id}
                        onToggle={() => setOpenId(openId === c.id ? null : c.id)} onRescan={handleRescan} />
                    ))
                  )}
                </div>
                <div className="text-xs text-stone-400 font-mono">{filtered.length} of {contents.length} items</div>
              </div>

              {/* Right: Sidebar */}
              <div className="space-y-4">
                <div className="bg-white border border-stone-200">
                  <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                    <div className="text-xs uppercase tracking-widest font-semibold text-stone-700 font-mono">Uncredited Alerts</div>
                    {uncreditedAll.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 font-mono font-bold">{uncreditedAll.length}</span>}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
                    {uncreditedAll.length === 0 ? (
                      <div className="p-6 text-xs text-stone-400 font-mono text-center">No uncredited detections</div>
                    ) : (
                      uncreditedAll.map((item) => (
                        <button key={item.id} className="w-full text-left p-3 bg-red-50 hover:bg-red-100 transition-colors" onClick={() => setOpenId(item.contentId)}>
                          <div className="flex gap-2 items-start">
                            <span className="text-red-500 text-xs shrink-0 mt-0.5">⚠</span>
                            <div>
                              <div className="text-xs font-semibold text-red-700 font-mono">Uncredited Use</div>
                              <div className="text-xs text-stone-700 mt-0.5 leading-snug">{item.contentTitle}</div>
                              <div className="text-xs text-stone-400 font-mono mt-0.5">{item.platform} · {item.dateDetected}</div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white border border-stone-200">
                  <div className="px-4 py-3 border-b border-stone-100"><div className="text-xs uppercase tracking-widest font-semibold text-stone-700 font-mono">Detection Status</div></div>
                  <div className="p-4 space-y-3.5">
                    {STATUSES.map((s) => {
                      const count = statusCounts[s] || 0;
                      const pct = allDetections.length > 0 ? (count / allDetections.length) * 100 : 0;
                      return (
                        <div key={s}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs px-2 py-0.5 font-mono ${statusStyle(s)}`}>{s}</span>
                            <span className="text-sm font-bold font-mono text-stone-800">{count}</span>
                          </div>
                          <div className="h-1 bg-stone-100 w-full">
                            <div className="h-1 transition-all duration-500" style={{ width: `${pct}%`, background: statusDot(s) }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white border border-stone-200">
                  <div className="px-4 py-3 border-b border-stone-100"><div className="text-xs uppercase tracking-widest font-semibold text-stone-700 font-mono">Top Platforms</div></div>
                  <div className="p-4 space-y-2.5">
                    {platformCounts.map(([platform, count]) => {
                      const max = platformCounts[0][1];
                      return (
                        <div key={platform}>
                          <div className="flex justify-between text-xs font-mono mb-0.5">
                            <span className="text-stone-600">{platform}</span>
                            <span className="text-stone-400">{count}</span>
                          </div>
                          <div className="h-1 bg-stone-100">
                            <div className="h-1 bg-stone-950 transition-all" style={{ width: `${(count / max) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white border border-stone-200">
                  <div className="px-4 py-3 border-b border-stone-100"><div className="text-xs uppercase tracking-widest font-semibold text-stone-700 font-mono">Content Mix</div></div>
                  <div className="p-4 space-y-2">
                    {CONTENT_TYPES.map((type) => {
                      const count = contents.filter((c) => c.type === type).length;
                      if (!count) return null;
                      return (
                        <div key={type} className="flex items-center gap-3">
                          <span className="text-stone-400 font-mono text-sm w-4 shrink-0">{typeIcon(type)}</span>
                          <span className="text-xs text-stone-600 flex-1 font-mono">{type}</span>
                          <span className="text-xs font-bold font-mono text-stone-800">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-stone-950 text-white p-4">
                  <div className="text-xs uppercase tracking-widest text-stone-400 mb-3 font-mono">System Info</div>
                  <div className="space-y-2 font-mono">
                    {[["Module", "Content Tracker"], ["Agency", "PLANE—SITE"], ["Platforms indexed", PLATFORMS.length], ["Last scan", lastScan], ["Status", null]].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-stone-400">{k}</span>
                        {k === "Status" ? <span className="text-emerald-400 font-semibold">● Active</span> : <span className="text-stone-200">{v}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* MODULE 2: BRAND MONITOR                                            */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeModule === "module2" && (
          <>
            {/* Module 2 description banner */}
            <div className="bg-stone-950 text-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-widest text-stone-400 font-mono mb-1">Module 2 · Brand Monitor</div>
                  <div className="text-sm font-mono text-stone-200 leading-relaxed max-w-xl">
                    Scans the web for all mentions of PLANE—SITE across press, social, blogs, and forums.
                    Analyses sentiment of each mention to surface reputation signals in real time.
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {['"plane-site"', '"plane—site"', '"plane site" architecture', '"plane_site"', '"plane-site.com"'].map((q) => (
                      <span key={q} className="text-xs font-mono bg-stone-800 text-stone-300 px-2 py-0.5">{q}</span>
                    ))}
                    <span className="text-xs text-stone-500 font-mono self-center ml-1">search queries</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <button
                    onClick={handleBrandScan}
                    disabled={brandScanning}
                    className={`px-6 py-3 text-xs uppercase tracking-widest font-mono font-semibold transition-colors ${brandScanning ? "bg-stone-700 text-stone-400 cursor-not-allowed" : "bg-white text-stone-950 hover:bg-stone-100"}`}
                  >
                    {brandScanning ? "◎ Scanning…" : "◎ Run Brand Scan"}
                  </button>
                  {brandLastScan && <div className="text-xs text-stone-500 font-mono mt-2">Last: {brandLastScan}</div>}
                </div>
              </div>
            </div>

            {/* Scan error */}
            {brandScanError && (
              <div className="bg-red-50 border border-red-200 p-4 flex items-start gap-3">
                <span className="text-red-500 text-sm shrink-0">✕</span>
                <div>
                  <div className="text-xs font-semibold text-red-700 font-mono uppercase tracking-widest">Scan Failed</div>
                  <div className="text-xs text-red-600 font-mono mt-1">{brandScanError}</div>
                  <div className="text-xs text-stone-500 font-mono mt-2">
                    Ensure GOOGLE_API_KEY and GOOGLE_CSE_ID are set in Supabase:&nbsp;
                    <code className="bg-stone-100 px-1">npx supabase secrets set GOOGLE_API_KEY=… GOOGLE_CSE_ID=… --project-ref ekeetvpiranxffzqolaa</code>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Total Mentions" value={brandMentions.length} accent />
              <StatCard label="Positive Mentions" value={mentionSentimentCounts["Positive"] || 0} positive />
              <StatCard label="Neutral Mentions" value={mentionSentimentCounts["Neutral"] || 0} />
              <StatCard label="Negative Mentions" value={mentionSentimentCounts["Negative"] || 0} danger />
            </div>

            {/* Main Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

              {/* Left: Mention List */}
              <div className="xl:col-span-2 space-y-3">

                {/* Toolbar */}
                <div className="flex flex-wrap gap-2 items-center">
                  <input type="text" placeholder="Search mentions, platforms, snippets…" value={mentionQuery} onChange={(e) => setMentionQuery(e.target.value)}
                    className="flex-1 min-w-44 border border-stone-300 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:border-stone-950 transition-colors" />
                  <select value={mentionSentiment} onChange={(e) => setMentionSentiment(e.target.value)}
                    className="border border-stone-300 bg-white px-3 py-2 text-xs font-mono focus:outline-none focus:border-stone-950 transition-colors">
                    <option value="All">All Sentiments</option>
                    {SENTIMENTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <select value={mentionCategory} onChange={(e) => setMentionCategory(e.target.value)}
                    className="border border-stone-300 bg-white px-3 py-2 text-xs font-mono focus:outline-none focus:border-stone-950 transition-colors">
                    <option value="All">All Categories</option>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <button onClick={() => exportBrandCSV(brandMentions)}
                    className="border border-stone-300 bg-white px-4 py-2 text-xs uppercase tracking-widest font-mono hover:bg-stone-50 transition-colors">
                    ↓ CSV
                  </button>
                </div>

                {/* Mention Cards or Empty State */}
                {brandMentions.length === 0 ? (
                  <div className="bg-white border border-stone-200 p-16 text-center">
                    <div className="text-3xl text-stone-200 mb-4 font-mono">◎</div>
                    <div className="text-xs uppercase tracking-widest text-stone-400 font-mono mb-3">No Brand Scan Run Yet</div>
                    <div className="text-sm text-stone-500 font-mono mb-6 max-w-sm mx-auto leading-relaxed">
                      Run a brand scan to discover where PLANE—SITE is being mentioned across the web.
                    </div>
                    <button onClick={handleBrandScan} disabled={brandScanning}
                      className="bg-stone-950 text-white px-8 py-3 text-xs uppercase tracking-widest font-mono hover:bg-stone-700 transition-colors disabled:opacity-50">
                      {brandScanning ? "Scanning…" : "◎ Run First Brand Scan"}
                    </button>
                  </div>
                ) : filteredMentions.length === 0 ? (
                  <div className="bg-white border border-stone-200 p-12 text-center text-xs text-stone-400 font-mono uppercase tracking-widest">
                    No mentions match your filters
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredMentions
                      .slice()
                      .sort((a, b) => (a.sentiment === "Negative" ? -1 : b.sentiment === "Negative" ? 1 : 0))
                      .map((m) => <BrandMentionCard key={m.id} mention={m} />)}
                  </div>
                )}

                <div className="text-xs text-stone-400 font-mono">
                  {filteredMentions.length} of {brandMentions.length} mentions
                </div>
              </div>

              {/* Right: Analytics Sidebar */}
              <div className="space-y-4">

                {/* Sentiment Overview */}
                <div className="bg-white border border-stone-200">
                  <div className="px-4 py-3 border-b border-stone-100">
                    <div className="text-xs uppercase tracking-widest font-semibold text-stone-700 font-mono">Sentiment Overview</div>
                  </div>
                  <div className="p-4 space-y-3.5">
                    {SENTIMENTS.map((s) => {
                      const count = mentionSentimentCounts[s] || 0;
                      const pct = brandMentions.length > 0 ? (count / brandMentions.length) * 100 : 0;
                      return (
                        <div key={s}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs px-2 py-0.5 font-mono ${sentimentBadgeStyle(s)}`}>{s}</span>
                            <span className="text-sm font-bold font-mono text-stone-800">{count}</span>
                          </div>
                          <div className="h-1 bg-stone-100 w-full">
                            <div className="h-1 transition-all duration-500" style={{ width: `${pct}%`, background: sentimentDot(s) }} />
                          </div>
                        </div>
                      );
                    })}
                    {brandMentions.length > 0 && (
                      <div className="pt-1 border-t border-stone-100">
                        <div className="text-xs text-stone-400 font-mono">
                          {Math.round(((mentionSentimentCounts["Positive"] || 0) / brandMentions.length) * 100)}% positive sentiment
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Negative Mentions Alert */}
                {mentionSentimentCounts["Negative"] > 0 && (
                  <div className="bg-red-50 border border-red-200">
                    <div className="px-4 py-3 border-b border-red-200 flex items-center justify-between">
                      <div className="text-xs uppercase tracking-widest font-semibold text-red-700 font-mono">Negative Mentions</div>
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 font-mono font-bold">{mentionSentimentCounts["Negative"]}</span>
                    </div>
                    <div className="divide-y divide-red-100 max-h-64 overflow-y-auto">
                      {brandMentions.filter((m) => m.sentiment === "Negative").map((m) => (
                        <div key={m.id} className="p-3">
                          <div className="text-xs font-semibold text-red-700 font-mono leading-snug">{m.title}</div>
                          <div className="text-xs text-stone-500 font-mono mt-0.5">{m.platform} · {m.dateDetected}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category Breakdown */}
                <div className="bg-white border border-stone-200">
                  <div className="px-4 py-3 border-b border-stone-100">
                    <div className="text-xs uppercase tracking-widest font-semibold text-stone-700 font-mono">Source Categories</div>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {mentionCategoryCounts.length === 0 ? (
                      <div className="text-xs text-stone-400 font-mono text-center py-2">No data yet</div>
                    ) : (
                      mentionCategoryCounts.map(([cat, count]) => {
                        const max = mentionCategoryCounts[0][1];
                        return (
                          <div key={cat}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className={`text-xs px-2 py-0.5 font-mono ${categoryStyle(cat)}`}>{cat}</span>
                              <span className="text-xs font-bold font-mono text-stone-800">{count}</span>
                            </div>
                            <div className="h-1 bg-stone-100">
                              <div className="h-1 bg-stone-950 transition-all" style={{ width: `${(count / max) * 100}%` }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Top Platforms */}
                <div className="bg-white border border-stone-200">
                  <div className="px-4 py-3 border-b border-stone-100">
                    <div className="text-xs uppercase tracking-widest font-semibold text-stone-700 font-mono">Top Platforms</div>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {mentionPlatformCounts.length === 0 ? (
                      <div className="text-xs text-stone-400 font-mono text-center py-2">No data yet</div>
                    ) : (
                      mentionPlatformCounts.map(([platform, count]) => {
                        const max = mentionPlatformCounts[0][1];
                        return (
                          <div key={platform}>
                            <div className="flex justify-between text-xs font-mono mb-0.5">
                              <span className="text-stone-600">{platform}</span>
                              <span className="text-stone-400">{count}</span>
                            </div>
                            <div className="h-1 bg-stone-100">
                              <div className="h-1 bg-stone-950 transition-all" style={{ width: `${(count / max) * 100}%` }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* System Info */}
                <div className="bg-stone-950 text-white p-4">
                  <div className="text-xs uppercase tracking-widest text-stone-400 mb-3 font-mono">System Info</div>
                  <div className="space-y-2 font-mono">
                    {[
                      ["Module", "Brand Monitor"],
                      ["Search queries", "5 variants"],
                      ["Deduplication", "by URL"],
                      ["Sentiment", "Keyword analysis"],
                      ["Last scan", null],
                      ["Status", null],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-stone-400">{k}</span>
                        {k === "Status" ? <span className="text-emerald-400 font-semibold">● Active</span>
                          : k === "Last scan" ? <span className="text-stone-200">{brandLastScan || "—"}</span>
                          : <span className="text-stone-200">{v}</span>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
