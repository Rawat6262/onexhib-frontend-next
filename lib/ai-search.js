/**
 * Maps an AI-search result row onto the shape the public cards already use.
 *
 * The ai-search endpoint returns raw Mongo documents (exhibition_name,
 * starting_date, exhibtion_url ...) rather than the projection lib/public-api.js
 * produces. Rather than teach ExhibitionCard a second shape, results are
 * translated here so the AI page renders with exactly the same card, link
 * builder and date formatting as every other listing on the site.
 *
 * Client-safe on purpose: lib/public-api.js is server-only, and this page runs
 * in the browser because the query is typed by a signed-in user.
 */

const DOCUMENT_EXTENSION = /\.(html?|php|aspx?|jsp|pdf)$/i;
const DATA_URI_MAX = 100 * 1024;

/** Hosts we serve ourselves and can therefore run through next/image. */
const OPTIMISABLE_HOSTS = new Set(["res.cloudinary.com"]);

/**
 * Same rules as toPublicImage() in lib/public-api.js, kept deliberately in step
 * with it: https only, no document URLs, capped inline images. Duplicated
 * rather than imported because that module pulls in server-only fetch config.
 */
function toImage(...candidates) {
  for (const candidate of candidates) {
    const url = typeof candidate === "string" ? candidate.trim() : "";
    if (!url) continue;

    if (url.startsWith("data:image/")) {
      if (url.length > DATA_URI_MAX) continue;
      return { url, host: "inline", optimized: false };
    }
    if (!url.startsWith("https://")) continue;

    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }
    if (DOCUMENT_EXTENSION.test(parsed.pathname)) continue;
    return { url, host: parsed.hostname, optimized: OPTIMISABLE_HOSTS.has(parsed.hostname) };
  }
  return null;
}

const str = (v) => (typeof v === "string" ? v.trim() : "");

/** One AI-search row -> the object ExhibitionCard expects. */
export function toCardExhibition(row) {
  return {
    id: row?._id,
    name: str(row?.exhibition_name),
    startDate: row?.starting_date || null,
    endDate: row?.ending_date || null,
    category: str(row?.category),
    venue: str(row?.venue),
    city: str(row?.city),
    state: str(row?.state),
    country: str(row?.country),
    image: toImage(row?.thumbnail_url, row?.original_image_url, row?.exhibtion_url),
  };
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Turn the filters the model extracted into readable chips.
 *
 * Showing these matters: it is how the user sees what the AI actually
 * understood, so a wrong result reads as a misread question rather than a
 * broken search. Only fields the model genuinely filled are shown.
 */
export function describeFilters(filters) {
  if (!filters) return [];
  const chips = [];
  if (filters.status) {
    chips.push({ label: "Status", value: filters.status === "previous" ? "past" : filters.status });
  }
  if (filters.category) chips.push({ label: "Category", value: filters.category });
  if (filters.keyword) chips.push({ label: "Matching", value: filters.keyword });
  if (filters.city) chips.push({ label: "City", value: filters.city });
  if (filters.state) chips.push({ label: "State", value: filters.state });
  if (filters.country) chips.push({ label: "Country", value: filters.country });
  if (filters.month && filters.year) {
    chips.push({ label: "When", value: `${MONTHS[filters.month - 1]} ${filters.year}` });
  }
  return chips;
}

/** Example prompts, written against filters the backend can actually extract. */
export const AI_SEARCH_EXAMPLES = [
  "technology exhibitions in Germany",
  "upcoming food and beverage trade shows in India",
  "exhibitions in Shanghai in March 2027",
  "textile shows happening now",
];
