/**
 * Block, mute and report — the rules, with no React and no network in sight.
 *
 * WHY A MODULE RATHER THAN LOGIC INSIDE THE COMPONENTS
 * These three actions look similar and mean completely different things, and the ways
 * to get them wrong are not visual. Reporting a post against the user route, sending a
 * form object as the request body, treating a mute as if it hid content, or telling a
 * viewer that someone blocked them — none of those show up as a broken layout. They
 * show up as a privacy incident. Keeping the rules here makes each one a plain function
 * a test can call directly, instead of something only reachable by rendering a dialog
 * and clicking through it.
 *
 * THE BACKEND IS AUTHORITATIVE, ALWAYS. Nothing here decides whether an action is
 * permitted; the server does, and it re-checks everything. What this module does is stop
 * the client from *asking wrongly* — sending a reason the enum does not contain, a body
 * carrying keys the server would refuse outright, or an action against the viewer
 * themselves.
 *
 * NOTHING HERE IS PERSISTED. No localStorage, no module-level cache of who is blocked or
 * muted. Relationship state is server state: it arrives on the profile response and is
 * re-read after every confirmed mutation. A remembered copy would be a second source of
 * truth that goes stale silently, and for a privacy control "stale" means showing
 * someone as blocked when they are not.
 */

/**
 * The ONLY reasons the backend accepts, in the order they are offered.
 *
 * Copied deliberately rather than fetched: there is no endpoint that lists them, and
 * inventing one to avoid a seven-item array would be worse. The backend validates
 * against its own copy and answers 400 for anything else, so a drift here produces a
 * clean rejection rather than a bad record — and tests/social-relationship.test.mjs
 * pins this array against the server's enum so the drift is caught here first.
 */
export const REPORT_REASONS = Object.freeze([
  "SPAM",
  "HARASSMENT",
  "HATE_SPEECH",
  "SEXUAL_CONTENT",
  "VIOLENCE",
  "IMPERSONATION",
  "OTHER",
]);

/** Human labels. The VALUE sent is always the enum member, never the label. */
export const REPORT_REASON_LABELS = Object.freeze({
  SPAM: "Spam or misleading",
  HARASSMENT: "Harassment or bullying",
  HATE_SPEECH: "Hate speech",
  SEXUAL_CONTENT: "Sexual content",
  VIOLENCE: "Violence or threats",
  IMPERSONATION: "Impersonation",
  OTHER: "Something else",
});

/** Matches SocialReport.DETAILS_MAX. Measured after trimming, as the server does. */
export const REPORT_DETAILS_MAX = 1000;

/**
 * The only keys the report endpoints accept.
 *
 * The server REFUSES an unknown key rather than ignoring it, so a caller that spreads a
 * form object gets a 400 — which is the correct outcome, but a confusing one to debug.
 * buildReportPayload below exists so that cannot happen by accident.
 */
export const REPORT_BODY_FIELDS = Object.freeze(["reason", "details"]);

/**
 * Build the request body from form state.
 *
 * ALLOW-LIST, NOT A COPY. Only `reason` and `details` are ever emitted, whatever else
 * the form object happens to carry — a `targetType`, a `reportedUser`, an id the
 * component tracked for its own purposes. `details` is omitted entirely when empty
 * rather than sent as "", because the server treats an absent `details` and an empty one
 * identically and an absent key is the smaller request.
 *
 * @param {{reason?: string, details?: string}} form
 * @returns {{reason: string, details?: string}}
 */
export function buildReportPayload(form) {
  const reason = form && typeof form.reason === "string" ? form.reason : "";
  const details = form && typeof form.details === "string" ? form.details.trim() : "";

  const payload = { reason };
  if (details.length > 0) payload.details = details;
  return payload;
}

/**
 * Is this report submittable, and if not, why?
 *
 * MIRRORS THE SERVER'S RULES rather than inventing softer ones: the reason must be a
 * member of the enum, details are capped at REPORT_DETAILS_MAX measured after trimming,
 * and OTHER is the one reason that REQUIRES details — because "something else" with no
 * explanation is not a report anybody can act on.
 *
 * Returns the message a human should read, not the server's wording, so the UI never
 * renders a backend string.
 *
 * @param {{reason?: string, details?: string}} form
 * @returns {{ok: true} | {ok: false, error: string, field: "reason"|"details"}}
 */
export function validateReport(form) {
  const reason = form && typeof form.reason === "string" ? form.reason : "";
  const rawDetails = form && typeof form.details === "string" ? form.details : "";
  const details = rawDetails.trim();

  if (!REPORT_REASONS.includes(reason)) {
    return { ok: false, error: "Choose a reason.", field: "reason" };
  }
  if (reason === "OTHER" && details.length === 0) {
    return { ok: false, error: "Add a short description.", field: "details" };
  }
  if (details.length > REPORT_DETAILS_MAX) {
    return {
      ok: false,
      error: `Keep this under ${REPORT_DETAILS_MAX} characters.`,
      field: "details",
    };
  }
  return { ok: true };
}

/** Characters still available, floored at 0 so a counter never shows a negative. */
export function reportDetailsRemaining(details) {
  const used = typeof details === "string" ? details.trim().length : 0;
  return Math.max(0, REPORT_DETAILS_MAX - used);
}

/**
 * Which call a block toggle should make, and what the UI may claim afterwards.
 *
 * `blocked` is the state the viewer is currently in. There is no optimistic next state
 * in the return value on purpose: see the note on applyBlockResult.
 *
 * @param {boolean} blocked
 */
export function planBlock(blocked) {
  return blocked
    ? { method: "DELETE", action: "unblock", confirm: false }
    : { method: "POST", action: "block", confirm: true };
}

/**
 * Which call a mute toggle should make.
 *
 * NO CONFIRMATION, and the asymmetry with block is deliberate. A mute changes only what
 * the muter sees, is invisible to the muted user, and is undone by tapping again. A block
 * severs follow edges in both directions, cannot be undone by the other party, and
 * conceals the profile — which is also why unblocking has to happen somewhere else
 * entirely. Confirming both would train people to dismiss the one that matters.
 *
 * @param {boolean} muted
 */
export function planMute(muted) {
  return muted
    ? { method: "DELETE", action: "unmute", confirm: false }
    : { method: "POST", action: "mute", confirm: false };
}

/**
 * The state after a mutation the SERVER HAS CONFIRMED.
 *
 * Called with the response body, never with a guess. `{ success, blocked }` and
 * `{ success, muted }` are what the two mutation pairs answer, and the boolean in the
 * response — not the boolean the client hoped for — is what the UI adopts.
 *
 * WHY NOT OPTIMISTIC. For an ordinary like button, optimism costs a flicker if it is
 * wrong. For a block it would mean the UI asserting a privacy boundary that may not
 * exist: showing someone as blocked while the request failed leaves the viewer believing
 * they are protected when they are not, which is worse than a half-second of latency.
 * So every one of these controls waits.
 *
 * @param {object} data response body
 * @param {"blocked"|"muted"} key
 * @returns {boolean|null} null when the server did not say, so the caller refetches
 */
export function confirmedFlag(data, key) {
  if (!data || data.success !== true) return null;
  return typeof data[key] === "boolean" ? data[key] : null;
}

/**
 * Should this action be offered against this target at all?
 *
 * Self is excluded for all three: the backend refuses a self-block and a self-mute
 * outright, and reporting yourself is not a thing. Hiding the control is a courtesy, not
 * the enforcement — the server still refuses if it is called.
 *
 * @param {*} viewerId  the signed-in user's id, or null when not yet known
 * @param {*} targetId
 */
export function canActOn(viewerId, targetId) {
  if (!viewerId || !targetId) return false;
  return String(viewerId) !== String(targetId);
}

/**
 * Neutral, privacy-safe copy for a failed relationship call.
 *
 * THIS FUNCTION IS A PRIVACY BOUNDARY, which is easy to miss because it only returns
 * strings. The backend answers 404 "User not found." for a blocked pair and for an
 * account that never existed, using the same status and the same message precisely so
 * the two are indistinguishable. If the UI branched on that 404 to say "this user has
 * blocked you", it would reconstruct the oracle the server spent a whole phase closing —
 * from the client, where anyone can read it.
 *
 * So 404 says "unavailable" and nothing more, and nothing here inspects the server's
 * message text to decide what to show. 401 is deliberately absent: the axios interceptor
 * in AuthProvider already evicts a dead session, and competing with it would show an
 * error for half a second before the redirect.
 *
 * @param {*} error an axios error
 * @param {string} fallback
 */
export function describeRelationshipError(error, fallback = "Something went wrong.") {
  const status = error && error.response ? error.response.status : 0;

  if (status === 404) return "This user is unavailable.";
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  if (status === 400) return "That request could not be completed.";
  if (status >= 500) return fallback;
  return fallback;
}

/**
 * What to say after a report is stored — and what must never be said.
 *
 * The server answers 201 { success: true } and performs NO side effect: nothing is
 * removed, nobody is banned, the target is not told, and no block or mute is applied.
 * The confirmation therefore promises only that it was received. Copy like "this content
 * has been removed" or "we've blocked this user for you" would be a false statement
 * about a moderation decision nobody has made yet.
 */
export const REPORT_SUCCESS_MESSAGE = "Thanks — your report has been sent for review.";

/**
 * Words a report confirmation must not contain, exported so the test suite can assert
 * the absence rather than trusting the string above to stay honest through later edits.
 */
export const REPORT_FORBIDDEN_CLAIMS = Object.freeze([
  "removed",
  "deleted",
  "banned",
  "suspended",
  "blocked",
  "muted",
  "hidden",
  "notified",
  "action has been taken",
]);
