"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";

import ServiceProviderCard from "@/components/public/ServiceProviderCard";
// From lib/service-alphabet.js, NOT lib/services.js: the latter reads the
// server-only data layer, which throws if it reaches the browser. Both sides
// bucket names with this one function so a facet chip can never select nothing.
import { alphabetBucket } from "@/lib/service-alphabet";

/**
 * The filtered provider grid on a service category page.
 *
 * WHY THE FILTERS ARE CLIENT-SIDE AND NOT IN THE URL. The page is server
 * rendered with the category's full provider list already in the markup, and
 * these controls only hide rows from it. That matters three ways:
 *
 *   - A crawler sees every provider. URL-driven filters would instead mint a
 *     crawlable page per letter and per city — roughly 26 x 40 near-duplicate
 *     URLs for one category, each a thin slice of a page that already exists.
 *     That is the duplicate-content pattern the location and industry tiers are
 *     carefully built to avoid, and it would be self-inflicted here.
 *   - Filtering is instant, with no request and no scroll reset. The largest
 *     category is a little over a hundred providers, so the whole set is already on
 *     the client.
 *   - Nothing can 404. There is no state here that a hand-edited URL could put
 *     into a combination with no results and no way back.
 *
 * The cost is that a filtered view cannot be linked to or shared. For a
 * directory someone scans once while shortlisting suppliers, that is the right
 * side of the trade; if sharing a filtered view ever matters, the state moves to
 * searchParams and the filtered URLs get a noindex.
 *
 * STATE IS DERIVED, NOT MIRRORED. The filtered list is computed from the two
 * selections on every render rather than kept in its own state, so there is no
 * second copy that can disagree with the controls.
 */
export default function ServiceDirectory({ providers, letters, states, cities }) {
  // "" means no filter, for both. Null would need an extra check at every use.
  const [letter, setLetter] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");

  /*
   * City options follow the chosen state, so the dropdown cannot offer a
   * combination with no results — picking Punjab then Ludhiana is always a real
   * pair. With all 40-odd cities listed at once, most pairs would be empty.
   */
  const cityOptions = useMemo(() => {
    if (!state) return cities;
    const counts = new Map();
    for (const provider of providers) {
      if ((provider.state || "").trim() !== state) continue;
      const value = (provider.city || "").trim();
      if (!value) continue;
      counts.set(value, (counts.get(value) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  }, [providers, cities, state]);

  const filtered = useMemo(
    () =>
      providers.filter((provider) => {
        if (letter && alphabetBucket(provider.name) !== letter) return false;
        if (state && (provider.state || "").trim() !== state) return false;
        if (city && (provider.city || "").trim() !== city) return false;
        return true;
      }),
    [providers, letter, state, city]
  );

  const isFiltered = Boolean(letter || state || city);

  // Changing state clears a city that belonged to the old one, which would
  // otherwise leave a filter active that the visible dropdown no longer offers.
  const handleState = (value) => {
    setState(value);
    setCity("");
  };

  const clearAll = () => {
    setLetter("");
    setState("");
    setCity("");
  };

  return (
    <div>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-900">
        {/* ALPHABET. Only the buckets that exist are offered — a row of 26
            letters where half return nothing is a row of dead ends. */}
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Filter by name
          </legend>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <FilterChip active={!letter} onClick={() => setLetter("")}>
              All
            </FilterChip>
            {letters.map((option) => (
              <FilterChip
                key={option}
                active={letter === option}
                onClick={() => setLetter(letter === option ? "" : option)}
                /* "#" is not self-explanatory next to A-Z. */
                label={option === "#" ? "Names starting with a number or symbol" : `Names starting with ${option}`}
              >
                {option}
              </FilterChip>
            ))}
          </div>
        </fieldset>

        {states.length ? (
          <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row dark:border-gray-800">
            <SelectFilter
              id="filter-state"
              label="State"
              value={state}
              onChange={handleState}
              allLabel="All states"
              options={states}
            />
            <SelectFilter
              id="filter-city"
              label="City"
              value={city}
              onChange={setCity}
              allLabel={state ? `All cities in ${state}` : "All cities"}
              options={cityOptions}
            />
          </div>
        ) : null}
      </div>

      {/* The count is live and always shown, so a filter that removes most of the
          list says so plainly instead of looking like a page that failed. */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
          Showing{" "}
          <strong className="font-semibold text-gray-900 dark:text-gray-100">
            {filtered.length}
          </strong>{" "}
          of {providers.length} {providers.length === 1 ? "provider" : "providers"}
        </p>
        {isFiltered ? (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 transition hover:border-[#131C55]/40 hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-white"
          >
            <RotateCcw size={13} aria-hidden="true" />
            Clear filters
          </button>
        ) : null}
      </div>

      {filtered.length ? (
        <ul className="mt-5 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((provider, i) => (
            <li key={provider.id}>
              {/* Eager only for the first row, and only unfiltered: after a
                  filter the user has already scrolled past the fold. */}
              <ServiceProviderCard provider={provider} priority={!isFiltered && i < 4} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-gray-300 px-5 py-10 text-center text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
          No providers match these filters. Try clearing one of them.
        </p>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      /* aria-pressed, not just a colour change: a toggle that only reads as
         selected visually is not selected as far as a screen reader is concerned. */
      aria-pressed={active}
      className={`inline-flex min-w-8 items-center justify-center rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none ${
        active
          ? "bg-[#131C55] text-white dark:bg-blue-500"
          : "border border-gray-200 bg-white text-gray-700 hover:border-[#131C55]/40 hover:text-[#131C55] dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function SelectFilter({ id, label, value, onChange, allLabel, options }) {
  return (
    <div className="flex-1">
      <label
        htmlFor={id}
        className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
      >
        {label}
      </label>
      {/* A native <select>: it is keyboard accessible for free, and on a phone it
          opens the platform picker, which beats any custom listbox for a list
          this long. */}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#131C55] focus:outline-none focus:ring-2 focus:ring-[#131C55]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.value} ({option.count})
          </option>
        ))}
      </select>
    </div>
  );
}
