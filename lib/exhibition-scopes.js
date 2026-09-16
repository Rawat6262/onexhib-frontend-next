/**
 * The exhibition scope vocabulary, shared by the server and the browser.
 *
 * WHY THIS IS ITS OWN MODULE
 * SearchBar is a client component and has to know which scope it is searching
 * in, so that a search started on the Past exhibitions tab stays in the past.
 * lib/public-api.js is explicitly server-only — it reads BACKEND_URL from the
 * environment — so importing the vocabulary from there would drag the whole
 * data layer, and that env read, into the browser bundle. These are plain
 * strings with no dependencies and are safe on both sides.
 *
 * `all` is a FRONTEND concept. The backend has three search endpoints
 * (/upcomingsearch, /ongoingsearch, /previoussearch) and no combined one;
 * searching "all" fans out across the three. It applies to search only —
 * there is no combined listing to browse.
 */

/** Scopes that map 1:1 to a backend endpoint, in tab order. */
export const SCOPE_KEYS = Object.freeze(["upcoming", "ongoing", "previous"]);

/** The "don't restrict by date" pseudo-scope. Search only. */
export const ALL_SCOPE = "all";

/** Everything a `?scope=` value is allowed to be on a search. */
export const SEARCHABLE_SCOPES = Object.freeze([...SCOPE_KEYS, ALL_SCOPE]);

/** Short labels for tabs and chips. */
export const SCOPE_LABELS = Object.freeze({
  upcoming: "Upcoming exhibitions",
  ongoing: "Ongoing exhibitions",
  previous: "Past exhibitions",
  [ALL_SCOPE]: "All exhibitions",
});

/** What the search box promises to look through, in the placeholder. */
export const SCOPE_SEARCH_HINTS = Object.freeze({
  upcoming: "Search upcoming exhibitions",
  ongoing: "Search exhibitions happening now",
  previous: "Search past exhibitions",
  [ALL_SCOPE]: "Search all exhibitions",
});

/** The scope used when none was asked for, or an unknown one was. */
export const DEFAULT_SCOPE = "upcoming";

/** True for a real backend scope. `all` is not one. */
export function isBackendScope(value) {
  return SCOPE_KEYS.includes(value);
}

/** True for anything a search may be scoped to, including `all`. */
export function isSearchableScope(value) {
  return SEARCHABLE_SCOPES.includes(value);
}

/**
 * Turn a raw `?scope=` value into one the page can actually render.
 *
 * The rule depends on whether there is a keyword, and that distinction is the
 * whole fix:
 *
 *  - BROWSING (no keyword) with no scope chosen → the default listing.
 *    `all` cannot apply: there is no combined listing endpoint, so browsing it
 *    would render an empty page.
 *
 *  - SEARCHING (keyword) with no scope chosen → every scope. Nothing was
 *    selected, so nothing should be excluded. Quietly restricting an unscoped
 *    search to `upcoming` is what made the site look like it did not hold
 *    records that were sitting in the archive, and it silently broke every
 *    existing /exhibitions?search=… link.
 *
 *  - An EXPLICIT scope always wins. `?scope=upcoming&search=x` means upcoming.
 */
export function resolveScope(rawScope, search) {
  const hasSearch = Boolean(String(search || "").trim());
  if (!isSearchableScope(rawScope)) return hasSearch ? ALL_SCOPE : DEFAULT_SCOPE;
  if (rawScope === ALL_SCOPE && !hasSearch) return DEFAULT_SCOPE;
  return rawScope;
}
