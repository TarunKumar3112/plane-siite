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

// ─── Supabase REST helpers (no SDK needed) ───────────────────────────────────
async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`DB error ${res.status}`);
  return res.json();
}

async function sbPost(path, data, headers = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || `DB error ${res.status}`); }
  return res.status === 204 ? null : res.json();
}

async function sbDelete(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "DELETE",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`DB delete error ${res.status}`);
}

async function runCrawlCompetitor({ competitorId, competitorUrl, competitorName }) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/crawl-competitor`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ competitorId, competitorUrl, competitorName }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Crawl failed (${res.status})`); }
  return res.json();
}

async function runBenchmarkReport({ contentTitle, tags, contentType }) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/benchmark-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ contentTitle, tags, contentType }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Report failed (${res.status})`); }
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

// ─── Module 3 competitor data lives in Supabase (ps_competitors / ps_competitor_content) ───
// See supabase/migrations/benchmark_tables.sql
const _unused = { // removed old pre-seeded data — data is now in Supabase
  c1: {
    items: [
      {
        id: "b-c1-1",
        query: '"Chicago Architecture Biennial 2023"',
        platform: "Archdaily",
        url: "https://archdaily.com/2023/chicago-architecture-biennial-2023-this-is-for-everyone",
        title: "Chicago Architecture Biennial 2023: 'This Is For Everyone'",
        snippet: "The fifth edition of the Chicago Architecture Biennial opened September 14, presenting commissioned projects by 80 practitioners from 20 countries, running through December 31.",
        dateDetected: "2023-09-14",
        sentiment: "Positive",
        inferredType: "Article",
        matchedTags: ["Chicago Architecture Biennial", "biennial", "architecture"],
        relevanceScore: 9,
      },
      {
        id: "b-c1-2",
        query: '"Chicago Architecture Biennial 2023"',
        platform: "Dezeen",
        url: "https://dezeen.com/2023/09/chicago-architecture-biennial-2023-review",
        title: "Chicago Architecture Biennial 2023: Architecture for Accessibility and Public Space",
        snippet: "Dezeen reviews the opening of this year's biennial, examining how participating practices are engaging with Chicago's built environment through installations, workshops, and film programs.",
        dateDetected: "2023-09-16",
        sentiment: "Positive",
        inferredType: "Article",
        matchedTags: ["Chicago Architecture Biennial", "biennial", "architecture"],
        relevanceScore: 9,
      },
      {
        id: "b-c1-3",
        query: "CAB Chicago Architecture Biennial architecture",
        platform: "Archinect",
        url: "https://archinect.com/news/article/chicago-architecture-biennial-2023-highlights",
        title: "Highlights from the 2023 Chicago Architecture Biennial Opening Week",
        snippet: "Archinect rounds up the most compelling installations, talks, and documentary projects from the 2023 Chicago Architecture Biennial opening week, including coverage from media partners.",
        dateDetected: "2023-09-20",
        sentiment: "Positive",
        inferredType: "Article",
        matchedTags: ["CAB", "Chicago Architecture Biennial", "architecture"],
        relevanceScore: 8,
      },
      {
        id: "b-c1-4",
        query: "CAB video documentary architecture",
        platform: "Vimeo",
        url: "https://vimeo.com/863210000",
        title: "Chicago Architecture Biennial 2023 — Official Opening Documentation",
        snippet: "Video documentation of the Chicago Architecture Biennial 2023 opening week, capturing installations, artist talks, and the public programming at venues across the city.",
        dateDetected: "2023-09-17",
        sentiment: "Neutral",
        inferredType: "Video",
        matchedTags: ["CAB", "Chicago Architecture Biennial", "biennial"],
        relevanceScore: 8,
      },
      {
        id: "b-c1-5",
        query: "CAB video documentary architecture",
        platform: "YouTube",
        url: "https://youtube.com/watch?v=cab2023opening",
        title: "Chicago Architecture Biennial 2023: Walking Through the Installations",
        snippet: "A walkthrough video capturing the major installations at the 2023 Chicago Architecture Biennial. Produced by the biennial's communications team.",
        dateDetected: "2023-09-22",
        sentiment: "Positive",
        inferredType: "Video",
        matchedTags: ["Chicago Architecture Biennial", "biennial", "architecture"],
        relevanceScore: 7,
      },
      {
        id: "b-c1-6",
        query: '"Chicago Architecture Biennial 2023"',
        platform: "Architectural Record",
        url: "https://archrecord.com/2023/09/chicago-biennial-this-is-for-everyone",
        title: "Chicago Architecture Biennial 2023 Review: Ambition, Access, and Architecture",
        snippet: "Our critic reviews the fifth edition of the Chicago Architecture Biennial, noting its emphasis on inclusive design, community engagement, and the balance between spectacle and substance.",
        dateDetected: "2023-10-01",
        sentiment: "Positive",
        inferredType: "Article",
        matchedTags: ["Chicago Architecture Biennial", "biennial", "architecture"],
        relevanceScore: 7,
      },
      {
        id: "b-c1-7",
        query: "CAB Chicago Architecture Biennial architecture",
        platform: "e-flux",
        url: "https://e-flux.com/announcements/chicago-architecture-biennial-2023",
        title: "Chicago Architecture Biennial 2023 — This Is For Everyone",
        snippet: "e-flux announcements: The Chicago Architecture Biennial presents its fifth edition, running from September 14 through December 31, 2023 at venues across the city.",
        dateDetected: "2023-09-14",
        sentiment: "Neutral",
        inferredType: "Press Release",
        matchedTags: ["Chicago Architecture Biennial", "biennial"],
        relevanceScore: 6,
      },
    ],
    queries: ['"Chicago Architecture Biennial 2023"', "CAB Chicago Architecture Biennial architecture", "CAB video documentary architecture"],
    lastScanned: "2023-10-05",
  },
  c4: {
    items: [
      {
        id: "b-c4-1",
        query: '"Venice Architecture Biennale" education',
        platform: "Archdaily",
        url: "https://archdaily.com/2023/venice-biennale-education-programs-2023",
        title: "Venice Architecture Biennale 2023: Education Programs Redefine Participation",
        snippet: "The education programs at this year's Venice Architecture Biennale are setting a new standard for public engagement, with workshops and participatory installations reaching record audiences.",
        dateDetected: "2023-05-23",
        sentiment: "Positive",
        inferredType: "Article",
        matchedTags: ["Venice Biennale", "education", "architecture"],
        relevanceScore: 9,
      },
      {
        id: "b-c4-2",
        query: '"Venice Architecture Biennale" education',
        platform: "Domus",
        url: "https://domusweb.it/architecture/venice-biennale-education-2023",
        title: "Biennale Architettura 2023 — Learning in Space",
        snippet: "Domus examines how education has become central to the Venice Architecture Biennale's curatorial vision, with dedicated pavilions for students and emerging practitioners.",
        dateDetected: "2023-05-26",
        sentiment: "Positive",
        inferredType: "Article",
        matchedTags: ["Venice Biennale", "education", "architecture", "Italy"],
        relevanceScore: 9,
      },
      {
        id: "b-c4-3",
        query: "Venice Biennale education architecture Italy",
        platform: "Dezeen",
        url: "https://dezeen.com/2023/venice-architecture-biennale-education-coverage",
        title: "Venice Architecture Biennale 2023: The Year Architecture Went Back to School",
        snippet: "Dezeen explores the education-focused theme running through this year's Venice Architecture Biennale, highlighting standout national pavilions and collaborative learning environments.",
        dateDetected: "2023-05-28",
        sentiment: "Positive",
        inferredType: "Article",
        matchedTags: ["Venice Biennale", "education", "architecture"],
        relevanceScore: 8,
      },
      {
        id: "b-c4-4",
        query: "Venice Biennale education architecture Italy",
        platform: "Frame Magazine",
        url: "https://frame-web.com/news/venice-biennale-2023-education-design",
        title: "Education as Architecture: Venice Biennale 2023 Special Report",
        snippet: "Frame Magazine's on-the-ground report from Venice covers the spatial design of educational installations and how curators are rethinking knowledge exchange in architectural terms.",
        dateDetected: "2023-06-05",
        sentiment: "Positive",
        inferredType: "Article",
        matchedTags: ["Venice Biennale", "education", "architecture"],
        relevanceScore: 7,
      },
      {
        id: "b-c4-5",
        query: "Venice Biennale education architecture project",
        platform: "e-flux",
        url: "https://e-flux.com/architecture/venice-biennale-2023-education-platform",
        title: "Architecture and Education at the 2023 Venice Biennale",
        snippet: "e-flux architecture publishes a critical essay on the intersection of education and the built environment, prompted by this year's Venice Architecture Biennale programming.",
        dateDetected: "2023-06-10",
        sentiment: "Neutral",
        inferredType: "Article",
        matchedTags: ["Venice Biennale", "education", "architecture"],
        relevanceScore: 7,
      },
      {
        id: "b-c4-6",
        query: '"Venice Architecture Biennale" education',
        platform: "Wallpaper*",
        url: "https://wallpaper.com/architecture/venice-biennale-2023-guide",
        title: "Venice Architecture Biennale 2023: What You Need to Know",
        snippet: "Wallpaper's guide to the 2023 Venice Architecture Biennale, including highlights from the education-focused national pavilions and the central exhibition at the Arsenale.",
        dateDetected: "2023-05-21",
        sentiment: "Positive",
        inferredType: "Article",
        matchedTags: ["Venice Biennale", "architecture", "Italy"],
        relevanceScore: 6,
      },
    ],
    queries: ['"Venice Architecture Biennale" education', "Venice Biennale education architecture Italy", "Venice Biennale education architecture project"],
    lastScanned: "2023-06-15",
  },
};

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

const relevanceStyle = (score) => {
  if (score >= 8) return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (score >= 5) return "bg-amber-50 text-amber-700 border border-amber-200";
  return "bg-stone-100 text-stone-500 border border-stone-200";
};

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

function exportBenchmarkCSV(contentTitle, matches) {
  const rows = [["Content Title", "Competitor", "Competitor URL", "Article Title", "Article URL", "Snippet", "Content Type", "Tags", "Overlap Score", "Crawled At"]];
  matches.forEach((m) => {
    rows.push([contentTitle, m.ps_competitors?.name || "", m.ps_competitors?.url || "", m.title, m.url, m.snippet, m.content_type, (m.tags || []).join("; "), m.overlapScore ?? "", m.crawled_at || ""]);
  });
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: "planesite-benchmark.csv" });
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

// ─── Module 3 Components ───────────────────────────────────────────────────────
function CompetitorCard({ competitor, articleCount, isCrawling, onCrawl, onDelete }) {
  const crawled = competitor.last_crawled_at
    ? new Date(competitor.last_crawled_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
  return (
    <div className="bg-white border border-stone-200 hover:border-stone-400 transition-all p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-stone-950 leading-snug">{competitor.name}</div>
          <a href={competitor.url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-stone-400 font-mono hover:text-stone-700 truncate block mt-0.5" title={competitor.url}>
            ↳ {competitor.url}
          </a>
          {competitor.description && (
            <div className="text-xs text-stone-500 mt-1.5 leading-snug">{competitor.description}</div>
          )}
        </div>
        <button onClick={() => onDelete(competitor.id)}
          className="text-stone-300 hover:text-red-500 transition-colors text-xs font-mono shrink-0">✕</button>
      </div>
      <div className="flex items-center gap-3 text-xs font-mono">
        <span className="text-stone-700 font-semibold">{articleCount}</span>
        <span className="text-stone-400">articles</span>
        <span className="text-stone-300">·</span>
        <span className="text-stone-400">{crawled ? `crawled ${crawled}` : "not crawled"}</span>
      </div>
      <button onClick={() => onCrawl(competitor)} disabled={isCrawling}
        className={`w-full py-1.5 text-xs uppercase tracking-widest font-mono transition-colors ${isCrawling ? "bg-stone-100 text-stone-400 cursor-not-allowed" : "border border-stone-300 hover:bg-stone-950 hover:border-stone-950 hover:text-white"}`}>
        {isCrawling ? "Crawling…" : "↓ Crawl"}
      </button>
    </div>
  );
}

function AddCompetitorForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({ name: "", url: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const valid = form.name.trim() && form.url.trim();
  const inp = "w-full border border-stone-300 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:border-stone-950 transition-colors";
  const lbl = "block text-xs uppercase tracking-widest text-stone-400 mb-1";

  const handle = async () => {
    if (!valid || saving) return;
    setSaving(true); setError(null);
    try { await onAdd({ name: form.name.trim(), url: form.url.trim(), description: form.description.trim() }); }
    catch (e) { setError(e.message); setSaving(false); }
  };

  return (
    <div className="bg-white border border-stone-950 p-5 col-span-full">
      <div className="text-xs uppercase tracking-widest text-stone-400 mb-4 font-mono">Add Competitor</div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={lbl}>Name *</label><input className={inp} placeholder="Dezeen" value={form.name} onChange={set("name")} /></div>
        <div><label className={lbl}>URL *</label><input className={inp} placeholder="https://dezeen.com" value={form.url} onChange={set("url")} /></div>
        <div className="col-span-2"><label className={lbl}>Description</label><input className={inp} placeholder="Architecture and design magazine" value={form.description} onChange={set("description")} /></div>
      </div>
      {error && <div className="mt-3 text-xs text-red-600 font-mono">✕ {error}</div>}
      <div className="flex gap-3 mt-4">
        <button onClick={handle} disabled={!valid || saving}
          className={`px-5 py-2 text-xs uppercase tracking-widest font-mono transition-colors ${valid && !saving ? "bg-stone-950 text-white hover:bg-stone-700" : "bg-stone-200 text-stone-400 cursor-not-allowed"}`}>
          {saving ? "Saving…" : "Add"}
        </button>
        <button onClick={onCancel} disabled={saving} className="border border-stone-300 px-5 py-2 text-xs uppercase tracking-widest font-mono hover:bg-stone-50 transition-colors">Cancel</button>
      </div>
    </div>
  );
}

function BenchmarkMatchCard({ match, myTags }) {
  const overlap = (match.tags || []).filter((t) =>
    myTags.some((mt) => mt.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(mt.toLowerCase()))
  );
  return (
    <div className={`bg-white border transition-all hover:border-stone-400 ${overlap.length >= 3 ? "border-emerald-200" : "border-stone-200"}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {overlap.length > 0 && (
                <span className={`text-xs px-2 py-0.5 font-mono font-semibold ${relevanceStyle(Math.min(10, overlap.length * 3))}`}>
                  {overlap.length} overlap
                </span>
              )}
              <span className="text-xs bg-stone-100 text-stone-600 border border-stone-200 px-2 py-0.5 font-mono">
                {typeIcon(match.content_type)} {match.content_type}
              </span>
              <span className="text-xs text-stone-500 font-mono font-medium">{match.ps_competitors?.name}</span>
              {match.is_mock && <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 font-mono">demo</span>}
              <span className="text-xs text-stone-300 font-mono ml-auto">{match.published_at || match.crawled_at?.split("T")[0]}</span>
            </div>
            <a href={match.url} target="_blank" rel="noopener noreferrer"
              className="block text-sm font-semibold text-stone-950 hover:underline leading-snug mb-2">
              {match.title || match.url}
            </a>
            {match.snippet && (
              <p className="text-xs text-stone-500 font-mono leading-relaxed border-l-2 border-stone-200 pl-3 mb-2 line-clamp-2">
                "{match.snippet}"
              </p>
            )}
            {overlap.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {overlap.map((t) => (
                  <span key={t} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 font-mono">✓ {t}</span>
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0 mt-1">
            <div className="w-2 h-2 rounded-full bg-stone-300" />
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

  // ── Module 3 state ─────────────────────────────────────────────────────────
  const [competitors, setCompetitors] = useState([]);
  const [competitorContent, setCompetitorContent] = useState({}); // { competitorId: articles[] }
  const [m3View, setM3View] = useState("competitors");
  const [m3Loading, setM3Loading] = useState(false);
  const [m3Error, setM3Error] = useState(null);
  const [crawlingId, setCrawlingId] = useState(null);
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);
  const [benchmarkContentId, setBenchmarkContentId] = useState(null);
  const [benchmarkReport, setBenchmarkReport] = useState(null);
  const [benchmarkGenerating, setBenchmarkGenerating] = useState(false);
  const [benchmarkError, setBenchmarkError] = useState(null);
  const [benchmarkQuery, setBenchmarkQuery] = useState("");

  // ── Shared state ───────────────────────────────────────────────────────────
  const [activeModule, setActiveModule] = useState("module1");
  const [toast, setToast] = useState(null);

  const lastScan = new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  // ── Persist to localStorage ────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem("ps-content-v1", JSON.stringify(contents)); }, [contents]);
  useEffect(() => { localStorage.setItem("ps-brand-mentions-v1", JSON.stringify(brandMentions)); }, [brandMentions]);
  useEffect(() => { if (brandLastScan) localStorage.setItem("ps-brand-last-scan", brandLastScan); }, [brandLastScan]);

  useEffect(() => {
    if (activeModule !== "module3") return;
    setM3Loading(true);
    sbGet("ps_competitors?select=*&order=created_at.asc")
      .then(setCompetitors)
      .catch((e) => setM3Error(e.message))
      .finally(() => setM3Loading(false));
  }, [activeModule]);

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

  // ── Module 3 derived data ──────────────────────────────────────────────────
  const totalArticlesCrawled = useMemo(() =>
    Object.values(competitorContent).reduce((sum, a) => sum + a.length, 0),
    [competitorContent]);

  const activeBenchmarkContent = useMemo(() =>
    contents.find((c) => c.id === benchmarkContentId) || contents[0] || null,
    [contents, benchmarkContentId]);

  const filteredBenchmarkMatches = useMemo(() => {
    if (!benchmarkReport?.matches) return [];
    const q = benchmarkQuery.toLowerCase();
    return benchmarkReport.matches.filter((m) =>
      !q || m.title.toLowerCase().includes(q) || (m.snippet || "").toLowerCase().includes(q) || (m.ps_competitors?.name || "").toLowerCase().includes(q)
    );
  }, [benchmarkReport, benchmarkQuery]);

  const benchmarkCompetitorCounts = useMemo(() => {
    if (!benchmarkReport?.matches) return [];
    const map = {};
    benchmarkReport.matches.forEach((m) => { const n = m.ps_competitors?.name || "Unknown"; map[n] = (map[n] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [benchmarkReport]);

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

  const handleAddCompetitor = async (form) => {
    const created = await sbPost("ps_competitors", form, { Prefer: "return=representation" });
    const newComp = Array.isArray(created) ? created[0] : created;
    setCompetitors((prev) => [...prev, newComp]);
    setShowAddCompetitor(false);
    showToast(`${newComp.name} added`);
  };

  const handleDeleteCompetitor = async (id) => {
    await sbDelete(`ps_competitors?id=eq.${id}`);
    setCompetitors((prev) => prev.filter((c) => c.id !== id));
    setCompetitorContent((prev) => { const n = { ...prev }; delete n[id]; return n; });
    showToast("Competitor removed");
  };

  const handleCrawl = async (competitor) => {
    setCrawlingId(competitor.id);
    try {
      const { articles, mode } = await runCrawlCompetitor({
        competitorId: competitor.id,
        competitorUrl: competitor.url,
        competitorName: competitor.name,
      });
      setCompetitorContent((prev) => ({ ...prev, [competitor.id]: articles }));
      setCompetitors((prev) => prev.map((c) => c.id === competitor.id ? { ...c, last_crawled_at: new Date().toISOString() } : c));
      showToast(`${competitor.name} crawled — ${articles.length} articles${mode === "mock" ? " (demo mode)" : ""}`);
    } catch (e) {
      setM3Error(e.message);
    } finally {
      setCrawlingId(null);
    }
  };

  const handleBenchmarkReport = async () => {
    if (!activeBenchmarkContent || benchmarkGenerating) return;
    setBenchmarkGenerating(true);
    setBenchmarkError(null);
    try {
      const report = await runBenchmarkReport({
        contentTitle: activeBenchmarkContent.title,
        tags: activeBenchmarkContent.tags,
        contentType: activeBenchmarkContent.type,
      });
      setBenchmarkReport(report);
      showToast(`Report ready — ${report.totalMatches} competitor articles matched`);
    } catch (e) {
      setBenchmarkError(e.message);
    } finally {
      setBenchmarkGenerating(false);
    }
  };

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
          <button
            onClick={() => setActiveModule("module3")}
            className={`px-5 py-3 text-xs font-mono uppercase tracking-widest transition-colors ${activeModule === "module3" ? "bg-white text-stone-950 font-semibold" : "text-stone-400 hover:text-stone-200"}`}
          >
            △ Module 3 · Benchmark
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
              {activeModule === "module1" ? "Content Tracker" : activeModule === "module2" ? "Brand Monitor" : "Content Benchmark"}
            </div>
            <div className="text-xs text-stone-400 font-mono mt-1.5">
              {activeModule === "module1" ? `Last scan: ${lastScan}` : activeModule === "module2" ? `Last scan: ${brandLastScan}` : `${competitors.length} competitors · ${totalArticlesCrawled} articles`}
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

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* MODULE 3: CONTENT BENCHMARK                                        */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeModule === "module3" && (
          <>
            {/* Module 3 header */}
            <div className="bg-stone-950 text-white px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs uppercase tracking-widest text-stone-400 font-mono mb-0.5">Module 3 · Content Benchmark</div>
                <div className="text-sm font-mono text-stone-300 leading-relaxed max-w-xl">
                  Crawl competitor sites. Generate AI-powered gap analysis against your own content.
                </div>
              </div>
              <div className="flex gap-0 border border-stone-700 shrink-0">
                {[["competitors", "◫ Competitors"], ["benchmark", "△ Benchmark"]].map(([v, label]) => (
                  <button key={v} onClick={() => setM3View(v)}
                    className={`px-4 py-2 text-xs font-mono uppercase tracking-widest transition-colors ${m3View === v ? "bg-white text-stone-950 font-semibold" : "text-stone-400 hover:text-stone-200"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Shared error */}
            {m3Error && (
              <div className="bg-red-50 border border-red-200 p-3 flex items-center gap-3">
                <span className="text-red-500 text-sm shrink-0">✕</span>
                <span className="text-xs text-red-700 font-mono flex-1">{m3Error}</span>
                <button onClick={() => setM3Error(null)} className="text-red-400 hover:text-red-600 font-mono text-xs shrink-0">dismiss</button>
              </div>
            )}

            {/* ── COMPETITORS VIEW ── */}
            {m3View === "competitors" && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard label="Competitors" value={competitors.length} accent />
                  <StatCard label="Articles Crawled" value={totalArticlesCrawled} />
                  <StatCard label="Crawled" value={competitors.filter((c) => c.last_crawled_at).length} positive />
                  <StatCard label="Pending" value={competitors.filter((c) => !c.last_crawled_at).length} />
                </div>

                {/* Add competitor notice */}
                <div className="bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-3 text-xs font-mono">
                  <span className="text-amber-600 font-semibold shrink-0">Demo mode</span>
                  <span className="text-amber-700">Crawl will populate with sample architecture articles until <code className="bg-amber-100 px-1">FIRECRAWL_API_KEY</code> is set. Reports work without Claude too — add <code className="bg-amber-100 px-1">ANTHROPIC_API_KEY</code> for AI insights.</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-xs uppercase tracking-widest font-mono text-stone-400 flex-1">
                    {m3Loading ? "Loading…" : `${competitors.length} competitors`}
                  </div>
                  <button onClick={() => setShowAddCompetitor((p) => !p)}
                    className="bg-stone-950 text-white px-4 py-2 text-xs uppercase tracking-widest font-mono hover:bg-stone-700 transition-colors">
                    + Add Competitor
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {showAddCompetitor && (
                    <AddCompetitorForm onAdd={handleAddCompetitor} onCancel={() => setShowAddCompetitor(false)} />
                  )}
                  {competitors.map((comp) => (
                    <CompetitorCard
                      key={comp.id}
                      competitor={comp}
                      articleCount={competitorContent[comp.id]?.length ?? 0}
                      isCrawling={crawlingId === comp.id}
                      onCrawl={handleCrawl}
                      onDelete={handleDeleteCompetitor}
                    />
                  ))}
                  {!m3Loading && competitors.length === 0 && !showAddCompetitor && (
                    <div className="col-span-full bg-white border border-stone-200 p-12 text-center text-xs text-stone-400 font-mono uppercase tracking-widest">
                      No competitors yet — add one above
                    </div>
                  )}
                </div>

                {/* Per-competitor crawled articles preview */}
                {Object.entries(competitorContent).map(([compId, articles]) => {
                  if (!articles.length) return null;
                  const comp = competitors.find((c) => c.id === compId);
                  if (!comp) return null;
                  return (
                    <div key={compId} className="bg-white border border-stone-200">
                      <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                        <div className="text-xs uppercase tracking-widest font-semibold text-stone-700 font-mono">{comp.name} — {articles.length} articles</div>
                        {articles[0]?.is_mock && <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 font-mono">demo data</span>}
                      </div>
                      <div className="divide-y divide-stone-100 max-h-64 overflow-y-auto">
                        {articles.slice(0, 8).map((a, i) => (
                          <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                            <span className="text-stone-300 font-mono text-xs shrink-0 mt-0.5">{typeIcon(a.content_type)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-stone-800 leading-snug truncate">{a.title}</div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(a.tags || []).slice(0, 4).map((t) => <span key={t} className="text-xs bg-stone-100 text-stone-500 px-1.5 py-0.5 font-mono">{t}</span>)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* ── BENCHMARK VIEW ── */}
            {m3View === "benchmark" && (
              <>
                {/* Content selector + generate */}
                <div className="bg-white border border-stone-200 p-4 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-52">
                    <div className="text-xs uppercase tracking-widest text-stone-400 font-mono mb-1.5">Benchmark against</div>
                    <select value={benchmarkContentId || ""}
                      onChange={(e) => { setBenchmarkContentId(e.target.value); setBenchmarkReport(null); setBenchmarkQuery(""); }}
                      className="w-full border border-stone-300 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:border-stone-950 transition-colors">
                      {contents.map((c) => <option key={c.id} value={c.id}>{typeIcon(c.type)} {c.title}</option>)}
                    </select>
                  </div>
                  {activeBenchmarkContent && (
                    <div className="flex flex-wrap gap-1 flex-1 min-w-52">
                      {activeBenchmarkContent.tags.map((t) => (
                        <span key={t} className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 font-mono">{t}</span>
                      ))}
                    </div>
                  )}
                  <button onClick={handleBenchmarkReport} disabled={benchmarkGenerating || !activeBenchmarkContent}
                    className={`px-6 py-3 text-xs uppercase tracking-widest font-mono font-semibold transition-colors shrink-0 ${benchmarkGenerating || !activeBenchmarkContent ? "bg-stone-200 text-stone-400 cursor-not-allowed" : "bg-stone-950 text-white hover:bg-stone-700"}`}>
                    {benchmarkGenerating ? "Generating…" : "△ Generate Report"}
                  </button>
                </div>

                {benchmarkError && (
                  <div className="bg-red-50 border border-red-200 p-4 text-xs text-red-700 font-mono">✕ {benchmarkError}</div>
                )}

                {!benchmarkReport ? (
                  <div className="bg-white border border-stone-200 p-16 text-center">
                    <div className="text-3xl text-stone-200 mb-4 font-mono">△</div>
                    <div className="text-xs uppercase tracking-widest text-stone-400 font-mono mb-3">No Report Yet</div>
                    <div className="text-sm text-stone-500 font-mono max-w-sm mx-auto leading-relaxed">
                      Crawl at least one competitor, then click Generate Report to see who else covers your topics and where the gaps are.
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

                    {/* Left: matches + AI insight */}
                    <div className="xl:col-span-2 space-y-3">

                      {/* AI Insight block */}
                      {benchmarkReport.insight && (
                        <div className={`p-5 border ${benchmarkReport.insightMode === "claude" ? "bg-stone-950 border-stone-800" : "bg-amber-50 border-amber-200"}`}>
                          <div className={`text-xs uppercase tracking-widest font-mono mb-3 ${benchmarkReport.insightMode === "claude" ? "text-stone-400" : "text-amber-600"}`}>
                            {benchmarkReport.insightMode === "claude" ? "◈ AI Analysis — Claude" : "◈ Structural Analysis"}
                          </div>
                          <p className={`text-sm leading-relaxed font-mono whitespace-pre-wrap ${benchmarkReport.insightMode === "claude" ? "text-stone-200" : "text-amber-800"}`}>
                            {benchmarkReport.insight}
                          </p>
                        </div>
                      )}

                      {/* Tag coverage */}
                      {benchmarkReport.tagCoverage && activeBenchmarkContent && (
                        <div className="bg-white border border-stone-200 p-4">
                          <div className="text-xs uppercase tracking-widest font-mono text-stone-500 mb-3">Topic Coverage Matrix</div>
                          <div className="space-y-2.5">
                            {activeBenchmarkContent.tags.map((tag) => {
                              const coverage = benchmarkReport.tagCoverage[tag] || { count: 0, competitors: [] };
                              const total = benchmarkReport.totalMatches || 1;
                              const pct = Math.min(100, (coverage.count / Math.max(total / 3, 1)) * 100);
                              const label = coverage.count === 0 ? "Gap — no coverage" : coverage.count <= 2 ? "Low coverage" : "Well covered";
                              const color = coverage.count === 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : coverage.count <= 2 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-600 border-red-200";
                              return (
                                <div key={tag}>
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-xs font-mono text-stone-700 min-w-36 shrink-0">{tag}</span>
                                    <span className={`text-xs px-1.5 py-0.5 font-mono border ${color}`}>{label}</span>
                                    {coverage.competitors.length > 0 && (
                                      <span className="text-xs text-stone-400 font-mono">{coverage.competitors.join(", ")}</span>
                                    )}
                                  </div>
                                  <div className="h-1 bg-stone-100">
                                    <div className="h-1 transition-all" style={{ width: `${pct}%`, background: coverage.count === 0 ? "#10b981" : coverage.count <= 2 ? "#f59e0b" : "#ef4444" }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Matching articles */}
                      <div className="flex flex-wrap items-center gap-2">
                        <input type="text" placeholder="Filter articles…" value={benchmarkQuery}
                          onChange={(e) => setBenchmarkQuery(e.target.value)}
                          className="flex-1 min-w-44 border border-stone-300 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:border-stone-950 transition-colors" />
                        {benchmarkReport.matches?.length > 0 && (
                          <button onClick={() => exportBenchmarkCSV(activeBenchmarkContent?.title || "benchmark", benchmarkReport.matches)}
                            className="border border-stone-300 bg-white px-4 py-2 text-xs uppercase tracking-widest font-mono hover:bg-stone-50 transition-colors">
                            ↓ CSV
                          </button>
                        )}
                      </div>

                      {filteredBenchmarkMatches.length === 0 ? (
                        <div className="bg-white border border-stone-200 p-8 text-center text-xs text-stone-400 font-mono uppercase tracking-widest">
                          {benchmarkReport.totalMatches === 0 ? "No competitor articles match these topics — crawl competitors first" : "No articles match filter"}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredBenchmarkMatches.map((m) => (
                            <BenchmarkMatchCard key={m.id} match={m} myTags={activeBenchmarkContent?.tags || []} />
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-stone-400 font-mono">{filteredBenchmarkMatches.length} of {benchmarkReport.totalMatches} matches</div>
                    </div>

                    {/* Right: sidebar */}
                    <div className="space-y-4">

                      {/* Competitor breakdown */}
                      <div className="bg-white border border-stone-200">
                        <div className="px-4 py-3 border-b border-stone-100">
                          <div className="text-xs uppercase tracking-widest font-semibold text-stone-700 font-mono">By Competitor</div>
                        </div>
                        <div className="p-4 space-y-2.5">
                          {benchmarkCompetitorCounts.length === 0 ? (
                            <div className="text-xs text-stone-400 font-mono text-center py-2">No data yet</div>
                          ) : (
                            benchmarkCompetitorCounts.map(([name, count]) => {
                              const max = benchmarkCompetitorCounts[0][1];
                              return (
                                <div key={name}>
                                  <div className="flex justify-between text-xs font-mono mb-0.5">
                                    <span className="text-stone-600">{name}</span>
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
                            ["Module", "Content Benchmark"],
                            ["Crawler", "Firecrawl API"],
                            ["Analysis", "Claude Haiku"],
                            ["DB", "Supabase + pgvector"],
                            ["Status", null],
                          ].map(([k, v]) => (
                            <div key={k} className="flex justify-between text-xs">
                              <span className="text-stone-400">{k}</span>
                              {k === "Status" ? <span className="text-emerald-400 font-semibold">● Active</span> : <span className="text-stone-200">{v}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
