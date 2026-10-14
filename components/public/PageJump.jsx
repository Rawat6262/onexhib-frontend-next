"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * "Go to page" for the server-rendered public Pagination.
 *
 * Receives URLs, not a function: `template` is buildHref(sentinel) and the
 * sentinel is replaced with the requested page, so the destination is the same
 * URL a numbered link would use (filters and all). Page 1 uses `firstHref`,
 * because buildHref usually omits ?page=1 and the canonical URL must match.
 *
 * Keyed on the current page by the parent, so the box always starts at the page
 * shown rather than at a stale draft.
 */
export default function PageJump({ current, totalPages, firstHref, template, sentinel }) {
  const router = useRouter();
  const [draft, setDraft] = useState(String(current));

  const submit = (e) => {
    e.preventDefault();
    const n = Number.parseInt(draft, 10);
    if (!Number.isFinite(n)) {
      setDraft(String(current));
      return;
    }
    const target = Math.min(Math.max(1, n), totalPages);
    if (target === current) {
      setDraft(String(current));
      return;
    }
    router.push(target === 1 ? firstHref : template.replace(sentinel, String(target)));
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400">
      <label htmlFor="public-page-jump" className="whitespace-nowrap">
        Go to
      </label>
      <input
        id="public-page-jump"
        type="number"
        inputMode="numeric"
        min={1}
        max={totalPages}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => setDraft(String(current))}
        className="h-8 w-16 rounded-lg border border-gray-300 bg-white px-2 text-center text-sm font-medium text-gray-800 [appearance:textfield] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="whitespace-nowrap">of {totalPages.toLocaleString()}</span>
    </form>
  );
}
