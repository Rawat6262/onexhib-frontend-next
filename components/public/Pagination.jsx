import Link from "next/link";
import { getPageNumbers } from "@/lib/paginate";

/**
 * Server-rendered pagination.
 *
 * Real <a> elements with real hrefs, so a crawler can walk every page of a
 * listing and a visitor can open one in a new tab. rel="prev"/"next" mark the
 * sequence. No client JavaScript.
 *
 * `buildHref(page)` is supplied by the page so existing filters survive paging.
 */
export default function Pagination({ page, totalPages, buildHref }) {
  if (!totalPages || totalPages <= 1) return null;

  const pages = getPageNumbers(page, totalPages);

  return (
    <nav aria-label="Pagination" className="mt-10 flex justify-center">
      <ul className="flex list-none flex-wrap items-center gap-1.5">
        <li>
          {page > 1 ? (
            <Link href={buildHref(page - 1)} rel="prev" className={linkClass(false)}>
              Previous
            </Link>
          ) : (
            <span className={disabledClass()}>Previous</span>
          )}
        </li>

        {pages.map((p, i) =>
          p === "..." ? (
            // eslint-disable-next-line react/no-array-index-key -- ellipses are positional
            <li key={`gap-${i}`} className="px-2 text-sm text-gray-400">
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                href={buildHref(p)}
                aria-current={p === page ? "page" : undefined}
                className={linkClass(p === page)}
              >
                {p}
              </Link>
            </li>
          )
        )}

        <li>
          {page < totalPages ? (
            <Link href={buildHref(page + 1)} rel="next" className={linkClass(false)}>
              Next
            </Link>
          ) : (
            <span className={disabledClass()}>Next</span>
          )}
        </li>
      </ul>
    </nav>
  );
}

const base =
  "inline-flex min-w-9 items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition motion-reduce:transition-none";

const linkClass = (active) =>
  active
    ? `${base} border-[#131C55] bg-[#131C55] text-white`
    : `${base} border-gray-200 bg-white text-gray-700 hover:border-[#131C55]/40 hover:text-[#131C55] dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-white`;

const disabledClass = () =>
  `${base} cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-700`;
