import Link from "next/link";
import { notFound } from "next/navigation";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import ExhibitionCard from "@/components/public/ExhibitionCard";
import EmptyState from "@/components/public/EmptyState";
import Pagination from "@/components/public/Pagination";
import SearchBar from "@/components/public/SearchBar";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata, pageMetadata, NOINDEX_FOLLOW } from "@/lib/seo";
import { breadcrumbNode, graph, itemListNode } from "@/lib/jsonld";
import { exhibitionPath } from "@/lib/routes";
import {
  EXHIBITION_SCOPES,
  getExhibitions,
  getUpcomingCities,
  searchExhibitions,
} from "@/lib/public-api";

/**
 * The main exhibition discovery page: /exhibitions
 *
 * Serves three related search intents from one route, switched by ?scope=
 *   upcoming (default)  "upcoming exhibitions", "exhibition dates"
 *   ongoing             "exhibitions happening now"
 *   previous            "past exhibitions", the archive
 *
 * and narrows by ?city= / ?country= / ?state=, which are the only filters the
 * backend actually implements (buildLocationFilter), plus ?search=, which is
 * the only parameter the *search endpoints accept. No invented parameters.
 *
 * INDEXING: the bare page and each scope are indexable. Filtered and searched
 * variants are noindex,follow with a canonical pointing at the unfiltered
 * scope — otherwise every city-and-page combination becomes a thin near
 * duplicate, which at 2,178 exhibitions would be thousands of junk URLs.
 */

export const revalidate = 300;

const SCOPE_META = {
  upcoming: {
    title: "Upcoming exhibitions and trade shows worldwide",
    heading: "Upcoming exhibitions",
    description:
      "Browse upcoming exhibitions, trade shows and business events worldwide. See exhibition dates, venues, cities and categories, and plan which events to attend.",
    intro:
      "Exhibitions and trade shows still to come, soonest first. Filter by city or search by name, category or venue.",
  },
  ongoing: {
    title: "Ongoing exhibitions happening now",
    heading: "Ongoing exhibitions",
    description:
      "Exhibitions and trade shows running right now, worldwide. See what is open to visitors today, where it is being held, and when it closes.",
    intro: "Exhibitions open to visitors today, ending soonest first.",
  },
  previous: {
    title: "Past exhibitions and trade show archive",
    heading: "Past exhibitions",
    description:
      "An archive of exhibitions and trade shows that have already taken place, with their dates, venues and locations — useful for researching an event before its next edition.",
    intro: "Exhibitions that have already taken place, most recent first.",
  },
};

const SCOPES = Object.keys(EXHIBITION_SCOPES);
const PER_PAGE = 24;

function readParams(searchParams) {
  const raw = (key) => {
    const v = searchParams?.[key];
    return (Array.isArray(v) ? v[0] : v) || "";
  };
  const scope = SCOPES.includes(raw("scope")) ? raw("scope") : "upcoming";
  const page = Math.max(1, Number(raw("page")) || 1);
  return {
    scope,
    page,
    search: raw("search").trim().slice(0, 100),
    city: raw("city").trim(),
    state: raw("state").trim(),
    country: raw("country").trim(),
  };
}

export async function generateMetadata({ searchParams }) {
  const { scope, search, city, country, page } = readParams(await searchParams);
  const meta = SCOPE_META[scope];
  const canonical =
    scope === "upcoming" ? PUBLIC_ROUTES.exhibitions : `${PUBLIC_ROUTES.exhibitions}?scope=${scope}`;

  // A filtered, searched or paged view canonicalises back to its clean scope
  // and is kept out of the index, while its links stay followable.
  if (search || city || country || page > 1) {
    const label = search
      ? `Exhibitions matching “${search}”`
      : city || country
        ? `Exhibitions in ${city || country}`
        : `${meta.heading} — page ${page}`;
    return pageMetadata({
      title: label,
      description: meta.description,
      path: canonical,
      robots: NOINDEX_FOLLOW,
    });
  }

  return publicPageMetadata({ title: meta.title, description: meta.description, path: canonical });
}

export default async function ExhibitionsPage({ searchParams }) {
  const { scope, page, search, city, state, country } = readParams(await searchParams);
  const meta = SCOPE_META[scope];
  if (!meta) notFound();

  // A keyword search goes to the *search endpoints, which accept `search` alone
  // and return an uncapped result set — lib/public-api.js caps it. Everything
  // else uses the paginated listing endpoints with the real location filters.
  const isSearch = Boolean(search);
  const [result, cities] = await Promise.all([
    isSearch
      ? searchExhibitions(scope, search, { limit: PER_PAGE })
      : getExhibitions(scope, { page, limit: PER_PAGE, city, state, country }),
    getUpcomingCities({ max: 14 }),
  ]);

  const filterLabel = [city, state, country].filter(Boolean).join(", ");
  const heading = isSearch
    ? `Exhibitions matching “${search}”`
    : filterLabel
      ? `${meta.heading} in ${filterLabel}`
      : meta.heading;

  const buildHref = (nextPage) => {
    const qs = new URLSearchParams();
    if (scope !== "upcoming") qs.set("scope", scope);
    if (city) qs.set("city", city);
    if (state) qs.set("state", state);
    if (country) qs.set("country", country);
    if (nextPage > 1) qs.set("page", String(nextPage));
    const q = qs.toString();
    return q ? `${PUBLIC_ROUTES.exhibitions}?${q}` : PUBLIC_ROUTES.exhibitions;
  };

  const trail = [
    { name: "Home", path: "/" },
    { name: meta.heading, path: scope === "upcoming" ? PUBLIC_ROUTES.exhibitions : `${PUBLIC_ROUTES.exhibitions}?scope=${scope}` },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        graph={graph(
          breadcrumbNode(trail),
          itemListNode(
            result.items.map((e) => exhibitionPath(e.name, e.id)),
            { name: heading }
          )
        )}
      />

      <Breadcrumbs trail={trail} />

      <header>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          {heading}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          {meta.intro}
        </p>
        {result.total ? (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
            {result.total.toLocaleString("en-US")}{" "}
            {result.total === 1 ? "exhibition" : "exhibitions"}
            {isSearch ? " matched" : " listed"}
          </p>
        ) : null}
      </header>

      <div className="mt-6 max-w-xl">
        <SearchBar />
      </div>

      {/* Scope switcher. Plain links, so each view is a real, shareable URL. */}
      <nav aria-label="Exhibition status" className="mt-6">
        <ul className="flex list-none flex-wrap gap-2">
          {SCOPES.map((s) => {
            const href = s === "upcoming" ? PUBLIC_ROUTES.exhibitions : `${PUBLIC_ROUTES.exhibitions}?scope=${s}`;
            const active = s === scope && !isSearch;
            return (
              <li key={s}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex rounded-lg border px-4 py-2 text-sm font-medium transition motion-reduce:transition-none ${
                    active
                      ? "border-[#131C55] bg-[#131C55] text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-[#131C55]/40 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  {SCOPE_META[s].heading}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* City facets, derived from live inventory rather than a fixed list. */}
      {cities.length && !isSearch ? (
        <nav aria-label="Filter by city" className="mt-4">
          <ul className="flex list-none flex-wrap gap-2">
            {(city || state || country) && (
              <li>
                <Link href={buildHref(1).split("?")[0] + (scope !== "upcoming" ? `?scope=${scope}` : "")} className={chip(false)}>
                  All locations
                </Link>
              </li>
            )}
            {cities.map((c) => {
              const qs = new URLSearchParams();
              if (scope !== "upcoming") qs.set("scope", scope);
              qs.set("city", c.city);
              return (
                <li key={c.city}>
                  <Link
                    href={`${PUBLIC_ROUTES.exhibitions}?${qs.toString()}`}
                    aria-current={c.city === city ? "true" : undefined}
                    className={chip(c.city === city)}
                  >
                    {c.city}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}

      <div className="mt-8">
        {result.items.length ? (
          <ul className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {result.items.map((exhibition, i) => (
              <li key={exhibition.id}>
                <ExhibitionCard exhibition={exhibition} priority={i < 4} className="h-full" />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>
            {isSearch
              ? `No exhibitions matched “${search}”. Try a different name, category, venue or city.`
              : filterLabel
                ? `No ${meta.heading.toLowerCase()} found in ${filterLabel}.`
                : "No exhibitions to show right now. Please try again shortly."}
          </EmptyState>
        )}
      </div>

      {/* The *search endpoints return no pagination, so paging is offered only
          for the listing views, which genuinely support it. */}
      {isSearch ? null : (
        <Pagination page={result.page} totalPages={result.totalPages} buildHref={buildHref} />
      )}
    </div>
  );
}

const chip = (active) =>
  `inline-flex rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition motion-reduce:transition-none ${
    active
      ? "border-[#131C55] bg-[#131C55]/10 text-[#131C55] dark:border-blue-400 dark:bg-blue-400/10 dark:text-blue-300"
      : "border-gray-200 bg-white text-gray-600 hover:border-[#131C55]/40 hover:text-[#131C55] dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-white"
  }`;
