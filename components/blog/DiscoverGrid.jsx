import Link from "next/link";
import { ArrowRight, Building2, CalendarDays, Package, Wrench } from "lucide-react";

import { PUBLIC_ROUTES } from "@/lib/seo";

/**
 * The four public catalogues, as discovery cards.
 *
 * EVERY ROUTE HERE IS ONE THAT EXISTS. They are read from PUBLIC_ROUTES rather
 * than typed as strings, so a route rename cannot leave this grid pointing at a
 * 404 - the same reason the footer builds its links the same way.
 *
 * Counts are passed in and each is rendered only when the caller actually has
 * it. A card with no figure simply shows its description; it never falls back to
 * a zero or a "1000+", because an invented number on a page arguing that the
 * numbers are real would be self-defeating.
 */
export default function DiscoverGrid({ counts, upcomingTotal }) {
  const cards = [
    {
      href: PUBLIC_ROUTES.exhibitions,
      icon: CalendarDays,
      title: "Exhibitions",
      body: "Browse upcoming, ongoing and past trade shows with their dates, venues and locations.",
      value: upcomingTotal || null,
      unit: "upcoming",
    },
    {
      href: PUBLIC_ROUTES.companies,
      icon: Building2,
      title: "Companies",
      body: "See the organisations exhibiting, and the shows each of them appears at.",
      value: counts?.companies || null,
      unit: "listed",
    },
    {
      href: PUBLIC_ROUTES.products,
      icon: Package,
      title: "Products",
      body: "Explore what exhibitors bring to the floor, linked back to the company behind it.",
      value: counts?.products || null,
      unit: "listed",
    },
    {
      href: PUBLIC_ROUTES.services,
      icon: Wrench,
      title: "Exhibition services",
      body: "Find stand builders, logistics and the other suppliers an exhibition needs.",
      value: null,
      unit: null,
    },
  ];

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ href, icon: Icon, title, body, value, unit }) => (
        <li key={href} className="ox-reveal">
          <Link
            href={href}
            className="group flex h-full flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#131C55]/30 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#131C55] motion-reduce:hover:translate-y-0 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-400/30 dark:focus-visible:outline-blue-300"
          >
            <span
              aria-hidden="true"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#131C55]/[0.06] text-[#131C55] transition-colors group-hover:bg-[#131C55] group-hover:text-white dark:bg-blue-400/10 dark:text-blue-300 dark:group-hover:bg-blue-400 dark:group-hover:text-gray-950"
            >
              <Icon size={19} />
            </span>

            <h3 className="text-[16px] font-bold tracking-tight text-gray-900 dark:text-gray-50">
              {title}
            </h3>

            <p className="text-[14px] leading-relaxed text-gray-600 dark:text-gray-400">{body}</p>

            <span className="mt-auto flex items-center justify-between gap-2 pt-2">
              {value ? (
                <span className="text-[13px] font-semibold tabular-nums text-gray-900 dark:text-gray-200">
                  {value.toLocaleString("en-US")}{" "}
                  <span className="font-normal text-gray-500 dark:text-gray-400">{unit}</span>
                </span>
              ) : (
                <span className="text-[13px] font-semibold text-[#131C55] dark:text-blue-300">Browse</span>
              )}
              <ArrowRight
                size={15}
                aria-hidden="true"
                className="shrink-0 text-[#131C55] transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none dark:text-blue-300"
              />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
