"use client";

import { Globe, Pencil } from "lucide-react";

import InitialsAvatar from "@/components/social/InitialsAvatar";
import FollowButton from "@/components/social/FollowButton";
import { safeExternalUrl } from "@/lib/safe-url";
import { displayName, roleLine, locationLine, displayCount } from "@/lib/social/profile";

/**
 * The profile identity block: who this is, their counts, and the one action
 * available on it.
 *
 * IDENTITY COMES ONLY FROM THE API RESPONSE. Everything rendered here is from
 * GET /api/social/profile/:userId, which shapes the user through socialPrivacy's
 * eight-field allow-list. Nothing is read from the cached auth user or from
 * /api/find/signup/:id — the latter returns every private Signup field to any
 * authenticated caller and must never be called from Phase 11.
 *
 * The cached id decides ONE thing: whether to show Edit profile or FollowButton.
 * That is a UI choice about controls, never about data, and the backend pins
 * ownership into the write regardless.
 */
export default function ProfileHeader({ profile, isSelf, onFollowChange, onEdit }) {
  const user = profile.user || {};
  const name = displayName(user);
  const role = roleLine(user);
  const place = locationLine(user);

  // Validated, never rendered raw. A stored "javascript:..." would otherwise
  // become a link that runs script in this origin — see lib/safe-url.js.
  const website = safeExternalUrl(user.website);

  const counts = [
    { label: "Posts", value: displayCount(profile.postCount) },
    { label: "Followers", value: displayCount(profile.followerCount) },
    { label: "Following", value: displayCount(profile.followingCount) },
  ];

  return (
    <header className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
      {/* Stacks on a phone, side by side from sm up. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <InitialsAvatar name={name} src={profile.avatarUrl || null} size="lg" />

        <div className="min-w-0 flex-1">
          <h1 className="break-words text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
            {name}
          </h1>

          {/* Each line renders only when it has something to say — no blank labels. */}
          {profile.headline ? (
            <p className="mt-1 break-words text-[15px] font-medium text-gray-700 dark:text-gray-300">
              {profile.headline}
            </p>
          ) : null}
          {role ? (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{role}</p>
          ) : null}
          {place ? (
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-500">{place}</p>
          ) : null}

          {website ? (
            <p className="mt-2">
              <a
                href={website}
                target="_blank"
                // nofollow as well: a user-submitted URL is not an endorsement,
                // matching how the site already treats organiser links.
                rel="noopener noreferrer nofollow"
                className="inline-flex max-w-full items-baseline gap-1.5 break-all text-sm text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300"
              >
                <Globe size={14} aria-hidden="true" />
                {website}
              </a>
            </p>
          ) : null}
        </div>

        <div className="shrink-0">
          {isSelf ? (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#131C55] hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:text-gray-200"
            >
              <Pencil size={15} aria-hidden="true" />
              Edit profile
            </button>
          ) : (
            <FollowButton
              userId={String(user._id)}
              following={Boolean(profile.following)}
              onChange={onFollowChange}
            />
          )}
        </div>
      </div>

      {profile.bio ? (
        // whitespace-pre-line keeps the author's line breaks. Rendered as TEXT —
        // no dangerouslySetInnerHTML, no markdown, no HTML parsing anywhere.
        <p className="mt-4 whitespace-pre-line break-words text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
          {profile.bio}
        </p>
      ) : null}

      <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-gray-100 pt-4 dark:border-gray-800">
        {counts.map((c) => (
          <div key={c.label} className="flex items-baseline gap-1.5">
            <dt className="order-2 text-sm text-gray-600 dark:text-gray-400">{c.label}</dt>
            <dd className="order-1 text-base font-bold text-gray-900 dark:text-gray-50">{c.value}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
