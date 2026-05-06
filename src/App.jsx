import { useState, useEffect, useMemo } from "react";

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

const PLATFORMS = [
  "Archdaily", "Dezeen", "Archinect", "Wallpaper*", "Domus",
  "Frame Magazine", "Divisare", "Architizer", "Architectural Record",
  "Metalocus", "Instagram", "LinkedIn", "Vimeo", "YouTube",
  "Pinterest", "Google Images", "Houzz", "Behance", "e-flux", "Azure Magazine",
];

// ─── Mock Data Generator ───────────────────────────────────────────────────────
function seededRand(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateScanResults(contentId, title, seed = 0) {
  const count = Math.floor(seededRand(seed) * 5) + 2;
  const results = [];
  const used = new Set();
  for (let i = 0; i < count; i++) {
    let pidx;
    do { pidx = Math.floor(seededRand(seed + i * 7 + 1) * PLATFORMS.length); }
    while (used.has(pidx));
    used.add(pidx);

    const daysAgo = Math.floor(seededRand(seed + i * 3) * 90) + 1;
    const d = new Date("2026-05-06");
    d.setDate(d.getDate() - daysAgo);

    const statusR = seededRand(seed + i * 11);
    let status;
    if (statusR < 0.2) status = "Original";
    else if (statusR < 0.45) status = "Reposted";
    else if (statusR < 0.70) status = "Cited";
    else status = "Uncredited";

    const sentR = seededRand(seed + i * 5);
    const sentiment = sentR < 0.55 ? "Positive" : sentR < 0.80 ? "Neutral" : "Negative";
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const domain = PLATFORMS[pidx].toLowerCase().replace(/[^a-z0-9]/g, "");

    results.push({
      id: `${contentId}-${i}`,
      platform: PLATFORMS[pidx],
      url: `https://${domain}.com/articles/${slug}`,
      dateDetected: d.toISOString().split("T")[0],
      sentiment,
      status,
    });
  }
  return results;
}

// ─── Pre-seeded Initial Content ───────────────────────────────────────────────
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

// ─── CSV Export ───────────────────────────────────────────────────────────────
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
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ label, value, accent, danger }) {
  return (
    <div className={`p-5 ${accent ? "bg-stone-950 text-white" : danger && value > 0 ? "bg-red-50 border border-red-200" : "bg-white border border-stone-200"}`}>
      <div className={`text-4xl font-bold tracking-tight ${accent ? "text-white" : danger && value > 0 ? "text-red-600" : "text-stone-950"}`}>
        {value}
      </div>
      <div className={`text-xs uppercase tracking-widest mt-1 ${accent ? "text-stone-400" : "text-stone-400"}`}>{label}</div>
    </div>
  );
}

function AddContentForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({ title: "", type: "Article", url: "", publishedDate: "", tags: "" });
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const valid = form.title.trim() && form.url.trim();

  const handle = () => {
    if (!valid) return;
    const id = `u${Date.now()}`;
    onAdd({
      id,
      title: form.title.trim(),
      type: form.type,
      url: form.url.trim(),
      publishedDate: form.publishedDate || new Date().toISOString().split("T")[0],
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      scanResults: generateScanResults(id, form.title, Date.now() % 1000),
    });
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
        <div className="col-span-2">
          <label className={lbl}>Tags (comma-separated)</label>
          <input className={inp} placeholder="architecture, MVRDV, Berlin" value={form.tags} onChange={set("tags")} />
        </div>
      </div>
      <div className="flex gap-3 mt-5">
        <button onClick={handle} disabled={!valid}
          className={`px-6 py-2 text-xs uppercase tracking-widest font-mono transition-colors ${valid ? "bg-stone-950 text-white hover:bg-stone-700" : "bg-stone-200 text-stone-400 cursor-not-allowed"}`}>
          Run Scan & Track
        </button>
        <button onClick={onCancel} className="border border-stone-300 px-6 py-2 text-xs uppercase tracking-widest font-mono hover:bg-stone-50 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

function ScanResultRow({ result }) {
  return (
    <div className={`px-5 py-2.5 flex items-center gap-3 text-xs font-mono hover:bg-stone-50 transition-colors group ${result.status === "Uncredited" ? "bg-red-50 hover:bg-red-100" : ""}`}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: statusDot(result.status) }} />
      <span className="w-32 font-medium text-stone-700 shrink-0">{result.platform}</span>
      <span className="flex-1 text-stone-400 truncate min-w-0" title={result.url}>{result.url}</span>
      <span className="text-stone-400 w-24 shrink-0 text-right">{result.dateDetected}</span>
      <span className={`w-16 text-right shrink-0 ${sentimentStyle(result.sentiment)}`}>{result.sentiment}</span>
      <span className={`px-2 py-0.5 text-xs font-medium shrink-0 w-24 text-center ${statusStyle(result.status)}`}>{result.status}</span>
    </div>
  );
}

function ContentCard({ content, isOpen, onToggle }) {
  const uncredited = content.scanResults.filter((r) => r.status === "Uncredited").length;
  const byStatus = STATUSES.reduce((acc, s) => ({ ...acc, [s]: content.scanResults.filter((r) => r.status === s).length }), {});

  return (
    <div className={`bg-white border transition-all ${isOpen ? "border-stone-950" : "border-stone-200 hover:border-stone-400"}`}>
      <button className="w-full px-5 py-4 text-left flex items-start gap-4" onClick={onToggle}>
        <span className="text-stone-400 font-mono text-base mt-0.5 shrink-0">{typeIcon(content.type)}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-stone-950 leading-snug">{content.title}</div>
          <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-stone-400 font-mono">
            <span>{content.type}</span>
            <span>·</span>
            <span>{content.publishedDate}</span>
          </div>
          {content.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {content.tags.map((t) => (
                <span key={t} className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 font-mono">{t}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {uncredited > 0 && (
            <span className="text-xs font-mono bg-red-100 text-red-600 px-2 py-0.5 font-semibold border border-red-200">
              {uncredited} uncredited
            </span>
          )}
          <div className="flex gap-1.5 items-center">
            {STATUSES.map((s) => byStatus[s] > 0 && (
              <span key={s} className="text-xs font-mono" style={{ color: statusDot(s) }} title={s}>
                {byStatus[s]}
              </span>
            ))}
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
            <div className="flex gap-2 flex-wrap">
              {STATUSES.map((s) => byStatus[s] > 0 && (
                <span key={s} className={`text-xs px-2 py-0.5 font-mono ${statusStyle(s)}`}>{s}: {byStatus[s]}</span>
              ))}
            </div>
          </div>
          <div className="divide-y divide-stone-100">
            {content.scanResults
              .slice()
              .sort((a, b) => (a.status === "Uncredited" ? -1 : b.status === "Uncredited" ? 1 : 0))
              .map((r) => <ScanResultRow key={r.id} result={r} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [contents, setContents] = useState(() => {
    try {
      const saved = localStorage.getItem("ps-content-v1");
      return saved ? JSON.parse(saved) : INITIAL_CONTENT;
    } catch {
      return INITIAL_CONTENT;
    }
  });
  const [openId, setOpenId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [toast, setToast] = useState(null);

  const lastScan = new Date().toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  useEffect(() => {
    localStorage.setItem("ps-content-v1", JSON.stringify(contents));
  }, [contents]);

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
    [allDetections]
  );

  const filtered = useMemo(() => contents.filter((c) => {
    const q = query.toLowerCase();
    return (
      (!q || c.title.toLowerCase().includes(q) || c.tags.some((t) => t.toLowerCase().includes(q))) &&
      (typeFilter === "All" || c.type === typeFilter) &&
      (statusFilter === "All" || c.scanResults.some((r) => r.status === statusFilter))
    );
  }), [contents, query, typeFilter, statusFilter]);

  const handleAdd = (content) => {
    setContents((p) => [content, ...p]);
    setShowForm(false);
    setOpenId(content.id);
    setToast(`"${content.title}" tracked — ${content.scanResults.length} detections found`);
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="min-h-screen bg-stone-50">

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-stone-950 text-white px-5 py-3 text-xs font-mono uppercase tracking-widest shadow-xl animate-pulse">
          ✓ {toast}
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-stone-950 text-white border-b border-stone-800">
        <div className="max-w-screen-xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <div className="text-xl font-bold tracking-[0.25em] uppercase">PLANE—SITE</div>
            <div className="text-xs text-stone-400 tracking-[0.2em] uppercase mt-0.5 font-mono">
              Content Monitoring System &nbsp;·&nbsp; Module 1: Published Content Tracker
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-stone-300 tracking-widest font-mono italic">"{COMPANY_PROFILE.tagline}"</div>
            <div className="text-xs text-stone-500 mt-0.5 font-mono">{COMPANY_PROFILE.locations.join(" · ")}</div>
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-5">

        {/* ── Agency Profile Banner ──────────────────────────────────────── */}
        <div className="bg-white border border-stone-200 p-5 flex flex-wrap gap-8 items-start">
          <div className="flex-1 min-w-52">
            <div className="text-xs text-stone-400 uppercase tracking-widest font-mono mb-1">Agency Profile</div>
            <div className="font-bold text-stone-950 tracking-wide text-base">PLANE—SITE</div>
            <div className="text-xs text-stone-500 mt-1.5 leading-relaxed max-w-64">{COMPANY_PROFILE.mission}</div>
          </div>
          <div>
            <div className="text-xs text-stone-400 uppercase tracking-widest font-mono mb-2">Services</div>
            <div className="flex flex-col gap-1">
              {COMPANY_PROFILE.services.map((s) => (
                <div key={s} className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 font-mono inline-block">{s}</div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-stone-400 uppercase tracking-widest font-mono mb-2">Key Clients</div>
            <div className="space-y-0.5">
              {COMPANY_PROFILE.clients.slice(0, 5).map((c) => (
                <div key={c} className="text-xs text-stone-600 font-mono">→ {c}</div>
              ))}
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
            <div className="text-xs text-stone-400 uppercase tracking-widest font-mono mb-1">System Status</div>
            <div className="text-xs font-mono text-emerald-600 font-semibold">● Active</div>
            <div className="text-xs text-stone-400 font-mono mt-0.5">Last scan: {lastScan}</div>
          </div>
        </div>

        {/* ── Stats Row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Content Tracked" value={contents.length} accent />
          <StatCard label="Platforms Detected" value={totalPlatforms} />
          <StatCard label="Total Detections" value={allDetections.length} />
          <StatCard label="Uncredited Uses" value={uncreditedAll.length} danger />
        </div>

        {/* ── Main Layout ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Left 2/3: Content List */}
          <div className="xl:col-span-2 space-y-3">

            {/* Toolbar */}
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                placeholder="Search title or tag…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 min-w-44 border border-stone-300 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:border-stone-950 transition-colors"
              />
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
              <button
                onClick={() => { setShowForm(!showForm); if (!showForm) setOpenId(null); }}
                className="bg-stone-950 text-white px-4 py-2 text-xs uppercase tracking-widest font-mono hover:bg-stone-700 transition-colors">
                + Add Content
              </button>
              <button
                onClick={() => exportCSV(contents)}
                className="border border-stone-300 bg-white px-4 py-2 text-xs uppercase tracking-widest font-mono hover:bg-stone-50 transition-colors">
                ↓ CSV
              </button>
            </div>

            {/* Add Content Form */}
            {showForm && (
              <AddContentForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />
            )}

            {/* Content Cards */}
            <div className="space-y-2">
              {filtered.length === 0 ? (
                <div className="bg-white border border-stone-200 p-12 text-center text-xs text-stone-400 font-mono uppercase tracking-widest">
                  No content matches your filters
                </div>
              ) : (
                filtered.map((c) => (
                  <ContentCard
                    key={c.id}
                    content={c}
                    isOpen={openId === c.id}
                    onToggle={() => setOpenId(openId === c.id ? null : c.id)}
                  />
                ))
              )}
            </div>
            <div className="text-xs text-stone-400 font-mono">
              {filtered.length} of {contents.length} items
            </div>
          </div>

          {/* Right 1/3: Sidebar panels */}
          <div className="space-y-4">

            {/* Alerts */}
            <div className="bg-white border border-stone-200">
              <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest font-semibold text-stone-700 font-mono">Uncredited Alerts</div>
                {uncreditedAll.length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 font-mono font-bold">{uncreditedAll.length}</span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
                {uncreditedAll.length === 0 ? (
                  <div className="p-6 text-xs text-stone-400 font-mono text-center">No uncredited detections</div>
                ) : (
                  uncreditedAll.map((item) => (
                    <button
                      key={item.id}
                      className="w-full text-left p-3 bg-red-50 hover:bg-red-100 transition-colors"
                      onClick={() => setOpenId(item.contentId)}
                    >
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

            {/* Detection Status */}
            <div className="bg-white border border-stone-200">
              <div className="px-4 py-3 border-b border-stone-100">
                <div className="text-xs uppercase tracking-widest font-semibold text-stone-700 font-mono">Detection Status</div>
              </div>
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
                      <div className="h-1 bg-stone-100 w-full rounded-none">
                        <div className="h-1 transition-all duration-500" style={{ width: `${pct}%`, background: statusDot(s) }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Platforms */}
            <div className="bg-white border border-stone-200">
              <div className="px-4 py-3 border-b border-stone-100">
                <div className="text-xs uppercase tracking-widest font-semibold text-stone-700 font-mono">Top Platforms</div>
              </div>
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

            {/* Content Mix */}
            <div className="bg-white border border-stone-200">
              <div className="px-4 py-3 border-b border-stone-100">
                <div className="text-xs uppercase tracking-widest font-semibold text-stone-700 font-mono">Content Mix</div>
              </div>
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

            {/* System Info */}
            <div className="bg-stone-950 text-white p-4">
              <div className="text-xs uppercase tracking-widest text-stone-400 mb-3 font-mono">System Info</div>
              <div className="space-y-2 font-mono">
                {[
                  ["Module", "Content Tracker"],
                  ["Agency", "PLANE—SITE"],
                  ["Platforms indexed", PLATFORMS.length],
                  ["Last scan", lastScan],
                  ["Status", null],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-stone-400">{k}</span>
                    {k === "Status"
                      ? <span className="text-emerald-400 font-semibold">● Active</span>
                      : <span className="text-stone-200">{v}</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
