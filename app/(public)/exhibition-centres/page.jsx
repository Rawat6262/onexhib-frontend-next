import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Landmark, MapPin } from "lucide-react";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import EmptyState from "@/components/public/EmptyState";
import CentresMap from "@/components/maps/CentresMap";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";
import { breadcrumbNode, graph, itemListNode } from "@/lib/jsonld";
import { exhibitionCentrePath } from "@/lib/routes";
import { getExhibitionCentres } from "@/lib/public-api";

/**
 * The exhibition-centre directory: /exhibition-centres
 *
 * Every venue an admin has added (picked on Google Maps), on one map and as a
 * list grouped by country, each with its number of upcoming shows. A centre's
 * own page has its address, map, details and those shows.
 *
 * Refreshed hourly, and on demand through the CENTRES_TAG cache tag.
 */
export const revalidate = 3600;

export async function generateMetadata() {
  const { total } = await getExhibitionCentres();
  const meta = publicPageMetadata({
    title: "Exhibition centres and trade show venues",
    description:
      "Exhibition centres and trade fair venues with their address, map location and upcoming exhibitions. Find where a trade show is held and how to get there.",
    path: PUBLIC_ROUTES.centres,
  });
  // An empty directory is a thin page: keep it out of the index until it has venues.
  if (!total) meta.robots = { index: false, follow: true };
  return meta;
}

export default async function ExhibitionCentresPage() {
  const { items } = await getExhibitionCentres();

  const trail = [
    { name: "Home", path: "/" },
    { name: "Exhibition centres", path: PUBLIC_ROUTES.centres },
  ];

  // Countries with the most venues first, then A-Z.
  const byCountry = new Map();
  for (const c of items) {
    const key = c.country || "Other";
    if (!byCountry.has(key)) byCountry.set(key, []);
    byCountry.get(key).push(c);
  }
  const groups = [...byCountry.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  const points = items
    .filter((c) => c.lat !== null && c.lng !== null)
    .map((c) => ({
      id: c.id,
      name: c.name,
      lat: c.lat,
      lng: c.lng,
      href: exhibitionCentrePath(c.slug),
      subtitle: [c.city, c.country].filter(Boolean).join(", "),
    }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        graph={graph(
          breadcrumbNode(trail),
          items.length ? itemListNode(items.map((c) => exhibitionCentrePath(c.slug)), { name: "Exhibition centres" }) : null
        )}
      />
      <Breadcrumbs trail={trail} />

      <header className="max-w-3xl">
        <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-[2.6rem] dark:text-white">
          Exhibition centres
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-gray-600 sm:text-base dark:text-gray-400">
          The venues where trade shows are held, with their address, location on the map and the exhibitions coming up at each.
        </p>
      </header>

      {!items.length ? (
        <div className="mt-10">
          <EmptyState>Exhibition centres are being added. Check back soon.</EmptyState>
        </div>
      ) : (
        <>
          <div className="mt-8">
            <CentresMap points={points} className="h-[22rem] sm:h-[26rem]" label="Map of all exhibition centres" />
          </div>

          {groups.map(([country, centres]) => (
            <section key={country} aria-labelledby={`centres-${country}`} className="mt-12">
              <h2 id={`centres-${country}`} className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl dark:text-white">
                {country}
                <span className="ml-2 text-base font-medium text-gray-500 dark:text-gray-400">{centres.length}</span>
              </h2>
              <ul className="mt-5 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {centres.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={exhibitionCentrePath(c.slug)}
                      className="ox-card group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white hover:border-[#131C55]/30 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div className="relative aspect-[16/9] bg-gradient-to-br from-[#131C55] to-[#2B3FB8]">
                        {c.image ? (
                          <Image
                            src={c.image.url}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 92vw"
                            unoptimized={!c.image.optimized}
                            className="object-cover"
                          />
                        ) : (
                          <span aria-hidden="true" className="absolute inset-0 grid place-items-center text-white/80">
                            <Landmark size={34} />
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-4">
                        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-gray-900 group-hover:text-[#2B3FB8] dark:text-gray-50 dark:group-hover:text-blue-200">
                          {c.name}
                        </h3>
                        <p className="flex items-start gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                          <MapPin size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-gray-400" />
                          <span className="line-clamp-1">{[c.city, c.state].filter(Boolean).join(", ")}</span>
                        </p>
                        <p className="mt-auto flex items-center justify-between gap-2 pt-2 text-sm">
                          <span className="inline-flex items-center gap-1.5 font-medium text-gray-800 dark:text-gray-200">
                            <CalendarDays size={15} aria-hidden="true" className="text-gray-400" />
                            {c.upcomingCount ? `${c.upcomingCount} upcoming ${c.upcomingCount === 1 ? "show" : "shows"}` : "No upcoming shows listed"}
                          </span>
                          <ArrowRight size={16} aria-hidden="true" className="text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-[#2B3FB8] motion-reduce:transition-none" />
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
