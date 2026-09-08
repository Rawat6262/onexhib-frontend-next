"use client";

import { LayoutDashboard, Users, User, Package } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import RequireAuth from "@/components/auth/RequireAuth";
import { ROLES } from "@/lib/auth";

// Admin-only area. The Vite app rendered these screens to anyone who typed the
// URL; they now require an ADMIN designation before anything is drawn.
export default function AdminLayout({ children }) {
  const items = [
    { label: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard size={16} /> },
    { label: "Organiser", href: "/admin/organisers", icon: <Users size={16} /> },
    { label: "User", href: "/admin/companies", icon: <User size={16} /> },
    { label: "Products", href: "/admin/products", icon: <Package size={16} /> },
  ];

  return (
    <RequireAuth roles={[ROLES.ADMIN]}>
      <AppShell items={items}>{children}</AppShell>
    </RequireAuth>
  );
}
