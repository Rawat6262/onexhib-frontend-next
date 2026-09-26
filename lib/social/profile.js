/**
 * Pure logic for the social profile and follow surfaces.
 *
 * WHY THESE ARE A MODULE AND NOT INLINE IN THE COMPONENTS
 * There is no DOM test framework in this repo, so anything left inside a
 * component is effectively untested. Everything here — self-detection, the edit
 * whitelist, validation, the follow reducer and the count clamp — is logic where
 * a mistake is silent and consequential, so it lives where a plain Node test can
 * reach it. The components stay thin enough to read.
 */

/** Backend limits, mirrored from Model/SocialProfile.model.js for UX only. */
export const BIO_MAX = 500;
export const HEADLINE_MAX = 120;

/**
 * The ONLY fields PUT /api/social/profile accepts.
 *
 * Verified against the controller's EDITABLE_FIELDS. Everything else on the
 * profile response — name, company, designation, city, country, website — belongs
 * to the Signup account and is not editable here, and avatarUrl/coverUrl have no
 * endpoint that sets them at all.
 */
export const EDITABLE_PROFILE_FIELDS = Object.freeze(["bio", "headline"]);

/**
 * Is the viewer looking at their own profile?
 *
 * The cached auth user is used for exactly this one question. It is a UI
 * convenience that a determined user can edit, so it decides only what CONTROLS
 * to show — never what data to display, and never whether a mutation is allowed.
 * The backend pins ownership into every profile write regardless.
 *
 * String-compared because the cached id and the API's id come from different
 * paths (localStorage JSON vs a fresh response) and one may be an ObjectId-like
 * object rather than a string.
 */
export function isSelfProfile(cachedUserId, profileUserId) {
  if (!cachedUserId || !profileUserId) return false;
  return String(cachedUserId) === String(profileUserId);
}

/**
 * Build the edit request body.
 *
 * A WHITELIST, NOT A FILTER OF KNOWN-BAD KEYS. The form state is spread from a
 * loaded profile, so passing it through directly would send followerCount,
 * postCount, `user` and `following` to the server. The backend ignores unknown
 * keys, but sending them invites the next person to assume one of them is
 * editable.
 *
 * Only the two fields are copied, both trimmed and both always present, so a
 * cleared bio is sent as "" rather than being omitted and silently preserved.
 */
export function buildProfileEditPayload(form) {
  const source = form && typeof form === "object" ? form : {};
  const payload = {};
  for (const field of EDITABLE_PROFILE_FIELDS) {
    const value = source[field];
    payload[field] = typeof value === "string" ? value.trim() : "";
  }
  return payload;
}

/**
 * Mirror the backend's length limits for immediate feedback.
 *
 * The server remains the authority — this only avoids a round trip to learn
 * something the client already knows. Both fields are optional: an empty bio and
 * an empty headline are a valid profile, which is what every account starts as.
 *
 * @returns {{valid: boolean, errors: {bio?: string, headline?: string}}}
 */
export function validateProfileEdit(form) {
  const payload = buildProfileEditPayload(form);
  const errors = {};

  if (payload.bio.length > BIO_MAX) {
    errors.bio = `Bio cannot exceed ${BIO_MAX} characters.`;
  }
  if (payload.headline.length > HEADLINE_MAX) {
    errors.headline = `Headline cannot exceed ${HEADLINE_MAX} characters.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * What a follow-button click should do.
 *
 * Deliberately simple compared with the reaction machine: follow has no third
 * state and no same-value no-op, so there is no trap equivalent to "a repeat POST
 * is not a toggle". It is a function anyway so the optimistic count delta and the
 * request choice cannot drift apart.
 *
 * @param {boolean} following current state, from profile.following
 */
export function planFollow(following) {
  return following
    ? { action: "unfollow", nextFollowing: false, followerDelta: -1 }
    : { action: "follow", nextFollowing: true, followerDelta: 1 };
}

/**
 * Apply a follower-count delta, clamped at zero.
 *
 * Clamping is not defensive padding: a profile's counts are a snapshot from
 * whenever it was fetched, so unfollowing after someone else's unfollow landed
 * can legitimately subtract from a displayed 0. A visible "-1" reads as
 * corruption, and neither follow response returns a count to correct it with — so
 * the clamp is the only thing standing between a stale snapshot and a wrong number
 * on screen.
 */
export function applyFollowerDelta(followerCount, delta) {
  const base = Number(followerCount);
  const safe = Number.isFinite(base) ? base : 0;
  return Math.max(0, safe + delta);
}

/** Non-negative integer for display. Counts are never shown as negative or NaN. */
export function displayCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/**
 * A person's display name from a shaped public user.
 *
 * Same fallback order as AccountMenu: first+last, then company_name, then a
 * neutral label — so a company account with no personal name is not rendered as
 * "OneXhib user".
 */
export function displayName(user) {
  if (!user || typeof user !== "object") return "OneXhib user";
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (typeof user.company_name === "string" && user.company_name.trim()) {
    return user.company_name.trim();
  }
  return "OneXhib user";
}

/** Up to two initials for the avatar, matching the header's existing style. */
export function initialsOf(name) {
  const words = String(name || "").split(/\s+/).filter(Boolean).slice(0, 2);
  const letters = words.map((w) => w[0]).join("").toUpperCase();
  return letters || "OX";
}

/**
 * The secondary identity line: role at company.
 *
 * Returns null rather than an empty string when there is nothing to say, so the
 * caller renders no element at all. A blank line with a label is worse than an
 * absent one.
 */
export function roleLine(user) {
  if (!user || typeof user !== "object") return null;
  const designation = typeof user.designation === "string" ? user.designation.trim() : "";
  const company = typeof user.company_name === "string" ? user.company_name.trim() : "";
  if (designation && company) return `${designation} at ${company}`;
  return designation || company || null;
}

/** "City, Country", or whichever half exists, or null. */
export function locationLine(user) {
  if (!user || typeof user !== "object") return null;
  const parts = [user.city, user.country]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/**
 * Turn a request failure into something worth showing a person.
 *
 * The 404 case is the one that matters. The social backend answers 404 for "not
 * there" AND for "not yours" or "not visible" — the concealment is deliberate, and
 * a message distinguishing them would undo it. So every 404 gets the same neutral
 * line.
 *
 * No axios internals, no stack, no server field names. 401/403 is deliberately
 * absent: AuthProvider's interceptor already evicts the session and redirects, so
 * this would never render.
 */
export function describeRequestError(error, fallback = "Something went wrong.") {
  const status = error && error.response && error.response.status;
  const serverMessage = error && error.response && error.response.data && error.response.data.message;

  if (status === 404) return "User not found.";
  if (status === 429) {
    return typeof serverMessage === "string" && serverMessage
      ? serverMessage
      : "Too many requests. Please wait a moment and try again.";
  }
  // 400 is a validation answer, and its message is written for a person.
  if (status === 400 && typeof serverMessage === "string" && serverMessage) return serverMessage;
  return fallback;
}
