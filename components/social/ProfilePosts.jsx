"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";

import PostCard from "@/components/social/PostCard";
import { getUserPosts } from "@/models/social.model";
import { emptyList, mergePage, canLoadMore, replaceItem } from "@/lib/social/cursor-list";
import { isOwnPost, describePostError } from "@/lib/social/post";

const PAGE_SIZE = 20;

/**
 * A person's posts, on their profile - the "Posts" tab.
 *
 * GET /api/social/posts/user/:userId already applies the visibility rules (public
 * posts to everyone, followers-only posts to followers, everything to the owner),
 * so this renders exactly what the server returns. Same list mechanics as the
 * feed: one in-flight request, cursor pagination through the shared helper, one
 * canonical copy of each post patched through replaceItem.
 *
 * Read-only for posts: editing and deleting live on the feed and My posts, which
 * own those flows. PostCard hides its owner menu when no handlers are passed.
 */
export default function ProfilePosts({ userId, viewerId, isSelf }) {
  const [list, setList] = useState(emptyList);
  const [phase, setPhase] = useState("loading");
  const [error, setError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const abortRef = useRef(null);

  const load = useCallback(
    async (cursor) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const first = !cursor;
      if (first) setPhase("loading");
      else setLoadingMore(true);
      setError(null);

      try {
        const { data } = await getUserPosts(userId, {
          limit: PAGE_SIZE,
          cursor: cursor || undefined,
          signal: controller.signal,
        });
        const page = {
          items: Array.isArray(data?.posts) ? data.posts : [],
          nextCursor: data?.nextCursor ?? null,
          hasMore: Boolean(data?.hasMore),
        };
        setList((prev) => mergePage(prev, page, first ? "replace" : "append"));
        setPhase("ready");
      } catch (err) {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
        setError(describePostError(err, "Posts could not be loaded."));
        if (first) setPhase("error");
      } finally {
        setLoadingMore(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    load(null);
    return () => abortRef.current?.abort();
  }, [load]);

  const handlePostChange = useCallback((next) => {
    setList((prev) => replaceItem(prev, next._id, next));
  }, []);

  if (phase === "loading") {
    return (
      <div aria-busy="true" className="space-y-4">
        {[0, 1].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900" />
        ))}
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-900/50">
        <p role="alert" className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
        <button
          type="button"
          onClick={() => load(null)}
          className="mt-3 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#131C55] hover:text-[#131C55] dark:border-gray-700 dark:text-gray-300"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!list.items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900/50">
        <MessageSquare size={22} aria-hidden="true" className="mx-auto text-gray-400" />
        <p className="mt-3 text-base font-semibold text-gray-900 dark:text-gray-50">
          {isSelf ? "You haven't posted yet." : "No posts to show."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4">
        {list.items.map((post) => (
          <PostCard
            key={String(post._id)}
            post={post}
            isOwnPost={isOwnPost(viewerId, post)}
            onPostChange={handlePostChange}
            viewerId={viewerId}
          />
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {canLoadMore(list, loadingMore) || loadingMore ? (
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => load(list.nextCursor)}
            disabled={loadingMore}
            className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#131C55] hover:text-[#131C55] disabled:opacity-60 motion-reduce:transition-none dark:border-gray-700 dark:text-gray-300"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
