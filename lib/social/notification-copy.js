/**
 * Presentation strings for the notification inbox. Pure.
 *
 * The backend stores no message text - a notification is a type, an actor and a
 * couple of source ids. Every sentence a user reads is built here, which is
 * deliberate: it keeps wording a frontend concern and means changing a phrase
 * never touches stored rows.
 *
 * THE SIX ACTIVE TYPES ARE THE ONLY TYPES
 * Phase 10 shipped FOLLOW, POST_LIKE, POST_DISLIKE and POST_COMMENT and
 * deliberately withheld the two tag types: tagging is the one social event where
 * an actor unilaterally picks a recipient with no prior relationship, and with no
 * mute or block available then, notifying on it would have been an inbox a
 * stranger could write to with no recourse.
 *
 * Phase 12G added POST_TAG and COMMENT_TAG to the backend once that recourse
 * existed, and this file is what keeps the two sides in step. It must: the badge
 * counts every unread row the server has, while an unknown type renders nothing -
 * so a type the backend sends and this list omits becomes an unread count the
 * reader can see but never open or clear. That is the whole reason the lists have
 * to match exactly, and why a test pins them rather than trusting this comment.
 *
 * UNKNOWN TYPES STILL RENDER NOTHING, unchanged. There is no generic fallback
 * line: a sentence the reader cannot act on is worse than a gap, and the gap keeps
 * a genuine server/client mismatch visible instead of papering over it.
 *
 * NOTHING INTERNAL IS RENDERED
 * `recipient` and `dedupeKey` are not even on the wire. Actor ids are used for
 * links, never printed - "64f0…c21 liked your post" is not a sentence, and an id
 * in visible text is an id that ends up in a screenshot.
 */

/**
 * Exactly the types the backend can send. Kept in the backend's own order, with
 * the two tag types appended, so this list reads as the same contract rather than
 * a reordered copy of it.
 */
export const NOTIFICATION_TYPES = Object.freeze([
  "FOLLOW",
  "POST_LIKE",
  "POST_DISLIKE",
  "POST_COMMENT",
  "POST_TAG",
  "COMMENT_TAG",
]);

/**
 * What each type says, as a sentence fragment following the actor's name.
 *
 * Separating the name from the action is what lets a caller render the name in
 * bold, or as a link, without parsing an assembled sentence back apart.
 *
 * The two tag fragments are phrased the same way as the rest - a verb phrase that
 * follows the name - so the actor stays the caller's to render. "tagged you in a
 * comment" is distinct from "commented on your post" on purpose: a recipient who
 * owns the post AND is named in the comment receives both rows, which are two
 * different facts and must read as two different sentences.
 */
const ACTIONS = Object.freeze({
  FOLLOW: "started following you",
  POST_LIKE: "liked your post",
  POST_DISLIKE: "disliked your post",
  POST_COMMENT: "commented on your post",
  POST_TAG: "tagged you in a post",
  COMMENT_TAG: "tagged you in a comment",
});

/**
 * Used when the actor's account no longer exists. The backend returns
 * `actor: null` and keeps the row rather than deleting it, so the event still
 * happened and still deserves a sentence.
 *
 * "Someone" rather than "A deleted user": the reader does not need to be told
 * that an account was removed, and saying so discloses a fact about a person who
 * has left.
 */
const ABSENT_ACTOR = "Someone";

/**
 * A display name from a shaped public user.
 *
 * Falls back through first+last -> company_name -> ABSENT_ACTOR, matching what
 * AccountMenu already does for the signed-in user, so a company account with no
 * personal name is not rendered as "Someone".
 *
 * @param {{first_name?:string, last_name?:string, company_name?:string}|null} actor
 */
export function actorName(actor) {
  if (!actor || typeof actor !== "object") return ABSENT_ACTOR;
  const full = [actor.first_name, actor.last_name].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (typeof actor.company_name === "string" && actor.company_name.trim()) {
    return actor.company_name.trim();
  }
  return ABSENT_ACTOR;
}

/**
 * The parts of one notification's sentence.
 *
 * An UNKNOWN TYPE RETURNS null rather than a generic fallback. A fallback line
 * would render a row the user cannot act on and cannot understand, and it would
 * hide the real situation - the server sending a type this build does not know,
 * which means the frontend is out of date. Returning null lets the list skip the
 * row and keeps the failure visible in one place instead of as mystery text.
 * Nothing throws: an unexpected type must not take down the inbox.
 *
 * @param {{type?:string, actor?:object|null}} notification
 * @returns {{name:string, action:string, text:string, hasActor:boolean}|null}
 */
export function notificationCopy(notification) {
  const type = notification && notification.type;
  if (typeof type !== "string") return null;

  const action = ACTIONS[type];
  if (!action) return null;   // unknown or deferred type - render nothing

  const actor = notification.actor ?? null;
  const name = actorName(actor);

  return {
    name,
    action,
    text: `${name} ${action}`,
    // Whether the name should be a link to a profile. A missing actor has no
    // profile to point at, so the caller renders plain text instead of a
    // dead link.
    hasActor: Boolean(actor && actor._id),
  };
}

/**
 * Where a notification should navigate.
 *
 * Returns null when there is nothing to open, which is a real case rather than a
 * defensive flourish: a FOLLOW from a since-deleted account has no profile, and
 * although the post and comment cascades delete a notification when its source
 * goes, that cleanup is best-effort and can be left behind by a crash. The caller
 * renders a non-clickable row instead of a link to nowhere.
 *
 * Only ids the backend actually sends are used: FOLLOW carries neither source,
 * reactions carry `postId`, and POST_COMMENT carries both - all three reaction and
 * comment types open the post.
 */
export function notificationHref(notification) {
  const type = notification && notification.type;
  if (typeof type !== "string" || !ACTIONS[type]) return null;

  if (type === "FOLLOW") {
    const id = notification.actor && notification.actor._id;
    return id ? `/social/profile/${encodeURIComponent(String(id))}` : null;
  }

  const postId = notification.postId;
  if (!postId) return null;
  return `/social/posts/${encodeURIComponent(String(postId))}`;
}

/**
 * Unread is `readAt == null`, and nothing else.
 *
 * NEVER derive this from updatedAt. The backend goes out of its way to keep a
 * reaction switch from touching readAt, createdAt or even updatedAt - it updates
 * `type` in place with `timestamps: false` - and a refollow is a no-op via
 * $setOnInsert. Those guards exist so somebody flipping like/dislike sixty times
 * a minute cannot resurface an already-read notification. Inferring unread from a
 * timestamp would reopen exactly that hole from the client side.
 */
export function isUnread(notification) {
  return Boolean(notification) && (notification.readAt === null || notification.readAt === undefined);
}

export { ABSENT_ACTOR };
