import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Landmark, LayoutGrid, MapPin, Ruler } from "lucide-react";

import { exhibitionCentrePath } from "@/lib/routes";

/**
 * One venue in a grid: the /exhibition-centres directory and the homepage's
 * venues section. Takes a centre from toPublicCentre (lib/public-api).
 */
export default function CentreCard({ centre: c }) {
  const place = [c.city, c.state, c.country].filter(Boolean).join(", ");
  const facts = [
    c.halls ? { icon: LayoutGrid, text: `${c.halls} ${c.halls === 1 ? "hall" : "halls"}` } : null,
    c.areaSqm ? { icon: Ruler, text: `${c.areaSqm.toLocaleString("en-US")} m²` } : null,
  ].filter(Boolean);

  return (
    <Link
      href={exhibitionCentrePath(c.slug)}
      className="ox-card group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white hover:border-[#131C55]/30 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
    >
      {/* Most venues have no photo yet: a shorter banner with the city keeps
          the grid from turning into a wall of identical blue blocks. */}
      <div
        className={`relative bg-gradient-to-br from-[#131C55] to-[#2B3FB8] ${c.image ? "aspect-[16/9]" : "aspect-[16/6]"}`}
      >
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
          <span aria-hidden="true" className="absolute inset-0 flex items-end justify-between gap-3 p-4">
            <span className="line-clamp-1 text-lg font-bold tracking-tight text-white/90">{c.city || c.country}</span>
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-white/85 ring-1 ring-white/20">
              <Landmark size={22} />
            </span>
          </span>
        )}
        {c.upcomingCount ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-[#131C55] shadow-sm">
            <CalendarDays size={13} aria-hidden="true" />
            {c.upcomingCount} upcoming
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-gray-900 group-hover:text-[#2B3FB8] dark:text-gray-50 dark:group-hover:text-blue-200">
          {c.name}
        </h3>
        {place ? (
          <p className="flex items-start gap-1.5 text-sm text-gray-600 dark:text-gray-400">
            <MapPin size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-gray-400" />
            <span className="line-clamp-1">{place}</span>
          </p>
        ) : null}
        {c.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{c.description}</p>
        ) : null}
        {facts.length ? (
          <ul className="flex list-none flex-wrap gap-1.5">
            {facts.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                <Icon size={12} aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-3 text-sm dark:border-gray-800">
          <span className="text-gray-500 dark:text-gray-400">
            {c.pastCount ? `${c.pastCount} past ${c.pastCount === 1 ? "show" : "shows"}` : " "}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-[#131C55] dark:text-blue-200">
            View venue
            <ArrowRight
            size={16}
            aria-hidden="true"
              className="transition group-hover:translate-x-0.5 motion-reduce:transition-none"
            />
          </span>
        </p>
      </div>
    </Link>
  );
}
