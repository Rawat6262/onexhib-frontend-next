/*
 * RELATIVE IMPORTS, NOT THE `@/` ALIAS.
 *
 * The alias is resolved by webpack, not by Node, so a module using it cannot be
 * loaded by the plain-Node test runner this repo uses. Every lib module the tests
 * import is import-free or relative for exactly this reason — lib/discovery.js
 * uses the alias and is, correspondingly, the one lib its test suite reaches
 * through a different file. This module has to be testable, so it stays relative.
 */
import { formatDate } from "../format.js";
import { planReaction, applyReactionDelta } from "./reaction-machine.js";

/**
 * Pure logic for rendering posts and reacting to them.
 *
 * Same reasoning as lib/social/profile.js: there is no DOM test framework here,
 * so anything left inside a component is untested. The reaction patch, the count
 * clamp, the visibility map and the media-host decision are all places where a
 * mistake is silent, so they live where a plain Node test can reach them.
 */

/**
 * Visibility labels, keyed on the backend's VISIBILITIES enum.
 *
 * Exactly two values exist. There is deliberately no Private, Friends or
 * Connections: inventing a label for a state the backend cannot store would
 * promise a privacy control that does not exist.
 */
export const VISIBILITY_LABELS = Object.freeze({
  PUBLIC: "Public",
  FOLLOWERS: "Followers",
});

/**
 * A human label, or null for an unknown value.
 *
 * null rather than the raw string: "FOLLOWERS" is an implementation detail, and a
 * value this build does not recognise means the frontend is behind the backend —
 * better to omit the chip than to print an enum at a reader.
 */
export function visibilityLabel(visibility) {
  if (typeof visibility !== "string") return null;
  return VISIBILITY_LABELS[visibility] || null;
}

/**
 * A post's timestamp, as display text plus a machine-readable ISO value.
 *
 * Reuses lib/format.js's formatDate, which reads dates in UTC from fixed month
 * tables rather than through Intl. That was chosen to avoid server/client
 * hydration mismatches, and it has the useful side effect of returning "" for an
 * unparseable value instead of the string "Invalid Date".
 *
 * An absolute date rather than "2 hours ago": a relative string is computed from
 * the reader's clock, so it cannot be rendered on a server and agreed on by a
 * browser, and building one here would mean either a dependency or a second
 * date implementation.
 *
 * Returns null when there is nothing safe to show, so the caller renders no
 * element at all.
 */
export function postTimestamp(value) {
  const text = formatDate(value);
  if (!text) return null;

  const iso = new Date(value);
  return {
    text,
    // dateTime on a <time> element wants a machine-readable value; it is only
    // emitted when the date actually parsed.
    iso: Number.isNaN(iso.getTime()) ? null : iso.toISOString(),
  };
}

/**
 * Is this the signed-in user's own post?
 *
 * The cached auth id answers this one question, exactly as on the profile page.
 * It decides which affordances to show and never what identity to render —
 * post.author stays the rendering authority — and the backend pins ownership
 * into every post mutation regardless.
 */
export function isOwnPost(cachedUserId, post) {
  const authorId = post && post.author && post.author._id;
  if (!cachedUserId || !authorId) return false;
  return String(cachedUserId) === String(authorId);
}

/** Non-negative integer for any count. Never negative, never NaN. */
export function displayCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/**
 * Hosts whose images may go through the Next.js optimiser.
 *
 * Mirrors OPTIMISABLE_IMAGE_HOSTS in lib/public-api.js and remotePatterns in
 * next.config.mjs. Social uploads land on Cloudinary, so social media is already
 * covered and NO config change is needed.
 *
 * Anything else renders with `unoptimized`, which is the existing convention: it
 * keeps a foreign host working without turning /_next/image into an open resize
 * proxy for arbitrary URLs.
 */
const OPTIMISABLE_IMAGE_HOSTS = new Set(["res.cloudinary.com"]);

/**
 * Should this media URL be optimised?
 *
 * A malformed or non-http URL answers false, so it renders unoptimised rather
 * than being handed to the optimiser.
 */
export function isOptimisableMedia(url) {
  if (typeof url !== "string" || !url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    return OPTIMISABLE_IMAGE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Accessible name for one media item.
 *
 * Neutral and positional. The wire contract carries no caption or description for
 * a media item, so there is nothing to describe it with — inventing text from the
 * post title would claim the image shows something it may not. "Post image 2 of 3"
 * at least tells a screen-reader user how many there are and where they are.
 *
 * `kind` was added in Phase 11I because a <video> had no accessible name at all:
 * images carried this alt text and videos carried nothing, so a screen-reader user
 * met an unlabelled player. It defaults to IMAGE so every existing caller and the
 * wording they rely on are unchanged.
 */
export function mediaAlt(index, total, kind = "IMAGE") {
  const noun = kind === "VIDEO" ? "video" : "image";
  if (total > 1) return `Post ${noun} ${index + 1} of ${total}`;
  return `Post ${noun}`;
}

/**
 * Only the media items that can actually render.
 *
 * An item needs a type this build knows and a URL. Filtering here keeps the grid
 * component from having to guard every field, and keeps the item count used for
 * layout honest.
 */
export function renderableMedia(media) {
  if (!Array.isArray(media)) return [];
  return media.filter(
    (m) => m && typeof m.url === "string" && m.url && (m.type === "IMAGE" || m.type === "VIDEO")
  );
}

/**
 * The optimistic post for a reaction click, plus the snapshot needed to undo it.
 *
 * The TRANSITION comes from lib/social/reaction-machine.js — this does not decide
 * whether a click is a POST or a DELETE. That rule (a repeat POST is a server
 * no-op, so clearing a reaction needs DELETE) lives in one place with one test,
 * and reimplementing it in a component is the specific mistake this avoids.
 *
 * Returns null when the click is not actionable, so the caller sends nothing.
 *
 * @returns {{plan: object, optimistic: object, snapshot: object}|null}
 */
export function planPostReaction(post, clicked) {
  if (!post) return null;

  const current = post.viewerReaction ?? null;
  const plan = planReaction(current, clicked);
  if (plan.action === "none") return null;

  const counts = applyReactionDelta(
    { likeCount: post.likeCount, dislikeCount: post.dislikeCount },
    current,
    plan.next
  );

  return {
    plan,
    optimistic: { ...post, viewerReaction: plan.next, ...counts },
    // Captured by value, so a rollback restores exactly what was on screen
    // rather than re-deriving it from a state that has since changed.
    snapshot: {
      viewerReaction: current,
      likeCount: post.likeCount,
      dislikeCount: post.dislikeCount,
    },
  };
}

/**
 * Adopt the server's authoritative reaction state.
 *
 * The reaction endpoints return { postId, viewerReaction, likeCount,
 * dislikeCount } freshly read from the post document, so these numbers replace
 * the optimistic guess outright rather than being merged with it. That is what
 * keeps a card correct when other people reacted between the render and the
 * click.
 *
 * A malformed or missing payload leaves the post untouched: the optimistic values
 * are a better answer than blanking the counts.
 */
export function applyReactionResult(post, reaction) {
  if (!post) return post;
  if (!reaction || typeof reaction !== "object") return post;

  const next = { ...post };
  if (reaction.viewerReaction !== undefined) next.viewerReaction = reaction.viewerReaction ?? null;
  if (reaction.likeCount !== undefined) next.likeCount = displayCount(reaction.likeCount);
  if (reaction.dislikeCount !== undefined) next.dislikeCount = displayCount(reaction.dislikeCount);
  return next;
}

/** Restore a captured snapshot after a failed reaction. */
export function revertReaction(post, snapshot) {
  if (!post || !snapshot) return post;
  return {
    ...post,
    viewerReaction: snapshot.viewerReaction ?? null,
    likeCount: snapshot.likeCount,
    dislikeCount: snapshot.dislikeCount,
  };
}

/**
 * Turn a feed or reaction failure into something worth showing.
 *
 * The 404 wording differs from the profile page's on purpose: here it means the
 * post is gone or was never visible, and the social backend uses one 404 for
 * both. Saying which would undo the concealment.
 */
export function describePostError(error, fallback = "Something went wrong.") {
  const status = error && error.response && error.response.status;
  const serverMessage = error && error.response && error.response.data && error.response.data.message;

  if (status === 404) return "This post isn't available.";
  if (status === 429) {
    return typeof serverMessage === "string" && serverMessage
      ? serverMessage
      : "Too many requests. Please try again shortly.";
  }
  if (status === 400 && typeof serverMessage === "string" && serverMessage) return serverMessage;
  return fallback;
}
