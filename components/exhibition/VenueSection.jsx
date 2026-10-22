import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Landmark, MapPin, Navigation } from "lucide-react";

import CentresMap from "@/components/maps/CentresMap";
import { directionsUrl } from "@/lib/google-maps";
import { exhibitionCentrePath } from "@/lib/routes";

/**
 * "Venue" on an exhibition page: the linked exhibition centre with its photo,
 * address, a live map, directions, and a link to the centre's own page (its
 * details and every other show held there).
 *
 * Rendered only for shows linked to a centre - an unlinked show has a typed
 * venue and no coordinates, and a map guessed from free text could be wrong.
 */
export default function VenueSection({ centre, exhibitionName, className = "" }) {
  if (!centre?.slug) return null;
  const path = exhibitionCentrePath(centre.slug);
  const place = [centre.city, centre.state, centre.country].filter(Boolean).join(", ");
  const hasMap = centre.lat !== null && centre.lng !== null;

  return (
    <section aria-labelledby="venue-heading" className={className}>
      <h2 id="venue-heading" className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        <Landmark size={22} aria-hidden="true" className="text-[#2B3FB8] dark:text-blue-300" />
        Venue
      </h2>

      <div className="mt-5 grid overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] dark:border-gray-800 dark:bg-gray-900">
        {/* Details */}
        <div className="flex flex-col">
          <div className="relative aspect-[16/8] bg-gradient-to-br from-[#131C55] via-[#1B2A7A] to-[#2B3FB8]">
            {centre.image ? (
              <Image
                src={centre.image.url}
                alt={centre.name}
                fill
                sizes="(min-width: 1024px) 520px, 100vw"
                unoptimized={!centre.image.optimized}
                className="object-cover"
              />
            ) : (
              <span aria-hidden="true" className="absolute inset-0 grid place-items-center text-white/70">
                <Landmark size={44} strokeWidth={1.5} />
              </span>
            )}
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <p className="absolute bottom-4 left-5 right-5 text-xl font-bold leading-tight text-white drop-shadow sm:text-2xl">{centre.name}</p>
          </div>

          <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
            {centre.address ? (
              <p className="flex items-start gap-2.5 text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
                <MapPin size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-[#2B3FB8] dark:text-blue-300" />
                <span>{centre.address}</span>
              </p>
            ) : place ? (
              <p className="flex items-start gap-2.5 text-[15px] text-gray-700 dark:text-gray-300">
                <MapPin size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-[#2B3FB8] dark:text-blue-300" />
                <span>{place}</span>
              </p>
            ) : null}

            <p className="text-sm text-gray-500 dark:text-gray-400">
              {exhibitionName} takes place at {centre.name}
              {centre.city ? `, ${centre.city}` : ""}.
            </p>

            <div className="mt-auto flex flex-wrap gap-3 pt-2">
              {hasMap ? (
                <a
                  href={directionsUrl({ lat: centre.lat, lng: centre.lng })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#131C55] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0E1B6B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none"
                >
                  <Navigation size={16} aria-hidden="true" /> Get directions
                </a>
              ) : null}
              <Link
                href={path}
                className="group inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:border-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                About this venue
                <ArrowRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </Link>
            </div>
          </div>
        </div>

        {/* Map */}
        {hasMap ? (
          // A definite box for the map: a fixed height on phones, and on wide
          // screens an absolutely-filled cell, so Google measures its final size
          // (a percentage height inside a grid row drew only a strip of tiles).
          <div className="relative h-80 border-t border-gray-200 lg:h-auto lg:min-h-[24rem] lg:border-l lg:border-t-0 dark:border-gray-800">
            <div className="absolute inset-0">
              <CentresMap
                points={[{ id: centre.slug, name: centre.name, lat: centre.lat, lng: centre.lng }]}
                className="h-full"
                framed={false}
                label={`Map showing ${centre.name}`}
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
