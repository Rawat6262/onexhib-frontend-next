"use client";

import { useMemo, useState } from "react";
import { ArrowDownAZ, RotateCcw, Search, X } from "lucide-react";

import ServiceProviderCard from "@/components/public/ServiceProviderCard";
// From lib/service-alphabet.js, NOT lib/services.js: the latter reads the
// server-only data layer, which throws if it reaches the browser. Both sides
// bucket names with this one function so a facet chip can never select nothing.
import { alphabetBucket } from "@/lib/service-alphabet";
// Pure string helper, no server-only reach - the same module routes.js uses in the
// browser. Here it only makes a subcategory name safe to use as a DOM id.
import { slugifyName } from "@/lib/slug";

/**
 * The filtered provider grid on a service category page.
 *
 * WHY THE FILTERS ARE CLIENT-SIDE AND NOT IN THE URL. The page is server
 * rendered with the category's full provider list already in the markup, and
 * these controls only hide rows from it. That matters three ways:
 *
 *   - A crawler sees every provider. URL-driven filters would instead mint a
 *     crawlable page per letter, per city and now per speciality — roughly
 *     26 x 40 x 8 near-duplicate URLs for one category, each a thin slice of a
 *     page that already exists. Adding the speciality filter multiplied that
 *     hazard by eight and cost nothing, precisely because the state is local.
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
export default function ServiceDirectory({
  providers,
  letters,
  states,
  cities,
  /*
   * The subcategories that actually have providers here, already counted and in
   * taxonomy order by facetSubcategories() in lib/services.js. Defaulted to [] so
   * a caller that does not pass them renders exactly the previous three filters.
   */
  subcategories = [],
}) {
  // "" means no filter, for all of them. Null would need an extra check at every use.
  const [letter, setLetter] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  /*
   * THE SPECIALITY FILTER IS FIRST IN THE UI AND FIRST IN THE PREDICATE, because it
   * is the one a visitor actually came with: somebody on the stall-fabrication page
   * wants a double-decker stall, and narrowing by that matters more to them than
   * narrowing by letter. The alphabet was the primary filter only because it was the
   * only one that existed for a 132-provider page.
   */
  const [subcategory, setSubcategory] = useState("");
  /*
   * Searching by NAME is the common case on a directory this size - somebody arrives
   * with a supplier already in mind. It used to be expressible only as "pick the
   * letter it starts with", which is 27 buttons to answer a question a text field
   * answers better and in a tenth of the space.
   */
  const [query, setQuery] = useState("");
  /* The alphabet strip is collapsed until asked for - see the toolbar note. */
  const [showLetters, setShowLetters] = useState(false);

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

  const filtered = useMemo(() => {
    // Lowercased once, not per provider: this runs on every keystroke over a list
    // that can be several hundred long.
    const needle = query.trim().toLowerCase();
    return providers.filter((provider) => {
      if (subcategory && (provider.subcategory || "").trim() !== subcategory) return false;
      if (letter && alphabetBucket(provider.name) !== letter) return false;
      if (state && (provider.state || "").trim() !== state) return false;
      if (city && (provider.city || "").trim() !== city) return false;
      /*
       * Substring, not prefix. People remember a distinctive word from the middle of
       * a business name ("wrappings", "signage") far more reliably than its first
       * letter - which is also why this complements the A-Z strip rather than
       * replacing it.
       */
      if (needle && !(provider.name || "").toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [providers, subcategory, letter, state, city, query]);

  const isFiltered = Boolean(subcategory || letter || state || city || query.trim());

  /*
   * The visible providers divided into one section per speciality.
   *
   * ORDER IS THE FACET'S ORDER, which lib/services.js already put in taxonomy
   * order - so the sections read bespoke-to-standard rather than shuffling as
   * counts change. Providers who named no speciality go in a trailing group rather
   * than being dropped: this is a directory, and hiding a third of it behind a
   * division they never opted into would be the worst possible reading of
   * "divide by speciality".
   *
   * Empty groups are filtered out, so narrowing to one city does not leave a column
   * of headings with nothing under them.
   */
  const groups = useMemo(() => {
    const bySub = new Map(subcategories.map((s) => [s.value, []]));
    const unspecified = [];

    for (const provider of filtered) {
      const value = (provider.subcategory || "").trim();
      const bucket = value && bySub.has(value) ? bySub.get(value) : unspecified;
      bucket.push(provider);
    }

    /*
     * `key` is the React key and the DOM id, so it is SLUGGED rather than used raw.
     * A subcategory is display text with spaces and slashes in it ("Catalog
     * Printing", "Anchor / Emcee"), and an id with a space in it breaks the
     * aria-labelledby below: that attribute is a space-separated LIST of ids, so
     * "group-Catalog Printing" resolves to two ids, neither of which exists, and the
     * section silently loses its accessible name. `label` keeps the real text.
     */
    const named = [...bySub.entries()]
      .filter(([, list]) => list.length)
      .map(([value, list]) => ({
        key: slugifyName(value) || "speciality",
        label: value,
        providers: list,
      }));

    return unspecified.length
      ? [
          ...named,
          {
            key: "unspecified",
            // Not "Other": these providers did not choose a lesser speciality, they
            // have not named one at all, and the heading should not imply otherwise.
            label: "Speciality not stated",
            providers: unspecified,
          },
        ]
      : named;
  }, [filtered, subcategories]);

  /*
   * Group only when there is a real division to draw: at least two sections, and no
   * speciality already selected (that selection IS the division). One section means
   * the headings would just repeat what the page title already says.
   */
  const grouped = !subcategory && groups.length > 1;

  /*
   * Whether a card should repeat its speciality.
   *
   * Not when the grid is GROUPED - the section heading above it already says it, and
   * printing it again put "Catalog Printing" on 132 consecutive cards under a heading
   * reading CATALOG PRINTING.
   *
   * Not when the page holds only ONE speciality either: every card would carry the
   * same word, which is a column of noise rather than a distinction. That is the
   * common case right now, since most categories are entirely "General".
   *
   * What is left is the case where it earns its place: a flat grid drawn from a page
   * that really does hold several specialities.
   */
  const showSpeciality = !grouped && subcategories.length > 1;

  // Changing state clears a city that belonged to the old one, which would
  // otherwise leave a filter active that the visible dropdown no longer offers.
  const handleState = (value) => {
    setState(value);
    setCity("");
  };

  const clearAll = () => {
    setSubcategory("");
    setLetter("");
    setState("");
    setCity("");
    setQuery("");
  };

  /*
   * What is currently narrowing the list, as one removable chip each.
   *
   * Built here rather than in the markup so the row renders nothing at all when no
   * filter is set - and so each chip carries its own clear function, which is what
   * lets a visitor drop one filter without losing the other three.
   */
  const activeFilters = [
    subcategory && { key: "sub", label: subcategory, clear: () => setSubcategory("") },
    letter && { key: "letter", label: `Starts with ${letter}`, clear: () => setLetter("") },
    state && { key: "state", label: state, clear: () => setState("") },
    city && { key: "city", label: city, clear: () => setCity("") },
    query.trim() && { key: "query", label: `"${query.trim()}"`, clear: () => setQuery("") },
  ].filter(Boolean);

  return (
    <div>
      {/*
        ONE TOOLBAR ROW, NOT A PANEL.

        This was a 300px bordered block: a wrapped row of speciality chips, a 27-button
        alphabet, and two full-width selects - all of it above the first provider, on a
        page whose entire purpose is the providers. Every control was expanded all the
        time, so the page paid for the alphabet whether or not anyone wanted to scan by
        letter.

        The rule here is that a control costs space in proportion to how often it is
        used. Searching by name is the common case, so it gets a real input. Narrowing
        by speciality or place is occasional, so each is one compact select. Jumping by
        letter is rare and bulky, so it collapses behind a toggle and costs one button
        until someone asks for it.

        Everything still filters client-side, with no URL state - see the note at the
        top of this file for why that matters on a page like this.
      */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-2 p-2">
          {/* SEARCH. The primary control, so it takes the leftover width rather than a
              fixed one - on a phone it is the whole first line. */}
          <div className="relative min-w-50 flex-1">
            <Search
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${providers.length} ${providers.length === 1 ? "provider" : "providers"}`}
              aria-label="Search providers by name"
              className="h-9 w-full rounded-lg border border-transparent bg-gray-50 pl-9 pr-3 text-[13px] text-gray-900 placeholder-gray-400 transition focus:border-[#131C55]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#131C55]/15 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-400/40 dark:focus:bg-gray-800 dark:focus:ring-blue-400/20"
            />
          </div>

          {/* The selects sit together on the right, each only as wide as its content.
              A select that is absent is a filter with nothing to choose - a category
              in one city should not show a city dropdown at all. */}
          {subcategories.length > 1 ? (
            <CompactSelect
              id="filter-speciality"
              label="Speciality"
              value={subcategory}
              onChange={setSubcategory}
              allLabel="All specialities"
              options={subcategories}
            />
          ) : null}
          {states.length ? (
            <CompactSelect
              id="filter-state"
              label="State"
              value={state}
              onChange={handleState}
              allLabel="All states"
              options={states}
            />
          ) : null}
          {cityOptions.length ? (
            <CompactSelect
              id="filter-city"
              label="City"
              value={city}
              onChange={setCity}
              allLabel={state ? `All cities in ${state}` : "All cities"}
              options={cityOptions}
            />
          ) : null}

          {/* A-Z is a disclosure, not a row. Collapsed it is one button; the strip
              below only exists while someone is using it. It stays available because
              scanning a directory for a remembered name is a real way people use this
              page - it is just not the common one. */}
          {letters.length > 1 ? (
            <button
              type="button"
              onClick={() => setShowLetters((v) => !v)}
              aria-expanded={showLetters}
              aria-controls="letter-strip"
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none ${
                letter || showLetters
                  ? "border-[#131C55]/30 bg-[#131C55]/5 text-[#131C55] dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-300"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-gray-100"
              }`}
            >
              <ArrowDownAZ size={14} aria-hidden="true" />
              {/* The active letter shows on the collapsed button, so a filter can
                  never be hidden by the thing that collapses it. */}
              {letter || "A–Z"}
            </button>
          ) : null}
        </div>

        {showLetters && letters.length > 1 ? (
          <div
            id="letter-strip"
            className="flex flex-wrap gap-1 border-t border-gray-100 px-2 pb-2 pt-2 dark:border-gray-800"
          >
            <LetterChip active={!letter} onClick={() => setLetter("")} label="All names">
              All
            </LetterChip>
            {letters.map((option) => (
              <LetterChip
                key={option}
                active={letter === option}
                onClick={() => setLetter(letter === option ? "" : option)}
                /* "#" is not self-explanatory next to A-Z. */
                label={option === "#" ? "Names starting with a number or symbol" : `Names starting with ${option}`}
              >
                {option}
              </LetterChip>
            ))}
          </div>
        ) : null}
      </div>

      {/*
        The count line, and the active filters as removable chips.

        The chips matter more than they look: with the controls collapsed into selects
        and a disclosure, "why am I seeing 12 of 381?" has to be answerable without
        reopening anything. Each chip names its filter and removes just that one, which
        is the thing a single "Clear filters" button cannot do.

        When nothing is active this is one line of text - the row costs no more than
        the count did before.
      */}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
          Showing{" "}
          <strong className="font-semibold text-gray-900 dark:text-gray-100">
            {filtered.length}
          </strong>{" "}
          of {providers.length} {providers.length === 1 ? "provider" : "providers"}
        </p>

        {activeFilters.length ? (
          <>
            <span className="h-4 w-px bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
            <ul className="flex flex-wrap items-center gap-1.5">
              {activeFilters.map((f) => (
                <li key={f.key}>
                  <button
                    type="button"
                    onClick={f.clear}
                    aria-label={`Remove filter: ${f.label}`}
                    className="inline-flex items-center gap-1 rounded-md bg-[#131C55]/8 py-1 pl-2 pr-1.5 text-[12px] font-medium text-[#131C55] transition hover:bg-[#131C55]/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:bg-blue-400/10 dark:text-blue-300 dark:hover:bg-blue-400/20"
                  >
                    {f.label}
                    <X size={12} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-gray-500 underline-offset-2 transition hover:text-gray-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:text-gray-400 dark:hover:text-gray-100"
            >
              <RotateCcw size={12} aria-hidden="true" />
              Clear all
            </button>
          </>
        ) : null}
      </div>

      {filtered.length ? (
        /*
         * TWO LAYOUTS, chosen by whether a division is worth drawing.
         *
         * GROUPED, when the category has providers under more than one speciality
         * and no speciality filter is active: the page divides into a section per
         * speciality, in taxonomy order, with the providers who named none in a
         * clearly-labelled section at the end. That is what makes a 381-provider
         * printing page navigable - "Catalog Printing (132)" is a heading a visitor
         * can scroll to, which a flat alphabetical grid of 381 cards never offers.
         *
         * FLAT, when a speciality IS selected (the division would be one section
         * repeating the chip above it) or when the category has nothing to divide
         * by. Most categories are in the second case today, because only the 132
         * migrated catalogue printers carry a speciality so far - the page simply
         * looks as it did, and starts dividing itself as providers fill the field
         * in.
         *
         * The letter/state/city filters apply either way: the groups are built from
         * `filtered`, not from the full list.
         */
        grouped ? (
          <div className="mt-5 space-y-10">
            {groups.map((group, groupIndex) => (
              <section key={group.key} aria-labelledby={`group-${group.key}`}>
                <h3
                  id={`group-${group.key}`}
                  className="flex items-baseline gap-2 border-b border-gray-200 pb-2 text-sm font-semibold uppercase tracking-wide text-gray-900 dark:border-gray-800 dark:text-gray-100"
                >
                  {group.label}
                  <span className="text-xs font-medium normal-case text-gray-500 dark:text-gray-400">
                    {group.providers.length}{" "}
                    {group.providers.length === 1 ? "provider" : "providers"}
                  </span>
                </h3>
                <ul className="mt-4 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {group.providers.map((provider, i) => (
                    <li key={provider.id}>
                      {/* Eager only for the first row of the FIRST group: those are
                          the only cards above the fold. */}
                      <ServiceProviderCard
                        provider={provider}
                        priority={!isFiltered && groupIndex === 0 && i < 4}
                        showSpeciality={showSpeciality}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <ul className="mt-5 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((provider, i) => (
              <li key={provider.id}>
                {/* Eager only for the first row, and only unfiltered: after a
                    filter the user has already scrolled past the fold. */}
                <ServiceProviderCard
                  provider={provider}
                  priority={!isFiltered && i < 4}
                  showSpeciality={showSpeciality}
                />
              </li>
            ))}
          </ul>
        )
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-gray-300 px-5 py-10 text-center text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
          No providers match these filters. Try clearing one of them.
        </p>
      )}
    </div>
  );
}

/** One letter in the collapsible A-Z strip. Square, dense, and only ever shown there. */
function LetterChip({ active, onClick, children, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      /* aria-pressed, not just a colour change: a toggle that only reads as
         selected visually is not selected as far as a screen reader is concerned. */
      aria-pressed={active}
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-[12px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none ${
        active
          ? "bg-[#131C55] text-white dark:bg-blue-500"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * A select sized to its content, for the toolbar row.
 *
 * NO VISIBLE LABEL, unlike the version this replaces, which stacked an uppercase
 * caption above a full-width control and spent two lines on each. The default option
 * says what the filter is ("All states"), so the caption was repeating it; the real
 * label survives as aria-label for anyone who cannot see that text.
 *
 * Still a native <select>: keyboard accessible for free, and on a phone it opens the
 * platform picker, which beats any custom listbox for a list this long.
 *
 * `w-auto` is the whole point - a city filter for a category present in three cities
 * has no business being as wide as one covering forty.
 */
function CompactSelect({ id, label, value, onChange, allLabel, options }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className={`h-9 w-auto max-w-47.5 shrink-0 rounded-lg border bg-white px-2.5 text-[13px] transition focus:outline-none focus:ring-2 focus:ring-[#131C55]/15 dark:bg-gray-900 ${
        value
          ? "border-[#131C55]/30 font-medium text-[#131C55] dark:border-blue-400/30 dark:text-blue-300"
          : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-800 dark:text-gray-400 dark:hover:border-gray-700"
      }`}
    >
      <option value="">{allLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.value} ({option.count})
        </option>
      ))}
    </select>
  );
}
