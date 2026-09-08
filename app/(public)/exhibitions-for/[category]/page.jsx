import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Tag } from "lucide-react";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import ExhibitionCard from "@/components/public/ExhibitionCard";
import Pagination from "@/components/public/Pagination";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata, pageMetadata, NOINDEX_FOLLOW } from "@/lib/seo";
import { breadcrumbNode, graph, itemListNode } from "@/lib/jsonld";
import { categoryLandingPath, cityLandingPath, countryLandingPath, exhibitionPath } from "@/lib/routes";
import { getCategoryFacet } from "@/lib/categories";
import { dateSummary, getLocationIndex } from "@/lib/locations";
import { slugifyName } from "@/lib/slug";

/**
 * Industry landing page: /exhibitions-for/[category]
 *
 * The third discovery axis, after place and date. "technology exhibitions" and
 * "textile trade shows" are how people search when they know their sector but
 * not the event, and until now the site had no page that could answer either.
 *
 * WHY IT SERVES FROM THE INDEX RATHER THAN A FILTERED QUERY
 * The listing endpoints accept country/state/city and nothing else — there is
 * no category parameter to call. So unlike the city pages, which re-query the
 * API, this page reads its exhibitions out of the same hourly catalogue walk
 * that built the index. One walk, cached, shared with the location tier.
 *
 * WHAT HAPPENS BEFORE THE BACKEND IS DEPLOYED
 * The live API does not yet project `category` (the backend source does; it is
 * not released). Until it is, the index is empty, every category 404s, and the
 * hub renders its empty state. Nothing here needs changing when that ships —
 * the pages simply begin to exist.
 */

export const revalidate = 3600;

const PER_PAGE = 24;

const readPage = (sp) => {
  const v = sp?.page;
  return Math.max(1, Number(Array.isArray(v) ? v[0] : v) || 1);
};

/**
 * Metadata built from the category's own numbers, so no two pages share a title
 * or description. "Trade shows" appears alongside "exhibitions" because the two
 * are used interchangeably in this sector — not to repeat a keyword.
 */
function describe(facet, summary) {
  const title = `${facet.label} exhibitions and trade shows worldwide`;
  const description = summary
    ? `${facet.count} upcoming ${facet.label.toLowerCase()} exhibitions and trade shows worldwide, running from ${summary.firstLabel} to ${summary.lastLabel}. See dates, locations and full details for every event.`
    : `Upcoming ${facet.label.toLowerCase()} exhibitions and trade shows worldwide, with dates, locations and full details for every event.`;
  return { title, description };
}

export async function generateMetadata({ params, searchParams }) {
  const { category } = await params;
  const facet = await getCategoryFacet(category);
  if (!facet) return { title: "Category not found", robots: { index: false, follow: true } };

  const page = readPage(await searchParams);
  const { title, description } = describe(facet, dateSummary(facet.dates));
  const canonical = categoryLandingPath(facet.slug);

  if (page > 1) {
    return pageMetadata({
      title: `${facet.label} exhibitions — page ${page}`,
      description,
      path: canonical,
      robots: NOINDEX_FOLLOW,
    });
  }

  return publicPageMetadata({ title, description, path: canonical });
}

export default async function CategoryLandingPage({ params, searchParams }) {
  const { category } = await params;
  const facet = await getCategoryFacet(category);
  // Below MIN_CATEGORY, or not a category in the data. A 404 beats a thin page.
  if (!facet) notFound();

  const page = readPage(await searchParams);
  const summary = dateSummary(facet.dates);
  const totalPages = Math.max(1, Math.ceil(facet.items.length / PER_PAGE));
  const pageItems = facet.items.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  if (page > 1 && !pageItems.length) notFound();

  // Only link a country or city on that carries a real landing page, so this
  // section can never point at a URL that 404s.
  const { countryBySlug, cityBySlug } = await getLocationIndex();
  const countryLinks = facet.countries
    .map((c) => ({ ...c, slug: slugifyName(c.name) }))
    .filter((c) => countryBySlug.has(c.slug));
  const cityLinks = facet.cities
    .map((c) => {
      const citySlug = slugifyName(c.name);
      const match = [...cityBySlug.entries()].find(([key]) => key.endsWith(`/${citySlug}`));
      return match ? { ...c, countrySlug: match[1].countrySlug, slug: citySlug } : null;
    })
    .filter(Boolean);

  const path = categoryLandingPath(facet.slug);
  const trail = [
    { name: "Home", path: "/" },
    { name: "Exhibitions by industry", path: PUBLIC_ROUTES.categories },
    { name: facet.label, path },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        graph={graph(
          breadcrumbNode(trail),
          itemListNode(
            pageItems.map((e) => exhibitionPath(e.name, e.id)),
            { name: `Upcoming ${facet.label} exhibitions` }
          )
        )}
      />

      <Breadcrumbs trail={trail} />

      <header className="max-w-3xl">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-[#131C55]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#131C55] dark:bg-blue-400/10 dark:text-blue-300">
          <Tag size={12} aria-hidden="true" />
          Industry
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          {facet.label} exhibitions
        </h1>

        {/* Counted from the records listed below, so the claim is checkable. */}
        <p className="mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          <strong className="font-semibold text-gray-900 dark:text-gray-100">
            {facet.count} upcoming {facet.count === 1 ? "exhibition" : "exhibitions"}
          </strong>{" "}
          are listed under {facet.label.toLowerCase()}
          {summary ? (
            <>
              , running from {summary.firstLabel} to {summary.lastLabel}
            </>
          ) : null}
          . Each one links through to its dates, venue and the companies exhibiting.
        </p>

        {facet.countries.length ? (
          <p className="mt-2 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
            They take place across {facet.countries.length === 1 ? "one country" : `${facet.countries.length}+ countries`}, most
            often in {facet.countries.slice(0, 3).map((c) => c.name).join(", ")}.
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <Link
            href={PUBLIC_ROUTES.categories}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 font-medium text-gray-700 transition hover:border-[#131C55]/40 hover:text-[#131C55] motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-white"
          >
            <Tag size={14} aria-hidden="true" />
            All industries
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

      <section aria-labelledby="upcoming-heading" className="mt-12">
        <h2
          id="upcoming-heading"
          className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white"
        >
          Upcoming {facet.label.toLowerCase()} exhibitions
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

      {countryLinks.length || cityLinks.length ? (
        <section aria-labelledby="where-heading" className="mt-14">
          <h2
            id="where-heading"
            className="text-xl font-bold tracking-tight text-gray-900 dark:text-white"
          >
            Where {facet.label.toLowerCase()} exhibitions are held
          </h2>
          <p className="mt-2 text-[15px] text-gray-600 dark:text-gray-400">
            The locations hosting the most of these events. Each opens the full listing for that
            place.
          </p>
          <ul className="mt-4 flex list-none flex-wrap gap-2">
            {countryLinks.map((c) => (
              <li key={`country-${c.slug}`}>
                <Link href={countryLandingPath(c.slug)} className={chip}>
                  <MapPin size={13} className="text-gray-400" aria-hidden="true" />
                  Exhibitions in {c.name}
                </Link>
              </li>
            ))}
            {cityLinks.map((c) => (
              <li key={`city-${c.countrySlug}-${c.slug}`}>
                <Link href={cityLandingPath(c.countrySlug, c.slug)} className={chip}>
                  <MapPin size={13} className="text-gray-400" aria-hidden="true" />
                  Exhibitions in {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

const chip =
  "inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-gray-600 transition hover:border-[#131C55]/40 hover:text-[#131C55] motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-white";
