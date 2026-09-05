"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { homeRouteForRole } from "@/lib/auth";

/**
 * Gates a route subtree. The Vite app had no equivalent — typing an admin URL
 * rendered the full admin shell to anyone, and only the empty API responses
 * hinted that you weren't allowed in.
 *
 * This prevents that UI exposure. It is NOT the security boundary: Express
 * still authorises every request, and AuthProvider's 401 interceptor evicts a
 * session the server rejects.
 *
 * @param {string[]} [roles] allowed designations; omit to allow any signed-in user
 */
export default function RequireAuth({ roles, children }) {
  const router = useRouter();
  const { status, role } = useAuth();

  const allowed = !roles || (role && roles.includes(role));

  useEffect(() => {
    if (status === "loading") return;
    if (status === "guest") {
      router.replace("/login");
    } else if (!allowed) {
      // Signed in, wrong area — send them to their own landing page rather
      // than to login, which would look like a session failure.
      router.replace(homeRouteForRole(role));
    }
  }, [status, allowed, role, router]);

  if (status !== "authed" || !allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">Checking your session…</p>
      </div>
    );
  }

  return children;
}
