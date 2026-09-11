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
import { dateSummary, getCityFacet, getCountryFacet, getExhibitionsInPlace } from "@/lib/locations";

/**
 * City landing page: /exhibitions-in/[country]/[city]
 *
 * WHY THIS PAGE EXISTS AND THE ?city= FILTER DOES NOT REPLACE IT
 * "exhibitions in <city>" is the highest-intent query pattern this catalogue
 * can serve, and /exhibitions?city=Berlin cannot rank for it: it is noindex by
 * design, because allowing every filter combination into the index would create
 * thousands of near-duplicate URLs. This route is the deliberate opposite - a
 * small, fixed set of URLs, each backed by enough inventory to be a real page.
 *
 * WHY IT IS NESTED UNDER THE COUNTRY
 * Singapore, Mexico City, Luxembourg and Kuwait City are cities whose names
 * collide with countries. A flat /exhibitions-in/[place] would have to guess
 * which one a slug meant. Nesting removes the ambiguity entirely, and gives the
 * crawler the hierarchy it should see anyway: hub -> country -> city -> event.
 *
 * WHY IT CANNOT 404-PROOF ITSELF WITH generateStaticParams
 * The qualifying set changes as exhibitions are added and pass, so params are
 * resolved on demand and ISR-cached. A city that drops below the threshold
 * stops resolving and starts returning 404 - which is correct: the page no
 * longer has the content it promises.
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

/**
 * Title and description are built from the place's real numbers, so no two
 * city pages share them. `count` is the exact-matched total, not the API's
 * loose substring count - see getExhibitionsInPlace.
 */
function describe(facet, count, summary) {
  const where = `${facet.city}, ${facet.country}`;
  const title = `Exhibitions in ${facet.city} — upcoming trade shows`;
  const description = summary
    ? `${count} upcoming exhibitions and trade shows in ${where}, running from ${summary.firstLabel} to ${summary.lastLabel}. See dates and full details for every event.`
    : `Upcoming exhibitions and trade shows in ${where}, with dates and full details for every event.`;
  return { title, description };
}

export async function generateMetadata({ params, searchParams }) {
  const { country, city } = await params;
  const facet = await getCityFacet(country, city);
  if (!facet) return { title: "Location not found", robots: { index: false, follow: true } };

  const page = readPage(await searchParams);
  const items = await getExhibitionsInPlace(facet);
  // Dates come from the same exact-matched set as the count, not from the
  // index's looser tally, so the description can never claim a range that
  // belongs to a record the page does not list.
  const items_dates = items.map((e) => e.startDate).filter(Boolean);
  const { title, description } = describe(facet, items.length, dateSummary(items_dates));
  const canonical = cityLandingPath(facet.countrySlug, facet.slug);

  // Page 2+ canonicalises to page 1 of the SAME city - never to an unrelated
  // page - and stays out of the index while its links remain followable. This
  // mirrors how the companies and products listings already behave.
  if (page > 1) {
    return pageMetadata({
      title: `Exhibitions in ${facet.city} — page ${page}`,
      description,
      path: canonical,
      robots: NOINDEX_FOLLOW,
    });
  }

  return publicPageMetadata({ title, description, path: canonical });
}

export default async function CityLandingPage({ params, searchParams }) {
  const { country, city } = await params;
  const facet = await getCityFacet(country, city);
  // Below the quality threshold, or not a place in the data at all. A 404 is
  // the honest answer; a thin page would be worse for both users and crawlers.
  if (!facet) notFound();

  const page = readPage(await searchParams);
  const [items, ongoing] = await Promise.all([
    getExhibitionsInPlace(facet),
    getExhibitionsInPlace(facet, { scope: "ongoing" }),
  ]);
  if (!items.length && !ongoing.length) notFound();

  const summary = dateSummary(items.map((e) => e.startDate).filter(Boolean));
  const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const pageItems = items.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  // A page number past the end used to return 200 with an empty grid, which
  // Search Console reports as a soft 404 and which wastes crawl budget on URLs
  // that hold nothing. An out-of-range page is a 404.
  if (page > 1 && !pageItems.length) notFound();

  const path = cityLandingPath(facet.countrySlug, facet.slug);
  const trail = [
    { name: "Home", path: "/" },
    { name: "Exhibitions by location", path: PUBLIC_ROUTES.locations },
    { name: facet.country, path: countryLandingPath(facet.countrySlug) },
    { name: facet.city, path },
  ];

  // Sibling cities for lateral crawling: a visitor looking at Berlin is a
  // plausible visitor for Munich, and the link gives the crawler another route
  // into the country's other landing pages.
  const countryFacet = await getCountryFacet(facet.countrySlug);
  const siblings = countryFacet
    ? countryFacet.cities.filter((c) => c.slug !== facet.slug).slice(0, 8)
    : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        graph={graph(
          breadcrumbNode(trail),
          itemListNode(
            pageItems.map((e) => exhibitionPath(e.name, e.id)),
            { name: `Upcoming exhibitions in ${facet.city}` }
          )
        )}
      />

      <Breadcrumbs trail={trail} />

      <header className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          Exhibitions in {facet.city}
        </h1>

        {/* Every number in this paragraph is counted from the records listed
            below it, so the copy stays true as the catalogue changes and a
            reader can verify it by scrolling. */}
        <p className="mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          {items.length > 0 ? (
            <>
              There {items.length === 1 ? "is" : "are"}{" "}
              <strong className="font-semibold text-gray-900 dark:text-gray-100">
                {items.length} upcoming {items.length === 1 ? "exhibition" : "exhibitions"}
              </strong>{" "}
              in {facet.city}, {facet.country}
              {summary ? (
                <>
                  , running from {summary.firstLabel} to {summary.lastLabel}
                </>
              ) : null}
              . Each listing below shows its dates and links through to the full details.
            </>
          ) : (
            <>
              No exhibitions in {facet.city} are currently scheduled for a future date, but the
              events below are running right now.
            </>
          )}
        </p>

        {summary && summary.monthsCovered > 1 ? (
          <p className="mt-2 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
            The busiest month is {summary.busiestLabel}, with {summary.busiestCount}{" "}
            {summary.busiestCount === 1 ? "exhibition" : "exhibitions"} scheduled.
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <Link
            href={countryLandingPath(facet.countrySlug)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 font-medium text-gray-700 transition hover:border-[#131C55]/40 hover:text-[#131C55] motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-white"
          >
            <MapPin size={14} aria-hidden="true" />
            All exhibitions in {facet.country}
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

      {ongoing.length ? (
        <section aria-labelledby="ongoing-heading" className="mt-12">
          <h2
            id="ongoing-heading"
            className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white"
          >
            Happening now in {facet.city}
          </h2>
          <p className="mt-2 text-[15px] text-gray-600 dark:text-gray-400">
            {ongoing.length === 1 ? "This exhibition is" : `These ${ongoing.length} exhibitions are`}{" "}
            open to visitors today.
          </p>
          <ul className="mt-6 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ongoing.slice(0, 8).map((exhibition) => (
              <li key={exhibition.id}>
                <ExhibitionCard exhibition={exhibition} className="h-full" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pageItems.length ? (
        <section aria-labelledby="upcoming-heading" className="mt-12">
          <h2
            id="upcoming-heading"
            className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white"
          >
            Upcoming exhibitions in {facet.city}
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
      ) : null}

      {siblings.length ? (
        <section aria-labelledby="nearby-heading" className="mt-14">
          <h2
            id="nearby-heading"
            className="text-xl font-bold tracking-tight text-gray-900 dark:text-white"
          >
            Other cities with exhibitions in {facet.country}
          </h2>
          <ul className="mt-4 flex list-none flex-wrap gap-2.5">
            {siblings.map((c) => (
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
    </div>
  );
}
