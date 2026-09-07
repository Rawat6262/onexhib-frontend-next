import Link from "next/link";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { Building2, Globe, MapPin } from "lucide-react";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import ProductCard from "@/components/public/ProductCard";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";
import { breadcrumbNode, companyNode, graph, itemListNode } from "@/lib/jsonld";
import { companyPath, exhibitionPath, productPath } from "@/lib/routes";
import { idFromSlug, isCanonicalSlug } from "@/lib/slug";
import { formatDateRange, formatLocation, toIsoDate, truncate } from "@/lib/format";
import { cityLandingPath } from "@/lib/routes";
import { resolvePlaceLinks } from "@/lib/locations";
import { getCompanyById, getExhibitionById, getProductsForCompany } from "@/lib/public-api";

/**
 * Public company detail: /company/[slug]
 *
 * Singular for the same reason as /exhibition/[slug] — the authenticated app
 * owns /companies/[id].
 *
 * Genuinely useful as an SEO page because it combines three things no other
 * page has together: what the business does, the exhibition it is taking part
 * in, and the products it has listed.
 *
 * Contact details are absent by design. /api/allcompanies and /api/companydetail
 * both return company_email, company_phone_number and pincode to anonymous
 * callers; lib/public-api.js strips all three before they reach this component.
 */

export const revalidate = 300;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

async function load(slugParam) {
  const id = idFromSlug(slugParam);
  if (!id) return null;
  const company = await getCompanyById(id);
  return company?.name ? company : null;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const company = await load(slug);
  if (!company) return { title: "Company not found", robots: { index: false, follow: true } };

  const description =
    truncate(company.about, 155) ||
    [company.name, company.nature ? `is a ${company.nature} business` : null, company.address ? `based in ${company.address}` : null]
      .filter(Boolean)
      .join(" ") + " listed on OneXhib.";

  return publicPageMetadata({
    title: [company.name, company.nature].filter(Boolean).join(" — "),
    description,
    path: companyPath(company.name, company.id),
    // A base64 data: URI is a valid <img> src but useless as og:image —
    // crawlers need a fetchable URL — so inline images are left out here.
    images: company.image && company.image.host !== "inline" ? [company.image.url] : undefined,
  });
}

export default async function CompanyDetailPage({ params }) {
  const { slug } = await params;
  const company = await load(slug);
  if (!company) notFound();

  if (!isCanonicalSlug(slug, company.name, company.id)) {
    permanentRedirect(companyPath(company.name, company.id));
  }

  // company.createdBy references the exhibition the company was listed under.
  // Fetched only to link back, and it fails soft to null.
  const [products, exhibition] = await Promise.all([
    getProductsForCompany(company.id),
    company.exhibitionId ? getExhibitionById(company.exhibitionId) : Promise.resolve(null),
  ]);

  // Several companies have no `about` text, which left the page with little
  // beyond a name. The exhibition it exhibits at is real, related data the
  // record already points to — surfacing its dates and city gives the page
  // something to say and gives the crawler a route into the location tier.
  const exhibitionPlace = exhibition ? formatLocation(exhibition, { includeVenue: false }) : "";
  const exhibitionDates = exhibition
    ? formatDateRange(exhibition.startDate, exhibition.endDate)
    : "";
  const exhibitionCity = exhibition ? await resolvePlaceLinks(exhibition) : null;

  const path = companyPath(company.name, company.id);
  const trail = [
    { name: "Home", path: "/" },
    { name: "Companies", path: PUBLIC_ROUTES.companies },
    { name: company.name, path },
  ];

  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        graph={graph(
          breadcrumbNode(trail),
          companyNode(company, { path }),
          products.items.length
            ? itemListNode(products.items.map((p) => productPath(p.name, p.id)), {
                name: `Products from ${company.name}`,
              })
            : null
        )}
      />

      <Breadcrumbs trail={trail} />

      <header className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {company.image ? (
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <Image
              src={company.image.url}
              alt={`${company.name} logo`}
              fill
              priority
              sizes="112px"
              unoptimized={!company.image.optimized}
              className="object-contain p-2"
            />
          </div>
        ) : null}

        <div className="min-w-0">
          {company.nature ? (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-[#131C55]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#131C55] dark:bg-blue-400/10 dark:text-blue-300">
              <Building2 size={12} aria-hidden="true" />
              {company.nature}
            </p>
          ) : null}

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            {company.name}
          </h1>

          <dl className="mt-4 space-y-2.5 text-[15px]">
            {company.address ? (
              <div className="flex items-start gap-3">
                <dt className="sr-only">Address</dt>
                <MapPin size={17} className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
                <dd className="text-gray-700 dark:text-gray-300">{company.address}</dd>
              </div>
            ) : null}

            {company.website ? (
              <div className="flex items-start gap-3">
                <dt className="sr-only">Website</dt>
                <Globe size={17} className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
                <dd>
                  {/* nofollow: these are user-submitted URLs, not editorial endorsements. */}
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300"
                  >
                    {company.website}
                  </a>
                </dd>
              </div>
            ) : null}

            {company.stallNo || company.hallNo ? (
              <div className="flex items-start gap-3">
                <dt className="sr-only">Stand</dt>
                <span className="mt-0.5 w-[17px] shrink-0" aria-hidden="true" />
                <dd className="text-gray-700 dark:text-gray-300">
                  {[company.hallNo ? `Hall ${company.hallNo}` : null, company.stallNo ? `Stall ${company.stallNo}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </dd>
              </div>
            ) : null}
          </dl>

          {exhibition ? (
            <p className="mt-5 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
              Exhibiting at{" "}
              <Link
                href={exhibitionPath(exhibition.name, exhibition.id)}
                className="font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300"
              >
                {exhibition.name}
              </Link>
              {exhibitionDates ? (
                <>
                  ,{" "}
                  <time dateTime={toIsoDate(exhibition.startDate)}>{exhibitionDates}</time>
                </>
              ) : null}
              {exhibitionPlace ? (
                <>
                  , in{" "}
                  {exhibitionCity?.citySlug ? (
                    <Link
                      href={cityLandingPath(exhibitionCity.countrySlug, exhibitionCity.citySlug)}
                      className="underline underline-offset-4 hover:text-[#131C55] dark:hover:text-white"
                    >
                      {exhibitionPlace}
                    </Link>
                  ) : (
                    exhibitionPlace
                  )}
                </>
              ) : null}
              .
            </p>
          ) : null}
        </div>
      </header>

      {company.about ? (
        <section className="mt-10 max-w-3xl">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            About {company.name}
          </h2>
          <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
            {company.about}
          </p>
        </section>
      ) : null}

      {products.items.length ? (
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Products from {company.name}
          </h2>
          <ul className="mt-6 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.items.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} className="h-full" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
