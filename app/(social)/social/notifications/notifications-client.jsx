"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, CheckCheck } from "lucide-react";

import NotificationRow from "@/components/social/NotificationRow";
import { useNotifications } from "@/components/social/NotificationProvider";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/models/social.model";
import { emptyList, mergePage, canLoadMore, replaceItem } from "@/lib/social/cursor-list";
import { isCanceled } from "@/lib/social/comment";
import {
  NOTIFICATIONS_PAGE_SIZE,
  shouldMarkRead,
  applyReadAt,
  describeNotificationError,
} from "@/lib/social/notification-state";

/**
 * The notification inbox.
 *
 * THE COUNT IS THE PROVIDER'S, NEVER THIS PAGE'S. The badge in the header and this
 * list would otherwise drift the moment one of them changed: this page holds at most
 * one page of rows, so counting them would report 20 for an inbox of sixty. Every
 * successful mark-read reports upward, and the provider's polling flows back down.
 *
 * THE LIST IS NOT POLLED. Only the count is, once a minute, by the provider. This
 * list loads on entry and on Load more, because a list that reordered itself under
 * a reader's cursor is worse than one that is a minute old.
 *
 * NO REQUEST PER ROW. Actors arrive shaped from one batched query; postId and
 * commentId are ids to navigate with. Rows are presentational and cannot fetch.
 */
export default function NotificationsClient() {
  const { unreadCount, applyMarkOneRead, applyMarkAllRead } = useNotifications();

  const [list, setList] = useState(emptyList);
  const [phase, setPhase] = useState("loading");
  const [initialError, setInitialError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const abortRef = useRef(null);
  const mountedRef = useRef(true);
  /** Ids with a mark-read in flight, so one row cannot fire twice. */
  const inFlightRef = useRef(new Set());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async (cursor) => {
    // One list request at a time; a replacement cancels the previous one.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const first = !cursor;
    if (first) {
      setPhase("loading");
      setInitialError(null);
    } else {
      setLoadingMore(true);
      setLoadMoreError(null);
    }

    try {
      const { data } = await getNotifications({
        limit: NOTIFICATIONS_PAGE_SIZE,
        cursor: cursor || undefined,
        signal: controller.signal,
      });
      const page = {
        items: Array.isArray(data?.notifications) ? data.notifications : [],
        nextCursor: data?.nextCursor ?? null,
        hasMore: Boolean(data?.hasMore),
      };
      // mergePage dedupes by _id, so a retried page cannot duplicate rows.
      setList((prev) => mergePage(prev, page, first ? "replace" : "append"));
      setPhase("ready");
    } catch (error) {
      if (isCanceled(error)) return; // our own cancellation, not a failure
      if (first) {
        setInitialError(describeNotificationError(error, "Your notifications could not be loaded."));
        setPhase("error");
      } else {
        // A failed page two must NOT wipe the rows already on screen.
        setLoadMoreError(describeNotificationError(error, "Could not load more notifications."));
      }
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    load(null);
    return () => abortRef.current?.abort();
  }, [load]);

  /**
   * A row was activated.
   *
   * NAVIGATION IS NOT WAITED FOR AND NOT CONDITIONAL. The row is a Link; the browser
   * follows it while this runs. So a 429, a 500 or a dead connection costs the
   * notification's read state and nothing else — the reader still reaches the post.
   * That is the right trade: a notification is primarily a pointer, and refusing to
   * open it because a bookkeeping write failed would trap the user.
   *
   * AN ALREADY-READ ROW SENDS NOTHING. markNotificationRead does not pin
   * `readAt: null` into its filter, so a repeat overwrites the stored timestamp with
   * a later one — churn for no visible change, out of a 60/min bucket.
   */
  const handleActivate = useCallback(
    async (notification) => {
      if (!shouldMarkRead(notification)) return;

      const id = String(notification._id);
      if (inFlightRef.current.has(id)) return; // one request per row
      inFlightRef.current.add(id);

      try {
        const { data } = await markNotificationRead(notification._id);
        const readAt = data && data.readAt;
        // NO CONFIRMATION, NO DECREMENT. The response's readAt is the only evidence
        // the write happened; `success` alone is not enough to move a count.
        if (!readAt) return;

        // The provider decrements by exactly one, clamped at zero. The endpoint
        // returns no unreadCount, so there is no authoritative number to prefer.
        applyMarkOneRead();

        // The page may already have unmounted, because the Link navigated.
        if (mountedRef.current) {
          setList((prev) => replaceItem(prev, notification._id, applyReadAt(notification, readAt)));
        }
      } catch {
        /*
         * Restrained on purpose: no toast. The user has been taken to the post they
         * asked for, and "could not mark as read" is noise about bookkeeping they
         * did not request. The count and the row keep their unread state, which is
         * still true, and the next visit re-reads it.
         */
      } finally {
        inFlightRef.current.delete(id);
      }
    },
    [applyMarkOneRead]
  );

  /**
   * Mark everything read.
   *
   * ONE REQUEST, NEVER ONE PER ROW. updateMany on the server touches only rows with
   * `readAt: null`, and answers `{ success, unreadCount: 0 }` — an authoritative
   * count, so the badge is set from the response rather than assumed.
   *
   * It returns NO rows and no timestamp, so the loaded rows are refreshed with ONE
   * list read rather than stamped with a timestamp this client invented. A fabricated
   * readAt would be a visible lie about when something happened, and inventing twenty
   * of them to avoid one request is the wrong saving.
   */
  const handleMarkAll = useCallback(async () => {
    if (markingAll) return; // the double-submit guard

    setMarkingAll(true);
    try {
      const { data } = await markAllNotificationsRead();
      if (!data || data.success !== true) throw new Error("unconfirmed");

      applyMarkAllRead(data.unreadCount);
      if (mountedRef.current) await load(null);
    } catch (error) {
      // NOT optimistic: nothing was zeroed, so nothing needs rolling back. The count
      // and every row keep the state they had.
      toast.error(describeNotificationError(error, "Your notifications could not be updated."));
    } finally {
      if (mountedRef.current) setMarkingAll(false);
    }
  }, [markingAll, applyMarkAllRead, load]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            Notifications
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
            Follows, reactions and comments on your posts.
          </p>
        </div>

        {/* Only when there is something to mark. A control that would do nothing is
            worse than no control: it invites a request that changes nothing. */}
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={markingAll}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#131C55] hover:text-[#131C55] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:text-gray-300"
          >
            <CheckCheck size={15} aria-hidden="true" />
            {markingAll ? "Marking…" : "Mark all as read"}
          </button>
        ) : null}
      </div>

      <div className="mt-8">
        {phase === "loading" ? (
          <div aria-busy="true" className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-50 dark:bg-gray-900" />
            ))}
          </div>
        ) : null}

        {phase === "error" ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-900/50">
            <p role="alert" className="text-sm text-gray-600 dark:text-gray-400">
              {initialError}
            </p>
            <button
              type="button"
              onClick={() => load(null)}
              className="mt-3 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#131C55] hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:text-gray-300"
            >
              Try again
            </button>
          </div>
        ) : null}

        {phase === "ready" && !list.items.length ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900/50">
            <Bell size={22} aria-hidden="true" className="mx-auto text-gray-400" />
            <h2 className="mt-3 text-base font-semibold text-gray-900 dark:text-gray-50">
              No notifications yet.
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
              When someone follows you, reacts to a post or comments, it appears here.
            </p>
            {/* No "enable push notifications" and no email preferences: neither
                exists, and offering a switch nobody can flip is a false promise. */}
          </div>
        ) : null}

        {list.items.length ? (
          <ul className="space-y-1">
            {list.items.map((notification) => (
              <NotificationRow
                key={String(notification._id)}
                notification={notification}
                onActivate={handleActivate}
              />
            ))}
          </ul>
        ) : null}

        {loadMoreError ? (
          <p role="alert" className="mt-3 text-center text-sm text-red-600 dark:text-red-400">
            {loadMoreError}
          </p>
        ) : null}

        {/* hasMore + nextCursor is the only continuation signal: a page can hold
            fewer rows than the limit and still have more behind it. An explicit
            button, never infinite scroll. */}
        {canLoadMore(list, loadingMore) || loadingMore ? (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => load(list.nextCursor)}
              disabled={loadingMore}
              className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#131C55] hover:text-[#131C55] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:text-gray-300"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        ) : list.items.length ? (
          <p className="mt-5 text-center text-xs text-gray-500 dark:text-gray-500">
            You&rsquo;re all caught up.
          </p>
        ) : null}
      </div>
    </div>
  );
}
