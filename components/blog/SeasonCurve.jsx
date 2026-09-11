/**
 * The next twelve months of listings, as a column chart.
 *
 * Drawn with plain divs rather than a charting library: twelve bars do not
 * justify shipping a runtime, and this way the whole thing is server-rendered
 * HTML with no client JavaScript at all.
 *
 * Accessibility is the reason for the <table> underneath. A row of coloured
 * bars is meaningless to a screen reader, so the same numbers are also exposed
 * as a real data table, visually hidden. Sighted users get the shape, everyone
 * gets the figures - rather than an aria-label that flattens twelve values into
 * one sentence.
 */
export default function SeasonCurve({ monthly, caption }) {
  if (!monthly?.buckets?.length) return null;
  const { buckets, max } = monthly;

  return (
    <figure className="w-full">
      {/* `items-stretch` (the default) is required, NOT items-end: with
          align-items:flex-end each column sizes to its own content, the bar's
          flex-1 wrapper gets no free space and collapses to height:0, and the
          percentage heights below then resolve against nothing — the columns
          vanish while the labels stay. Stretching gives every column the full
          h-40 track, and the bar is pushed to the baseline by items-end on its
          own wrapper instead. */}
      <div
        aria-hidden="true"
        className="flex h-40 gap-1.5 sm:gap-2"
      >
        {buckets.map((b, i) => {
          const pct = max ? Math.max(3, Math.round((b.count / max) * 100)) : 3;
          const isPeak = b.count === max && max > 0;
          return (
            <div key={b.key} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="text-[10px] tabular-nums text-gray-400 dark:text-gray-500">
                {b.count || ""}
              </span>
              <span className="flex w-full flex-1 items-end">
                <span
                  className={`ox-col w-full rounded-t-md ${
                    isPeak
                      ? "bg-gradient-to-t from-[#131C55] to-[#4C63D2] dark:from-blue-400 dark:to-indigo-300"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                  style={{ height: `${pct}%`, animationDelay: `${i * 45}ms` }}
                />
              </span>
              <span className="truncate text-[10px] font-medium text-gray-500 sm:text-[11px] dark:text-gray-400">
                {b.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Same data, available to assistive tech.

          THE WRAPPER IS REQUIRED. Putting .sr-only directly on the <table> does
          not hide it from layout: sr-only sets width:1px, but a display:table
          box ignores that and expands to its min-content width (~305px here).
          Being position:absolute, it then pushed documentElement.scrollWidth
          past the viewport and gave the page a horizontal scrollbar at tablet
          and laptop widths. A <div> honours the 1px, so the clipping works and
          the table inside is laid out with no effect on the page. */}
      <div className="sr-only">
        <table>
          <caption>{caption || "Upcoming exhibition listings by month"}</caption>
          <thead>
            <tr><th scope="col">Month</th><th scope="col">Listings</th></tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.key}>
                <th scope="row">{`${b.label} ${b.year}`}</th>
                <td>{b.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {caption ? (
        <figcaption className="mt-3 text-[12px] leading-relaxed text-gray-500 dark:text-gray-400">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
