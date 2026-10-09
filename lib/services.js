/**
 * The service-provider directory that backs /exhibition-services and its seven
 * category pages.
 *
 * WHY THIS LAYER EXISTS. /api/getexhibitionservice is unpaginated and returns
 * every provider in one response (~500 and climbing at the time of writing). Each of the eight
 * pages in this tier needs a different slice of that same payload — the hub
 * needs counts, a category page needs its own providers plus the places they
 * cover. Fetching per page would mean eight full downloads of the same data, so
 * the fetch happens once here and every page reads the grouped result. Next's
 * request memoisation plus the pages' own `revalidate` keep it to one call per
 * revalidation window.
 *
 * WHY THE SLUGS ARE WRITTEN OUT. The seven categories come from a frozen enum in
 * the backend (`service_name` in Model/Service.model.js), and these URLs are
 * meant to be permanent. A slug derived from the label would silently move a
 * live URL the moment somebody improved the wording of a category name — and
 * "LED / TV Rental" in particular has no obvious derivation (slashes and spaces
 * collapse differently depending on the slugifier). Writing them down makes the
 * URL a decision rather than a side effect. The lesson is borrowed from
 * lib/categories.js, where renaming a label nearly moved ten indexed pages.
 *
 * THE UNSCOPED ENDPOINT, AND WHY THAT IS CORRECT HERE. getServices() reads
 * /api/getexhibitionservice, which returns EVERY provider's listings. That is
 * the difference between this tier and the dashboard: /services (signed in)
 * calls /api/myexhibitionservices and shows one provider their own rows, while
 * this is a public directory and must show everyone's. The two endpoints were
 * swapped once before, which put Edit and Delete buttons beside strangers' rows
 * in the dashboard — tests/services-scope.test.mjs exists to catch that swap.
 *
 * WHAT IS AND IS NOT PUBLISHED. toPublicService in lib/public-api.js emits the
 * business name, the category, the location and the image, and drops
 * `mobile_number` and `address`. A phone number on a crawlable page is what
 * address-harvesters collect, and the repo already treats direct contact details
 * as something to put behind a session (see the organiser contact endpoint). An
 * exhibitor finds a provider here; reaching them is a separate decision, and
 * it is the reason a provider card is not a link to anywhere.
 *
 * NO MINIMUM-INVENTORY THRESHOLD, unlike the location and industry tiers. Those
 * taxonomies are open-ended — 448 cities, 1,462 raw category strings — so they
 * need a floor to stop a page being created for a single record. This taxonomy
 * is a fixed seven, every one of them is a real service the platform supports,
 * and the smallest currently holds 27 providers. There is no long tail to guard
 * against, so a category gets its page whenever it has providers at all.
 */
/*
 * RELATIVE IMPORTS WITH EXTENSIONS, not the "@/" alias, and that is deliberate:
 * tests/services-scope.test.mjs imports this module in plain Node, which has no
 * bundler to resolve the alias. lib/public-api.js does the same for the same
 * reason. The alias is correct everywhere a bundler is guaranteed.
 */
import { SERVICE_CATEGORIES, getServicesWithOwner } from "./public-api.js";
// Pure string helpers, kept in their own module because ServiceDirectory runs in
// the browser and this file reads the server-only data layer. See the note there.
import { alphabetBucket, compareServiceNames } from "./service-alphabet.js";

/**
 * Category label -> frozen URL slug. Keys must match SERVICE_CATEGORIES exactly;
 * a mismatch is caught by tests/services-scope.test.mjs rather than silently
 * dropping a category from the directory.
 */
const CATEGORY_SLUGS = Object.freeze({
  Printing: "printing",
  "Furniture Rental": "furniture-rental",
  "LED / TV Rental": "led-tv-rental",
  Fabrication: "fabrication",
  "Protocol Staff": "protocol-staff",
  "Catalog Printing": "catalog-printing",
  "Corporate Gifting": "corporate-gifting",
});

export const SERVICE_CATEGORY_SLUGS = CATEGORY_SLUGS;

/** "Printing" -> "printing". Null for anything not in the enum. */
export function serviceCategorySlug(name) {
  return CATEGORY_SLUGS[name] || null;
}

/**
 * Every provider, grouped by category, with the facets each page needs.
 *
 * Shape:
 *   {
 *     total,
 *     categories: [{ name, slug, count, providers, letters, states, cities }],
 *     bySlug: Map(slug -> category)
 *   }
 *
 * Categories with no providers are kept in the list with count 0 — the hub still
 * describes all seven services the platform supports, and the renderer decides
 * whether an empty one is a link or plain text. Dropping them here would make
 * that impossible.
 */
export async function getServiceDirectory() {
  const { items } = await getServicesWithOwner();

  /*
   * OWNER ID IS SERVER-SIDE ONLY. It arrives on every row so one provider's
   * several listings can be grouped (see getServiceSiblings), and it is stripped
   * immediately below. Nothing that leaves this function on the `categories`
   * path carries it, because those rows are handed to ServiceDirectory, which
   * runs in the browser - an ownerId there would travel to every visitor inside
   * the RSC payload and hand out a user-id enumeration surface.
   */
  const strip = ({ ownerId: _ownerId, ...publicShape }) => publicShape;

  const categories = SERVICE_CATEGORIES.map((name) => {
    const providers = items
      .filter((s) => s.service === name)
      .map(strip)
      // Alphabetical by default: this is a directory, and a scan for a known
      // name is the common case.
      .sort((a, b) => compareServiceNames(a.name, b.name));

    return {
      name,
      slug: CATEGORY_SLUGS[name],
      count: providers.length,
      providers,
      letters: facetLetters(providers),
      states: facetValues(providers, "state"),
      cities: facetValues(providers, "city"),
    };
  });

  /*
   * listing id -> { provider, categoryName, categorySlug, ownerId }
   *
   * Lets the detail page resolve a provider from the directory it has already
   * fetched, instead of calling a public single-service endpoint. That is not
   * only cheaper - it means no public endpoint has to exist that returns one
   * provider's full record, which is what the old /api/getexhibitionservicebyid
   * did before it was put behind a session.
   */
  const byId = new Map();
  for (const category of categories) {
    for (const provider of category.providers) {
      const raw = items.find((s) => s.id === provider.id);
      byId.set(provider.id, {
        provider,
        categoryName: category.name,
        categorySlug: category.slug,
        ownerId: raw ? raw.ownerId : null,
      });
    }
  }

  /*
   * owner id -> their listings. Rows with no owner are EXCLUDED rather than
   * grouped together: pre-ownership records all have createdBy unset (see
   * Model/Service.model.js), so a null key would merge dozens of unrelated
   * businesses into one "provider" and cross-link them as if they were the same
   * company.
   */
  const byOwner = new Map();
  for (const entry of byId.values()) {
    if (!entry.ownerId) continue;
    const list = byOwner.get(entry.ownerId) || [];
    list.push(entry);
    byOwner.set(entry.ownerId, list);
  }

  return {
    total: items.length,
    categories,
    bySlug: new Map(categories.filter((c) => c.slug).map((c) => [c.slug, c])),
    byId,
    byOwner,
  };
}

/** One listing by its id, with its category. Null if there is no such listing. */
export async function getServiceById(serviceId) {
  if (!serviceId) return null;
  const { byId } = await getServiceDirectory();
  return byId.get(String(serviceId)) || null;
}

/**
 * The SAME provider's other listings, for the "also offers" section.
 *
 * Matched on owner id, never on business name. Two unrelated shops can share a
 * name ("Shyam Light House" appears twice in the live data under different
 * cities), and presenting one as the other's second listing would be wrong in a
 * way a visitor could not detect.
 *
 * Returns [] for an unowned legacy row rather than everything else unowned.
 */
export async function getServiceSiblings(serviceId) {
  const { byId, byOwner } = await getServiceDirectory();
  const entry = byId.get(String(serviceId));
  if (!entry || !entry.ownerId) return [];
  return (byOwner.get(entry.ownerId) || []).filter((s) => s.provider.id !== entry.provider.id);
}

/** One category by slug, or null. Used by the page and its generateMetadata. */
export async function getServiceCategory(slug) {
  if (!slug) return null;
  const { bySlug } = await getServiceDirectory();
  const category = bySlug.get(String(slug).toLowerCase()) || null;
  // A category in the enum that currently has no providers has no page: it would
  // be a heading, a sentence and an empty grid. The hub still lists it.
  return category && category.count ? category : null;
}

/** The alphabet buckets actually present, in display order with "#" last. */
function facetLetters(providers) {
  const present = new Set(providers.map((p) => alphabetBucket(p.name)));
  const letters = [...present].filter((l) => l !== "#").sort();
  return present.has("#") ? [...letters, "#"] : letters;
}

/**
 * Distinct values of one location field, with counts, most common first.
 *
 * Blank values are dropped rather than bucketed as "Unknown": a filter option
 * that selects records with no location is not something anyone wants to pick,
 * and those providers stay reachable through the unfiltered list.
 */
function facetValues(providers, field) {
  const counts = new Map();
  for (const provider of providers) {
    const value = (provider[field] || "").trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}
