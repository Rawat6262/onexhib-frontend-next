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
    default:
      return "/organiser"; // same fallback the Vite LoginView used
  }
}

const STORAGE_KEY = "user";

// localStorage is unavailable during SSR and can throw in privacy modes.
export function readCachedUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeCachedUser(user) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    /* non-fatal: the cookie is what actually keeps the session */
  }
}

export function clearCachedUser() {
  if (typeof window === "undefined") return;
  try {
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
