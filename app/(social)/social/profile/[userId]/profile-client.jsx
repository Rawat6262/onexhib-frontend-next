"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UserX } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import ProfileHeader from "@/components/social/ProfileHeader";
import ProfileEditSheet from "@/components/social/ProfileEditSheet";
import UserList from "@/components/social/UserList";
import { getSocialProfile, getFollowers, getFollowing } from "@/models/social.model";
import { isSelfProfile, applyFollowerDelta, describeRequestError } from "@/lib/social/profile";

/**
 * A Community profile, fetched against the viewer's own session.
 *
 * TABS, NOT ROUTES. Overview / Followers / Following are local state, so moving
 * between them costs no navigation and no re-fetch of the profile. There is no
 * Posts tab: post UI belongs to 11D, and a tab that renders nothing is worse than
 * an absent one.
 *
 * REQUEST RACES. One AbortController per profile fetch, aborted when userId
 * changes or the component unmounts — so opening person A and quickly switching to
 * person B cannot let A's response paint B's page. UserList does the same for its
 * own pages.
 *
 * 404 IS AMBIGUOUS ON PURPOSE. The social backend answers 404 for "no such user",
 * "not yours" and "not visible" alike; distinguishing them in the UI would undo
 * the concealment. So every 404 renders the same neutral state.
 */
export default function ProfileClient({ userId }) {
  const { user: cachedUser, status } = useAuth();

  const [profile, setProfile] = useState(null);
  const [phase, setPhase] = useState("loading");
  const [errorMessage, setErrorMessage] = useState(null);
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(false);

  const abortRef = useRef(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase("loading");
    setErrorMessage(null);
    try {
      const { data } = await getSocialProfile(userId, { signal: controller.signal });
      setProfile(data?.profile ?? null);
      setPhase(data?.profile ? "ready" : "missing");
    } catch (error) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
      if (error?.response?.status === 404) {
        setPhase("missing");
        return;
      }
      setErrorMessage(describeRequestError(error, "This profile could not be loaded."));
      setPhase("error");
    }
  }, [userId]);

  useEffect(() => {
    // Wait for the cached session to resolve: acting while status is "loading"
    // would decide isSelf from a null user and briefly show a Follow button on
    // your own profile.
    if (status === "loading") return undefined;
    setTab("overview");
    load();
    return () => abortRef.current?.abort();
  }, [load, status]);

  /**
   * Follow state and the follower count move together, so the flag and the number
   * can never disagree — including on rollback, where the button hands back the
   * inverse delta.
   */
  const handleFollowChange = useCallback(({ following, followerDelta }) => {
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            following,
            followerCount: applyFollowerDelta(prev.followerCount, followerDelta),
          }
        : prev
    );
  }, []);

  if (status === "loading" || phase === "loading") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12" aria-busy="true">
        <div className="h-52 animate-pulse rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900" />
      </div>
    );
  }

  if (phase === "missing") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900/50">
          <UserX size={22} aria-hidden="true" className="mx-auto text-gray-400" />
          <h1 className="mt-3 text-base font-semibold text-gray-900 dark:text-gray-50">
            User not found.
          </h1>
          {/* Nothing more: the backend uses one 404 for missing, not-yours and
              not-visible, and explaining which would defeat that. */}
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-900/50">
          <p className="text-sm text-gray-600 dark:text-gray-400">{errorMessage}</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#131C55] hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:text-gray-300"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const self = isSelfProfile(cachedUser?._id, profile.user?._id);
  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "followers", label: "Followers" },
    { key: "following", label: "Following" },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <ProfileHeader
        profile={profile}
        isSelf={self}
        onFollowChange={handleFollowChange}
        onEdit={() => setEditing(true)}
      />

      {/* Real buttons in a tablist, so the tabs are keyboard reachable and their
          selected state is announced. */}
      <div role="tablist" aria-label="Profile sections" className="mt-6 flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`social-tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`social-panel-${t.key}`}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition motion-reduce:transition-none ${
              tab === t.key
                ? "border-[#131C55] text-[#131C55] dark:border-blue-300 dark:text-blue-300"
                : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        id={`social-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`social-tab-${tab}`}
        className="mt-5"
      >
        {tab === "overview" ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {self
              ? "Your posts will appear here once posting is available."
              : "Posts will appear here once posting is available."}
          </p>
        ) : null}

        {tab === "followers" ? (
          <UserList
            key={`followers-${userId}`}
            userId={userId}
            fetchPage={getFollowers}
            emptyMessage="No followers yet."
          />
        ) : null}

        {tab === "following" ? (
          <UserList
            key={`following-${userId}`}
            userId={userId}
            fetchPage={getFollowing}
            emptyMessage="Not following anyone yet."
          />
        ) : null}
      </div>

      {/* Mounted only while open, so the form always starts from the current
          profile rather than from stale state left by a previous edit. */}
      {self && editing ? (
        <ProfileEditSheet
          open={editing}
          onOpenChange={setEditing}
          profile={profile}
          onSaved={(next) => setProfile(next)}
        />
      ) : null}
    </div>
  );
}
