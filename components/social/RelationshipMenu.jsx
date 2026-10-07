"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Ban, BellOff, Bell, Flag } from "lucide-react";

import ConfirmDialog from "@/components/social/ConfirmDialog";
import ReportDialog from "@/components/social/ReportDialog";
import { blockUser, muteUser, unmuteUser } from "@/models/social.model";
import {
  planBlock,
  planMute,
  confirmedFlag,
  canActOn,
  describeRelationshipError,
} from "@/lib/social/relationship";

/**
 * Block, Mute and Report for somebody who is NOT the viewer.
 *
 * ONE MENU, THREE SURFACES — a profile, a post's author, a comment's author. The actions
 * are identical in all three because they act on a USER; only Report changes target, and
 * that arrives as a `submitReport` function the caller supplies already bound to its own
 * route. This component never holds a "kind" variable, so it cannot report a post through
 * the user route.
 *
 * SELF IS NEVER OFFERED. canActOn hides the whole menu when the target is the viewer. The
 * backend refuses a self-block and a self-mute anyway; hiding it is the courtesy, the
 * server is the enforcement.
 *
 * ASYMMETRIC CONFIRMATION, DELIBERATELY. Block confirms; mute does not. A block severs
 * follow edges both ways, conceals the profile, and cannot be undone from the profile
 * afterwards — the viewer has to go to Privacy → Blocked users. A mute changes only what
 * the viewer sees and is undone by tapping again. Confirming both would teach people to
 * dismiss the dialog that matters.
 *
 * NOTHING OPTIMISTIC. Every state change waits for the server's own boolean. Showing a
 * user as blocked while the request failed would have the viewer believe a privacy
 * boundary exists when it does not, which is worse than waiting.
 *
 * MUTE IS NOT BLOCK, and the copy says so: a muted person's profile, posts and comments
 * all stay reachable. This menu never claims content is hidden.
 */
export default function RelationshipMenu({
  viewerId,
  targetId,
  targetName,
  muted = false,
  /*
   * MUTE IS OFFERED ONLY WHERE ITS STATE IS KNOWN, which is the profile - `viewerMuted`
   * arrives on GET /api/social/profile/:userId and nowhere else. A post or a comment
   * carries no mute flag, so a Mute item there would have to guess, and a toggle whose
   * label is a guess is worse than no toggle: it would read "Mute" for somebody already
   * muted and make the viewer think it had not worked.
   *
   * There is deliberately no endpoint to ask with. "Who muted me" is the fact mute
   * exists to withhold, so the model carries no reverse index and there is no
   * mute-status GET to call per row - and asking per row would be an N+1 besides.
   */
  showMute = true,
  submitReport,
  onBlocked,
  onMuteChange,
  onNotice,
  label = "More options",
}) {
  const [open, setOpen] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(null);     // "block" | "mute" | null
  const [error, setError] = useState(null);
  const rootRef = useRef(null);

  // Escape and click-outside, matching PostCard's OwnerMenu so the two menus behave
  // identically wherever they sit next to each other.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onClick = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  if (!canActOn(viewerId, targetId)) return null;

  const who = targetName || "this user";

  async function doBlock() {
    if (busy) return;                      // a second click must not issue a second call
    setBusy("block");
    setError(null);
    try {
      const { data } = await blockUser(targetId);
      const flag = confirmedFlag(data, "blocked");
      setBusy(null);
      setConfirmBlock(false);
      setOpen(false);
      /*
       * The server is authoritative from here. No client-side list of blocked people is
       * kept: the profile will 404 on the next read, and the only reliable way back is
       * Privacy → Blocked users. The caller decides what to do with the surface it owns -
       * a profile navigates away, a feed refetches.
       */
      if (flag === true && onBlocked) onBlocked(targetId);
      if (onNotice) {
        onNotice(
          `You blocked ${who}. You can undo this in Privacy → Blocked users.`
        );
      }
    } catch (err) {
      setBusy(null);
      // Neutral copy. A 404 here means "blocked pair or no such account" and the UI must
      // not try to tell those apart - that is the oracle the backend closes.
      setError(describeRelationshipError(err, "Could not block this user."));
    }
  }

  async function doMute() {
    if (busy) return;
    const plan = planMute(muted);
    setBusy("mute");
    setError(null);
    try {
      const { data } = plan.action === "mute"
        ? await muteUser(targetId)
        : await unmuteUser(targetId);
      const flag = confirmedFlag(data, "muted");
      setBusy(null);
      setOpen(false);
      // The server's boolean, not the one we hoped for. null means it did not say, so the
      // caller refetches rather than guessing.
      if (onMuteChange) onMuteChange(flag);
      if (onNotice) {
        onNotice(
          flag === true
            ? `${who} is muted. You will not see them in your feed or notifications — their profile and posts are still available.`
            : `${who} is no longer muted.`
        );
      }
    } catch (err) {
      setBusy(null);
      setError(describeRelationshipError(err, "Could not update mute."));
    }
  }

  const mutePlan = planMute(muted);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={Boolean(busy)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900"
        >
          {showMute ? (
          <button
            type="button"
            role="menuitem"
            disabled={busy === "mute"}
            onClick={doMute}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 motion-reduce:transition-none dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {muted ? (
              <Bell size={15} aria-hidden="true" className="text-gray-400" />
            ) : (
              <BellOff size={15} aria-hidden="true" className="text-gray-400" />
            )}
            {busy === "mute"
              ? "Working…"
              : mutePlan.action === "mute" ? "Mute" : "Unmute"}
          </button>
          ) : null}

          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); setReportOpen(true); }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50 motion-reduce:transition-none dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <Flag size={15} aria-hidden="true" className="text-gray-400" />
            Report
          </button>

          <button
            type="button"
            role="menuitem"
            disabled={busy === "block"}
            onClick={() => { setOpen(false); setConfirmBlock(true); }}
            className="flex w-full items-center gap-2.5 border-t border-gray-100 px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 motion-reduce:transition-none dark:border-gray-800 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <Ban size={15} aria-hidden="true" />
            Block
          </button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="absolute right-0 top-full z-50 mt-1 w-64 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs text-red-600 shadow-lg dark:border-red-900 dark:bg-gray-900 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {/*
        Block is consequential, so it confirms - and the description says where the undo
        lives, because after this the profile is concealed and the menu is unreachable.
      */}
      <ConfirmDialog
        open={confirmBlock}
        onOpenChange={setConfirmBlock}
        title={`Block ${who}?`}
        description={
          "They will not be able to see your profile or posts, and you will not see theirs. "
          + "Anyone you both follow is unaffected. You can undo this from Privacy → Blocked users."
        }
        confirmLabel="Block"
        pendingLabel="Blocking…"
        pending={busy === "block"}
        onConfirm={doBlock}
      />

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetLabel={who}
        submit={submitReport}
        onDone={onNotice}
      />
    </div>
  );
}
