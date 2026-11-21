"use client";

import { useEffect, useState } from "react";

/**
 * A "Your device" tag on the matching app card of /get-app.
 *
 * Read from the user agent after hydration, so the server-rendered page is the
 * same for everyone (and for crawlers) and the tag simply appears on phones.
 * iPadOS reports itself as a Mac, so a Mac with touch counts as iOS.
 */
export default function DeviceTag({ platform }) {
  const [match, setMatch] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    const android = /Android/i.test(ua);
    setMatch(platform === "ios" ? ios : platform === "android" ? android : false);
  }, [platform]);

  if (!match) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Your device
    </span>
  );
}
