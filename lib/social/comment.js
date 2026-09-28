/*
 * RELATIVE IMPORTS, NOT THE `@/` ALIAS — webpack resolves the alias, Node does
 * not, and this module has to be loadable by the plain-Node test runner.
 */
import { displayCount } from "./post.js";

/**
 * Pure logic for the post detail page and its comments.
 *
 * Every limit and every rule here is MIRRORED from the deployed backend, read
 * from Controller/socialComment.controller.js and Model/SocialComment.model.js
 * before any of this was written. The server stays the authority; this exists so
 * the user learns about an empty or over-long comment without a round trip.
 */

// ---- limits, verified against the deployed backend --------------------------

/** Model/SocialComment.model.js: CONTENT_MAX. */
export const CONTENT_MAX = 2000;

/** Within the backend's MAX_LIMIT of 50; 20 is also its DEFAULT_LIMIT. */
export const COMMENT_PAGE_SIZE = 20;

/**
 * What is rendered where a comment's author used to be.
 *
 * shapeComments emits `author: null` when the account has been deleted, and the
 * comment still renders rather than vanishing and leaving a hole in the
 * pagination. No id is shown: an ObjectId is not an identity to a reader, and
 * printing one would expose a key for an account that no longer exists.
 */
export const AUTHOR_UNAVAILABLE = "Unavailable account";

// ---- validation -------------------------------------------------------------

/**
 * Mirror buildCommentInput's content rules exactly.
 *
 * The backend requires the key, refuses a non-string, TRIMS, refuses empty, and
 * checks the length AFTER trimming — so trailing whitespace cannot push a
 * legitimate comment over the limit. Nothing stricter is invented here: there is
 * no minimum length beyond non-empty, because the backend has none.
 *
 * @returns {{valid: boolean, error: string|null, value: string}}
 */
export function validateComment(content) {
  const value = typeof content === "string" ? content.trim() : "";

  if (!value.length) return { valid: false, error: "Write something first.", value };
  if (value.length > CONTENT_MAX) {
    return { valid: false, error: `A comment cannot exceed ${CONTENT_MAX} characters.`, value };
  }

  return { valid: true, error: null, value };
}

/** Characters used, counted the way the backend counts them: after trimming. */
export function commentLength(content) {
  return typeof content === "string" ? content.trim().length : 0;
}

// ---- payloads ---------------------------------------------------------------

/**
 * The create body — a WHITELIST of the single field this phase sets.
 *
 * buildCommentInput refuses unknown keys outright: anything outside
 * EDITABLE_FIELDS (`content`, `taggedUsers`) is a 400 naming the field, and every
 * PROTECTED_FIELD (`post`, `author`, `commentCount`, `_id`, `createdAt`,
 * `updatedAt`) is a 400 too. So a stray key is a failed request, not noise — which
 * is why this is built from one field rather than spread from form state.
 *
 * `taggedUsers` is absent because Phase 11F has no tag picker. On create that
 * means an empty tag list, which is what a comment tagging nobody should have.
 */
export function buildCreateCommentPayload(content) {
  return { content: typeof content === "string" ? content.trim() : "" };
}

/**
 * The edit body.
 *
 * `taggedUsers` IS DELIBERATELY OMITTED, and the omission is load-bearing.
 * buildCommentInput writes the key into $set only when the request carries it:
 *
 *   absent  -> the stored tags are PRESERVED
 *   []      -> the stored tags are CLEARED
 *
 * Phase 11F edits no tags, so sending `taggedUsers: []` would silently erase every
 * tag on a comment whose author only wanted to fix a word. Omitting the key is the
 * only correct behaviour until a tag picker exists.
 *
 * `content` IS sent, and must be: buildCommentInput answers "content is required."
 * when the key is absent, so there is no content-free edit of a comment.
 */
export function buildEditCommentPayload(content) {
  return { content: typeof content === "string" ? content.trim() : "" };
}

// ---- ownership --------------------------------------------------------------

/**
 * Is this the signed-in user's own comment?
 *
 * The cached auth id answers this one question and nothing else. It decides which
 * affordances to show; `comment.author` remains the rendering authority, and the
 * backend pins `author` into the FILTER of every comment mutation regardless, so a
 * forged answer here buys a 404 rather than access.
 *
 * A comment whose author has been deleted is nobody's own comment.
 */
export function isOwnComment(cachedUserId, comment) {
  const authorId = comment && comment.author && comment.author._id;
  if (!cachedUserId || !authorId) return false;
  return String(cachedUserId) === String(authorId);
}

// ---- counts ----------------------------------------------------------------

/**
 * Patch a post's `commentCount` from a mutation response, and nothing else.
 *
 * ONLY an authoritative number is accepted. createComment and deleteComment both
 * return the post's freshly read `commentCount`; updateComment does not, because
 * editing a comment does not change how many there are. When the value is missing
 * or unusable the post is returned UNCHANGED — never adjusted by a local guess.
 *
 * This is the whole reason there is no double decrement to avoid: nothing here
 * ever decrements. The server's number replaces the old one outright.
 *
 * It is also why the count is never derived from a loaded list: `comments.length`
 * is one page of at most twenty, so a post with sixty comments would display 20.
 */
export function applyAuthoritativeCount(post, commentCount) {
  if (!post || typeof post !== "object") return post;
  /*
   * typeof FIRST, and no Number() coercion. `Number(null)` is 0 and `Number("")`
   * is 0, so coercing would turn a missing field into "this post now has zero
   * comments" — the exact guess this function exists to refuse. The backend's
   * currentCommentCount always returns a real number, so anything else is a
   * response this UI has no contract for and must leave the post alone.
   */
  if (typeof commentCount !== "number" || !Number.isFinite(commentCount) || commentCount < 0) {
    return post;
  }
  return { ...post, commentCount: displayCount(commentCount) };
}

// ---- detail assembly --------------------------------------------------------

/**
 * Build the detail page's post from the two reads it needs.
 *
 * GET /api/social/posts/:postId returns the CANONICAL shape and deliberately
 * carries NO `viewerReaction` — listPosts only attaches that field when the feed
 * passes its decorator, and the post controller's own comment says the other
 * endpoints must not start emitting it. So the detail page reads the viewer's
 * reaction once, from GET /api/social/posts/:postId/reaction, and merges it here.
 *
 * The reaction response's `likeCount` and `dislikeCount` are freshly read by that
 * endpoint, so they are preferred over the post document's copies when present.
 *
 * Exactly one reaction read, for the whole page. Feed cards still read nothing.
 */
export function buildPostDetail(post, reaction) {
  if (!post || typeof post !== "object") return null;

  const state = reaction && typeof reaction === "object" ? reaction : null;
  const merged = { ...post, viewerReaction: state ? state.viewerReaction ?? null : null };

  if (state && state.likeCount !== undefined) merged.likeCount = displayCount(state.likeCount);
  if (state && state.dislikeCount !== undefined) {
    merged.dislikeCount = displayCount(state.dislikeCount);
  }

  return merged;
}

// ---- errors ----------------------------------------------------------------

const serverMessageOf = (error) => {
  const data = error && error.response && error.response.data;
  // Only a string `message` is ever displayed. A structured body is not a contract
  // this UI has, and the response object itself carries config and headers.
  return data && typeof data.message === "string" && data.message ? data.message : null;
};

/** Did this request fail because we cancelled it? Then it is not a failure. */
export function isCanceled(error) {
  return Boolean(error) && (error.name === "CanceledError" || error.code === "ERR_CANCELED");
}

/**
 * Post-level failure on the detail page.
 *
 * 400 AND 404 BOTH BECOME THE SAME SENTENCE. 404 is the backend's concealment
 * answer — missing, deleted, not yours and followers-only-inaccessible are all
 * 'Post not found.', and distinguishing them here would undo that. A 400 on this
 * route means 'Invalid post id.', which comes from the URL rather than from
 * anything the reader typed; echoing the validation wording would tell them about
 * a field they cannot see, so a malformed id reads as unavailable too.
 */
export function describePostDetailError(error, fallback = "Something went wrong.") {
  const status = error && error.response && error.response.status;
  if (status === 404 || status === 400) return "This post isn't available.";
  if (status === 429) return serverMessageOf(error) || "Too many requests. Please try again shortly.";
  return fallback;
}

/**
 * Comment-level failure.
 *
 * The 404 wording is the COMMENT's, not the post's: on a page that is already
 * rendering a post, "This post isn't available." would be actively misleading
 * about which thing disappeared. A comment 404 means gone or not yours, and those
 * two are indistinguishable by design — `author` is pinned into the update and
 * delete filters, so somebody else's comment is not found rather than refused.
 */
export function describeCommentError(error, fallback = "Something went wrong.") {
  const status = error && error.response && error.response.status;
  const message = serverMessageOf(error);

  if (status === 404) return "This comment isn't available.";
  if (status === 400 && message) return message;
  if (status === 429) return message || "Too many requests. Please try again shortly.";
  return fallback;
}
