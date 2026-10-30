"use client";

import Link from "next/link";
import { useState } from "react";
import { MapPin } from "lucide-react";

import { ShowMedia } from "@/components/home/ShowLists";

/**
 * "Next on the calendar" as ticket cards, with country chips to narrow them.
 *
 * The one client island among the homepage's exhibition lists, and only for the
 * chips: every card is in the server HTML, and with JavaScript off the "All"
 * view is simply what stays on screen. Shows arrive already shaped by the
 * server (href, place, date parts), so nothing here depends on the clock or
 * the visitor's locale.
 */
export default function TicketGrid({ items }) {
  const [country, setCountry] = useState("");

  const counts = new Map();
  for (const s of items) if (s.country) counts.set(s.country, (counts.get(s.country) || 0) + 1);
  const chips = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 6);
  const shown = country ? items.filter((s) => s.country === country) : items;

  return (
    <>
      {chips.length > 1 ? (
        <div role="group" aria-label="Filter by country" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip active={!country} onClick={() => setCountry("")} label="All" count={items.length} />
          {chips.map(([name, n]) => (
            <Chip key={name} active={country === name} onClick={() => setCountry(name)} label={name} count={n} />
          ))}
        </div>
      ) : null}

      <ul className="mt-5 grid list-none grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {shown.map((s) => (
          <li key={s.id}>
            <Link
              href={s.href}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgba(19,28,85,0.35)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-gray-800 dark:bg-gray-900"
            >
              <ShowMedia image={s.image} name={s.name} sizes="(min-width: 1024px) 270px, (min-width: 640px) 45vw, 90vw" className="aspect-[16/10]" />
              <span className="flex-1 px-4 pt-3.5 pb-3">
                {s.category ? (
                  <span className="block truncate text-[11px] font-bold tracking-wide text-[#2B3FB8] uppercase dark:text-blue-300">{s.category}</span>
                ) : null}
                <span className="mt-1 line-clamp-2 text-[15px] leading-snug font-semibold text-gray-900 group-hover:text-[#2B3FB8] dark:text-gray-50 dark:group-hover:text-blue-200">
                  {s.name}
                </span>
                {s.place ? (
                  <span className="mt-1 flex items-center gap-1 text-[13px] text-gray-500 dark:text-gray-400">
                    <MapPin size={13} aria-hidden="true" className="shrink-0" />
                    <span className="truncate">{s.place}</span>
                  </span>
                ) : null}
              </span>
              {/* The tear line: a dashed rule with a notch cut out at each end. */}
              <span aria-hidden="true" className="relative mx-4 block border-t-2 border-dashed border-gray-200 dark:border-gray-700">
                <span className="absolute -top-[11px] -left-[27px] h-5 w-5 rounded-full border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950" />
                <span className="absolute -top-[11px] -right-[27px] h-5 w-5 rounded-full border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950" />
              </span>
              <span className="flex items-center justify-between gap-2 px-4 pt-2.5 pb-3.5">
                <span className="flex items-baseline gap-1.5">
                  <span className="text-2xl leading-none font-extrabold text-[#131C55] tabular-nums dark:text-white">{s.day}</span>
                  <span className="text-[11px] font-bold text-[#131C55] uppercase dark:text-white">{s.month}</span>
                  {s.until ? <span className="text-xs text-gray-500 dark:text-gray-400">{s.until}</span> : null}
                </span>
                {s.soon ? <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{s.soon}</span> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function Chip({ active, onClick, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#131C55] px-3.5 text-sm font-semibold whitespace-nowrap text-white dark:bg-blue-500 dark:text-gray-950"
          : "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 text-sm font-medium whitespace-nowrap text-gray-700 transition hover:border-[#131C55]/40 hover:text-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-white"
      }
    >
      {label}
      <span className={active ? "text-indigo-200 dark:text-gray-800" : "text-gray-400"}>{count}</span>
    </button>
  );
}
