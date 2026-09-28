"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { useNotifications } from "@/components/social/NotificationProvider";
import { badgeLabel, badgeAnnouncement } from "@/lib/social/notification-state";

/**
 * The unread badge in the signed-in header.
 *
 * A LINK, NOT A DROPDOWN PANEL. There is one place notifications are read, and it
 * is /social/notifications. A hover panel would be a second list with its own
 * pagination, its own read-marking and its own idea of the count — the duplication
 * this provider exists to avoid — and it would have to fetch the list on open,
 * which is the one request the polling design deliberately never makes.
 *
 * IT FETCHES NOTHING ITSELF. The count comes from the provider, so mounting the
 * bell costs no request and there is exactly one poller however many bells render.
 *
 * ONE ACCESSIBLE NAME, STATING THE COUNT. The number is aria-hidden, and the link's
 * aria-label says "Notifications, 3 unread" — otherwise a screen reader announces
 * the bell and then a bare "3", or reads the count twice.
 */
export default function NotificationBell() {
  const { unreadCount } = useNotifications();
  const label = badgeLabel(unreadCount);

  return (
    <Link
      href="/social/notifications"
      aria-label={badgeAnnouncement(unreadCount)}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 transition hover:bg-gray-100 hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-blue-300"
    >
      <Bell size={18} aria-hidden="true" />

      {/* No badge at all when the count is zero or not yet known: an empty badge is
          decoration, and it teaches people to stop looking at the real one. */}
      {label ? (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-[18px] text-white"
        >
          {label}
        </span>
      ) : null}
    </Link>
  );
}
