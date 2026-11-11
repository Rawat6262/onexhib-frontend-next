import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BedDouble, MapPin, Star } from "lucide-react";

import { amenityOf, formatKm, formatRate } from "@/lib/hotels";
import { hotelPath } from "@/lib/routes";

/**
 * "Stay nearby": hotels listed on OneXhib by HOTEL accounts and approved by an
 * admin, within ~10 km of an exhibition centre, nearest first. On the centre
 * page and in the venue section of every exhibition held there.
 *
 * Distinct from AroundVenue's hotel list below it, which is OpenStreetMap data
 * about every hotel in the area: these are hotels that chose to be listed, with
 * photos, rates and a booking enquiry on their own page.
 *
 * Server-rendered from data the page already fetched (getNearbyHotels), so the
 * names are in the HTML. Renders nothing when there are no hotels.
 */
export default function StayNearby({ hotels, venueName, className = "" }) {
  if (!hotels?.length) return null;

  return (
    <section aria-labelledby="stay-nearby-heading" className={className}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="stay-nearby-heading" className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            <BedDouble size={22} aria-hidden="true" className="text-ox-blue dark:text-blue-300" />
            Stay nearby
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Hotels near {venueName} listed on OneXhib - send them a booking enquiry from their page.
          </p>
        </div>
      </div>

      <ul className="mt-5 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {hotels.map((h) => (
          <li key={h.id}>
            <HotelCard hotel={h} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function HotelCard({ hotel }) {
  const rate = formatRate(hotel.priceFrom, hotel.currency);
  const place = [hotel.city, hotel.country].filter(Boolean).join(", ");

  return (
    <Link
      href={hotelPath(hotel.slug)}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:border-ox-navy/30 hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-400/30"
    >
      <div className="relative aspect-[16/10] bg-gradient-to-br from-ox-navy via-ox-royal to-ox-blue">
        {hotel.image ? (
          <Image
            src={hotel.image.url}
            alt={hotel.name}
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 92vw"
            unoptimized={!hotel.image.optimized}
            className="object-cover"
          />
        ) : (
          <span aria-hidden="true" className="absolute inset-0 grid place-items-center text-white/60">
            <BedDouble size={36} strokeWidth={1.5} />
          </span>
        )}
        {hotel.km !== null ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            <MapPin size={12} aria-hidden="true" /> {formatKm(hotel.km)} away
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold leading-snug text-gray-900 dark:text-white">{hotel.name}</h3>
          {hotel.stars ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 text-sm font-semibold text-amber-600 dark:text-amber-300" aria-label={`${hotel.stars}-star hotel`}>
              <Star size={14} aria-hidden="true" className="fill-current" /> {hotel.stars}
            </span>
          ) : null}
        </div>
        {place ? <p className="text-sm text-gray-500 dark:text-gray-400">{place}</p> : null}
        {hotel.amenities.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {hotel.amenities.slice(0, 3).map((key) => {
              const a = amenityOf(key);
              if (!a) return null;
              const Icon = a.icon;
              return (
                <li key={key} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  <Icon size={11} aria-hidden="true" /> {a.label}
                </li>
              );
            })}
          </ul>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {rate ? (
              <>
                from <span className="font-bold text-gray-900 dark:text-white">{rate}</span>
                <span className="text-gray-500 dark:text-gray-400"> / night</span>
              </>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">Ask for rates</span>
            )}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-ox-blue dark:text-blue-300">
            View <ArrowRight size={14} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </span>
        </div>
      </div>
    </Link>
  );
}
