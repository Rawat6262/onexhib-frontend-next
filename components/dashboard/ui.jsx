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
 * StatCard, Panel and NoResults now render the admin console's versions, so a
 * role dashboard and the admin area look like one product.
 */
import { Inbox } from "lucide-react";
import { EmptyState, Panel as AdminPanel, StatCard as AdminStatCard } from "@/components/admin/AdminUI";


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
 * One statistic. Same card as the admin console (components/admin/AdminUI.jsx):
 * pass `icon`/`tone`/`hint`/`href` for the full card; the old two-prop form
 * ({ label, value }) still works. `accent` keeps the filled brand card for the
 * one number a page wants to lead with.
 */
export function StatCard({ label, value, accent = false, icon, tone, hint, href, warn }) {
  if (!accent) {
    return <AdminStatCard label={label} value={value} icon={icon} tone={tone} hint={hint} href={href} warn={warn} />;
  }
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#131C55] via-[#1B2A7A] to-[#3A2A9A] px-5 py-4 text-white shadow-lg shadow-indigo-900/20 ring-1 ring-white/10">
      <span aria-hidden="true" className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-blue-400/30 blur-2xl" />
      <div className="relative flex items-center justify-between gap-2">
        <p className="truncate text-[13px] font-medium text-blue-100/80">{label}</p>
        {icon ? (
          <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/15 text-white">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="relative mt-2 text-2xl font-extrabold tracking-tight tabular-nums sm:text-[1.9rem]">
        {value === undefined ? <span className="inline-block h-7 w-14 animate-pulse rounded-md bg-white/15 align-middle" /> : value}
      </p>
      {hint ? <p className="relative mt-1 truncate text-xs text-blue-100/70">{hint}</p> : null}
    </div>
  );
}

/**
 * A titled content surface. The admin console's Panel; `count` may be a number
 * or a phrase ("12 exhibitions"), and `description`/`footer` are optional.
 */
export function Panel(props) {
  return <AdminPanel {...props} />;
}

/** Consistent empty state - an icon, a line, and optional detail. */
export function NoResults({ children, title, icon }) {
  if (title) return <EmptyState title={title} icon={icon}>{children}</EmptyState>;
  return (
    <div className="px-5 py-12 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
        {icon || <Inbox size={20} aria-hidden="true" />}
      </span>
      <p className="mt-3 text-[15px] text-gray-600 dark:text-gray-400">{children}</p>
    </div>
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
