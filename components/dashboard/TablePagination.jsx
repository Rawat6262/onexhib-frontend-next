"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { getPageNumbers } from "@/lib/paginate";

/**
 * The footer pager for the signed-in dashboard tables (My exhibitions, My services).
 *
 * WHY THIS EXISTS. My services rendered one button per page, so 875 providers at
 * five a row became a 175-button wall that wrapped seven lines deep. This keeps the
 * control a fixed size whatever the total:
 *  - a WINDOW of page numbers with ellipses (the shared getPageNumbers), never all of them;
 *  - first/last jumps, because the window alone makes page 175 three clicks away;
 *  - "Go to page", for the case the window cannot serve: a known page far away;
 *  - a rows-per-page choice, since five rows a page is what created 175 pages.
 *
 * Below `sm` it collapses to Previous / "Page x of y" / Next. Numbered buttons at
 * phone width either wrap or shrink below a usable tap target.
 *
 * Controlled: the parent owns `page` and `pageSize` and slices its own data.
 *
 * SERVER-PAGED TABLES (the admin lists) fetch one page at a time, so two optional
 * props let them describe what they actually have:
 *  - `totalPages`: the server's own count, used instead of ceil(total / pageSize).
 *  - `shownCount`: rows on screen this page. Their search filters only the loaded
 *    page, so "Showing 51–100" would overstate a page the search has thinned.
 */
export default function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 25, 50],
  itemLabel = "results",
  totalPages: serverTotalPages,
  shownCount,
}) {
  const totalPages = Math.max(1, serverTotalPages || Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const offset = (current - 1) * pageSize;
  const onPage = shownCount ?? Math.max(0, Math.min(pageSize, total - offset));
  const from = onPage === 0 ? 0 : offset + 1;
  const to = offset + onPage;

  const go = (next) => {
    const clamped = Math.min(Math.max(1, next), totalPages);
    if (clamped !== current) onPageChange(clamped);
  };

  const atStart = current <= 1;
  const atEnd = current >= totalPages;

  return (
    <div className="flex flex-col gap-4 border-t border-gray-200 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between dark:border-gray-800">
      {/* ---- Summary + rows per page ------------------------------------ */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 lg:justify-start">
        <p className="text-[13px] text-gray-500 dark:text-gray-400" aria-live="polite">
          Showing{" "}
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            {from.toLocaleString()}–{to.toLocaleString()}
          </span>{" "}
          of <span className="font-semibold text-gray-800 dark:text-gray-200">{total.toLocaleString()}</span>{" "}
          {itemLabel}
        </p>

        {onPageSizeChange ? (
          <label className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400">
            Rows per page
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 cursor-pointer rounded-lg border border-gray-300 bg-white pr-7 pl-2.5 text-sm font-medium text-gray-800 transition hover:border-gray-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-500"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {totalPages > 1 ? (
        <>
          {/* ---- Phone: prev / page x of y / next --------------------- */}
          <div className="flex items-center justify-between gap-3 sm:hidden">
            <button type="button" onClick={() => go(current - 1)} disabled={atStart} className={wideBtn}>
              <ChevronLeft size={16} aria-hidden="true" />
              Prev
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page <span className="font-semibold text-gray-900 dark:text-gray-100">{current}</span> of{" "}
              {totalPages.toLocaleString()}
            </span>
            <button type="button" onClick={() => go(current + 1)} disabled={atEnd} className={wideBtn}>
              Next
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>

          {/* ---- Tablet and up: windowed numbers + jump --------------- */}
          <nav aria-label="Pagination" className="hidden flex-wrap items-center justify-center gap-3 sm:flex lg:justify-end">
            <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50/80 p-1 dark:border-gray-800 dark:bg-gray-900/60">
              <IconBtn label="First page" onClick={() => go(1)} disabled={atStart}>
                <ChevronsLeft size={16} />
              </IconBtn>
              <IconBtn label="Previous page" onClick={() => go(current - 1)} disabled={atStart}>
                <ChevronLeft size={16} />
              </IconBtn>

              {getPageNumbers(current, totalPages).map((p, i) =>
                p === "..." ? (
                  <span
                    key={`gap-${i}`}
                    aria-hidden="true"
                    className="flex h-8 w-6 items-center justify-center text-sm text-gray-400 dark:text-gray-500"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => go(p)}
                    aria-label={`Page ${p}`}
                    aria-current={p === current ? "page" : undefined}
                    className={p === current ? numBtnActive : numBtn}
                  >
                    {p.toLocaleString()}
                  </button>
                )
              )}

              <IconBtn label="Next page" onClick={() => go(current + 1)} disabled={atEnd}>
                <ChevronRight size={16} />
              </IconBtn>
              <IconBtn label="Last page" onClick={() => go(totalPages)} disabled={atEnd}>
                <ChevronsRight size={16} />
              </IconBtn>
            </div>

            {totalPages > 7 ? <JumpToPage key={current} current={current} totalPages={totalPages} onGo={go} /> : null}
          </nav>
        </>
      ) : null}
    </div>
  );
}

/**
 * "Go to page". Keyed on the current page by the parent, so after any navigation
 * the box resets to the page actually shown instead of keeping a stale draft.
 */
function JumpToPage({ current, totalPages, onGo }) {
  const [draft, setDraft] = useState(String(current));

  const submit = (e) => {
    e.preventDefault();
    const n = Number.parseInt(draft, 10);
    if (Number.isFinite(n)) onGo(n);
    else setDraft(String(current));
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400">
      <label htmlFor="table-jump" className="whitespace-nowrap">
        Go to
      </label>
      <input
        id="table-jump"
        type="number"
        inputMode="numeric"
        min={1}
        max={totalPages}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => setDraft(String(current))}
        className="h-8 w-16 rounded-lg border border-gray-300 bg-white px-2 text-center text-sm font-medium text-gray-800 [appearance:textfield] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="whitespace-nowrap">of {totalPages.toLocaleString()}</span>
    </form>
  );
}

function IconBtn({ label, onClick, disabled, children }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={numBtn}>
      <span aria-hidden="true">{children}</span>
    </button>
  );
}

const numBtn =
  "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium text-gray-600 transition hover:bg-white hover:text-[#131C55] hover:shadow-sm disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white";

const numBtnActive =
  "flex h-8 min-w-8 items-center justify-center rounded-lg bg-[#131C55] px-2 text-sm font-semibold text-white shadow-sm dark:bg-blue-500 dark:text-gray-950";

const wideBtn =
  "inline-flex h-9 items-center gap-1 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 transition hover:border-[#131C55] hover:text-[#131C55] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:text-white";
