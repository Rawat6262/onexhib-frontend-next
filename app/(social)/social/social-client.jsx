"use client";

import { MessageSquare } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

/**
 * The Community shell.
 *
 * FOUNDATION ONLY. This makes no API call — not GET /api/social/feed, not
 * anything else. It shows no posts, no suggested people and no trending content:
 * production holds zero social documents, and rendering placeholder content would
 * mean inventing a discovery product that has no endpoint behind it. Phase 11D
 * implements the feed.
 *
 * It is a client component because it reads the signed-in user's name from
 * AuthProvider, which is browser-only state. It stays deliberately small so 11D
 * replaces its body rather than working around it.
 *
 * The greeting comes from the cached profile, not from an API call — that cache
 * exists for exactly this, and it is why AccountMenu can render a name without a
 * request. Social IDENTITIES elsewhere must come from socialPrivacy-shaped API
 * responses instead; this is the viewer's own name in their own browser.
 */
export default function SocialClient() {
  const { user } = useAuth();
  const firstName = typeof user?.first_name === "string" ? user.first_name.trim() : "";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          Community
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          {firstName ? `Welcome, ${firstName}. ` : ""}
          Posts from people you follow will appear here.
        </p>
      </header>

      <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900/50">
        <MessageSquare size={22} aria-hidden="true" className="mx-auto text-[#131C55] dark:text-blue-300" />
        <h2 className="mt-3 text-base font-semibold text-gray-900 dark:text-gray-50">
          Community is being prepared
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          Your feed, profile and notifications are on the way. Nothing to see here
          just yet.
        </p>
      </div>
    </div>
  );
}
