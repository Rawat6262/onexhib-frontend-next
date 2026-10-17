"use client";

import { Briefcase, CalendarDays } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import RequireAuth from "@/components/auth/RequireAuth";
import { useAuth } from "@/components/auth/AuthProvider";
import { ROLES } from "@/lib/auth";

/*
 * Organiser + exhibition-service area. Any signed-in non-admin role belongs
 * here; admins have their own shell under /admin but may open these pages too.
 *
 * BOTH TABS FOR EVERYONE in this area. An organiser often also offers
 * services (stall building, printing) and a provider may run a show, so each
 * keeps a one-click way to the other list - and back to it from the manage
 * screens (/exhibitions/[id], /companies/[id], /products/[id]).
 *
 * "My services", not "Services": the header directly above carries a public
 * "Services" link to /exhibition-services, and two identical labels one row
 * apart is what sent signed-in users to the public page.
 */
const EXHIBITIONS = { label: "My exhibitions", href: "/organiser", icon: <CalendarDays size={16} /> };
const SERVICES = { label: "My services", href: "/services", icon: <Briefcase size={16} /> };

export default function DashboardLayout({ children }) {
  const { role } = useAuth();
  // A service provider's own list first, so the strip opens on their home.
  const items = role === ROLES.EXHIBITION_SERVICE ? [SERVICES, EXHIBITIONS] : [EXHIBITIONS, SERVICES];

  return (
    <RequireAuth roles={[ROLES.ORGANISER, ROLES.EXHIBITION_SERVICE, ROLES.ADMIN]}>
      <AppShell items={items}>{children}</AppShell>
    </RequireAuth>
  );
}
