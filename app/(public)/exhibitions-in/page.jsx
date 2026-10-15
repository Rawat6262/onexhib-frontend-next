import Link from "next/link";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import EmptyState from "@/components/public/EmptyState";
import LocationExplorer from "@/components/public/LocationExplorer";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";
import { breadcrumbNode, graph, itemListNode } from "@/lib/jsonld";
import { countryLandingPath } from "@/lib/routes";
import { getLocationEvents, getLocationIndex, MIN_CITY, MIN_COUNTRY } from "@/lib/locations";
import { getGeoCountryMap } from "@/lib/public-api";

/**
 * The location hub: /exhibitions-in
 *
 * Its job is crawl depth. Without it, every country and city landing page would
 * be reachable only from the sitemap and from whatever fits in the footer,
 * which is a weak signal. With it, every location page is two clicks from the
 * homepage and one from here.
 *
 * It is also the page that answers "where are trade shows held?" as a question
 * in its own right, which the individual country pages cannot.
 */

export const revalidate = 3600;

export const metadata = publicPageMetadata({
  title: "Where trade shows are held — by country and city",
  description:
    "Find exhibitions and trade shows by location. Browse the countries and cities with the most upcoming business events, each with dates and full details.",
  path: PUBLIC_ROUTES.locations,
});

export default async function LocationsHubPage() {
  // The geo map is a lookup for flags only — it never decides which countries
  // appear. getLocationIndex() owns that, gated on real exhibition inventory,
  // so the ~250-entry reference list cannot turn into ~250 pages.
  // The events share the index's cached walk of upcoming exhibitions - no extra request.
  const [{ countries }, geo, events] = await Promise.all([getLocationIndex(), getGeoCountryMap(), getLocationEvents()]);

  // What the explorer needs from the index: the places with landing pages, plus
  // flags. Plain data only - Maps and functions cannot cross to a client component.
  const directory = countries.map((c) => ({
    country: c.country,
    slug: c.slug,
    count: c.count,
    flag: geo.get(c.country?.toLowerCase())?.flag || null,
    cities: c.cities.map((city) => ({ city: city.city, slug: city.slug, countrySlug: city.countrySlug, count: city.count })),
  }));
  const today = new Date().toISOString().slice(0, 10);

  const trail = [
    { name: "Home", path: "/" },
    { name: "Exhibitions by location", path: PUBLIC_ROUTES.locations },
  ];

  const cityTotal = countries.reduce((n, c) => n + c.cities.length, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        graph={graph(
          breadcrumbNode(trail),
          itemListNode(
            countries.map((c) => countryLandingPath(c.slug)),
            { name: "Countries with upcoming exhibitions" }
          )
        )}
      />

      <Breadcrumbs trail={trail} />

      <header className="max-w-3xl">
        <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-[2.6rem] dark:text-white">
          Exhibitions by country and city
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          Trade shows cluster around a relatively small number of exhibition centres. These are the{" "}
          {countries.length} countries and {cityTotal} cities in the OneXhib catalogue with enough
          upcoming exhibitions to be worth browsing on their own, ordered by how many are listed.
        </p>
        {/* States the threshold plainly rather than implying the list is
            exhaustive. A place below it is still browsable from /exhibitions. */}
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
          A country appears here with {MIN_COUNTRY} or more upcoming exhibitions, a city with{" "}
          {MIN_CITY} or more. Smaller locations can still be found from the{" "}
          <Link
            href={PUBLIC_ROUTES.exhibitions}
            className="underline underline-offset-4 hover:text-[#131C55] dark:hover:text-white"
          >
            full exhibitions listing
          </Link>
          .
        </p>
      </header>

      {/* The explorer renders the country/city directory itself (every landing
          link stays in the server HTML) and swaps in live results while filtering. */}
      {countries.length ? (
        <LocationExplorer data={events} directory={directory} today={today} />
      ) : (
        <div className="mt-10">
          <EmptyState>
            Location listings are temporarily unavailable. Please try again shortly.
          </EmptyState>
        </div>
      )}
    </div>
  );
}
