/**
 * Tests for lib/social/reaction-machine.js.
 *
 * THE BUG THESE EXIST FOR
 * POST /api/social/posts/:postId/reaction with the reaction the viewer ALREADY
 * holds is a NO-OP, not a toggle: the backend upsert filters on
 * `reaction: { $ne: next }`, nothing matches, the unique index refuses the
 * insert, and the controller returns unchanged state on E11000.
 *
 * So the intuitive implementation — "clicking Like posts a like" — gives a button
 * that silently does nothing on the second press. Turning a reaction off requires
 * DELETE. Every transition is pinned here so that rule cannot be re-derived
 * wrongly in a component later.
 *
 * Run: npm run test:social
 */
import {
  planReaction,
  applyReactionDelta,
  REACTIONS,
  VIEWER_REACTIONS,
} from "../lib/social/reaction-machine.js";

let failed = 0;
function check(name, ok, detail = "") {
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

console.log("reaction: vocabulary");

check("clickable reactions are exactly like and dislike", REACTIONS.join(",") === "like,dislike");
check("viewerReaction is null, like or dislike", VIEWER_REACTIONS.length === 3 && VIEWER_REACTIONS[0] === null);
check(
  "the backend STORED values never appear on the wire",
  !REACTIONS.includes("LIKE") && !REACTIONS.includes("DISLIKE")
);

console.log("");
console.log("reaction: setting from nothing");

let p = planReaction(null, "like");
check("null + like -> POST like", p.action === "post" && p.reaction === "like" && p.next === "like", JSON.stringify(p));
p = planReaction(null, "dislike");
check("null + dislike -> POST dislike", p.action === "post" && p.reaction === "dislike" && p.next === "dislike", JSON.stringify(p));

console.log("");
console.log("reaction: TOGGLE OFF USES DELETE — the rule this file exists for");

p = planReaction("like", "like");
check("like + like -> DELETE", p.action === "delete" && p.next === null, JSON.stringify(p));
check("like + like is NOT a POST (a repeat POST is a server no-op)", planReaction("like", "like").action !== "post");
p = planReaction("dislike", "dislike");
check("dislike + dislike -> DELETE", p.action === "delete" && p.next === null, JSON.stringify(p));
check("dislike + dislike is NOT a POST", planReaction("dislike", "dislike").action !== "post");
check(
  "no same-reaction click ever produces a reaction body",
  ["like", "dislike"].every((r) => planReaction(r, r).reaction === undefined)
);

console.log("");
console.log("reaction: switching");

p = planReaction("like", "dislike");
check("like + dislike -> POST dislike", p.action === "post" && p.reaction === "dislike" && p.next === "dislike", JSON.stringify(p));
p = planReaction("dislike", "like");
check("dislike + like -> POST like", p.action === "post" && p.reaction === "like" && p.next === "like", JSON.stringify(p));

console.log("");
console.log("reaction: the full transition table is covered");

const TABLE = [
  [null, "like", "post", "like"],
  [null, "dislike", "post", "dislike"],
  ["like", "like", "delete", null],
  ["dislike", "dislike", "delete", null],
  ["like", "dislike", "post", "dislike"],
  ["dislike", "like", "post", "like"],
];
check("all six valid transitions asserted", TABLE.length === 6);
for (const [current, clicked, action, next] of TABLE) {
  const r = planReaction(current, clicked);
  check(
    `${String(current)} + ${clicked} -> ${action}${next ? " " + next : ""}`,
    r.action === action && r.next === next,
    JSON.stringify(r)
  );
}

console.log("");
console.log("reaction: invalid input produces NO mutation");

for (const [label, current, clicked] of [
  ["unknown current", "LIKE", "like"],
  ["lowercase-only rule: stored value as current", "DISLIKE", "like"],
  ["undefined current", undefined, "like"],
  ["numeric current", 1, "like"],
  ["object current", {}, "like"],
  ["unknown clicked", null, "love"],
  ["stored value clicked", null, "LIKE"],
  ["null clicked", null, null],
  ["undefined clicked", null, undefined],
  ["empty clicked", null, ""],
  ["numeric clicked", null, 1],
]) {
  const r = planReaction(current, clicked);
  check(`${label} -> action "none"`, r.action === "none" && typeof r.reason === "string", JSON.stringify(r));
}
check(
  "no invalid input can yield post or delete",
  [["LIKE", "like"], [undefined, "like"], [null, "love"], [null, null], [{}, {}]].every(
    ([c, k]) => planReaction(c, k).action === "none"
  )
);

console.log("");
console.log("reaction: optimistic count deltas");

let c = applyReactionDelta({ likeCount: 3, dislikeCount: 1 }, null, "like");
check("null -> like increments likes only", c.likeCount === 4 && c.dislikeCount === 1, JSON.stringify(c));
c = applyReactionDelta({ likeCount: 3, dislikeCount: 1 }, null, "dislike");
check("null -> dislike increments dislikes only", c.likeCount === 3 && c.dislikeCount === 2, JSON.stringify(c));
c = applyReactionDelta({ likeCount: 3, dislikeCount: 1 }, "like", null);
check("like -> null decrements likes", c.likeCount === 2 && c.dislikeCount === 1, JSON.stringify(c));
c = applyReactionDelta({ likeCount: 3, dislikeCount: 1 }, "like", "dislike");
check("a switch moves one count to the other", c.likeCount === 2 && c.dislikeCount === 2, JSON.stringify(c));
c = applyReactionDelta({ likeCount: 3, dislikeCount: 1 }, "dislike", "like");
check("...and back the other way", c.likeCount === 4 && c.dislikeCount === 0, JSON.stringify(c));

console.log("");
console.log("reaction: counts can NEVER go negative");

// Reachable without any bug here: a card's counts may be a minute stale, so
// removing a reaction can subtract from a cached 0.
c = applyReactionDelta({ likeCount: 0, dislikeCount: 0 }, "like", null);
check("removing a like from a stale 0 clamps at 0", c.likeCount === 0 && c.dislikeCount === 0, JSON.stringify(c));
c = applyReactionDelta({ likeCount: 0, dislikeCount: 0 }, "dislike", "like");
check("switching from a stale 0 clamps the decrement", c.likeCount === 1 && c.dislikeCount === 0, JSON.stringify(c));
check(
  "no transition from zeroed counts can produce a negative",
  [null, "like", "dislike"].every((from) =>
    [null, "like", "dislike"].every((to) => {
      const r = applyReactionDelta({ likeCount: 0, dislikeCount: 0 }, from, to);
      return r.likeCount >= 0 && r.dislikeCount >= 0;
    })
  )
);
c = applyReactionDelta({ likeCount: undefined, dislikeCount: null }, null, "like");
check("missing counts are treated as 0", c.likeCount === 1 && c.dislikeCount === 0, JSON.stringify(c));
c = applyReactionDelta({ likeCount: "7", dislikeCount: "2" }, null, "like");
check("numeric strings are coerced", c.likeCount === 8 && c.dislikeCount === 2, JSON.stringify(c));
c = applyReactionDelta(null, null, "like");
check("a missing counts object does not throw", c.likeCount === 1 && c.dislikeCount === 0, JSON.stringify(c));

console.log("");
console.log("reaction: purity");

const counts = { likeCount: 5, dislikeCount: 5 };
applyReactionDelta(counts, null, "like");
check("applyReactionDelta does not mutate its input", counts.likeCount === 5 && counts.dislikeCount === 5);
check(
  "planReaction is deterministic",
  JSON.stringify(planReaction("like", "dislike")) === JSON.stringify(planReaction("like", "dislike"))
);

console.log("");
console.log(failed ? `=== ${failed} FAILED ===` : "=== all passed ===");
process.exit(failed ? 1 : 0);
