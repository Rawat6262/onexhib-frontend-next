"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PenSquare } from "lucide-react";

import { toast } from "sonner";

import { useAuth } from "@/components/auth/AuthProvider";
import PostCard from "@/components/social/PostCard";
import PostComposer from "@/components/social/PostComposer";
import PostEditSheet from "@/components/social/PostEditSheet";
import ConfirmDialog from "@/components/social/ConfirmDialog";
import { getMyPosts, deletePost } from "@/models/social.model";
import {
  emptyList,
  mergePage,
  canLoadMore,
  replaceItem,
  removeItem,
  prependItem,
} from "@/lib/social/cursor-list";
import { describePostError } from "@/lib/social/post";
import { describeMutationError } from "@/lib/social/post-form";

/** Within the backend's MAX_LIMIT of 50; 20 is also the server's own default. */
const PAGE_SIZE = 20;

/**
 * My posts — the composer plus everything the viewer has published.
 *
 * Split out of the feed so that the feed is for READING and this page is for
 * WRITING AND MANAGING. The feed still lets an owner edit or delete a post in
 * place (the same card menu works everywhere), but this is the one page that
 * lists all of them in one place, regardless of who the viewer follows.
 *
 * Same list mechanics as the feed, on purpose: one canonical copy of each post
 * patched through replaceItem, cursor pagination through the shared helper, one
 * in-flight request cancelled by its replacement, and delete removed only after
 * the server confirms. See social-client.jsx for the reasoning behind each.
 *
 * GET /posts/me carries NO viewerReaction (only the feed attaches it), so a card
 * here starts with no reaction highlighted. Every card on this page is the
 * viewer's own, so isOwnPost is simply true.
 */
export default function MyPostsClient() {
  const { status } = useAuth();

  const [posts, setPosts] = useState(emptyList);
  const [phase, setPhase] = useState("loading");
  const [initialError, setInitialError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);

  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deletePending, setDeletePending] = useState(false);

  const abortRef = useRef(null);
  const composerRef = useRef(null);

  const load = useCallback(async (cursor) => {
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
      const { data } = await getMyPosts({
        limit: PAGE_SIZE,
        cursor: cursor || undefined,
        signal: controller.signal,
      });
      const page = {
        items: Array.isArray(data?.posts) ? data.posts : [],
        nextCursor: data?.nextCursor ?? null,
        hasMore: Boolean(data?.hasMore),
      };
      setPosts((prev) => mergePage(prev, page, first ? "replace" : "append"));
      setPhase("ready");
    } catch (error) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
      if (first) {
        setInitialError(describePostError(error, "Your posts could not be loaded."));
        setPhase("error");
      } else {
        setLoadMoreError(describePostError(error, "Could not load more posts."));
      }
    } finally {
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return undefined;
    load(null);
    return () => abortRef.current?.abort();
  }, [load, status]);

  const handlePostChange = useCallback((next) => {
    setPosts((prev) => replaceItem(prev, next._id, next));
  }, []);

  const handleCreated = useCallback((created) => {
    setPosts((prev) => prependItem(prev, created));
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleting || deletePending) return;

    setDeletePending(true);
    try {
      // One request; the backend cascades comments, reactions and notifications.
      await deletePost(deleting._id);
      setPosts((prev) => removeItem(prev, deleting._id));
      toast.success("Post deleted.");
      setDeleting(null);
    } catch (error) {
      toast.error(describeMutationError(error, "Your post could not be deleted."));
    } finally {
      setDeletePending(false);
    }
  }, [deleting, deletePending]);

  /** The empty state's button: bring the composer into view and put the caret in it. */
  const focusComposer = useCallback(() => {
    const el = composerRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.querySelector("textarea, input")?.focus({ preventScroll: true });
  }, []);

  const count = posts.items.length;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
        My posts
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
        Write a new update, and edit or delete anything you&rsquo;ve shared.
      </p>

      {/* The composer does not wait for the list: writing a post does not depend
          on having read the old ones, and a created post is prepended either way. */}
      <section id="compose" ref={composerRef} aria-label="Create a post" className="mt-6 scroll-mt-32">
        <PostComposer onCreated={handleCreated} />
      </section>

      <section aria-labelledby="my-posts-heading" className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-800">
          <h2 id="my-posts-heading" className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            Your posts
          </h2>
          {phase === "ready" && count > 0 ? (
            // "20+" while more pages exist: the endpoint returns no total, and
            // showing the loaded count alone would understate it.
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {count}
              {posts.hasMore ? "+" : ""} {count === 1 && !posts.hasMore ? "post" : "posts"}
            </span>
          ) : null}
        </div>

        {status === "loading" || phase === "loading" ? (
          <div aria-busy="true" className="space-y-4">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
              />
            ))}
          </div>
        ) : phase === "error" ? (
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
        ) : !count ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900/50">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-[#131C55]/[0.07] text-[#131C55] dark:bg-blue-400/10 dark:text-blue-300">
              <PenSquare size={20} aria-hidden="true" />
            </span>
            <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-gray-50">
              You haven&rsquo;t posted anything yet.
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
              Your posts will be listed here, where you can edit or delete them at any time.
            </p>
            <button
              type="button"
              onClick={focusComposer}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#131C55] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0E1B6B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:bg-blue-500 dark:text-gray-950 dark:hover:bg-blue-400"
            >
              <PenSquare size={16} aria-hidden="true" />
              Write your first post
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {posts.items.map((post) => (
                <PostCard
                  key={String(post._id)}
                  post={post}
                  isOwnPost
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

            {canLoadMore(posts, loadingMore) || loadingMore ? (
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => load(posts.nextCursor)}
                  disabled={loadingMore}
                  className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#131C55] hover:text-[#131C55] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:text-gray-300"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            ) : (
              <p className="mt-5 text-center text-xs text-gray-500 dark:text-gray-500">
                That&rsquo;s everything you&rsquo;ve posted.
              </p>
            )}
          </>
        )}
      </section>

      {editing ? (
        <PostEditSheet
          key={String(editing._id)}
          open
          onOpenChange={(next) => !next && setEditing(null)}
          post={editing}
          onPostChange={(updated) => {
            handlePostChange(updated);
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
    </div>
  );
}
