"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";

import { toast } from "sonner";

import { useAuth } from "@/components/auth/AuthProvider";
import PostCard from "@/components/social/PostCard";
import PostComposer from "@/components/social/PostComposer";
import PostEditSheet from "@/components/social/PostEditSheet";
import ConfirmDialog from "@/components/social/ConfirmDialog";
import { getFeed, deletePost } from "@/models/social.model";
import {
  emptyList,
  mergePage,
  canLoadMore,
  replaceItem,
  removeItem,
  prependItem,
} from "@/lib/social/cursor-list";
import { isOwnPost, describePostError } from "@/lib/social/post";
import { describeMutationError } from "@/lib/social/post-form";

/** Within the backend's MAX_LIMIT of 50; 20 is also the server's own default. */
const PAGE_SIZE = 20;

/**
 * The following feed.
 *
 * THIS IS NOT DISCOVERY. The backend's membership rule is the viewer plus the
 * accounts they currently follow, and nothing here widens it: there is no second
 * request for public posts, no suggested accounts, no trending section. The feed
 * renders exactly what GET /api/social/feed returns, and the empty state says so
 * plainly rather than implying a discovery feature exists.
 *
 * THE PARENT OWNS THE POSTS. PostCard emits a whole replacement post through
 * onPostChange and this component swaps it in with replaceItem, so there is one
 * canonical copy of each post. Two copies of viewerReaction would drift the first
 * time one of them was clicked.
 *
 * ONE REQUEST PER PAGE, AND NOTHING PER CARD. The feed endpoint batches every
 * author and tagged identity into a single query and attaches viewerReaction
 * itself, so a card needs no identity lookup and no GET reaction.
 */
export default function SocialClient() {
  const { user, status } = useAuth();

  const [feed, setFeed] = useState(emptyList);
  const [phase, setPhase] = useState("loading");
  const [initialError, setInitialError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);

  // Which post the owner is editing or deleting. Held here rather than in the
  // card, because the feed owns the canonical post objects and both flows end in
  // a list mutation.
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deletePending, setDeletePending] = useState(false);

  const abortRef = useRef(null);

  const load = useCallback(async (cursor) => {
    // One in-flight request at a time. A replacement fetch cancels the previous
    // one, so a slow first page cannot land after a refresh and resurrect it.
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
      const { data } = await getFeed({
        limit: PAGE_SIZE,
        cursor: cursor || undefined,
        signal: controller.signal,
      });
      const page = {
        items: Array.isArray(data?.posts) ? data.posts : [],
        nextCursor: data?.nextCursor ?? null,
        hasMore: Boolean(data?.hasMore),
      };
      setFeed((prev) => mergePage(prev, page, first ? "replace" : "append"));
      setPhase("ready");
    } catch (error) {
      // An abort is this component cancelling itself, not a failure to report.
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
      if (first) {
        setInitialError(describePostError(error, "Your feed could not be loaded."));
        setPhase("error");
      } else {
        // A failed page two must NOT wipe the posts already on screen.
        setLoadMoreError(describePostError(error, "Could not load more posts."));
      }
    } finally {
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    // Wait for the cached session to resolve, or isOwnPost would be decided
    // against a null user on the first render.
    if (status === "loading") return undefined;
    load(null);
    return () => abortRef.current?.abort();
  }, [load, status]);

  /** One canonical post object per post — see the header note on ownership. */
  const handlePostChange = useCallback((next) => {
    setFeed((prev) => replaceItem(prev, next._id, next));
  }, []);

  /**
   * A post the viewer just created goes to the top.
   *
   * prependItem rather than a refetch: the created post is authoritative and
   * complete, so re-requesting page one to show it would be a wasted round trip
   * that also discards everything already loaded below. The cursor is left alone
   * — it describes the server’s remaining rows, which this does not change.
   */
  const handleCreated = useCallback((created) => {
    setFeed((prev) => prependItem(prev, created));
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleting || deletePending) return;

    setDeletePending(true);
    try {
      // ONE request. The backend cascades comments, reactions and notifications
      // itself (Phase 7.1 and 10), so the client must not attempt any child
      // cleanup — it has no authority over those rows and no way to do it safely.
      await deletePost(deleting._id);
      // Removed only AFTER the server confirms: an optimistic removal would have
      // to re-insert the card at its original position on failure, and that
      // position depends on the server’s ordering.
      setFeed((prev) => removeItem(prev, deleting._id));
      toast.success("Post deleted.");
      setDeleting(null);
    } catch (error) {
      toast.error(describeMutationError(error, "Your post could not be deleted."));
    } finally {
      setDeletePending(false);
    }
  }, [deleting, deletePending]);

  if (status === "loading" || phase === "loading") {
    return (
      <Shell>
        <div aria-busy="true" className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
            />
          ))}
        </div>
      </Shell>
    );
  }

  if (phase === "error") {
    return (
      <Shell>
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
      </Shell>
    );
  }

  if (!feed.items.length) {
    return (
      <Shell composer={<PostComposer onCreated={handleCreated} />}>
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900/50">
          <MessageSquare size={22} aria-hidden="true" className="mx-auto text-gray-400" />
          <h2 className="mt-3 text-base font-semibold text-gray-900 dark:text-gray-50">
            No posts in your feed yet.
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
            Posts from people you follow will appear here.
          </p>
          {/* No "Find people", no suggested accounts, no trending: there is no
              discovery endpoint, so any of those would be an instruction nobody
              can follow. No "Create post" either — the composer is 11E. */}
        </div>
      </Shell>
    );
  }

  return (
    <Shell composer={<PostComposer onCreated={handleCreated} />}>
      <div className="space-y-4">
        {feed.items.map((post) => (
          <PostCard
            key={String(post._id)}
            post={post}
            isOwnPost={isOwnPost(user?._id, post)}
            onPostChange={handlePostChange}
            onEditRequest={setEditing}
            onDeleteRequest={setDeleting}
          />
        ))}
      </div>

      {loadMoreError ? (
        <p role="alert" className="mt-3 text-center text-sm text-red-600 dark:text-red-400">
          {loadMoreError}
        </p>
      ) : null}

      {/* hasMore + nextCursor is the only continuation signal. A page can return
          fewer posts than PAGE_SIZE and still have more, so posts.length must
          never decide this. */}
      {canLoadMore(feed, loadingMore) || loadingMore ? (
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => load(feed.nextCursor)}
            disabled={loadingMore}
            className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#131C55] hover:text-[#131C55] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:text-gray-300"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : (
        <p className="mt-5 text-center text-xs text-gray-500 dark:text-gray-500">
          You&rsquo;re all caught up.
        </p>
      )}

      {/* Keyed on the post id and mounted only while open, so the form always
          starts from the current post rather than from state left by a previous
          edit. */}
      {editing ? (
        <PostEditSheet
          key={String(editing._id)}
          open
          onOpenChange={(next) => !next && setEditing(null)}
          post={editing}
          onPostChange={(updated) => {
            handlePostChange(updated);
            // Keep the open sheet showing the authoritative post, so a media
            // change is reflected without closing and reopening it.
            setEditing(updated);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(next) => !next && setDeleting(null)}
        title="Delete this post?"
        description="This removes the post and its comments, reactions and media. This cannot be undone."
        confirmLabel="Delete post"
        pendingLabel="Deleting…"
        pending={deletePending}
        onConfirm={handleConfirmDelete}
      />
    </Shell>
  );
}

/** Single bounded column — readable on a phone, not a three-column desktop layout. */
function Shell({ children, composer = null }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
        Community
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
        Posts from you and the people you follow.
      </p>
      {/* Absent while the feed is loading or errored: a composer above a skeleton
          invites a post into a page whose state is unknown. */}
      {composer ? <div className="mt-6">{composer}</div> : null}
      <div className="mt-8">{children}</div>
    </div>
  );
}
