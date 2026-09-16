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
import { cityLandingPath, countryLandingPath, exhibitionPath } from "@/lib/routes";
import { resolvePlaceLinks } from "@/lib/locations";
import {
  getExhibitions,
  getUpcomingCities,
  searchAllScopes,
  searchExhibitions,
} from "@/lib/public-api";
import { ALL_SCOPE, SCOPE_KEYS, resolveScope } from "@/lib/exhibition-scopes";

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
      "An archive of exhibitions and trade shows that have already taken place, with their dates, venues and locations — useful when researching an event.",
    intro: "Exhibitions that have already taken place, most recent first.",
  },
  [ALL_SCOPE]: {
    title: "Search all exhibitions and trade shows",
    heading: "All exhibitions",
    description:
      "Search every exhibition and trade show we list — happening now, still to come, and already held — by name, category, venue or city.",
    intro: "Every exhibition we list: happening now, still to come, and already held.",
  },
};

const SCOPES = SCOPE_KEYS;
const PER_PAGE = 24;

function readParams(searchParams) {
  const raw = (key) => {
    const v = searchParams?.[key];
    return (Array.isArray(v) ? v[0] : v) || "";
  };
  const search = raw("search").trim().slice(0, 100);
  const page = Math.max(1, Number(raw("page")) || 1);

  return {
    // `all` is a search-only scope — see resolveScope for why it falls back.
    scope: resolveScope(raw("scope"), search),
    page,
    search,
    city: raw("city").trim(),
    state: raw("state").trim(),
    country: raw("country").trim(),
  };
}

export async function generateMetadata({ searchParams }) {
  const { scope, search, city, country, page } = readParams(await searchParams);
  const meta = SCOPE_META[scope];
  // `all` only ever appears alongside a search, which is noindex below anyway;
  // it canonicalises to the real /exhibitions page rather than to a search URL.
  const canonical =
    scope === "upcoming" || scope === ALL_SCOPE
      ? PUBLIC_ROUTES.exhibitions
      : `${PUBLIC_ROUTES.exhibitions}?scope=${scope}`;

  // A filtered, searched or paged view is kept out of the index while its
  // links stay followable.
  //
  // WHERE ITS CANONICAL POINTS was the weak part of this and is now fixed. A
  // city filter used to canonicalise to the unfiltered /exhibitions — a
  // different page with different content, which is the "canonicalising
  // unrelated pages together" mistake and something Google is entitled to
  // ignore. When a city or country has a real landing page, the filter now
  // points there instead: same place, same records, an actual duplicate. Only
  // the long tail with no landing page still falls back to the scope.
  if (search || city || country || page > 1) {
    const label = search
      ? `Exhibitions matching “${search}”`
      : city || country
        ? `Exhibitions in ${city || country}`
        : `${meta.heading} — page ${page}`;

    let target = canonical;
    if (!search && (city || country)) {
      const links = await resolvePlaceLinks({ country, city });
      if (links.citySlug) target = cityLandingPath(links.countrySlug, links.citySlug);
      else if (links.countrySlug && !city) target = countryLandingPath(links.countrySlug);
    }

    return pageMetadata({
      title: label,
      description: meta.description,
      path: target,
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

  // WHEN A SCOPED SEARCH FINDS NOTHING, SAY WHERE THE MATCHES ACTUALLY ARE.
  //
  // This is the other half of the scope bug. Searching "micam" on the Upcoming
  // tab correctly returns nothing — the show has already happened — but a bare
  // "no exhibitions matched" reads as "this site does not have it", which is
  // wrong and is exactly what made the old behaviour look broken.
  //
  // The extra fan-out costs three requests and only ever runs on a search that
  // came back empty, so the common path is untouched.
  let foundElsewhere = [];
  if (isSearch && scope !== ALL_SCOPE && !result.items.length) {
    const everywhere = await searchAllScopes(search, { limit: PER_PAGE });
    foundElsewhere = SCOPES.filter((s) => s !== scope && (everywhere.byScope?.[s] || 0) > 0).map(
      (s) => ({ scope: s, total: everywhere.byScope[s] })
    );
  }

  // A page number past the end used to return 200 with an empty grid, which
  // Search Console reports as a soft 404 and which wastes crawl budget on URLs
  // that hold nothing. An out-of-range page is a 404.
  if (page > 1 && !isSearch && !result.items.length) notFound();

  const filterLabel = [city, state, country].filter(Boolean).join(", ");
  const heading = isSearch
    ? scope === ALL_SCOPE
      ? `Exhibitions matching “${search}”`
      : `${meta.heading} matching “${search}”`
    : filterLabel
      ? `${meta.heading} in ${filterLabel}`
      : meta.heading;

  // Scope links keep the current query, so switching tab re-runs the same
  // search somewhere else instead of throwing the term away. The scope is
  // always explicit on a search URL — relying on "no scope means upcoming"
  // is what hid the bug in the first place.
  const scopeHref = (s) => {
    const qs = new URLSearchParams();
    if (s !== "upcoming" || search) qs.set("scope", s);
    if (search) qs.set("search", search);
    else {
      if (city) qs.set("city", city);
      if (state) qs.set("state", state);
      if (country) qs.set("country", country);
    }
    const q = qs.toString();
    return q ? `${PUBLIC_ROUTES.exhibitions}?${q}` : PUBLIC_ROUTES.exhibitions;
  };

  // "All" is offered only while searching — there is no combined listing to
  // browse, so an All tab on an unsearched page would lead nowhere useful.
  const tabScopes = isSearch ? [...SCOPES, ALL_SCOPE] : SCOPES;

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
        <SearchBar scope={scope} />
      </div>

      {/* Scope switcher. Plain links, so each view is a real, shareable URL.
          The active tab stays lit during a search, because a search now
          happens WITHIN a scope rather than replacing it. */}
      <nav aria-label="Exhibition status" className="mt-6">
        <ul className="flex list-none flex-wrap gap-2">
          {tabScopes.map((s) => {
            const active = s === scope;
            // Per-scope counts are shown only for an all-scopes search, where
            // they were already fetched. Never a fabricated number.
            const count = scope === ALL_SCOPE && s !== ALL_SCOPE ? result.byScope?.[s] : undefined;
            return (
              <li key={s}>
                <Link
                  href={scopeHref(s)}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition motion-reduce:transition-none ${
                    active
                      ? "border-[#131C55] bg-[#131C55] text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-[#131C55]/40 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  {SCOPE_META[s].heading}
                  {typeof count === "number" ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                        active
                          ? "bg-white/20 text-white"
                          : count > 0
                            ? "bg-[#131C55]/10 text-[#131C55] dark:bg-blue-400/15 dark:text-blue-300"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                      }`}
                    >
                      {count.toLocaleString("en-US")}
                    </span>
                  ) : null}
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
              ? foundElsewhere.length
                ? `No ${meta.heading.toLowerCase()} matched “${search}” — but it does appear elsewhere.`
                : `No exhibitions matched “${search}”. Try a different name, category, venue or city.`
              : filterLabel
                ? `No ${meta.heading.toLowerCase()} found in ${filterLabel}.`
                : "No exhibitions to show right now. Please try again shortly."}
          </EmptyState>
        )}

        {/* The recovery path: the term DID match, just not in this scope. */}
        {foundElsewhere.length ? (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              “{search}” was found in:
            </p>
            <ul className="mt-3 flex list-none flex-wrap gap-2">
              {foundElsewhere.map(({ scope: s, total }) => (
                <li key={s}>
                  <Link href={scopeHref(s)} className={chip(false)}>
                    {SCOPE_META[s].heading}
                    <span className="ml-1.5 tabular-nums text-gray-400">
                      {total.toLocaleString("en-US")}
                    </span>
                  </Link>
                </li>
              ))}
              <li>
                <Link href={scopeHref(ALL_SCOPE)} className={chip(false)}>
                  Search all exhibitions
                </Link>
              </li>
            </ul>
          </div>
        ) : null}
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
