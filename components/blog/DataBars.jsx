import Link from "next/link";

/**
 * Horizontal bar list for a real distribution - countries or industries.
 *
 * Editorial, not analytical: it exists to show the shape of the catalogue at a
 * glance and to send the reader into the matching landing page. That is why the
 * bars carry the count as text as well as width - width alone is a comparison,
 * the number is the fact - and why every row is a link rather than a tooltip.
 *
 * Bars are scaled against the largest value in the set, not against the total,
 * because the leader would otherwise be a sliver on a long tail.
 *
 * The animation is a CSS transform on a wrapper, so it never animates `width`
 * (which would relayout every frame) and it is skipped entirely under
 * prefers-reduced-motion via the shared .ox-reveal rules in globals.css.
 */
export default function DataBars({ rows, hrefFor, unitLabel = "listings", scaleMax }) {
  if (!rows?.length) return null;
  // `scaleMax` matters whenever one distribution is split across several
  // DataBars — a two-column layout, say. Without it each column scales to its
  // own largest value, so the top of the right column renders as wide as the
  // top of the left and the comparison the chart exists to make is silently
  // inverted. Callers that split a list must pass the whole list's max.
  const max = Math.max(scaleMax || 0, ...rows.map((r) => r.count), 1);

  return (
    <ul className="space-y-2.5">
      {rows.map((row, i) => {
        const pct = Math.max(4, Math.round((row.count / max) * 100));
        const href = hrefFor?.(row);
        const inner = (
          <>
            <span className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[14px] font-medium text-gray-900 dark:text-gray-100">
                {row.label}
              </span>
              <span className="shrink-0 text-[13px] tabular-nums text-gray-500 dark:text-gray-400">
                {row.count.toLocaleString("en-US")}
                <span className="sr-only"> {unitLabel}</span>
              </span>
            </span>
            <span
              aria-hidden="true"
              className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
            >
              <span
                className="ox-bar block h-full rounded-full bg-gradient-to-r from-[#131C55] to-[#3B4BA8] dark:from-blue-400 dark:to-indigo-400"
                style={{ width: `${pct}%`, animationDelay: `${i * 60}ms` }}
              />
            </span>
          </>
        );

        return (
          <li key={row.slug || row.label}>
            {href ? (
              <Link
                href={href}
                className="group block rounded-lg px-1 py-1 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:hover:bg-gray-900 dark:focus-visible:outline-blue-300"
              >
                {inner}
              </Link>
            ) : (
              <div className="px-1 py-1">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
