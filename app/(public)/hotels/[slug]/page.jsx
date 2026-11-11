import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BedDouble, CalendarDays, Clock, ExternalLink, Globe, Landmark, MapPin, Navigation, Phone, Star } from "lucide-react";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import ExhibitionCard from "@/components/public/ExhibitionCard";
import EnquiryForm from "@/components/public/EnquiryForm";
import CentresMap from "@/components/maps/CentresMap";
import JsonLd from "@/components/seo/JsonLd";

import { publicPageMetadata } from "@/lib/seo";
import { breadcrumbNode, graph, hotelNode } from "@/lib/jsonld";
import { exhibitionCentrePath, hotelPath } from "@/lib/routes";
import { directionsUrl } from "@/lib/google-maps";
import { getHotel } from "@/lib/public-api";
import { amenityOf, formatKm, formatRate } from "@/lib/hotels";

/**
 * One hotel listed by a HOTEL account: /hotels/<slug>
 *
 * Photos, rates, amenities and contact, the exhibition centres within 10 km
 * with the shows coming up at them, and a booking enquiry that is emailed to
 * the hotel (the address itself never reaches the page). Only approved hotels
 * have a page; anything else is a 404, from the API and so from here.
 *
 * Cached for an hour under HOTELS_TAG, which the dashboard and the admin
 * review page drop on every change (app/api/revalidate/hotels).
 */
export const revalidate = 3600;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await getHotel(slug);
  if (!data) return { title: "Hotel not found", robots: { index: false, follow: true } };
  const { hotel, centres } = data;
  const where = [hotel.city, hotel.country].filter(Boolean).join(", ");
  const near = centres[0] ? ` near ${centres[0].name}` : where ? ` in ${where}` : "";
  return publicPageMetadata({
    title: `${hotel.name}${near ? ` —${near}` : ""}`,
    description:
      (hotel.description && hotel.description.slice(0, 155)) ||
      `${hotel.name}${hotel.stars ? `, a ${hotel.stars}-star hotel` : ""}${near}. Photos, rates, amenities and booking enquiries for exhibition visitors.`,
    path: hotelPath(hotel.slug),
    images: hotel.images.length ? [hotel.images[0].url] : undefined,
  });
}

export default async function HotelPage({ params }) {
  const { slug } = await params;
  const data = await getHotel(slug);
  if (!data) notFound();
  const { hotel, centres, upcoming } = data;

  const path = hotelPath(hotel.slug);
  // No hotel directory yet, so the trail is Home > the hotel.
  const trail = [
    { name: "Home", path: "/" },
    { name: hotel.name, path },
  ];
  const hasLocation = hotel.lat !== null && hotel.lng !== null;
  const rate = formatRate(hotel.priceFrom, hotel.currency);
  const amenities = hotel.amenities.map(amenityOf).filter(Boolean);
  const [cover, ...gallery] = hotel.images;

  const points = [
    ...(hasLocation ? [{ id: hotel.id, name: hotel.name, lat: hotel.lat, lng: hotel.lng, subtitle: "This hotel" }] : []),
    ...centres
      .filter((c) => c.lat !== null && c.lng !== null)
      .map((c) => ({ id: c.slug, name: c.name, lat: c.lat, lng: c.lng, href: exhibitionCentrePath(c.slug) })),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        graph={graph(
          breadcrumbNode(trail),
          hotelNode(hotel, { path, amenityLabels: amenities.map((a) => a.label), priceRange: rate ? `From ${rate}` : "" })
        )}
      />
      <Breadcrumbs trail={trail} />

      {/* Gallery */}
      <div className={`grid gap-2 overflow-hidden rounded-3xl ${gallery.length ? "sm:grid-cols-[2fr_1fr]" : ""}`}>
        <div className="relative aspect-[16/10] bg-gradient-to-br from-ox-navy via-ox-royal to-ox-blue sm:aspect-auto sm:min-h-[22rem]">
          {cover ? (
            <Image src={cover.url} alt={hotel.name} fill priority sizes="(min-width: 640px) 66vw, 100vw" unoptimized={!cover.optimized} className="object-cover" />
          ) : (
            <span aria-hidden="true" className="absolute inset-0 grid place-items-center text-white/60">
              <BedDouble size={56} strokeWidth={1.25} />
            </span>
          )}
        </div>
        {gallery.length ? (
          // Rows of 1fr, not auto: the photos are `fill` images with no height of
          // their own, so they share the height the cover gives the row.
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 sm:grid-rows-[1fr_1fr]">
            {gallery.slice(0, 2).map((img, i) => (
              <div key={img.url} className="relative aspect-[4/3] sm:aspect-auto">
                <Image src={img.url} alt={`${hotel.name}, photo ${i + 2}`} fill sizes="(min-width: 640px) 33vw, 50vw" unoptimized={!img.optimized} className="object-cover" />
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {gallery.length > 2 ? (
        <ul className="mt-2 grid list-none grid-cols-3 gap-2 sm:grid-cols-6">
          {gallery.slice(2).map((img, i) => (
            <li key={img.url} className="relative aspect-square overflow-hidden rounded-xl">
              <Image src={img.url} alt={`${hotel.name}, photo ${i + 4}`} fill sizes="160px" unoptimized={!img.optimized} className="object-cover" />
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            {hotel.stars ? (
              <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`${hotel.stars}-star hotel`}>
                {Array.from({ length: hotel.stars }, (_, i) => <Star key={i} size={16} aria-hidden="true" className="fill-current" />)}
              </span>
            ) : null}
            {centres[0] ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ox-blue/10 px-3 py-1 text-xs font-semibold text-ox-blue dark:bg-blue-400/10 dark:text-blue-300">
                <Landmark size={13} aria-hidden="true" /> {formatKm(centres[0].km)} from {centres[0].name}
              </span>
            ) : null}
          </div>
          <h1 className="mt-3 text-3xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-[2.4rem] dark:text-white">{hotel.name}</h1>
          <p className="mt-4 flex items-start gap-2 text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
            <MapPin size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-gray-400" />
            <span>{hotel.address}</span>
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#enquiry-heading"
              className="inline-flex items-center gap-2 rounded-xl bg-ox-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-ox-navy-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ox-navy motion-reduce:transition-none"
            >
              Ask about rooms
            </a>
            {hasLocation ? (
              <a
                href={directionsUrl({ lat: hotel.lat, lng: hotel.lng })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-900 transition hover:border-ox-navy motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                <Navigation size={16} aria-hidden="true" /> Directions
              </a>
            ) : null}
            {hotel.website ? (
              <a
                href={hotel.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-900 transition hover:border-ox-navy motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                <Globe size={16} aria-hidden="true" /> Website <ExternalLink size={14} aria-hidden="true" className="text-gray-400" />
              </a>
            ) : null}
          </div>

          {hotel.description ? (
            <p className="mt-8 whitespace-pre-line text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">{hotel.description}</p>
          ) : null}

          {amenities.length ? (
            <section aria-labelledby="amenities-heading" className="mt-10">
              <h2 id="amenities-heading" className="text-lg font-bold text-gray-900 dark:text-white">Amenities</h2>
              <ul className="mt-4 grid list-none gap-3 sm:grid-cols-2">
                {amenities.map(({ key, label, icon: Icon }) => (
                  <li key={key} className="flex items-center gap-3 text-[15px] text-gray-700 dark:text-gray-300">
                    <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ox-navy/[0.06] text-ox-blue dark:bg-blue-400/10 dark:text-blue-300">
                      <Icon size={17} />
                    </span>
                    {label}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        {/* At a glance */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">{rate ? "Rates from" : "Rates"}</p>
            <p className="mt-0.5 text-2xl font-extrabold text-gray-900 dark:text-white">
              {rate ? (
                <>
                  {rate}
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400"> / night</span>
                </>
              ) : (
                <span className="text-lg font-semibold">On request</span>
              )}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4 text-sm dark:border-gray-800">
              {hotel.checkIn ? <Fact icon={Clock} label="Check-in" value={hotel.checkIn} /> : null}
              {hotel.checkOut ? <Fact icon={Clock} label="Check-out" value={hotel.checkOut} /> : null}
              {hotel.rooms ? <Fact icon={BedDouble} label="Rooms" value={hotel.rooms} /> : null}
              {hotel.phone ? (
                <Fact icon={Phone} label="Reservations" value={<a href={`tel:${hotel.phone.replace(/[^\d+]/g, "")}`} className="hover:underline">{hotel.phone}</a>} />
              ) : null}
            </dl>
          </div>
          {points.length ? <CentresMap points={points} className="h-72" label={`Map of ${hotel.name} and nearby exhibition centres`} /> : null}
        </aside>
      </div>

      {centres.length ? (
        <section aria-labelledby="venues-heading" className="mt-14">
          <h2 id="venues-heading" className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            <Landmark size={22} aria-hidden="true" className="text-ox-blue dark:text-blue-300" />
            Exhibition venues nearby
          </h2>
          <ul className="mt-5 grid list-none gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {centres.map((c) => (
              <li key={c.slug}>
                <Link
                  href={exhibitionCentrePath(c.slug)}
                  className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 transition hover:border-ox-navy/30 hover:shadow-md motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900"
                >
                  <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-ox-navy to-ox-blue text-white/70">
                    {c.image ? (
                      <Image src={c.image.url} alt="" fill sizes="56px" unoptimized={!c.image.optimized} className="object-cover" />
                    ) : (
                      <Landmark size={22} aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold text-gray-900 dark:text-white">{c.name}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{formatKm(c.km)} away{c.city ? ` · ${c.city}` : ""}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {upcoming.length ? (
        <section aria-labelledby="upcoming-heading" className="mt-14">
          <h2 id="upcoming-heading" className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            <CalendarDays size={22} aria-hidden="true" className="text-ox-blue dark:text-blue-300" />
            Upcoming exhibitions nearby
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Shows at the venues above, soonest first.</p>
          <ul className="mt-6 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {upcoming.map((exhibition) => (
              <li key={exhibition.id}>
                <ExhibitionCard exhibition={exhibition} className="h-full" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <EnquiryForm
        targetType="hotel"
        targetId={hotel.id}
        recipientLabel={hotel.name}
        listingName={hotel.name}
        topics="room availability, rates for your dates, group bookings, transfers to the venue"
        placeholder={`Hi, I'm visiting an exhibition nearby. Do you have a room from [check-in] to [check-out] for [guests] guests?`}
        className="mt-14"
      />
    </div>
  );
}

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-gray-400" />
      <div className="min-w-0">
        <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
        <dd className="font-semibold text-gray-900 dark:text-gray-100">{value}</dd>
      </div>
    </div>
  );
}
