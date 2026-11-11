"use client";

import AppShell from "@/components/layout/AppShell";
import RequireAuth from "@/components/auth/RequireAuth";
import { ROLES } from "@/lib/auth";

/**
 * The hotel dashboard. HOTEL accounts land here (homeRouteForRole); admins may
 * open it too. Any other role is sent to its own home by RequireAuth, which
 * cannot loop because no other role's home is /hotel.
 */
export default function HotelLayout({ children }) {
  return (
    <RequireAuth roles={[ROLES.HOTEL, ROLES.ADMIN]}>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
