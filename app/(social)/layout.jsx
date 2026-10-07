"use client";

import { MessageSquare, UserCircle, Bell, ShieldOff } from "lucide-react";
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
 * `items` becoming the horizontal workspace sub-nav. Notifications joined it in
 * Phase 11G, once the route it points at existed — a sub-nav link to a route that
 * does not exist is a 404 with a signpost.
 *
 * My profile needs the signed-in user's id, which is only available client-side.
 * That costs nothing here: this layout is already a client component because
 * RequireAuth is, so reading useAuth() adds no boundary. It is rendered only when
 * an id exists, so the nav can never point at /social/profile/undefined.
 */
export default function SocialLayout({ children }) {
  const { user } = useAuth();

  const items = [
    { label: "Feed", href: "/social", icon: <MessageSquare size={16} /> },
    /*
     * The route exists now, so the link is no longer a signposted 404. It carries NO
     * unread count of its own: the badge in the header reads the shared provider, and
     * a count here would either be a second request per navigation render or a second
     * number that drifts from the bell's.
     */
    { label: "Notifications", href: "/social/notifications", icon: <Bell size={16} /> },
  ];
  if (user?._id) {
    items.push({
      label: "My profile",
      href: `/social/profile/${encodeURIComponent(String(user._id))}`,
      icon: <UserCircle size={16} />,
    });
  }
  /*
   * Privacy is in the SUB-NAV rather than tucked under /account, and that placement is the
   * point. Blocking conceals the blocked person's profile, so once a block exists there is
   * no route back to it from the person - the only way to undo one is to find this page.
   * The /account/* pages are deliberately undiscoverable (nothing links to them, they are
   * noindex/nofollow), so putting it there would satisfy the letter of "a management
   * surface exists" while leaving blocks effectively permanent.
   *
   * Unconditional, unlike My profile: it needs no id, and a signed-in user can always have
   * something to manage here.
   */
  items.push({ label: "Privacy", href: "/social/privacy", icon: <ShieldOff size={16} /> });

  return (
    <RequireAuth>
      <AppShell items={items}>{children}</AppShell>
    </RequireAuth>
  );
}
