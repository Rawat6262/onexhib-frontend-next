"use client";

import AppShell from "@/components/layout/AppShell";
import RequireAuth from "@/components/auth/RequireAuth";

/**
 * /exhibitor - the exhibitor workspace. Signed-in, ANY role.
 *
 * No `roles` argument, for the same reason as /welcome: homeRouteForRole sends
 * Exhibitor accounts here, and RequireAuth answers a disallowed role by
 * redirecting to homeRouteForRole(role) - a role this layout excluded would loop.
 * Every write is self-scoped on the backend (the company is found by its owner,
 * the session user), so an account of another type opening it can only manage
 * its own company.
 */
export default function ExhibitorLayout({ children }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
