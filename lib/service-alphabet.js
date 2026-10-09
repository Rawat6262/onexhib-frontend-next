/**
 * How a provider name is sorted and bucketed, shared by the server and the
 * browser.
 *
 * WHY THIS IS ITS OWN MODULE
 * The category page sorts providers and builds the alphabet facet on the server;
 * ServiceDirectory is a client component and has to bucket the same names again
 * to filter them. lib/services.js reads lib/public-api.js, which is explicitly
 * server-only — it throws if it is imported in the browser — so taking these two
 * functions from there would drag the whole data layer into the client bundle.
 * These are pure string functions with no dependencies and are safe on both
 * sides. Same reasoning as lib/exhibition-scopes.js.
 *
 * Both sides MUST use these rather than reimplementing the rule: a letter facet
 * built with one definition and filtered with another produces a chip that
 * selects nothing, which looks like a broken page and is invisible in testing
 * unless the data happens to contain an awkward name.
 */

/**
 * The comparable form of a provider name.
 *
 * Case-folded so "we print" and "We Print" sort together, and leading
 * punctuation and whitespace are dropped so names stored as `"Raina Creation's"`
 * or `" Print India"` sort under their first letter instead of ahead of A.
 * These are provider-typed strings straight out of a signup form, so neither
 * case is hypothetical — both are in the live data.
 */
export function serviceSortKey(name) {
  return String(name || "")
    .trim()
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .toLowerCase();
}

/**
 * The alphabet bucket a provider falls in: "A".."Z", or "#".
 *
 * "#" collects every name that does not begin with a Latin letter — digits
 * ("5 Star Signage") and any non-Latin script. Without it those providers would
 * be unreachable through the alphabet filter, which is a worse outcome than one
 * bucket with a blunt label.
 */
export function alphabetBucket(name) {
  const first = serviceSortKey(name).charAt(0).toUpperCase();
  return first >= "A" && first <= "Z" ? first : "#";
}

/** Alphabetical, numeric-aware so "Print 2" sorts before "Print 10". */
export function compareServiceNames(a, b) {
  return serviceSortKey(a).localeCompare(serviceSortKey(b), undefined, { numeric: true });
}
