/**
 * Tests for scoped exhibition search.
 *
 * THE BUG THESE EXIST FOR
 * The search box submitted `search` alone. /exhibitions treats a missing scope
 * as `upcoming`, so a search started on the Ongoing or Past tab silently became
 * an upcoming-only search: a visitor looking for MICAM — which is in the
 * archive — was told "no exhibitions matched", and reasonably concluded the
 * site did not have it.
 *
 * What is covered here is the pure half: the scope vocabulary and the
 * resolution rule. The fan-out in searchAllScopes talks to three HTTP
 * endpoints, so it is verified against the running site instead of mocked into
 * a shape that could drift from the real one.
 *
 * Run: npm run test:seo
 */
import {
  ALL_SCOPE,
  DEFAULT_SCOPE,
  SCOPE_KEYS,
  SCOPE_LABELS,
  SCOPE_SEARCH_HINTS,
  SEARCHABLE_SCOPES,
  isBackendScope,
  isSearchableScope,
  resolveScope,
} from "../lib/exhibition-scopes.js";

let failed = 0;
function check(name, ok, detail = "") {
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

console.log("search scope: vocabulary");

check("three real backend scopes", SCOPE_KEYS.length === 3, SCOPE_KEYS.join(","));
check(
  "the backend scopes are exactly the three endpoints that exist",
  ["upcoming", "ongoing", "previous"].every((s) => SCOPE_KEYS.includes(s))
);
check(
  "`all` is NOT a backend scope — there is no combined endpoint",
  !SCOPE_KEYS.includes(ALL_SCOPE) && !isBackendScope(ALL_SCOPE)
);
check("`all` IS searchable", isSearchableScope(ALL_SCOPE));
check("searchable = the three plus all", SEARCHABLE_SCOPES.length === 4);
check(
  "every searchable scope has a label and a placeholder hint",
  SEARCHABLE_SCOPES.every((s) => SCOPE_LABELS[s] && SCOPE_SEARCH_HINTS[s])
);
check("the default scope is a real one", isBackendScope(DEFAULT_SCOPE), DEFAULT_SCOPE);

console.log("");
console.log("search scope: resolution");

// The regression itself. A scope that arrives with a search must survive.
for (const s of SCOPE_KEYS) {
  check(`${s} + a search stays ${s}`, resolveScope(s, "micam") === s, resolveScope(s, "micam"));
}
check("all + a search stays all", resolveScope(ALL_SCOPE, "micam") === ALL_SCOPE);

// `all` has no listing behind it, so browsing it must not render an empty page.
check("all + no search falls back", resolveScope(ALL_SCOPE, "") === DEFAULT_SCOPE);
check("all + whitespace-only search falls back", resolveScope(ALL_SCOPE, "   ") === DEFAULT_SCOPE);
check("all + undefined search falls back", resolveScope(ALL_SCOPE, undefined) === DEFAULT_SCOPE);

// A real scope with no keyword is a browsable listing and must NOT fall back.
check("previous + no search stays previous", resolveScope("previous", "") === "previous");
check("ongoing + no search stays ongoing", resolveScope("ongoing", "") === "ongoing");

// Nothing selected + a keyword = search everything. This is the rule that
// makes an old /exhibitions?search=… link, and the homepage box, behave.
const JUNK = ["", null, undefined, "UPCOMING", "past", "everything", "../previous", 7, {}];
for (const bad of JUNK) {
  check(
    `no/unknown scope + a search widens to all: ${JSON.stringify(bad)}`,
    resolveScope(bad, "micam") === ALL_SCOPE,
    String(resolveScope(bad, "micam"))
  );
}

// But with no keyword there is nothing to widen — `all` has no listing.
for (const bad of JUNK) {
  check(
    `no/unknown scope + no search browses the default: ${JSON.stringify(bad)}`,
    resolveScope(bad, "") === DEFAULT_SCOPE,
    String(resolveScope(bad, ""))
  );
}

// An explicit choice always beats the widening rule.
check("explicit upcoming + search stays narrow", resolveScope("upcoming", "micam") === "upcoming");

console.log("");
console.log("search scope: the shape SearchBar relies on");

// SearchBar defaults to ALL_SCOPE so the homepage box, where no tab is
// selected, cannot hide a match in a scope the visitor did not pick.
check("all is a valid value for the hidden scope field", isSearchableScope(ALL_SCOPE));
check(
  "no scope key contains a character needing URL escaping",
  SEARCHABLE_SCOPES.every((s) => encodeURIComponent(s) === s)
);

console.log("");
console.log(failed ? `=== ${failed} FAILED ===` : "=== all passed ===");
process.exit(failed ? 1 : 0);
