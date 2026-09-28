"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { getUnreadCount } from "@/models/social.model";
import {
  POLL_INTERVAL_MS,
  normaliseUnreadCount,
  decrementUnread,
  isFreshPoll,
} from "@/lib/social/notification-state";

/**
 * The shared unread count, and the only thing that polls for it.
 *
 * WHY A PROVIDER AT ALL: the badge lives in the header and the inbox lives on
 * /social/notifications, and the two must not hold separate ideas of how many
 * notifications are unread. One number, one owner. Marking something read on the
 * page updates the badge; the badge's polling updates the page.
 *
 * ITS SCOPE IS DELIBERATELY NARROW. unreadCount, a refresh, and two state
 * transitions. No notifications list, no posts, no comments, no feed — those belong
 * to the routes that render them, and a provider that accumulated them would become
 * the app-wide store this codebase does not have and does not need. No Redux, no
 * Zustand, no React Query, no SWR.
 *
 * EXACTLY ONE POLLING OWNER. It is mounted inside AppShell, which is rendered once
 * per authenticated layout — (dashboard), (social) and admin each wrap AppShell in
 * RequireAuth — so an authenticated page has one provider and one interval. It is
 * never mounted around public pages, which have no session to count against.
 *
 * ONLY THE COUNT IS POLLED. getUnreadCount is an index-only countDocuments over
 * {recipient, readAt} that fetches no document; listNotifications runs two queries
 * and resolves every actor on the page. Polling the list would be the expensive
 * request repeated for information the badge does not use.
 */

const NotificationContext = createContext(null);

/**
 * `unreadCount` is null until the first read lands, and stays null if that read
 * fails — null means UNKNOWN, so the badge shows nothing rather than a confident
 * zero it has not earned.
 */
export function useNotifications() {
  return useContext(NotificationContext) ?? EMPTY;
}

/** For any consumer rendered outside the provider: no count, and no-op transitions. */
const EMPTY = Object.freeze({
  unreadCount: null,
  refresh: () => {},
  applyMarkOneRead: () => {},
  applyMarkAllRead: () => {},
});

export default function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(null);

  const mountedRef = useRef(true);
  const abortRef = useRef(null);
  /*
   * Bumped by every mutation. A poll carries the generation it left under, and a
   * response from an older generation is dropped — see isFreshPoll. Without it a
   * poll issued before a mark-read can land after it and restore the old count on
   * the very screen the user is looking at.
   */
  const genRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const refresh = useCallback(async () => {
    // One poll in flight at a time; a new one supersedes the last.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const startedAt = genRef.current;

    try {
      const { data } = await getUnreadCount({ signal: controller.signal });
      if (!mountedRef.current) return;
      // A mutation landed while this was in flight: it knows more than this does.
      if (!isFreshPoll(startedAt, genRef.current)) return;

      const next = normaliseUnreadCount(data && data.unreadCount);
      // null means the response carried nothing usable — keep what we had rather
      // than blanking a real number.
      if (next !== null) setUnreadCount(next);
    } catch {
      /*
       * A FAILED POLL IS SILENT, AND THAT IS THE WHOLE POLICY.
       *
       * No toast — a network blip would otherwise produce one every minute, for a
       * number nobody asked for. No zeroing — a failure says nothing about how many
       * are unread, so the last known count stands. No retry and no backoff — the
       * next scheduled poll IS the retry, and a minute is soon enough. 401 and 403
       * are the global interceptor's, which evicts the session on its own.
       */
    }
  }, []);

  useEffect(() => {
    let timer = null;

    const start = () => {
      // The null check is what makes repeated visibility changes safe: without it,
      // hide/show/hide/show would leave four intervals running.
      if (timer === null) timer = setInterval(refresh, POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // One catch-up read on returning, then the ordinary rhythm. A tab left
        // hidden for an hour should not come back to a stale badge.
        refresh();
        start();
      } else {
        // Hidden: nothing is on screen to update, so nothing is requested.
        stop();
      }
    };

    refresh(); // the single initial read
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    /*
     * VISIBILITY ONLY — there is deliberately no focus listener. visibilitychange
     * already fires for the case that matters (returning to a backgrounded tab),
     * and adding focus would fire again for the same return, sending two identical
     * reads a few milliseconds apart. One signal, one request.
     */
  }, [refresh]);

  /** One notification went unread -> read. No authoritative count is returned. */
  const applyMarkOneRead = useCallback(() => {
    genRef.current += 1;
    setUnreadCount((prev) => decrementUnread(prev));
  }, []);

  /**
   * Every notification was marked read. PUT read-all answers
   * `{ success, unreadCount: 0 }`, so the count is the SERVER's, not an assumption.
   */
  const applyMarkAllRead = useCallback((authoritative) => {
    genRef.current += 1;
    const next = normaliseUnreadCount(authoritative);
    if (next !== null) setUnreadCount(next);
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, refresh, applyMarkOneRead, applyMarkAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}
