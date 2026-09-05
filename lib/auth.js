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
