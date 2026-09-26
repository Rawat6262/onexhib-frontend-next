"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, UserCheck } from "lucide-react";

import { followUser, unfollowUser } from "@/models/social.model";
import { planFollow, describeRequestError } from "@/lib/social/profile";

/**
 * Follow / Following for another user's profile.
 *
 * NEVER RENDERED ON YOUR OWN PROFILE. The parent suppresses it by comparing the
 * cached auth id with the profile's id — the backend also rejects a self-follow
 * with 400 and the schema forbids the edge, but a button that can only ever fail
 * should not be on screen.
 *
 * NO FOLLOW-STATUS REQUEST. The initial state comes from `profile.following`,
 * which GET /api/social/profile already computes. Calling
 * /api/social/follow-status/:userId here would be a second round trip for a value
 * the page already has.
 *
 * OPTIMISTIC, WITH AN HONEST LIMIT. Both responses carry an authoritative
 * `following`, so that is adopted on success. Neither returns a follower count, so
 * the count stays the optimistic guess until the profile is next fetched — which
 * is why the delta is clamped at zero rather than trusted.
 *
 * `pending` disables the button, so a rapid double-click cannot send two
 * mutations. That matters more here than elsewhere: socialFollowMutation allows 30
 * a minute, and follow/unfollow churn is the cheapest way to burn it.
 */
export default function FollowButton({ userId, following, onChange }) {
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    if (pending) return;

    const plan = planFollow(following);
    setPending(true);

    // Optimistic: the parent owns both the flag and the count.
    onChange({ following: plan.nextFollowing, followerDelta: plan.followerDelta });

    try {
      const { data } =
        plan.action === "follow" ? await followUser(userId) : await unfollowUser(userId);

      // Adopt the server's answer. It agrees with the guess in the normal case,
      // and corrects it when the edge already existed (alreadyFollowing) or was
      // already gone (alreadyUnfollowed).
      if (data && typeof data.following === "boolean" && data.following !== plan.nextFollowing) {
        onChange({ following: data.following, followerDelta: -plan.followerDelta });
      }
    } catch (error) {
      // Roll both halves back together, so the flag and the count cannot disagree.
      onChange({ following: following, followerDelta: -plan.followerDelta });
      toast.error(
        describeRequestError(
          error,
          plan.action === "follow" ? "Could not follow this user." : "Could not unfollow this user."
        )
      );
    } finally {
      setPending(false);
    }
  };

  const label = following ? "Following" : "Follow";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      // aria-pressed, not a changed accessible name: the control is a toggle, and
      // its pressed state is what actually changed.
      aria-pressed={following}
      aria-label={following ? "Unfollow this user" : "Follow this user"}
      className={
        following
          ? "inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#131C55] hover:text-[#131C55] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:text-gray-200"
          : "inline-flex items-center gap-2 rounded-xl bg-[#131C55] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0E1B6B] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:bg-blue-500 dark:text-gray-950 dark:hover:bg-blue-400"
      }
    >
      {following ? (
        <UserCheck size={16} aria-hidden="true" />
      ) : (
        <UserPlus size={16} aria-hidden="true" />
      )}
      {pending ? "Working…" : label}
    </button>
  );
}
