import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2, CalendarDays, Globe2, Landmark, LayoutGrid, MapPin, Ruler } from "lucide-react";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import EmptyState from "@/components/public/EmptyState";
import Pagination from "@/components/public/Pagination";
import CentresMap from "@/components/maps/CentresMap";
import CentresFilters from "@/components/exhibition-centres/CentresFilters";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata, pageMetadata, NOINDEX_FOLLOW } from "@/lib/seo";
import { breadcrumbNode, graph, itemListNode } from "@/lib/jsonld";
import { exhibitionCentrePath } from "@/lib/routes";
import { getExhibitionCentres } from "@/lib/public-api";

/**
 * The exhibition-centre directory: /exhibition-centres
 *
 * Every venue with something to show - an exhibition linked to it, coming up
 * or past, or a description (centreHasListings) - on one map and as a paged
 * grid. Venues with nothing yet are left out here and in the sitemap; their
 * own pages still open, as noindex. A centre's own page has its address, map,
 * details and shows.
 *
 * The whole directory comes back in one cached call (CENTRES_TAG), so search
 * (?q), the country filter (?country), sort (?sort=name) and paging (?page)
 * are applied here on the server. Any filtered or paged view canonicalises to
 * the bare directory and stays out of the index; its links are still followed.
 */
export const revalidate = 3600;

const PER_PAGE = 24;
const TITLE = "Exhibition centres and trade show venues";
const DESCRIPTION =
  "Exhibition centres and trade fair venues with their address, map location and upcoming exhibitions. Find where a trade show is held and how to get there.";

const one = (v) => String(Array.isArray(v) ? v[0] : (v ?? "")).trim();

function readParams(sp) {
  return {
    q: one(sp?.q).slice(0, 80),
    country: one(sp?.country),
    sort: one(sp?.sort) === "name" ? "name" : "upcoming",
    page: Math.max(1, Number(one(sp?.page)) || 1),
  };
}

export async function generateMetadata({ searchParams }) {
  const { q, country, sort, page } = readParams(await searchParams);
  if (q || country || sort !== "upcoming" || page > 1) {
    return pageMetadata({ title: TITLE, description: DESCRIPTION, path: PUBLIC_ROUTES.centres, robots: NOINDEX_FOLLOW });
  }
  const { total } = await getExhibitionCentres();
  const meta = publicPageMetadata({ title: TITLE, description: DESCRIPTION, path: PUBLIC_ROUTES.centres });
  // An empty directory is a thin page: keep it out of the index until it has venues.
  if (!total) meta.robots = { index: false, follow: true };
  return meta;
}

export default async function ExhibitionCentresPage({ searchParams }) {
  const { q, country, sort, page } = readParams(await searchParams);
  const { items } = await getExhibitionCentres();

  const trail = [
    { name: "Home", path: "/" },
    { name: "Exhibition centres", path: PUBLIC_ROUTES.centres },
  ];

  // Countries with the most venues first, then A-Z.
  const counts = new Map();
  for (const c of items) counts.set(c.country || "Other", (counts.get(c.country || "Other") || 0) + 1);
  const countries = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const upcomingTotal = items.reduce((n, c) => n + c.upcomingCount, 0);

  const needle = q.toLowerCase();
  const matches = items
    .filter((c) => !country || (c.country || "Other") === country)
    .filter(
      (c) =>
        !needle ||
        [c.name, c.city, c.state, c.country].some((v) => v && v.toLowerCase().includes(needle))
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : b.upcomingCount - a.upcomingCount || b.pastCount - a.pastCount || a.name.localeCompare(b.name)
    );

  const totalPages = Math.max(1, Math.ceil(matches.length / PER_PAGE));
  if (page > totalPages) notFound();
  const shown = matches.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // The map follows the filters, but shows every match, not just this page.
  const points = matches
    .filter((c) => c.lat !== null && c.lng !== null)
    .map((c) => ({
      id: c.id,
      name: c.name,
      lat: c.lat,
      lng: c.lng,
      href: exhibitionCentrePath(c.slug),
      subtitle: [c.city, c.country].filter(Boolean).join(", "),
    }));

  const buildHref = (p, overrides = {}) => {
    const qs = new URLSearchParams();
    const next = { q, country, sort, page: p, ...overrides };
    if (next.q) qs.set("q", next.q);
    if (next.country) qs.set("country", next.country);
    if (next.sort !== "upcoming") qs.set("sort", next.sort);
    if (next.page > 1) qs.set("page", String(next.page));
    const s = qs.toString();
    return s ? `${PUBLIC_ROUTES.centres}?${s}` : PUBLIC_ROUTES.centres;
  };

  const filtered = Boolean(q || country);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        graph={graph(
          breadcrumbNode(trail),
          shown.length ? itemListNode(shown.map((c) => exhibitionCentrePath(c.slug)), { name: "Exhibition centres" }) : null
        )}
      />
      <Breadcrumbs trail={trail} />

      <header className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-[2.6rem] dark:text-white">
            Exhibition centres
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-gray-600 sm:text-base dark:text-gray-400">
            The venues where trade shows are held. Search by name or city, narrow to a country, and open a venue for its
            address, halls, how to get there and the exhibitions coming up at it.
          </p>
        </div>
        {items.length ? (
          <dl className="grid grid-cols-3 gap-2 sm:gap-3">
            <Stat icon={Building2} label="Venues" value={items.length} />
            <Stat icon={Globe2} label="Countries" value={countries.length} />
            <Stat icon={CalendarDays} label="Upcoming" value={upcomingTotal} />
          </dl>
        ) : null}
      </header>

      {!items.length ? (
        <div className="mt-10">
          <EmptyState>Exhibition centres are being added. Check back soon.</EmptyState>
        </div>
      ) : (
        <>
          <div className="mt-8">
            <CentresFilters q={q} country={country} sort={sort} countries={countries} />
          </div>

          <nav aria-label="Countries" className="mt-4 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <ul className="flex list-none gap-2 pb-1 sm:flex-wrap">
              <li>
                <Chip href={buildHref(1, { country: "" })} active={!country}>
                  All <span className="opacity-70">{items.length}</span>
                </Chip>
              </li>
              {countries.slice(0, 8).map(([name, count]) => (
                <li key={name}>
                  <Chip href={buildHref(1, { country: name })} active={country === name}>
                    {name} <span className="opacity-70">{count}</span>
                  </Chip>
                </li>
              ))}
            </ul>
          </nav>

          {points.length ? (
            <div className="mt-6">
              <CentresMap
                key={`${q}|${country}`}
                points={points}
                className="h-[18rem] sm:h-[22rem]"
                label="Map of the exhibition centres listed below"
              />
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl dark:text-white">
              {country || "All venues"}
              {q ? <span className="font-medium text-gray-500 dark:text-gray-400"> matching “{q}”</span> : null}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {matches.length
                ? `Showing ${(page - 1) * PER_PAGE + 1}–${(page - 1) * PER_PAGE + shown.length} of ${matches.length} ${
                    matches.length === 1 ? "venue" : "venues"
                  }`
                : "No venues"}
            </p>
          </div>

          {shown.length ? (
            <ul className="mt-5 grid list-none gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((c) => (
                <li key={c.id}>
                  <CentreCard centre={c} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5">
              <EmptyState>
                No exhibition centres match {filtered ? "these filters" : "yet"}.{" "}
                {filtered ? (
                  <Link href={PUBLIC_ROUTES.centres} className="font-semibold text-[#2B3FB8] underline dark:text-blue-300">
                    Show all venues
                  </Link>
                ) : null}
              </EmptyState>
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} buildHref={(p) => buildHref(p)} />
        </>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-center sm:min-w-[7.5rem] sm:px-4 dark:border-gray-800 dark:bg-gray-900">
      <dt className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <Icon size={13} aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-extrabold tabular-nums text-[#131C55] dark:text-white">
        {value.toLocaleString("en-US")}
      </dd>
    </div>
  );
}

function Chip({ href, active, children }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={
        active
          ? "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#131C55] px-3.5 text-sm font-semibold text-white dark:bg-blue-500 dark:text-gray-950"
          : "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3.5 text-sm font-medium text-gray-700 transition hover:border-[#131C55]/40 hover:text-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-white"
      }
    >
      {children}
    </Link>
  );
}

function CentreCard({ centre: c }) {
  const place = [c.city, c.state, c.country].filter(Boolean).join(", ");
  const facts = [
    c.halls ? { icon: LayoutGrid, text: `${c.halls} ${c.halls === 1 ? "hall" : "halls"}` } : null,
    c.areaSqm ? { icon: Ruler, text: `${c.areaSqm.toLocaleString("en-US")} m²` } : null,
  ].filter(Boolean);

  return (
    <Link
      href={exhibitionCentrePath(c.slug)}
      className="ox-card group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white hover:border-[#131C55]/30 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
    >
      {/* Most venues have no photo yet: a shorter banner with the city keeps
          the grid from turning into a wall of identical blue blocks. */}
      <div
        className={`relative bg-gradient-to-br from-[#131C55] to-[#2B3FB8] ${c.image ? "aspect-[16/9]" : "aspect-[16/6]"}`}
      >
        {c.image ? (
          <Image
            src={c.image.url}
            alt=""
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 92vw"
            unoptimized={!c.image.optimized}
            className="object-cover"
          />
        ) : (
          <span aria-hidden="true" className="absolute inset-0 flex items-end justify-between gap-3 p-4">
            <span className="line-clamp-1 text-lg font-bold tracking-tight text-white/90">{c.city || c.country}</span>
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-white/85 ring-1 ring-white/20">
              <Landmark size={22} />
            </span>
          </span>
        )}
        {c.upcomingCount ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-[#131C55] shadow-sm">
            <CalendarDays size={13} aria-hidden="true" />
            {c.upcomingCount} upcoming
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-gray-900 group-hover:text-[#2B3FB8] dark:text-gray-50 dark:group-hover:text-blue-200">
          {c.name}
        </h3>
        {place ? (
          <p className="flex items-start gap-1.5 text-sm text-gray-600 dark:text-gray-400">
            <MapPin size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-gray-400" />
            <span className="line-clamp-1">{place}</span>
          </p>
        ) : null}
        {c.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{c.description}</p>
        ) : null}
        {facts.length ? (
          <ul className="flex list-none flex-wrap gap-1.5">
            {facts.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                <Icon size={12} aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-3 text-sm dark:border-gray-800">
          <span className="text-gray-500 dark:text-gray-400">
            {c.pastCount ? `${c.pastCount} past ${c.pastCount === 1 ? "show" : "shows"}` : " "}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-[#131C55] dark:text-blue-200">
            View venue
            <ArrowRight
            size={16}
            aria-hidden="true"
              className="transition group-hover:translate-x-0.5 motion-reduce:transition-none"
            />
          </span>
        </p>
      </div>
    </Link>
  );
}
