"use client";

import { MessageSquare } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import RequireAuth from "@/components/auth/RequireAuth";

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
 * `items` becoming the horizontal workspace sub-nav. Only the Feed entry exists
 * in 11B — My profile and Notifications arrive with the routes they point at in
 * 11C and 11G, because a sub-nav link to a route that does not exist is a 404
 * with a signpost.
 */
export default function SocialLayout({ children }) {
  const items = [{ label: "Feed", href: "/social", icon: <MessageSquare size={16} /> }];

  return (
    <RequireAuth>
      <AppShell items={items}>{children}</AppShell>
    </RequireAuth>
  );
}
