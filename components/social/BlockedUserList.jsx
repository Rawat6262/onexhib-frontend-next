"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldOff } from "lucide-react";

import InitialsAvatar from "@/components/social/InitialsAvatar";
import { getBlockedUsers, unblockUser } from "@/models/social.model";
import { emptyList, mergePage, canLoadMore, removeItem } from "@/lib/social/cursor-list";
import { displayName, roleLine, locationLine } from "@/lib/social/profile";
import { confirmedFlag, describeRelationshipError } from "@/lib/social/relationship";

/**
 * The people the signed-in viewer has blocked, with an Unblock on each.
 *
 * WHY THIS IS NOT UserList WITH A DIFFERENT ROW
 * UserList renders UserRow, and UserRow wraps the whole row in a link to
 * /social/profile/<id>. For a blocked user that profile answers 404 — the same 404 as a
 * nonexistent account — so reusing it would give every row here a link to a dead end.
 * A blocked row is deliberately NOT navigable. UserList also takes fetchPage(userId, …)
 * and this endpoint takes no userId, so the two signatures genuinely differ.
 *
 * What IS shared is the part worth sharing: lib/social/cursor-list.js owns the paging,
 * the dedupe-by-_id and the rule that continuation needs both a cursor and hasMore.
 *
 * THE SHORT-PAGE RULE MATTERS MORE HERE THAN ANYWHERE ELSE. The server drives hasMore and
 * nextCursor from the BLOCK ROWS, then hydrates each row's user and drops any whose
 * account has since been deleted. Account deletion performs no social cascade yet, so
 * orphan rows are a normal state and a page can legitimately come back with fewer users
 * than the limit while more pages remain. Inferring the end from items.length would
 * truncate the list at the first orphan — and look like correct behaviour while doing it.
 *
 * NOTHING OPTIMISTIC. A row disappears only after the server has confirmed the unblock.
 * Removing it first would assert that a privacy boundary is gone before it is.
 */
export default function BlockedUserList() {
  const [list, setList] = useState(emptyList);
  const [phase, setPhase] = useState("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(null);
  const [pendingId, setPendingId] = useState(null);
  const [rowError, setRowError] = useState(null);
  const [notice, setNotice] = useState(null);

  const abortRef = useRef(null);

  const load = useCallback(async (cursor) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const first = !cursor;
    if (first) { setPhase("loading"); setMoreError(null); } else { setLoadingMore(true); setMoreError(null); }

    try {
      const { data } = await getBlockedUsers({
        cursor: cursor || undefined,
        signal: controller.signal,
      });
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
      else setMoreError(describeRelationshipError(error, "Could not load more."));
    } finally {
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    load(null);
    return () => abortRef.current?.abort();
  }, [load]);

  async function onUnblock(user) {
    if (pendingId) return;                  // one at a time; no double submit
    setPendingId(String(user._id));
    setRowError(null);
    setNotice(null);
    try {
      const { data } = await unblockUser(user._id);
      const flag = confirmedFlag(data, "blocked");
      setPendingId(null);
      if (flag === false) {
        /*
         * Server-confirmed, so the row may go. removeItem leaves hasMore and nextCursor
         * alone: they describe the server's REMAINING rows, and removing something already
         * on screen says nothing about what lies beyond the cursor.
         */
        setList((prev) => removeItem(prev, user._id));
        setNotice(`${displayName(user)} is unblocked.`);
      } else {
        // The server did not confirm the flag, so nothing is assumed - reload instead.
        await load(null);
      }
    } catch (error) {
      setPendingId(null);
      setRowError(describeRelationshipError(error, "Could not unblock. Please try again."));
    }
  }

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
          className="mt-3 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#131C55] hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:text-gray-300"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!list.items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900/50">
        <ShieldOff size={22} aria-hidden="true" className="mx-auto text-gray-400" />
        <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-gray-50">
          You haven&apos;t blocked anyone
        </h3>
        <p className="mx-auto mt-1.5 max-w-md text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          When you block someone, they appear here so you can undo it later.
        </p>
      </div>
    );
  }

  return (
    <div>
      {notice ? (
        <p role="status" className="mb-3 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-300">
          {notice}
        </p>
      ) : null}
      {rowError ? (
        <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">{rowError}</p>
      ) : null}

      <ul className="list-none space-y-2">
        {list.items.map((user) => {
          const name = displayName(user);
          const role = roleLine(user);
          const place = locationLine(user);
          const pending = pendingId === String(user._id);
          return (
            <li
              key={String(user._id)}
              /* NOT a link. This person's profile answers 404 to this viewer, so making
                 the row navigable would send them to a dead end. */
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
            >
              <InitialsAvatar name={name} src={null} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-gray-900 dark:text-gray-50">
                  {name}
                </span>
                {role ? (
                  <span className="block truncate text-xs text-gray-600 dark:text-gray-400">{role}</span>
                ) : null}
                {place ? (
                  <span className="block truncate text-xs text-gray-500 dark:text-gray-500">{place}</span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => onUnblock(user)}
                disabled={Boolean(pendingId)}
                aria-label={`Unblock ${name}`}
                className="shrink-0 rounded-xl border border-gray-300 px-3.5 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#131C55] hover:text-[#131C55] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:text-gray-200"
              >
                {pending ? "Unblocking…" : "Unblock"}
              </button>
            </li>
          );
        })}
      </ul>

      {moreError ? (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{moreError}</p>
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
        <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-500">End of list</p>
      )}
    </div>
  );
}
