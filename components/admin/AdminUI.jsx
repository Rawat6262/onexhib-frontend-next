"use client";

import Link from "next/link";
import { Inbox, Search } from "lucide-react";

/**
 * The admin console's building blocks.
 *
 * Every admin page used to hand-roll its own header, stat cards, table chrome
 * and empty state, so no two looked alike: one had icons, one showed "ADMIN"
 * twice, one centred its table headers, one said "No data found" and another
 * "No companies found". These are the shared versions. A page composes them;
 * it does not restyle them.
 *
 *   <AdminPage>
 *     <AdminHeader title description actions />
 *     <StatGrid><StatCard … /></StatGrid>
 *     <Panel title toolbar footer>…table or EmptyState…</Panel>
 *   </AdminPage>
 */

/** Page wrapper. The admin layout supplies the rail; this supplies the gutters. */
export function AdminPage({ children }) {
  return (
    <div className="w-full min-w-0 px-4 py-8 text-gray-900 sm:px-6 sm:py-12 lg:px-0 dark:text-gray-100">{children}</div>
  );
}

export function AdminHeader({ title, description, actions, eyebrow = "Admin console" }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#2B3FB8] dark:text-blue-300">
          <span aria-hidden="true" className="h-px w-6 bg-current opacity-60" />
          {eyebrow}
        </p>
        <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-[2.4rem] dark:text-white">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function StatGrid({ children, cols = 4 }) {
  const grid = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4", 5: "sm:grid-cols-3 lg:grid-cols-5", 6: "sm:grid-cols-3 lg:grid-cols-6" }[cols];
  return <div className={`mt-8 grid grid-cols-2 gap-3 sm:gap-4 ${grid}`}>{children}</div>;
}

const TONES = {
  brand: "bg-[#2B3FB8]/10 text-[#2B3FB8] dark:bg-blue-400/15 dark:text-blue-300",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300",
  amber: "bg-amber-500/10 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300",
  violet: "bg-violet-500/10 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300",
  rose: "bg-rose-500/10 text-rose-600 dark:bg-rose-400/15 dark:text-rose-300",
  sky: "bg-sky-500/10 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300",
};

/**
 * One number. `value` undefined renders a skeleton; null renders "—" (the source
 * failed or is not deployed yet). `href` makes the whole card a link.
 */
export function StatCard({ icon, label, value, hint, tone = "brand", href, warn = false }) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[13px] font-medium text-gray-500 dark:text-gray-400">{label}</p>
        {icon ? (
          <span aria-hidden="true" className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${TONES[tone] || TONES.brand}`}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-extrabold tracking-tight text-gray-900 tabular-nums sm:text-[1.9rem] dark:text-white">
        {value === undefined ? (
          <span className="inline-block h-7 w-14 animate-pulse rounded-md bg-gray-100 align-middle dark:bg-gray-800" />
        ) : value === null ? (
          "—"
        ) : typeof value === "number" ? (
          value.toLocaleString("en-US")
        ) : (
          value
        )}
      </p>
      {hint ? <p className={`mt-1 truncate text-xs ${warn ? "font-medium text-amber-700 dark:text-amber-300" : "text-gray-400 dark:text-gray-500"}`}>{hint}</p> : null}
    </>
  );
  const cls = `group relative block min-w-0 overflow-hidden rounded-2xl border px-4 py-4 sm:px-5 ${
    warn
      ? "border-amber-200 bg-amber-50/50 dark:border-amber-400/25 dark:bg-amber-400/5"
      : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
  }`;
  return href ? (
    <Link
      href={href}
      className={`${cls} transition hover:-translate-y-0.5 hover:border-[#2B3FB8]/40 hover:shadow-md hover:shadow-indigo-900/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B3FB8] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:hover:border-blue-400/40`}
    >
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** A bordered card with an optional header row (title + toolbar) and footer. */
export function Panel({ title, description, count, toolbar, footer, children, className = "" }) {
  const hasHead = title || toolbar;
  return (
    <section
      className={`mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm shadow-gray-900/[0.03] dark:border-gray-800 dark:bg-gray-900 dark:shadow-none ${className}`}
    >
      {hasHead ? (
        <div className="flex flex-col gap-3 border-b border-gray-200 bg-gradient-to-b from-gray-50/80 to-white px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between dark:border-gray-800 dark:from-white/[0.02] dark:to-transparent">
          {title ? (
            <div className="min-w-0">
              <h2 className="flex items-baseline gap-2 text-base font-semibold text-gray-900 dark:text-gray-50">
                {title}
                {count !== undefined && count !== null ? (
                  <span className="text-sm font-medium tabular-nums text-gray-400">{typeof count === "number" ? count.toLocaleString("en-US") : count}</span>
                ) : null}
              </h2>
              {description ? <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p> : null}
            </div>
          ) : null}
          {toolbar ? <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">{toolbar}</div> : null}
        </div>
      ) : null}
      {children}
      {footer ? <div className="border-t border-gray-100 py-2 dark:border-gray-800">{footer}</div> : null}
    </section>
  );
}

export function SearchField({ value, onChange, placeholder = "Search", label, className = "", title }) {
  return (
    <div className={`relative min-w-0 ${className}`}>
      <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label || placeholder}
        title={title}
        className={`${adminInput} pl-9`}
      />
    </div>
  );
}

export function EmptyState({ icon, title = "Nothing here", children }) {
  return (
    <div className="px-5 py-14 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
        {icon || <Inbox size={22} aria-hidden="true" />}
      </span>
      <p className="mt-3 text-[15px] font-semibold text-gray-900 dark:text-gray-100">{title}</p>
      {children ? <div className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">{children}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <p className="px-5 py-12 text-center text-[15px] text-red-600 dark:text-red-400">
      {message}{" "}
      {onRetry ? (
        <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-2">
          Try again
        </button>
      ) : null}
    </p>
  );
}

export function LoadingRows({ rows = 4 }) {
  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-800" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Initials in a tinted square - for rows without an image. */
export function Monogram({ name = "", icon, size = "h-10 w-10" }) {
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return (
    <span
      aria-hidden="true"
      className={`grid ${size} shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#131C55]/10 to-[#2B3FB8]/15 text-xs font-bold text-[#2B3FB8] ring-1 ring-gray-200 dark:from-blue-400/10 dark:to-indigo-400/15 dark:text-blue-300 dark:ring-gray-800`}
    >
      {icon || letters || "?"}
    </span>
  );
}

/** A small rounded label. */
export function Badge({ children, tone = "gray", className = "" }) {
  const tones = {
    gray: "bg-gray-100 text-gray-600 ring-gray-500/15 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600/30",
    brand: "bg-[#2B3FB8]/10 text-[#2B3FB8] ring-[#2B3FB8]/20 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/25",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25",
    amber: "bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/25",
    violet: "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/25",
    sky: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/25",
    rose: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/25",
  };
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${tones[tone] || tones.gray} ${className}`}>
      {children}
    </span>
  );
}

/* ── Class strings for the pieces pages render themselves ─────────────────── */

export const adminInput =
  "h-10 w-full rounded-xl border border-gray-300 bg-white px-3.5 text-sm text-gray-900 placeholder-gray-500 transition focus:border-[#2B3FB8] focus:outline-none focus:ring-4 focus:ring-[#2B3FB8]/15 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20";

export const adminSelect = `${adminInput} pr-8`;

/** Table: header row, header cell, body cell, row. Left-aligned throughout. */
export const thead = "border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400";
export const th = "sticky top-0 z-10 bg-gray-50/95 px-4 py-3 text-left font-semibold backdrop-blur first:pl-5 last:pr-5 dark:bg-gray-900/95";
export const td = "px-4 py-3.5 align-middle first:pl-5 last:pr-5";
export const tr = "transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[0.02]";
export const tbody = "divide-y divide-gray-100 dark:divide-gray-800";

export const btnPrimary =
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#131C55] to-[#2B3FB8] px-4 text-sm font-semibold text-white shadow-md shadow-indigo-900/20 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] disabled:opacity-60 motion-reduce:transition-none dark:from-blue-600 dark:to-indigo-500";
export const btnSecondary =
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:border-[#2B3FB8] hover:text-[#2B3FB8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B3FB8] disabled:opacity-60 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-blue-400 dark:hover:text-blue-300";
export const btnRow =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 transition hover:border-[#2B3FB8] hover:text-[#2B3FB8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B3FB8] disabled:opacity-60 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-400 dark:hover:text-white";
export const btnRowDanger =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 transition hover:border-red-400 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:opacity-60 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-red-500 dark:hover:text-red-400";

export function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function timeAgo(v) {
  if (!v) return "";
  const days = Math.floor((Date.now() - new Date(v).getTime()) / 86400000);
  if (!Number.isFinite(days)) return "";
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months} mo ago` : `${Math.floor(months / 12)} yr ago`;
}
