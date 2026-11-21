import Image from "next/image";

import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/business";

/**
 * "Download on the App Store" and "Get it on Google Play" badges.
 *
 * Both are local SVGs in public/badges (no hotlinked artwork, no request to a
 * store CDN). Each badge is the whole link, and its alt text is the link's
 * accessible name, so a screen reader announces exactly what the badge says.
 * Both open in a new tab: the store listing is someone else's site.
 */
export default function StoreBadges({ className = "", size = "md" }) {
  const h = size === "lg" ? "h-[52px]" : "h-11";
  const badges = [
    { href: APP_STORE_URL, src: "/badges/app-store.svg", alt: "Download OneXhib on the App Store" },
    { href: PLAY_STORE_URL, src: "/badges/google-play.svg", alt: "Get OneXhib on Google Play" },
  ];

  return (
    <ul className={`flex list-none flex-wrap items-center gap-3 ${className}`}>
      {badges.map(({ href, src, alt }) => (
        <li key={href}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-[10px] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ox-navy motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:focus-visible:outline-blue-300"
          >
            <Image src={src} alt={alt} width={180} height={54} className={`${h} w-auto`} />
          </a>
        </li>
      ))}
    </ul>
  );
}
