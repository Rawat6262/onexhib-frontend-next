/*
 * RELATIVE IMPORT, NOT THE `@/` ALIAS — webpack resolves the alias, Node does not,
 * and this module has to be loadable by the plain-Node test runner.
 */
import { isUnread } from "./notification-copy.js";

/**
 * Pure logic for the notification badge, the unread count and the inbox list.
 *
 * Everything here is mirrored from the deployed backend, read from
 * Controller/socialNotification.controller.js before any of this was written. The
 * wording lives in notification-copy.js; this module owns numbers and state
 * transitions only.
 */

// ---- limits, verified against the deployed backend --------------------------

/** Service/socialPagination.js: DEFAULT_LIMIT 20, MAX_LIMIT 50. */
export const NOTIFICATIONS_PAGE_SIZE = 20;

/**
 * How often the unread count is re-read while the tab is visible.
 *
 * SIXTY SECONDS, and the arithmetic is the argument. socialReadLimiter allows 120
 * reads a minute, so one poll a minute spends under 1% of a client's read budget
 * and leaves the whole allowance for actually using the app. Anything faster buys
 * nothing a human notices: a badge is ambient information, not a message arriving.
 *
 * Only the COUNT is polled — never the list. getUnreadCount is an index-only
 * countDocuments over {recipient, readAt}, so it fetches no document at all, while
 * listNotifications runs two queries and resolves every actor on the page.
 */
export const POLL_INTERVAL_MS = 60000;

/** Above this the badge stops counting and says so. */
export const BADGE_MAX = 99;

// ---- the unread count ------------------------------------------------------

/**
 * A usable unread count, or null when there is not one.
 *
 * TYPE FIRST, AND NO COERCION. `Number(null)` is 0, `Number("")` is 0 and
 * `Number(false)` is 0 — so a coercing version would read a response missing the
 * field as "you have nothing unread" and silently clear the badge. Phase 11F
 * shipped exactly that bug in applyAuthoritativeCount and the tests caught it;
 * this is the same rule applied before it could happen twice.
 *
 * null means UNKNOWN, not zero. The caller keeps whatever it last knew rather than
 * replacing a real number with a guess.
 */
export function normaliseUnreadCount(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
}

/**
 * What the badge shows, or null for nothing at all.
 *
 * Zero renders NO badge rather than a "0": a badge exists to say something needs
 * attention, and an empty one is decoration that trains people to ignore it.
 */
export function badgeLabel(count) {
  const n = normaliseUnreadCount(count);
  if (n === null || n === 0) return null;
  return n > BADGE_MAX ? `${BADGE_MAX}+` : String(n);
}

/** The accessible sentence for the bell, which always states the count. */
export function badgeAnnouncement(count) {
  const n = normaliseUnreadCount(count);
  if (n === null) return "Notifications";
  if (n === 0) return "Notifications, none unread";
  return `Notifications, ${n} unread`;
}

/**
 * One notification moved from unread to read.
 *
 * PUT /notifications/:id/read returns only `{ success, readAt }` — no notification
 * object and NO unreadCount — so there is no authoritative count to adopt and the
 * shared one is decremented by exactly one, clamped at zero.
 *
 * An unknown count stays unknown: decrementing a number we never had would invent
 * one. The next poll supplies the truth.
 */
export function decrementUnread(count) {
  const n = normaliseUnreadCount(count);
  if (n === null) return null;
  return Math.max(0, n - 1);
}

/**
 * Should activating this notification issue a mark-read request?
 *
 * ONLY WHEN IT IS UNREAD. markNotificationRead deliberately does NOT pin
 * `readAt: null` into its filter — so a repeat call succeeds and OVERWRITES readAt
 * with a later timestamp. Calling it on an already-read row would therefore churn
 * the stored instant, spend a mutation from a 60/min bucket, and change nothing a
 * user can see. Reading a notification twice is not an event.
 */
export function shouldMarkRead(notification) {
  return isUnread(notification);
}

/**
 * Adopt the server's readAt onto one row.
 *
 * Only a real timestamp is accepted. Without one the row is returned UNCHANGED
 * rather than marked read on optimism — the response is the only evidence the
 * write happened, and `{ success: true }` with no readAt is not that evidence.
 */
export function applyReadAt(notification, readAt) {
  if (!notification || typeof notification !== "object") return notification;
  if (readAt === null || readAt === undefined || readAt === "") return notification;
  return { ...notification, readAt };
}

// ---- stale responses -------------------------------------------------------

/**
 * May a poll that started at `startedAt` still be applied?
 *
 * THE RACE THIS EXISTS FOR: the badge shows 3, the user opens a notification, the
 * count drops to 2 — and then an unread-count poll that left BEFORE the mark-read
 * lands carrying 3, putting the badge back. The count would be wrong until the next
 * minute, on the one screen the user is looking at.
 *
 * So every mutation bumps a generation, and a poll carries the generation it was
 * issued under. A poll from an older generation is DISCARDED, because the mutation
 * that bumped it knows something the poll does not.
 *
 * This is a comparison, not a request framework.
 */
export function isFreshPoll(startedAt, current) {
  return startedAt === current;
}

// ---- errors ----------------------------------------------------------------

/**
 * Map a notification failure to something worth showing.
 *
 * 400 IS NEUTRAL, DELIBERATELY. The only 400s here are 'Invalid notification id.'
 * and 'Invalid pagination cursor.' — both describe values this UI supplied, not
 * anything the reader typed, so echoing the backend's wording would report a field
 * they cannot see and cannot fix.
 *
 * The list endpoint cannot 404: its filter pins `recipient` to the viewer, so an
 * empty inbox is an empty page rather than a missing resource. The 404 branch
 * belongs to mark-one, where not-found and not-yours answer identically.
 */
export function describeNotificationError(error, fallback = "Something went wrong.") {
  const status = error && error.response && error.response.status;
  const data = error && error.response && error.response.data;
  // Only a string `message` is ever displayed — never the response object, which
  // carries config and headers.
  const message = data && typeof data.message === "string" && data.message ? data.message : null;

  if (status === 404) return "This notification isn't available.";
  if (status === 400) return fallback;
  if (status === 429) return message || "Too many requests. Please try again shortly.";
  return fallback;
}
