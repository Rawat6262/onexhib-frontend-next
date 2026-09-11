/**
 * Integrity tests for the duplicate-exhibition redirect map.
 *
 * WHY THIS EXISTS AS A TEST RATHER THAN A ONE-OFF SCRIPT
 * The map has grown in six reviewed batches to 78 entries, and every batch has
 * been validated by hand with an ad-hoc script that was then thrown away. The
 * failure modes are specific and silent: a chain (A -> B where B is itself
 * redirected) wastes the link equity the redirect exists to preserve, a loop
 * makes the URL unreachable, and `permanent: true` quietly emits 308 instead of
 * the 301 this set was specified to return. None of those show up in a build.
 *
 * These checks are pure - no server, no database, no network - so they run in
 * milliseconds and can gate a commit.
 *
 * Run: npm run test:seo
 */
import {
  DUPLICATE_EXHIBITION_REDIRECTS as MAP,
  duplicateExhibitionRedirects as build,
} from "../lib/duplicate-redirects.mjs";

let failed = 0;
function check(name, ok, detail = "") {
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

const idOf = (to) => String(to).split("-").pop();
const sources = MAP.map((r) => r.oldId);
const rules = build();

console.log("redirect-map integrity");

check("map is non-empty", MAP.length > 0, `${MAP.length} entries`);

check(
  "every oldId is a 24-char ObjectId",
  MAP.every((r) => /^[a-f0-9]{24}$/.test(r.oldId)),
  MAP.filter((r) => !/^[a-f0-9]{24}$/.test(r.oldId)).map((r) => r.oldId).join(", ")
);

check(
  "every destination is an /exhibition/<slug>-<id> path",
  MAP.every((r) => /^\/exhibition\/[a-z0-9-]+$/.test(r.to) && /^[a-f0-9]{24}$/.test(idOf(r.to))),
  MAP.filter((r) => !/^\/exhibition\/[a-z0-9-]+$/.test(r.to)).map((r) => r.to).join(", ")
);

const dupes = sources.filter((id, i) => sources.indexOf(id) !== i);
check("no duplicate sources", dupes.length === 0, dupes.join(", "));

const loops = MAP.filter((r) => idOf(r.to) === r.oldId);
check("no self-loops", loops.length === 0, loops.map((r) => r.oldId).join(", "));

const chains = MAP.filter((r) => sources.includes(idOf(r.to)));
check(
  "no chains (a destination is never itself a source)",
  chains.length === 0,
  chains.map((r) => `${r.oldId} -> ${idOf(r.to)}`).join(", ")
);

check("one rule emitted per mapping", rules.length === MAP.length, `${rules.length} rules`);

check(
  "every rule is statusCode 301",
  rules.every((r) => r.statusCode === 301),
  rules.filter((r) => r.statusCode !== 301).length + " wrong"
);

// `permanent: true` emits 308, and the two keys are mutually exclusive in Next.
check(
  "no rule sets `permanent` (would emit 308, not 301)",
  !rules.some((r) => "permanent" in r),
  ""
);

check(
  "source patterns stay inside one path segment",
  rules.every((r) => r.source.includes("[^/]*")),
  ""
);

console.log("");
if (failed) {
  console.log(`FAILED — ${failed} check(s)`);
  process.exit(1);
}
console.log(`OK — ${MAP.length} redirects, all checks passed`);
