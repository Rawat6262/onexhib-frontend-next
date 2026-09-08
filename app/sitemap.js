import { SITE_URL, PUBLIC_ROUTES } from "@/lib/seo";
import {
  categoryLandingPath,
  cityLandingPath,
  companyPath,
  countryLandingPath,
  exhibitionPath,
  productPath,
} from "@/lib/routes";
import { getLocationIndex } from "@/lib/locations";
import { getCategoryIndex } from "@/lib/categories";
import {
  getCompanies,
  getExhibitions,
  getOngoingExhibitions,
  getProducts,
  getUpcomingExhibitions,
} from "@/lib/public-api";

/**
 * Dynamic sitemap.
 *
 * Replaces the three-URL static list that was correct while the homepage was a
 * placeholder. Now that every exhibition, company and product has a crawlable
 * public page, they belong here — that is how a search engine discovers 2,000+
 * detail pages that are otherwise only reachable through paginated listings.
 *
 * SPLITTING: generateSitemaps() below chunks the output, so Next serves
 * /sitemap/0.xml, /sitemap/1.xml … and a sitemap index at /sitemap.xml, which
 * is what robots.txt already points at. The protocol caps a single sitemap at
 * 50,000 URLs and 50 MB; chunking now means crossing that threshold later needs
 * no change. CHUNK_SIZE is set well below the cap to keep each file small and
 * each regeneration cheap.
 *
 * BOUNDS: every collection is capped. The point of a cap is not the protocol
 * limit but regeneration cost — an unbounded walk of a growing collection would
 * make this route slower every month. Upcoming and ongoing exhibitions are the
 * pages worth crawling most often, so they get the largest budget; past
 * exhibitions are included but limited to the most recent, since their pages
 * are archival and their Event markup is deliberately omitted once they end.
 */

export const revalidate = 3600;

const CHUNK_SIZE = 5000;
const PAGE_SIZE = 100; // the backend caps `limit` at 100

const BUDGET = {
  upcoming: 4000,
  ongoing: 500,
  previous: 1000,
  companies: 2000,
  products: 2000,
};

/**
 * Walk a paginated endpoint up to `max` items, five pages at a time.
 *
 * Sequential paging would mean ~40 round trips for the upcoming exhibitions
 * alone. Fetching in small concurrent batches keeps regeneration quick without
 * opening 40 sockets to the API at once. Fails soft: a batch that returns
 * nothing simply ends the walk, so a partial sitemap is served rather than none.
 */
async function collect(fetchPage, max) {
  const first = await fetchPage(1);
  if (!first.items.length) return [];

  const items = [...first.items];
  const totalPages = Math.min(first.totalPages || 1, Math.ceil(max / PAGE_SIZE));

  for (let page = 2; page <= totalPages; page += 5) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(5, totalPages - page + 1) }, (_, i) => fetchPage(page + i))
    );
    for (const result of batch) items.push(...result.items);
    if (items.length >= max) break;
  }

  return items.slice(0, max);
}

/** Exhibitions change as their dates approach; details rarely change once set. */
function exhibitionEntries(items, changeFrequency, priority) {
  return items.map((e) => ({
    url: `${SITE_URL}${exhibitionPath(e.name, e.id)}`,
    lastModified: e.updatedAt ? new Date(e.updatedAt) : new Date(),
    changeFrequency,
    priority,
  }));
}

async function buildAllUrls() {
  const now = new Date();

  // Static routes first, so they land in chunk 0 and are always crawled.
  const staticEntries = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}${PUBLIC_ROUTES.exhibitions}`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}${PUBLIC_ROUTES.exhibitions}?scope=ongoing`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}${PUBLIC_ROUTES.exhibitions}?scope=previous`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}${PUBLIC_ROUTES.locations}`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}${PUBLIC_ROUTES.companies}`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}${PUBLIC_ROUTES.products}`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}${PUBLIC_ROUTES.services}`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/about`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy-policy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/delete-account`, changeFrequency: "yearly", priority: 0.3 },
  ].map((entry) => ({ lastModified: now, ...entry }));

  const [locations, categories, upcoming, ongoing, previous, companies, products] = await Promise.all([
    // Only places that clear the quality threshold in lib/locations.js have a
    // page, so this adds ~96 URLs, not one per city in the data.
    getLocationIndex(),
    // Same contract: only categories over MIN_CATEGORY have a page, and the
    // index is empty until the API projects `category`, so nothing is listed
    // here that would 404.
    getCategoryIndex(),
    collect((page) => getUpcomingExhibitions({ page, limit: PAGE_SIZE }), BUDGET.upcoming),
    collect((page) => getOngoingExhibitions({ page, limit: PAGE_SIZE }), BUDGET.ongoing),
    collect((page) => getExhibitions("previous", { page, limit: PAGE_SIZE }), BUDGET.previous),
    collect((page) => getCompanies({ page, limit: PAGE_SIZE }), BUDGET.companies),
    collect((page) => getProducts({ page, limit: PAGE_SIZE }), BUDGET.products),
  ]);

  // Country pages rank above their cities: a country page links to every one
  // of its cities, so crawling it first is the cheaper path into the set.
  const locationEntries = [
    ...locations.countries.map((c) => ({
      url: `${SITE_URL}${countryLandingPath(c.slug)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    })),
    ...locations.countries.flatMap((c) =>
      c.cities.map((city) => ({
        url: `${SITE_URL}${cityLandingPath(city.countrySlug, city.slug)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      }))
    ),
  ];

  // The industry hub is listed only when it has industries to show — it is
  // noindex while empty (see the hub page), and a sitemap should never contain
  // a URL that tells crawlers not to index it.
  const categoryEntries = (
    categories.categories.length
      ? [{ url: `${SITE_URL}${PUBLIC_ROUTES.categories}`, priority: 0.8 }]
      : []
  )
    .map((e) => ({ lastModified: now, changeFrequency: "weekly", ...e }))
    .concat(categories.categories.map((c) => ({
      url: `${SITE_URL}${categoryLandingPath(c.slug)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    })));

  const entries = [
    ...staticEntries,
    ...locationEntries,
    ...categoryEntries,
    ...exhibitionEntries(ongoing, "daily", 0.9),
    ...exhibitionEntries(upcoming, "weekly", 0.8),
    ...exhibitionEntries(previous, "yearly", 0.4),
    ...companies.map((c) => ({
      url: `${SITE_URL}${companyPath(c.name, c.id)}`,
      lastModified: c.updatedAt ? new Date(c.updatedAt) : now,
      changeFrequency: "monthly",
      priority: 0.6,
    })),
    // Products carry no timestamps in the schema, so lastModified falls back to
    // the generation time rather than inventing a date.
    ...products.map((p) => ({
      url: `${SITE_URL}${productPath(p.name, p.id)}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    })),
  ];

  // An exhibition reachable from more than one collection would otherwise
  // appear twice; duplicate URLs in a sitemap are a validation warning.
  const seen = new Set();
  return entries.filter(({ url }) => (seen.has(url) ? false : seen.add(url)));
}

export async function generateSitemaps() {
  const urls = await buildAllUrls();
  const chunks = Math.max(1, Math.ceil(urls.length / CHUNK_SIZE));
  return Array.from({ length: chunks }, (_, id) => ({ id }));
}

export default async function sitemap({ id = 0 } = {}) {
  const urls = await buildAllUrls();
  const start = Number(id) * CHUNK_SIZE;
  return urls.slice(start, start + CHUNK_SIZE);
}
