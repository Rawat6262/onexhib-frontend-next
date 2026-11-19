"use client";

import AppShell from "@/components/layout/AppShell";
import RequireAuth from "@/components/auth/RequireAuth";
import { ROLES } from "@/lib/auth";

/**
 * The venue dashboard. EXHIBITION_CENTRE accounts land here (homeRouteForRole);
 * admins may open it too. Any other role is sent to its own home by
 * RequireAuth, which cannot loop because no other role's home is /centre.
 */
export default function CentreLayout({ children }) {
  return (
    <RequireAuth roles={[ROLES.EXHIBITION_CENTRE, ROLES.ADMIN]}>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
