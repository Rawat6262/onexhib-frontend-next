"use client";

/**
 * Shared building blocks for the interactive hub explorers
 * (IndustryExplorer on /exhibitions-for, LocationExplorer on /exhibitions-in),
 * so both pages filter, sort and chart with exactly the same controls.
 */

import { useEffect } from "react";

export const WINDOWS = [
  { key: "all", label: "Any time", months: null },
  { key: "3", label: "Next 3 months", months: 3 },
  { key: "6", label: "Next 6 months", months: 6 },
];

const MONTH_LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/** ISO day `iso` plus n calendar months, as YYYY-MM-DD (UTC). */
export function addMonths(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

/** The exclusive upper bound for a WINDOWS key, or null for "any time". */
export function windowEnd(today, key) {
  const w = WINDOWS.find((x) => x.key === key);
  return w && w.months ? addMonths(today, w.months) : null;
}

/** Twelve monthly counts starting at `today`'s month, from YYYY-MM-DD dates. */
export function monthBins(dates, today) {
  const y0 = Number(today.slice(0, 4));
  const m0 = Number(today.slice(5, 7));
  const bins = Array.from({ length: 12 }, () => 0);
  for (const d of dates) {
    const k = (Number(d.slice(0, 4)) - y0) * 12 + (Number(d.slice(5, 7)) - m0);
    if (k >= 0 && k < 12) bins[k] += 1;
  }
  return bins;
}

/** "/" focuses the given input unless the user is already typing somewhere. */
export function useSlashToFocus(ref) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      ref.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ref]);
}

/** Wrap the matched part of `text` in <mark>. */
export function Highlight({ text, query }) {
  const t = String(text || "");
  if (!query) return t;
  const i = t.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return t;
  return (
    <>
      {t.slice(0, i)}
      <mark className="rounded bg-amber-200/70 px-0.5 text-inherit dark:bg-amber-400/30">{t.slice(i, i + query.length)}</mark>
      {t.slice(i + query.length)}
    </>
  );
}

export function Segmented({ label, options, value, onChange }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800/80">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition motion-reduce:transition-none ${
              on
                ? "bg-white text-[#131C55] shadow-sm dark:bg-gray-950 dark:text-white"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition motion-reduce:transition-none ${
        active
          ? "border-transparent bg-gradient-to-r from-[#131C55] to-[#2B3FB8] text-white shadow-sm shadow-indigo-900/20 dark:from-blue-500 dark:to-indigo-500"
          : "border-gray-200 bg-white text-gray-700 hover:border-[#2B3FB8]/40 hover:text-[#2B3FB8] dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-400/40 dark:hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

/** Next-12-months bar chart. Decorative: callers always show the count as text. */
export function MiniBars({ bins, today }) {
  const peak = Math.max(1, ...bins);
  const start = Number(today.slice(5, 7)) - 1;
  return (
    <div aria-hidden="true">
      <div className="flex h-12 items-end gap-1">
        {bins.map((n, m) => (
          <span
            key={m}
            title={`${n} ${n === 1 ? "event" : "events"}`}
            className={`flex-1 rounded-t-sm transition-colors ${
              n ? "bg-gradient-to-t from-[#2B3FB8] to-[#8B5CF6] opacity-80 group-hover:opacity-100" : "bg-gray-100 dark:bg-gray-800"
            }`}
            style={{ height: `${n ? Math.max(12, Math.round((n / peak) * 100)) : 8}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex gap-1 text-[9px] font-semibold text-gray-400 dark:text-gray-500">
        {bins.map((_, m) => (
          <span key={m} className="flex-1 text-center">{MONTH_LETTERS[(start + m) % 12]}</span>
        ))}
      </div>
    </div>
  );
}

/** The search field used by both explorers: icon, clear button, "/" hint. */
export function ExplorerSearch({ id, inputRef, value, onChange, placeholder, label }) {
  return (
    <div className="relative flex-1">
      <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <label htmlFor={id} className="sr-only">{label}</label>
      <input
        ref={inputRef}
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="h-11 w-full rounded-xl border border-gray-300 bg-white pr-12 pl-10 text-sm text-gray-900 placeholder-gray-400 transition focus:border-[#2B3FB8] focus:ring-4 focus:ring-[#2B3FB8]/15 focus:outline-none motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-2.5 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      ) : (
        <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border border-gray-200 bg-gray-50 px-1.5 text-[11px] font-semibold text-gray-400 sm:block dark:border-gray-700 dark:bg-gray-800">
          /
        </kbd>
      )}
    </div>
  );
}

/** Sticky (sm+) frosted bar that holds an explorer's controls. */
export const explorerBar =
  "relative z-30 -mx-4 border-y border-gray-200/70 bg-white/85 px-4 py-4 backdrop-blur-md sm:sticky sm:top-[61px] sm:mx-0 sm:rounded-3xl sm:border sm:px-5 sm:shadow-lg sm:shadow-indigo-900/[0.05] dark:border-white/10 dark:bg-gray-950/80";
