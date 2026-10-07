"use client";

import { ShieldOff } from "lucide-react";

import BlockedUserList from "@/components/social/BlockedUserList";

/**
 * Privacy → Blocked users.
 *
 * WHY THIS PAGE HAD TO EXIST before Block could ship in the UI at all. Blocking conceals
 * the target's profile behind the same 404 as a nonexistent account, and every feed, list
 * and comment path strips blocked users before hydration. So the moment a block is made,
 * that person's id is gone from everything the client can reach — and with it the only way
 * to call the (perfectly reversible) unblock endpoint. Without this list, Block would have
 * been one-way in the product even though the API was never one-way.
 *
 * ONE SECTION FOR NOW, and no scaffolding for sections that do not exist. Mute needs no
 * management surface: a muted person stays directly reachable and their profile carries
 * `viewerMuted`, so the control lives where the person is. Reports are deliberately
 * invisible to the reporter after sending.
 */
export default function PrivacyClient() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
      <header>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl dark:text-gray-50">Privacy</h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          Controls that affect what you see and who can see you.
        </p>
      </header>

      <section aria-labelledby="blocked-heading" className="mt-7">
        <div className="flex items-center gap-2">
          <ShieldOff size={18} aria-hidden="true" className="text-gray-400" />
          <h2
            id="blocked-heading"
            className="text-base font-semibold text-gray-900 dark:text-gray-100"
          >
            Blocked users
          </h2>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          You cannot see each other&apos;s profiles or posts. Unblocking does not restore a
          follow — if you followed each other before, you will each need to follow again.
        </p>

        <div className="mt-4">
          <BlockedUserList />
        </div>
      </section>
    </div>
  );
}
