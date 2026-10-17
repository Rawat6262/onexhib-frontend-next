"use client";

import { useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  KeyRound,
  Building2,
  CalendarDays,
  LayoutDashboard,
  Package,
  Star,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import RequireAuth from "@/components/auth/RequireAuth";
import { ROLES } from "@/lib/auth";
import { useAuth } from "@/components/auth/AuthProvider";
import { getAdminAccessRequests } from "@/models/exhibition.model";

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
  { group: "People", label: "Access requests", href: "/admin/requests", icon: <KeyRound size={16} /> },
];

export default function AdminLayout({ children }) {
  const { role } = useAuth();
  const [pending, setPending] = useState(0);

  // The pending count rides on the "Access requests" item, so a new request is
  // visible from every admin page. Fetched once per visit to the console.
  useEffect(() => {
    if (role !== ROLES.ADMIN) return;
    getAdminAccessRequests("pending")
      .then(({ data }) => setPending(data?.counts?.pending || 0))
      .catch(() => setPending(0));
  }, [role]);

  const items = ITEMS.map((item) => (item.href === "/admin/requests" ? { ...item, badge: pending } : item));

  return (
    <RequireAuth roles={[ROLES.ADMIN]}>
      <AppShell items={items} variant="sidebar" navTitle="Admin console" wide>
        {children}
      </AppShell>
    </RequireAuth>
  );
}
