"use client";

import { FileText } from "lucide-react";
import { trackBrochureDownload } from "@/lib/analytics";

/**
 * The organiser's brochure, on a record that actually has one.
 *
 * The link itself was already a plain <a> in the server component; this exists
 * only to record the click, which needs a browser. Everything else is
 * unchanged, including the rel:
 *
 *  - `noopener noreferrer` because target="_blank" without it hands the opened
 *    page a reference back to this one.
 *  - `nofollow` because the destination is a third-party file we neither host
 *    nor vouch for; 241 records carry one and they point at organiser domains.
 *
 * Rendered only when `href` is present, so there is never a download button
 * that leads nowhere. No file-type or size claim is made either — the field
 * holds whatever the organiser supplied, usually a PDF but sometimes a landing
 * page, and asserting "PDF" would be a guess.
 */
export default function BrochureLink({ href, className = "" }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={trackBrochureDownload}
      className={
        className ||
        "inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:border-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-500"
      }
    >
      <FileText size={16} aria-hidden="true" />
      Exhibition brochure
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
