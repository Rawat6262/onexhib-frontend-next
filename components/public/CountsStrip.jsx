import { Building2, CalendarDays, Layers, Package } from "lucide-react";

/**
 * Real platform totals from /api/counts.
 *
 * Renders nothing at all when the endpoint is unavailable — getCounts() returns
 * null in that case rather than zeros. An absent statistic is honest; a wrong
 * or invented one is not, which is also why there are no "happy customers" or
 * "countries served" figures here. Only numbers the database actually reports.
 *
 * Framed as one bar with dividers rather than four loose numbers: under the
 * hero copy, loose figures read as more body text; a single framed strip reads
 * as "the size of the catalogue" at a glance. Two columns on a phone, four in a
 * row from `sm` up.
 */
export default function CountsStrip({ counts, upcoming }) {
  if (!counts) return null;

  const stats = [
    upcoming ? { value: upcoming, label: "Upcoming shows", Icon: CalendarDays } : null,
    counts.exhibitions ? { value: counts.exhibitions, label: "Shows listed", Icon: Layers } : null,
    counts.companies ? { value: counts.companies, label: "Companies", Icon: Building2 } : null,
    counts.products ? { value: counts.products, label: "Products", Icon: Package } : null,
  ].filter(Boolean);

  if (!stats.length) return null;

  return (
    <dl
      className={`grid grid-cols-2 overflow-hidden rounded-2xl border border-gray-200 bg-white/70 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.03] ${
        stats.length >= 4 ? "sm:grid-cols-4" : stats.length === 3 ? "sm:grid-cols-3" : ""
      }`}
    >
      {stats.map(({ value, label, Icon }, i) => (
        <div
          key={label}
          className={`flex flex-col gap-1 px-4 py-4 sm:px-5 ${
            i % 2 === 1 ? "border-l border-gray-200 dark:border-white/10" : ""
          } ${i >= 2 ? "border-t border-gray-200 sm:border-t-0 dark:border-white/10" : ""} ${
            i >= 1 ? "sm:border-l" : ""
          }`}
        >
          <dt className="flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium text-gray-500 dark:text-gray-400">
            <Icon size={14} aria-hidden="true" className="text-[#2B3FB8] dark:text-blue-300" />
            {label}
          </dt>
          <dd className="text-2xl font-extrabold tracking-tight text-gray-900 tabular-nums sm:text-[1.7rem] dark:text-white">
            {value.toLocaleString("en-US")}
          </dd>
        </div>
      ))}
    </dl>
  );
}
