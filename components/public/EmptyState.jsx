import { SearchX } from "lucide-react";

/**
 * Shown when a section's fetch failed or returned nothing.
 *
 * Every fetcher in lib/public-api.js fails soft, so an unreachable backend
 * reaches the page as an empty list rather than an exception. This states that
 * plainly instead of rendering an invisible, broken-looking gap — and never
 * substitutes placeholder records that would read as real inventory.
 */
export default function EmptyState({ children }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-gradient-to-b from-gray-50 to-white px-6 py-12 text-center dark:border-gray-700 dark:from-gray-900/60 dark:to-gray-950">
      <span
        aria-hidden="true"
        className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-[#2B3FB8]/[0.08] text-[#2B3FB8] dark:bg-blue-400/10 dark:text-blue-300"
      >
        <SearchX size={20} />
      </span>
      <p className="mx-auto max-w-md text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">{children}</p>
    </div>
  );
}
