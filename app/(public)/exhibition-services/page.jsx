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
import { SERVICE_CATEGORIES } from "@/lib/public-api";

/**
 * Exhibition services: /exhibition-services
 *
 * The path is NOT /services — that belongs to the authenticated service-provider
 * area. "exhibition-services" is also the better URL for search: it matches the
 * query people actually type.
 *
 * WHY THIS PAGE SHOWS CATEGORIES AND NOT PROVIDERS
 * /api/getexhibitionservice currently returns exactly one record, and that
 * record is test data (full_name "asfa", country "Antigua And Barbuda").
 * Rendering it as a provider listing would present junk as real inventory and
 * make the marketplace look empty at the same time. So this page documents the
 * seven service categories the platform genuinely supports — taken verbatim
 * from the service_name enum in Model/Service.model.js, which is the one fixed,
 * trustworthy taxonomy in the whole backend — and invites providers to list.
 *
 * Nothing here is fabricated: no provider names, no counts, no coverage claims.
 * When real providers exist, flip SHOW_PROVIDER_LISTINGS and the listing block
 * below renders them; that is the only change needed.
 *
 * SEO value: these seven categories are the highest-confidence long-tail on the
 * site precisely because the taxonomy is fixed — "exhibition stall fabrication",
 * "furniture rental for exhibitions", "LED screen rental for trade shows" and
 * so on all map to a real, permanent section of this page.
 */

export const revalidate = 300;

/**
 * Flip to true once /api/getexhibitionservice holds genuine provider records.
 * Until then the page is a category directory, not an empty marketplace.
 */
const SHOW_PROVIDER_LISTINGS = false;

const TITLE = "Exhibition services — printing, fabrication, furniture and staffing";
const DESCRIPTION =
  "The services exhibitors need to prepare for a trade show: stall fabrication, furniture and LED rental, printing, catalog printing, protocol staff and corporate gifting.";

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

export const metadata = publicPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PUBLIC_ROUTES.services,
});

export default function ExhibitionServicesPage() {
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
          Preparing for an exhibition takes more than a stand. OneXhib lists providers across seven
          service categories, so exhibitors can find the support they need for a show — and
          providers can be found by the exhibitors already planning one.
        </p>
      </header>

      <section aria-labelledby="categories-heading" className="mt-10">
        <h2 id="categories-heading" className="sr-only">
          Service categories
        </h2>
        <ul className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_CATEGORIES.map((name) => {
            const detail = CATEGORY_DETAIL[name];
            const Icon = detail?.icon;
            return (
              <li
                key={name}
                className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
              >
                {Icon ? (
                  <span className="inline-flex rounded-xl bg-[#131C55]/10 p-2.5 text-[#131C55] dark:bg-blue-400/10 dark:text-blue-300">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                ) : null}
                <h3 className="mt-3.5 text-base font-semibold text-gray-900 dark:text-gray-50">
                  {name}
                </h3>
                {detail?.body ? (
                  <p className="mt-1.5 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
                    {detail.body}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {SHOW_PROVIDER_LISTINGS ? <ProviderListings /> : null}

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

/**
 * Live provider listings, grouped by the enum category.
 *
 * Unreferenced while SHOW_PROVIDER_LISTINGS is false. Kept because the page was
 * specified to be structurally ready for real inventory — turning it on is a
 * one-line change rather than a rewrite. Note that the projection in
 * lib/public-api.js already drops full_name, mobile_number and address, so a
 * provider is shown as a service and a location, never as a person to phone.
 */
async function ProviderListings() {
  const { getServices } = await import("@/lib/public-api");
  const { items } = await getServices();
  if (!items.length) return null;

  const byCategory = SERVICE_CATEGORIES.map((name) => ({
    name,
    providers: items.filter((s) => s.service === name),
  })).filter((group) => group.providers.length);

  if (!byCategory.length) return null;

  return (
    <section aria-labelledby="providers-heading" className="mt-14">
      <h2
        id="providers-heading"
        className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white"
      >
        Service providers
      </h2>
      <div className="mt-6 space-y-8">
        {byCategory.map(({ name, providers }) => (
          <div key={name}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {name}
            </h3>
            <ul className="mt-3 flex list-none flex-wrap gap-2">
              {providers.map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                >
                  {[p.city, p.state, p.country].filter(Boolean).join(", ") || "Location not stated"}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
