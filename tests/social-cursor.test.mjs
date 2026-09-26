/**
 * Tests for lib/social/cursor-list.js.
 *
 * The social endpoints paginate with an opaque keyset cursor, not page numbers —
 * so lib/paginate.js (which reads `total` and loops page = 2..n) cannot be used,
 * and nothing here may parse, compare or build a cursor.
 *
 * Run: npm run test:social
 */
import {
  emptyList,
  mergePage,
  canLoadMore,
  removeItem,
  replaceItem,
} from "../lib/social/cursor-list.js";

let failed = 0;
function check(name, ok, detail = "") {
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

const ids = (state) => state.items.map((i) => i._id).join(",");
const row = (id, extra = {}) => ({ _id: id, ...extra });

// A realistic opaque cursor: base64url of "<ISO>|<ObjectId>". Never decoded here.
const CURSOR = "MjAyNi0wOS0yNlQwMDowMDowMC4wMDBafDY0ZjAwMDAwMDAwMDAwMDAwMDAwMDAwMQ";

console.log("cursor: initial state");

const zero = emptyList();
check("starts with no items", Array.isArray(zero.items) && zero.items.length === 0);
check("starts with a null cursor", zero.nextCursor === null);
check("starts with hasMore false", zero.hasMore === false);

console.log("");
console.log("cursor: first page");

let s = mergePage(emptyList(), { items: [row("a"), row("b"), row("c")], nextCursor: CURSOR, hasMore: true }, "replace");
check("the first page becomes the list", ids(s) === "a,b,c", ids(s));
check("the cursor is carried verbatim", s.nextCursor === CURSOR);
check("hasMore is carried", s.hasMore === true);

console.log("");
console.log("cursor: append");

s = mergePage(s, { items: [row("d"), row("e")], nextCursor: null, hasMore: false });
check("the next page is appended after the first", ids(s) === "a,b,c,d,e", ids(s));
check("a null cursor is carried as null", s.nextCursor === null);
check("hasMore false ends the list", s.hasMore === false);

console.log("");
console.log("cursor: server order is preserved, never re-sorted");

s = mergePage(emptyList(), { items: [row("z"), row("m"), row("a")], nextCursor: CURSOR, hasMore: true }, "replace");
check("page order is left exactly as the server sent it", ids(s) === "z,m,a", ids(s));
s = mergePage(s, { items: [row("y"), row("b")], hasMore: false });
check("appended page keeps its own order too", ids(s) === "z,m,a,y,b", ids(s));

console.log("");
console.log("cursor: duplicates across adjacent pages");

s = mergePage(emptyList(), { items: [row("a", { v: 1 }), row("b", { v: 1 })], nextCursor: CURSOR, hasMore: true }, "replace");
s = mergePage(s, { items: [row("b", { v: 2 }), row("c", { v: 1 })], hasMore: false });
check("a repeated id appears exactly once", ids(s) === "a,b,c", ids(s));
check(
  "the FIRST copy is kept, so the row does not jump position",
  s.items.find((i) => i._id === "b").v === 1,
  String(s.items.find((i) => i._id === "b").v)
);
check("the list length reflects deduplication", s.items.length === 3);

s = mergePage(emptyList(), { items: [row("a"), row("a"), row("b")], hasMore: false }, "replace");
check("duplicates WITHIN one page are also collapsed", ids(s) === "a,b", ids(s));

console.log("");
console.log("cursor: replace vs append");

s = mergePage(emptyList(), { items: [row("a"), row("b")], nextCursor: CURSOR, hasMore: true }, "replace");
const refreshed = mergePage(s, { items: [row("x"), row("y")], nextCursor: null, hasMore: false }, "replace");
check("replace discards what was on screen", ids(refreshed) === "x,y", ids(refreshed));
check("...and does not append to it", refreshed.items.length === 2);
check("append is the default mode", ids(mergePage(s, { items: [row("c")] })) === "a,b,c");

console.log("");
console.log("cursor: empty and malformed pages");

s = mergePage(emptyList(), { items: [], nextCursor: null, hasMore: false }, "replace");
check("an empty first page is an empty list", s.items.length === 0 && s.hasMore === false);
s = mergePage(mergePage(emptyList(), { items: [row("a")], hasMore: true }, "replace"), { items: [], hasMore: false });
check("an empty later page leaves the list intact", ids(s) === "a" && s.hasMore === false, ids(s));
check("a missing items array does not throw", mergePage(emptyList(), {}).items.length === 0);
check("a null page does not throw", mergePage(emptyList(), null).items.length === 0);
check("null state falls back to empty", mergePage(null, { items: [row("a")] }).items.length === 1);
check(
  "rows without an _id are skipped rather than crashing",
  mergePage(emptyList(), { items: [row("a"), {}, { _id: null }, row("b")] }).items.length === 2
);
check("undefined nextCursor is normalised to null", mergePage(emptyList(), { items: [] }).nextCursor === null);
check("a missing hasMore is false, not undefined", mergePage(emptyList(), { items: [] }).hasMore === false);

console.log("");
console.log("cursor: canLoadMore");

check("true when hasMore and a cursor exist", canLoadMore({ items: [], nextCursor: CURSOR, hasMore: true }) === true);
check("false when hasMore is false", canLoadMore({ items: [], nextCursor: CURSOR, hasMore: false }) === false);
check(
  "false when hasMore is true but the cursor is null — otherwise page one would repeat forever",
  canLoadMore({ items: [], nextCursor: null, hasMore: true }) === false
);
check("false for an empty-string cursor", canLoadMore({ items: [], nextCursor: "", hasMore: true }) === false);
check(
  "false while a load is already in flight, so a double click cannot double-request",
  canLoadMore({ items: [], nextCursor: CURSOR, hasMore: true }, true) === false
);
check("false for null state", canLoadMore(null) === false);

console.log("");
console.log("cursor: local edits");

s = mergePage(emptyList(), { items: [row("a"), row("b"), row("c")], nextCursor: CURSOR, hasMore: true }, "replace");
let afterRemove = removeItem(s, "b");
check("removeItem drops exactly that row", ids(afterRemove) === "a,c", ids(afterRemove));
check(
  "removeItem leaves cursor and hasMore alone — they describe the server, not the screen",
  afterRemove.nextCursor === CURSOR && afterRemove.hasMore === true
);
check("removing an absent id changes nothing", ids(removeItem(s, "zzz")) === "a,b,c");
check("removeItem matches by string, so an ObjectId-like value works", removeItem(s, "a").items.length === 2);

const afterReplace = replaceItem(s, "b", row("b", { v: 9 }));
check("replaceItem swaps in place", ids(afterReplace) === "a,b,c", ids(afterReplace));
check("...with the new value", afterReplace.items[1].v === 9);
check("replacing an absent id changes nothing", ids(replaceItem(s, "zzz", row("zzz"))) === "a,b,c");

console.log("");
console.log("cursor: opacity and no page-number logic");

const src = await import("node:fs").then((fs) =>
  fs.readFileSync(new URL("../lib/social/cursor-list.js", import.meta.url), "utf8")
);
const live = src.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((l) => l.replace(/\/\/.*$/, "")).join("\n");
check("no atob / Buffer / base64 decoding of the cursor", !/atob|Buffer|base64|fromCharCode/.test(live));
check("no cursor construction", !/btoa|toISOString/.test(live));
check("no page numbers, skip or offset", !/\bpage\b\s*[=+]|\bskip\b|\boffset\b|totalPages/.test(live));
check("no client-side sorting", !/\.sort\(/.test(live));
check("does not import lib/paginate.js", !/paginate/.test(live));

console.log("");
console.log("cursor: purity");

const original = mergePage(emptyList(), { items: [row("a"), row("b")], nextCursor: CURSOR, hasMore: true }, "replace");
const snapshot = ids(original);
mergePage(original, { items: [row("c")] });
removeItem(original, "a");
replaceItem(original, "a", row("a", { v: 1 }));
check("no helper mutates the state it is given", ids(original) === snapshot, ids(original));

console.log("");
console.log(failed ? `=== ${failed} FAILED ===` : "=== all passed ===");
process.exit(failed ? 1 : 0);
