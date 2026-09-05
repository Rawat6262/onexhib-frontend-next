"use client";

import { LayoutDashboard, Users, User, Package } from "lucide-react";
import SidebarShell from "@/components/layout/SidebarShell";
import RequireAuth from "@/components/auth/RequireAuth";
import { ROLES } from "@/lib/auth";

// Admin-only area. The Vite app rendered these screens to anyone who typed the
// URL; they now require an ADMIN designation before anything is drawn.
export default function AdminLayout({ children }) {
  const items = [
    { label: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard size={20} /> },
    { label: "Organiser", href: "/admin/organisers", icon: <Users size={20} /> },
    { label: "User", href: "/admin/companies", icon: <User size={20} /> },
    { label: "Products", href: "/admin/products", icon: <Package size={20} /> },
  ];

  return (
    <RequireAuth roles={[ROLES.ADMIN]}>
      <SidebarShell items={items}>{children}</SidebarShell>
    </RequireAuth>
  );
}
