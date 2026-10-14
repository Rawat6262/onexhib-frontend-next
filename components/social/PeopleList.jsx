"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Users, X } from "lucide-react";

import InitialsAvatar from "@/components/social/InitialsAvatar";
import FollowButton from "@/components/social/FollowButton";
import { getPeople } from "@/models/social.model";
import { emptyList, mergePage, canLoadMore } from "@/lib/social/cursor-list";
import { displayName, roleLine, locationLine, describeRequestError } from "@/lib/social/profile";

/**
 * People you could follow.
 *
 * WHY THIS COMPONENT EXISTS. The social graph had no entrance: you could follow somebody
 * only if you already held their profile URL. A new account landed on an empty feed, a
 * profile with zero followers, and no route to anyone. UserList's empty state said as much
 * and deliberately printed no "find people" prompt, because there was nowhere to send
 * them.
 *
 * WHY NOT UserList. That component renders a follower/following page: it takes
 * fetchPage(userId, …), and its rows are links with no action, because it was built on the
 * rule that a row must never issue a request of its own. Here the row DOES act — it has a
 * Follow button — but it still issues no READ: `following` arrives on the row from one
 * batched server-side lookup, so fifty rows cost zero extra requests. That distinction is
 * what keeps this honest rather than an N+1 with a different shape.
 *
 * SEARCH IS DEBOUNCED AND ABORTABLE. Typing issues one request after a pause, and a
 * previous in-flight request is cancelled, so a slow response for "ca" cannot land after
 * the results for "carol" and overwrite them.
 *
 * THE FOLLOW STATE IS OWNED HERE, per row, because FollowButton is optimistic and hands
 * its parent the next state: the list updates that row and nothing else. A failed follow
 * rolls back through the same callback, so a row cannot be left claiming a relationship
 * the server refused.
 */
export default function PeopleList() {
  const [list, setList] = useState(emptyList);
  const [phase, setPhase] = useState("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(null);

  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");

  const abortRef = useRef(null);

  // One request per pause, not per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQuery(term.trim()), 300);
    return () => clearTimeout(t);
  }, [term]);

  const load = useCallback(async (cursor, q) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const first = !cursor;
    if (first) { setPhase("loading"); setMoreError(null); } else { setLoadingMore(true); setMoreError(null); }

    try {
      const { data } = await getPeople({
        cursor: cursor || undefined,
        q: q || undefined,
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
      else setMoreError(describeRequestError(error, "Could not load more."));
    } finally {
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    load(null, query);
    return () => abortRef.current?.abort();
  }, [load, query]);

  /** One row's follow flag changed. FollowButton is optimistic; it owns rollback. */
  const onFollowChange = useCallback((userId, { following }) => {
    setList((prev) => ({
      ...prev,
      items: prev.items.map((u) =>
        String(u._id) === String(userId) ? { ...u, following } : u
      ),
    }));
  }, []);

  return (
    <div>
      <div className="relative">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search people by name or company"
          aria-label="Search people by name or company"
          className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-9 text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        {term ? (
          <button
            type="button"
            onClick={() => setTerm("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:hover:text-gray-200"
          >
            <X size={15} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="mt-4">
        {phase === "loading" ? (
          <ul className="list-none space-y-2" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <li
                key={i}
                className="h-16 animate-pulse rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
              />
            ))}
          </ul>
        ) : phase === "error" ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-900/50">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              People could not be loaded.
            </p>
            <button
              type="button"
              onClick={() => load(null, query)}
              className="mt-3 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#131C55] hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:text-gray-300"
            >
              Try again
            </button>
          </div>
        ) : !list.items.length ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900/50">
            <Users size={22} aria-hidden="true" className="mx-auto text-gray-400" />
            <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-gray-50">
              {query ? "No one matches that search" : "No one to show yet"}
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
              {query
                ? "Try a different name or company."
                : "As more people join OneXhib, they will appear here."}
            </p>
          </div>
        ) : (
          <>
            <ul className="list-none space-y-2">
              {list.items.map((user) => {
                const name = displayName(user);
                const role = roleLine(user);
                const place = locationLine(user);
                const id = String(user._id);
                return (
                  <li
                    key={id}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
                  >
                    {/* The identity links to the profile; the action sits outside the
                        link, so following someone never navigates away from the list. */}
                    <Link
                      href={`/social/profile/${encodeURIComponent(id)}`}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55]"
                    >
                      <InitialsAvatar name={name} src={user.avatarUrl || null} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-gray-900 dark:text-gray-50">
                          {name}
                        </span>
                        {role ? (
                          <span className="block truncate text-xs text-gray-600 dark:text-gray-400">
                            {role}
                          </span>
                        ) : null}
                        {place ? (
                          <span className="block truncate text-xs text-gray-500 dark:text-gray-500">
                            {place}
                          </span>
                        ) : null}
                      </span>
                    </Link>

                    <div className="shrink-0">
                      <FollowButton
                        userId={id}
                        following={Boolean(user.following)}
                        onChange={(next) => onFollowChange(id, next)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            {moreError ? (
              <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
                {moreError}
              </p>
            ) : null}

            {/* canLoadMore, never items.length: the server drops blocked users after
                paging, so a page can be short while more pages remain. */}
            {canLoadMore(list, loadingMore) || loadingMore ? (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => load(list.nextCursor, query)}
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
          </>
        )}
      </div>
    </div>
  );
}
