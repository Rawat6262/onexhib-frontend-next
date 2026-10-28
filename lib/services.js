/**
 * The service-provider directory that backs /exhibition-services and its category
 * pages.
 *
 * WHY THIS LAYER EXISTS. /api/getexhibitionservice is unpaginated and returns
 * every provider in one response (~500 and climbing at the time of writing). Each
 * page in this tier needs a different slice of that same payload — the hub
 * needs counts, a category page needs its own providers plus the places they
 * cover. Fetching per page would mean a full download of the same data per page, so
 * the fetch happens once here and every page reads the grouped result. Next's
 * request memoisation plus the pages' own `revalidate` keep it to one call per
 * revalidation window.
 *
 * THE TAXONOMY IS 35 CATEGORIES, EACH WITH SUBCATEGORIES, and it lives in
 * lib/service-taxonomy.js — which also owns the frozen URL slugs and explains why
 * six of them no longer resemble their labels. It used to be seven categories with
 * the slug map written out in this file; the note that argued for writing slugs down
 * rather than deriving them moved there with the data, and it earned itself: this
 * change renamed six live categories without moving a single URL.
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
 * need a floor to stop a page being created for a single record. This taxonomy is
 * fixed and curated: every one of the 35 is a real service the platform supports,
 * and there is no long tail to guard against, so a category gets its page whenever
 * it has providers at all.
 *
 * WHAT CHANGED WITH 35, AND THE LEVER IF IT BECOMES A PROBLEM. At seven categories
 * the smallest held 27 providers, so "no threshold" cost nothing. The new taxonomy
 * adds 29 categories that start empty and will fill one provider at a time, which
 * is a thin-page risk the seven never had. It is handled by COUNT, not by a
 * threshold: getServiceCategory() returns null for a category with no providers, so
 * its page 404s, the hub renders it as plain text rather than a link, and
 * app/sitemap.js filters on `count` — an empty category is unreachable and
 * unindexed without any extra machinery.
 *
 * That still means a brand-new category becomes an indexable page at one provider.
 * If that proves too thin in Search Console, the fix is a MIN_PROVIDERS constant
 * applied in getServiceCategory() and generateStaticParams(), exactly as
 * MIN_CATEGORY works in lib/categories.js. Not added pre-emptively, because a page
 * with one real provider in a named trade is still a page that answers the query,
 * and the hub makes the count visible before anyone clicks.
 */
/*
 * RELATIVE IMPORTS WITH EXTENSIONS, not the "@/" alias, and that is deliberate:
 * tests/services-scope.test.mjs imports this module in plain Node, which has no
 * bundler to resolve the alias. lib/public-api.js does the same for the same
 * reason. The alias is correct everywhere a bundler is guaranteed.
 */
import { getServicesWithOwner } from "./public-api.js";
// Pure string helpers, kept in their own module because ServiceDirectory runs in
// the browser and this file reads the server-only data layer. See the note there.
import { alphabetBucket, compareServiceNames } from "./service-alphabet.js";
/*
 * THE TAXONOMY NOW LIVES IN ITS OWN MODULE, and the slug map with it.
 *
 * Both used to be written out here: a seven-key CATEGORY_SLUGS object beside a
 * seven-value enum imported from public-api.js. That no longer works, for two
 * reasons. The dashboard forms need the category list and the subcategories under
 * each one, and they are Client Components - importing anything from this file would
 * drag the server-only data layer into the browser bundle. And a category's
 * subcategories are a relationship, not a list, which wants one owner.
 *
 * So lib/service-taxonomy.js owns the 35 categories, their frozen slugs and their
 * subcategories, and is safe to import from anywhere. This module keeps doing what
 * it always did: fetch once, group, and build the facets each page needs.
 */
import {
  GENERAL_SUBCATEGORY,
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_SLUGS as CATEGORY_SLUGS,
  serviceCategorySlug,
  serviceSubcategories,
} from "./service-taxonomy.js";

/*
 * Re-exported so the pages and tests that already import these from here keep
 * working. lib/service-taxonomy.js is the definition.
 */
export { SERVICE_CATEGORIES, serviceCategorySlug };
export const SERVICE_CATEGORY_SLUGS = CATEGORY_SLUGS;

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
      /*
       * THE SUBCATEGORIES THAT ACTUALLY HAVE PROVIDERS, not all of the category's.
       *
       * The taxonomy lists up to eight specialities under a category; a category
       * page might have providers under two of them. Offering all eight as filter
       * chips would be six guaranteed dead ends - the same reason facetLetters()
       * returns only the alphabet buckets that exist.
       *
       * Counted from the rows this page renders, so a chip's number is checkable by
       * clicking it.
       */
      subcategories: facetSubcategories(providers, name),
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
 *
 * AND on business name too. Owner alone was not enough: the team imported most
 * listings from Excel under one account, so "same owner" meant ~1,800 unrelated
 * businesses, and every one of their pages listed all the others (10 MB of
 * HTML each). Requiring the same owner AND the same name keeps both rules:
 * same-name shops under different owners are still never merged, and one
 * importing account no longer cross-links everything it imported. Capped, so
 * no page can grow with the size of an account.
 */
export const MAX_SIBLINGS = 8;
const sameName = (a, b) => {
  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return Boolean(norm(a)) && norm(a) === norm(b);
};

export async function getServiceSiblings(serviceId) {
  const { byId, byOwner } = await getServiceDirectory();
  const entry = byId.get(String(serviceId));
  if (!entry || !entry.ownerId) return [];
  return (byOwner.get(entry.ownerId) || [])
    .filter((s) => s.provider.id !== entry.provider.id && sameName(s.provider.name, entry.provider.name))
    .slice(0, MAX_SIBLINGS);
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

/**
 * The subcategories present among these providers, with counts.
 *
 * ORDERED BY THE TAXONOMY, not by count - unlike states and cities below. A
 * category's subcategories are a fixed, meaningful sequence ("Custom Stall Design,
 * Modular Stall, Octanorm Stall..." reads from bespoke to standard), and reordering
 * them by inventory would shuffle the chips every time a provider signs up. A
 * visitor who learned where "Octanorm Stall" sits should find it there tomorrow.
 *
 * A value not in the taxonomy is dropped: it cannot be rendered as a chip that
 * filters correctly, and lib/public-api.js has already nulled any pair that
 * disagrees, so reaching here means the data was edited outside the application.
 */
function facetSubcategories(providers, categoryName) {
  const counts = new Map();
  for (const provider of providers) {
    const value = (provider.subcategory || "").trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  /*
   * Taxonomy order, EXCEPT that "General" goes last wherever it appears.
   *
   * The taxonomy lists it first, because it is the default a provider should see at
   * the top of the dropdown. On a category page it is the opposite: it is the
   * catch-all, usually the largest group, and putting it first would bury the actual
   * specialities underneath a heading that distinguishes nothing. Same reasoning as
   * the "#" bucket going last in facetLetters, and as the unspecified group going
   * last in ServiceDirectory.
   */
  const present = serviceSubcategories(categoryName).filter((sub) => counts.has(sub));
  const ordered = [
    ...present.filter((sub) => sub !== GENERAL_SUBCATEGORY),
    ...present.filter((sub) => sub === GENERAL_SUBCATEGORY),
  ];
  return ordered.map((sub) => ({ value: sub, count: counts.get(sub) }));
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
