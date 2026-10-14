"use client";

import AppShell from "@/components/layout/AppShell";
import RequireAuth from "@/components/auth/RequireAuth";

/**
 * /welcome — signed-in, ANY role.
 *
 * NO `roles` ARGUMENT, and that is the whole point of this route. It is where
 * homeRouteForRole sends every role without a workspace of its own (VISITOR,
 * Exhibitor, anything unknown). RequireAuth answers a disallowed role by
 * redirecting to homeRouteForRole(role); if this layout restricted roles, a role
 * it excluded would be redirected here, rejected again, and loop forever — the
 * exact "Checking your session…" hang this page exists to end.
 */
export default function WelcomeLayout({ children }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
