/**
 * The location facet index that backs /exhibitions-in.
 *
 * WHY THIS FILE EXISTS
 * The three listing endpoints accept country/state/city filters but offer no
 * "list the distinct cities" call, so the only way to know which places have
 * enough inventory to deserve a page is to walk the catalogue and count. That
 * walk is expensive, so it happens once per hour behind Next's data cache and
 * every location page reads from the result.
 *
 * WHAT IT REPLACES
 * getUpcomingCities() in lib/public-api.js samples the FIRST 100 of ~2,170
 * upcoming records and ranks cities from that. It is fine for a homepage chip
 * row, but it is a biased sample - a city can be large in the catalogue and
 * absent from page one entirely. Anything that decides which pages EXIST must
 * use the full walk, not the sample.
 *
 * THE QUALITY THRESHOLD IS THE POINT
 * 448 distinct cities and 78 countries appear in the upcoming data. Giving all
 * of them a page would be exactly the doorway-page pattern that gets sites
 * demoted: hundreds of URLs whose entire content is "we found 1 exhibition".
 * So a place gets a page only when it clears MIN_CITY / MIN_COUNTRY below,
 * which as of this writing yields ~65 city pages and ~31 country pages. Every
 * one of them lists at least eight real, dated, named exhibitions.
 *
 * Anything under the threshold is still reachable - the /exhibitions?city=
 * filter serves it, noindex - it simply does not get an indexable page of its
 * own until the catalogue justifies one. The thresholds are the only knob;
 * raising them removes pages, lowering them adds pages, and nothing else in the
 * system needs to change.
 */
import { getExhibitions, getOngoingExhibitions } from "@/lib/public-api";
import { slugifyName } from "@/lib/slug";

/** A city needs this many upcoming exhibitions before it gets its own page. */
export const MIN_CITY = 8;

/** A country needs this many. Higher, because a country page must beat its cities. */
export const MIN_COUNTRY = 10;

/** How much of the catalogue to walk. Above the current ~2,170 upcoming records. */
const WALK_LIMIT = 2600;
const PAGE_SIZE = 100; // the backend caps `limit` at 100

/**
 * Placeholder values that appear in the location fields and are not places.
 * "TBD" alone accounts for 19 upcoming records; a page titled "Exhibitions in
 * TBD" would be an embarrassment and a crawl-budget sink.
 */
const NOT_A_PLACE = new Set([
  "tbd",
  "tba",
  "n/a",
  "na",
  "none",
  "null",
  "undefined",
  "other",
  "others",
  "various",
  "worldwide",
  "online",
  "virtual",
  "-",
  "--",
]);

/** True when a raw city/country string is worth counting as a place. */
function isPlace(value) {
  const v = String(value || "").trim();
  if (v.length < 2 || v.length > 60) return false;
  if (NOT_A_PLACE.has(v.toLowerCase())) return false;
  // Must contain at least two letters - filters "1", "..", "()" and similar.
  return (v.match(/\p{L}/gu) || []).length >= 2;
}

/**
 * Lowercase words that legitimately appear inside a properly cased place name
 * ("Isle of Man", "Rio de Janeiro"), so they do not disqualify it below.
 */
const MINOR_WORDS = new Set([
  "of", "and", "the", "de", "del", "la", "le", "les", "du", "da", "das", "dos",
  "van", "von", "der", "den", "el", "al", "bin", "ibn", "on", "upon", "in",
]);

/**
 * True when a label is cased the way a place name should be: every significant
 * word starts with a capital and carries no capitals inside it.
 *
 *   "Canada", "New Delhi", "Isle of Man"  -> true
 *   "canadA", "canada", "CANADA"          -> false
 */
function isWellCased(label) {
  const words = label.split(/[\s-]+/).filter(Boolean);
  if (!words.length) return false;
  return words.every(
    (w, i) =>
      (i > 0 && MINOR_WORDS.has(w.toLowerCase())) ||
      /^[\p{Lu}][\p{Ll}'’.]*$/u.test(w)
  );
}

/**
 * Pick the display form of a name that appears with inconsistent casing.
 *
 * WHY CASING BEATS FREQUENCY
 * This label goes straight into a <title>, an <h1> and a canonical-page name,
 * so a typo here is a typo in the index. The country field held "canadA" on 7
 * records and "Canada" on 1; ranking by frequency alone published
 * "Exhibitions in canadA" as a real, indexable page.
 *
 * So the order is: properly cased forms first, then non-shouted forms, then
 * frequency. Frequency still decides between two equally well-formed spellings,
 * which is what it was always for. When nothing is well cased the behaviour is
 * exactly as before, so no existing label changes unless it was malformed.
 *
 * This hardens the symptom. The underlying records still want correcting - a
 * misspelling that never wins the vote is still a misspelling in the data.
 */
function bestLabel(counts) {
  return [...counts.entries()].sort((a, b) => {
    const aCased = isWellCased(a[0]);
    const bCased = isWellCased(b[0]);
    if (aCased !== bCased) return aCased ? -1 : 1;

    const aShout = a[0] === a[0].toUpperCase();
    const bShout = b[0] === b[0].toUpperCase();
    if (aShout !== bShout) return aShout ? 1 : -1;

    return b[1] - a[1];
  })[0][0];
}

/**
 * Walk the upcoming listing in concurrent batches.
 *
 * Same shape as the sitemap's collect(): five pages at a time. Every caller
 * hits identical URLs with the same revalidate, so Next's fetch cache serves
 * the second and third walks for free — which is why lib/categories.js reuses
 * this rather than walking the catalogue again.
 */
export async function walkUpcoming() {
  const first = await getExhibitions("upcoming", { page: 1, limit: PAGE_SIZE });
  if (!first.items.length) return [];

  const items = [...first.items];
  const totalPages = Math.min(first.totalPages || 1, Math.ceil(WALK_LIMIT / PAGE_SIZE));

  for (let page = 2; page <= totalPages; page += 5) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(5, totalPages - page + 1) }, (_, i) =>
        getExhibitions("upcoming", { page: page + i, limit: PAGE_SIZE })
      )
    );
    for (const result of batch) items.push(...result.items);
  }

  return items;
}

/**
 * Build the index: every qualifying country, each with its qualifying cities.
 *
 * Returns { countries, countryBySlug, cityBySlug }. Slugs are the URL segments,
 * so a page lookup is a Map hit rather than another walk. Fails soft to an
 * empty index, in which case every location page 404s and nothing else breaks.
 */
export async function getLocationIndex() {
  const items = await walkUpcoming();
  if (!items.length) {
    return { countries: [], countryBySlug: new Map(), cityBySlug: new Map(), total: 0 };
  }

  // Two passes: tally raw spellings first, then collapse to one label per key.
  const countryRaw = new Map(); // countryKey -> Map(label -> count)
  const cityRaw = new Map(); // "countryKey|cityKey" -> Map(label -> count)
  const countryCount = new Map();
  const cityCount = new Map();
  const countryDates = new Map();
  const cityDates = new Map();

  const bump = (map, key, label) => {
    const inner = map.get(key) || new Map();
    inner.set(label, (inner.get(label) || 0) + 1);
    map.set(key, inner);
  };

  for (const ex of items) {
    if (!isPlace(ex.country)) continue;
    const countryKey = ex.country.trim().toLowerCase();
    bump(countryRaw, countryKey, ex.country.trim());
    countryCount.set(countryKey, (countryCount.get(countryKey) || 0) + 1);
    if (ex.startDate) countryDates.set(countryKey, [...(countryDates.get(countryKey) || []), ex.startDate]);

    if (!isPlace(ex.city)) continue;
    const cityKey = `${countryKey}|${ex.city.trim().toLowerCase()}`;
    bump(cityRaw, cityKey, ex.city.trim());
    cityCount.set(cityKey, (cityCount.get(cityKey) || 0) + 1);
    if (ex.startDate) cityDates.set(cityKey, [...(cityDates.get(cityKey) || []), ex.startDate]);
  }

  const countries = [];
  const countryBySlug = new Map();
  const cityBySlug = new Map();

  for (const [countryKey, count] of countryCount) {
    if (count < MIN_COUNTRY) continue;
    const name = bestLabel(countryRaw.get(countryKey));
    const slug = slugifyName(name);
    if (!slug) continue;

    const cities = [];
    for (const [cityKey, cityTotal] of cityCount) {
      if (!cityKey.startsWith(`${countryKey}|`)) continue;
      if (cityTotal < MIN_CITY) continue;
      const cityName = bestLabel(cityRaw.get(cityKey));
      const citySlug = slugifyName(cityName);
      if (!citySlug) continue;
      cities.push({
        city: cityName,
        slug: citySlug,
        count: cityTotal,
        country: name,
        countrySlug: slug,
        dates: cityDates.get(cityKey) || [],
      });
    }
    cities.sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));

    const entry = { country: name, slug, count, cities, dates: countryDates.get(countryKey) || [] };
    countries.push(entry);
    countryBySlug.set(slug, entry);
    for (const c of cities) cityBySlug.set(`${slug}/${c.slug}`, c);
  }

  countries.sort((a, b) => b.count - a.count || a.country.localeCompare(b.country));

  return { countries, countryBySlug, cityBySlug, total: items.length };
}

/** One country, or null when it does not clear MIN_COUNTRY. */
export async function getCountryFacet(countrySlug) {
  const { countryBySlug } = await getLocationIndex();
  return countryBySlug.get(countrySlug) || null;
}

/** One city, or null when it does not clear MIN_CITY. */
export async function getCityFacet(countrySlug, citySlug) {
  const { cityBySlug } = await getLocationIndex();
  return cityBySlug.get(`${countrySlug}/${citySlug}`) || null;
}

/**
 * Facts derived from a place's own start dates, for the intro paragraph.
 *
 * Every value here is counted from the records the page itself lists, so the
 * copy is checkable against the list below it. Nothing is estimated, and
 * nothing is claimed that the data does not support.
 */
export function dateSummary(dates) {
  const parsed = dates.map((d) => new Date(d)).filter((d) => !Number.isNaN(d.getTime()));
  if (!parsed.length) return null;

  parsed.sort((a, b) => a - b);

  const months = new Map();
  for (const d of parsed) {
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    months.set(key, (months.get(key) || 0) + 1);
  }
  const [busiestKey, busiestCount] = [...months.entries()].sort((a, b) => b[1] - a[1])[0];
  const [year, month] = busiestKey.split("-").map(Number);

  const fmt = (d) =>
    d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

  return {
    firstLabel: fmt(parsed[0]),
    lastLabel: fmt(parsed[parsed.length - 1]),
    busiestLabel: fmt(new Date(Date.UTC(year, month, 1))),
    busiestCount,
    monthsCovered: months.size,
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Listing a place                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * The backend matches location filters as UNANCHORED, case-insensitive regexes.
 * `country=Korea` returns records for both "Korea" and "South Korea";
 * `city=Mexico` returns "Mexico City". A landing page that promised one place
 * and listed another would be a straightforward accuracy bug and a duplicate-
 * content risk between two pages showing overlapping sets, so every result is
 * re-filtered here on an exact, case-insensitive match of the label the page
 * is actually about.
 */
const samePlace = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

/** How many filtered records to pull before paginating in-page. Germany, the
 *  largest country in the data, has ~333 upcoming. */
const PLACE_LIMIT = 500;

/**
 * Every upcoming exhibition in one place, exactly matched and date-sorted.
 *
 * Paginating here rather than passing `page` through to the API is deliberate:
 * the API paginates over its loose substring match, so page 2 of "Korea" would
 * contain South Korean records that this page filtered out of page 1, leaving
 * gaps. Fetching the (bounded) set and slicing it locally keeps the pagination
 * honest.
 */
export async function getExhibitionsInPlace({ country, city }, { scope = "upcoming" } = {}) {
  const fetcher = (page) =>
    scope === "ongoing"
      ? getOngoingExhibitions({ page, limit: PAGE_SIZE, country, city })
      : getExhibitions(scope, { page, limit: PAGE_SIZE, country, city });

  const first = await fetcher(1);
  const rows = [...first.items];
  const totalPages = Math.min(first.totalPages || 1, Math.ceil(PLACE_LIMIT / PAGE_SIZE));

  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) => fetcher(i + 2))
    );
    for (const r of rest) rows.push(...r.items);
  }

  const exact = rows.filter(
    (ex) => samePlace(ex.country, country) && (!city || samePlace(ex.city, city))
  );

  // Soonest first: the listing endpoints already sort this way, but the local
  // concatenation of several pages should not depend on that holding.
  exact.sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));

  const seen = new Set();
  return exact.filter((ex) => (seen.has(ex.id) ? false : seen.add(ex.id)));
}

/**
 * Resolve one exhibition's location to landing pages, where they exist.
 *
 * Returns { countrySlug, citySlug } with either half null when that place is
 * below the threshold. Callers use it to decide between an indexable landing
 * page and the noindex ?city= filter, so a detail page never links to a page
 * that would 404, and never sends a crawler to a filter when a real page exists.
 */
export async function resolvePlaceLinks({ country, city }) {
  if (!isPlace(country)) return { countrySlug: null, citySlug: null };
  const { countryBySlug, cityBySlug } = await getLocationIndex();

  const countrySlug = slugifyName(String(country).trim());
  const countryEntry = countryBySlug.get(countrySlug);
  if (!countryEntry) return { countrySlug: null, citySlug: null };

  if (!isPlace(city)) return { countrySlug, citySlug: null };
  const citySlug = slugifyName(String(city).trim());
  return {
    countrySlug,
    citySlug: cityBySlug.has(`${countrySlug}/${citySlug}`) ? citySlug : null,
  };
}
