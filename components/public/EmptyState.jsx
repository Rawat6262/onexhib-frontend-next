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
    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-900/50">
      <p className="text-sm text-gray-500 dark:text-gray-400">{children}</p>
    </div>
  );
}
