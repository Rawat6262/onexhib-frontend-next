import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import ExhibitionCard from "@/components/public/ExhibitionCard";
import Pagination from "@/components/public/Pagination";
import JsonLd from "@/components/seo/JsonLd";

import { NOINDEX_FOLLOW, PUBLIC_ROUTES, pageMetadata, publicPageMetadata } from "@/lib/seo";
import { breadcrumbNode, graph, itemListNode } from "@/lib/jsonld";
import { exhibitionPath } from "@/lib/routes";
import {
  MIN_MONTH_EXHIBITIONS,
  getIndexableMonths,
  getMonthExhibitions,
  monthLabel,
  monthSlug,
} from "@/lib/discovery";

/**
 * /exhibitions/monthly/2027/03 — one month of the calendar.
 *
 * WHICH MONTHS ARE PAGES
 * - Outside the window parseParams allows (one year back, two ahead), or a
 *   month with no shows at all: 404. That keeps crawlers from walking an
 *   unbounded set of empty URLs (/monthly/2031/07 and the rest).
 * - At least MIN_MONTH_EXHIBITIONS shows: a normal, indexable page. The same
 *   threshold governs the sitemap.
 * - Fewer than that: still rendered for anyone who follows a link, but
 *   noindex - too thin to be a search result.
 *
 * PAST MONTHS STAY UP
 * These used to count only upcoming and ongoing shows, so a month emptied
 * itself as its shows ended and turned into a 404 - after Google had already
 * indexed it (Search Console: /exhibitions/monthly/2026/09). A month that has
 * started now includes the shows that already closed, and reads in the past
 * tense once it is over.
 *
 * PAGED, PER_PAGE TO A PAGE (?page=2)
 * A busy month is hundreds of shows: October 2026 rendered 811 cards in one
 * response, 7.2 MB of HTML. Pages follow the location pages' rules: page 1 is
 * the indexable page and the canonical for every page; page 2+ is noindex,
 * follow (every show on it is still reachable and in the sitemap); a page past
 * the end is a 404. Day headings repeat on the page a day continues onto.
 *
 * Rendered on demand, not prerendered: a route that reads searchParams cannot
 * be statically generated, and pairing it with generateStaticParams built a
 * site that 500s in production (see app/(public)/exhibitions-in/[country]).
 * The month's data underneath is still ISR-cached by its fetches, so a request
 * is a cache read and a render of PER_PAGE cards.
 */

export const revalidate = 3600;

const PER_PAGE = 60;

const readPage = (sp) => {
  const v = sp?.page;
  return Math.max(1, Math.floor(Number(Array.isArray(v) ? v[0] : v)) || 1);
};

function parseParams(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return null;
  // A realistic window, not 2000-2100: with dynamicParams on, every accepted pair
  // can reach the backend, so a crawler walking /monthly/2093/07 and the rest
  // must 404 here without a fetch. One year back to two ahead covers everything
  // the calendar links to (MONTHS_AHEAD in lib/discovery.js is 14).
  const now = new Date();
  const index = y * 12 + (m - 1);
  const current = now.getUTCFullYear() * 12 + now.getUTCMonth();
  if (index < current - 12 || index > current + 24) return null;
  return { year: y, month: m };
}

/** True once the whole month is behind us (UTC). */
function isPastMonth({ year, month }, now = new Date()) {
  return Date.UTC(year, month, 1) <= now.getTime();
}

export async function generateMetadata({ params, searchParams }) {
  const { year, month } = await params;
  const page = readPage(await searchParams);
  const parsed = parseParams(year, month);
  if (!parsed) return { title: "Month not found", robots: { index: false, follow: true } };

  const label = monthLabel(parsed.year, parsed.month);
  const items = await getMonthExhibitions(parsed.year, parsed.month);
  const slug = monthSlug(parsed.year, parsed.month);
  const verb = isPastMonth(parsed) ? "took place" : "open";

  const meta = {
    title: `Exhibitions in ${label}`,
    description:
      `${items.length} exhibitions and trade shows ${verb} in ${label}, worldwide. See dates, venues, cities and categories for every event.`.slice(
        0,
        158
      ),
    path: `${PUBLIC_ROUTES.exhibitions}/monthly/${slug.year}/${slug.month}`,
  };
  if (page > 1) {
    return pageMetadata({ ...meta, title: `Exhibitions in ${label} — page ${page}`, robots: NOINDEX_FOLLOW });
  }
  return items.length >= MIN_MONTH_EXHIBITIONS
    ? publicPageMetadata(meta)
    : pageMetadata({ ...meta, robots: NOINDEX_FOLLOW });
}

export default async function MonthPage({ params, searchParams }) {
  const { year, month } = await params;
  const parsed = parseParams(year, month);
  if (!parsed) notFound();
  const page = readPage(await searchParams);

  const items = await getMonthExhibitions(parsed.year, parsed.month);

  // Nothing at all: a 404. A thin month still renders (noindex - see metadata).
  if (items.length === 0) notFound();
  const totalPages = Math.ceil(items.length / PER_PAGE);
  // Past the last page: a 404, not an empty 200 a crawler would keep.
  if (page > totalPages) notFound();
  const pageItems = items.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const past = isPastMonth(parsed);

  const label = monthLabel(parsed.year, parsed.month);
  const slug = monthSlug(parsed.year, parsed.month);
  const here = `${PUBLIC_ROUTES.exhibitions}/monthly/${slug.year}/${slug.month}`;

  const trail = [
    { name: "Home", path: "/" },
    { name: "Upcoming exhibitions", path: PUBLIC_ROUTES.exhibitions },
    { name: "By month", path: `${PUBLIC_ROUTES.exhibitions}/monthly` },
    { name: label, path: here },
  ];

  // Neighbouring months, but only linked when they are real pages.
  const indexable = await getIndexableMonths();
  const position = indexable.findIndex((m) => m.year === parsed.year && m.month === parsed.month);
  const prev = position > 0 ? indexable[position - 1] : null;
  const next = position >= 0 && position < indexable.length - 1 ? indexable[position + 1] : null;
  const monthHref = (m) => {
    const s = monthSlug(m.year, m.month);
    return `${PUBLIC_ROUTES.exhibitions}/monthly/${s.year}/${s.month}`;
  };

  // Grouped by start day, so a busy month reads as a schedule.
  const groups = new Map();
  for (const item of pageItems) {
    const key = String(item.startDate).slice(0, 10);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const countries = [...new Set(items.map((e) => e.country).filter(Boolean))];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        graph={graph(
          breadcrumbNode(trail),
          itemListNode(
            pageItems.map((e) => exhibitionPath(e.name, e.id)),
            { name: `Exhibitions in ${label}` }
          )
        )}
      />

      <Breadcrumbs trail={trail} />

      <header>
        <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-[2.6rem] dark:text-white">
          Exhibitions in {label}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          {items.length.toLocaleString("en-US")}{" "}
          {items.length === 1 ? "exhibition or trade show" : "exhibitions and trade shows"}{" "}
          {past ? "took place" : "open"} in {label}
          {countries.length > 1 ? ` across ${countries.length} countries` : ""}. Listings are ordered
          by opening date.
          {totalPages > 1
            ? ` Showing ${((page - 1) * PER_PAGE + 1).toLocaleString("en-US")}–${((page - 1) * PER_PAGE + pageItems.length).toLocaleString("en-US")}, page ${page} of ${totalPages}.`
            : ""}
        </p>
      </header>

      {past ? (
        <p className="mt-5 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200">
          This month has passed.
          <Link
            href={`${PUBLIC_ROUTES.exhibitions}/monthly`}
            className="font-semibold underline underline-offset-4 hover:no-underline"
          >
            See upcoming months
          </Link>
        </p>
      ) : null}

      <div className="mt-10 space-y-10">
        {[...groups.entries()].map(([day, dayItems]) => {
          const date = new Date(day);
          return (
            <section key={day} aria-labelledby={`day-${day}`}>
              <h2
                id={`day-${day}`}
                className="flex items-baseline gap-3 border-b border-gray-200 pb-2 text-lg font-semibold text-gray-900 dark:border-gray-800 dark:text-gray-50"
              >
                <time dateTime={day}>
                  {date.toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    timeZone: "UTC",
                  })}
                </time>
                <span className="text-sm font-normal text-gray-500 dark:text-gray-500">
                  {dayItems.length} {dayItems.length === 1 ? "event" : "events"}
                </span>
              </h2>
              <ul className="mt-4 grid list-none grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {dayItems.map((e) => (
                  <li key={e.id}>
                    <ExhibitionCard exhibition={e} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <Pagination page={page} totalPages={totalPages} buildHref={(p) => (p > 1 ? `${here}?page=${p}` : here)} />

      <nav
        aria-label="Nearby months"
        className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-6 dark:border-gray-800"
      >
        {prev ? (
          <Link
            href={monthHref(prev)}
            rel="prev"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#131C55] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:text-blue-300"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            {prev.label}
          </Link>
        ) : (
          <span />
        )}
        <Link
          href={`${PUBLIC_ROUTES.exhibitions}/monthly`}
          className="text-sm font-medium text-gray-600 underline-offset-4 hover:underline dark:text-gray-400"
        >
          All months
        </Link>
        {next ? (
          <Link
            href={monthHref(next)}
            rel="next"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#131C55] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:text-blue-300"
          >
            {next.label}
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
