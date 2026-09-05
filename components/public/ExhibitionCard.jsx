import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import CardMedia from "@/components/public/CardMedia";
import { exhibitionPath } from "@/lib/routes";
import { formatDateRange, formatLocation, toIsoDate } from "@/lib/format";

/**
 * One exhibition, as a fully crawlable link.
 *
 * A Server Component with no interactivity beyond CSS hover, so it ships no
 * JavaScript. The whole card is a real <a>, not a div with an onClick, so it is
 * followable by a crawler and usable by keyboard.
 *
 * FIELD AVAILABILITY: category, venue and the image fields were only added to
 * the /upcoming, /ongoing and /previous projections in the approved backend
 * change, which is not deployed yet. Every one of them is therefore rendered
 * conditionally — the card is complete and correct with just a name, dates and
 * a location, and gains detail automatically once the backend ships.
 */
export default function ExhibitionCard({ exhibition, priority = false, className = "" }) {
  const { id, name, startDate, endDate, category, venue, city, state, country, image, isFeatured } =
    exhibition;

  const dates = formatDateRange(startDate, endDate);
  const place = formatLocation({ venue, city, state, country });
  const href = exhibitionPath(name, id);

  return (
    <article
      className={`ox-card group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white hover:border-[#131C55]/30 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-600 ${className}`}
    >
      <CardMedia
        image={image}
        alt={image ? `${name} exhibition banner` : ""}
        label={name}
        priority={priority}
      />

      {isFeatured ? (
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#131C55] shadow-sm dark:bg-gray-950/90 dark:text-gray-100">
          Featured
        </span>
      ) : null}

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {category ? (
          <p className="line-clamp-1 text-[11px] font-semibold uppercase tracking-wide text-[#131C55] dark:text-blue-300">
            {category}
          </p>
        ) : null}

        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-gray-900 dark:text-gray-50">
          {/* Stretched link: the heading carries the href so the accessible name
              is the exhibition name, while ::after makes the whole card clickable. */}
          <Link href={href} className="after:absolute after:inset-0 after:content-['']">
            {name}
          </Link>
        </h3>

        <dl className="mt-auto space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
          {dates ? (
            <div className="flex items-start gap-2">
              <dt className="sr-only">Dates</dt>
              <CalendarDays size={15} className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
              <dd>
                <time dateTime={toIsoDate(startDate)}>{dates}</time>
              </dd>
            </div>
          ) : null}

          {place ? (
            <div className="flex items-start gap-2">
              <dt className="sr-only">Location</dt>
              <MapPin size={15} className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
              <dd className="line-clamp-1">{place}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </article>
  );
}
