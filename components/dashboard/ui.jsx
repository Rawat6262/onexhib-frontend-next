/**
 * Shared building blocks for the signed-in screens.
 *
 * Every value here is lifted from the public pages rather than invented, so the
 * two halves of the product match by construction: the same max-w-6xl column,
 * the same rounded-2xl / border-gray-200 card, the same #131C55 accent, the
 * same focus ring, the same type scale. Previously the dashboard used
 * blue-500/blue-600 (a colour that appears nowhere on the public site),
 * border-gray-300/400 (heavier), rounded-md (tighter) and font-serif (the
 * public site is Poppins) - four independent reasons it read as a different
 * website.
 *
 * These are plain presentational components with no client hooks, so they can
 * be used from a Server Component too if any signed-in page later stops being
 * a client one.
 */

/** Page title block. Mirrors the <header> on every public listing page. */
export function PageHeader({ title, intro, actions, eyebrow = "Dashboard" }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#2B3FB8] dark:text-blue-300">
            <span aria-hidden="true" className="h-px w-6 bg-current opacity-60" />
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-[2.6rem] dark:text-white">
          {title}
        </h1>
        {intro ? (
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
            {intro}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2.5">{actions}</div> : null}
    </header>
  );
}

/**
 * One statistic. Deliberately the same shape as the public CountsStrip: number
 * first at a large weight, label under it, no decorative chrome.
 */
export function StatCard({ label, value, accent = false }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl px-5 py-4 ${
        accent
          ? "bg-gradient-to-br from-[#131C55] via-[#1B2A7A] to-[#3A2A9A] text-white shadow-lg shadow-indigo-900/20 ring-1 ring-white/10"
          : "border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
      }`}
    >
      {accent ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-blue-400/30 blur-2xl"
        />
      ) : (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#2B3FB8] to-[#8B5CF6] opacity-70"
        />
      )}
      <p
        className={`relative text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl ${
          accent ? "text-white" : "text-gray-900 dark:text-white"
        }`}
      >
        {value}
      </p>
      <p className={`relative mt-0.5 text-[13px] leading-snug ${accent ? "text-blue-100/80" : "text-gray-600 dark:text-gray-400"}`}>
        {label}
      </p>
    </div>
  );
}

/** A titled content surface — the dashboard equivalent of a public Section. */
export function Panel({ title, count, toolbar, children }) {
  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm shadow-gray-900/[0.03] dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
      {(title || toolbar) && (
        <div className="flex flex-col gap-4 border-b border-gray-200 bg-gradient-to-b from-gray-50/80 to-white px-5 py-4 lg:flex-row lg:items-center lg:justify-between dark:border-gray-800 dark:from-white/[0.02] dark:to-transparent">
          {title ? (
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{title}</h2>
              {count != null ? (
                <p className="mt-0.5 text-[13px] text-gray-500 dark:text-gray-400">{count}</p>
              ) : null}
            </div>
          ) : null}
          {toolbar ? <div className="flex flex-col gap-2.5 sm:flex-row">{toolbar}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}

/** Consistent empty state, matching the public EmptyState tone. */
export function NoResults({ children }) {
  return (
    <p className="px-5 py-12 text-center text-[15px] text-gray-500 dark:text-gray-400">{children}</p>
  );
}

/* ── Shared class strings ──────────────────────────────────────────────────
   Exported rather than wrapped in components because the existing screens
   apply them to their own <button>/<input> elements, which keeps this change
   a restyle rather than a rewrite of every handler. */

/** Filled brand button — the primary action, same as the public site's CTA. */
export const btnPrimary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#131C55] to-[#2B3FB8] px-4 text-sm font-semibold text-white shadow-md shadow-indigo-900/20 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] disabled:opacity-60 motion-reduce:transition-none dark:from-blue-600 dark:to-indigo-500";

/** Outlined button — secondary actions, matching the public "Create account". */
export const btnSecondary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 transition hover:border-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-500";

/** Small inline button used inside table rows and cards. */
export const btnRow =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 transition hover:border-[#131C55] hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:text-white";

/** Destructive row action. Red only on hover, so a table is not a wall of red. */
export const btnRowDanger =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 transition hover:border-red-400 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-red-500 dark:hover:text-red-400";

/** Text input. Same radius, border and focus treatment as the public SearchBar. */
export const inputBase =
  "h-10 w-full rounded-xl border border-gray-300 bg-white px-3.5 text-sm text-gray-900 placeholder-gray-500 transition focus:border-[#2B3FB8] focus:outline-none focus:ring-4 focus:ring-[#2B3FB8]/15 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20";

/** Category/status pill. */
export const pill =
  "inline-flex items-center rounded-full bg-[#2B3FB8]/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#2B3FB8] ring-1 ring-[#2B3FB8]/15 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/20";
