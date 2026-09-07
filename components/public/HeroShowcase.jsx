import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";

import CardMedia from "@/components/public/CardMedia";
import { exhibitionPath, exhibitionsScopePath } from "@/lib/routes";
import { formatDateRange, formatLocation, toIsoDate } from "@/lib/format";

/**
 * The hero's right-hand panel: the next few exhibitions, live from the data.
 *
 * WHY REAL RECORDS AND NOT AN ILLUSTRATION
 * The hero was a single left column, which left the right half of a desktop
 * viewport empty. The obvious fix is a stock photo or public/bg.png, but that
 * costs ~2 MB of LCP for decoration that says nothing. Showing three actual
 * upcoming listings fills the same space, demonstrates the product in the first
 * screenful, and costs one extra thumbnail — the records are already fetched
 * for the rails below, so there is no additional request.
 *
 * WHY IT IS DESKTOP-ONLY
 * On a phone the hero is already a full screen of headline, buttons and search.
 * Stacking three more cards above the fold would push the search box off it, and
 * these same records appear in the "Upcoming" rail moments later — so the panel
 * is hidden below lg rather than reflowed. Nothing unique to the page is lost.
 */
export default function HeroShowcase({ items = [], total }) {
  const rows = items.filter(Boolean).slice(0, 3);
  if (rows.length < 2) return null; // a one-row panel reads as an accident

  return (
    <div className="relative hidden lg:block">
      {/* Depth, drawn in CSS: a tinted glow and an offset sheet behind the card.
          Both decorative, both aria-hidden, neither costs a request. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-[#131C55]/[0.12] via-[#131C55]/[0.04] to-transparent blur-2xl dark:from-[#4C63D2]/20"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-4 -bottom-3 top-6 rotate-[1.5deg] rounded-3xl border border-gray-200/80 bg-white/60 dark:border-gray-800 dark:bg-gray-900/50"
      />

      <div className="relative rounded-3xl border border-gray-200 bg-white/90 p-5 shadow-xl shadow-[#131C55]/[0.08] backdrop-blur dark:border-gray-800 dark:bg-gray-900/90 dark:shadow-black/40">
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#131C55] dark:text-blue-300">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-[#131C55] dark:bg-blue-300"
            />
            Happening next
          </p>
          {total ? (
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {total.toLocaleString("en-US")} listed
            </p>
          ) : null}
        </div>

        <ul className="mt-3 space-y-1">
          {rows.map((exhibition, i) => (
            <ShowcaseRow key={exhibition.id} exhibition={exhibition} priority={i === 0} />
          ))}
        </ul>

        <Link
          href={exhibitionsScopePath("upcoming")}
          className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-gray-50 px-4 py-2.5 text-[13px] font-semibold text-[#131C55] transition hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:bg-gray-800/60 dark:text-blue-200 dark:hover:bg-gray-800"
        >
          See all upcoming exhibitions
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

/** One row: thumbnail, name, dates and place. The whole row is the link. */
function ShowcaseRow({ exhibition, priority }) {
  const { id, name, startDate, endDate, city, state, country, image } = exhibition;

  const dates = formatDateRange(startDate, endDate, { short: true });
  // No venue: at this size the venue name swamps the row, and city/country is
  // the part a visitor scanning the hero actually needs.
  const place = formatLocation({ city, state, country }, { includeVenue: false });

  return (
    <li className="relative">
      <div className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-gray-50 motion-reduce:transition-none dark:hover:bg-gray-800/50">
        <div className="w-14 shrink-0 overflow-hidden rounded-xl border border-gray-200/80 dark:border-gray-700/60">
          <CardMedia
            image={image}
            alt=""
            label={name}
            aspect="aspect-square"
            sizes="56px"
            priority={priority}
            fit="contain"
            bg="bg-white dark:bg-gray-100"
          />
        </div>

        <div className="min-w-0 flex-1">
          {/* A <p>, not a heading: these three records are duplicated in the
              "Upcoming" rail below, and heading tags here would put them ahead
              of the real section headings in the document outline. */}
          <p className="line-clamp-1 text-[13.5px] font-semibold text-gray-900 dark:text-gray-50">
            {/* Stretched link, as on the cards: the heading carries the href so
                the accessible name is the exhibition, and ::after makes the whole
                row clickable. */}
            <Link href={exhibitionPath(name, id)} className="after:absolute after:inset-0 after:content-['']">
              {name}
            </Link>
          </p>

          <p className="mt-1 flex items-center gap-3 text-[11.5px] text-gray-500 dark:text-gray-400">
            {dates ? (
              <span className="flex shrink-0 items-center gap-1">
                <CalendarDays size={12} className="text-gray-400" aria-hidden="true" />
                <time dateTime={toIsoDate(startDate)}>{dates}</time>
              </span>
            ) : null}
            {place ? (
              <span className="flex min-w-0 items-center gap-1">
                <MapPin size={12} className="shrink-0 text-gray-400" aria-hidden="true" />
                <span className="truncate">{place}</span>
              </span>
            ) : null}
          </p>
        </div>
      </div>
    </li>
  );
}
