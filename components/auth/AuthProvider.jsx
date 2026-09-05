"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { readCachedUser, writeCachedUser, clearCachedUser } from "@/lib/auth";

// The Vite app set this once in App.jsx. Every model call relies on it so the
// httpOnly uid cookie rides along; without it the whole session silently fails.
axios.defaults.withCredentials = true;

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/**
 * Holds the signed-in user's cached profile and keeps it honest against the
 * backend.
 *
 * The authoritative credential remains the httpOnly `uid` cookie issued by
 * Express — unchanged by this migration and unreadable from JS. This provider
 * adds two things the Vite app never had:
 *
 *   1. A single place to read the cached profile, so pages stop touching
 *      localStorage directly (which also breaks SSR).
 *   2. A global 401/403 interceptor. Because the cookie is the real credential,
 *      an expired or forged session is caught the moment any API call returns
 *      401 — the cache is dropped and the user is sent to /login. That makes the
 *      server the source of truth for authorisation, with no backend change.
 */
export default function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  // "loading" until the cache is read on the client — routes must not decide
  // anything before this, or they flash the wrong UI.
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const cached = readCachedUser();
    setUser(cached);
    setStatus(cached ? "authed" : "guest");
  }, []);

  const signOutLocal = useCallback(() => {
    clearCachedUser();
    setUser(null);
    setStatus("guest");
  }, []);

  const signIn = useCallback((nextUser) => {
    writeCachedUser(nextUser);
    setUser(nextUser);
    setStatus("authed");
  }, []);

  useEffect(() => {
    const id = axios.interceptors.response.use(
      (res) => res,
      (error) => {
        const code = error?.response?.status;
        const url = error?.config?.url || "";
        // Login/OTP endpoints answer 401 for bad credentials — that's a form
        // error to show, not an expired session, so don't bounce the user.
        const isAuthAttempt = /\/api\/(login|signup|verify-otp|resend-otp|app\/)/.test(url);

        if ((code === 401 || code === 403) && !isAuthAttempt) {
          signOutLocal();
          router.replace("/login");
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(id);
  }, [router, signOutLocal]);

  const value = useMemo(
    () => ({ user, status, role: user?.designation ?? null, signIn, signOutLocal }),
    [user, status, signIn, signOutLocal]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
