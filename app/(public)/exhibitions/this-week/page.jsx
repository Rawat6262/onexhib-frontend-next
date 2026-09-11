import Link from "next/link";
import { CalendarDays } from "lucide-react";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import ExhibitionCard from "@/components/public/ExhibitionCard";
import EmptyState from "@/components/public/EmptyState";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata, pageMetadata, NOINDEX_FOLLOW } from "@/lib/seo";
import { breadcrumbNode, graph, itemListNode } from "@/lib/jsonld";
import { exhibitionPath } from "@/lib/routes";
import { currentWeekRange, getThisWeekExhibitions } from "@/lib/discovery";
import { formatDateRange } from "@/lib/format";

/**
 * /exhibitions/this-week — what is open, or opening, in the current week.
 *
 * WHY THIS EARNS A PAGE
 * "exhibitions this week" is a real query with a real answer, and it is the one
 * view the scope pages cannot give: /exhibitions?scope=ongoing shows everything
 * running today with no sense of the week ahead, and ?scope=upcoming stretches
 * to next year. This is a genuine slice, not a filter permutation of one.
 *
 * INDEXING
 * Indexable only while it holds something. An empty week is a thin page and is
 * marked noindex,follow, and app/sitemap.js omits the route when the week is
 * empty — the same rule the blog hub already follows when it has no posts.
 *
 * The week boundary is computed in UTC (lib/discovery.js) so the page does not
 * change identity with the visitor's timezone, and ISR keeps it consistent for
 * everyone between revalidations.
 */

// Recomputed hourly: the week's contents shift as events open and close, and a
// stale "this week" is worse than a slightly cold listing elsewhere.
export const revalidate = 3600;

const TITLE = "Exhibitions this week";
const DESCRIPTION =
  "Exhibitions and trade shows running this week worldwide, with dates, venues and locations. See what is open to visitors right now.";

function weekLabel({ start, end }) {
  const last = new Date(end);
  last.setUTCDate(last.getUTCDate() - 1); // half-open range -> inclusive label
  return formatDateRange(start.toISOString(), last.toISOString());
}

export async function generateMetadata() {
  const items = await getThisWeekExhibitions();
  const path = `${PUBLIC_ROUTES.exhibitions}/this-week`;

  // Nothing on this week is a legitimate outcome, not an error - but it is not
  // a page worth indexing either.
  if (!items.length) {
    return pageMetadata({ title: TITLE, description: DESCRIPTION, path, robots: NOINDEX_FOLLOW });
  }

  return publicPageMetadata({
    title: TITLE,
    description: `${items.length} exhibitions and trade shows are running this week worldwide, ${weekLabel(currentWeekRange())}. See dates, venues and locations.`.slice(0, 158),
    path,
  });
}

export default async function ThisWeekPage() {
  const range = currentWeekRange();
  const items = await getThisWeekExhibitions();

  const trail = [
    { name: "Home", path: "/" },
    { name: "Upcoming exhibitions", path: PUBLIC_ROUTES.exhibitions },
    { name: "This week", path: `${PUBLIC_ROUTES.exhibitions}/this-week` },
  ];

  // Grouped by start day so the week reads as a schedule rather than a wall of
  // cards. Events already running when the week began are collected first.
  const today = new Date();
  const groups = new Map();
  for (const item of items) {
    const key = String(item.startDate).slice(0, 10);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        graph={graph(
          breadcrumbNode(trail),
          items.length
            ? itemListNode(
                items.map((e) => exhibitionPath(e.name, e.id)),
                { name: TITLE }
              )
            : null
        )}
      />

      <Breadcrumbs trail={trail} />

      <header>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          {TITLE}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          Exhibitions and trade shows opening between {weekLabel(range)}. Dates are the organiser&apos;s
          own, and every listing links through to full venue and category details.
        </p>
        {items.length ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500">
            <CalendarDays size={15} aria-hidden="true" className="shrink-0" />
            {items.length.toLocaleString("en-US")} {items.length === 1 ? "exhibition" : "exhibitions"} this week
          </p>
        ) : null}
      </header>

      {items.length ? (
        <div className="mt-10 space-y-10">
          {[...groups.entries()].map(([day, dayItems]) => {
            const date = new Date(day);
            const isToday = day === today.toISOString().slice(0, 10);
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
                  {isToday ? (
                    <span className="rounded-full bg-[#131C55] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                      Today
                    </span>
                  ) : null}
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
      ) : (
        <div className="mt-10">
          <EmptyState>
            No exhibitions are listed as opening this week. Browse{" "}
            <Link href={PUBLIC_ROUTES.exhibitions} className="font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300">
              all upcoming exhibitions
            </Link>{" "}
            instead.
          </EmptyState>
        </div>
      )}

      <nav aria-label="Related views" className="mt-12 flex flex-wrap gap-3">
        <Link
          href={PUBLIC_ROUTES.exhibitions}
          className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-[#131C55] hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-300 dark:hover:text-blue-300"
        >
          All upcoming exhibitions
        </Link>
        <Link
          href={`${PUBLIC_ROUTES.exhibitions}/monthly`}
          className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-[#131C55] hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-300 dark:hover:text-blue-300"
        >
          Browse by month
        </Link>
        <Link
          href={`${PUBLIC_ROUTES.exhibitions}?scope=ongoing`}
          className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-[#131C55] hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-300 dark:hover:text-blue-300"
        >
          Happening now
        </Link>
      </nav>
    </div>
  );
}
