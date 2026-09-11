import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import ExhibitionCard from "@/components/public/ExhibitionCard";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";
import { breadcrumbNode, graph, itemListNode } from "@/lib/jsonld";
import { exhibitionPath } from "@/lib/routes";
import {
  MIN_MONTH_EXHIBITIONS,
  getIndexableMonths,
  getMonthExhibitions,
  monthLabel,
  monthSlug,
} from "@/lib/discovery";

/**
 * /exhibitions/monthly/2027/03 — one month of the calendar.
 *
 * ONLY MONTHS WITH REAL INVENTORY EXIST
 * generateStaticParams emits the months that clear MIN_MONTH_EXHIBITIONS, and
 * dynamicParams is false, so any other month/year pair 404s rather than
 * rendering an empty page. That is deliberate: the backend will happily compute
 * any month you ask for, and honouring that would create an unbounded set of
 * near-empty URLs — /monthly/2031/07 and the rest — which is textbook doorway
 * generation. A 404 is the honest answer for a month with nothing in it.
 *
 * The same threshold governs the sitemap, so what is listed and what is
 * reachable never disagree.
 */

export const revalidate = 3600;
export const dynamicParams = false;

export async function generateStaticParams() {
  const months = await getIndexableMonths();
  return months.map((m) => monthSlug(m.year, m.month));
}

function parseParams(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return null;
  if (y < 2000 || y > 2100) return null;
  return { year: y, month: m };
}

export async function generateMetadata({ params }) {
  const { year, month } = await params;
  const parsed = parseParams(year, month);
  if (!parsed) return { title: "Month not found", robots: { index: false, follow: true } };

  const label = monthLabel(parsed.year, parsed.month);
  const items = await getMonthExhibitions(parsed.year, parsed.month);
  const slug = monthSlug(parsed.year, parsed.month);

  return publicPageMetadata({
    title: `Exhibitions in ${label}`,
    description:
      `${items.length} exhibitions and trade shows open in ${label}, worldwide. See dates, venues, cities and categories for every event.`.slice(
        0,
        158
      ),
    path: `${PUBLIC_ROUTES.exhibitions}/monthly/${slug.year}/${slug.month}`,
  });
}

export default async function MonthPage({ params }) {
  const { year, month } = await params;
  const parsed = parseParams(year, month);
  if (!parsed) notFound();

  const items = await getMonthExhibitions(parsed.year, parsed.month);

  // Belt and braces alongside dynamicParams:false — if a month's inventory
  // drops below the floor between builds, it stops being a page rather than
  // degrading into a thin one.
  if (items.length < MIN_MONTH_EXHIBITIONS) notFound();

  const label = monthLabel(parsed.year, parsed.month);
  const slug = monthSlug(parsed.year, parsed.month);
  const here = `${PUBLIC_ROUTES.exhibitions}/monthly/${slug.year}/${slug.month}`;

  const trail = [
    { name: "Home", path: "/" },
    { name: "Upcoming exhibitions", path: PUBLIC_ROUTES.exhibitions },
    { name: "By month", path: `${PUBLIC_ROUTES.exhibitions}/monthly` },
    { name: label, path: here },
  ];

  // Neighbouring months, but only linked when they are real pages.
  const indexable = await getIndexableMonths();
  const position = indexable.findIndex((m) => m.year === parsed.year && m.month === parsed.month);
  const prev = position > 0 ? indexable[position - 1] : null;
  const next = position >= 0 && position < indexable.length - 1 ? indexable[position + 1] : null;
  const monthHref = (m) => {
    const s = monthSlug(m.year, m.month);
    return `${PUBLIC_ROUTES.exhibitions}/monthly/${s.year}/${s.month}`;
  };

  // Grouped by start day, so a busy month reads as a schedule.
  const groups = new Map();
  for (const item of items) {
    const key = String(item.startDate).slice(0, 10);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const countries = [...new Set(items.map((e) => e.country).filter(Boolean))];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        graph={graph(
          breadcrumbNode(trail),
          itemListNode(
            items.map((e) => exhibitionPath(e.name, e.id)),
            { name: `Exhibitions in ${label}` }
          )
        )}
      />

      <Breadcrumbs trail={trail} />

      <header>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          Exhibitions in {label}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          {items.length.toLocaleString("en-US")} exhibitions and trade shows open in {label}
          {countries.length > 1 ? ` across ${countries.length} countries` : ""}. Listings are ordered
          by opening date.
        </p>
      </header>

      <div className="mt-10 space-y-10">
        {[...groups.entries()].map(([day, dayItems]) => {
          const date = new Date(day);
          return (
            <section key={day} aria-labelledby={`day-${day}`}>
              <h2
                id={`day-${day}`}
                className="flex items-baseline gap-3 border-b border-gray-200 pb-2 text-lg font-semibold text-gray-900 dark:border-gray-800 dark:text-gray-50"
              >
                <time dateTime={day}>
                  {date.toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    timeZone: "UTC",
                  })}
                </time>
                <span className="text-sm font-normal text-gray-500 dark:text-gray-500">
                  {dayItems.length} {dayItems.length === 1 ? "event" : "events"}
                </span>
              </h2>
              <ul className="mt-4 grid list-none grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {dayItems.map((e) => (
                  <li key={e.id}>
                    <ExhibitionCard exhibition={e} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <nav
        aria-label="Nearby months"
        className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-6 dark:border-gray-800"
      >
        {prev ? (
          <Link
            href={monthHref(prev)}
            rel="prev"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#131C55] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:text-blue-300"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            {prev.label}
          </Link>
        ) : (
          <span />
        )}
        <Link
          href={`${PUBLIC_ROUTES.exhibitions}/monthly`}
          className="text-sm font-medium text-gray-600 underline-offset-4 hover:underline dark:text-gray-400"
        >
          All months
        </Link>
        {next ? (
          <Link
            href={monthHref(next)}
            rel="next"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#131C55] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:text-blue-300"
          >
            {next.label}
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
