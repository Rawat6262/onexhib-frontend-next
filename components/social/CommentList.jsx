"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";

import CommentRow from "@/components/social/CommentRow";
import CommentComposer from "@/components/social/CommentComposer";
import ConfirmDialog from "@/components/social/ConfirmDialog";
import { getComments, createComment, updateComment, deleteComment } from "@/models/social.model";
import { emptyList, mergePage, canLoadMore, prependItem, replaceItem, removeItem } from "@/lib/social/cursor-list";
import {
  COMMENT_PAGE_SIZE,
  buildCreateCommentPayload,
  buildEditCommentPayload,
  isOwnComment,
  isCanceled,
  describeCommentError,
  describePostDetailError,
} from "@/lib/social/comment";

/**
 * The comments on one post.
 *
 * THIS OWNS THE LIST AND EVERY REQUEST. Rows and the composer are presentational;
 * they import no model and cannot fetch. So there is exactly one place a comment
 * request can come from, and one canonical copy of each comment.
 *
 * SERVER ORDER IS PRESERVED, NEVER RE-SORTED. listComments sorts
 * { createdAt: -1, _id: -1 } and pages over that same keyset, so the order the
 * server sends IS the pagination order — re-sorting or reversing it here would put
 * page two in the wrong place relative to page one. This is a comment list, not a
 * chat transcript, so newest-first is also what it should look like.
 *
 * hasMore + nextCursor IS THE ONLY CONTINUATION SIGNAL. A page can hold fewer than
 * COMMENT_PAGE_SIZE rows and still have more behind it, so `items.length` must
 * never decide whether the button appears.
 *
 * THE COUNT COMES FROM THE SERVER OR NOT AT ALL. createComment and deleteComment
 * each return the post's freshly read `commentCount`, which is handed straight up
 * through onCommentCount. Nothing here decrements, so there is no double decrement
 * to avoid, and the count is never `items.length` — that is one page of twenty.
 */
export default function CommentList({
  postId,
  viewerId,
  disabled = false,
  onCommentCount,
  /*
   * A confirmed block on a comment author. The thread is reloaded rather than
   * filtered locally: the server now hides that author's comments, and a reload is
   * the only thing that gets the whole paged thread right. The owner of the page may
   * override this - the post detail page navigates away instead.
   */
  onAuthorBlocked,
}) {
  const [list, setList] = useState(emptyList);
  const [phase, setPhase] = useState("loading");
  const [initialError, setInitialError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);

  const [creating, setCreating] = useState(false);

  // ONE pending mutation at a time, identified by comment id. That is the whole
  // race story: a row whose id is pending has both its controls disabled, and a
  // row being edited renders no Delete button at all, so edit and delete cannot
  // run together on the same comment. No global queue is needed for that.
  const [editingId, setEditingId] = useState(null);
  const [pendingId, setPendingId] = useState(null);
  const [rowError, setRowError] = useState(null); // { id, message }
  const [deleting, setDeleting] = useState(null);

  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(
    async (cursor) => {
      // One in-flight list request at a time. A replacement cancels the previous
      // one, so a slow page for post A cannot land in post B's list.
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
        const { data } = await getComments(postId, {
          limit: COMMENT_PAGE_SIZE,
          cursor: cursor || undefined,
          signal: controller.signal,
        });
        const page = {
          items: Array.isArray(data?.comments) ? data.comments : [],
          nextCursor: data?.nextCursor ?? null,
          hasMore: Boolean(data?.hasMore),
        };
        setList((prev) => mergePage(prev, page, first ? "replace" : "append"));
        setPhase("ready");
      } catch (error) {
        // An abort is this component cancelling itself, not something to report.
        if (isCanceled(error)) return;
        if (first) {
          // A post-level failure, because listComments runs the same visibility
          // check the post endpoint does and answers with the post's 404.
          setInitialError(describePostDetailError(error, "Comments could not be loaded."));
          setPhase("error");
        } else {
          // A failed page two must NOT wipe the comments already on screen.
          setLoadMoreError(describeCommentError(error, "Could not load more comments."));
        }
      } finally {
        if (mountedRef.current) setLoadingMore(false);
      }
    },
    [postId]
  );

  useEffect(() => {
    // A different post is a different list: the old requests are abandoned and the
    // state is reset before the new authoritative page arrives, so page one of B
    // can never append to A.
    setList(emptyList());
    setEditingId(null);
    setPendingId(null);
    setRowError(null);
    setDeleting(null);
    load(null);
    return () => abortRef.current?.abort();
  }, [load]);

  /** The new comment goes to the top, because the server list is newest-first. */
  const handleCreate = useCallback(
    async (draft) => {
      if (creating || disabled) return false;

      setCreating(true);
      try {
        const { data } = await createComment(postId, buildCreateCommentPayload(draft));
        if (!mountedRef.current) return false;

        if (data && data.comment) {
          // prependItem dedupes by _id, so a double submit that slipped past the
          // guard cannot show the same comment twice, and it leaves the cursor
          // alone — it says nothing about the server's remaining rows.
          setList((prev) => prependItem(prev, data.comment));
        }
        // The authoritative count from the create response, straight through.
        onCommentCount?.(data && data.commentCount);
        return true;
      } catch (error) {
        toast.error(describeCommentError(error, "Your comment could not be posted."));
        return false; // keeps the composer's draft
      } finally {
        if (mountedRef.current) setCreating(false);
      }
    },
    [creating, disabled, postId, onCommentCount]
  );

  const handleEditSubmit = useCallback(
    async (comment, draft) => {
      if (pendingId || disabled) return;

      setPendingId(String(comment._id));
      setRowError(null);
      try {
        const { data } = await updateComment(comment._id, buildEditCommentPayload(draft));
        if (!mountedRef.current) return;

        if (data && data.comment) setList((prev) => replaceItem(prev, comment._id, data.comment));
        // No count change: updateComment does not touch the post, and returns no
        // commentCount, because editing a comment does not change how many exist.
        setEditingId(null);
      } catch (error) {
        // The sheet stays open with the edited text intact.
        setRowError({ id: String(comment._id), message: describeCommentError(error, "Your comment could not be saved.") });
      } finally {
        if (mountedRef.current) setPendingId(null);
      }
    },
    [pendingId, disabled]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleting || pendingId || disabled) return;

    const id = String(deleting._id);
    setPendingId(id);
    setRowError(null);
    try {
      const { data } = await deleteComment(deleting._id);
      if (!mountedRef.current) return;

      // Removed only AFTER the server confirms: an optimistic removal would have to
      // re-insert the row at its position in the server's ordering on failure.
      setList((prev) => removeItem(prev, deleting._id));
      // The authoritative count. Nothing was decremented locally, so this cannot
      // be a second decrement on top of a first.
      onCommentCount?.(data && data.commentCount);
      setDeleting(null);
      toast.success("Comment deleted.");
    } catch (error) {
      setRowError({ id, message: describeCommentError(error, "Your comment could not be deleted.") });
      setDeleting(null);
    } finally {
      if (mountedRef.current) setPendingId(null);
    }
  }, [deleting, pendingId, disabled, onCommentCount]);

  return (
    <section aria-labelledby="comments-heading" className="mt-6">
      <h2 id="comments-heading" className="text-base font-semibold text-gray-900 dark:text-gray-50">
        Comments
      </h2>

      {/* Disabled while the post itself is being deleted: a comment written into a
          post that is about to stop existing would fail, and the failure would be
          the user's only clue that anything happened. */}
      <CommentComposer onSubmit={handleCreate} pending={creating} disabled={disabled} />

      <div className="mt-4 border-t border-gray-100 dark:border-gray-800">
        {phase === "loading" ? (
          <div aria-busy="true" className="space-y-3 py-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-50 dark:bg-gray-900" />
            ))}
          </div>
        ) : null}

        {phase === "error" ? (
          <div className="py-6 text-center">
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
          <div className="py-8 text-center">
            <MessageSquare size={20} aria-hidden="true" className="mx-auto text-gray-400" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              No comments yet. Be the first to say something.
            </p>
          </div>
        ) : null}

        {list.items.length ? (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {list.items.map((comment) => {
              const id = String(comment._id);
              return (
                <CommentRow
                  key={id}
                  comment={comment}
                  isOwn={isOwnComment(viewerId, comment)}
                  viewerId={viewerId}
                  onAuthorBlocked={onAuthorBlocked || (() => load(null))}
                  disabled={disabled || (Boolean(pendingId) && pendingId !== id)}
                  editing={editingId === id}
                  pending={pendingId === id}
                  error={rowError && rowError.id === id ? rowError.message : null}
                  onEditStart={(c) => {
                    setRowError(null);
                    setEditingId(String(c._id));
                  }}
                  onEditCancel={() => {
                    setRowError(null);
                    setEditingId(null);
                  }}
                  onEditSubmit={handleEditSubmit}
                  onDeleteRequest={setDeleting}
                />
              );
            })}
          </ul>
        ) : null}

        {loadMoreError ? (
          <p role="alert" className="mt-3 text-center text-sm text-red-600 dark:text-red-400">
            {loadMoreError}
          </p>
        ) : null}

        {/* An explicit button, never infinite scroll: a page of comments should not
            load because the reader's thumb moved. canLoadMore reads hasMore and
            nextCursor only. */}
        {canLoadMore(list, loadingMore) || loadingMore ? (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => load(list.nextCursor)}
              disabled={loadingMore}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#131C55] hover:text-[#131C55] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:text-gray-300"
            >
              {loadingMore ? "Loading…" : "Load more comments"}
            </button>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(next) => !next && setDeleting(null)}
        title="Delete this comment?"
        description="This removes your comment from the post. This cannot be undone."
        confirmLabel="Delete comment"
        pendingLabel="Deleting…"
        pending={Boolean(deleting) && pendingId === String(deleting._id)}
        onConfirm={handleConfirmDelete}
      />
    </section>
  );
}
