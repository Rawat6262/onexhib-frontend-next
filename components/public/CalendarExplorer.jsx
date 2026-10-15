"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Flame, X } from "lucide-react";

import { Chip, ExplorerSearch, Highlight, Segmented, explorerBar, useSlashToFocus } from "@/components/public/explorer-ui";

/**
 * Interactive calendar for /exhibitions/monthly.
 *
 * Filters compose - a text search over country / city / industry, one country,
 * one industry - and every number on the page is recounted from the events
 * themselves: the timeline, each month's total, its day-by-day chart, and its
 * top industries and countries.
 *
 * Unfiltered, it renders exactly the month list the page always had (every month
 * with enough shows links to its own page), so crawlers and no-JS visitors keep
 * every link. `months` carries the server's month list and which ones have a
 * page; `data` the compact events (lib/discovery.getCalendarEvents); `today` the
 * server's date, so the first render matches the HTML.
 */

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const VIEWS = [
  { key: "all", label: "All months" },
  { key: "busy", label: "Hide empty" },
];

const norm = (v) => String(v || "").trim().toLowerCase();
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export default function CalendarExplorer({ data, months = [], today, minForPage = 1 }) {
  const { countries = [], cities = [], industries = [], events = [] } = data || {};
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState(-1);
  const [industry, setIndustry] = useState(-1);
  const [view, setView] = useState("all");
  const inputRef = useRef(null);
  useSlashToFocus(inputRef);

  const q = norm(query);
  const filtering = Boolean(q) || country >= 0 || industry >= 0;
  const nowKey = today.slice(0, 7);

  const filtered = useMemo(
    () =>
      events.filter(
        ([, ci, ti, ii]) =>
          (country < 0 || ci === country) &&
          (industry < 0 || ii === industry) &&
          (!q ||
            norm(countries[ci]).includes(q) ||
            (ti >= 0 && norm(cities[ti]).includes(q)) ||
            (ii >= 0 && norm(industries[ii]).includes(q)))
      ),
    [events, countries, cities, industries, country, industry, q]
  );

  // Chips: the busiest countries / industries overall (stable while filtering).
  const top = (pos, labels, n) => {
    const counts = new Map();
    for (const e of events) if (e[pos] >= 0) counts.set(e[pos], (counts.get(e[pos]) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([i, c]) => ({ i, c, label: labels[i] }));
  };
  const countryChips = useMemo(() => top(1, countries, 10), [events, countries]); // eslint-disable-line react-hooks/exhaustive-deps
  const industryChips = useMemo(() => top(3, industries, 12), [events, industries]); // eslint-disable-line react-hooks/exhaustive-deps

  const cards = useMemo(() => {
    const byMonth = new Map(months.map((m) => [`${m.year}-${String(m.month).padStart(2, "0")}`, { ...m, list: [] }]));
    for (const e of filtered) {
      const key = e[0].slice(0, 7);
      const card = byMonth.get(key);
      if (card) card.list.push(e);
    }
    return [...byMonth.entries()].map(([key, m]) => {
      const days = Array.from({ length: daysIn(m.year, m.month) }, () => 0);
      const inds = new Map();
      const ctys = new Map();
      for (const [d, ci, , ii] of m.list) {
        days[Number(d.slice(8, 10)) - 1] += 1;
        if (ii >= 0) inds.set(ii, (inds.get(ii) || 0) + 1);
        ctys.set(ci, (ctys.get(ci) || 0) + 1);
      }
      const rank = (map, labels, n) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([i, c]) => ({ label: labels[i], c }));
      return {
        key,
        year: m.year,
        month: m.month,
        hasPage: m.count >= minForPage,
        href: `/exhibitions/monthly/${m.year}/${String(m.month).padStart(2, "0")}`,
        count: m.list.length,
        days,
        topIndustries: rank(inds, industries, 3),
        topCountries: rank(ctys, countries, 2),
        isNow: key === nowKey,
      };
    });
  }, [months, filtered, industries, countries, minForPage, nowKey]);

  const peak = Math.max(1, ...cards.map((c) => c.count));
  const busiestKey = cards.reduce((best, c) => (c.count > (best?.count || 0) ? c : best), null)?.key;
  const shown = view === "busy" || filtering ? cards.filter((c) => c.count > 0) : cards;
  const total = filtered.length;

  const reset = () => {
    setQuery("");
    setCountry(-1);
    setIndustry(-1);
    setView("all");
  };

  return (
    <div className="mt-10">
      {/* ── Controls ───────────────────────────────────────────────── */}
      <div className={explorerBar}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <ExplorerSearch
            id="calendar-search"
            inputRef={inputRef}
            value={query}
            onChange={setQuery}
            label="Filter by country, city or industry"
            placeholder="Filter by country, city or industry — e.g. Dubai, textiles"
          />
          <Segmented label="Months" options={VIEWS} value={view} onChange={setView} />
        </div>
        <div className="ox-rail -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Country">
          <Chip active={country < 0} onClick={() => setCountry(-1)}>All countries</Chip>
          {countryChips.map((o) => (
            <Chip key={o.i} active={country === o.i} onClick={() => setCountry(country === o.i ? -1 : o.i)}>
              {o.label}
              <span className={`tabular-nums ${country === o.i ? "text-white/70" : "text-gray-400 dark:text-gray-500"}`}>{o.c}</span>
            </Chip>
          ))}
        </div>
        <div className="ox-rail -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="group" aria-label="Industry">
          <Chip active={industry < 0} onClick={() => setIndustry(-1)}>All industries</Chip>
          {industryChips.map((o) => (
            <Chip key={o.i} active={industry === o.i} onClick={() => setIndustry(industry === o.i ? -1 : o.i)}>
              {o.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* ── Summary ────────────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
          <strong className="text-gray-900 tabular-nums dark:text-white">{total.toLocaleString("en-US")}</strong> exhibitions across{" "}
          <strong className="text-gray-900 dark:text-white">{cards.filter((c) => c.count).length}</strong> months
          {country >= 0 ? <> in <strong className="text-gray-900 dark:text-white">{countries[country]}</strong></> : null}
          {industry >= 0 ? <> · <strong className="text-gray-900 dark:text-white">{industries[industry]}</strong></> : null}
        </p>
        {filtering || view !== "all" ? (
          <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-sm font-semibold text-[#2B3FB8] hover:underline dark:text-blue-300">
            <X size={14} aria-hidden="true" />
            Reset filters
          </button>
        ) : null}
      </div>

      {/* ── Year timeline ──────────────────────────────────────────── */}
      <nav aria-label="Jump to a month" className="mt-4 overflow-hidden rounded-3xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-900">
        <ol className="flex h-36 list-none items-end gap-1.5 sm:gap-2">
          {cards.map((c) => (
            <li key={c.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              <a
                href={`#month-${c.key}`}
                title={`${MONTH_NAMES[c.month - 1]} ${c.year}: ${c.count} exhibitions`}
                className="group flex h-full w-full flex-col items-center justify-end gap-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55]"
              >
                <span className="text-[10px] font-semibold text-gray-500 tabular-nums opacity-0 transition group-hover:opacity-100 sm:text-[11px] dark:text-gray-400">
                  {c.count}
                </span>
                <span
                  aria-hidden="true"
                  className={`w-full rounded-t-lg transition-all group-hover:brightness-110 motion-reduce:transition-none ${
                    c.count ? (c.isNow ? "bg-gradient-to-t from-amber-500 to-amber-300" : "bg-gradient-to-t from-[#2B3FB8] to-[#8B5CF6]") : "bg-gray-100 dark:bg-gray-800"
                  }`}
                  style={{ height: `${c.count ? Math.max(6, Math.round((c.count / peak) * 100)) : 3}%` }}
                />
                <span className={`text-[10px] font-semibold sm:text-xs ${c.isNow ? "text-amber-600 dark:text-amber-400" : "text-gray-500 dark:text-gray-400"}`}>
                  {SHORT[c.month - 1]}
                </span>
              </a>
            </li>
          ))}
        </ol>
        <p className="mt-2 flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" /> This month</span>
          <span>Tap a bar to jump to that month.</span>
        </p>
      </nav>

      {/* ── Month cards ────────────────────────────────────────────── */}
      {shown.length ? (
        <ul className="mt-6 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c) => {
            const dayPeak = Math.max(1, ...c.days);
            const inner = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">{c.year}</p>
                    <h2 className="text-xl font-bold text-gray-900 transition group-hover:text-[#2B3FB8] motion-reduce:transition-none dark:text-white dark:group-hover:text-blue-200">
                      {MONTH_NAMES[c.month - 1]}
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="block text-3xl leading-none font-extrabold text-gray-900 tabular-nums dark:text-white">{c.count}</span>
                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{c.count === 1 ? "exhibition" : "exhibitions"}</span>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.isNow ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">
                      <CalendarDays size={11} aria-hidden="true" /> This month
                    </span>
                  ) : null}
                  {c.key === busiestKey && c.count ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                      <Flame size={11} aria-hidden="true" /> Busiest
                    </span>
                  ) : null}
                </div>

                {/* One bar per day of the month: when in the month shows open. */}
                <div className="mt-4" aria-hidden="true">
                  <div className="flex h-10 items-end gap-[2px]">
                    {c.days.map((n, i) => (
                      <span
                        key={i}
                        title={`${i + 1} ${SHORT[c.month - 1]}: ${n}`}
                        className={`flex-1 rounded-t-sm ${n ? "bg-gradient-to-t from-[#2B3FB8] to-[#8B5CF6] opacity-80 group-hover:opacity-100" : "bg-gray-100 dark:bg-gray-800"}`}
                        style={{ height: `${n ? Math.max(14, Math.round((n / dayPeak) * 100)) : 10}%` }}
                      />
                    ))}
                  </div>
                  <div className="mt-1 flex justify-between text-[9px] font-semibold text-gray-400 dark:text-gray-500">
                    <span>1</span>
                    <span>15</span>
                    <span>{c.days.length}</span>
                  </div>
                </div>

                {c.topIndustries.length ? (
                  <ul className="mt-4 flex list-none flex-wrap gap-1.5">
                    {c.topIndustries.map((t) => (
                      <li key={t.label} className="rounded-full bg-[#2B3FB8]/[0.08] px-2.5 py-0.5 text-[11px] font-semibold text-[#2B3FB8] dark:bg-blue-400/10 dark:text-blue-300">
                        <Highlight text={t.label} query={q} /> · {t.c}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {c.topCountries.length && country < 0 ? (
                  <p className="mt-2 text-[13px] text-gray-500 dark:text-gray-400">
                    Mostly in {c.topCountries.map((t) => t.label).join(", ")}
                  </p>
                ) : null}

                <span className="mt-auto flex items-center gap-1 pt-4 text-sm font-semibold text-[#2B3FB8] dark:text-blue-300">
                  {c.hasPage ? (
                    <>
                      View exhibitions
                      <ArrowRight size={15} aria-hidden="true" className="transition group-hover:translate-x-0.5 motion-reduce:transform-none" />
                    </>
                  ) : (
                    <span className="font-medium text-gray-400 dark:text-gray-500">Too few for its own page yet</span>
                  )}
                </span>
              </>
            );
            const cls = `group relative flex h-full scroll-mt-40 flex-col overflow-hidden rounded-2xl border p-5 ${
              c.isNow ? "border-amber-300 dark:border-amber-400/40" : "border-gray-200 dark:border-gray-800"
            } bg-white dark:bg-gray-900`;
            return (
              <li key={c.key} id={`month-${c.key}`} className="scroll-mt-40">
                {c.hasPage ? (
                  <Link href={c.href} className={`ox-card ox-card-accent ${cls} hover:border-[#2B3FB8]/30 hover:shadow-xl hover:shadow-indigo-900/10 dark:hover:border-blue-400/30`}>
                    {inner}
                  </Link>
                ) : (
                  <div className={`${cls} border-dashed opacity-80`}>{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-14 text-center dark:border-gray-700 dark:bg-gray-900/50">
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white">No exhibitions match these filters.</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Try another country, industry or spelling.</p>
          <button type="button" onClick={reset} className="mt-4 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:border-[#2B3FB8] hover:text-[#2B3FB8] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}
