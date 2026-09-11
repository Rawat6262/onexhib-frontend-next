import Link from "next/link";

import CardMedia from "@/components/public/CardMedia";
import { exhibitionPath } from "@/lib/routes";

/**
 * Editorial hero for /blog.
 *
 * THE IMAGERY IS REAL LISTINGS, NOT STOCK
 * The collage shows actual upcoming exhibitions, with the images those records
 * carry, each linking to its own page. That is the one kind of photography this
 * page can use honestly: the articles are written from the catalogue, so the
 * catalogue illustrates them. A purchased shot of an anonymous trade-show floor
 * would be decoration pretending to be evidence.
 *
 * It reuses CardMedia, so these thumbnails inherit the same fallback, sizing and
 * optimisation rules as every other card on the site - including the branded
 * placeholder when a record has no usable image.
 *
 * Hidden below lg. On a phone the headline, standfirst and stat row already fill
 * the first screen, and three more images would push the articles - the actual
 * point of the page - below the fold.
 */
export default function BlogHero({ stats, items = [] }) {
  const tiles = items.filter((e) => e?.image).slice(0, 3);

  return (
    <header className="relative overflow-hidden border-b border-gray-200 bg-gradient-to-b from-[#F7F8FC] to-white dark:border-gray-800 dark:from-gray-950 dark:to-gray-950">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.6] dark:opacity-[0.25]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(19,28,85,.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(19,28,85,.05) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)",
        }}
      />

      <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:py-20">
        <div className="ox-reveal">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#131C55] dark:text-blue-300">
            <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-[#131C55] dark:bg-blue-300" />
            OneXhib Insights
          </p>

          <h1 className="mt-4 text-3xl font-bold leading-[1.1] tracking-tight text-gray-900 sm:text-4xl lg:text-5xl dark:text-white">
            Insights from the world of exhibitions
          </h1>

          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-gray-600 sm:text-[17px] dark:text-gray-400">
            Every article here is counted from the exhibitions listed on OneXhib — where
            they happen, when the season peaks, and what that means if you are deciding
            where to exhibit next.
          </p>

          {stats?.length ? (
            <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
              {stats.map(({ value, label }) => (
                <div key={label}>
                  <dt className="sr-only">{label}</dt>
                  <dd>
                    <span className="block text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
                      {value.toLocaleString("en-US")}
                    </span>
                    <span className="text-[13px] text-gray-600 dark:text-gray-400">{label}</span>
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {tiles.length >= 2 ? (
          <div aria-label="Exhibitions currently listed on OneXhib" className="relative hidden lg:block">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-[#131C55]/[0.10] via-transparent to-transparent blur-2xl dark:from-blue-500/15"
            />
            <ul className="relative grid grid-cols-5 grid-rows-6 gap-3 [&>li]:overflow-hidden [&>li]:rounded-2xl">
              <li className="col-span-3 row-span-4 shadow-lg">
                <Tile item={tiles[0]} priority sizes="340px" />
              </li>
              <li className="col-span-2 row-span-3 shadow-md">
                <Tile item={tiles[1]} sizes="220px" />
              </li>
              {tiles[2] ? (
                <li className="col-span-2 col-start-4 row-span-3 row-start-4 shadow-md">
                  <Tile item={tiles[2]} sizes="220px" />
                </li>
              ) : null}
              <li className="col-span-3 row-span-2 row-start-5 flex items-center rounded-2xl border border-gray-200 bg-white/80 px-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/70">
                <p className="text-[13px] leading-snug text-gray-600 dark:text-gray-400">
                  Live listings from the OneXhib catalogue — the same records these
                  articles are counted from.
                </p>
              </li>
            </ul>
          </div>
        ) : null}
      </div>
    </header>
  );
}

function Tile({ item, priority = false, sizes }) {
  return (
    <Link
      href={exhibitionPath(item.name, item.id)}
      className="group relative block h-full w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:focus-visible:outline-blue-300"
    >
      <CardMedia
        image={item.image}
        alt={item.name}
        label={item.name}
        aspect="h-full"
        sizes={sizes}
        priority={priority}
        className="h-full transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transform-none"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3"
      >
        <span className="line-clamp-2 text-[12px] font-medium leading-snug text-white">
          {item.name}
        </span>
      </span>
    </Link>
  );
}
