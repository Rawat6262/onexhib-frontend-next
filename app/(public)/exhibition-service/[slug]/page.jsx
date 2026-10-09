import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Briefcase, MapPin } from "lucide-react";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import CardMedia from "@/components/public/CardMedia";
import ServiceContactPanel from "@/components/public/ServiceContactPanel";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";
import { breadcrumbNode, graph } from "@/lib/jsonld";
import { serviceCategoryPath, servicePath } from "@/lib/routes";
import { getServiceById, getServiceSiblings } from "@/lib/services";
import { idFromSlug, isCanonicalSlug } from "@/lib/slug";

/**
 * One provider's listing: /exhibition-service/[slug]
 *
 * WHAT IS ACTUALLY ON THIS PAGE, AND WHY IT IS NOT MORE. A Service record holds
 * eight meaningful fields: owner, business name, category, country, state, city,
 * street address, mobile number, and an image. Six of those are already on the
 * card in the category grid. The page therefore adds exactly two things — the
 * address and the phone number — and both sit behind a session in
 * ServiceContactPanel. There is no description, no gallery, no pricing and no
 * opening hours because the schema has nowhere to put them; inventing sections
 * to fill the page would mean writing claims about a business on its behalf.
 *
 * WHY THE CONTACT DETAILS ARE GATED. Publishing them would put ~500 providers'
 * phone numbers on crawlable pages, which is exactly what address-harvesters
 * collect, and they are the providers' numbers rather than ours. So the page is
 * public and indexable — a real page for "AMAN FURNITURE HOUSE furniture rental
 * Barnala" — and reaching the provider takes an account. That also makes the one
 * gated thing the one thing worth signing up for.
 *
 * NO PUBLIC SINGLE-SERVICE FETCH. The record is resolved out of the directory
 * this tier already loads, so no endpoint has to exist that returns one
 * provider's full document to the public. /api/getexhibitionservicebyid used to
 * be exactly that and is now behind a session and scoped to the owner.
 */

export const revalidate = 300;

/*
 * Not prerendered. There are ~500 of these and they turn over as providers sign
 * up, so they render on demand and are then cached for the revalidate window —
 * the same treatment the company and product detail pages get, for the same
 * reason.
 */
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const entry = await getServiceById(idFromSlug(slug));
  if (!entry) return { title: "Provider not found", robots: { index: false, follow: true } };

  const { provider, categoryName } = entry;
  const place = [provider.city, provider.state, provider.country].filter(Boolean).join(", ");

  return publicPageMetadata({
    title: place
      ? `${provider.name} — ${categoryName} in ${provider.city || provider.state}`
      : `${provider.name} — ${categoryName}`,
    description: place
      ? `${provider.name} provides ${categoryName.toLowerCase()} for exhibitions and trade shows in ${place}.`
      : `${provider.name} provides ${categoryName.toLowerCase()} for exhibitions and trade shows.`,
    path: servicePath(provider.name, provider.id),
  });
}

export default async function ServiceProviderPage({ params }) {
  const { slug } = await params;
  const id = idFromSlug(slug);
  const entry = await getServiceById(id);
  if (!entry) notFound();

  const { provider, categoryName, categorySlug } = entry;

  /*
   * One canonical URL per listing. A name that has since been edited leaves old
   * links pointing at a stale slug carrying the right id; redirecting rather
   * than rendering both keeps the ranking signal on one URL instead of splitting
   * it. Same treatment as the company and product pages.
   */
  if (!isCanonicalSlug(slug, provider.name, provider.id)) {
    permanentRedirect(servicePath(provider.name, provider.id));
  }

  const siblings = await getServiceSiblings(provider.id);
  const place = [provider.city, provider.state, provider.country].filter(Boolean).join(", ");

  const path = servicePath(provider.name, provider.id);
  const trail = [
    { name: "Home", path: "/" },
    { name: "Exhibition services", path: PUBLIC_ROUTES.services },
    { name: categoryName, path: serviceCategoryPath(categorySlug) },
    { name: provider.name, path },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/*
        Breadcrumbs only — deliberately NO LocalBusiness node. That schema's
        useful properties are `address` and `telephone`, and both are gated here;
        emitting one without them would be a structured-data claim the page does
        not support, and emitting one WITH them would publish through JSON-LD
        exactly what the gate exists to withhold.
      */}
      <JsonLd graph={graph(breadcrumbNode(trail))} />

      <Breadcrumbs trail={trail} />

      <div className="mt-2 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
            <CardMedia
              image={provider.image}
              alt={provider.name}
              label={provider.name}
              aspect="aspect-[16/9]"
              priority
              sizes="(min-width: 1024px) 640px, 100vw"
            />
          </div>

          <header className="mt-6">
            <Link
              href={serviceCategoryPath(categorySlug)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#131C55]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#131C55] transition hover:bg-[#131C55]/20 motion-reduce:transition-none dark:bg-blue-400/10 dark:text-blue-300"
            >
              <Briefcase size={12} aria-hidden="true" />
              {categoryName}
            </Link>

            {/* Plain React text. A provider-supplied string never goes near an HTML sink. */}
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
              {provider.name}
            </h1>

            <p className="mt-3 flex items-center gap-1.5 text-[15px] text-gray-600 dark:text-gray-400">
              <MapPin size={15} className="text-gray-400" aria-hidden="true" />
              {place || "Location not stated"}
            </p>

            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
              {provider.name} offers {categoryName.toLowerCase()} for exhibition stands and trade
              shows
              {provider.city ? <> in and around {provider.city}</> : null}.
            </p>
          </header>

          {siblings.length ? (
            <section aria-labelledby="also-offers-heading" className="mt-10">
              <h2
                id="also-offers-heading"
                className="text-lg font-bold tracking-tight text-gray-900 dark:text-white"
              >
                Also offered by this provider
              </h2>
              <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
                {/* Matched on the owner account, not on the business name — two
                    unrelated shops can share a name, and presenting one as the
                    other's second listing would be wrong undetectably. */}
                Listed under their account, so one supplier can cover more of the stand.
              </p>
              <ul className="mt-4 grid list-none gap-3 sm:grid-cols-2">
                {siblings.map((sibling) => (
                  <li key={sibling.provider.id}>
                    <Link
                      href={servicePath(sibling.provider.name, sibling.provider.id)}
                      className="ox-card flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 transition hover:border-[#131C55]/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-600"
                    >
                      <span className="w-14 shrink-0 overflow-hidden rounded-lg">
                        <CardMedia
                          image={sibling.provider.image}
                          alt={sibling.provider.name}
                          label={sibling.provider.name}
                          aspect="aspect-square"
                          sizes="56px"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-gray-900 dark:text-gray-50">
                          {sibling.categoryName}
                        </span>
                        <span className="block truncate text-xs text-gray-600 dark:text-gray-400">
                          {[sibling.provider.city, sibling.provider.state]
                            .filter(Boolean)
                            .join(", ") || sibling.provider.name}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        {/* The sidebar on desktop, directly under the heading on a phone — where
            it is the first thing after the name, which is what the visitor came
            for. */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <ServiceContactPanel serviceId={provider.id} />

          <Link
            href={serviceCategoryPath(categorySlug)}
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-[#131C55]/40 hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-white"
          >
            All {categoryName.toLowerCase()} providers
          </Link>
        </aside>
      </div>
    </div>
  );
}
