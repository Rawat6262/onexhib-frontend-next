import Link from "next/link";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { CalendarDays, MapPin, Building2, FileText, Tag } from "lucide-react";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import CompanyCard from "@/components/public/CompanyCard";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";
import { breadcrumbNode, eventNode, graph, itemListNode } from "@/lib/jsonld";
import { companyPath, exhibitionPath } from "@/lib/routes";
import { idFromSlug, isCanonicalSlug } from "@/lib/slug";
import { formatDateRange, formatLocation, toIsoDate, truncate } from "@/lib/format";
import { getCompaniesForExhibition, getExhibitionById } from "@/lib/public-api";

/**
 * Public exhibition detail: /exhibition/[slug]
 *
 * SINGULAR "exhibition" is required, not stylistic — the authenticated app owns
 * /exhibitions/[id] for organiser management, and two pages resolving one path
 * is a build failure. See PUBLIC_DETAIL_PREFIXES in lib/seo.js.
 *
 * The slug is "<readable-name>-<24-hex mongo id>". Only the id half is
 * authoritative, so renaming an exhibition never breaks an existing link; a
 * non-canonical slug 301s to the current one so the two never compete in the
 * index.
 *
 * This is the page the whole SEO architecture exists to produce: it can rank
 * for "<exhibition name> dates", "<exhibition name> venue" and
 * "exhibitions in <city>", and it carries Event structured data that is
 * eligible for event rich results.
 */

export const revalidate = 300;

// 2,178 upcoming exhibitions alone: prerendering them all at build time would
// be slow and mostly wasted. They render on demand and are then ISR-cached.
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

async function load(slugParam) {
  const id = idFromSlug(slugParam);
  if (!id) return null;
  const exhibition = await getExhibitionById(id);
  return exhibition?.name ? exhibition : null;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const exhibition = await load(slug);
  if (!exhibition) return { title: "Exhibition not found", robots: { index: false, follow: true } };

  const place = formatLocation(exhibition, { includeVenue: false });
  const dates = formatDateRange(exhibition.startDate, exhibition.endDate);

  // Built from real fields, so every exhibition gets a genuinely unique title
  // and description rather than a template with the name swapped in.
  const titleBits = [exhibition.name, place].filter(Boolean).join(" — ");
  const description =
    truncate(exhibition.about, 155) ||
    [
      exhibition.name,
      dates ? `runs ${dates}` : null,
      exhibition.venue ? `at ${exhibition.venue}` : null,
      place ? `in ${place}` : null,
    ]
      .filter(Boolean)
      .join(" ") + ".";

  return publicPageMetadata({
    title: titleBits,
    description,
    path: exhibitionPath(exhibition.name, exhibition.id),
    images: exhibition.image ? [exhibition.image.url] : undefined,
  });
}

export default async function ExhibitionDetailPage({ params }) {
  const { slug } = await params;
  const exhibition = await load(slug);
  if (!exhibition) notFound();

  // Keep one canonical URL per exhibition.
  if (!isCanonicalSlug(slug, exhibition.name, exhibition.id)) {
    permanentRedirect(exhibitionPath(exhibition.name, exhibition.id));
  }

  const companies = await getCompaniesForExhibition(exhibition.id);

  const path = exhibitionPath(exhibition.name, exhibition.id);
  const dates = formatDateRange(exhibition.startDate, exhibition.endDate);
  const place = formatLocation(exhibition);
  const cityOnly = formatLocation(exhibition, { includeVenue: false });
  const isPast = exhibition.endDate ? new Date(exhibition.endDate) < new Date() : false;

  const trail = [
    { name: "Home", path: "/" },
    { name: "Exhibitions", path: PUBLIC_ROUTES.exhibitions },
    { name: exhibition.name, path },
  ];

  const prose = [
    { title: "About this exhibition", body: exhibition.about },
    { title: "Why exhibit", body: exhibition.whyExhibit },
    { title: "Why visit", body: exhibition.whyVisit },
    { title: "Exhibitor profile", body: exhibition.exhibitorProfile },
    { title: "Visitor profile", body: exhibition.visitorProfile },
    { title: "About the organiser", body: exhibition.aboutOrganiser },
    { title: "Speakers", body: exhibition.speakers },
    { title: "Sessions", body: exhibition.session },
    { title: "Sponsors", body: exhibition.sponsor },
    { title: "Partners", body: exhibition.partners },
  ].filter((s) => s.body);

  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        graph={graph(
          breadcrumbNode(trail),
          // Event markup only while the exhibition is still relevant.
          eventNode(exhibition, { path, isPast }),
          companies.items.length
            ? itemListNode(
                companies.items.map((c) => companyPath(c.name, c.id)),
                { name: `Companies exhibiting at ${exhibition.name}` }
              )
            : null
        )}
      />

      <Breadcrumbs trail={trail} />

      <header className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          {exhibition.category ? (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-[#131C55]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#131C55] dark:bg-blue-400/10 dark:text-blue-300">
              <Tag size={12} aria-hidden="true" />
              {exhibition.category}
            </p>
          ) : null}

          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            {exhibition.name}
          </h1>

          {isPast ? (
            <p className="mt-3 inline-flex rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              This exhibition has already taken place.
            </p>
          ) : null}

          <dl className="mt-5 space-y-3 text-[15px]">
            {dates ? (
              <div className="flex items-start gap-3">
                <dt className="sr-only">Dates</dt>
                <CalendarDays size={18} className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
                <dd className="text-gray-800 dark:text-gray-200">
                  <time dateTime={toIsoDate(exhibition.startDate)}>{dates}</time>
                </dd>
              </div>
            ) : null}

            {place ? (
              <div className="flex items-start gap-3">
                <dt className="sr-only">Venue and location</dt>
                <MapPin size={18} className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
                <dd className="text-gray-800 dark:text-gray-200">
                  {place}
                  {exhibition.address && exhibition.address !== place ? (
                    <span className="mt-0.5 block text-sm text-gray-500 dark:text-gray-500">
                      {exhibition.address}
                    </span>
                  ) : null}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            {cityOnly && exhibition.city ? (
              <Link
                href={`${PUBLIC_ROUTES.exhibitions}?city=${encodeURIComponent(exhibition.city)}`}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:border-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-500"
              >
                More exhibitions in {exhibition.city}
              </Link>
            ) : null}

            {exhibition.brochure ? (
              <a
                href={exhibition.brochure}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:border-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-500"
              >
                <FileText size={16} aria-hidden="true" />
                Exhibition brochure
              </a>
            ) : null}
          </div>
        </div>

        {/* Only Cloudinary images reach this point; anything else is filtered
            out in lib/public-api.js and the block simply does not render. */}
        {exhibition.image ? (
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
            <Image
              src={exhibition.image.url}
              alt={`${exhibition.name} exhibition banner`}
              fill
              priority
              sizes="(min-width: 1024px) 420px, 100vw"
              className="object-cover"
            />
          </div>
        ) : null}
      </header>

      {prose.length ? (
        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {prose.map(({ title, body }) => (
            <section key={title}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{title}</h2>
              {/* Organiser-authored plain text. Rendered as text, never as HTML. */}
              <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
                {body}
              </p>
            </section>
          ))}
        </div>
      ) : null}

      {companies.items.length ? (
        <section className="mt-14">
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            <Building2 size={22} className="text-gray-400" aria-hidden="true" />
            Companies exhibiting
          </h2>
          <p className="mt-2 text-[15px] text-gray-600 dark:text-gray-400">
            {companies.items.length} {companies.items.length === 1 ? "company is" : "companies are"}{" "}
            listed for this exhibition.
          </p>
          <ul className="mt-6 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {companies.items.map((company) => (
              <li key={company.id}>
                <CompanyCard company={company} className="h-full" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
