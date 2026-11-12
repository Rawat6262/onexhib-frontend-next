"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Hourglass, Loader2, Star, StarOff } from "lucide-react";

import { btnPrimary, btnRow, btnRowDanger, inputBase } from "@/components/dashboard/ui";

/**
 * Featuring a service listing on the home page - the pieces the admin Services
 * page and the admin Featured services page share.
 *
 * Days are counted the way the API counts them (serviceFeatureWindow in the
 * backend's Service/featureWindow.js): today is day 1, at most 365, and the
 * window ends at UTC midnight of its last day.
 */

export const MAX_FEATURE_DAYS = 365;
const FEATURE_PRESETS = [7, 14, 30, 90];
const DAY_MS = 24 * 60 * 60 * 1000;

export const isoDay = (v) => (v ? String(v).slice(0, 10) : "");
export const todayIso = () => new Date().toISOString().slice(0, 10);
export const fmtDay = (v) =>
  new Date(`${isoDay(v)}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
/** The last featured day of an n-day window that starts today. */
export const untilFor = (n) => new Date(Date.parse(`${todayIso()}T00:00:00Z`) + (n - 1) * DAY_MS).toISOString().slice(0, 10);
/** Featured and still inside its window - i.e. on the home page now. */
export const featuredNow = (r) => Boolean(r.is_featured && isoDay(r.featured_until) >= todayIso());
/** Days from today through the window's last day, inclusive (0 once it has run out). */
export const daysLeftOf = (until) =>
  until ? Math.max(0, Math.round((Date.parse(`${isoDay(until)}T00:00:00Z`) - Date.parse(`${todayIso()}T00:00:00Z`)) / DAY_MS) + 1) : 0;

/** "Featured until 17 Nov 2026 · 7 days left", or that the window has run out. */
export function FeaturedBadge({ r, className = "mt-1.5" }) {
  if (!r.is_featured) return null;
  const until = isoDay(r.featured_until);
  const now = todayIso();
  let text;
  let tone = "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/25";
  if (!until || until < now) {
    text = until ? `Feature over · ended ${fmtDay(until)}` : "Feature over";
    tone = "bg-gray-100 text-gray-600 ring-gray-500/20 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-600/30";
  } else {
    const left = daysLeftOf(until);
    text = `Featured until ${fmtDay(until)} · ${left === 1 ? "last day" : `${left} days left`}`;
  }
  return (
    <span className={`${className} inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${tone}`}>
      <Hourglass size={11} aria-hidden="true" />
      {text}
    </span>
  );
}

const chip = (on) =>
  `h-9 rounded-lg px-2.5 text-xs font-semibold ring-1 transition ${
    on
      ? "bg-ox-blue text-white ring-ox-blue dark:bg-blue-500 dark:ring-blue-500"
      : "bg-white text-gray-700 ring-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-800"
  }`;

/**
 * Feature a listing for N days (today is day 1, at most 365), change the days
 * of one already featured, or unfeature it (`allowUnfeature={false}` where the
 * page has its own Unfeature button). The confirm button stays disabled
 * outside 1..365; the API checks the same rule.
 */
export function ServiceFeaturePanel({ r, busy, onFeature, onUnfeature, onCancel, allowUnfeature = true }) {
  const [value, setValue] = useState("14");
  const [confirmUnfeature, setConfirmUnfeature] = useState(false);
  const inputRef = useRef(null);
  const id = useId();

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const n = Number(value);
  const valid = value !== "" && Number.isInteger(n) && n >= 1 && n <= MAX_FEATURE_DAYS;
  const hint =
    value === ""
      ? `Enter 1 to ${MAX_FEATURE_DAYS} days.`
      : !Number.isInteger(n) || n < 1
        ? "Use a whole number of days, at least 1."
        : n > MAX_FEATURE_DAYS
          ? `At most ${MAX_FEATURE_DAYS} days.`
          : `On the home page until ${fmtDay(untilFor(n))}.`;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !busy) onFeature(n);
      }}
      className="mt-3 rounded-xl border border-ox-blue/20 bg-white p-3 dark:border-blue-400/20 dark:bg-gray-950/40"
    >
      <p className="text-xs text-gray-600 dark:text-gray-400">
        {r.is_featured
          ? "Featuring again replaces the current end date."
          : "Shows this listing in the “Featured services” slider on the home page."}
      </p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor={id} className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
            Feature for how many days?
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              ref={inputRef}
              id={id}
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_FEATURE_DAYS}
              step={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-invalid={value !== "" && !valid}
              aria-describedby={`${id}-hint`}
              className={`${inputBase} h-9 w-24 tabular-nums`}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">max {MAX_FEATURE_DAYS}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick choices">
          {FEATURE_PRESETS.map((d) => (
            <button key={d} type="button" onClick={() => setValue(String(d))} aria-pressed={n === d} className={chip(n === d)}>
              {d} days
            </button>
          ))}
        </div>
      </div>
      <p
        id={`${id}-hint`}
        aria-live="polite"
        className={`mt-2 text-xs ${value !== "" && !valid ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}
      >
        {hint}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="submit" disabled={!valid || busy} className={`${btnPrimary} h-9 px-3 text-[13px] disabled:opacity-50`}>
          {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Star size={14} aria-hidden="true" />}
          {valid ? `Feature for ${n} ${n === 1 ? "day" : "days"}` : "Feature"}
        </button>
        <button type="button" onClick={onCancel} className={btnRow}>
          Cancel
        </button>
        {r.is_featured && allowUnfeature ? (
          confirmUnfeature ? (
            <span className="inline-flex items-center gap-2 sm:ml-auto">
              <button
                type="button"
                onClick={onUnfeature}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {busy ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : null}
                Unfeature
              </button>
              <button type="button" onClick={() => setConfirmUnfeature(false)} className={btnRow}>
                Keep
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmUnfeature(true)} disabled={busy} className={`${btnRowDanger} sm:ml-auto`}>
              <StarOff size={14} aria-hidden="true" />
              Unfeature
            </button>
          )
        ) : null}
      </div>
    </form>
  );
}
