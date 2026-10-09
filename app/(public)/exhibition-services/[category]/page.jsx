import Link from "next/link";
import { notFound } from "next/navigation";
import { Briefcase, CalendarDays, MapPin } from "lucide-react";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import ServiceDirectory from "@/components/public/ServiceDirectory";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";
import { breadcrumbNode, graph } from "@/lib/jsonld";
import { serviceCategoryPath } from "@/lib/routes";
import { getServiceCategory, getServiceDirectory } from "@/lib/services";

/**
 * Service category page: /exhibition-services/[category]
 *
 * WHY THESE PAGES NOW EXIST. The hub used to carry every provider in the
 * platform in one run-on list under seven headings — 498 names and towns, no
 * images, no way to narrow it. Finding a print shop in Ludhiana meant scrolling
 * past 370 providers of other services. Splitting by category gives each service
 * a page a visitor can actually work with, and gives the filters below something
 * small enough to be useful.
 *
 * It also replaces the note that used to sit on the hub arguing AGAINST per-
 * category pages. That argument was right at the time and is worth preserving:
 * a page per category would have held "a heading, one sentence, and a signup
 * CTA", which is seven thin pages competing with their own hub. What changed is
 * the inventory — the smallest category now holds a couple of dozen real providers
 * and the largest well over a hundred, so each page is a directory rather than a
 * restatement of one card.
 *
 * WHY THE WHOLE CATEGORY RENDERS AT ONCE, with no pagination. The largest page is
 * a little over a hundred cards; the images below it lazy-load, so the cost of
 * the long tail is a few kilobytes of markup rather than a hundred image requests. Paginating would also
 * break the filters, which work across the full set precisely because the full
 * set is already on the client — see the note in ServiceDirectory.
 */

export const revalidate = 3600;

/**
 * All seven categories are prerendered. The taxonomy is a frozen enum, so the
 * complete list of URLs is known at build time — there is nothing dynamic to
 * discover, and a visitor never pays for the first render.
 */
export async function generateStaticParams() {
  const { categories } = await getServiceDirectory();
  return categories
    .filter((category) => category.count)
    .map((category) => ({ category: category.slug }));
}

/**
 * Metadata built from the category's own numbers, so no two of the seven share a
 * title or description. The count is read from the records rendered below, which
 * keeps the claim checkable rather than aspirational.
 */
export async function generateMetadata({ params }) {
  const { category: slug } = await params;
  const category = await getServiceCategory(slug);
  if (!category) return { title: "Service not found", robots: { index: false, follow: true } };

  const label = category.name.toLowerCase();
  const topPlaces = category.cities.slice(0, 3).map((c) => c.value);

  return publicPageMetadata({
    title: `${category.name} services for exhibitions and trade shows`,
    description: topPlaces.length
      ? `${category.count} ${label} providers for exhibition stands and trade shows, including ${topPlaces.join(", ")}. Filter by name and location.`
      : `${category.count} ${label} providers for exhibition stands and trade shows. Filter by name and location.`,
    path: serviceCategoryPath(category.slug),
  });
}

export default async function ServiceCategoryPage({ params }) {
  const { category: slug } = await params;
  const category = await getServiceCategory(slug);
  // Not one of the seven, or one with no providers yet. A 404 beats a page whose
  // only content is an empty grid.
  if (!category) notFound();

  const { categories } = await getServiceDirectory();
  const siblings = categories.filter((c) => c.count && c.slug !== category.slug);

  const path = serviceCategoryPath(category.slug);
  const trail = [
    { name: "Home", path: "/" },
    { name: "Exhibition services", path: PUBLIC_ROUTES.services },
    { name: category.name, path },
  ];

  const topStates = category.states.slice(0, 4).map((s) => s.value);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/*
        Breadcrumbs only - deliberately NO ItemList of the providers.
        An ItemList names entities, and the only identifier these records carry
        publicly is a business name with no URL behind it (there is no provider
        detail page, by design - see ServiceProviderCard). Emitting a list of
        bare names would be structured data asserting more than the page can
        back up.
      */}
      <JsonLd graph={graph(breadcrumbNode(trail))} />

      <Breadcrumbs trail={trail} />

      <header className="max-w-3xl">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-[#131C55]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#131C55] dark:bg-blue-400/10 dark:text-blue-300">
          <Briefcase size={12} aria-hidden="true" />
          Exhibition service
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          {category.name} for exhibitions
        </h1>

        <p className="mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          <strong className="font-semibold text-gray-900 dark:text-gray-100">
            {category.count} {category.count === 1 ? "provider" : "providers"}
          </strong>{" "}
          offering {category.name.toLowerCase()} for exhibition stands and trade shows
          {topStates.length ? <>, across {topStates.join(", ")} and more</> : null}. Use the filters
          to narrow by name or location.
        </p>
      </header>

      <section aria-labelledby="providers-heading" className="mt-10">
        <h2 id="providers-heading" className="sr-only">
          {category.name} providers
        </h2>
        <ServiceDirectory
          providers={category.providers}
          letters={category.letters}
          states={category.states}
          cities={category.cities}
        />
      </section>

      {siblings.length ? (
        <section aria-labelledby="other-services-heading" className="mt-14">
          <h2
            id="other-services-heading"
            className="text-xl font-bold tracking-tight text-gray-900 dark:text-white"
          >
            Other exhibition services
          </h2>
          <p className="mt-2 text-[15px] text-gray-600 dark:text-gray-400">
            Preparing a stand usually takes more than one supplier.
          </p>
          <ul className="mt-4 flex list-none flex-wrap gap-2">
            {siblings.map((sibling) => (
              <li key={sibling.slug}>
                <Link href={serviceCategoryPath(sibling.slug)} className={chip}>
                  {sibling.name}
                  <span className="text-gray-400 dark:text-gray-500">{sibling.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="planning-heading" className="mt-14">
        <h2
          id="planning-heading"
          className="text-xl font-bold tracking-tight text-gray-900 dark:text-white"
        >
          Preparing for a specific exhibition?
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          Most of these services are booked against one show and one stand. Find the exhibition
          first — each listing carries its dates, venue and the companies already taking part.
        </p>
        <ul className="mt-4 flex list-none flex-wrap gap-2.5">
          <li>
            <Link href={PUBLIC_ROUTES.exhibitions} className={chip}>
              <CalendarDays size={13} className="text-gray-400" aria-hidden="true" />
              Upcoming exhibitions
            </Link>
          </li>
          <li>
            <Link href={PUBLIC_ROUTES.locations} className={chip}>
              <MapPin size={13} className="text-gray-400" aria-hidden="true" />
              Exhibitions by city and country
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}

const chip =
  "inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-gray-600 transition hover:border-[#131C55]/40 hover:text-[#131C55] motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-white";
