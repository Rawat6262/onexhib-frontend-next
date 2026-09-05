/**
 * Real platform totals from /api/counts.
 *
 * Renders nothing at all when the endpoint is unavailable — getCounts() returns
 * null in that case rather than zeros. An absent statistic is honest; a wrong
 * or invented one is not, which is also why there are no "happy customers" or
 * "countries served" figures here. Only numbers the database actually reports.
 */
export default function CountsStrip({ counts, upcoming }) {
  if (!counts) return null;

  const stats = [
    upcoming ? { value: upcoming, label: "upcoming exhibitions" } : null,
    counts.exhibitions ? { value: counts.exhibitions, label: "exhibitions listed" } : null,
    counts.companies ? { value: counts.companies, label: "companies" } : null,
    counts.products ? { value: counts.products, label: "products" } : null,
  ].filter(Boolean);

  if (!stats.length) return null;

  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-4">
      {stats.map(({ value, label }) => (
        <div key={label}>
          <dt className="sr-only">{label}</dt>
          <dd>
            <span className="block text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
              {value.toLocaleString("en-US")}
            </span>
            <span className="text-[13px] text-gray-600 dark:text-gray-400">{label}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
