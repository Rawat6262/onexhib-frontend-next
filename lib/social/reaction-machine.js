/**
 * The reaction state machine. Pure, and the most easily got-wrong part of the
 * social UI.
 *
 * THE RULE THAT MAKES THIS NECESSARY
 * `POST /api/social/posts/:postId/reaction` with the reaction the viewer ALREADY
 * holds is a NO-OP, not a toggle. The backend's upsert filters on
 * `reaction: { $ne: next }`, so a repeat matches nothing, the unique index
 * refuses the insert, and the controller returns the unchanged state on E11000.
 *
 * So the obvious implementation - "clicking Like posts a like" - produces a
 * button that appears to do nothing on the second press. Turning a reaction OFF
 * requires `DELETE /api/social/posts/:postId/reaction`.
 *
 * Every caller goes through this function so that rule lives in one place with
 * one test, rather than being re-derived in each button.
 *
 * WIRE VALUES are "like", "dislike" and null - exactly what the feed's
 * viewerReaction carries and what the reaction endpoints accept. Not LIKE or
 * DISLIKE: those are the backend's STORED values and never appear on the wire.
 */

/** The only reactions a user can click. */
export const REACTIONS = Object.freeze(["like", "dislike"]);

/** The only values viewerReaction can hold. */
export const VIEWER_REACTIONS = Object.freeze([null, "like", "dislike"]);

const isReaction = (value) => value === "like" || value === "dislike";
const isViewerReaction = (value) => value === null || isReaction(value);

/**
 * What request does this click need?
 *
 *   null    + like     -> POST { reaction: "like" }
 *   null    + dislike  -> POST { reaction: "dislike" }
 *   like    + like     -> DELETE            (toggle off - NOT a repeat POST)
 *   dislike + dislike  -> DELETE            (toggle off)
 *   like    + dislike  -> POST { reaction: "dislike" }   (switch)
 *   dislike + like     -> POST { reaction: "like" }      (switch)
 *
 * INVALID INPUT PRODUCES NO MUTATION. An unrecognised current value or clicked
 * value returns `{ action: "none" }` rather than a best guess. A malformed state
 * is a bug somewhere upstream, and the safe response to "I do not know what this
 * means" is to send nothing - guessing would write a reaction the user never
 * asked for.
 *
 * @param {null|"like"|"dislike"} current viewerReaction as the server last reported it
 * @param {"like"|"dislike"} clicked which button the user pressed
 * @returns {{action:"post", reaction:"like"|"dislike", next:"like"|"dislike"}
 *          |{action:"delete", next:null}
 *          |{action:"none", reason:string}}
 */
export function planReaction(current, clicked) {
  if (!isViewerReaction(current)) {
    return { action: "none", reason: "invalid current reaction" };
  }
  if (!isReaction(clicked)) {
    return { action: "none", reason: "invalid clicked reaction" };
  }

  // Same reaction: the only way to clear it is DELETE.
  if (current === clicked) {
    return { action: "delete", next: null };
  }

  // Either setting from nothing, or switching. Both are one POST.
  return { action: "post", reaction: clicked, next: clicked };
}

/**
 * The count change the UI may apply before the server answers.
 *
 * OPTIMISTIC, BUT NEVER AUTHORITATIVE. The reaction endpoints return the real
 * `likeCount` and `dislikeCount`, so the caller's job is: apply this delta for
 * immediate feedback, then OVERWRITE both counts with the server's numbers when
 * the response lands, and restore the captured previous values if it fails.
 *
 * Clamped at zero. Counts on a card can be stale - the post may have been
 * fetched a minute ago and reacted to by others since - so subtracting 1 from a
 * cached 0 is reachable without any bug here. A visible "-1" would look like
 * corruption, and the server's response corrects the number a moment later
 * anyway.
 *
 * @param {{likeCount:number, dislikeCount:number}} counts current displayed counts
 * @param {null|"like"|"dislike"} current
 * @param {null|"like"|"dislike"} next the `next` from planReaction
 */
export function applyReactionDelta(counts, current, next) {
  const like = Number(counts && counts.likeCount) || 0;
  const dislike = Number(counts && counts.dislikeCount) || 0;

  let nextLike = like;
  let nextDislike = dislike;

  if (current === "like") nextLike -= 1;
  if (current === "dislike") nextDislike -= 1;
  if (next === "like") nextLike += 1;
  if (next === "dislike") nextDislike += 1;

  return {
    likeCount: Math.max(0, nextLike),
    dislikeCount: Math.max(0, nextDislike),
  };
}
