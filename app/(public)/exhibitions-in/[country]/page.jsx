import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import ExhibitionCard from "@/components/public/ExhibitionCard";
import Pagination from "@/components/public/Pagination";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata, pageMetadata, NOINDEX_FOLLOW } from "@/lib/seo";
import { breadcrumbNode, graph, itemListNode } from "@/lib/jsonld";
import { cityLandingPath, countryLandingPath, exhibitionPath } from "@/lib/routes";
import { dateSummary, getCountryFacet, getExhibitionsInPlace } from "@/lib/locations";

/**
 * Country landing page: /exhibitions-in/[country]
 *
 * The middle tier of the location hierarchy. It earns its place by holding
 * something neither the city pages nor the global listing has: the country's
 * cities ranked by inventory, which is both genuinely useful ("where in Germany
 * do trade shows actually happen?") and the crawl path into the city pages.
 *
 * COUNTRY PAGES ARE NOT GEOGRAPHIC TARGETING. They are catalogue facets in
 * English, describing where events take place - not localised versions of one
 * page for different markets. That distinction is why there is no hreflang here
 * (see the SEO notes in lib/seo.js): hreflang describes equivalent pages in
 * different languages or regions, and these pages have no equivalents.
 */

/**
 * Rendered on demand, not prerendered.
 *
 * This route reads `?page=`, and a route that reads searchParams cannot be
 * statically generated — pairing it with generateStaticParams produced a build
 * that 500s on every request in production while working fine in dev. The data
 * underneath is still ISR-cached: every fetch in lib/locations.js and
 * lib/public-api.js carries its own revalidate, so a request costs a cache read
 * rather than a walk of the catalogue.
 */
export const revalidate = 3600;

const PER_PAGE = 24;

const readPage = (sp) => {
  const v = sp?.page;
  return Math.max(1, Number(Array.isArray(v) ? v[0] : v) || 1);
};

export async function generateMetadata({ params, searchParams }) {
  const { country } = await params;
  const facet = await getCountryFacet(country);
  if (!facet) return { title: "Location not found", robots: { index: false, follow: true } };

  const page = readPage(await searchParams);
  const summary = dateSummary(facet.dates);
  const canonical = countryLandingPath(facet.slug);

  const title = `Exhibitions in ${facet.country} — upcoming trade shows`;
  const description = summary
    ? `${facet.count} upcoming exhibitions and trade shows across ${facet.country}, from ${summary.firstLabel} to ${summary.lastLabel}. Browse by city, with dates and full details for every event.`
    : `Upcoming exhibitions and trade shows across ${facet.country}, with dates and full details for every event.`;

  if (page > 1) {
    return pageMetadata({
      title: `Exhibitions in ${facet.country} — page ${page}`,
      description,
      path: canonical,
      robots: NOINDEX_FOLLOW,
    });
  }

  return publicPageMetadata({ title, description, path: canonical });
}

export default async function CountryLandingPage({ params, searchParams }) {
  const { country } = await params;
  const facet = await getCountryFacet(country);
  if (!facet) notFound();

  const page = readPage(await searchParams);
  const items = await getExhibitionsInPlace({ country: facet.country });
  if (!items.length) notFound();

  const summary = dateSummary(items.map((e) => e.startDate).filter(Boolean));
  const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const pageItems = items.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  // A page number past the end used to return 200 with an empty grid, which
  // Search Console reports as a soft 404 and which wastes crawl budget on URLs
  // that hold nothing. An out-of-range page is a 404.
  if (page > 1 && !pageItems.length) notFound();

  const path = countryLandingPath(facet.slug);
  const trail = [
    { name: "Home", path: "/" },
    { name: "Exhibitions by location", path: PUBLIC_ROUTES.locations },
    { name: facet.country, path },
  ];

  // Cities counted across the WHOLE country, not just this page of results —
  // otherwise the "cities" section would change as you paginate.
  const cityCount = facet.cities.length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        graph={graph(
          breadcrumbNode(trail),
          itemListNode(
            pageItems.map((e) => exhibitionPath(e.name, e.id)),
            { name: `Upcoming exhibitions in ${facet.country}` }
          )
        )}
      />

      <Breadcrumbs trail={trail} />

      <header className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          Exhibitions in {facet.country}
        </h1>

        <p className="mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          <strong className="font-semibold text-gray-900 dark:text-gray-100">
            {items.length} upcoming {items.length === 1 ? "exhibition" : "exhibitions"}
          </strong>{" "}
          and trade shows are listed across {facet.country}
          {summary ? (
            <>
              , running from {summary.firstLabel} to {summary.lastLabel}
            </>
          ) : null}
          .
          {cityCount > 0 ? (
            <>
              {" "}
              {cityCount === 1 ? "One city has" : `${cityCount} cities have`} enough listings for a
              dedicated page — they are linked below.
            </>
          ) : null}
        </p>

        {summary && summary.monthsCovered > 1 ? (
          <p className="mt-2 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
            The busiest month is {summary.busiestLabel}, with {summary.busiestCount}{" "}
            {summary.busiestCount === 1 ? "exhibition" : "exhibitions"} scheduled.
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <Link
            href={PUBLIC_ROUTES.locations}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 font-medium text-gray-700 transition hover:border-[#131C55]/40 hover:text-[#131C55] motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-white"
          >
            <MapPin size={14} aria-hidden="true" />
            All countries
          </Link>
          <Link
            href={PUBLIC_ROUTES.exhibitions}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 font-medium text-gray-700 transition hover:border-[#131C55]/40 hover:text-[#131C55] motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-white"
          >
            <CalendarDays size={14} aria-hidden="true" />
            Upcoming exhibitions worldwide
          </Link>
        </div>
      </header>

      {facet.cities.length ? (
        <section aria-labelledby="cities-heading" className="mt-12">
          <h2
            id="cities-heading"
            className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white"
          >
            Exhibition cities in {facet.country}
          </h2>
          <p className="mt-2 text-[15px] text-gray-600 dark:text-gray-400">
            The cities hosting the most upcoming exhibitions, with the number listed in each.
          </p>
          <ul className="mt-5 flex list-none flex-wrap gap-2.5">
            {facet.cities.map((c) => (
              <li key={c.slug}>
                <Link
                  href={cityLandingPath(c.countrySlug, c.slug)}
                  className="ox-card inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 hover:border-[#131C55]/40 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-600"
                >
                  <MapPin size={15} className="text-gray-400" aria-hidden="true" />
                  Exhibitions in {c.city}
                  <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {c.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="upcoming-heading" className="mt-14">
        <h2
          id="upcoming-heading"
          className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white"
        >
          Upcoming exhibitions in {facet.country}
        </h2>
        <ul className="mt-6 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pageItems.map((exhibition, i) => (
            <li key={exhibition.id}>
              <ExhibitionCard
                exhibition={exhibition}
                priority={page === 1 && i < 4}
                className="h-full"
              />
            </li>
          ))}
        </ul>

        <Pagination
          page={page}
          totalPages={totalPages}
          buildHref={(p) => (p > 1 ? `${path}?page=${p}` : path)}
        />
      </section>
    </div>
  );
}
