/**
 * Server-only data layer for news and promotional banners.
 *
 * Both endpoints are public (no auth) and both are live today. Neither has
 * usable content yet, and that is the problem this file is built around.
 *
 * WHY THERE IS A QUALITY GATE
 * /api/getnews currently returns two records whose titles are "rgr" and
 * "sdfgf", whose descriptions are "dfgdf" and "sfgs", and one of whose links
 * points at a personal Gmail inbox. That is somebody testing the admin form,
 * not editorial content. Publishing it would put gibberish on a public,
 * indexable page and leak a private URL.
 *
 * Deleting those rows is not this layer's job - they are the admin's data, and
 * a frontend should not decide what to destroy. So instead every record is held
 * to a minimum standard before it can be rendered, and anything that fails is
 * dropped silently. The feature is complete and shipping; it simply shows
 * nothing until the content is real.
 *
 * The thresholds are deliberately low - a real headline clears them without
 * effort. They exist to catch keyboard-mashing, not to enforce a house style.
 *
 * WHEN REAL CONTENT ARRIVES nothing here needs changing: the article appears,
 * /news becomes indexable on its own, and app/sitemap.js starts listing it.
 */

if (typeof window !== "undefined") {
  throw new Error("lib/newsroom.js is server-only - it reads BACKEND_URL.");
}

const BACKEND_URL = (process.env.BACKEND_URL || "").replace(/\/+$/, "");
const TIMEOUT_MS = 8000;

/** News changes far less often than exhibition data. */
const REVALIDATE = 1800;

const str = (v) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());

async function getJson(path, revalidate = REVALIDATE) {
  if (!BACKEND_URL) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      signal: controller.signal,
      next: { revalidate },
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // fail soft, exactly like lib/public-api.js
  } finally {
    clearTimeout(timer);
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Quality gate                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

/** Minimum lengths a human-written headline and blurb clear without trying. */
const MIN_TITLE = 12;
const MIN_DESCRIPTION = 40;

/**
 * Reject strings with no vowel, no space, or a run of consonants long enough
 * that no real word or name matches it. "rgr" and "sdfgf" fail all three;
 * "IFA Berlin opens" and "Messe Frankfurt announces 2027 dates" fail none.
 */
function looksLikeGibberish(value) {
  const s = str(value).toLowerCase();
  if (!s) return true;
  if (!/[aeiou]/.test(s)) return true;
  if (!s.includes(" ")) return true;
  if (/[bcdfghjklmnpqrstvwxyz]{6,}/.test(s)) return true;
  return false;
}

/**
 * A link is only shown when it is a public https destination. A personal
 * mailbox, an intranet host or a bare http URL is dropped and the article
 * renders without a link rather than sending a reader somewhere private.
 */
const PRIVATE_HOSTS = /(^|\.)(mail\.google\.com|drive\.google\.com|localhost|127\.0\.0\.1|192\.168\.|10\.)/i;

function usableLink(value) {
  const url = str(value);
  if (!url.startsWith("https://")) return "";
  try {
    const parsed = new URL(url);
    if (PRIVATE_HOSTS.test(parsed.hostname)) return "";
    if (parsed.hostname === "mail.google.com") return "";
    return url;
  } catch {
    return "";
  }
}

/** True when a record is worth showing a reader. */
export function isPublishable(article) {
  if (!article) return false;
  if (article.title.length < MIN_TITLE) return false;
  if (article.description.length < MIN_DESCRIPTION) return false;
  if (looksLikeGibberish(article.title)) return false;
  if (looksLikeGibberish(article.description)) return false;
  return true;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  News                                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

/** Allow-list projection. `createdBy` is an internal reference and is dropped. */
function toArticle(doc) {
  if (!doc?._id) return null;
  return {
    id: str(doc._id),
    title: str(doc.news_title),
    description: str(doc.news_description),
    category: looksLikeGibberish(doc.new_category) ? "" : str(doc.new_category),
    link: usableLink(doc.news_url),
    image: usableLink(doc.news_image_url),
  };
}

/**
 * Publishable news, newest first.
 *
 * Returns `{ items, suppressed }` rather than a bare array: the page needs to
 * know the difference between "the feed is empty" and "the feed had records but
 * none were fit to publish", and an admin deserves to be told which.
 */
export async function getNews() {
  const payload = await getJson("/api/getnews");
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const mapped = rows.map(toArticle).filter(Boolean);
  const items = mapped.filter(isPublishable);
  return { items, suppressed: mapped.length - items.length, total: mapped.length };
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Banners                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Sponsor banners for the homepage slot.
 *
 * The schema requires a title, a date, a picture and a sponsor name, so a
 * record missing any of them is malformed rather than merely sparse and is
 * dropped. An expired banner is dropped too: a promotion for a date that has
 * passed is worse than no promotion.
 */
function toBanner(doc) {
  if (!doc?._id) return null;
  const picture = usableLink(doc.picture);
  const title = str(doc.title_name);
  const sponsor = str(doc.sponsor_name);
  if (!picture || !title || !sponsor) return null;

  const date = doc.date ? new Date(doc.date) : null;
  if (!date || Number.isNaN(date.getTime())) return null;

  return { id: str(doc._id), title, sponsor, picture, date: date.toISOString() };
}

/** Live, non-expired banners. Empty today, and the slot renders nothing. */
export async function getBanners() {
  const payload = await getJson("/api/getbanners");
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const now = Date.now();
  return rows
    .map(toBanner)
    .filter(Boolean)
    .filter((b) => new Date(b.date).getTime() >= now - 86400000) // yesterday onward
    .sort((a, b) => a.date.localeCompare(b.date));
}
