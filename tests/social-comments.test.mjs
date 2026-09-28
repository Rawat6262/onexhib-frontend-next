/**
 * Tests for Phase 11F — post detail and comments.
 *
 * WHAT THIS COVERS: the pure logic in lib/social/comment.js (validation mirroring,
 * payload whitelists, tag preservation by omission, authoritative count handling,
 * detail assembly from the two reads, error mapping), the shared cursor helpers as
 * the comment list uses them, and source-level contracts about the components —
 * especially that the count is never derived from a loaded page, that nothing
 * decrements locally, that a row cannot fetch, and that the comment content is
 * rendered as text.
 *
 * WHAT IT DOES NOT COVER: there is no DOM test framework here, so nothing proves
 * rendering, focus movement into the inline edit field, the Radix focus trap,
 * keyboard behaviour or screen-reader output. Those are reviewed by reading.
 *
 * Run: npm run test:social
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONTENT_MAX,
  COMMENT_PAGE_SIZE,
  AUTHOR_UNAVAILABLE,
  validateComment,
  commentLength,
  buildCreateCommentPayload,
  buildEditCommentPayload,
  isOwnComment,
  applyAuthoritativeCount,
  buildPostDetail,
  isCanceled,
  describePostDetailError,
  describeCommentError,
} from "../lib/social/comment.js";
import { emptyList, mergePage, canLoadMore, prependItem, removeItem, replaceItem } from "../lib/social/cursor-list.js";

let failed = 0;
function check(name, ok, detail = "") {
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

const here = path.dirname(fileURLToPath(import.meta.url));
/** path.join, not new URL: the route folder holds "(social)" and "[postId]". */
const read = (rel) => fs.readFileSync(path.join(here, "..", rel), "utf8");
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((l) => l.replace(/\/\/.*$/, "")).join("\n");
/** Tailwind writes things like `outline-offset-2`, which matches an /offset/ grep. */
const stripClasses = (s) => s.replace(/className=(\{`[^`]*`\}|\{[^}]*\}|"[^"]*")/g, 'className=""');

const listSrc = stripComments(read("components/social/CommentList.jsx"));
const rowSrc = stripComments(read("components/social/CommentRow.jsx"));
const composerSrc = stripComments(read("components/social/CommentComposer.jsx"));
const detailSrc = stripComments(read("app/(social)/social/posts/[postId]/post-detail-client.jsx"));
const pageSrc = stripComments(read("app/(social)/social/posts/[postId]/page.jsx"));
const cardSrc = stripComments(read("components/social/PostCard.jsx"));
const feedSrc = stripComments(read("app/(social)/social/social-client.jsx"));
const modelSrc = stripComments(read("models/social.model.js"));
const libSrc = stripComments(read("lib/social/comment.js"));

/** Every file Phase 11F added or touched, for the scope and security sweeps. */
const allNew = [listSrc, rowSrc, composerSrc, detailSrc, pageSrc, libSrc].join("\n");
/** Same, with Tailwind class strings removed. */
const allNewNoClasses = stripClasses(allNew);

// ---------------------------------------------------------------------------
console.log("comment: limits mirrored from the backend");

check("CONTENT_MAX is 2000", CONTENT_MAX === 2000);
check("the page size is 20", COMMENT_PAGE_SIZE === 20);
check("the page size is within the backend's MAX_LIMIT of 50", COMMENT_PAGE_SIZE <= 50);
check("no invented minimum length", validateComment("a").valid === true);

// ---------------------------------------------------------------------------
console.log("");
console.log("comment: validation mirrors buildCommentInput exactly");

check("empty is refused", validateComment("").valid === false);
check("whitespace-only is refused, as the backend refuses it",
  validateComment("   \n\t  ").valid === false);
check("a non-string is refused", validateComment(undefined).valid === false
  && validateComment(null).valid === false && validateComment(42).valid === false);
check("an ordinary comment is accepted", validateComment("Nice stand!").valid === true);
check("the trimmed value is returned, not the raw text",
  validateComment("  hello  ").value === "hello");

// Checked AFTER trimming, exactly as the backend does it, so trailing whitespace
// cannot push a legitimate comment over the limit.
check("exactly 2000 characters is accepted", validateComment("x".repeat(2000)).valid === true);
check("2001 characters is refused", validateComment("x".repeat(2001)).valid === false);
check("2000 characters plus trailing whitespace is still accepted",
  validateComment("x".repeat(2000) + "   \n").valid === true);
check("the over-length message names the real limit",
  /2000/.test(validateComment("x".repeat(2001)).error || ""));

check("commentLength counts after trimming", commentLength("  abc  ") === 3);
check("commentLength of a non-string is 0", commentLength(null) === 0 && commentLength(7) === 0);

// ---------------------------------------------------------------------------
console.log("");
console.log("comment: the create payload is a whitelist");

const created = buildCreateCommentPayload("  hello world  ");
check("exactly one key", Object.keys(created).length === 1);
check("that key is content", Object.keys(created)[0] === "content");
check("the content is trimmed", created.content === "hello world");
check("a non-string becomes an empty string, not undefined",
  buildCreateCommentPayload(undefined).content === "");

// ---------------------------------------------------------------------------
console.log("");
console.log("comment: taggedUsers is OMITTED, never sent as []");

for (const [label, payload] of [
  ["create", buildCreateCommentPayload("hi")],
  ["edit", buildEditCommentPayload("hi")],
]) {
  check(`${label}: taggedUsers is absent from the keys`,
    !Object.keys(payload).includes("taggedUsers"));
  check(`${label}: the key does not merely hold undefined`,
    !Object.prototype.hasOwnProperty.call(payload, "taggedUsers"));
  check(`${label}: taggedUsers is absent from the serialised body`,
    !/taggedUsers/.test(JSON.stringify(payload)));
  check(`${label}: exactly one key survives`, Object.keys(payload).length === 1);
}

// buildCommentInput writes taggedUsers into $set ONLY when the key is present:
// absent preserves the stored tags, [] clears them. So the omission is what stops
// an edit of the text from erasing the tags.
check("the edit payload ignores tags even when handed them",
  !("taggedUsers" in buildEditCommentPayload("hi")));

// ---------------------------------------------------------------------------
console.log("");
console.log("comment: the edit payload is a whitelist and still sends content");

const edited = buildEditCommentPayload("  fixed typo  ");
check("exactly one key", Object.keys(edited).length === 1);
check("content is present — buildCommentInput requires it", edited.content === "fixed typo");
for (const forbidden of ["author", "post", "postId", "commentCount", "_id", "createdAt", "updatedAt"]) {
  check(`edit never sends ${forbidden}`, !(forbidden in edited));
}

// ---------------------------------------------------------------------------
console.log("");
console.log("comment: ownership is a display decision only");

const mine = { _id: "c1", author: { _id: "u1" } };
check("my own comment", isOwnComment("u1", mine) === true);
check("somebody else's comment", isOwnComment("u2", mine) === false);
check("a deleted author is nobody's own comment",
  isOwnComment("u1", { _id: "c1", author: null }) === false);
check("no cached user means no ownership", isOwnComment(null, mine) === false);
check("ids are compared as strings", isOwnComment({ toString: () => "u1" }, mine) === true);
check("a missing comment is not owned", isOwnComment("u1", null) === false);

// ---------------------------------------------------------------------------
console.log("");
console.log("comment: commentCount comes from the server or not at all");

const post = { _id: "p1", title: "t", commentCount: 5, likeCount: 2 };

check("an authoritative number replaces the old one",
  applyAuthoritativeCount(post, 6).commentCount === 6);
check("zero is authoritative — deleting the last comment",
  applyAuthoritativeCount(post, 0).commentCount === 0);
check("a missing count leaves the post EXACTLY as it was",
  applyAuthoritativeCount(post, undefined) === post);
check("a null count changes nothing", applyAuthoritativeCount(post, null) === post);
check("a non-numeric count changes nothing", applyAuthoritativeCount(post, "lots") === post);
check("a negative count is refused rather than displayed",
  applyAuthoritativeCount(post, -3) === post);
// Number(null), Number("") and Number(false) are all 0, so a coercing version of
// this would turn a missing field into "this post now has zero comments".
check("an empty string does not become zero", applyAuthoritativeCount(post, "") === post);
check("false does not become zero", applyAuthoritativeCount(post, false) === post);
check("a numeric STRING is not trusted either", applyAuthoritativeCount(post, "6") === post);
check("NaN changes nothing", applyAuthoritativeCount(post, NaN) === post);
check("Infinity changes nothing", applyAuthoritativeCount(post, Infinity) === post);
check("nothing else on the post is touched",
  applyAuthoritativeCount(post, 9).likeCount === 2
  && applyAuthoritativeCount(post, 9).title === "t");
check("the post is not mutated in place", (() => {
  applyAuthoritativeCount(post, 99);
  return post.commentCount === 5;
})());
check("a missing post is handled", applyAuthoritativeCount(null, 3) === null);

// The count can never come from a loaded page: a post with sixty comments shows
// twenty on screen, and 20 is not the answer.
check("a loaded page of 20 does not become the count of a post with 60",
  applyAuthoritativeCount({ commentCount: 60 }, undefined).commentCount === 60);

// ---------------------------------------------------------------------------
console.log("");
console.log("comment: detail assembly needs the reaction read");

const canonical = { _id: "p1", title: "t", likeCount: 1, dislikeCount: 0 };
check("the canonical post carries no viewerReaction of its own",
  canonical.viewerReaction === undefined);
check("it is normalised to null when no reaction is supplied",
  buildPostDetail(canonical, null).viewerReaction === null);
check("the viewer's reaction is merged in",
  buildPostDetail(canonical, { viewerReaction: "like", likeCount: 4, dislikeCount: 1 }).viewerReaction === "like");
check("the reaction endpoint's fresher counts win",
  buildPostDetail(canonical, { viewerReaction: null, likeCount: 4, dislikeCount: 1 }).likeCount === 4);
check("a reaction response without counts leaves the post's own",
  buildPostDetail(canonical, { viewerReaction: "dislike" }).likeCount === 1);
check("an absent viewerReaction in the reaction body becomes null",
  buildPostDetail(canonical, {}).viewerReaction === null);
check("a missing post yields null rather than a shell",
  buildPostDetail(null, { viewerReaction: "like" }) === null);
check("nothing is invented beyond viewerReaction and the two counts",
  Object.keys(buildPostDetail(canonical, { viewerReaction: "like" })).sort().join(",")
    === "_id,dislikeCount,likeCount,title,viewerReaction");

// ---------------------------------------------------------------------------
console.log("");
console.log("comment: error mapping");

const err = (status, message) => ({ response: { status, data: message === undefined ? {} : { message } } });

check("a post 404 is the concealment sentence",
  describePostDetailError(err(404, "Post not found.")) === "This post isn't available.");
check("a post 400 reads as unavailable, not 'Invalid post id.'",
  describePostDetailError(err(400, "Invalid post id.")) === "This post isn't available.");
check("a post 400 does not echo the backend's validation wording",
  !/Invalid post id/.test(describePostDetailError(err(400, "Invalid post id."))));
check("a post 429 uses the server's wording",
  describePostDetailError(err(429, "Too many requests. Please wait a moment and try again."))
    === "Too many requests. Please wait a moment and try again.");
check("a post 429 without wording has a default",
  /Too many requests/.test(describePostDetailError(err(429))));
check("a post 500 uses the caller's fallback",
  describePostDetailError(err(500, "Internal Server Error"), "nope") === "nope");
check("a network failure uses the caller's fallback",
  describePostDetailError(new Error("Network Error"), "nope") === "nope");

check("a comment 404 names the COMMENT, not the post",
  describeCommentError(err(404, "Comment not found.")) === "This comment isn't available.");
check("a comment 404 does not claim the post is gone",
  !/post/i.test(describeCommentError(err(404, "Comment not found."))));
check("a comment 400 shows the server's validation wording",
  describeCommentError(err(400, "content cannot exceed 2000 characters."))
    === "content cannot exceed 2000 characters.");
check("a comment 429 uses the server's wording",
  describeCommentError(err(429, "Too many comment changes. Please wait a little and try again."))
    === "Too many comment changes. Please wait a little and try again.");
check("a comment 500 uses the caller's fallback",
  describeCommentError(err(500), "nope") === "nope");

// Only a string `message` is ever rendered; the response object carries config and
// headers, and a structured body is not a contract this UI has.
check("a structured message object is not rendered",
  describeCommentError({ response: { status: 400, data: { message: { code: 7 } } } }, "nope") === "nope");
check("an array message is not rendered",
  describeCommentError({ response: { status: 400, data: { message: ["a"] } } }, "nope") === "nope");
check("an empty string message falls back",
  describeCommentError(err(400, ""), "nope") === "nope");

check("a cancelled request is recognised by name", isCanceled({ name: "CanceledError" }) === true);
check("a cancelled request is recognised by code", isCanceled({ code: "ERR_CANCELED" }) === true);
check("an ordinary error is not a cancellation", isCanceled(new Error("boom")) === false);
check("no error is not a cancellation", isCanceled(null) === false);

// ---------------------------------------------------------------------------
console.log("");
console.log("comment list: the shared cursor helpers, not a second implementation");

const page1 = { items: [{ _id: "c3" }, { _id: "c2" }], nextCursor: "CUR", hasMore: true };
const state1 = mergePage(emptyList(), page1, "replace");

check("a new comment goes to the top", prependItem(state1, { _id: "c4" }).items[0]._id === "c4");
check("prepend preserves the server's order below",
  prependItem(state1, { _id: "c4" }).items.map((c) => c._id).join(",") === "c4,c3,c2");
check("prepend dedupes by _id, so a double submit cannot show it twice",
  prependItem(prependItem(state1, { _id: "c4" }), { _id: "c4" }).items.length === 3);
check("prepend leaves the cursor untouched",
  prependItem(state1, { _id: "c4" }).nextCursor === "CUR");
check("prepend leaves hasMore untouched", prependItem(state1, { _id: "c4" }).hasMore === true);

check("replaceItem swaps exactly one comment",
  replaceItem(state1, "c2", { _id: "c2", content: "edited" }).items[1].content === "edited");
check("replaceItem leaves its neighbours alone",
  replaceItem(state1, "c2", { _id: "c2", content: "edited" }).items[0].content === undefined);
check("replaceItem does not reorder",
  replaceItem(state1, "c3", { _id: "c3" }).items.map((c) => c._id).join(",") === "c3,c2");
check("removeItem removes exactly one comment",
  removeItem(state1, "c3").items.map((c) => c._id).join(",") === "c2");
check("removeItem leaves the cursor alone", removeItem(state1, "c3").nextCursor === "CUR");

check("append keeps page one above page two",
  mergePage(state1, { items: [{ _id: "c1" }], nextCursor: null, hasMore: false }, "append")
    .items.map((c) => c._id).join(",") === "c3,c2,c1");

// ---------------------------------------------------------------------------
console.log("");
console.log("comment list: hasMore + nextCursor is the ONLY continuation signal");

// A short page with more behind it: two rows for a limit of twenty, hasMore true.
const shortPage = mergePage(emptyList(), { items: [{ _id: "c1" }, { _id: "c2" }], nextCursor: "CUR", hasMore: true }, "replace");
check("a SHORT page with hasMore still offers more", canLoadMore(shortPage, false) === true);
check("a full page without hasMore does not",
  canLoadMore(mergePage(emptyList(), {
    items: Array.from({ length: 20 }, (_, i) => ({ _id: `c${i}` })), nextCursor: null, hasMore: false,
  }, "replace"), false) === false);
check("hasMore without a cursor is not enough",
  canLoadMore(mergePage(emptyList(), { items: [{ _id: "c1" }], nextCursor: null, hasMore: true }, "replace"), false) === false);
check("an in-flight page blocks a duplicate request", canLoadMore(shortPage, true) === false);

check("the list uses canLoadMore rather than a length comparison",
  /canLoadMore\(/.test(listSrc));
check("the list never compares a loaded length against the limit",
  !/items\.length\s*[<>]/.test(listSrc) && !/length\s*<\s*(limit|COMMENT_PAGE_SIZE|PAGE_SIZE|20)/.test(listSrc));
check("the list never infers the end from comments.length",
  !/comments\.length\s*[<>]/.test(listSrc));
check("no second cursor implementation — the shared helper is imported",
  /from "@\/lib\/social\/cursor-list"/.test(listSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("comment list: cursors stay opaque, and there is no offset pagination");

const listAndModel = stripClasses(listSrc) + "\n" + modelSrc;
check("no page parameter", !/\bpage\s*[:=]\s*\d/.test(listAndModel));
check("no skip", !/\bskip\b/.test(stripClasses(listSrc)));
check("no offset", !/\boffset\b/.test(stripClasses(listSrc)));
check("the cursor is passed through, never parsed",
  !/atob|Buffer\.from|base64|decodeCursor|split\("\|"\)/.test(stripClasses(listSrc)));
check("the cursor comes from the state, not from an item",
  /list\.nextCursor/.test(listSrc));
check("the cursor is never built from a comment's fields",
  !/cursor[^\n]*createdAt/.test(listSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("comment list: server order is preserved, never re-sorted");

check("the list never sorts", !/\.sort\(/.test(listSrc));
check("the list never reverses — this is not a chat transcript", !/\.reverse\(/.test(listSrc));
check("the row never sorts or reverses", !/\.sort\(|\.reverse\(/.test(rowSrc));
check("the new comment is PREPENDED, matching the newest-first server order",
  /prependItem\(/.test(listSrc));
check("the list does not append a new comment to the bottom",
  !/\[\s*\.\.\.\s*prev\.items\s*,/.test(listSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("comment list: the endpoints it actually uses");

check("the comment list endpoint", /getComments\(/.test(listSrc));
check("create", /createComment\(/.test(listSrc));
check("edit", /updateComment\(/.test(listSrc));
check("delete", /deleteComment\(/.test(listSrc));
check("exactly those four comment functions are imported",
  /import \{ getComments, createComment, updateComment, deleteComment \} from "@\/models\/social\.model"/.test(listSrc));
check("the detail page reads the post", /getPost\(/.test(detailSrc));
check("the detail page reads the viewer's reaction ONCE",
  (detailSrc.match(/getPostReaction\(/g) || []).length === 1);
check("the detail page deletes the post", /deletePost\(/.test(detailSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("post ids are encoded, and no URL is built by hand");

check("the model encodes every id", /const id = \(value\) => encodeURIComponent/.test(modelSrc));
check("getPost goes through it", /getPost = \(postId, config\) => axios\.get\(`\/api\/social\/posts\/\$\{id\(postId\)\}`/.test(modelSrc));
check("getComments goes through it", /getComments = \(postId, page\) =>[\s\S]{0,120}\$\{id\(postId\)\}/.test(modelSrc));
check("updateComment goes through it", /updateComment = \(commentId, payload\) =>[\s\S]{0,140}\$\{id\(commentId\)\}/.test(modelSrc));
check("deleteComment goes through it", /deleteComment = \(commentId\) =>[\s\S]{0,140}\$\{id\(commentId\)\}/.test(modelSrc));
check("the detail client builds no API URL itself", !/\/api\//.test(detailSrc));
check("the comment list builds no API URL itself", !/\/api\//.test(listSrc));
check("the row builds no API URL itself", !/\/api\//.test(rowSrc));
check("the card's comment link encodes the post id",
  /href=\{`\/social\/posts\/\$\{encodeURIComponent\(String\(postId\)\)\}`\}/.test(cardSrc));
check("the row's profile links encode the user id",
  (rowSrc.match(/encodeURIComponent\(String\(u?\.?_id\)\)|encodeURIComponent\(String\(author\._id\)\)/g) || []).length >= 2);

// ---------------------------------------------------------------------------
console.log("");
console.log("no N+1: a row fetches nothing, ever");

check("the row imports no model", !/models\/social\.model/.test(rowSrc));
check("the row imports no axios", !/axios/.test(rowSrc));
check("the composer imports no model", !/models\/social\.model/.test(composerSrc));
check("the composer imports no axios", !/axios/.test(composerSrc));
check("no per-comment profile fetch anywhere", !/getSocialProfile\(/.test(allNew));
check("no per-comment follow-status fetch", !/getFollowStatus\(/.test(allNew));
check("no per-comment author lookup", !/getFollowers\(|getFollowing\(/.test(allNew));
check("the row uses comment.author, the hydrated object",
  /comment\.author/.test(rowSrc));
check("the row uses comment.taggedUsers, the hydrated objects",
  /comment\.taggedUsers/.test(rowSrc));
check("tagged users are never resolved by a request",
  !/resolve|hydrate|fetchUser/i.test(stripClasses(rowSrc)));

// The one place a reaction read is allowed is the detail page, because the
// canonical post shape has no viewerReaction. Feed cards must stay at zero.
console.log("");
console.log("the feed keeps zero reads per card");

check("PostCard still makes no read request",
  !/getPostReaction|getSocialProfile|getComments|getFeed|getPost\(/.test(cardSrc));
check("PostCard's only requests are the two reaction mutations",
  /import \{ setPostReaction, clearPostReaction \} from "@\/models\/social\.model"/.test(cardSrc));
check("the feed page reads no reaction", !/getPostReaction\(/.test(feedSrc));
check("the feed page reads no comments", !/getComments\(/.test(feedSrc));
check("the feed still relies on the embedded viewerReaction",
  /viewerReaction/.test(cardSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("a deleted author renders safely and shows no id");

check("there is a wording for it", AUTHOR_UNAVAILABLE === "Unavailable account");
check("the row uses it", /AUTHOR_UNAVAILABLE/.test(rowSrc));
check("the row branches on a null author", /comment\.author \|\| null/.test(rowSrc));
check("a null author is not wrapped in a profile link",
  /author \? \([\s\S]{0,400}<Link/.test(rowSrc));
check("no raw author id is ever rendered as text",
  !/\{String\(comment\.author\._id\)\}|\{comment\.author\._id\}/.test(rowSrc));
check("no raw comment id is rendered as text", !/>\{String\(comment\._id\)\}</.test(rowSrc));
check("a comment id appears only as an element id or a key",
  !/\{comment\._id\}\s*</.test(rowSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("comment content is plain text");

check("no dangerouslySetInnerHTML in any 11F file", !/dangerouslySetInnerHTML/.test(allNew));
check("no innerHTML at all, in any casing", !/innerhtml/i.test(allNew));
check("no markdown renderer", !/marked|markdown|remark|rehype|DOMPurify|sanitize-html/i.test(allNew));
check("no HTML parser", !/parse5|htmlparser|new DOMParser/.test(allNew));
check("the content is rendered as a React child", /\{comment\.content\}/.test(rowSrc));
check("line breaks are preserved by CSS, not by markup",
  /whitespace-pre-line/.test(read("components/social/CommentRow.jsx")));
check("long words cannot overflow the column",
  /break-words/.test(read("components/social/CommentRow.jsx")));
check("no automatic linkification was invented here",
  !/linkify|autolink|https?:\/\/[^"'\s]*\$\{|new RegExp\(/i.test(stripClasses(rowSrc)));

// ---------------------------------------------------------------------------
console.log("");
console.log("create: the draft survives a failure, and the count is the server's");

check("the composer clears only on a confirmed create",
  /if \(created\) setDraft\(""\)/.test(composerSrc));
check("the composer awaits the parent's verdict before deciding",
  /const created = await onSubmit\(draft\)/.test(composerSrc));
check("the composer does not clear in a finally block",
  !/finally\s*\{[^}]*setDraft\(""\)/.test(composerSrc));
check("the composer has exactly one place it clears the draft",
  (composerSrc.match(/setDraft\(""\)/g) || []).length === 1);
check("a failed create returns falsy so the draft is kept",
  /catch[\s\S]{0,260}return false/.test(listSrc));
check("the composer guards a double submit", /if \(busy\) return/.test(composerSrc));
check("the list guards a double create", /if \(creating \|\| disabled\) return false/.test(listSrc));
check("the submit button is disabled while pending", /disabled=\{busy/.test(composerSrc));
check("the authoritative count is taken from the create response",
  /onCommentCount\?\.\(data && data\.commentCount\)/.test(listSrc));
// EXACTLY two count reports — one per mutation that returns a count. A third would
// be a local guess sitting beside an authoritative one.
check("there are exactly two count reports, create and delete",
  (listSrc.match(/onCommentCount\?\./g) || []).length === 2);
check("both of them read the server's field",
  (listSrc.match(/onCommentCount\?\.\(data && data\.commentCount\)/g) || []).length === 2);
check("the count is never computed from the loaded list",
  !/onCommentCount\?\.\([^)]*length/.test(listSrc));
check("nothing anywhere derives the count from items.length",
  !/commentCount[^\n]*items\.length|items\.length[^\n]*commentCount/i.test(listSrc + detailSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("no local decrement, so no double decrement is possible");

const countSites = listSrc + "\n" + detailSrc + "\n" + libSrc;
check("nothing subtracts one from commentCount", !/commentCount\s*-\s*1/.test(countSites));
check("nothing adds one to commentCount", !/commentCount\s*\+\s*1/.test(countSites));
check("no delta helper is applied to the count",
  !/applyCommentDelta|adjustCommentCount|commentDelta/.test(countSites));
check("the only count path is the authoritative one",
  /applyAuthoritativeCount\(/.test(detailSrc));
check("the detail page applies the count and nothing else to it",
  (detailSrc.match(/applyAuthoritativeCount\(/g) || []).length === 1);
check("an absent count is a no-op, not a guess",
  applyAuthoritativeCount({ commentCount: 4 }, undefined).commentCount === 4);

// ---------------------------------------------------------------------------
console.log("");
console.log("edit: authoritative replacement, count untouched");

check("the edit sends the whitelist payload", /buildEditCommentPayload\(/.test(listSrc));
check("the edit replaces exactly the edited comment",
  /replaceItem\(prev, comment\._id, data\.comment\)/.test(listSrc));
check("the edit does not reload the list",
  !/handleEditSubmit[\s\S]{0,900}load\(null\)/.test(listSrc));
check("the edit reports NO count, because updateComment returns none",
  !/handleEditSubmit[\s\S]{0,900}onCommentCount/.test(listSrc));
check("a failed edit keeps the edited text — the row stays open",
  /catch[\s\S]{0,200}setRowError\(\{ id: String\(comment\._id\)/.test(listSrc));
check("a failed edit does not close the editor",
  !/catch[\s\S]{0,200}setEditingId\(null\)/.test(listSrc));
check("the edit guards a duplicate save", /if \(pendingId \|\| disabled\) return/.test(listSrc));
check("the row's save button is disabled while pending and when unchanged",
  /disabled=\{pending \|\| !valid \|\| unchanged\}/.test(rowSrc));
check("the inline form starts from the comment's current content",
  /useState\(\(\) => comment\.content \|\| ""\)/.test(rowSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("delete: confirmed, server-first, and reversible on failure");

check("the shared ConfirmDialog is reused", /ConfirmDialog/.test(listSrc));
check("it is imported, not reimplemented",
  /import ConfirmDialog from "@\/components\/social\/ConfirmDialog"/.test(listSrc));
check("window.confirm is not used anywhere in 11F", !/window\.confirm|[^.]\bconfirm\(/.test(allNew));
check("the delete has a pending guard", /if \(!deleting \|\| pendingId \|\| disabled\) return/.test(listSrc));

// The removal must come AFTER the awaited request, not before it.
const delIdx = listSrc.indexOf("await deleteComment(");
const rmIdx = listSrc.indexOf("removeItem(prev, deleting._id)");
check("the comment is removed only after the server confirms",
  delIdx > 0 && rmIdx > delIdx, `delete@${delIdx} remove@${rmIdx}`);
check("the removal is not optimistic — nothing removes before the await",
  !/setList[\s\S]{0,120}removeItem[\s\S]{0,200}await deleteComment/.test(listSrc));
check("a failed delete keeps the comment and reports beside it",
  /catch[\s\S]{0,200}setRowError\(\{ id, message: describeCommentError/.test(listSrc));
check("a failed delete does not remove anything",
  !/catch[\s\S]{0,200}removeItem/.test(listSrc));
check("the authoritative count from the delete response is used",
  /removeItem\(prev, deleting\._id\)[\s\S]{0,300}onCommentCount/.test(listSrc));
check("the dialog is pending only for the comment being deleted",
  /pending=\{Boolean\(deleting\) && pendingId === String\(deleting\._id\)\}/.test(listSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("owner controls are gated, and cannot be dead");

check("the row's controls require ownership AND both handlers",
  /isOwn && onEditStart && onDeleteRequest \?/.test(rowSrc));
check("ownership is the FIRST condition on the gate", /\{isOwn &&/.test(rowSrc));
check("the row does not decide ownership itself",
  !/user|localStorage|useAuth/.test(rowSrc));
check("the list decides ownership with isOwnComment",
  /isOwn=\{isOwnComment\(viewerId, comment\)\}/.test(listSrc));
check("the row defaults to NOT owned", /isOwn = false/.test(rowSrc));
check("the controls are real buttons", /<button\s|type="button"/.test(rowSrc));
check("no clickable div", !/<div[^>]*onClick/.test(rowSrc) && !/<div[^>]*onClick/.test(listSrc));
check("each control has an explicit accessible name",
  /aria-label=\{label\}/.test(rowSrc) && /label=\{?`?Edit your comment/.test(rowSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("races: one pending mutation at a time, and no zombie writes");

check("one pending id, not a queue", /const \[pendingId, setPendingId\]/.test(listSrc));
check("no global mutation queue", !/queue|Queue/.test(listSrc));
check("other rows are disabled while one mutates",
  /disabled=\{disabled \|\| \(Boolean\(pendingId\) && pendingId !== id\)\}/.test(listSrc));
check("a row being edited renders no Delete button — the form replaces them",
  /editing \?[\s\S]{0,300}<EditForm/.test(rowSrc));
check("comment mutations stop while the post is being deleted",
  /disabled=\{deletePending\}/.test(detailSrc));
check("the list honours that flag on create", /if \(creating \|\| disabled\)/.test(listSrc));
check("the list honours it on edit and delete",
  (listSrc.match(/\|\| disabled\) return/g) || []).length >= 2);
check("a mounted guard stops a late response writing state",
  /mountedRef/.test(listSrc) && /mountedRef/.test(detailSrc));
check("the detail latches 'gone' before navigating away", /goneRef\.current = true/.test(detailSrc));
check("every late detail callback checks it",
  (detailSrc.match(/goneRef\.current/g) || []).length >= 4);
check("nothing writes state after a successful post delete",
  /router\.push\("\/social"\)/.test(detailSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("cancellation: both reads abort, and a cancel is never an error");

check("the detail read is abortable", /new AbortController\(\)/.test(detailSrc));
check("both detail reads share one signal",
  /const config = \{ signal: controller\.signal \}/.test(detailSrc));
check("the two reads go out together", /Promise\.all\(\[/.test(detailSrc));
check("a new detail read aborts the previous one",
  /abortRef\.current\?\.abort\(\)/.test(detailSrc));
check("the detail aborts on unmount and on postId change",
  /return \(\) => abortRef\.current\?\.abort\(\)/.test(detailSrc));
check("the comment list read is abortable", /signal: controller\.signal/.test(listSrc));
check("a new comment read aborts the previous one",
  /abortRef\.current\?\.abort\(\)/.test(listSrc));
check("the list resets its state when the post changes",
  /setList\(emptyList\(\)\)/.test(listSrc));
check("a cancelled detail read renders no error",
  /if \(isCanceled\(err\)\) return/.test(detailSrc));
check("a cancelled comment read renders no error",
  /if \(isCanceled\(error\)\) return/.test(listSrc));
check("load-more cannot fire twice at once", /disabled=\{loadingMore\}/.test(listSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("list states, and a failed page two keeps what is on screen");

for (const [label, re] of [
  ["initial loading", /phase === "loading"/],
  ["initial error", /phase === "error"/],
  ["ready", /phase === "ready"/],
  ["empty", /!list\.items\.length/],
  ["loading more", /loadingMore \?/],
  ["load-more error", /loadMoreError \?/],
  ["end of list", /canLoadMore\(list, loadingMore\)/],
]) {
  check(`the list has a ${label} state`, re.test(listSrc));
}
check("a failed page two sets only loadMoreError", /setLoadMoreError\(describeCommentError/.test(listSrc));
check("a failed page two does not clear the list",
  !/setLoadMoreError[\s\S]{0,160}setList\(emptyList/.test(listSrc));
check("an explicit Load more button, not infinite scroll",
  /Load more comments/.test(read("components/social/CommentList.jsx")));
check("no IntersectionObserver", !/IntersectionObserver/.test(allNew));
check("no scroll listener", !/addEventListener\("scroll"|onScroll/.test(allNew));

// ---------------------------------------------------------------------------
console.log("");
console.log("no polling, and no automatic retry of a mutation");

check("no setInterval anywhere in 11F", !/setInterval/.test(allNew));
check("no setTimeout anywhere in 11F", !/setTimeout/.test(allNew));
check("no interval is cleared, because none is created",
  !/clearInterval|clearTimeout/.test(allNew));
check("no polling helper", !/poll|Poll|refetchInterval|revalidateOnInterval/.test(allNewNoClasses));
check("no retry of a comment mutation", !/retry|Retry|attempt\s*\+\+|maxAttempts/.test(allNewNoClasses));
check("no request loop", !/while\s*\(/.test(allNew));
check("the only re-request is a user-initiated Try again",
  /onClick=\{\(\) => load\(null\)\}/.test(listSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("accessibility contracts that can be checked in source");

check("the composer uses a real textarea", /<textarea/.test(composerSrc));
check("the composer's field is labelled", /htmlFor="comment-composer"/.test(composerSrc));
check("the composer's error is associated with the field",
  /aria-describedby="comment-composer-hint"/.test(composerSrc));
check("the composer marks the field invalid when over the limit",
  /aria-invalid=\{over/.test(composerSrc));
check("the composer shows a character count", /\$\{used\} \/ \$\{CONTENT_MAX\}/.test(composerSrc));
check("the composer announces its error", /role=\{error \|\| over \? "alert" : undefined\}/.test(composerSrc));
check("the composer marks itself busy", /aria-busy=\{pending/.test(composerSrc));
check("the inline edit field is labelled", /htmlFor=\{fieldId\}/.test(rowSrc));
check("the inline edit associates its error", /aria-describedby=\{hintId\}/.test(rowSrc));
check("focus moves into the inline edit field", /areaRef\.current\?\.focus\(\)/.test(rowSrc));
check("the list's initial error is announced", /role="alert"/.test(listSrc));
check("loading states are marked busy", /aria-busy="true"/.test(listSrc) && /aria-busy="true"/.test(detailSrc));
check("the comments section is labelled", /aria-labelledby="comments-heading"/.test(listSrc));
check("the comment list is a real list", /<ul/.test(listSrc) && /<li/.test(rowSrc));
check("the comment count link says what it opens",
  /aria-label=\{`\$\{n\} \$\{noun\} — open this post`\}/.test(cardSrc));
check("the count is not read twice by a screen reader",
  /<span aria-hidden="true">\{n\}<\/span>/.test(cardSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("the feed's comment count is a real Link to the detail route");

check("it is a Link, not a div with onClick", /<Link[\s\S]{0,300}\/social\/posts\//.test(cardSrc));
check("there is no comments modal in the card", !/Dialog|Sheet|Modal/.test(cardSrc));
check("the card renders no comment list", !/CommentList|CommentRow|CommentComposer/.test(cardSrc));
check("the new prop has a safe default so the feed is unchanged",
  /linkComments = true/.test(cardSrc));
check("the detail page turns the link off — it is already there",
  /linkComments=\{false\}/.test(detailSrc));
check("the non-link form still announces the count",
  /<span className="">\{`\$\{n\} \$\{noun\}`\}<\/span>|sr-only[\s\S]{0,80}\$\{n\} \$\{noun\}/.test(stripClasses(cardSrc) + cardSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("the detail route is private and reuses the existing post components");

check("noindex/nofollow", /robots: NOINDEX_NOFOLLOW/.test(pageSrc));
check("no generateStaticParams", !/generateStaticParams/.test(pageSrc));
check("the page fetches no protected data",
  !/axios|models\/social\.model|getPost|getComments/.test(pageSrc));
check("params is awaited, as Next 15 requires", /await params/.test(pageSrc));
check("the title is generic, not the post's own content",
  /title: "Post"/.test(pageSrc));
check("PostCard is reused, not reimplemented",
  /import PostCard from "@\/components\/social\/PostCard"/.test(detailSrc));
check("there is no second post renderer", !/<article/.test(detailSrc));
check("no second media renderer", !/PostMedia|<img|<video/.test(detailSrc));
check("the 11E edit sheet is reused",
  /import PostEditSheet from "@\/components\/social\/PostEditSheet"/.test(detailSrc));
check("there is no second edit form in the detail page",
  !/PostFormFields|MediaPicker|<textarea/.test(detailSrc));
check("the 11E confirm dialog is reused for the post",
  /import ConfirmDialog from "@\/components\/social\/ConfirmDialog"/.test(detailSrc));
check("the detail page does not seed from a stale feed object",
  !/sessionStorage|localStorage|initialPost|searchParams/.test(detailSrc));
check("the post delete is ONE request", (detailSrc.match(/deletePost\(/g) || []).length === 1);
check("no client-side cascade on post delete",
  !/deleteComment\(|deletePostMedia\(|markNotificationRead\(/.test(detailSrc));
check("a successful post delete navigates away", /router\.push\("\/social"\)/.test(detailSrc));
check("no deleted shell is left behind", !/setPost\(null\)/.test(detailSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("security sweep — zero live hits across every 11F file");

for (const [label, re] of [
  ["/api/find/signup", /find\/signup/],
  ["/api/finduser", /finduser/i],
  ["an Authorization header", /Authorization/],
  ["a Bearer token", /Bearer/],
  ["a JWT", /jwt|decodeToken|jwt_decode|atob\(/i],
  ["document.cookie", /document\.cookie/],
  ["dangerouslySetInnerHTML", /dangerouslySetInnerHTML/],
  ["POST_TAG", /POST_TAG/],
  ["COMMENT_TAG", /COMMENT_TAG/],
  ["a password field", /password/i],
  ["OTP", /\botp\b/i],
  ["mobile_number", /mobile_number/],
  ["pendingPassword", /pendingPassword/],
  ["localStorage", /localStorage/],
  ["sessionStorage", /sessionStorage/],
  ["a manual Content-Type", /Content-Type|content-type/i],
  ["a raw ObjectId construction", /ObjectId|new mongoose/],
]) {
  check(`no ${label}`, !re.test(allNewNoClasses));
}

// ---------------------------------------------------------------------------
console.log("");
console.log("scope sweep — 11F adds no call site outside its own phase");

for (const [label, re] of [
  ["getNotifications", /getNotifications\(/],
  ["getUnreadCount", /getUnreadCount\(/],
  ["markNotificationRead", /markNotificationRead\(/],
  ["markAllNotificationsRead", /markAllNotificationsRead\(/],
  ["a notification component", /Notification[A-Z]|NotificationBell|NotificationBadge/],
  ["a user search", /searchUsers\(|userSearch|\/search\?|query=/],
  ["discovery", /getDiscovery\(|suggested|trending/i],
  ["block", /blockUser\(/],
  ["mute", /muteUser\(/],
  ["report", /reportPost\(|reportComment\(/],
  ["a tag editor", /TagPicker|TagEditor|onTagsChange|setTaggedUsers/],
  ["an @mention parser", /@mention|mentionRegex|parseMentions/i],
  ["comment reactions", /setCommentReaction|commentReaction|likeComment/],
  ["threaded replies", /parentComment|replyTo|threadId|\breplies\b/],
  ["comment media", /commentMedia|addCommentMedia/],
  ["sharing", /sharePost\(|navigator\.share/],
  ["bookmarks", /bookmark|savePost\(/i],
  ["moderation", /moderate|moderation/i],
]) {
  check(`no ${label}`, !re.test(allNewNoClasses));
}

// ---------------------------------------------------------------------------
console.log("");
console.log("dependencies: nothing new");

const pkg = JSON.parse(read("package.json"));
const deps = Object.keys(pkg.dependencies || {});
for (const banned of ["react-markdown", "marked", "remark", "dayjs", "date-fns", "moment",
  "@tanstack/react-query", "swr", "zustand", "redux", "dompurify", "react-comments"]) {
  check(`${banned} is not a dependency`, !deps.includes(banned));
}
check("the 11F libs import nothing from node_modules but React/Next",
  !/from "(?!react|next|lucide-react|sonner|@\/)/.test(listSrc + rowSrc + composerSrc + detailSrc));
check("lib/social/comment.js imports only a relative sibling",
  /^import \{ displayCount \} from "\.\/post\.js";$/m.test(libSrc));
check("the lib uses no alias, so plain Node can load it", !/from "@\//.test(libSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("11D and 11E behaviour is still intact");

check("PostCard still delegates to planPostReaction", /planPostReaction\(/.test(cardSrc));
check("PostCard still applies the authoritative reaction result", /applyReactionResult\(/.test(cardSrc));
check("PostCard still reverts from a snapshot", /revertReaction\(/.test(cardSrc));
check("PostCard's reaction controls still disable while pending",
  (cardSrc.match(/pending=\{pending\}/g) || []).length === 2);
check("PostCard still has no local reaction transition decision",
  !/viewerReaction\s*===\s*clicked/.test(cardSrc));
check("the owner menu is still gated on ownership and both handlers",
  /isOwnPost && onEditRequest && onDeleteRequest \?/.test(cardSrc));
check("the feed still prepends a created post", /prependItem\(/.test(feedSrc));
check("the feed still deletes server-first",
  feedSrc.indexOf("await deletePost(") < feedSrc.indexOf("removeItem(prev, deleting._id)"));
check("no post data is duplicated into PostCard's local state",
  !/useState\([^)]*post\b/.test(cardSrc));

console.log("");
console.log(failed ? `=== ${failed} FAILED ===` : "=== all passed ===");
process.exit(failed ? 1 : 0);
