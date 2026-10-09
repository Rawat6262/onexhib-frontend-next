import Link from "next/link";
import {
  Armchair,
  BookOpen,
  Gift,
  Hammer,
  Monitor,
  Printer,
  UserCheck,
} from "lucide-react";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";
import { breadcrumbNode, graph } from "@/lib/jsonld";
import { serviceCategoryPath } from "@/lib/routes";
import { getServiceDirectory } from "@/lib/services";

/**
 * Exhibition services: /exhibition-services
 *
 * The path is NOT /services — that belongs to the authenticated service-provider
 * area. "exhibition-services" is also the better URL for search: it matches the
 * query people actually type.
 *
 * WHY THIS PAGE IS A HUB AND NOT A LISTING
 * It used to render every provider on the platform inline — 498 names and towns
 * under seven headings, in one unbroken run. That made the single most common
 * task on the page (find a print shop near a show) a scroll past 370 providers
 * of unrelated services, with nothing to narrow by. The providers now live on a
 * page each, under /exhibition-services/[category], where there is a small
 * enough set for filters to be worth having.
 *
 * So this page is the doorway: the seven categories the platform supports, taken
 * verbatim from the service_name enum in Model/Service.model.js — the one fixed,
 * trustworthy taxonomy in the backend — each with its real provider count and a
 * link through.
 *
 * Nothing here is fabricated: every count is the length of the list the linked
 * page renders, so a visitor can check it by following the link.
 *
 * SEO value: these seven categories are the highest-confidence long-tail on the
 * site precisely because the taxonomy is fixed — "exhibition stall fabrication",
 * "furniture rental for exhibitions", "LED screen rental for trade shows" and so
 * on each map to a real, permanent page with real inventory behind it.
 */

export const revalidate = 300;

const TITLE = "Exhibition services — printing, fabrication, staffing";
const DESCRIPTION =
  "The services exhibitors need before a trade show: stall fabrication, furniture and LED rental, printing, protocol staff and corporate gifting.";

/**
 * Descriptions of what each service category covers. These describe the
 * category itself, not any particular provider, so they make no claim about
 * inventory. Keys must match SERVICE_CATEGORIES exactly.
 */
const CATEGORY_DETAIL = {
  Printing: {
    icon: Printer,
    body: "Banners, standees, backdrops, signage and stall graphics produced for exhibition stands.",
  },
  "Furniture Rental": {
    icon: Armchair,
    body: "Chairs, tables, counters, display units and lounge seating hired for the duration of an exhibition.",
  },
  "LED / TV Rental": {
    icon: Monitor,
    body: "LED walls, screens and displays rented for product demonstrations and stand branding.",
  },
  Fabrication: {
    icon: Hammer,
    body: "Custom stall design and build — structure, flooring, lighting and installation on site.",
  },
  "Protocol Staff": {
    icon: UserCheck,
    body: "Trained hosts, promoters and support staff to greet visitors and manage a stand during show hours.",
  },
  "Catalog Printing": {
    icon: BookOpen,
    body: "Product catalogues, brochures and leaflets printed for distribution to exhibition visitors.",
  },
  "Corporate Gifting": {
    icon: Gift,
    body: "Branded merchandise and giveaways prepared for visitors and prospects at an exhibition.",
  },
};

/**
 * INDEXABLE. This reverses the noindex that used to sit here, following the
 * instruction the previous note left behind: it was noindexed because
 * /api/getexhibitionservice returned zero records, which made this "category
 * explainers and nothing else — the thinnest indexable URL on the site".
 *
 * That condition no longer holds. The endpoint returns 498 providers across all
 * seven categories, each category now has its own page with between 27 and 132
 * of them, and this page is the hub that links them. The old note's own reversal
 * instructions were: flip the listings on, swap NOINDEX_FOLLOW back to
 * publicPageMetadata, and restore the sitemap entry. All three are done.
 *
 * TO REVERSE AGAIN, if the inventory ever disappears: swap this back to
 * pageMetadata with NOINDEX_FOLLOW and drop the services block from
 * app/sitemap.js, so the sitemap and the robots directive keep agreeing.
 */
export const metadata = publicPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PUBLIC_ROUTES.services,
});

export default async function ExhibitionServicesPage() {
  const { categories, total } = await getServiceDirectory();

  const trail = [
    { name: "Home", path: "/" },
    { name: "Exhibition services", path: PUBLIC_ROUTES.services },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd graph={graph(breadcrumbNode(trail))} />

      <Breadcrumbs trail={trail} />

      <header className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          Exhibition services
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          Preparing for an exhibition takes more than a stand.{" "}
          {total ? (
            <>
              OneXhib lists{" "}
              <strong className="font-semibold text-gray-900 dark:text-gray-100">
                {total} service providers
              </strong>{" "}
              across seven categories, so exhibitors can find the support they need for a show — and
              providers can be found by the exhibitors already planning one.
            </>
          ) : (
            <>
              OneXhib lists providers across seven service categories, so exhibitors can find the
              support they need for a show — and providers can be found by the exhibitors already
              planning one.
            </>
          )}
        </p>
      </header>

      <section aria-labelledby="categories-heading" className="mt-10">
        <h2 id="categories-heading" className="sr-only">
          Service categories
        </h2>
        <ul className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const detail = CATEGORY_DETAIL[category.name];
            const Icon = detail?.icon;

            /*
             * A category with no providers is NOT a link. Its page 404s by
             * design (see getServiceCategory), so linking it would put a
             * guaranteed dead end on the busiest page in this tier. It still
             * appears, because the seven categories describe what the platform
             * supports whether or not anyone has listed under one yet.
             */
            const card = (
              <>
                {Icon ? (
                  <span className="inline-flex rounded-xl bg-[#131C55]/10 p-2.5 text-[#131C55] dark:bg-blue-400/10 dark:text-blue-300">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                ) : null}
                <h3 className="mt-3.5 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-50">
                  {category.name}
                  {category.count ? (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      {category.count}
                    </span>
                  ) : null}
                </h3>
                {detail?.body ? (
                  <p className="mt-1.5 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
                    {detail.body}
                  </p>
                ) : null}
                {category.count ? (
                  <p className="mt-3 text-sm font-semibold text-[#131C55] dark:text-blue-300">
                    View {category.count} {category.count === 1 ? "provider" : "providers"} →
                  </p>
                ) : null}
              </>
            );

            return (
              <li key={category.name}>
                {category.count ? (
                  <Link
                    href={serviceCategoryPath(category.slug)}
                    className="ox-card flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-[#131C55]/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-600"
                  >
                    {card}
                  </Link>
                ) : (
                  <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                    {card}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Connects the services tier to the exhibitions tier, which is the
          relationship a visitor here actually has: they are preparing for a
          specific show. */}
      <section aria-labelledby="planning-heading" className="mt-14">
        <h2
          id="planning-heading"
          className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white"
        >
          Preparing for a specific exhibition?
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          Most of these services are booked against one show and one stand. Find the exhibition
          first — each listing carries its dates, venue and the companies already taking part.
        </p>
        <ul className="mt-5 flex list-none flex-wrap gap-2.5">
          <li>
            <Link href={PUBLIC_ROUTES.exhibitions} className={planningLink}>
              Upcoming exhibitions worldwide
            </Link>
          </li>
          <li>
            <Link href={PUBLIC_ROUTES.locations} className={planningLink}>
              Exhibitions by city and country
            </Link>
          </li>
          <li>
            <Link href={PUBLIC_ROUTES.categories} className={planningLink}>
              Exhibitions by industry
            </Link>
          </li>
        </ul>
      </section>

      <section className="mt-14 overflow-hidden rounded-3xl bg-gradient-to-br from-[#131C55] to-[#0E1B6B] px-6 py-12 sm:px-10">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Offer services to exhibitors?
        </h2>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-blue-100/90">
          Create an account and list the services you provide and the locations you cover, so
          exhibitors preparing for a show can find you.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-[15px] font-semibold text-[#131C55] transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
          >
            List your services
          </Link>
          <Link
            href={PUBLIC_ROUTES.exhibitions}
            className="inline-flex items-center justify-center rounded-xl border border-white/30 px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
          >
            Browse exhibitions
          </Link>
        </div>
      </section>
    </div>
  );
}

const planningLink =
  "ox-card inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 hover:border-[#131C55]/40 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-600";
