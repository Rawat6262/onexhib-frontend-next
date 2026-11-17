"use client";

import { useState } from "react";
import Image from "next/image";
import { Newspaper } from "lucide-react";

/**
 * A news photo, hotlinked from the publisher.
 *
 * These URLs belong to other sites: some block hotlinking by referrer, and any
 * of them can disappear later. So the image is requested with no referrer
 * (which clears most hotlink checks) and, if it still fails, swaps itself for a
 * branded panel instead of leaving the browser's broken-image icon in a card.
 *
 * Always `unoptimized`: /_next/image only resizes hosts we own (see
 * next.config.mjs), and these are arbitrary publisher hosts.
 */
export default function NewsImage({
  src,
  alt,
  sizes,
  className = "",
  fallbackClassName = "",
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        aria-hidden="true"
        className={`absolute inset-0 grid place-items-center bg-gradient-to-br from-ox-night via-ox-navy to-ox-royal ${fallbackClassName}`}
      >
        <Newspaper size={36} className="text-white/35" />
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
