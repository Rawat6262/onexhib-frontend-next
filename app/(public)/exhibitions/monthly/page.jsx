import Link from "next/link";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import EmptyState from "@/components/public/EmptyState";
import CalendarExplorer from "@/components/public/CalendarExplorer";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";
import { breadcrumbNode, graph, itemListNode } from "@/lib/jsonld";
import { getCalendarEvents, getMonthlyIndex, MIN_MONTH_EXHIBITIONS, monthSlug } from "@/lib/discovery";

/**
 * /exhibitions/monthly — the calendar hub.
 *
 * Lists every upcoming month the catalogue actually reaches, and links only the
 * ones substantial enough to have their own page. A month below the threshold
 * is still shown, with its count, because knowing May 2027 currently holds four
 * events is useful information — it just does not justify a URL of its own.
 *
 * That distinction is the whole point: the backend could generate a page for
 * any month/year pair, which would produce an unbounded set of near-empty
 * doorway pages. See MIN_MONTH_EXHIBITIONS in lib/discovery.js.
 */

export const revalidate = 3600;

const TITLE = "Exhibition calendar by month";
const DESCRIPTION =
  "Browse upcoming exhibitions and trade shows month by month, with the number of events scheduled in each and links to every listing.";

export const metadata = publicPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: `${PUBLIC_ROUTES.exhibitions}/monthly`,
});

export default async function MonthlyHubPage() {
  // The calendar's events come from the same cached walk as the month index.
  const [months, calendar] = await Promise.all([getMonthlyIndex(), getCalendarEvents()]);
  const today = new Date().toISOString().slice(0, 10);
  const linkable = months.filter((m) => m.count >= MIN_MONTH_EXHIBITIONS);

  const trail = [
    { name: "Home", path: "/" },
    { name: "Upcoming exhibitions", path: PUBLIC_ROUTES.exhibitions },
    { name: "By month", path: `${PUBLIC_ROUTES.exhibitions}/monthly` },
  ];

  const total = months.reduce((sum, m) => sum + m.count, 0);
  const busiest = [...months].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        graph={graph(
          breadcrumbNode(trail),
          linkable.length
            ? itemListNode(
                linkable.map((m) => {
                  const { year, month } = monthSlug(m.year, m.month);
                  return `${PUBLIC_ROUTES.exhibitions}/monthly/${year}/${month}`;
                }),
                { name: TITLE }
              )
            : null
        )}
      />

      <Breadcrumbs trail={trail} />

      <header>
        <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-[2.6rem] dark:text-white">
          {TITLE}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          Exhibition seasons are not evenly spread. Below is every month the catalogue currently
          reaches, with the number of events scheduled to open in each.
          {busiest ? ` ${busiest.label} is the busiest, with ${busiest.count}.` : ""}
        </p>
        {total ? (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
            {total.toLocaleString("en-US")} exhibitions across {months.length}{" "}
            {months.length === 1 ? "month" : "months"}
          </p>
        ) : null}
      </header>

      {months.length ? (
        // Unfiltered, this renders the same month list and links as before; the
        // filters, timeline and charts are layered on top in the browser.
        <CalendarExplorer
          data={calendar}
          months={months.map((m) => ({ year: m.year, month: m.month, count: m.count }))}
          today={today}
          minForPage={MIN_MONTH_EXHIBITIONS}
        />
      ) : (
        <div className="mt-10">
          <EmptyState>
            No upcoming exhibitions are currently scheduled. Browse{" "}
            <Link
              href={PUBLIC_ROUTES.exhibitions}
              className="font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300"
            >
              all exhibitions
            </Link>{" "}
            instead.
          </EmptyState>
        </div>
      )}

      <nav aria-label="Related views" className="mt-12 flex flex-wrap gap-3">
        <Link
          href={`${PUBLIC_ROUTES.exhibitions}/this-week`}
          className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-[#131C55] hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-300 dark:hover:text-blue-300"
        >
          This week
        </Link>
        <Link
          href={PUBLIC_ROUTES.locations}
          className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-[#131C55] hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-300 dark:hover:text-blue-300"
        >
          Browse by country
        </Link>
      </nav>
    </div>
  );
}
