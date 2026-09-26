"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Users } from "lucide-react";

import UserRow from "@/components/social/UserRow";
import { emptyList, mergePage, canLoadMore } from "@/lib/social/cursor-list";
import { describeRequestError } from "@/lib/social/profile";

/**
 * A cursor-paginated list of people — followers or following.
 *
 * THE SHORT-PAGE RULE, WHICH IS THE EASIEST THING HERE TO GET WRONG
 * The backend drives hasMore and nextCursor from the FOLLOW EDGES, then hydrates
 * each edge's user through socialPrivacy and drops any whose account has since
 * been deleted. So a page can legitimately return fewer visible users than the
 * limit while more pages remain.
 *
 * Continuation therefore depends on `hasMore` and `nextCursor` ONLY. Inferring the
 * end from `items.length < limit` would silently truncate a list the moment one
 * deleted account appeared in it — and it would look like correct behaviour.
 *
 * Pagination state comes from lib/social/cursor-list.js rather than being
 * reimplemented: it owns dedupe-by-_id, order preservation and the rule that
 * canLoadMore needs both a cursor and hasMore.
 */
export default function UserList({ userId, fetchPage, emptyMessage, emptyHint }) {
  const [list, setList] = useState(emptyList);
  const [phase, setPhase] = useState("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(null);

  // One controller per in-flight request, aborted when userId changes or the
  // component unmounts, so a response for the previous person cannot land in the
  // current list.
  const abortRef = useRef(null);

  const load = useCallback(
    async (cursor) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const first = !cursor;
      if (first) {
        setPhase("loading");
        setMoreError(null);
      } else {
        setLoadingMore(true);
        setMoreError(null);
      }

      try {
        const { data } = await fetchPage(userId, { cursor: cursor || undefined, signal: controller.signal });
        const page = {
          items: Array.isArray(data?.users) ? data.users : [],
          nextCursor: data?.nextCursor ?? null,
          hasMore: Boolean(data?.hasMore),
        };
        setList((prev) => mergePage(prev, page, first ? "replace" : "append"));
        setPhase("ready");
      } catch (error) {
        // An abort is this component cancelling itself, not a failure to report.
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
        if (first) setPhase("error");
        else setMoreError(describeRequestError(error, "Could not load more."));
      } finally {
        setLoadingMore(false);
      }
    },
    [userId, fetchPage]
  );

  useEffect(() => {
    setList(emptyList());
    load(null);
    return () => abortRef.current?.abort();
  }, [load]);

  if (phase === "loading") {
    return (
      <ul className="list-none space-y-2" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="h-16 animate-pulse rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
          />
        ))}
      </ul>
    );
  }

  if (phase === "error") {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-900/50">
        <p className="text-sm text-gray-600 dark:text-gray-400">This list could not be loaded.</p>
        <button
          type="button"
          onClick={() => load(null)}
          className="mt-3 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#131C55] hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:text-gray-300"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!list.items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900/50">
        <Users size={22} aria-hidden="true" className="mx-auto text-gray-400" />
        <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-gray-50">{emptyMessage}</h3>
        {/* No "find people" prompt: there is no user-search or discovery endpoint,
            so it would be an instruction nobody can follow. */}
        {emptyHint ? (
          <p className="mx-auto mt-1.5 max-w-md text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
            {emptyHint}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <ul className="list-none space-y-2">
        {list.items.map((user) => (
          <UserRow key={String(user._id)} user={user} />
        ))}
      </ul>

      {moreError ? (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {moreError}
        </p>
      ) : null}

      {/* canLoadMore, never items.length — see the short-page rule above. */}
      {canLoadMore(list, loadingMore) || loadingMore ? (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => load(list.nextCursor)}
            disabled={loadingMore}
            className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#131C55] hover:text-[#131C55] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:text-gray-300"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-500">
          End of list
        </p>
      )}
    </div>
  );
}
