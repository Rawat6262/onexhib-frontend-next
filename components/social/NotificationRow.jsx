"use client";

import Link from "next/link";

import InitialsAvatar from "@/components/social/InitialsAvatar";
import { postTimestamp } from "@/lib/social/post";
import { notificationCopy, notificationHref, isUnread } from "@/lib/social/notification-copy";

/**
 * One notification.
 *
 * PRESENTATIONAL. It imports no model and no axios, holds no state and makes no
 * request. Marking read belongs to the page, which owns the list and the shared
 * count; this only reports that the row was activated.
 *
 * NO PER-ROW LOOKUP. The actor arrives already shaped — listNotifications resolves
 * every distinct actor on the page in ONE batched query — and postId and commentId
 * are ids to navigate with, not handles to fetch. A row that loaded its post would
 * turn one inbox request into twenty-one, and would have to run a visibility check
 * per row that the backend deliberately does not do.
 *
 * AN UNKNOWN TYPE RENDERS NOTHING. notificationCopy returns null rather than a
 * generic line, and the row returns null in turn: a sentence the reader cannot act
 * on or understand is worse than a gap, and the gap keeps the real problem — a
 * server sending a type this build does not know — visible.
 */
export default function NotificationRow({ notification, onActivate }) {
  const copy = notificationCopy(notification);
  if (!copy) return null;

  const href = notificationHref(notification);
  const unread = isUnread(notification);
  const stamp = postTimestamp(notification.createdAt);

  const body = (
    <>
      {/* Decorative: the name is rendered as text beside it. */}
      <InitialsAvatar name={copy.name} size="sm" />

      <span className="min-w-0 flex-1">
        <span className="block break-words text-[15px] leading-relaxed text-gray-800 dark:text-gray-200">
          {/* A deleted actor reads as "Someone" and is NOT emphasised as a name,
              because there is no person there to name. No id is ever printed. */}
          {copy.hasActor ? (
            <strong className="font-semibold text-gray-900 dark:text-gray-50">{copy.name}</strong>
          ) : (
            <span className="text-gray-700 dark:text-gray-300">{copy.name}</span>
          )}{" "}
          {copy.action}
        </span>

        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {stamp ? (
            <time dateTime={stamp.iso || undefined} className="text-xs text-gray-500 dark:text-gray-500">
              {stamp.text}
            </time>
          ) : null}

          {/* UNREAD IS NOT SIGNALLED BY COLOUR ALONE. There is a dot, a weight
              change on the row background, AND the word "Unread" as real text, so
              the state survives a greyscale screen and reaches a screen reader. */}
          {unread ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#131C55] dark:text-blue-300">
              <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-[#131C55] dark:bg-blue-300" />
              Unread
            </span>
          ) : null}
        </span>
      </span>
    </>
  );

  const shell = `flex w-full gap-3 rounded-xl px-3 py-3 text-left ${
    unread ? "bg-blue-50/60 dark:bg-blue-950/20" : ""
  }`;

  return (
    <li>
      {href ? (
        /*
         * A REAL LINK, and navigation is never awaited. onActivate fires the
         * mark-read alongside it, so a failed or slow mutation cannot stop the
         * reader opening the post or profile the notification is about.
         */
        <Link
          href={href}
          onClick={() => onActivate && onActivate(notification)}
          className={`${shell} transition hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:hover:bg-gray-800`}
        >
          {body}
        </Link>
      ) : (
        /*
         * Nothing to open: a FOLLOW whose actor has been deleted, or a row whose
         * source id is missing because a best-effort cascade was interrupted. The
         * row stays readable rather than becoming a link to nowhere. It can still
         * be cleared with "Mark all as read".
         */
        <div className={shell}>{body}</div>
      )}
    </li>
  );
}
