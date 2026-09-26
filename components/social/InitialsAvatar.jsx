import { initialsOf } from "@/lib/social/profile";

/**
 * A person's avatar.
 *
 * INITIALS ONLY, AND THAT IS NOT A SHORTCUT. SocialProfile carries avatarUrl and
 * coverUrl, and GET /api/social/profile/:userId returns them — but PUT
 * /api/social/profile accepts only `bio` and `headline`, and no other endpoint
 * sets them. So avatarUrl is always null today, and an upload control would be a
 * button with nothing behind it.
 *
 * The `src` prop is honoured if a value ever arrives, so whichever phase adds the
 * upload endpoint changes the API and not this component. Until then this renders
 * the same navy initials disc AccountMenu already uses, so a profile looks
 * deliberate rather than unfinished.
 *
 * Not a client component: it has no state and no handlers.
 */
export default function InitialsAvatar({ name, src = null, size = "md", className = "" }) {
  const dims = {
    sm: "h-9 w-9 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-20 w-20 text-xl sm:h-24 sm:w-24 sm:text-2xl",
  }[size] || "h-12 w-12 text-sm";

  // alt="" and aria-hidden: the name is always rendered as text next to the
  // avatar, so announcing it twice is noise for a screen reader.
  if (src) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className={`${dims} shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${dims} flex shrink-0 items-center justify-center rounded-full bg-[#131C55] font-bold text-white dark:bg-blue-600 ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}
