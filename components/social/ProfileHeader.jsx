"use client";

import { useEffect, useRef, useState } from "react";
import { Briefcase, Camera, Globe, ImagePlus, Loader2, MapPin, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import InitialsAvatar from "@/components/social/InitialsAvatar";
import FollowButton from "@/components/social/FollowButton";
import { safeExternalUrl } from "@/lib/safe-url";
import { displayName, roleLine, locationLine, displayCount } from "@/lib/social/profile";
import {
  uploadProfileAvatar,
  removeProfileAvatar,
  uploadProfileCover,
  removeProfileCover,
} from "@/models/social.model";

/**
 * The profile header, laid out like a professional network's: a wide cover
 * banner, the photo overlapping its lower edge, then name, headline, role,
 * place and website, the counts, and an About card.
 *
 * PHOTO AND COVER are uploaded from here, by the owner only. Each change goes to
 * its own endpoint (PUT/DELETE /api/social/profile/{avatar|cover}), the server
 * crops and resizes it, and answers with the whole profile, which is handed up
 * through onProfileChange - the page keeps one profile object, never a patched
 * copy. Files are checked here first (type and size, matching the backend's
 * 8 MB, JPG/PNG/WebP allow-list) so a wrong file fails instantly, but the server
 * re-checks everything.
 *
 * No profile photo or cover shows a branded gradient / initials rather than an
 * empty box, so a new account still looks finished.
 */

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 8 * 1024 * 1024;

const ACTIONS = {
  avatar: { upload: uploadProfileAvatar, remove: removeProfileAvatar, noun: "profile photo" },
  cover: { upload: uploadProfileCover, remove: removeProfileCover, noun: "cover image" },
};

export default function ProfileHeader({ profile, isSelf, onFollowChange, onEdit, onProfileChange, actions }) {
  const user = profile.user || {};
  const name = displayName(user);
  const role = roleLine(user);
  const place = locationLine(user);

  // Validated, never rendered raw. A stored "javascript:..." would otherwise
  // become a link that runs script in this origin — see lib/safe-url.js.
  const website = safeExternalUrl(user.website);

  const [busy, setBusy] = useState(null); // "avatar" | "cover" | null
  const avatarInput = useRef(null);
  const coverInput = useRef(null);

  const counts = [
    { label: "Posts", value: displayCount(profile.postCount) },
    { label: "Followers", value: displayCount(profile.followerCount) },
    { label: "Following", value: displayCount(profile.followingCount) },
  ];

  const change = async (kind, file) => {
    const action = ACTIONS[kind];
    if (file) {
      if (!ACCEPT.split(",").includes(file.type)) {
        toast.error("Please choose a JPG, PNG or WebP image.");
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error("That image is too large. The limit is 8 MB.");
        return;
      }
    }
    setBusy(kind);
    try {
      let response;
      if (file) {
        const data = new FormData();
        data.append("image", file);
        response = await action.upload(data);
      } else {
        response = await action.remove();
      }
      if (response?.data?.profile) onProfileChange?.(response.data.profile);
      toast.success(file ? `Your ${action.noun} was updated.` : `Your ${action.noun} was removed.`);
    } catch (err) {
      toast.error(err?.response?.data?.message || `Your ${action.noun} could not be updated.`);
    } finally {
      setBusy(null);
    }
  };

  const pick = (kind) => (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // the same file can be chosen again after a failure
    if (file) change(kind, file);
  };

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {/* ── Cover ───────────────────────────────────────────────────── */}
        <div className="relative h-36 sm:h-48">
          {profile.coverUrl ? (
            <img src={profile.coverUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-gradient-to-br from-[#0B1240] via-[#1B2A7A] to-[#4B2E9E]">
              <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-blue-400/30 blur-3xl" />
              <div className="absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-violet-500/30 blur-3xl" />
              <div
                className="absolute inset-0 text-white opacity-[0.08]"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }}
              />
            </div>
          )}

          {busy === "cover" ? <Uploading /> : null}

          {isSelf ? (
            <div className="absolute top-3 right-3 flex gap-2">
              {profile.coverUrl ? (
                <IconButton label="Remove cover image" onClick={() => change("cover", null)} disabled={Boolean(busy)}>
                  <Trash2 size={16} />
                </IconButton>
              ) : null}
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                disabled={Boolean(busy)}
                className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60 motion-reduce:transition-none"
              >
                <ImagePlus size={15} aria-hidden="true" />
                {profile.coverUrl ? "Change cover" : "Add cover image"}
              </button>
              <input ref={coverInput} type="file" accept={ACCEPT} onChange={pick("cover")} className="sr-only" tabIndex={-1} aria-hidden="true" />
            </div>
          ) : null}
        </div>

        <div className="px-5 pb-5 sm:px-7 sm:pb-6">
          {/* ── Photo + actions ──────────────────────────────────────── */}
          <div className="flex items-end justify-between gap-3">
            <div className="relative -mt-14 sm:-mt-20">
              <span className="relative block rounded-full bg-white p-1 shadow-lg dark:bg-gray-900">
                <InitialsAvatar name={name} src={profile.avatarUrl || null} size="xl" />
                {busy === "avatar" ? (
                  <span className="absolute inset-1 grid place-items-center rounded-full bg-black/50 text-white">
                    <Loader2 size={24} aria-hidden="true" className="animate-spin" />
                  </span>
                ) : null}
              </span>
              {isSelf ? (
                <AvatarMenu
                  hasPhoto={Boolean(profile.avatarUrl)}
                  disabled={Boolean(busy)}
                  onUpload={() => avatarInput.current?.click()}
                  onRemove={() => change("avatar", null)}
                />
              ) : null}
              {isSelf ? (
                <input ref={avatarInput} type="file" accept={ACCEPT} onChange={pick("avatar")} className="sr-only" tabIndex={-1} aria-hidden="true" />
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2 pt-3">
              {isSelf ? (
                <button
                  type="button"
                  onClick={onEdit}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#2B3FB8] hover:text-[#2B3FB8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:text-gray-200 dark:hover:border-blue-400 dark:hover:text-white"
                >
                  <Pencil size={15} aria-hidden="true" />
                  Edit profile
                </button>
              ) : (
                <>
                  <FollowButton
                    userId={String(user._id)}
                    following={Boolean(profile.following)}
                    onChange={onFollowChange}
                  />
                  {actions}
                </>
              )}
            </div>
          </div>

          {/* ── Identity ─────────────────────────────────────────────── */}
          <div className="mt-3 min-w-0">
            <h1 className="break-words text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
              {name}
            </h1>

            {/* Each line renders only when it has something to say — no blank labels. */}
            {profile.headline ? (
              <p className="mt-1 break-words text-[15px] font-medium text-gray-700 dark:text-gray-300">
                {profile.headline}
              </p>
            ) : isSelf ? (
              <button
                type="button"
                onClick={onEdit}
                className="mt-1 text-[15px] font-medium text-[#2B3FB8] underline-offset-4 hover:underline dark:text-blue-300"
              >
                + Add a headline
              </button>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-600 dark:text-gray-400">
              {role ? (
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase size={14} aria-hidden="true" className="text-gray-400" />
                  {role}
                </span>
              ) : null}
              {place ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} aria-hidden="true" className="text-gray-400" />
                  {place}
                </span>
              ) : null}
              {website ? (
                <a
                  href={website}
                  target="_blank"
                  // nofollow as well: a user-submitted URL is not an endorsement,
                  // matching how the site already treats organiser links.
                  rel="noopener noreferrer nofollow"
                  className="inline-flex max-w-full items-baseline gap-1.5 break-all font-medium text-[#2B3FB8] underline-offset-4 hover:underline dark:text-blue-300"
                >
                  <Globe size={14} aria-hidden="true" className="shrink-0 self-center" />
                  {website}
                </a>
              ) : null}
            </div>
          </div>

          {/* ── Counts ───────────────────────────────────────────────── */}
          <dl className="mt-5 grid grid-cols-3 divide-x divide-gray-100 overflow-hidden rounded-2xl bg-gray-50 ring-1 ring-gray-100 dark:divide-white/5 dark:bg-white/[0.03] dark:ring-white/5">
            {counts.map((c) => (
              <div key={c.label} className="flex flex-col items-center px-2 py-3">
                <dt className="order-2 text-xs font-medium text-gray-500 dark:text-gray-400">{c.label}</dt>
                <dd className="order-1 text-lg font-extrabold text-gray-900 tabular-nums dark:text-gray-50">{c.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      {isSelf ? <ProfileStrength profile={profile} onEdit={onEdit} onAddPhoto={() => avatarInput.current?.click()} onAddCover={() => coverInput.current?.click()} /> : null}

      {profile.bio ? (
        <section aria-labelledby="about-heading" className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-7 dark:border-gray-800 dark:bg-gray-900">
          <h2 id="about-heading" className="text-lg font-bold text-gray-900 dark:text-white">
            About
          </h2>
          {/* whitespace-pre-line keeps the author's line breaks. Rendered as TEXT —
              no dangerouslySetInnerHTML, no markdown, no HTML parsing anywhere. */}
          <p className="mt-2 whitespace-pre-line break-words text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
            {profile.bio}
          </p>
        </section>
      ) : null}
    </div>
  );
}

/**
 * "Profile strength" - shown to the owner only, until everything is filled in.
 * Four real fields, each one click from the thing that fills it.
 */
function ProfileStrength({ profile, onEdit, onAddPhoto, onAddCover }) {
  const steps = [
    { done: Boolean(profile.avatarUrl), label: "Add a profile photo", action: onAddPhoto },
    { done: Boolean(profile.coverUrl), label: "Add a cover image", action: onAddCover },
    { done: Boolean(profile.headline), label: "Write a headline", action: onEdit },
    { done: Boolean(profile.bio), label: "Tell people about yourself", action: onEdit },
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const pct = Math.round((done / steps.length) * 100);

  return (
    <section aria-labelledby="strength-heading" className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-3">
        <h2 id="strength-heading" className="text-base font-bold text-gray-900 dark:text-white">
          Profile strength
        </h2>
        <span className="text-sm font-semibold text-[#2B3FB8] tabular-nums dark:text-blue-300">{pct}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800" aria-hidden="true">
        <div className="h-full rounded-full bg-gradient-to-r from-[#2B3FB8] to-[#8B5CF6] transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Complete profiles get more follows and messages. {steps.length - done} {steps.length - done === 1 ? "step" : "steps"} left:
      </p>
      <ul className="mt-3 flex list-none flex-wrap gap-2">
        {steps
          .filter((s) => !s.done)
          .map((s) => (
            <li key={s.label}>
              <button
                type="button"
                onClick={s.action}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#2B3FB8]/40 px-3 py-1.5 text-xs font-semibold text-[#2B3FB8] transition hover:border-solid hover:bg-[#2B3FB8]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-blue-400/40 dark:text-blue-300 dark:hover:bg-blue-400/10"
              >
                + {s.label}
              </button>
            </li>
          ))}
      </ul>
    </section>
  );
}

/** The camera badge on the photo: upload, and remove when there is one. */
function AvatarMenu({ hasPhoto, disabled, onUpload, onRemove }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.type === "keydown" ? e.key === "Escape" : !ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const button =
    "absolute right-1 bottom-1 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#131C55] to-[#2B3FB8] text-white shadow-lg ring-4 ring-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] disabled:opacity-60 motion-reduce:transition-none sm:right-2 sm:bottom-2 dark:ring-gray-900";

  if (!hasPhoto) {
    return (
      <button type="button" onClick={onUpload} disabled={disabled} aria-label="Add a profile photo" title="Add a profile photo" className={button}>
        <Camera size={16} aria-hidden="true" />
      </button>
    );
  }

  return (
    <div ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Change profile photo"
        title="Change profile photo"
        className={button}
      >
        <Camera size={16} aria-hidden="true" />
      </button>
      {open ? (
        <div role="menu" className="absolute top-full left-0 z-30 mt-2 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-800 dark:bg-gray-900">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onUpload();
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <ImagePlus size={15} aria-hidden="true" className="text-gray-400" />
            Upload new photo
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onRemove();
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <Trash2 size={15} aria-hidden="true" />
            Remove photo
          </button>
        </div>
      ) : null}
    </div>
  );
}

function IconButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60 motion-reduce:transition-none"
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}

function Uploading() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-black/40 text-white">
      <span className="inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold">
        <Loader2 size={14} aria-hidden="true" className="animate-spin" />
        Uploading…
      </span>
    </div>
  );
}
