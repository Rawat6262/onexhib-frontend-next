"use client";

import { Users, Briefcase } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import RequireAuth from "@/components/auth/RequireAuth";
import { ROLES } from "@/lib/auth";

// Organiser + exhibition-service area. Any signed-in non-admin role belongs
// here; admins have their own shell under /admin.
export default function DashboardLayout({ children }) {
  const items = [
    { label: "Organiser", href: "/organiser", icon: <Users size={16} /> },
    { label: "Services", href: "/services", icon: <Briefcase size={16} /> },
  ];

  return (
    <RequireAuth roles={[ROLES.ORGANISER, ROLES.EXHIBITION_SERVICE, ROLES.ADMIN]}>
      <AppShell items={items}>{children}</AppShell>
    </RequireAuth>
  );
}
