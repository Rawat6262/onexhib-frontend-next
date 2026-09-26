"use client";

import { MessageSquare, UserCircle } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import RequireAuth from "@/components/auth/RequireAuth";
import { useAuth } from "@/components/auth/AuthProvider";

/**
 * The Community area shell.
 *
 * NO `roles` ARGUMENT, DELIBERATELY. Every one of the 27 social endpoints is
 * mounted with `restrictToLoginUser` and not one uses `restrictToAdmin`, so the
 * backend grants social to any signed-in account whatever its designation.
 * Passing roles here would invent a restriction the server does not have — and
 * RequireAuth redirects a disallowed role to its own landing page, so the symptom
 * would be a working API the UI refuses to open.
 *
 * Same structure as (dashboard)/layout.jsx: RequireAuth wrapping AppShell, with
 * `items` becoming the horizontal workspace sub-nav. Notifications is still
 * absent — it arrives in 11G with the route it points at, because a sub-nav link
 * to a route that does not exist is a 404 with a signpost.
 *
 * My profile needs the signed-in user's id, which is only available client-side.
 * That costs nothing here: this layout is already a client component because
 * RequireAuth is, so reading useAuth() adds no boundary. It is rendered only when
 * an id exists, so the nav can never point at /social/profile/undefined.
 */
export default function SocialLayout({ children }) {
  const { user } = useAuth();

  const items = [{ label: "Feed", href: "/social", icon: <MessageSquare size={16} /> }];
  if (user?._id) {
    items.push({
      label: "My profile",
      href: `/social/profile/${encodeURIComponent(String(user._id))}`,
      icon: <UserCircle size={16} />,
    });
  }

  return (
    <RequireAuth>
      <AppShell items={items}>{children}</AppShell>
    </RequireAuth>
  );
}
