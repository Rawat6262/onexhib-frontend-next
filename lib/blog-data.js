import { getCounts, getUpcomingExhibitions } from "@/lib/public-api";
import { getLocationIndex } from "@/lib/locations";
import { getCategoryIndex } from "@/lib/categories";

/**
 * Live figures for the blog's data sections.
 *
 * EVERY NUMBER HERE COMES FROM AN EXISTING ENDPOINT. Nothing is hardcoded and
 * nothing is estimated: the blog's whole claim is that it is written from the
 * catalogue, so a decorative "10,000+ exhibitions" would undermine the page it
 * decorates. Where a figure is unavailable the caller renders nothing rather
 * than a zero - see the same rule in CountsStrip.
 *
 * The four sources are already fetched elsewhere in the app (the homepage uses
 * all of them), so Next's fetch cache generally satisfies these from memory
 * rather than issuing new requests.
 */
export async function getBlogData() {
  const [counts, upcoming, locations, categories] = await Promise.all([
    getCounts().catch(() => null),
    getUpcomingExhibitions({ page: 1, limit: 12 }).catch(() => ({ items: [], total: 0 })),
    getLocationIndex().catch(() => ({ countries: [], total: 0 })),
    getCategoryIndex().catch(() => ({ categories: [], total: 0 })),
  ]);

  const countries = locations.countries || [];
  const industries = categories.categories || [];

  // Cities are nested under their country, so the flat "how many cities have a
  // page" figure has to be summed rather than read off.
  const cityCount = countries.reduce((sum, c) => sum + (c.cities?.length || 0), 0);

  return {
    counts,
    upcomingTotal: upcoming.total || 0,
    // Real records, used for the hero collage - these carry actual exhibition
    // imagery, so the page illustrates itself instead of reaching for stock.
    upcomingItems: (upcoming.items || []).filter((e) => e?.image).slice(0, 6),
    countryCount: countries.length,
    cityCount,
    industryCount: industries.length,
    topCountries: countries.slice(0, 6).map((c) => ({
      label: c.country,
      slug: c.slug,
      count: c.count,
    })),
    topIndustries: industries.slice(0, 6).map((c) => ({
      label: c.label,
      slug: c.slug,
      count: c.count,
    })),
    monthly: monthlyDistribution(countries),
  };
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Upcoming exhibitions per calendar month, from the start dates the location
 * index already carries.
 *
 * getLocationIndex() walks the whole upcoming set and keeps each place's dates,
 * so the months can be tallied without a second pass over the catalogue. Only
 * places that clear the index's quality threshold are represented, which makes
 * this a shape-of-the-season figure rather than a census - the labels say
 * "listings", never "all exhibitions".
 *
 * Returns the next 12 months from today so the curve always starts at now,
 * rather than at a fixed January that would be half in the past by summer.
 */
function monthlyDistribution(countries) {
  const now = new Date();
  const buckets = [];
  const index = new Map();

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = {
      key,
      label: MONTH_ABBR[d.getMonth()],
      year: d.getFullYear(),
      count: 0,
    };
    buckets.push(bucket);
    index.set(key, bucket);
  }

  for (const country of countries) {
    for (const iso of country.dates || []) {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) continue;
      const bucket = index.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (bucket) bucket.count += 1;
    }
  }

  const max = Math.max(...buckets.map((b) => b.count), 0);
  return max > 0 ? { buckets, max } : null;
}
