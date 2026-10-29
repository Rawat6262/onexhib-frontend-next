import Image from "next/image";
import { notFound } from "next/navigation";
import { Building, CalendarDays, ExternalLink, Globe, History, Mail, MapPin, Navigation, Phone, Plane, TrainFront } from "lucide-react";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import ExhibitionCard from "@/components/public/ExhibitionCard";
import EmptyState from "@/components/public/EmptyState";
import CentresMap from "@/components/maps/CentresMap";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";
import { breadcrumbNode, graph, venueNode } from "@/lib/jsonld";
import { exhibitionCentrePath } from "@/lib/routes";
import { directionsUrl } from "@/lib/google-maps";
import { centreHasListings, getExhibitionCentre } from "@/lib/public-api";

/**
 * One exhibition centre: /exhibition-centres/<slug>
 *
 * Address, map with directions, the venue's details, the exhibitions linked
 * to it that have not ended yet, and the most recent ones held there. Shows
 * are linked by an admin (Admin → Exhibition centres).
 *
 * A venue with no linked shows and no description has nothing to say beyond
 * its address: the page still opens from a link, but is noindex and left out
 * of the directory and the sitemap (centreHasListings in lib/public-api.js).
 */
export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await getExhibitionCentre(slug);
  if (!data) return { title: "Exhibition centre not found", robots: { index: false, follow: true } };
  const { centre, upcoming, pastCount } = data;
  const where = [centre.city, centre.country].filter(Boolean).join(", ");
  const shows = upcoming.length
    ? ` and ${upcoming.length} upcoming exhibition${upcoming.length === 1 ? "" : "s"}`
    : pastCount
      ? ` and ${pastCount} past exhibition${pastCount === 1 ? "" : "s"}`
      : "";
  const meta = publicPageMetadata({
    title: `${centre.name}${where ? ` — ${where}` : ""}`,
    description:
      (centre.description && centre.description.slice(0, 155)) ||
      `${centre.name}${where ? ` in ${where}` : ""}: address, map location${shows || " and exhibitions"}.`,
    path: exhibitionCentrePath(centre.slug),
    images: centre.image ? [centre.image.url] : undefined,
  });
  if (!centreHasListings({ ...centre, upcomingCount: upcoming.length, pastCount })) {
    meta.robots = { index: false, follow: true };
  }
  return meta;
}

const numberFmt = new Intl.NumberFormat("en-IN");

export default async function ExhibitionCentrePage({ params }) {
  const { slug } = await params;
  const data = await getExhibitionCentre(slug);
  if (!data) notFound();
  const { centre, upcoming, past, pastCount } = data;

  const path = exhibitionCentrePath(centre.slug);
  const trail = [
    { name: "Home", path: "/" },
    { name: "Exhibition centres", path: PUBLIC_ROUTES.centres },
    { name: centre.name, path },
  ];
  const hasLocation = centre.lat !== null && centre.lng !== null;

  const facts = [
    centre.halls !== null ? { icon: Building, label: "Halls", value: numberFmt.format(centre.halls) } : null,
    centre.areaSqm !== null ? { icon: Building, label: "Exhibition area", value: `${numberFmt.format(centre.areaSqm)} sq m` } : null,
    centre.nearestAirport ? { icon: Plane, label: "Nearest airport", value: centre.nearestAirport } : null,
    centre.nearestStation ? { icon: TrainFront, label: "Nearest station", value: centre.nearestStation } : null,
    centre.phone ? { icon: Phone, label: "Phone", value: centre.phone, href: `tel:${centre.phone.replace(/[^\d+]/g, "")}` } : null,
    centre.email ? { icon: Mail, label: "Email", value: centre.email, href: `mailto:${centre.email}` } : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd graph={graph(breadcrumbNode(trail), venueNode(centre, { path }))} />
      <Breadcrumbs trail={trail} />

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-[2.4rem] dark:text-white">
            {centre.name}
          </h1>
          <p className="mt-4 flex items-start gap-2 text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
            <MapPin size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-gray-400" />
            <span>{centre.address}</span>
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {hasLocation ? (
              <a
                href={directionsUrl({ lat: centre.lat, lng: centre.lng })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#131C55] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0E1B6B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none"
              >
                <Navigation size={16} aria-hidden="true" /> Get directions
              </a>
            ) : null}
            {centre.website ? (
              <a
                href={centre.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-900 transition hover:border-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                <Globe size={16} aria-hidden="true" /> Website <ExternalLink size={14} aria-hidden="true" className="text-gray-400" />
              </a>
            ) : null}
          </div>

          {facts.length ? (
            <dl className="mt-8 grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {facts.map(({ icon: Icon, label, value, href }) => (
                <div key={label} className="flex items-start gap-3">
                  <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#131C55]/[0.06] text-[#2B3FB8] dark:bg-blue-400/10 dark:text-blue-300">
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</dt>
                    <dd className="break-words text-[15px] font-semibold leading-snug text-gray-900 dark:text-gray-100">
                      {href ? (
                        <a href={href} className="hover:underline">
                          {value}
                        </a>
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          ) : null}

          {centre.description ? (
            <p className="mt-8 whitespace-pre-line text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">{centre.description}</p>
          ) : null}
        </div>

        <div className="space-y-4">
          {centre.image ? (
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
              <Image
                src={centre.image.url}
                alt={centre.name}
                fill
                priority
                sizes="(min-width: 1024px) 480px, 92vw"
                unoptimized={!centre.image.optimized}
                className="object-cover"
              />
            </div>
          ) : null}
          {hasLocation ? (
            <CentresMap
              points={[{ id: centre.id, name: centre.name, lat: centre.lat, lng: centre.lng }]}
              className="h-72 sm:h-80"
              label={`Map showing ${centre.name}`}
            />
          ) : null}
        </div>
      </div>

      <section aria-labelledby="centre-shows" className="mt-14">
        <h2 id="centre-shows" className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-gray-50">
          <CalendarDays size={22} aria-hidden="true" className="text-[#2B3FB8] dark:text-blue-300" />
          Upcoming exhibitions at {centre.name}
        </h2>
        {upcoming.length ? (
          <ul className="mt-6 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {upcoming.map((exhibition) => (
              <li key={exhibition.id}>
                <ExhibitionCard exhibition={exhibition} className="h-full" />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6">
            <EmptyState>No upcoming exhibitions are listed at this venue yet.</EmptyState>
          </div>
        )}
      </section>

      {past.length ? (
        <section aria-labelledby="centre-past" className="mt-14">
          <h2 id="centre-past" className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-gray-50">
            <History size={22} aria-hidden="true" className="text-gray-400" />
            Past exhibitions at {centre.name}
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {pastCount > past.length
              ? `The ${past.length} most recent of ${pastCount} exhibitions held here.`
              : `${pastCount} ${pastCount === 1 ? "exhibition was" : "exhibitions were"} held here, most recent first.`}
          </p>
          <ul className="mt-6 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {past.map((exhibition) => (
              <li key={exhibition.id}>
                <ExhibitionCard exhibition={exhibition} className="h-full" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
