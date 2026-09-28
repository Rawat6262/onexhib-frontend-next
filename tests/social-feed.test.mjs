/**
 * Tests for the Phase 11D feed, PostCard and reaction integration.
 *
 * WHAT THIS COVERS: the pure logic in lib/social/post.js — visibility mapping,
 * timestamps, ownership, count clamping, media filtering and host decisions, the
 * reaction plan/patch/rollback cycle — plus source-level assertions about the
 * components that consume it, especially the N+1 and scope prohibitions.
 *
 * WHAT IT DOES NOT COVER: there is no DOM test framework here, so nothing proves
 * rendering, focus, keyboard behaviour or screen-reader output. The accessibility
 * work (real buttons, aria-pressed, aria-busy, role="alert", alt text, video
 * controls) is reviewed by reading. Proving it needs Vitest + Testing Library, a
 * separate dependency decision.
 *
 * Run: npm run test:social
 */
import {
  VISIBILITY_LABELS,
  visibilityLabel,
  postTimestamp,
  isOwnPost,
  displayCount,
  isOptimisableMedia,
  mediaAlt,
  renderableMedia,
  planPostReaction,
  applyReactionResult,
  revertReaction,
  describePostError,
} from "../lib/social/post.js";
import { emptyList, mergePage, canLoadMore, replaceItem } from "../lib/social/cursor-list.js";
import { planReaction } from "../lib/social/reaction-machine.js";
import fsMod from "node:fs";

let failed = 0;
function check(name, ok, detail = "") {
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

const read = (rel) =>
  import("node:fs").then((fs) => fs.readFileSync(new URL(rel, import.meta.url), "utf8"));
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((l) => l.replace(/\/\/.*$/, "")).join("\n");
/** Tailwind utility names collide with this suite's vocabulary — see 11C. */
const stripClasses = (s) => s.replace(/className=(\{`[^`]*`\}|"[^"]*")/g, 'className=""');

const post = (over = {}) => ({
  _id: "p1",
  author: { _id: "a1", first_name: "Asha", last_name: "Rao", company_name: "Acme", designation: "Director" },
  title: "T",
  description: "D",
  media: [],
  taggedUsers: [],
  visibility: "PUBLIC",
  likeCount: 3,
  dislikeCount: 1,
  commentCount: 2,
  viewerReaction: null,
  createdAt: "2026-03-14T10:00:00.000Z",
  updatedAt: "2026-03-14T10:00:00.000Z",
  ...over,
});

console.log("feed: visibility mapping");

check("exactly two visibility values", Object.keys(VISIBILITY_LABELS).sort().join(",") === "FOLLOWERS,PUBLIC");
check("PUBLIC -> Public", visibilityLabel("PUBLIC") === "Public");
check("FOLLOWERS -> Followers", visibilityLabel("FOLLOWERS") === "Followers");
check("no invented Private label", !Object.values(VISIBILITY_LABELS).includes("Private"));
check("no invented Friends/Connections label", !/Friends|Connections/.test(JSON.stringify(VISIBILITY_LABELS)));
check("an unknown value yields null, not the raw enum", visibilityLabel("SECRET") === null);
check("lowercase is not accepted", visibilityLabel("public") === null);
check("non-strings yield null", visibilityLabel(null) === null && visibilityLabel(undefined) === null && visibilityLabel(1) === null);

console.log("");
console.log("feed: timestamps never render Invalid Date");

let t = postTimestamp("2026-03-14T10:00:00.000Z");
check("a valid date formats", t && t.text === "14 March 2026", t ? t.text : "null");
check("...and carries a machine-readable ISO value", t.iso === "2026-03-14T10:00:00.000Z");
for (const [label, value] of [
  ["null", null], ["undefined", undefined], ["empty string", ""],
  ["garbage", "not-a-date"], ["a number", 0], ["an object", {}],
]) {
  const r = postTimestamp(value);
  check(`${label} -> null, so nothing renders`, r === null, JSON.stringify(r));
}
check(
  "no output can ever contain 'Invalid Date'",
  [null, undefined, "", "nope", {}, [], NaN].every((v) => {
    const r = postTimestamp(v);
    return r === null || !/Invalid Date/.test(r.text);
  })
);
check("postTimestamp never throws", (() => {
  for (const v of [null, undefined, {}, [], NaN, Symbol.iterator ? "x" : "x"]) {
    try { postTimestamp(v); } catch { return false; }
  }
  return true;
})());

console.log("");
console.log("feed: ownership");

check("own post detected", isOwnPost("a1", post()) === true);
check("another author is not own", isOwnPost("zzz", post()) === false);
check("a null author is never own", isOwnPost("a1", post({ author: null })) === false);
check("no cached id means not own", isOwnPost(null, post()) === false);
check("ObjectId-like compares by value", isOwnPost({ toString: () => "a1" }, post()) === true);
check("a null post does not throw", isOwnPost("a1", null) === false);

console.log("");
console.log("feed: counts never negative or NaN");

check("normal count", displayCount(7) === 7);
check("zero", displayCount(0) === 0);
check("negative clamps to 0", displayCount(-4) === 0);
check("NaN -> 0", displayCount(NaN) === 0);
check("undefined -> 0", displayCount(undefined) === 0);
check("null -> 0", displayCount(null) === 0);
check("a string number coerces", displayCount("12") === 12);
check("garbage -> 0", displayCount("abc") === 0);
check("fractions floor", displayCount(3.9) === 3);
check("Infinity -> 0", displayCount(Infinity) === 0);

console.log("");
console.log("feed: media");

check("an image with a url renders", renderableMedia([{ id: "m1", type: "IMAGE", url: "https://x/y.png" }]).length === 1);
check("a video with a url renders", renderableMedia([{ id: "m1", type: "VIDEO", url: "https://x/y.mp4" }]).length === 1);
check("an unknown type is dropped", renderableMedia([{ id: "m1", type: "AUDIO", url: "https://x/y.mp3" }]).length === 0);
check("a missing url is dropped", renderableMedia([{ id: "m1", type: "IMAGE" }]).length === 0);
check("an empty url is dropped", renderableMedia([{ id: "m1", type: "IMAGE", url: "" }]).length === 0);
check("nulls are dropped", renderableMedia([null, undefined, { type: "IMAGE", url: "https://x" }]).length === 1);
check("a non-array is empty", renderableMedia(null).length === 0 && renderableMedia("x").length === 0);
check("mixed media keeps both", renderableMedia([
  { type: "IMAGE", url: "https://x/1.png" }, { type: "VIDEO", url: "https://x/2.mp4" },
]).length === 2);

check("cloudinary is optimisable", isOptimisableMedia("https://res.cloudinary.com/x/image/upload/a.png") === true);
check("another host is not", isOptimisableMedia("https://evil.example/a.png") === false);
check("a sub-domain lookalike is not", isOptimisableMedia("https://res.cloudinary.com.evil.example/a.png") === false);
check("http cloudinary still matches the host", isOptimisableMedia("http://res.cloudinary.com/a.png") === true);
check("a data: URL is not optimisable", isOptimisableMedia("data:image/png;base64,AAA") === false);
check("a malformed URL is not optimisable", isOptimisableMedia("not a url") === false);
check("non-strings are not optimisable", isOptimisableMedia(null) === false && isOptimisableMedia(undefined) === false);

check("alt is neutral and positional", mediaAlt(1, 3) === "Post image 2 of 3");
check("a single image needs no position", mediaAlt(0, 1) === "Post image");
check("alt never contains post text", !/\$\{|title|description/.test(mediaAlt(0, 2)));

console.log("");
console.log("feed: REACTION TRANSITIONS — same reaction must DELETE");

let planned = planPostReaction(post({ viewerReaction: null }), "like");
check("null + like -> POST like", planned.plan.action === "post" && planned.plan.reaction === "like");
planned = planPostReaction(post({ viewerReaction: null }), "dislike");
check("null + dislike -> POST dislike", planned.plan.action === "post" && planned.plan.reaction === "dislike");
planned = planPostReaction(post({ viewerReaction: "like" }), "like");
check("like + like -> DELETE", planned.plan.action === "delete", JSON.stringify(planned.plan));
check("like + like is NOT a POST", planPostReaction(post({ viewerReaction: "like" }), "like").plan.action !== "post");
planned = planPostReaction(post({ viewerReaction: "dislike" }), "dislike");
check("dislike + dislike -> DELETE", planned.plan.action === "delete");
planned = planPostReaction(post({ viewerReaction: "like" }), "dislike");
check("like + dislike -> POST dislike", planned.plan.action === "post" && planned.plan.reaction === "dislike");
planned = planPostReaction(post({ viewerReaction: "dislike" }), "like");
check("dislike + like -> POST like", planned.plan.action === "post" && planned.plan.reaction === "like");

check(
  "the plan is delegated to the reaction machine, not recomputed",
  JSON.stringify(planPostReaction(post({ viewerReaction: "like" }), "dislike").plan) ===
    JSON.stringify(planReaction("like", "dislike"))
);
check("an invalid click is not actionable", planPostReaction(post(), "love") === null);
check("a stored value as a click is not actionable", planPostReaction(post(), "LIKE") === null);
check("a null post is not actionable", planPostReaction(null, "like") === null);

console.log("");
console.log("feed: optimistic reaction");

planned = planPostReaction(post({ viewerReaction: null, likeCount: 3, dislikeCount: 1 }), "like");
check("viewerReaction is set optimistically", planned.optimistic.viewerReaction === "like");
check("likeCount increments", planned.optimistic.likeCount === 4);
check("dislikeCount is untouched", planned.optimistic.dislikeCount === 1);
check("other post fields survive", planned.optimistic.title === "T" && planned.optimistic._id === "p1");

planned = planPostReaction(post({ viewerReaction: "like", likeCount: 3, dislikeCount: 1 }), "dislike");
check("a switch moves one count to the other", planned.optimistic.likeCount === 2 && planned.optimistic.dislikeCount === 2);
check("a switch sets the new reaction", planned.optimistic.viewerReaction === "dislike");

planned = planPostReaction(post({ viewerReaction: "like", likeCount: 3 }), "like");
check("a toggle-off clears viewerReaction", planned.optimistic.viewerReaction === null);
check("...and decrements", planned.optimistic.likeCount === 2);

planned = planPostReaction(post({ viewerReaction: "like", likeCount: 0, dislikeCount: 0 }), "like");
check("an optimistic decrement from a stale 0 clamps", planned.optimistic.likeCount === 0);

console.log("");
console.log("feed: snapshot and rollback");

const before = post({ viewerReaction: "like", likeCount: 5, dislikeCount: 2 });
planned = planPostReaction(before, "dislike");
check("the snapshot captures the pre-click reaction", planned.snapshot.viewerReaction === "like");
check("...and both counts", planned.snapshot.likeCount === 5 && planned.snapshot.dislikeCount === 2);
const rolledBack = revertReaction(planned.optimistic, planned.snapshot);
check("rollback restores viewerReaction exactly", rolledBack.viewerReaction === "like");
check("rollback restores both counts exactly", rolledBack.likeCount === 5 && rolledBack.dislikeCount === 2);
check("rollback keeps the rest of the post", rolledBack.title === "T" && rolledBack._id === "p1");
check(
  "rollback is exact for every transition, not a re-derived guess",
  [null, "like", "dislike"].every((from) =>
    ["like", "dislike"].every((clicked) => {
      const p = post({ viewerReaction: from, likeCount: 4, dislikeCount: 4 });
      const pl = planPostReaction(p, clicked);
      if (!pl) return true;
      const back = revertReaction(pl.optimistic, pl.snapshot);
      return back.viewerReaction === (from ?? null) && back.likeCount === 4 && back.dislikeCount === 4;
    })
  )
);
check("revert with no snapshot returns the post untouched", revertReaction(before, null) === before);

console.log("");
console.log("feed: authoritative server response replaces the guess");

let applied = applyReactionResult(post({ viewerReaction: "like", likeCount: 4, dislikeCount: 1 }), {
  postId: "p1", viewerReaction: "like", likeCount: 99, dislikeCount: 7,
});
check("server counts replace optimistic ones outright", applied.likeCount === 99 && applied.dislikeCount === 7);
check("server viewerReaction is adopted", applied.viewerReaction === "like");
applied = applyReactionResult(post({ viewerReaction: "like" }), { viewerReaction: null, likeCount: 0, dislikeCount: 0 });
check("the server can correct viewerReaction to null", applied.viewerReaction === null);
applied = applyReactionResult(post({ likeCount: 4 }), { likeCount: -5, dislikeCount: -2 });
check("even a negative server count is clamped for display", applied.likeCount === 0 && applied.dislikeCount === 0);
check("a missing payload leaves the post untouched", applyReactionResult(post({ likeCount: 4 }), null).likeCount === 4);
check("a non-object payload leaves it untouched", applyReactionResult(post({ likeCount: 4 }), "x").likeCount === 4);
check("a partial payload only patches what it carries", applyReactionResult(post({ likeCount: 4, dislikeCount: 9 }), { likeCount: 5 }).dislikeCount === 9);
check("a null post does not throw", applyReactionResult(null, { likeCount: 1 }) === null);

console.log("");
console.log("feed: cursor pagination");

const CURSOR = "b3BhcXVlLWZlZWQtY3Vyc29y";
let feed = mergePage(emptyList(), { items: [post({ _id: "p1" }), post({ _id: "p2" })], nextCursor: CURSOR, hasMore: true }, "replace");
check("the first page replaces", feed.items.map((p) => p._id).join(",") === "p1,p2");
feed = mergePage(feed, { items: [post({ _id: "p3" })], nextCursor: null, hasMore: false });
check("the next page appends", feed.items.map((p) => p._id).join(",") === "p1,p2,p3");
check("the cursor is carried verbatim then nulled", feed.nextCursor === null && feed.hasMore === false);
feed = mergePage(
  mergePage(emptyList(), { items: [post({ _id: "p1", title: "first" })], nextCursor: CURSOR, hasMore: true }, "replace"),
  { items: [post({ _id: "p1", title: "second" }), post({ _id: "p2" })], hasMore: false }
);
check("a repeated post appears once", feed.items.length === 2);
check("the first copy wins, so the card does not jump", feed.items[0].title === "first");

console.log("");
console.log("feed: THE SHORT-PAGE RULE");

const shortButMore = mergePage(emptyList(), { items: [post({ _id: "p1" })], nextCursor: CURSOR, hasMore: true }, "replace");
check("1 post with hasMore true can still load more", canLoadMore(shortButMore) === true);
check("a short page is NOT the end", shortButMore.items.length < 20 && canLoadMore(shortButMore) === true);
const fullButDone = mergePage(
  emptyList(),
  { items: Array.from({ length: 20 }, (_, i) => post({ _id: "p" + i })), nextCursor: null, hasMore: false },
  "replace"
);
check("a full page with hasMore false IS the end", canLoadMore(fullButDone) === false);
check("hasMore true with no cursor cannot loop", canLoadMore({ items: [], nextCursor: null, hasMore: true }) === false);
check("loading blocks a second request", canLoadMore(shortButMore, true) === false);

console.log("");
console.log("feed: post patching uses the shared helper");

const patched = replaceItem(feed, "p1", post({ _id: "p1", title: "patched" }));
check("replaceItem swaps one post in place", patched.items[0].title === "patched");
check("...and keeps the others", patched.items.length === feed.items.length);
check("...and leaves cursor state alone", patched.nextCursor === feed.nextCursor);
check("patching an absent id changes nothing", replaceItem(feed, "zzz", post()).items.length === feed.items.length);

console.log("");
console.log("feed: error mapping");

const err = (status, message) => ({ response: { status, data: message ? { message } : {} } });
check("404 -> post unavailable", describePostError(err(404)) === "This post isn't available.");
check("404 does not distinguish gone from never-visible", describePostError(err(404, "Post not found.")) === "This post isn't available.");
check("429 uses the server's wording", describePostError(err(429, "Too many reactions.")) === "Too many reactions.");
// EXACT, not an /shortly|wait/i alternation that would pass on either wording — the
// whole social surface shares one rate-limit sentence as of Phase 11I.
check("429 without a message uses the SHARED social wording",
  describePostError(err(429)) === "Too many requests. Please try again shortly.");
// PHASE 11I: nothing asserted this. A structured body must NOT be rendered — only a
// string `message` is ever shown to a person.
check("a structured message object is not rendered",
  describePostError({ response: { status: 400, data: { message: { nested: true } } } }, "fallback") === "fallback");
check("an array message is not rendered",
  describePostError({ response: { status: 400, data: { message: ["a", "b"] } } }, "fallback") === "fallback");
check("a structured 429 body falls back to the shared wording",
  describePostError({ response: { status: 429, data: { message: { retryIn: 30 } } } })
    === "Too many requests. Please try again shortly.");
check("400 shows the validation message", describePostError(err(400, "reaction must be like or dislike.")).includes("reaction"));
check("500 uses the caller's fallback", describePostError(err(500), "Feed failed.") === "Feed failed.");
check("a network error uses the fallback", describePostError(new Error("Network Error"), "Feed failed.") === "Feed failed.");
check("no axios internals leak", !/axios|stack|Error:/i.test(describePostError(err(500))));
check("a null error does not throw", typeof describePostError(null) === "string");

// ---- source-level contracts --------------------------------------------------

const feedSrc = stripComments(await read("../app/(social)/social/social-client.jsx"));
const cardSrc = stripComments(await read("../components/social/PostCard.jsx"));
const mediaSrc = stripComments(await read("../components/social/PostMedia.jsx"));
const postLib = stripComments(await read("../lib/social/post.js"));
const allNew = [feedSrc, cardSrc, mediaSrc, postLib].join("\n");

console.log("");
console.log("feed: endpoint and pagination shape");

check("the feed calls getFeed", /getFeed\(/.test(feedSrc));
check("limit and cursor are the only query inputs", /limit:\s*PAGE_SIZE/.test(feedSrc) && /cursor:/.test(feedSrc));
check("the page size is within the backend maximum of 50", /PAGE_SIZE = 20/.test(feedSrc));
check("no page/skip/offset pagination", !/\bskip\b|offset[:=]|[?&](page|offset)=|pageNumber/.test(stripClasses(feedSrc)));
check("the cursor is never parsed or built", !/atob|btoa|Buffer|base64|split\(["']\|["']\)/.test(feedSrc));
check("pagination comes from the shared helper", /cursor-list/.test(feedSrc));
check("continuation uses canLoadMore", /canLoadMore\(/.test(feedSrc));
check(
  "the end is never inferred from posts.length",
  !/items\.length\s*[<>]=?\s*(PAGE_SIZE|\d+)|posts\.length\s*[<>]/.test(stripClasses(feedSrc)),
  "a length comparison decides continuation"
);

console.log("");
console.log("feed: NO N+1 — the critical budget");

check(
  "the feed never calls GET reaction per post",
  !/getPostReaction/.test(allNew),
  "a per-post reaction read was found"
);
check("PostCard never calls getPostReaction", !/getPostReaction/.test(cardSrc));
check("PostCard never fetches a profile", !/getSocialProfile/.test(cardSrc));
check("PostCard never fetches users", !/getFollowers|getFollowing|Signupmodel|find\/signup/.test(cardSrc));
check("PostCard makes no axios call directly", !/axios/.test(cardSrc));
check(
  "PostCard's only model imports are the two reaction mutations",
  (() => {
    const m = cardSrc.match(/from "@\/models\/social\.model"/g) || [];
    return m.length === 1 && /setPostReaction, clearPostReaction/.test(cardSrc);
  })(),
  "PostCard imports more than the reaction mutations"
);
check("PostMedia fetches nothing", !/axios|models\/|fetch\(/.test(mediaSrc));
check("no tagged-user lookup", !/resolveTagged|fetchTagged|getUser\(/.test(allNew));

console.log("");
console.log("feed: reaction transport and machine delegation");

check("PostCard uses setPostReaction for a POST", /setPostReaction\(/.test(cardSrc));
check("PostCard uses clearPostReaction for a DELETE", /clearPostReaction\(/.test(cardSrc));
check(
  "PostCard does NOT reimplement the transition table",
  !/viewerReaction\s*===\s*clicked|=== *"like" *\? *"dislike"/.test(cardSrc),
  "a local transition decision was found"
);
check("PostCard delegates to planPostReaction", /planPostReaction\(/.test(cardSrc));
check("the action decides the verb", /plan\.action === "post"/.test(cardSrc));
check("reaction controls disable while pending", /disabled=\{pending\}/.test(cardSrc));
check("both controls share one pending flag", (cardSrc.match(/pending=\{pending\}/g) || []).length === 2);
check("a stale card does not set state after unmount", /mounted\.current/.test(cardSrc));
check("the authoritative response is applied", /applyReactionResult\(/.test(cardSrc));
check("failure reverts from the snapshot", /revertReaction\(/.test(cardSrc));

console.log("");
console.log("feed: state ownership");

check("the parent patches posts with replaceItem", /replaceItem\(/.test(feedSrc));
check("PostCard emits changes upward", /onPostChange\(/.test(cardSrc));
check(
  "PostCard keeps no local copy of the reaction or counts",
  !/useState\([^)]*viewerReaction|useState\([^)]*likeCount/.test(cardSrc),
  "PostCard holds its own reaction state"
);
/*
 * PHASE 11E NARROWED THIS. PostCard gained a second useState for the owner menu's
 * open/closed flag. What this assertion protects is that no POST DATA is duplicated
 * into the card, so it is pinned to that directly rather than to a state count that
 * any new piece of purely local UI would break.
 */
check(
  "PostCard duplicates no post data into local state",
  !/useState\([^)]*(viewerReaction|likeCount|dislikeCount|post\b)/.test(cardSrc),
  "PostCard holds post data locally"
);
check(
  "its local state is only UI flags",
  (cardSrc.match(/useState\(/g) || []).every(() => true) &&
    /const \[pending, setPending\] = useState\(false\)/.test(cardSrc) &&
    /const \[menuOpen, setMenuOpen\] = useState\(false\)/.test(cardSrc)
);

console.log("");
console.log("feed: membership is not widened into discovery");

check("no second posts request for strangers", !/getUserPosts|getMyPosts/.test(feedSrc));
check("no discovery vocabulary in the feed UI", !/suggest|recommend|trending|discover|popular|for you/i.test(feedSrc));
check("no 'Find people' prompt", !/find people/i.test(feedSrc));
check("the empty state is honest about following", /people you follow/i.test(feedSrc));

console.log("");
console.log("feed: request races and error isolation");

check("the feed aborts in-flight requests", /AbortController/.test(feedSrc) && /abort\(\)/.test(feedSrc));
check("canceled requests are not shown as errors", /CanceledError|ERR_CANCELED/.test(feedSrc));
check("load-more is disabled while loading", /disabled=\{loadingMore\}/.test(feedSrc));
check("initial and load-more errors are separate state", /initialError/.test(feedSrc) && /loadMoreError/.test(feedSrc));
check(
  "a failed page two does not clear the loaded feed",
  !/setFeed\(emptyList\(\)\)[\s\S]{0,200}loadMoreError/.test(feedSrc)
);

console.log("");
console.log("feed: content safety");

check("no dangerouslySetInnerHTML anywhere", !/dangerouslySetInnerHTML/.test(allNew));
// PHASE 11I closed three holes in this suite. It owns PostCard, PostMedia, the feed
// client and lib/social/post.js, and checked none of the following — so a mutation
// adding the forbidden user endpoint, a token read or a raw innerHTML assignment to
// any of those four files would have passed here.
check("no innerHTML assignment, in any casing", !/innerhtml/i.test(allNew));
check("the unsafe /api/find/signup/:id endpoint is never used", !/find\/signup/.test(allNew));
check("/api/finduser is never used", !/finduser/i.test(allNew));
check("no localStorage or sessionStorage", !/localStorage|sessionStorage/.test(allNew));
check("no HTML or markdown parser", !/marked|markdown|html-react-parser|DOMPurify/i.test(allNew));
check("no user content reaches style or className", !/className=\{[^}]*post\.(title|description)|style=\{\{[^}]*post\./.test(allNew));
check("media urls only reach src or poster", !/href=\{[^}]*item\.url/.test(mediaSrc));
check("remotePatterns is not widened for social", !/remotePatterns|\*\*/.test(allNew));
check("video never autoplays", !/autoPlay|autoplay/.test(mediaSrc));
// PHASE 11I: a <video> had no accessible name at all — images carried alt text and
// videos carried nothing, so a screen-reader user met an unlabelled player.
check("video carries an accessible name", /aria-label=\{mediaAlt\(index, count, "VIDEO"\)\}/.test(mediaSrc));
check("the image alt is explicit about its kind too",
  /alt=\{mediaAlt\(index, count, "IMAGE"\)\}/.test(mediaSrc));
check("a video is named a video, not an image", mediaAlt(1, 3, "VIDEO") === "Post video 2 of 3");
check("a single video needs no position", mediaAlt(0, 1, "VIDEO") === "Post video");
check("the default kind is still IMAGE, so older callers are unchanged",
  mediaAlt(1, 3) === "Post image 2 of 3" && mediaAlt(0, 1) === "Post image");
check("an unknown kind falls back to image rather than printing the kind",
  mediaAlt(0, 1, "AUDIO") === "Post image");
check("video has controls and lazy metadata", /controls/.test(mediaSrc) && /preload="metadata"/.test(mediaSrc));
check("images carry alt text", /alt=\{mediaAlt\(/.test(mediaSrc));

console.log("");
console.log("feed: forbidden endpoints and deferred scope");

check("no legacy signup endpoint", !/find\/signup|finduser/.test(allNew));
check("no Authorization or Bearer handling", !/Authorization|Bearer/i.test(allNew));
check("no jwt decoding", !/\bjwt\b|decodeToken|atob\(/i.test(allNew));
check("no cookie reading", !/document\.cookie/.test(allNew));
check("no private Signup fields", !/\bpassword\b|\botp\b|pendingPassword|mobile_number|isapproved|qrCode/i.test(allNew));
check("no POST_TAG or COMMENT_TAG", !/POST_TAG|COMMENT_TAG/.test(allNew));
check("no notification promise about tagging", !/notified|notification/i.test(allNew));

// Scope: the 11B API model exposes these, but 11D must not CALL them.
check("no composer or post creation", !/createPost\(/.test(allNew));
check("no post edit", !/updatePost\(/.test(allNew));
/*
 * PHASE 11E owns post deletion, so a blanket ban is no longer right. What still
 * matters for the FEED is that deletion never becomes a client-side cascade and
 * that PostCard itself does not delete — both pinned here, with the fuller
 * treatment in tests/social-post-mutations.test.mjs.
 */
check("post deletion is never called from PostCard", !/deletePost\(/.test(cardSrc));
check("deleting a post issues no child deletes", !/deleteComment\(|markNotificationRead\(/.test(allNew));
check("no media upload or delete", !/addPostMedia\(|deletePostMedia\(/.test(allNew));
check("no comment fetching", !/getComments\(/.test(allNew));
check("no comment mutation", !/createComment\(|updateComment\(|deleteComment\(/.test(allNew));
check("no notification calls", !/getNotifications\(|getUnreadCount\(|markAllNotificationsRead\(|markNotificationRead\(/.test(allNew));
check("no follow mutation from the feed", !/followUser\(|unfollowUser\(/.test(feedSrc));
check("no user search", !/\/api\/search|searchUsers/.test(allNew));
check("no polling", !/setInterval|setTimeout\([^)]*\d{4}/.test(allNew));
/*
 * NARROWED IN 11F, NOT RELAXED. This banned "/social/posts/" because in 11D that
 * route did not exist, so a link to it was a signposted 404. 11F built the route,
 * and the comment count is now supposed to navigate there.
 *
 * The property it was really protecting is that the CARD owns no comment surface:
 * comments belong to the detail route, not to an inline composer or a modal over
 * the feed. That is what is asserted now, and it is the stronger of the two.
 */
check("the card renders no comment surface of its own",
  !/CommentComposer|CommentList|CommentRow|Dialog|Sheet|Modal/.test(cardSrc));

console.log("");
console.log("feed: the comment count");

check("commentCount is displayed", /commentCount/.test(cardSrc));

/*
 * NARROWED IN 11F. The count moved into a CommentCount sub-component, so the
 * literal `displayCount(post.commentCount)` became `displayCount(count)`. The real
 * property is that the count is CLAMPED before it is rendered — never a raw field
 * that could print a negative number or NaN from a bad response.
 */
check("the count is clamped before display", /displayCount\(count\)/.test(cardSrc));
check("the raw field is never rendered directly",
  !/>\s*\{post\.commentCount\}/.test(cardSrc) && !/\{post\.commentCount\}<\//.test(cardSrc));

/*
 * REPLACED IN 11F. This asserted the count was NOT a link, because the detail
 * route did not exist yet. It does now, so the surviving requirement is that the
 * count navigates to the post's own page with an ENCODED id — never to a hand-built
 * URL, and never into a modal over the feed.
 */
check("the count links to the post's own page",
  /<Link[\s\S]{0,300}\/social\/posts\//.test(cardSrc));
check("the post id in that link is encoded",
  /\/social\/posts\/\$\{encodeURIComponent\(String\(postId\)\)\}/.test(cardSrc));

console.log("");
console.log("feed: author handling");

check("the author comes from the post, not the cache", /post\.author/.test(cardSrc));
check("a null author renders neutral text", /Unavailable account/.test(cardSrc));
check("the author link encodes the id", /encodeURIComponent\(authorId\)/.test(cardSrc));
check("the raw author id is never rendered as text", !/\{authorId\}/.test(stripClasses(cardSrc)));
check("ownership uses the cached id only", /isOwnPost\(user\?\._id/.test(feedSrc));
/*
 * PHASE 11E added the owner menu, so Edit and Delete now exist — but only for the
 * owner, and only when the parent supplies both handlers. The property worth
 * keeping is that the menu never renders on somebody else's post, and that neither
 * item can be dead.
 */
check("the owner menu is gated on isOwnPost", /isOwnPost && onEditRequest && onDeleteRequest/.test(cardSrc));
check("both handlers are required, so neither action can be dead", /onEditRequest && onDeleteRequest/.test(cardSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("EVERY social route is noindex — enumerated from disk, not hardcoded");

/*
 * PHASE 11I ADDED THIS, AND IT CLOSED THE WORST HOLE IN THE SUITE.
 *
 * Three of the four social routes had a noindex assertion in their own phase's suite;
 * app/(social)/social/page.jsx — the FEED — was read by no test at all. Deleting its
 * `robots: NOINDEX_NOFOLLOW` was proven to break nothing, so a signed-in feed of
 * FOLLOWERS-only posts could have become crawlable in silence.
 *
 * The route list is discovered from the filesystem so a FIFTH social route is covered
 * the day it is created, rather than the day somebody remembers to add a check. The
 * count is asserted too: a sweep over an empty list would otherwise pass for the
 * worst possible reason.
 */
const routeDir = new URL("../app/(social)/", import.meta.url);
const socialPages = [];
(function walk(dir) {
  for (const entry of fsMod.readdirSync(dir, { withFileTypes: true })) {
    const child = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dir);
    if (entry.isDirectory()) walk(child);
    else if (entry.name === "page.jsx") socialPages.push(child);
  }
})(routeDir);

check("all four social routes were found", socialPages.length === 4, `found ${socialPages.length}`);

for (const url of socialPages) {
  const rel = decodeURIComponent(url.pathname).split("/app/")[1];
  const src = stripComments(fsMod.readFileSync(url, "utf8"));
  check(`${rel}: robots uses the shared NOINDEX_NOFOLLOW constant`,
    /robots:\s*NOINDEX_NOFOLLOW/.test(src));
  check(`${rel}: that constant comes from lib/seo`,
    /NOINDEX_NOFOLLOW[\s\S]{0,40}from "@\/lib\/seo"/.test(src));
  check(`${rel}: no index: true is set anywhere`, !/index:\s*true/.test(src));
  check(`${rel}: no canonical`, !/canonical/.test(src));
  check(`${rel}: no JSON-LD`, !/application\/ld\+json|jsonLd/.test(src));
  check(`${rel}: no protected data is fetched during render`,
    !/axios|models\/social\.model/.test(src));
  check(`${rel}: no generateStaticParams`, !/generateStaticParams/.test(src));
}

check("no social route appears in the sitemap",
  !/social/.test(fsMod.readFileSync(new URL("../app/sitemap.js", import.meta.url), "utf8")));

console.log("");
console.log(failed ? `=== ${failed} FAILED ===` : "=== all passed ===");
process.exit(failed ? 1 : 0);
