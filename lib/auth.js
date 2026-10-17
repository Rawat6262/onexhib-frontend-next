/**
 * Shared auth constants and helpers.
 *
 * IMPORTANT: the real credential is the httpOnly `uid` cookie that Express sets
 * and validates. Nothing here is a security boundary — the cached profile below
 * is a UI convenience only, and a determined user can edit it. Authorisation is
 * enforced server-side by restrictToLoginUser / restrictToAdmin, exactly as
 * before this migration.
 */

export const ROLES = {
  ADMIN: "ADMIN",
  ORGANISER: "ORGANISER",
  EXHIBITION_SERVICE: "EXHIBITION_SERVICE",
  // Mixed case on purpose: it is the backend enum value, not a display label.
  EXHIBITOR: "Exhibitor",
  VISITOR: "VISITOR",
};

// Where each role lands after login / OTP verification.
export function homeRouteForRole(role) {
  switch (role) {
    case ROLES.ADMIN:
      return "/admin/dashboard";
    case ROLES.EXHIBITION_SERVICE:
      return "/services";
    case ROLES.ORGANISER:
      return "/organiser";
    // The exhibitor workspace (company profile, products, shows attended).
    case ROLES.EXHIBITOR:
      return "/exhibitor";
    /*
     * VISITOR and anything unrecognised go to /welcome, which requires
     * only a session. They used to fall through to /organiser, whose layout does
     * not admit them - and RequireAuth answers a disallowed role by redirecting to
     * homeRouteForRole(role), i.e. back to /organiser. The result was an endless
     * "Checking your session…" with no way out. /welcome has no role gate, so
     * this function can no longer name a destination that bounces its own role.
     */
    default:
      return "/welcome";
  }
}

const STORAGE_KEY = "user";

/*
 * SESSION MARKER - why "Remember me" did nothing visible.
 *
 * Express already honours the checkbox: ticked, the uid cookie lives 30 days;
 * unticked, it is a browser-session cookie that dies when the browser closes.
 * But the cached profile lives in localStorage, which never expires, so after a
 * restart the header still showed the user as signed in either way - and the
 * first API call then bounced them to /login. Both choices looked identical.
 *
 * The httpOnly uid cookie cannot be read from JS, so this small readable cookie
 * is written with the SAME lifetime alongside it. No marker means the session
 * cookie is gone too, and the cache is treated as stale. It holds no secret.
 */
const SESSION_MARKER = "ox_session";

/* Lifetimes matching what Express sets on uid (webAuth.controller.js). */
export const SESSION_LIFETIME = {
  REMEMBER: 30, // days - login with "Remember me"
  SIGNUP: 7, // days - after OTP verification
  BROWSER: null, // until the browser closes - login without "Remember me"
};

function hasSessionMarker() {
  return document.cookie.split(";").some((c) => c.trim().startsWith(`${SESSION_MARKER}=`));
}

function setSessionMarker(days) {
  const parts = [`${SESSION_MARKER}=1`, "path=/", "SameSite=Lax"];
  if (window.location.protocol === "https:") parts.push("Secure");
  if (days) parts.push(`max-age=${Math.round(days * 24 * 60 * 60)}`);
  document.cookie = parts.join("; ");
}

function clearSessionMarker() {
  document.cookie = `${SESSION_MARKER}=; path=/; max-age=0; SameSite=Lax`;
}

// localStorage is unavailable during SSR and can throw in privacy modes.
export function readCachedUser() {
  if (typeof window === "undefined") return null;
  try {
    // The session ended (browser closed without "Remember me", or 30 days passed):
    // drop the profile rather than show a signed-in header over a dead session.
    if (!hasSessionMarker()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * `lifetime` is one of SESSION_LIFETIME, passed when a NEW session starts (login,
 * OTP verification). Omitted - a profile refresh such as an account-type change -
 * the existing marker is kept as it is, so the user's choice survives.
 */
export function writeCachedUser(user, lifetime) {
  if (typeof window === "undefined") return;
  try {
    if (lifetime !== undefined) setSessionMarker(lifetime);
    else if (!hasSessionMarker()) setSessionMarker(SESSION_LIFETIME.BROWSER);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    /* non-fatal: the cookie is what actually keeps the session */
  }
}

export function clearCachedUser() {
  if (typeof window === "undefined") return;
  try {
    clearSessionMarker();
    window.localStorage.removeItem(STORAGE_KEY);
    // The Vite app's OTP screen also wrote a raw JWT here. It is never written
    // any more; this clears it for anyone carrying one from the old frontend.
    window.localStorage.removeItem("token");
  } catch {
    /* ignore */
  }
}

/**
 * Sanitise a `?next=` destination before it is used as a redirect target.
 *
 * OPEN-REDIRECT GUARD. This value arrives in a URL, so it is attacker-controlled:
 * anyone can send a victim to /login?next=https://evil.example and, without this,
 * a successful sign-in would hand them straight to the attacker's page wearing
 * the trust of having just logged in to OneXhib. Phishing a password on the page
 * that follows is the obvious next step.
 *
 * The rule is allow-list by shape, not deny-list by pattern:
 *
 *   "/exhibition-service/x-123"  ok    a same-site absolute path
 *   "https://evil.example"       no    absolute URL, another origin
 *   "//evil.example"             no    protocol-relative; the browser reads this
 *                                      as a host, not a path
 *   "/\evil.example"            no    backslashes are normalised to "/" by some
 *                                      browsers, so this becomes protocol-relative
 *   "exhibitions"                no    relative - resolves against whatever the
 *                                      current path happens to be
 *
 * Returns "" when the value cannot be trusted, so a caller falls back to its
 * normal destination rather than deciding what "invalid" means on its own.
 */
export function safeNextPath(value) {
  if (typeof value !== "string") return "";
  const path = value.trim();
  if (!path.startsWith("/")) return "";
  if (path.startsWith("//")) return "";
  if (path.includes("\\")) return "";
  // Control characters can be used to smuggle a scheme past a naive check.
  if (/[\u0000-\u001f\u007f]/.test(path)) return "";
  return path;
}
