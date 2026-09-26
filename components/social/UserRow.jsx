import Link from "next/link";

import InitialsAvatar from "@/components/social/InitialsAvatar";
import { displayName, roleLine, locationLine } from "@/lib/social/profile";

/**
 * One person in a followers/following list.
 *
 * ONLY THE PUBLIC ALLOW-LIST. The backend shapes every row through socialPrivacy
 * before it leaves the server, so this receives _id, first_name, last_name,
 * company_name, designation, city, country and website — and nothing else exists
 * to render. email, mobile_number, address, qrCode and the auth fields are not in
 * the payload, so they cannot be leaked from here by accident.
 *
 * NO PER-ROW REQUEST. Rows arrive already hydrated; a row must never fetch a
 * profile, a follow status or anything else. Fifty rows each asking "am I
 * following this person?" would be the N+1 the backend's batching exists to
 * prevent — and there is no per-row Follow button for exactly that reason. Opening
 * the profile is where you follow someone.
 *
 * Not a client component: a link and some text.
 */
export default function UserRow({ user }) {
  const name = displayName(user);
  const role = roleLine(user);
  const place = locationLine(user);

  return (
    <li>
      <Link
        href={`/social/profile/${encodeURIComponent(String(user._id))}`}
        className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition hover:border-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-400"
      >
        <InitialsAvatar name={name} src={user.avatarUrl || null} size="sm" />
        <span className="min-w-0">
          {/* The name is the link text, so the destination is described without
              needing an aria-label. */}
          <span className="block truncate text-sm font-semibold text-gray-900 dark:text-gray-50">
            {name}
          </span>
          {role ? (
            <span className="block truncate text-xs text-gray-600 dark:text-gray-400">{role}</span>
          ) : null}
          {place ? (
            <span className="block truncate text-xs text-gray-500 dark:text-gray-500">{place}</span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}
