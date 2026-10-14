import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { getPageNumbers } from "@/lib/paginate";
import PageJump from "@/components/public/PageJump";

/**
 * Server-rendered pagination for the public listings.
 *
 * Real <a> elements with real hrefs, so a crawler can walk every page of a
 * listing and a visitor can open one in a new tab. rel="prev"/"next" mark the
 * sequence. The page links need no client JavaScript.
 *
 * Same look as the dashboard's TablePagination (components/dashboard) so the
 * site has one pager: a grouped strip with first/prev, a window of numbers,
 * next/last, and "Go to page" for long listings. There is no rows-per-page
 * control here: page size is a server decision on these routes, and a second
 * size would split every listing into two sets of crawlable URLs.
 *
 * "Go to" is the one client island (PageJump). A function cannot cross the
 * server/client boundary, so it receives buildHref's OUTPUT for a sentinel page
 * number and substitutes into that — the URL it navigates to is exactly the
 * one a numbered link would have used.
 *
 * `buildHref(page)` is supplied by the page so existing filters survive paging.
 */
const SENTINEL = 987654321;

export default function Pagination({ page, totalPages, buildHref }) {
  if (!totalPages || totalPages <= 1) return null;

  const pages = getPageNumbers(page, totalPages);
  const atStart = page <= 1;
  const atEnd = page >= totalPages;

  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-col items-center gap-3">
      {/* ---- Phone: prev / page x of y / next ------------------------------ */}
      <div className="flex w-full max-w-sm items-center justify-between gap-3 sm:hidden">
        <EdgeLink href={atStart ? null : buildHref(page - 1)} rel="prev" wide>
          <ChevronLeft size={16} aria-hidden="true" />
          Prev
        </EdgeLink>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Page <span className="font-semibold text-gray-900 dark:text-gray-100">{page}</span> of{" "}
          {totalPages.toLocaleString()}
        </span>
        <EdgeLink href={atEnd ? null : buildHref(page + 1)} rel="next" wide>
          Next
          <ChevronRight size={16} aria-hidden="true" />
        </EdgeLink>
      </div>

      {/* ---- Tablet and up ------------------------------------------------- */}
      <div className="hidden flex-wrap items-center justify-center gap-3 sm:flex">
        <ul className="flex list-none items-center gap-1 rounded-xl border border-gray-200 bg-gray-50/80 p-1 dark:border-gray-800 dark:bg-gray-900/60">
          <li>
            <EdgeLink href={atStart ? null : buildHref(1)} label="First page">
              <ChevronsLeft size={16} aria-hidden="true" />
            </EdgeLink>
          </li>
          <li>
            <EdgeLink href={atStart ? null : buildHref(page - 1)} rel="prev" label="Previous page">
              <ChevronLeft size={16} aria-hidden="true" />
            </EdgeLink>
          </li>

          {pages.map((p, i) =>
            p === "..." ? (
              // eslint-disable-next-line react/no-array-index-key -- ellipses are positional
              <li
                key={`gap-${i}`}
                aria-hidden="true"
                className="flex h-8 w-6 items-center justify-center text-sm text-gray-400 dark:text-gray-500"
              >
                …
              </li>
            ) : (
              <li key={p}>
                <Link
                  href={buildHref(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? "page" : undefined}
                  className={p === page ? numActive : num}
                >
                  {p.toLocaleString()}
                </Link>
              </li>
            )
          )}

          <li>
            <EdgeLink href={atEnd ? null : buildHref(page + 1)} rel="next" label="Next page">
              <ChevronRight size={16} aria-hidden="true" />
            </EdgeLink>
          </li>
          <li>
            <EdgeLink href={atEnd ? null : buildHref(totalPages)} label="Last page">
              <ChevronsRight size={16} aria-hidden="true" />
            </EdgeLink>
          </li>
        </ul>

        {totalPages > 7 ? (
          <PageJump
            key={page}
            current={page}
            totalPages={totalPages}
            firstHref={buildHref(1)}
            template={buildHref(SENTINEL)}
            sentinel={String(SENTINEL)}
          />
        ) : null}
      </div>
    </nav>
  );
}

/** A prev/next/first/last control: a real link, or an inert span at the edge. */
function EdgeLink({ href, rel, label, wide = false, children }) {
  const cls = wide ? wideBtn : num;
  if (!href) {
    return (
      <span aria-disabled="true" aria-label={label} className={`${cls} pointer-events-none opacity-35`}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} rel={rel} aria-label={label} title={label} className={cls}>
      {children}
    </Link>
  );
}

const num =
  "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium text-gray-600 transition hover:bg-white hover:text-[#131C55] hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white";

const numActive =
  "flex h-8 min-w-8 items-center justify-center rounded-lg bg-[#131C55] px-2 text-sm font-semibold text-white shadow-sm dark:bg-blue-500 dark:text-gray-950";

const wideBtn =
  "inline-flex h-9 items-center gap-1 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 transition hover:border-[#131C55] hover:text-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:text-white";
