"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import PostCard from "@/components/social/PostCard";
import PostEditSheet from "@/components/social/PostEditSheet";
import ConfirmDialog from "@/components/social/ConfirmDialog";
import CommentList from "@/components/social/CommentList";
import { getPost, getPostReaction, deletePost } from "@/models/social.model";
import { isOwnPost } from "@/lib/social/post";
import { describeMutationError } from "@/lib/social/post-form";
import {
  buildPostDetail,
  applyAuthoritativeCount,
  isCanceled,
  describePostDetailError,
} from "@/lib/social/comment";

/**
 * One post and its comments.
 *
 * THE DETAIL FETCHES ITS OWN AUTHORITATIVE POST. Navigation from the feed is
 * immediate, but nothing here is seeded from the feed object: that copy may be
 * minutes old, its counts may have moved, and its author may have edited it. The
 * page reads GET /api/social/posts/:postId and renders that.
 *
 * TWO READS, AND THE SECOND ONE IS NECESSARY. The canonical post shape carries NO
 * `viewerReaction` — listPosts only attaches it when the feed passes its decorator,
 * and the post controller says in as many words that the other endpoints must not
 * start emitting it. So the viewer's own reaction is read ONCE, here, for the whole
 * page. Feed cards still read nothing per card, and this is not a pattern they
 * inherit.
 *
 * They are requested in parallel and fail together. A post rendered with the wrong
 * reaction state would show an un-pressed button on a post the viewer has already
 * liked, and their next click would be a server no-op that appears to do nothing.
 *
 * THE PARENT OWNS THE POST. PostCard emits whole replacement posts, the edit sheet
 * emits authoritative ones, and the comment list reports the authoritative
 * commentCount — all of which land in one piece of state.
 *
 * NO PROTECTED SSR FETCHING. Every social read needs the uid cookie; the page
 * component is a frame and the authenticated work happens here, exactly as the
 * profile route already does it.
 */
export default function PostDetailClient({ postId }) {
  const { user, status } = useAuth();
  const router = useRouter();

  const [post, setPost] = useState(null);
  const [phase, setPhase] = useState("loading");
  const [error, setError] = useState(null);

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  const abortRef = useRef(null);
  const mountedRef = useRef(true);
  // Set once the post is gone and we are leaving. It stops a late comment or
  // reaction response from writing state into a page that no longer has a post.
  const goneRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase("loading");
    setError(null);

    try {
      // One signal for both, so navigating away abandons the pair together and a
      // response for post A can never be merged into post B.
      const config = { signal: controller.signal };
      const [postRes, reactionRes] = await Promise.all([
        getPost(postId, config),
        getPostReaction(postId, config),
      ]);

      if (!mountedRef.current || goneRef.current) return;

      const detail = buildPostDetail(postRes.data && postRes.data.post, reactionRes.data && reactionRes.data.reaction);
      if (!detail) {
        setError("This post isn't available.");
        setPhase("error");
        return;
      }

      setPost(detail);
      setPhase("ready");
    } catch (err) {
      if (isCanceled(err)) return; // our own cancellation, not a failure
      if (!mountedRef.current) return;
      // 404 and 400 both read as unavailable: the backend uses ONE 404 for missing,
      // deleted, not-yours and followers-only, and telling them apart here would
      // undo the concealment it exists for.
      setError(describePostDetailError(err, "This post could not be loaded."));
      setPhase("error");
    }
  }, [postId]);

  useEffect(() => {
    // Wait for the cached session, or isOwnPost would be decided against a null
    // user on the first render and the owner controls would flicker.
    if (status === "loading") return undefined;
    load();
    return () => abortRef.current?.abort();
  }, [load, status]);

  /** One canonical post: reactions, edits and media changes all land here. */
  const handlePostChange = useCallback((next) => {
    if (goneRef.current) return;
    setPost(next);
  }, []);

  /**
   * The authoritative commentCount from a create or delete response.
   *
   * Only a real number from the server is applied — applyAuthoritativeCount returns
   * the post unchanged otherwise, so a missing field never becomes a guess, and the
   * count is never derived from the loaded comments.
   */
  const handleCommentCount = useCallback((count) => {
    if (goneRef.current) return;
    setPost((prev) => applyAuthoritativeCount(prev, count));
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!post || deletePending) return;

    setDeletePending(true);
    try {
      // ONE request. The backend cascades comments, reactions and notifications
      // itself (Phase 7.1 and 10); the client has no authority over those rows.
      await deletePost(post._id);

      // Latched before navigating, so a comment response still in flight cannot
      // write into a page whose post has just been deleted.
      goneRef.current = true;
      abortRef.current?.abort();
      toast.success("Post deleted.");
      // Never leave a deleted detail shell on screen.
      router.push("/social");
    } catch (err) {
      toast.error(describeMutationError(err, "Your post could not be deleted."));
      if (mountedRef.current) setDeletePending(false);
      return;
    }
    // No setState on the success path: this component is navigating away.
  }, [post, deletePending, router]);

  if (status === "loading" || phase === "loading") {
    return (
      <Shell>
        <div aria-busy="true" className="space-y-4">
          <div className="h-56 animate-pulse rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900" />
          <div className="h-32 animate-pulse rounded-2xl bg-gray-50 dark:bg-gray-900" />
        </div>
      </Shell>
    );
  }

  if (phase === "error" || !post) {
    return (
      <Shell>
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900/50">
          <p role="alert" className="text-sm text-gray-600 dark:text-gray-400">
            {error || "This post isn't available."}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => load()}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#131C55] hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:text-gray-300"
            >
              Try again
            </button>
            <Link
              href="/social"
              className="rounded-xl bg-[#131C55] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0E1B6B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:bg-blue-500 dark:text-gray-950"
            >
              Back to feed
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  const own = isOwnPost(user?._id, post);

  return (
    <Shell>
      <PostCard
        post={post}
        isOwnPost={own}
        onPostChange={handlePostChange}
        onEditRequest={own ? () => setEditing(true) : undefined}
        onDeleteRequest={own ? () => setConfirmDelete(true) : undefined}
        // Already on the post: the count stays metadata here rather than becoming
        // a link to the page the reader is looking at.
        linkComments={false}
      />

      <CommentList
        postId={postId}
        viewerId={user?._id}
        // Comment mutations stop while the post is being deleted — a comment
        // written into a post that is about to stop existing would only fail.
        disabled={deletePending}
        onCommentCount={handleCommentCount}
      />

      {/* The same Phase 11E sheet the feed uses, not a second edit form. */}
      {editing ? (
        <PostEditSheet
          key={String(post._id)}
          open
          onOpenChange={(next) => !next && setEditing(false)}
          post={post}
          onPostChange={handlePostChange}
        />
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={(next) => !next && setConfirmDelete(false)}
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

/** The same bounded column as the feed, so the two read identically on a phone. */
function Shell({ children }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/social"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:text-gray-400 dark:hover:text-blue-400"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Back to feed
      </Link>
      <div className="mt-5">{children}</div>
    </div>
  );
}
