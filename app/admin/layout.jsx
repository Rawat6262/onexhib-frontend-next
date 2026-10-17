"use client";

import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  LayoutDashboard,
  Package,
  Star,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import RequireAuth from "@/components/auth/RequireAuth";
import { ROLES } from "@/lib/auth";

/*
 * Admin-only area. The Vite app rendered these screens to anyone who typed the
 * URL; they now require an ADMIN designation before anything is drawn.
 *
 * NAMES SAY WHAT THE PAGE HOLDS. The tabs used to read Organiser (it lists
 * exhibitions) and User (it lists companies). The URLs are unchanged so nobody's
 * bookmarks break; only the labels moved. With six destinations the area uses
 * the sidebar rail on wide screens, grouped, and the wider container its tables
 * need; below `lg` it falls back to the same tab strip as before.
 */
const ITEMS = [
  { group: "Overview", label: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard size={16} /> },
  { group: "Catalogue", label: "Exhibitions", href: "/admin/organisers", icon: <CalendarDays size={16} /> },
  { group: "Catalogue", label: "Featured", href: "/admin/featured", icon: <Star size={16} /> },
  { group: "Catalogue", label: "Companies", href: "/admin/companies", icon: <Building2 size={16} /> },
  { group: "Catalogue", label: "Products", href: "/admin/products", icon: <Package size={16} /> },
  { group: "Catalogue", label: "Services", href: "/admin/services", icon: <BriefcaseBusiness size={16} /> },
];

export default function AdminLayout({ children }) {
  return (
    <RequireAuth roles={[ROLES.ADMIN]}>
      <AppShell items={ITEMS} variant="sidebar" navTitle="Admin console" wide>
        {children}
      </AppShell>
    </RequireAuth>
  );
}
