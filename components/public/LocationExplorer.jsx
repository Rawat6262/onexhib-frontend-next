"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Globe2, Landmark, MapPin, X } from "lucide-react";

import { PUBLIC_ROUTES } from "@/lib/seo";
import { cityLandingPath, countryLandingPath } from "@/lib/routes";
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
 * Interactive explorer for /exhibitions-in - the same controls as the industry
 * explorer (components/public/explorer-ui.jsx), plus State and City.
 *
 * ANY COMBINATION WORKS: country alone, state alone, city alone, any two, or all
 * three, together with a text search and a time window. Each dropdown is narrowed
 * by the other choices but never by itself, so any one can be picked first. The
 * "Show exhibitions" link carries the same any-subset filter to /exhibitions
 * (?country=&state=&city=), which the backend's buildLocationFilter honours
 * parameter by parameter.
 *
 * TWO VIEWS
 *  - Nothing filtered: one card per country from the location index, with flag,
 *    count, month chart and every qualifying city as a link to its landing page.
 *    This is also the server-rendered HTML, so crawlers keep every country and
 *    city link the directory always had.
 *  - Filtering: live cards for the matching places (cities, plus any country or
 *    state the search names directly), counted from the events themselves.
 *
 * `data` comes from lib/locations.getLocationEvents (every upcoming show, no
 * thresholds); `directory` from getLocationIndex (the places with landing pages);
 * `today` from the server so the first render matches the HTML.
 */

const SORTS = [
  { key: "count", label: "Most events" },
  { key: "soon", label: "Soonest" },
  { key: "az", label: "A–Z" },
];

const norm = (v) => String(v || "").trim().toLowerCase();

function exhibitionsHref({ country, state, city }) {
  const qs = new URLSearchParams();
  if (country) qs.set("country", country);
  if (state) qs.set("state", state);
  if (city) qs.set("city", city);
  const q = qs.toString();
  return q ? `${PUBLIC_ROUTES.exhibitions}?${q}` : PUBLIC_ROUTES.exhibitions;
}

function sortCards(cards, sort) {
  if (sort === "az") return cards.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === "soon") return cards.sort((a, b) => a.next.localeCompare(b.next) || b.count - a.count);
  return cards.sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
}

export default function LocationExplorer({ data, directory = [], today }) {
  const { countries = [], states = [], cities = [], events = [] } = data || {};

  const [query, setQuery] = useState("");
  const [ci, setCi] = useState(-1);
  const [si, setSi] = useState(-1);
  const [ti, setTi] = useState(-1);
  const [windowKey, setWindowKey] = useState("all");
  const [sort, setSort] = useState("count");
  const inputRef = useRef(null);
  useSlashToFocus(inputRef);

  const q = norm(query);
  const until = windowEnd(today, windowKey);
  const win = WINDOWS.find((w) => w.key === windowKey);
  const filtering = Boolean(q) || ci >= 0 || si >= 0 || ti >= 0 || windowKey !== "all";

  // Landing pages that exist, so a matching city can link to its own page.
  const landing = useMemo(() => {
    const country = new Map();
    const city = new Map();
    for (const d of directory) {
      country.set(norm(d.country), d.slug);
      for (const c of d.cities) city.set(`${norm(d.country)}|${norm(c.city)}`, cityLandingPath(c.countrySlug, c.slug));
    }
    return { country, city };
  }, [directory]);

  const inWindow = (e) => e[0] >= today && (!until || e[0] < until);
  const textHit = (e) =>
    !q ||
    norm(countries[e[1]]).includes(q) ||
    (e[2] >= 0 && norm(states[e[2]].label).includes(q)) ||
    (e[3] >= 0 && norm(cities[e[3]].label).includes(q));

  /** Events matching everything except the named dimension (for its own options). */
  const matchExcept = (skip) => (e) =>
    inWindow(e) &&
    (skip === "c" || ci < 0 || e[1] === ci) &&
    (skip === "s" || si < 0 || e[2] === si) &&
    (skip === "t" || ti < 0 || e[3] === ti);

  const filtered = useMemo(
    () => events.filter((e) => matchExcept("")(e) && textHit(e)),
    [events, ci, si, ti, q, today, until] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const total = filtered.length;

  const optionList = (dim, idx, labelOf) => {
    const counts = new Map();
    for (const e of events) if (matchExcept(dim)(e) && e[idx] >= 0) counts.set(e[idx], (counts.get(e[idx]) || 0) + 1);
    return [...counts.entries()]
      .map(([i, n]) => ({ i, n, label: labelOf(i) }))
      .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
  };
  /* eslint-disable react-hooks/exhaustive-deps */
  const countryOptions = useMemo(() => optionList("c", 1, (i) => countries[i]), [events, si, ti, today, until]);
  const stateOptions = useMemo(() => optionList("s", 2, (i) => states[i].label), [events, ci, ti, today, until]);
  const cityOptions = useMemo(() => optionList("t", 3, (i) => cities[i].label), [events, ci, si, today, until]);
  /* eslint-enable react-hooks/exhaustive-deps */
  const countryChips = countryOptions.slice(0, 12);

  // ── Default view: the country directory ──────────────────────────────
  const countryCards = useMemo(() => {
    const byCountry = new Map();
    for (const e of events) {
      if (!inWindow(e)) continue;
      const k = norm(countries[e[1]]);
      const list = byCountry.get(k) || [];
      list.push(e[0]);
      byCountry.set(k, list);
    }
    const cards = directory.map((d) => {
      const dates = byCountry.get(norm(d.country)) || [];
      return {
        ...d,
        title: d.country,
        count: dates.length || d.count,
        bins: monthBins(dates, today),
        next: dates.reduce((m, x) => (x < m ? x : m), "9999-12-31"),
      };
    });
    return sortCards(cards, sort);
  }, [directory, events, countries, today, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtered view: matching places ───────────────────────────────────
  const placeCards = useMemo(() => {
    if (!filtering) return [];
    const groups = new Map();
    const add = (key, make, date) => {
      const g = groups.get(key) || { ...make(), dates: [] };
      g.dates.push(date);
      groups.set(key, g);
    };
    for (const e of filtered) {
      const country = countries[e[1]];
      const state = e[2] >= 0 ? states[e[2]].label : "";
      const city = e[3] >= 0 ? cities[e[3]].label : "";
      if (q && norm(country).includes(q)) add(`c|${e[1]}`, () => ({ level: "country", country, state: "", city: "" }), e[0]);
      if (q && state && norm(state).includes(q)) add(`s|${e[2]}`, () => ({ level: "state", country, state, city: "" }), e[0]);
      if (city) add(`t|${e[3]}`, () => ({ level: "city", country, state, city }), e[0]);
    }
    const cards = [...groups.values()].map((g) => {
      const title = g.city || g.state || g.country;
      const href =
        g.level === "city"
          ? landing.city.get(`${norm(g.country)}|${norm(g.city)}`) || exhibitionsHref(g)
          : g.level === "country" && landing.country.has(norm(g.country))
            ? countryLandingPath(landing.country.get(norm(g.country)))
            : exhibitionsHref(g);
      return {
        ...g,
        title,
        sub: g.level === "city" ? [g.state, g.country].filter(Boolean).join(", ") : g.level === "state" ? g.country : "Country",
        href,
        count: g.dates.length,
        bins: monthBins(g.dates, today),
        next: g.dates.reduce((m, x) => (x < m ? x : m), "9999-12-31"),
      };
    });
    const rank = { country: 0, state: 1, city: 2 };
    return sortCards(cards, sort)
      .sort((a, b) => (q ? rank[a.level] - rank[b.level] : 0))
      .slice(0, 60);
  }, [filtering, filtered, countries, states, cities, q, landing, today, sort]);

  /*
   * Where "Show" goes. /exhibitions filters by place only - it has no time window
   * and does not combine a text search with a location - so:
   *  - with a search, go to the top matching place (it already sits inside any
   *    dropdown choices, because the cards are built from the filtered events);
   *  - otherwise, the dropdown choices as they are.
   * The button shows a number only when the destination will show that same
   * number, i.e. no search and no time window.
   */
  const exactCount = !q && windowKey === "all";
  const showHref = (() => {
    if (q && placeCards[0]) return exhibitionsHref(placeCards[0]);
    if (ci >= 0 || si >= 0 || ti >= 0) {
      return exhibitionsHref({
        country: ci >= 0 ? countries[ci] : "",
        state: si >= 0 ? states[si].label : "",
        city: ti >= 0 ? cities[ti].label : "",
      });
    }
    const top = placeCards[0];
    return top ? exhibitionsHref(top) : PUBLIC_ROUTES.exhibitions;
  })();

  const reset = () => {
    setQuery("");
    setCi(-1);
    setSi(-1);
    setTi(-1);
    setWindowKey("all");
    setSort("count");
  };

  return (
    <div className="mt-10">
      {/* ── Controls ───────────────────────────────────────────────── */}
      <div className={explorerBar}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <ExplorerSearch
            id="location-search"
            inputRef={inputRef}
            value={query}
            onChange={setQuery}
            label="Search a city, state or country"
            placeholder="Search a city, state or country — e.g. Mumbai, Bavaria"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Segmented label="When" options={WINDOWS} value={windowKey} onChange={setWindowKey} />
            <Segmented label="Sort" options={SORTS} value={sort} onChange={setSort} />
          </div>
        </div>

        <div className="ox-rail -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Quick pick a country">
          <Chip active={ci < 0} onClick={() => setCi(-1)}>
            All countries
          </Chip>
          {countryChips.map((o) => (
            <Chip key={o.i} active={ci === o.i} onClick={() => setCi(ci === o.i ? -1 : o.i)}>
              {o.label}
              <span className={`tabular-nums ${ci === o.i ? "text-white/70" : "text-gray-400 dark:text-gray-500"}`}>{o.n}</span>
            </Chip>
          ))}
        </div>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <FilterSelect id="loc-country" icon={Globe2} label="Country" value={ci} onChange={setCi} options={countryOptions} placeholder="Any country" />
          <FilterSelect id="loc-state" icon={Landmark} label="State / region" value={si} onChange={setSi} options={stateOptions} placeholder="Any state" selectedLabel={si >= 0 ? states[si].label : ""} />
          <FilterSelect id="loc-city" icon={MapPin} label="City" value={ti} onChange={setTi} options={cityOptions} placeholder="Any city" selectedLabel={ti >= 0 ? cities[ti].label : ""} />
          <Link
            href={showHref}
            aria-disabled={filtering && total === 0}
            className={`inline-flex h-10 items-center justify-center gap-2 self-end rounded-xl bg-gradient-to-r from-[#131C55] to-[#2B3FB8] px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-900/25 transition hover:brightness-110 motion-reduce:transition-none dark:from-blue-600 dark:to-indigo-500 ${
              filtering && total === 0 ? "pointer-events-none opacity-50" : ""
            }`}
          >
            {!filtering ? "Show all" : exactCount ? `Show ${total.toLocaleString("en-US")}` : "Show exhibitions"}
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* ── Summary ────────────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
          {filtering ? (
            <>
              <strong className="text-gray-900 tabular-nums dark:text-white">{total.toLocaleString("en-US")}</strong> upcoming{" "}
              {total === 1 ? "exhibition matches" : "exhibitions match"}
              {win.months ? <> · {win.label.toLowerCase()}</> : null}
            </>
          ) : (
            <>
              <strong className="text-gray-900 dark:text-white">{directory.length}</strong> countries ·{" "}
              <strong className="text-gray-900 dark:text-white">{directory.reduce((n, d) => n + d.cities.length, 0)}</strong> cities with their own page
            </>
          )}
        </p>
        {filtering ? (
          <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-sm font-semibold text-[#2B3FB8] hover:underline dark:text-blue-300">
            <X size={14} aria-hidden="true" />
            Reset filters
          </button>
        ) : null}
      </div>

      {/* ── Results ────────────────────────────────────────────────── */}
      {filtering ? (
        placeCards.length ? (
          <ul className="mt-4 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {placeCards.map((c) => {
              const Icon = c.level === "country" ? Globe2 : c.level === "state" ? Landmark : MapPin;
              return (
                <li key={`${c.level}|${c.country}|${c.state}|${c.city}`}>
                  <Link
                    href={c.href}
                    className="ox-card ox-card-accent group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 hover:border-[#2B3FB8]/30 hover:shadow-xl hover:shadow-indigo-900/10 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-400/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
                        <Icon size={20} aria-hidden="true" />
                      </span>
                      <span className="text-right">
                        <span className="block text-2xl leading-none font-extrabold text-gray-900 tabular-nums dark:text-white">{c.count}</span>
                        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">upcoming</span>
                      </span>
                    </div>
                    <h2 className="mt-4 truncate text-base font-semibold text-gray-900 transition group-hover:text-[#2B3FB8] motion-reduce:transition-none dark:text-gray-50 dark:group-hover:text-blue-200">
                      <Highlight text={c.title} query={q} />
                    </h2>
                    <p className="mt-0.5 truncate text-[13px] text-gray-500 dark:text-gray-400">{c.sub}</p>
                    <div className="mt-auto pt-5">
                      <MiniBars bins={c.bins} today={today} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-14 text-center dark:border-gray-700 dark:bg-gray-900/50">
            <p className="text-[15px] font-semibold text-gray-900 dark:text-white">No upcoming exhibitions match.</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Try a different spelling, a wider time window, or clear a filter.</p>
            <button
              type="button"
              onClick={reset}
              className="mt-4 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:border-[#2B3FB8] hover:text-[#2B3FB8] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              Reset filters
            </button>
          </div>
        )
      ) : (
        <ul className="mt-4 grid list-none gap-4 md:grid-cols-2">
          {countryCards.map((c) => (
            <li key={c.slug}>
              <section
                aria-labelledby={`country-${c.slug}`}
                className="ox-card ox-card-accent group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 hover:border-[#2B3FB8]/30 hover:shadow-xl hover:shadow-indigo-900/10 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-400/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gray-100 text-2xl dark:bg-gray-800" aria-hidden="true">
                      {c.flag || <Globe2 size={20} className="text-[#2B3FB8] dark:text-blue-300" />}
                    </span>
                    <h2 id={`country-${c.slug}`} className="min-w-0 truncate text-lg font-bold text-gray-900 dark:text-white">
                      <Link href={countryLandingPath(c.slug)} className="underline-offset-4 hover:text-[#2B3FB8] hover:underline dark:hover:text-blue-300">
                        <span className="sr-only">Exhibitions in </span>
                        {c.country}
                      </Link>
                    </h2>
                  </div>
                  <span className="text-right">
                    <span className="block text-2xl leading-none font-extrabold text-gray-900 tabular-nums dark:text-white">{c.count}</span>
                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">upcoming</span>
                  </span>
                </div>

                <div className="mt-4">
                  <MiniBars bins={c.bins} today={today} />
                </div>

                {c.cities.length ? (
                  <ul className="mt-4 flex list-none flex-wrap gap-1.5">
                    {c.cities.map((city) => (
                      <li key={city.slug}>
                        <Link
                          href={cityLandingPath(city.countrySlug, city.slug)}
                          className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:border-[#2B3FB8]/40 hover:bg-white hover:text-[#2B3FB8] motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:border-blue-400/40 dark:hover:bg-blue-400/10 dark:hover:text-white"
                        >
                          <span className="sr-only">Exhibitions in </span>
                          {city.city}
                          <span className="text-gray-400 tabular-nums dark:text-gray-500">{city.count}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-[13px] text-gray-500 dark:text-gray-400">Listings are spread across smaller cities.</p>
                )}

                <Link
                  href={countryLandingPath(c.slug)}
                  className="mt-4 inline-flex w-fit items-center gap-1 text-sm font-semibold text-[#2B3FB8] dark:text-blue-300"
                >
                  All exhibitions in {c.country}
                  <ArrowRight size={15} aria-hidden="true" className="transition group-hover:translate-x-0.5 motion-reduce:transform-none" />
                </Link>
              </section>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterSelect({ id, icon: Icon, label, value, onChange, options, placeholder, selectedLabel }) {
  // A choice another filter has since ruled out stays visible (count 0) rather
  // than the select silently showing a different option than it filters by.
  const list = value >= 0 && !options.some((o) => o.i === value) ? [{ i: value, n: 0, label: selectedLabel || "Selected" }, ...options] : options;
  return (
    <div>
      <label htmlFor={id} className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
        <Icon size={12} aria-hidden="true" />
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-10 w-full cursor-pointer rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 transition focus:border-[#2B3FB8] focus:ring-4 focus:ring-[#2B3FB8]/15 focus:outline-none motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
      >
        <option value={-1}>{placeholder}</option>
        {list.map((o) => (
          <option key={o.i} value={o.i}>
            {o.label} ({o.n})
          </option>
        ))}
      </select>
    </div>
  );
}
