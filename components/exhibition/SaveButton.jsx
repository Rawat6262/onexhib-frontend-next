"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { fetchSaved, saveExhibition, unsaveExhibition } from "@/lib/saved-exhibitions";
import { trackSaveToggled } from "@/lib/analytics";

/**
 * Save / unsave one exhibition.
 *
 * WHY IT READS THE WHOLE SAVED LIST TO KNOW ITS OWN STATE
 * The API offers no "is this saved?" endpoint, and unsave needs the SAVE
 * RECORD's id, which only the list returns. So the list is fetched once per
 * signed-in mount and the entry for this exhibition is picked out of it. That
 * is one request, cached by nothing — acceptable because the list is small (a
 * personal collection) and it is the only way to get the id that unsave needs.
 *
 * OPTIMISM IS DELIBERATELY LIMITED
 * The label flips immediately so the click feels instant, but a failure rolls
 * it back and says so. Save is not idempotent server-side — it appends — so
 * pretending success and silently diverging from the server would leave a user
 * with duplicates they cannot see.
 *
 * Guests get the button, not a hidden feature: clicking sends them to /login
 * with a return path, which is friendlier than an invisible control.
 */
export default function SaveButton({ exhibitionId, exhibitionName, className = "" }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const [savedId, setSavedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(true);

  const userId = user?._id || user?.id || null;
  const signedIn = status === "authed" && Boolean(userId);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setReady(status !== "loading");
      return;
    }
    let cancelled = false;
    (async () => {
      const { items } = await fetchSaved(userId);
      if (cancelled || !mounted.current) return;
      const match = items.find((i) => i.id === exhibitionId);
      setSavedId(match ? match.savedId : null);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, userId, exhibitionId, status]);

  async function onClick() {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (busy) return;

    setBusy(true);
    setError("");
    const wasSaved = Boolean(savedId);
    const previous = savedId;

    // Optimistic flip, rolled back below if the server disagrees.
    setSavedId(wasSaved ? null : "pending");

    const result = wasSaved
      ? await unsaveExhibition(userId, previous)
      : await saveExhibition(userId, exhibitionId);

    if (!mounted.current) return;

    if (!result.ok) {
      setSavedId(previous);
      setError(result.reason === "signed-out" ? "Please sign in again." : "That did not save. Try again.");
      setBusy(false);
      return;
    }

    trackSaveToggled(!wasSaved);

    // Re-read to pick up the new SAVE record id, which the save response does
    // not return and unsave will need.
    const { items } = await fetchSaved(userId);
    if (!mounted.current) return;
    const match = items.find((i) => i.id === exhibitionId);
    setSavedId(match ? match.savedId : null);
    setBusy(false);
  }

  const isSaved = Boolean(savedId);
  const label = isSaved ? "Saved" : "Save";
  const Icon = isSaved ? BookmarkCheck : Bookmark;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onClick}
        disabled={busy || (signedIn && !ready)}
        aria-pressed={signedIn ? isSaved : undefined}
        aria-label={
          signedIn
            ? `${isSaved ? "Remove" : "Save"} ${exhibitionName || "this exhibition"}${isSaved ? " from" : " to"} your saved list`
            : "Sign in to save this exhibition"
        }
        className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] disabled:cursor-not-allowed disabled:opacity-60 ${
          isSaved
            ? "border-[#131C55] bg-[#131C55] text-white hover:bg-[#0E1B6B]"
            : "border-gray-300 bg-white text-gray-700 hover:border-[#131C55] hover:text-[#131C55] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-300 dark:hover:text-blue-300"
        }`}
      >
        <Icon size={16} aria-hidden="true" />
        {busy ? "…" : label}
      </button>
      {error ? (
        <p role="status" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
