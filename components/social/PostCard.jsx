"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ThumbsUp, ThumbsDown, MessageSquare, Globe, Users } from "lucide-react";

import InitialsAvatar from "@/components/social/InitialsAvatar";
import PostMedia from "@/components/social/PostMedia";
import { setPostReaction, clearPostReaction } from "@/models/social.model";
import { displayName, roleLine } from "@/lib/social/profile";
import {
  visibilityLabel,
  postTimestamp,
  displayCount,
  planPostReaction,
  applyReactionResult,
  revertReaction,
  describePostError,
} from "@/lib/social/post";

/**
 * One post. Reusable by the feed now, and by profile posts and post detail later.
 *
 * STATE OWNERSHIP: THE PARENT OWNS THE POST, THIS CARD OWNS ONLY `pending`.
 * Every change is emitted upward through onPostChange as a whole post object, so
 * there is exactly one canonical copy per post. The alternative — a local copy of
 * viewerReaction and the counts — means two sources of truth for the same post,
 * and the same post can appear in a feed and on a profile at once. They would
 * drift the moment one of them reacted.
 *
 * NO FETCHING OF ANY KIND except the reaction mutation. The author, the tagged
 * users and viewerReaction all arrive with the post: the feed endpoint batches
 * identities into one query and attaches the viewer's reaction itself. A card that
 * fetched its own author, or its own reaction state, would turn one feed request
 * into forty-one.
 */
export default function PostCard({ post, isOwnPost = false, onPostChange }) {
  const [pending, setPending] = useState(false);

  // A card can be unmounted mid-mutation — the feed is replaced by a refresh, or
  // the reader navigates away. Writing state afterwards is a React warning and a
  // pointless update.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const author = post.author;
  const authorId = author && author._id ? String(author._id) : null;
  const name = author ? displayName(author) : "Unavailable account";
  const role = author ? roleLine(author) : null;
  const when = postTimestamp(post.createdAt);
  const visibility = visibilityLabel(post.visibility);
  const tagged = Array.isArray(post.taggedUsers) ? post.taggedUsers : [];

  const handleReaction = async (clicked) => {
    // Both controls are disabled while pending, so a like→dislike race before the
    // first request resolves cannot happen, and no queue is needed.
    if (pending) return;

    const planned = planPostReaction(post, clicked);
    if (!planned) return; // not actionable — send nothing rather than guess

    setPending(true);
    onPostChange(planned.optimistic);

    try {
      const { data } =
        planned.plan.action === "post"
          ? await setPostReaction(post._id, planned.plan.reaction)
          : await clearPostReaction(post._id);

      if (!mounted.current) return;
      // Authoritative: the endpoint re-reads the post's counters, so these
      // numbers replace the guess outright rather than being merged with it.
      onPostChange(applyReactionResult(planned.optimistic, data && data.reaction));
    } catch (error) {
      if (!mounted.current) return;
      // Restore the captured snapshot exactly — never a re-derived guess.
      onPostChange(revertReaction(planned.optimistic, planned.snapshot));
      toast.error(describePostError(error, "Could not save your reaction."));
    } finally {
      if (mounted.current) setPending(false);
    }
  };

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-900">
      <header className="flex items-start gap-3">
        <InitialsAvatar name={name} src={(author && author.avatarUrl) || null} size="sm" />

        <div className="min-w-0 flex-1">
          {/* A deleted author renders as neutral text, not a link to nowhere, and
              never as a raw id. The post itself still shows — it is real content. */}
          {authorId ? (
            <Link
              href={`/social/profile/${encodeURIComponent(authorId)}`}
              className="block truncate text-sm font-semibold text-gray-900 hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:text-gray-50 dark:hover:text-blue-300"
            >
              {name}
            </Link>
          ) : (
            <span className="block truncate text-sm font-semibold text-gray-500 dark:text-gray-400">
              {name}
            </span>
          )}

          {role ? (
            <span className="block truncate text-xs text-gray-600 dark:text-gray-400">{role}</span>
          ) : null}

          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 dark:text-gray-500">
            {when ? (
              <time dateTime={when.iso || undefined}>{when.text}</time>
            ) : null}
            {when && visibility ? <span aria-hidden="true">·</span> : null}
            {visibility ? (
              <span className="inline-flex items-center gap-1">
                {post.visibility === "PUBLIC" ? (
                  <Globe size={12} aria-hidden="true" />
                ) : (
                  <Users size={12} aria-hidden="true" />
                )}
                {visibility}
              </span>
            ) : null}
            {isOwnPost ? (
              // A label, not a menu. Edit and Delete belong to 11E; rendering a
              // menu whose items do nothing is worse than rendering none.
              <>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-gray-600 dark:text-gray-400">Your post</span>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {post.title ? (
        <h2 className="mt-3 text-base font-semibold text-gray-900 dark:text-gray-50">{post.title}</h2>
      ) : null}

      {/* Plain React text. whitespace-pre-line keeps the author's line breaks.
          No dangerouslySetInnerHTML, no markdown, no HTML parsing. */}
      {post.description ? (
        <p className="mt-2 whitespace-pre-line break-words text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
          {post.description}
        </p>
      ) : null}

      <PostMedia media={post.media} />

      {tagged.length ? (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <span className="font-medium">With</span>
          {tagged.map((u) => (
            <Link
              key={String(u._id)}
              href={`/social/profile/${encodeURIComponent(String(u._id))}`}
              className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700 hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:bg-gray-800 dark:text-gray-200"
            >
              {displayName(u)}
            </Link>
          ))}
          {/* No "they were notified": tag notifications deliberately do not exist
              until Phase 12 brings mute and block with them. */}
        </p>
      ) : null}

      <footer className="mt-4 flex items-center gap-1 border-t border-gray-100 pt-3 dark:border-gray-800">
        <ReactionButton
          kind="like"
          active={post.viewerReaction === "like"}
          count={post.likeCount}
          pending={pending}
          onClick={() => handleReaction("like")}
        />
        <ReactionButton
          kind="dislike"
          active={post.viewerReaction === "dislike"}
          count={post.dislikeCount}
          pending={pending}
          onClick={() => handleReaction("dislike")}
        />

        {/* METADATA, NOT A CONTROL. There is no post-detail route until 11F, so a
            button here would either do nothing or navigate to a 404. */}
        <span className="ml-auto inline-flex items-center gap-1.5 px-2 text-sm text-gray-600 dark:text-gray-400">
          <MessageSquare size={16} aria-hidden="true" />
          {displayCount(post.commentCount)}
          <span className="sr-only">
            {displayCount(post.commentCount) === 1 ? "comment" : "comments"}
          </span>
        </span>
      </footer>
    </article>
  );
}

/**
 * One reaction control.
 *
 * aria-pressed carries the toggle state rather than changing the label, which is
 * what a screen reader expects from a two-state button. Both controls disable
 * together while a mutation is in flight — that is what serialises reactions
 * without a queue.
 */
function ReactionButton({ kind, active, count, pending, onClick }) {
  const Icon = kind === "like" ? ThumbsUp : ThumbsDown;
  const label = kind === "like" ? "Like" : "Dislike";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={active}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none ${
        active
          ? "bg-[#131C55]/10 text-[#131C55] dark:bg-blue-400/15 dark:text-blue-300"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
      }`}
    >
      <Icon size={16} aria-hidden="true" />
      {displayCount(count)}
    </button>
  );
}
