/**
 * The category facet index that backs /exhibitions-for.
 *
 * SAME SHAPE AS lib/locations.js, AND FOR THE SAME REASON: the listing
 * endpoints have no "distinct categories" call and no category filter, so the
 * only way to know which industries have enough inventory for a page is to walk
 * the catalogue and count. The walk itself is shared with the location index —
 * identical fetches, one hourly cache — so this costs no extra requests.
 *
 * DATA QUALITY, MEASURED (2,171 upcoming records):
 *   100%  of records have a category
 *   1,462 distinct raw values — a very long tail
 *   the head is clean single words: technology 124, manufacturing 57,
 *   health 52, agriculture 47, textile 36, education 35 ...
 *   the tail is free text, up to 310 characters of prose
 *
 * So a page per raw value would mean 1,462 pages, almost all of them holding a
 * single exhibition. The threshold below is what stops that, exactly as
 * MIN_CITY does for places.
 *
 * WHY THERE IS AN ALIAS MAP AND WHY IT IS TINY
 * Three pairs in the head of the distribution are the same industry written two
 * ways — "health"/"healthcare", "auto"/"automotive",
 * "technology"/"technology & innovation". Left alone they would produce two
 * competing pages targeting one intent, which is the duplicate-content problem
 * this whole tier is designed to avoid. Merging them is curation of labels that
 * already exist in the data, not invention.
 *
 * The map is deliberately NOT a general normaliser (no stemming, no fuzzy
 * matching). Every merge is written out by hand and can be checked against the
 * data. Anything not listed here is treated as its own category, which is the
 * safe default: a wrongly split category costs one thin page that the threshold
 * then rejects, while a wrongly merged one puts unrelated exhibitions on a page
 * that claims they belong together.
 */
import { walkUpcoming } from "@/lib/locations";
import { slugifyName } from "@/lib/slug";

/**
 * An industry needs this many upcoming exhibitions before it gets a page.
 *
 * At 12 this yields ten categories covering ~470 of the 2,171 upcoming records.
 * Every page therefore opens with at least a dozen real, dated exhibitions.
 */
export const MIN_CATEGORY = 12;

/**
 * The canonical industry taxonomy, and the frozen slug for each.
 *
 * WHY SLUG AND LABEL ARE SEPARATE — this is the whole reason the tier could be
 * renamed without breaking anything. Ten of these industries already have live,
 * indexed URLs. Deriving a slug from the display name would have moved eight of
 * them: /exhibitions-for/health -> /healthcare-medical, /tourism ->
 * /travel-tourism, and so on. Each of those is an indexed page with accumulated
 * ranking signal, and renaming a URL to gain a prettier slug trades real signal
 * for cosmetics.
 *
 * So the slug is frozen at whatever the URL already is, and the label is free to
 * improve. "Health" became "Healthcare & Medical" on the page; the URL stayed
 * /exhibitions-for/health. The `existing` flag records which ten those are, so
 * nobody later "tidies" a slug to match its label.
 *
 * Membership is decided by the reviewed mapping applied to category_normalized
 * in the database, NOT by matching text here. This list only supplies the
 * display label and the slug.
 */
const INDUSTRIES = [
  { name: "Technology", slug: "technology", existing: true },
  { name: "Education & Careers", slug: "education", existing: true },
  { name: "Healthcare & Medical", slug: "health", existing: true },
  { name: "Manufacturing & Industrial", slug: "manufacturing", existing: true },
  { name: "Agriculture & Farming", slug: "agriculture", existing: true },
  { name: "Energy & Power", slug: "energy", existing: true },
  { name: "Construction & Building", slug: "construction", existing: true },
  { name: "Textiles & Apparel", slug: "textile", existing: true },
  { name: "Automotive", slug: "automotive", existing: true },
  { name: "Travel & Tourism", slug: "tourism", existing: true },
  { name: "Food & Beverage", slug: "food-beverage" },
  { name: "Home & Interiors", slug: "home-interiors" },
  { name: "Art & Culture", slug: "art-culture" },
  { name: "Business & Finance", slug: "business-finance" },
  { name: "Transport & Logistics", slug: "transport-logistics" },
  { name: "Mining & Metals", slug: "mining-metals" },
  { name: "Retail & Consumer Goods", slug: "retail-consumer" },
  { name: "Environment & Water", slug: "environment-water" },
  { name: "Weddings & Events", slug: "weddings-events" },
  { name: "Security & Defence", slug: "security-defence" },
  { name: "Beauty & Cosmetics", slug: "beauty-cosmetics" },
  { name: "Packaging & Printing", slug: "packaging-printing" },
  { name: "Marine & Maritime", slug: "marine-maritime" },
  { name: "Chemicals & Plastics", slug: "chemicals-plastics" },
  { name: "Real Estate & Property", slug: "real-estate" },
  { name: "Pets & Animals", slug: "pets-animals" },
  { name: "Sports & Fitness", slug: "sports-fitness" },
  { name: "Books & Publishing", slug: "books-publishing" },
  { name: "Jewellery & Watches", slug: "jewellery-watches" },
  { name: "Aviation & Aerospace", slug: "aviation-aerospace" },
];

/** Canonical name -> { name, slug }. */
const INDUSTRY_BY_NAME = new Map(INDUSTRIES.map((i) => [i.name, i]));

/**
 * Explicit synonym merges, retained for records with no normalised industry.
 *
 * These three pairs predate the taxonomy and still cover records the approved
 * mapping did not reach. Once the held and low-confidence queues are worked,
 * this becomes dead weight and can go.
 */
const ALIASES = [
  { label: "Technology", members: ["technology", "technology & innovation"] },
  { label: "Health", members: ["health", "healthcare"] },
  { label: "Automotive", members: ["auto", "automotive"] },
];

/** raw lowercase label -> { label } for the merged groups. */
const ALIAS_LOOKUP = new Map();
for (const group of ALIASES) {
  for (const member of group.members) ALIAS_LOOKUP.set(member, group.label);
}

/**
 * A category value worth counting.
 *
 * The long tail is mostly full sentences copied out of a brochure ("Natural
 * fibers (cotton, wool, silk) and synthetic/blended yarns..."). Those are
 * descriptions, not categories: they will never reach the threshold, but
 * excluding them early keeps the index small and stops a 310-character string
 * from ever becoming a URL.
 */
function isCategory(value) {
  const v = String(value || "").trim();
  if (v.length < 3 || v.length > 40) return false;
  // A category is a label, not a sentence. Four words is generous for
  // "Food, Beverage & Hospitality" and firmly excludes prose.
  if (v.split(/\s+/).length > 4) return false;
  return (v.match(/\p{L}/gu) || []).length >= 3;
}

/** Title Case for a label the data holds in inconsistent casing. */
function toLabel(raw) {
  return raw
    .split(/\s+/)
    .map((w) => (w.length > 2 && w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/**
 * Build the index of categories that clear MIN_CATEGORY.
 *
 * Returns { categories, bySlug }. Each entry carries the exhibitions themselves
 * — unlike the location index, which re-queries the API, because the listing
 * endpoints have no category filter to re-query WITH. Everything a category
 * page needs therefore comes out of this one walk.
 *
 * Returns an empty index when the deployed API does not project `category`,
 * in which case every category page 404s and the hub shows an empty state.
 * That is the correct behaviour for an undeployed backend: no thin pages, no
 * broken links, and the whole tier switches on by itself once the field
 * arrives.
 */
export async function getCategoryIndex() {
  const items = await walkUpcoming();
  if (!items.length) return { categories: [], bySlug: new Map(), total: 0 };

  const groups = new Map(); // canonical label -> { label, items[] }

  for (const ex of items) {
    // The normalised industry is authoritative when a record has one. It is
    // set only from the approved mapping, so an unmapped record falls through
    // to the old alias path and behaves exactly as it did before Phase 1.
    const canonical = INDUSTRY_BY_NAME.get(String(ex.categoryNormalized || "").trim());
    if (canonical) {
      const entry = groups.get(canonical.name) || { label: canonical.name, slug: canonical.slug, items: [] };
      entry.items.push(ex);
      groups.set(canonical.name, entry);
      continue;
    }

    if (!isCategory(ex.category)) continue;
    const raw = ex.category.trim().toLowerCase();
    const label = ALIAS_LOOKUP.get(raw) || toLabel(ex.category.trim());
    const key = label.toLowerCase();

    const entry = groups.get(key) || { label, items: [] };
    entry.items.push(ex);
    groups.set(key, entry);
  }

  const categories = [];
  const bySlug = new Map();

  for (const entry of groups.values()) {
    if (entry.items.length < MIN_CATEGORY) continue;
    // A canonical industry carries its own FROZEN slug; anything else still
    // derives one from its label, as before.
    const slug = entry.slug || slugifyName(entry.label);
    if (!slug) continue;

    // Soonest first, so the page opens with what is actually next.
    entry.items.sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));

    const record = {
      label: entry.label,
      slug,
      count: entry.items.length,
      items: entry.items,
      dates: entry.items.map((e) => e.startDate).filter(Boolean),
      countries: topValues(entry.items.map((e) => e.country)),
      cities: topValues(entry.items.map((e) => e.city)),
    };
    categories.push(record);
    bySlug.set(slug, record);
  }

  categories.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return { categories, bySlug, total: items.length };
}

/** One category, or null when it does not clear MIN_CATEGORY. */
export async function getCategoryFacet(slug) {
  const { bySlug } = await getCategoryIndex();
  return bySlug.get(slug) || null;
}

/**
 * Where a category's exhibitions actually happen, most-listed first.
 *
 * Used for the "where these take place" line on a category page. Counted from
 * the same records the page lists, so it is checkable rather than asserted.
 */
function topValues(values, max = 6) {
  const counts = new Map();
  for (const raw of values) {
    const v = String(raw || "").trim();
    if (v.length < 2) continue;
    const key = v.toLowerCase();
    const entry = counts.get(key) || { name: v, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, max);
}

/**
 * The category slug for one exhibition, or null.
 *
 * Lets a detail page link to its category page only when that page exists —
 * the same contract as resolvePlaceLinks() in lib/locations.js.
 */
export async function resolveCategoryLink(category) {
  if (!isCategory(category)) return null;
  const raw = String(category).trim().toLowerCase();
  const label = ALIAS_LOOKUP.get(raw) || toLabel(String(category).trim());
  const slug = slugifyName(label);
  const { bySlug } = await getCategoryIndex();
  return bySlug.has(slug) ? { slug, label } : null;
}
