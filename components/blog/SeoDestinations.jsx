import Link from "next/link";
import { ArrowRight, Building2, MapPin } from "lucide-react";

import CardMedia from "@/components/public/CardMedia";
import { categoryLandingPath, cityLandingPath, countryLandingPath } from "@/lib/routes";
import { PUBLIC_ROUTES } from "@/lib/seo";

/**
 * The blog's discovery hub: the landing pages a reader is most likely to want
 * next, presented editorially rather than as a link dump.
 *
 * WHY ONLY A HANDFUL
 * The catalogue has 31 country, 53 city and 10 industry landing pages. Listing
 * them all would turn the foot of an article into a directory, which helps
 * nobody and reads as link-building. The selection is the largest few by
 * listing count - a rule that is deterministic, explainable, and self-updating
 * as the data moves.
 *
 * EVERY DESTINATION EXISTS
 * The rows come from getLocationIndex/getCategoryIndex, which only include a
 * place or sector once it clears MIN_COUNTRY / MIN_CITY / MIN_CATEGORY - the
 * same thresholds that decide whether the landing page is generated at all. So
 * a card can never point at a page that was never built, and paths are composed
 * with the shared route helpers rather than typed by hand.
 *
 * Counts are rendered only when present. A missing figure drops out; it never
 * becomes a zero.
 */
export default function SeoDestinations({ countries = [], industries = [], cities = [] }) {
  if (!countries.length && !industries.length) return null;

  return (
    <div className="space-y-10">
      {/* ---------- Countries: the visual tier ---------- */}
      {countries.length ? (
        <div>
          <h3 className="text-[15px] font-bold tracking-tight text-gray-900 dark:text-gray-50">
            Browse by country
          </h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-gray-600 dark:text-gray-400">
            The countries with the most exhibitions listed right now.
          </p>

          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {countries.map((c, i) => (
              <li key={c.slug} className="ox-reveal">
                <Link
                  href={countryLandingPath(c.slug)}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#131C55] motion-reduce:hover:translate-y-0 dark:border-gray-800 dark:bg-gray-900 dark:focus-visible:outline-blue-300"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    <CardMedia
                      image={c.image}
                      alt={`An exhibition listed in ${c.country}`}
                      label={c.country}
                      aspect="aspect-[16/10]"
                      sizes="(min-width: 1024px) 340px, (min-width: 640px) 45vw, 90vw"
                      priority={i === 0}
                      className="transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transform-none"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent"
                    />
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                      <span className="text-[17px] font-bold leading-tight text-white">
                        Exhibitions in {c.country}
                      </span>
                      <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[12px] font-semibold tabular-nums text-white ring-1 ring-inset ring-white/25 backdrop-blur">
                        {c.count.toLocaleString("en-US")}
                      </span>
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <p className="text-[14px] leading-relaxed text-gray-600 dark:text-gray-400">
                      Upcoming exhibitions and trade shows listed in {c.country}
                      {c.cityCount ? `, across ${c.cityCount} ${c.cityCount === 1 ? "city" : "cities"}` : ""}.
                    </p>

                    <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-[13px] font-semibold text-[#131C55] dark:text-blue-300">
                      Explore {c.country}
                      <ArrowRight
                        size={14}
                        aria-hidden="true"
                        className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                      />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ---------- Industries ---------- */}
      {industries.length ? (
        <div>
          <h3 className="text-[15px] font-bold tracking-tight text-gray-900 dark:text-gray-50">
            Browse by industry
          </h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-gray-600 dark:text-gray-400">
            Sectors with enough listings to have their own page.
          </p>

          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {industries.map((c) => (
              <li key={c.slug}>
                <Link
                  href={categoryLandingPath(c.slug)}
                  className="group flex h-full items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-[#131C55]/30 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#131C55] dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/60 dark:focus-visible:outline-blue-300"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#131C55]/[0.06] text-[#131C55] transition-colors group-hover:bg-[#131C55] group-hover:text-white dark:bg-blue-400/10 dark:text-blue-300 dark:group-hover:bg-blue-400 dark:group-hover:text-gray-950"
                  >
                    <Building2 size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-baseline gap-2">
                      <span className="text-[15px] font-semibold text-gray-900 dark:text-gray-50">
                        {c.label}
                      </span>
                      <span className="text-[12px] tabular-nums text-gray-400 dark:text-gray-500">
                        {c.count.toLocaleString("en-US")}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
                      Upcoming exhibitions connected with the {c.label.toLowerCase()} sector.
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ---------- Cities: a plain row, deliberately ---------- */}
      {cities.length ? (
        <div>
          <h3 className="text-[15px] font-bold tracking-tight text-gray-900 dark:text-gray-50">
            Browse by city
          </h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-gray-600 dark:text-gray-400">
            The busiest exhibition cities in the catalogue.
          </p>

          <ul className="mt-4 flex flex-wrap gap-2">
            {cities.map((c) => (
              <li key={`${c.countrySlug}/${c.slug}`}>
                <Link
                  href={cityLandingPath(c.countrySlug, c.slug)}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:border-[#131C55]/30 hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-blue-300 dark:focus-visible:outline-blue-300"
                >
                  <MapPin size={13} aria-hidden="true" className="text-gray-400 dark:text-gray-500" />
                  {c.city}
                  <span className="tabular-nums text-gray-400 dark:text-gray-500">{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-[13px] text-gray-500 dark:text-gray-400">
            <Link
              href={PUBLIC_ROUTES.locations}
              className="font-semibold text-[#131C55] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:text-blue-300 dark:focus-visible:outline-blue-300"
            >
              See all locations
            </Link>{" "}
            for the full list of countries and cities.
          </p>
        </div>
      ) : null}
    </div>
  );
}
