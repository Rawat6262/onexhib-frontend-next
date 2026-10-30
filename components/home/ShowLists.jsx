import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

import CardMedia from "@/components/public/CardMedia";
import { exhibitionPath } from "@/lib/routes";
import { formatDateRange, formatLocation } from "@/lib/format";

/**
 * The homepage's exhibition lists, each laid out for what it holds:
 *
 *   ShowSpotlight - "Opening this week": the next show to open large, with a
 *                   countdown, and the rest of the week as a numbered list.
 *   LiveBoard     - "Running today": compact rows with how far each show is
 *                   through its run ("Day 2 of 3 · Ends tomorrow").
 *   (TicketGrid, the filterable "Next on the calendar" cards, is the one
 *    client island - components/home/TicketGrid.jsx.)
 *
 * Every image sits on a blurred, enlarged copy of itself (ShowMedia), so a wide
 * logo or a poster drawn for a white page fills its slot in its own colours
 * instead of floating in white space.
 *
 * Server Components: every show is in the initial HTML. Day counts are worked
 * out at render time; the homepage revalidates every five minutes.
 */

const DAY = 864e5;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Midnight UTC of a date: exhibition dates are calendar days, read in UTC. */
function utcDay(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Where a show is in its run today: { day, days, left }, or null without dates. */
export function showProgress(e, now = Date.now()) {
  const start = utcDay(e.startDate);
  const end = utcDay(e.endDate || e.startDate);
  const today = utcDay(now);
  if (start === null || end === null) return null;
  const days = Math.max(1, Math.round((end - start) / DAY) + 1);
  const day = Math.min(days, Math.max(1, Math.round((today - start) / DAY) + 1));
  return { day, days, left: days - day };
}

/** "Opens in 3 days", "Opens tomorrow", "Opened Tuesday", "Opens today". */
export function openingLabel(e, now = Date.now()) {
  const start = utcDay(e.startDate);
  const today = utcDay(now);
  if (start === null) return "";
  const diff = Math.round((start - today) / DAY);
  if (diff === 0) return "Opens today";
  if (diff === 1) return "Opens tomorrow";
  if (diff > 1) return `Opens in ${diff} days`;
  return `Opened ${WEEKDAYS[new Date(start).getUTCDay()]}`;
}

export const endsLabel = (p) => (!p ? "" : p.left === 0 ? "Last day today" : p.left === 1 ? "Ends tomorrow" : `Ends in ${p.left} days`);

/** An image letterboxed on a blurred copy of itself; the branded placeholder when there is none. */
export function ShowMedia({ image, name, sizes, className = "" }) {
  return (
    <div className={`relative overflow-hidden bg-slate-100 dark:bg-gray-800 ${className}`}>
      {image?.url ? (
        <div
          aria-hidden="true"
          className="absolute -inset-5 scale-110 bg-cover bg-center opacity-70 blur-2xl saturate-150"
          style={{ backgroundImage: `url("${image.url}")` }}
        />
      ) : null}
      <CardMedia image={image} alt="" label={name} sizes={sizes} aspect="h-full" fit="contain" bg="bg-transparent" />
    </div>
  );
}

function LivePill({ children, tone = "live", className = "" }) {
  const tones = {
    live: "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300",
    last: "bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]} ${className}`}>
      <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 motion-reduce:animate-none ${tone === "last" ? "bg-amber-500" : "bg-emerald-500"}`} />
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${tone === "last" ? "bg-amber-500" : "bg-emerald-500"}`} />
      </span>
      {children}
    </span>
  );
}
export { LivePill };

/* ── Opening this week ─────────────────────────────────────────────────── */

/** `skipId`: a show already pictured above the list (OpenNow's tilted poster), so the spotlight leads with another. */
export function ShowSpotlight({ items, skipId }) {
  const lead = items.find((e) => e.image?.url && e.id !== skipId) || items.find((e) => e.image?.url) || items[0];
  if (!lead) return null;
  const rest = items.filter((e) => e.id !== lead.id).slice(0, 6);
  const opens = openingLabel(lead);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Link
        href={exhibitionPath(lead.name, lead.id)}
        className="group relative isolate flex min-h-[26rem] flex-col justify-end overflow-hidden rounded-3xl bg-[#0B1240] text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55]"
      >
        {lead.image?.url ? (
          <>
            <div
              aria-hidden="true"
              className="absolute -inset-8 -z-10 scale-110 bg-cover bg-center blur-3xl brightness-75 saturate-150"
              style={{ backgroundImage: `url("${lead.image.url}")` }}
            />
            <div className="absolute inset-x-[12%] top-7 -z-10 h-[46%] drop-shadow-[0_18px_30px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none">
              <CardMedia image={lead.image} alt="" label={lead.name} sizes="(min-width: 1024px) 460px, 80vw" aspect="h-full" fit="contain" bg="bg-transparent" />
            </div>
          </>
        ) : null}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0B1240] via-[#0B1240]/60 to-transparent" />
        <div className="p-6 sm:p-7">
          {opens ? <LivePill className="bg-white/90 dark:bg-white/90 dark:text-emerald-800">{opens}</LivePill> : null}
          <p className="mt-3 text-xs font-bold tracking-wide text-indigo-200 uppercase">
            {[lead.category, formatLocation(lead, { includeVenue: false })].filter(Boolean).join(" · ")}
          </p>
          <h4 className="mt-1.5 text-2xl leading-tight font-bold sm:text-[28px]">{lead.name}</h4>
          <p className="mt-1.5 text-sm text-white/80">
            {[formatDateRange(lead.startDate, lead.endDate, { short: true }), lead.venue].filter(Boolean).join(" · ")}
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold">
            View exhibition
            <ArrowRight size={16} aria-hidden="true" className="transition group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </span>
        </div>
      </Link>

      {rest.length ? (
        <ol className="list-none rounded-3xl border border-gray-200 bg-white px-4 py-1.5 sm:px-5 dark:border-gray-800 dark:bg-gray-900">
          {rest.map((e, i) => (
            <li key={e.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
              <Link href={exhibitionPath(e.name, e.id)} className="group flex items-center gap-3.5 py-3">
                <span aria-hidden="true" className="w-8 shrink-0 text-xl font-extrabold text-gray-300 tabular-nums dark:text-gray-600">
                  {String(i + 2).padStart(2, "0")}
                </span>
                <ShowMedia image={e.image} name={e.name} sizes="56px" className="h-14 w-14 shrink-0 rounded-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-gray-900 group-hover:text-[#2B3FB8] dark:text-gray-100 dark:group-hover:text-blue-300">
                    {e.name}
                  </span>
                  <span className="block truncate text-[13px] text-gray-500 dark:text-gray-400">
                    {[formatLocation(e, { includeVenue: false }), formatDateRange(e.startDate, e.endDate, { short: true })]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className="hidden shrink-0 text-xs font-semibold text-emerald-700 sm:block dark:text-emerald-300">{openingLabel(e)}</span>
              </Link>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

/* ── Running today ─────────────────────────────────────────────────────── */

export function LiveBoard({ items }) {
  return (
    <ul className="grid list-none grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
      {items.map((e) => {
        const p = showProgress(e);
        const last = p?.left === 0;
        return (
          <li key={e.id}>
            <Link
              href={exhibitionPath(e.name, e.id)}
              className="ox-card group flex h-full items-center gap-4 rounded-2xl border border-gray-200 bg-white p-2.5 hover:border-[#131C55]/30 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
            >
              <ShowMedia image={e.image} name={e.name} sizes="128px" className="h-[84px] w-[120px] shrink-0 rounded-xl sm:w-32" />
              <span className="min-w-0 flex-1 pr-1">
                {e.category ? (
                  <span className="block truncate text-[11px] font-bold tracking-wide text-[#2B3FB8] uppercase dark:text-blue-300">{e.category}</span>
                ) : null}
                <span className="mt-0.5 block truncate text-[15px] font-semibold text-gray-900 group-hover:text-[#2B3FB8] dark:text-gray-50 dark:group-hover:text-blue-200">
                  {e.name}
                </span>
                <span className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-gray-500 dark:text-gray-400">
                  <MapPin size={13} aria-hidden="true" className="shrink-0" />
                  <span className="truncate">{formatLocation(e, { includeVenue: false })}</span>
                </span>
                {p ? (
                  <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span aria-hidden="true" className="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <span
                        className={`block h-full rounded-full bg-gradient-to-r ${last ? "from-amber-400 to-red-500" : "from-[#2B3FB8] to-[#8B5CF6]"}`}
                        style={{ width: `${Math.round((p.day / p.days) * 100)}%` }}
                      />
                    </span>
                    <span className={`shrink-0 text-xs font-medium ${last ? "text-amber-700 dark:text-amber-300" : "text-gray-500 dark:text-gray-400"}`}>
                      Day {p.day} of {p.days} · {endsLabel(p)}
                    </span>
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
