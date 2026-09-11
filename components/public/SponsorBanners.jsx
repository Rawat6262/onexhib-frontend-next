import Image from "next/image";

/**
 * Sponsor banner rail for the homepage.
 *
 * RENDERS NOTHING WHEN THERE IS NOTHING. /api/getbanners returns zero records
 * today, and a promotional strip with an empty frame in it looks broken in a
 * way that no banner at all does not. So this returns null on an empty list and
 * the homepage closes up around it — no placeholder, no skeleton, no reserved
 * space, and no change to the page's design to accommodate a slot that may stay
 * empty indefinitely.
 *
 * lib/newsroom.js drops malformed and expired records upstream, so anything
 * arriving here has a title, a sponsor, a usable https image and a live date.
 *
 * Banner images come from arbitrary sponsor hosts, so they render unoptimised —
 * next/image only processes hosts in remotePatterns, and turning the optimiser
 * loose on any URL a sponsor supplies would make it an open image proxy.
 */
export default function SponsorBanners({ banners }) {
  if (!banners?.length) return null;

  return (
    <section aria-labelledby="sponsors-heading" className="mt-12">
      <h2
        id="sponsors-heading"
        className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500"
      >
        Featured partners
      </h2>
      <ul className="mt-3 grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {banners.map((banner) => (
          <li
            key={banner.id}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="relative aspect-[16/6] w-full bg-gray-50 dark:bg-gray-950">
              <Image
                src={banner.picture}
                alt={`${banner.title} — ${banner.sponsor}`}
                fill
                unoptimized
                sizes="(min-width: 1024px) 340px, (min-width: 640px) 45vw, 90vw"
                className="object-contain"
              />
            </div>
            <div className="px-4 py-3">
              <p className="line-clamp-1 text-sm font-semibold text-gray-900 dark:text-gray-50">
                {banner.title}
              </p>
              <p className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-gray-500">
                {banner.sponsor}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
