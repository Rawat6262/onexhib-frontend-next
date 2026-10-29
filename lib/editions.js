/**
 * Editions of the same show: "AI India Expo 2026" and "AI India Expo 2027".
 *
 * WHY. Searches for a show are name + year ("pune expo 2026", "mediccon expo
 * 2026" in Search Console). An ended show's page used to say only "This
 * exhibition has already taken place" - a dead end for the visitor who wanted
 * the next one, and a page whose ranking signal went nowhere. Linking editions
 * sends both on to the show that is actually coming up.
 *
 * HOW EDITIONS ARE MATCHED. There is no series id in the data, so a show's
 * family is its name with the year, "Nth edition" and punctuation removed
 * (seriesKey), within the same COUNTRY. Not the same city: plenty of shows move
 * (ACREX India: Mumbai 2026, Noida 2027). Measured on the live catalogue
 * (5,144 records): 261 families with two or more editions.
 *
 * DUPLICATES ARE NOT EDITIONS. The catalogue holds the same edition more than
 * once ("RenewX 2027" four times, "Tube India 2026" three). Two records whose
 * dates overlap are one edition, so only the first is kept, and a record that
 * overlaps the page's own exhibition is never listed as another edition of it.
 *
 * COST. One walk of the upcoming, ongoing and previous listings (about 52 pages
 * of 100), each page cached by getJson. The built index is also kept in memory
 * for INDEX_TTL, so the exhibition pages rendering in one burst share it rather
 * than each re-reading 52 cached pages.
 */
import { getExhibitions } from "@/lib/public-api";
import { walkUpcoming } from "@/lib/locations";
import { seriesKey } from "@/lib/edition-key";

export { seriesKey };

const PAGE_SIZE = 100;
/** Enough for 6,000 past shows; the catalogue holds ~2,800. */
const MAX_PAGES = 60;
const INDEX_TTL = 5 * 60 * 1000;
/** A key this short is a generic word ("expo", "fair"), not a show's name. */
const MIN_KEY = 5;

const norm = (v) => String(v || "").trim().toLowerCase();
const familyOf = (e) => {
  const key = seriesKey(e.name);
  return key.length >= MIN_KEY ? `${key}|${norm(e.country)}` : null;
};
const day = (v) => (v ? String(v).slice(0, 10) : "");
const lastDay = (e) => day(e.endDate) || day(e.startDate);
/** Two date ranges that share at least one day: the same edition listed twice. */
const overlaps = (a, b) => day(a.startDate) <= lastDay(b) && day(b.startDate) <= lastDay(a);

async function walk(scope) {
  const items = [];
  for (let page = 1; page <= MAX_PAGES; page += 5) {
    const batch = await Promise.all(
      Array.from({ length: 5 }, (_, i) => getExhibitions(scope, { page: page + i, limit: PAGE_SIZE }))
    );
    let done = false;
    for (const result of batch) {
      items.push(...result.items);
      if (result.items.length < PAGE_SIZE) done = true;
    }
    if (done) break;
  }
  return items;
}

async function buildIndex() {
  const [upcoming, ongoing, previous] = await Promise.all([walkUpcoming(), walk("ongoing"), walk("previous")]);
  const byId = new Map();
  for (const e of [...ongoing, ...upcoming, ...previous]) if (e?.id && e.startDate) byId.set(e.id, e);

  const families = new Map();
  for (const e of byId.values()) {
    const family = familyOf(e);
    if (!family) continue;
    if (!families.has(family)) families.set(family, []);
    families.get(family).push(e);
  }
  return families;
}

let memo = null;
function seriesIndex() {
  if (!memo || Date.now() - memo.at > INDEX_TTL) {
    memo = { at: Date.now(), promise: buildIndex().catch(() => new Map()) };
  }
  return memo.promise;
}

/**
 * The other editions of this exhibition's show, oldest first, plus `next`: the
 * soonest edition that has not ended yet (null when none is listed).
 *
 * Fails soft to no editions.
 */
export async function getEditions(exhibition, now = new Date()) {
  const family = exhibition ? familyOf(exhibition) : null;
  if (!family) return { editions: [], next: null };
  const members = (await seriesIndex()).get(family) || [];

  const kept = [];
  for (const e of [...members].sort((a, b) => day(a.startDate).localeCompare(day(b.startDate)) || a.id.localeCompare(b.id))) {
    if (e.id === exhibition.id || overlaps(e, exhibition)) continue;
    if (kept.some((k) => overlaps(k, e))) continue;
    kept.push(e);
  }

  const today = now.toISOString().slice(0, 10);
  const next = kept.find((e) => lastDay(e) >= today && day(e.startDate) > lastDay(exhibition)) || null;
  return { editions: kept, next };
}
