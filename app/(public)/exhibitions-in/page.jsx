import Link from "next/link";
import { MapPin } from "lucide-react";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import EmptyState from "@/components/public/EmptyState";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";
import { breadcrumbNode, graph, itemListNode } from "@/lib/jsonld";
import { cityLandingPath, countryLandingPath } from "@/lib/routes";
import { getLocationIndex, MIN_CITY, MIN_COUNTRY } from "@/lib/locations";

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
  const { countries } = await getLocationIndex();

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
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
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

      {countries.length ? (
        <div className="mt-10 space-y-10">
          {countries.map((country) => (
            <section key={country.slug} aria-labelledby={`country-${country.slug}`}>
              <h2 id={`country-${country.slug}`} className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                <Link
                  href={countryLandingPath(country.slug)}
                  className="underline-offset-4 hover:text-[#131C55] hover:underline dark:hover:text-blue-300"
                >
                  Exhibitions in {country.country}
                </Link>
                <span className="ml-2 align-middle text-sm font-medium text-gray-500 dark:text-gray-500">
                  {country.count} upcoming
                </span>
              </h2>

              {country.cities.length ? (
                <ul className="mt-3 flex list-none flex-wrap gap-2">
                  {country.cities.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={cityLandingPath(c.countrySlug, c.slug)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-gray-600 transition hover:border-[#131C55]/40 hover:text-[#131C55] motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-white"
                      >
                        <MapPin size={13} className="text-gray-400" aria-hidden="true" />
                        {c.city}
                        <span className="text-gray-400 dark:text-gray-600">{c.count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                  Listings are spread across smaller cities;{" "}
                  <Link
                    href={countryLandingPath(country.slug)}
                    className="underline underline-offset-4 hover:text-[#131C55] dark:hover:text-white"
                  >
                    see all exhibitions in {country.country}
                  </Link>
                  .
                </p>
              )}
            </section>
          ))}
        </div>
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
