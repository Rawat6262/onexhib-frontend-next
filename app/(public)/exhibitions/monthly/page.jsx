import Link from "next/link";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import EmptyState from "@/components/public/EmptyState";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";
import { breadcrumbNode, graph, itemListNode } from "@/lib/jsonld";
import { getMonthlyIndex, MIN_MONTH_EXHIBITIONS, monthSlug } from "@/lib/discovery";

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
  const months = await getMonthlyIndex();
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
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
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
        <ul className="mt-10 grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {months.map((m) => {
            const { year, month } = monthSlug(m.year, m.month);
            const href = `${PUBLIC_ROUTES.exhibitions}/monthly/${year}/${month}`;
            const hasPage = m.count >= MIN_MONTH_EXHIBITIONS;
            const share = busiest?.count ? Math.round((m.count / busiest.count) * 100) : 0;

            const body = (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-base font-semibold text-gray-900 dark:text-gray-50">
                    {m.label}
                  </span>
                  <span className="text-sm tabular-nums text-gray-500 dark:text-gray-400">
                    {m.count.toLocaleString("en-US")}
                  </span>
                </div>
                {/* Proportional bar, purely decorative - the number above is the
                    accessible value, so this is hidden from assistive tech. */}
                <div
                  aria-hidden="true"
                  className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
                >
                  <div
                    className="h-full rounded-full bg-[#131C55] dark:bg-blue-400"
                    style={{ width: `${Math.max(share, 3)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                  {m.count === 1 ? "1 exhibition" : `${m.count} exhibitions`}
                  {hasPage ? "" : " — too few for its own page yet"}
                </p>
              </>
            );

            return (
              <li key={`${m.year}-${m.month}`}>
                {hasPage ? (
                  <Link
                    href={href}
                    className="ox-card block rounded-2xl border border-gray-200 bg-white p-4 hover:border-[#131C55]/30 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-600"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
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
