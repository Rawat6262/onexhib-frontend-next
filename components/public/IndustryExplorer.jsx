"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Armchair,
  Car,
  CircuitBoard,
  Cpu,
  Dumbbell,
  Factory,
  FlaskConical,
  Gem,
  GraduationCap,
  HardHat,
  HeartPulse,
  Landmark,
  Leaf,
  Package,
  Palette,
  Plane,
  Shirt,
  Sofa,
  Sparkles,
  Tag,
  Truck,
  UtensilsCrossed,
  Wheat,
  X,
  Zap,
} from "lucide-react";

import { categoryLandingPath } from "@/lib/routes";
import {
  WINDOWS,
  Chip,
  ExplorerSearch,
  Highlight,
  MiniBars,
  Segmented,
  explorerBar,
  monthBins,
  useSlashToFocus,
  windowEnd,
} from "@/components/public/explorer-ui";

/**
 * Interactive explorer for /exhibitions-for.
 *
 * Filters compose: free-text search over the industry names, one country, and a
 * time window - every card's count, its mini month-by-month chart and its "top
 * countries" line are recomputed from the industry's own exhibitions under the
 * current filters, so "Technology in Germany in the next 3 months" is a real
 * number, not a guess.
 *
 * Data: `industries[].events` is [startDate "YYYY-MM-DD", countryIndex] pairs
 * into `countries`, built on the server from the same cached catalogue walk the
 * page already uses. `today` comes from the server too, so the first client
 * render matches the HTML exactly (no hydration drift around midnight).
 *
 * The initial state (no search, all countries, any time, most events first) is
 * exactly the server-rendered list, so crawlers and no-JS visitors see every
 * industry with its real link. Controls are shared with LocationExplorer
 * (components/public/explorer-ui.jsx).
 */

const SORTS = [
  { key: "count", label: "Most events" },
  { key: "soon", label: "Soonest" },
  { key: "az", label: "A–Z" },
];

/** Keyword -> icon. First match wins; anything else gets a tag. */
const ICONS = [
  [/tech|software|it\b|digital/i, Cpu],
  [/electronic|semiconductor/i, CircuitBoard],
  [/manufactur|industr|machin/i, Factory],
  [/health|medical|pharma|dental/i, HeartPulse],
  [/agri|farm/i, Wheat],
  [/educat|career/i, GraduationCap],
  [/construct|building|architect/i, HardHat],
  [/food|beverage|hospitality/i, UtensilsCrossed],
  [/travel|touris/i, Plane],
  [/energy|power|solar/i, Zap],
  [/textile|apparel|fashion/i, Shirt],
  [/auto|vehicle|motor/i, Car],
  [/home|interior/i, Sofa],
  [/furniture/i, Armchair],
  [/beauty|cosmetic|personal care/i, Sparkles],
  [/packag|print/i, Package],
  [/jewel|gem/i, Gem],
  [/chemical|plastic|lab/i, FlaskConical],
  [/logistic|transport|shipping/i, Truck],
  [/financ|bank|business/i, Landmark],
  [/sport|fitness/i, Dumbbell],
  [/environment|green|water|waste/i, Leaf],
  [/art|craft|design|gift/i, Palette],
];
const iconFor = (label) => ICONS.find(([re]) => re.test(label))?.[1] || Tag;

const TONES = [
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-fuchsia-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-sky-600",
];

export default function IndustryExplorer({ industries = [], countries = [], today }) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState(-1); // index into `countries`, -1 = all
  const [windowKey, setWindowKey] = useState("all");
  const [sort, setSort] = useState("count");
  const inputRef = useRef(null);
  useSlashToFocus(inputRef);

  const q = query.trim();
  const win = WINDOWS.find((w) => w.key === windowKey);
  const until = windowEnd(today, windowKey);

  // Countries offered as chips: the busiest across all industries.
  const countryChips = useMemo(() => {
    const totals = new Map();
    for (const ind of industries) for (const [, ci] of ind.events) totals.set(ci, (totals.get(ci) || 0) + 1);
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([ci, n]) => ({ ci, n }));
  }, [industries]);

  const cards = useMemo(() => {
    const out = [];
    industries.forEach((ind, i) => {
      if (q && !ind.label.toLowerCase().includes(q.toLowerCase())) return;
      const events = ind.events.filter(
        ([d, ci]) => (country < 0 || ci === country) && d >= today && (!until || d < until)
      );
      if (!events.length) return;

      const byCountry = new Map();
      for (const [, ci] of events) byCountry.set(ci, (byCountry.get(ci) || 0) + 1);
      const top = [...byCountry.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([ci]) => countries[ci]);
      const next = events.reduce((m, [d]) => (d < m ? d : m), "9999-12-31");

      out.push({
        ...ind,
        tone: TONES[i % TONES.length],
        count: events.length,
        bins: monthBins(events.map(([d]) => d), today),
        top,
        next,
      });
    });
    if (sort === "az") out.sort((a, b) => a.label.localeCompare(b.label));
    else if (sort === "soon") out.sort((a, b) => a.next.localeCompare(b.next) || b.count - a.count);
    else out.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    return out;
  }, [industries, countries, q, country, today, until, sort]);

  const totalEvents = cards.reduce((n, c) => n + c.count, 0);
  const filtering = Boolean(q) || country >= 0 || windowKey !== "all";

  const reset = () => {
    setQuery("");
    setCountry(-1);
    setWindowKey("all");
    setSort("count");
  };

  return (
    <div className="mt-10">
      {/* ── Controls ───────────────────────────────────────────────── */}
      <div className={explorerBar}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <ExplorerSearch
            id="industry-search"
            inputRef={inputRef}
            value={query}
            onChange={setQuery}
            label="Search industries"
            placeholder="Search industries — e.g. food, energy, textiles"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Segmented label="When" options={WINDOWS} value={windowKey} onChange={setWindowKey} />
            <Segmented label="Sort" options={SORTS} value={sort} onChange={setSort} />
          </div>
        </div>

        {/* Country chips: scroll sideways on a phone rather than wrapping into a wall. */}
        <div className="ox-rail -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Filter by country">
          <Chip active={country < 0} onClick={() => setCountry(-1)}>
            All countries
          </Chip>
          {countryChips.map(({ ci, n }) => (
            <Chip key={ci} active={country === ci} onClick={() => setCountry(country === ci ? -1 : ci)}>
              {countries[ci]}
              <span className={`tabular-nums ${country === ci ? "text-white/70" : "text-gray-400 dark:text-gray-500"}`}>{n}</span>
            </Chip>
          ))}
        </div>
      </div>

      {/* ── Summary ────────────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
          <strong className="text-gray-900 dark:text-white">{cards.length}</strong> of {industries.length} industries ·{" "}
          <strong className="text-gray-900 tabular-nums dark:text-white">{totalEvents.toLocaleString("en-US")}</strong> upcoming events
          {country >= 0 ? <> in <strong className="text-gray-900 dark:text-white">{countries[country]}</strong></> : null}
          {win.months ? <> · {win.label.toLowerCase()}</> : null}
        </p>
        {filtering ? (
          <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-sm font-semibold text-[#2B3FB8] hover:underline dark:text-blue-300">
            <X size={14} aria-hidden="true" />
            Reset filters
          </button>
        ) : null}
      </div>

      {/* ── Cards ──────────────────────────────────────────────────── */}
      {cards.length ? (
        <ul className="mt-4 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => {
            const Icon = iconFor(c.label);
            return (
              <li key={c.slug}>
                <Link
                  href={categoryLandingPath(c.slug)}
                  className="ox-card ox-card-accent group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 hover:border-[#2B3FB8]/30 hover:shadow-xl hover:shadow-indigo-900/10 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-400/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md ${c.tone}`}>
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span className="text-right">
                      <span className="block text-2xl leading-none font-extrabold text-gray-900 tabular-nums dark:text-white">{c.count}</span>
                      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                        upcoming{country >= 0 ? ` in ${countries[country]}` : ""}
                      </span>
                    </span>
                  </div>

                  <h2 className="mt-4 text-base font-semibold text-gray-900 transition group-hover:text-[#2B3FB8] motion-reduce:transition-none dark:text-gray-50 dark:group-hover:text-blue-200">
                    <Highlight text={c.label} query={q} /> exhibitions
                  </h2>
                  {c.top.length && country < 0 ? (
                    <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">Mostly in {c.top.join(", ")}</p>
                  ) : null}

                  <div className="mt-auto pt-5">
                    <MiniBars bins={c.bins} today={today} />
                  </div>

                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#2B3FB8] dark:text-blue-300">
                    Browse
                    <ArrowRight size={15} aria-hidden="true" className="transition group-hover:translate-x-0.5 motion-reduce:transform-none" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-14 text-center dark:border-gray-700 dark:bg-gray-900/50">
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white">No industries match these filters.</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Try another word, a wider time window, or all countries.</p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:border-[#2B3FB8] hover:text-[#2B3FB8] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}
