import Link from "next/link";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowRight, CalendarDays, History, MapPin, Building2, Tag } from "lucide-react";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import CompanyCard from "@/components/public/CompanyCard";
import JsonLd from "@/components/seo/JsonLd";
import BrochureLink from "@/components/exhibition/BrochureLink";
import SaveButton from "@/components/exhibition/SaveButton";

import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";
import { breadcrumbNode, eventNode, graph, itemListNode } from "@/lib/jsonld";
import { categoryLandingPath, cityLandingPath, companyPath, countryLandingPath, exhibitionCentrePath, exhibitionPath } from "@/lib/routes";
import { getExhibitionsInPlace, resolvePlaceLinks } from "@/lib/locations";
import { getSimilarUpcoming, resolveCategoryLink } from "@/lib/categories";
import { getEditions } from "@/lib/editions";
import { idFromSlug, isCanonicalSlug } from "@/lib/slug";
import { formatDateRange, formatLocation, toIsoDate } from "@/lib/format";
import { getCompaniesForExhibition, getExhibitionById } from "@/lib/public-api";
import ExhibitionCard from "@/components/public/ExhibitionCard";
import EnquiryForm from "@/components/public/EnquiryForm";
import VenueSection from "@/components/exhibition/VenueSection";

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

/**
 * Trim prose to a meta description that ends on a sentence, not mid-clause.
 *
 * truncate() in lib/format.js cuts at the last word and appends an ellipsis,
 * which produced descriptions like "...Companies from across…" — a fragment
 * that reads as broken text in a search result. It is still the right helper
 * everywhere else (card blurbs, where a clipped phrase is expected), so it is
 * left alone and this handles the meta description case only.
 *
 * A full stop past 60% of the budget wins: earlier than that and the
 * description is so short it wastes the slot, so a clean word-boundary cut with
 * an ellipsis is the better trade. Abbreviations are why the full stop must be
 * followed by a space or end-of-string — "No. 1 Fuhua Road" should not end a
 * sentence.
 */
function trimToSentence(text, max = 155) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= max) return clean;

  const window = clean.slice(0, max + 1);
  let end = -1;
  for (const m of window.matchAll(/[.!?](\s|$)/g)) end = m.index + 1;
  if (end > max * 0.6) return window.slice(0, end).trim();

  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:.\s]+$/, "")}…`;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const exhibition = await load(slug);
  if (!exhibition) return { title: "Exhibition not found", robots: { index: false, follow: true } };

  const place = formatLocation(exhibition, { includeVenue: false });
  const dates = formatDateRange(exhibition.startDate, exhibition.endDate);

  // Built from real fields, so every exhibition gets a genuinely unique title
  // and description rather than a template with the name swapped in.
  //
  // The place suffix is shortened rather than the name. A long official name
  // plus "City, State, Country" ran past 100 characters on the worst records
  // (measured: 110 for Food2China Expo), which Google truncates mid-phrase.
  // So the location degrades city+state+country -> city+country -> country ->
  // nothing until the title fits, and the event's own name is never cut: the
  // name is what someone searches for, the state rarely is.
  //
  // THE BUDGET IS 60, NOT 50, AND THE DIFFERENCE MATTERS MORE THAN IT LOOKS.
  // At 50 the ladder dropped the city on 1,062 of 1,982 upcoming exhibitions —
  // more than half. Search Console caught it concretely: the query "Hundmesse
  // Barmstedt 2026" reached "2. Barmstedter Hundemesse 2026 — Germany", whose
  // title had lost the word the searcher actually typed. That record missed by
  // a single character (51 against a 50 budget).
  //
  // 60 keeps the city on ~1,215 instead of ~920. The rendered title then runs
  // to 70 characters, past the ~60 Google shows in full — a deliberate trade:
  // a tail that truncates visually still carries the city as a relevance
  // signal, whereas a short title that never mentions the city cannot rank for
  // it at all. Raising it further keeps adding cities but stops buying
  // relevance, so this is the ceiling rather than the maximum.
  const titleBudget = 70 - 10; // 10 = the " · OneXhib" the layout template appends
  const placeForms = [
    place,
    formatLocation({ city: exhibition.city, country: exhibition.country }),
    exhibition.country || "",
    "",
  ];
  const fitting = placeForms.find(
    (p) => [exhibition.name, p].filter(Boolean).join(" — ").length <= titleBudget
  );
  const titleBits = [exhibition.name, fitting ?? ""].filter(Boolean).join(" — ");
  // AN ENDED SHOW WITH A NEXT EDITION LEADS WITH IT. Someone searching the
  // name of a show that has passed nearly always wants the next one; the
  // snippet tells them it is listed before they click.
  const isPast = exhibition.endDate ? new Date(exhibition.endDate) < new Date() : false;
  const { next } = isPast ? await getEditions(exhibition) : { next: null };
  const nextLine = next
    ? trimToSentence(
        `${exhibition.name} has ended. The next edition, ${next.name}, runs ${formatDateRange(next.startDate, next.endDate)}${
          next.city ? ` in ${next.city}` : ""
        }.`,
        155
      )
    : "";
  const description =
    nextLine ||
    trimToSentence(exhibition.about, 155) ||
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
    // A base64 data: URI is a valid <img> src but useless as og:image —
    // crawlers need a fetchable URL — so inline images are left out here.
    images: exhibition.image && exhibition.image.host !== "inline" ? [exhibition.image.url] : undefined,
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

  // Three independent, fail-soft reads.
  // `placeLinks` decides whether the location links point at an indexable
  // landing page or at the noindex filter; `nearby`
  // is what makes this page a hub rather than a dead end for a crawler.
  const [companies, placeLinks, categoryLink, sameCity, { editions, next: nextEdition }] = await Promise.all([
    getCompaniesForExhibition(exhibition.id),
    resolvePlaceLinks(exhibition),
    resolveCategoryLink(exhibition.category),
    exhibition.city && exhibition.country
      ? getExhibitionsInPlace({ country: exhibition.country, city: exhibition.city })
      : Promise.resolve([]),
    getEditions(exhibition),
  ]);

  // Same industry, coming up - the show's own editions are listed separately,
  // so they are left out here rather than shown twice.
  const editionIds = new Set(editions.map((e) => e.id));
  const similar = await getSimilarUpcoming(exhibition, { limit: 4, exclude: editionIds });

  // Related = other upcoming exhibitions in the same city. Same city is the
  // only relationship the listing endpoints can actually express: category and
  // venue are absent from their projection (see lib/public-api.js), so a
  // "same category" or "same venue" section would need a backend change rather
  // than 2,000 detail fetches.
  const similarIds = new Set(similar.items.map((e) => e.id));
  const nearby = sameCity
    .filter((e) => e.id !== exhibition.id && !editionIds.has(e.id) && !similarIds.has(e.id))
    .slice(0, 4);

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
    // Text is the older form; once logos exist they are shown instead (below).
    { title: "Sponsors", body: exhibition.sponsorLogos.length ? "" : exhibition.sponsor },
    { title: "Partners", body: exhibition.partnerLogos.length ? "" : exhibition.partners },
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
          {/* The category is a link when its industry page exists, and plain
              text otherwise — the long tail of one-off categories has no page
              to point at. */}
          {exhibition.category ? (
            categoryLink ? (
              <Link
                href={categoryLandingPath(categoryLink.slug)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#131C55]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#131C55] transition hover:bg-[#131C55]/20 motion-reduce:transition-none dark:bg-blue-400/10 dark:text-blue-300 dark:hover:bg-blue-400/20"
              >
                <Tag size={12} aria-hidden="true" />
                {categoryLink.label} exhibitions
              </Link>
            ) : (
              <p className="inline-flex items-center gap-1.5 rounded-full bg-[#131C55]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#131C55] dark:bg-blue-400/10 dark:text-blue-300">
                <Tag size={12} aria-hidden="true" />
                {exhibition.category}
              </p>
            )
          ) : null}

          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            {exhibition.name}
          </h1>

          {/*
            AN ENDED SHOW POINTS ONWARDS. The next edition when one is listed;
            otherwise the show's industry page, then its city. Never a dead end.
          */}
          {isPast ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/25 dark:bg-amber-400/10">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
                <History size={16} aria-hidden="true" />
                This exhibition has ended.
              </p>
              {nextEdition ? (
                <>
                  <p className="mt-1.5 text-[15px] text-gray-800 dark:text-gray-200">
                    The next edition is{" "}
                    <span className="font-semibold">{nextEdition.name}</span>,{" "}
                    {formatDateRange(nextEdition.startDate, nextEdition.endDate)}
                    {nextEdition.city ? <> in {nextEdition.city}</> : null}.
                  </p>
                  <Link
                    href={exhibitionPath(nextEdition.name, nextEdition.id)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#131C55] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0E1B6B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none"
                  >
                    See the next edition
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </>
              ) : similar.industry ? (
                <p className="mt-1.5 text-[15px] text-gray-800 dark:text-gray-200">
                  No next edition is listed yet.{" "}
                  <Link
                    href={categoryLandingPath(similar.industry.slug)}
                    className="font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300"
                  >
                    See upcoming {similar.industry.label.toLowerCase()} exhibitions
                  </Link>
                  .
                </p>
              ) : nearby.length ? (
                <p className="mt-1.5 text-[15px] text-gray-800 dark:text-gray-200">
                  No next edition is listed yet. Upcoming shows in {exhibition.city} are below.
                </p>
              ) : (
                <p className="mt-1.5 text-[15px] text-gray-800 dark:text-gray-200">
                  No next edition is listed yet.{" "}
                  <Link
                    href={placeLinks.countrySlug ? countryLandingPath(placeLinks.countrySlug) : PUBLIC_ROUTES.exhibitions}
                    className="font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300"
                  >
                    {placeLinks.countrySlug && exhibition.country
                      ? `See upcoming exhibitions in ${exhibition.country}`
                      : "See upcoming exhibitions"}
                  </Link>
                  .
                </p>
              )}
            </div>
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
                  {/* Linked to an exhibition centre: its page has the map,
                      directions and the venue's other shows. */}
                  {exhibition.centre ? (
                    <Link
                      href={exhibitionCentrePath(exhibition.centre.slug)}
                      className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#2B3FB8] hover:underline dark:text-blue-300"
                    >
                      View venue &amp; map: {exhibition.centre.name}
                    </Link>
                  ) : null}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            {/* Descriptive anchors that name the destination, and an indexable
                landing page whenever the city clears the threshold — falling
                back to the noindex filter only for the long tail of cities
                that have no page of their own. */}
            {exhibition.city ? (
              <Link
                href={
                  placeLinks.citySlug
                    ? cityLandingPath(placeLinks.countrySlug, placeLinks.citySlug)
                    : `${PUBLIC_ROUTES.exhibitions}?city=${encodeURIComponent(exhibition.city)}`
                }
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:border-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-500"
              >
                <MapPin size={16} aria-hidden="true" />
                More exhibitions in {exhibition.city}
              </Link>
            ) : null}

            {placeLinks.countrySlug && exhibition.country ? (
              <Link
                href={countryLandingPath(placeLinks.countrySlug)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:border-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-500"
              >
                Exhibitions in {exhibition.country}
              </Link>
            ) : null}

            <BrochureLink href={exhibition.brochure} />

            <SaveButton exhibitionId={exhibition.id} exhibitionName={exhibition.name} />
          </div>
        </div>

        {/* Null only when the record has no usable image URL at all; the
            block then simply does not render. See lib/public-api.js. */}
        {exhibition.image ? (
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
            <Image
              src={exhibition.image.url}
              alt={[exhibition.name, cityOnly].filter(Boolean).join(" — ")}
              fill
              priority
              sizes="(min-width: 1024px) 420px, 100vw"
              unoptimized={!exhibition.image.optimized}
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

      {exhibition.sponsorLogos.length || exhibition.partnerLogos.length ? (
        <section aria-label="Sponsors and partners" className="mt-14 space-y-10">
          {[
            { title: "Sponsors", logos: exhibition.sponsorLogos },
            { title: "Partners", logos: exhibition.partnerLogos },
          ]
            .filter((g) => g.logos.length)
            .map((g) => (
              <div key={g.title}>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{g.title}</h2>
                <ul className="mt-4 grid list-none grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {g.logos.map((logo) => (
                    <li
                      key={logo.id}
                      className="grid aspect-[3/2] place-items-center rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-100"
                    >
                      {/* Plain <img>: hotlinked logos of any shape, shown whole. */}
                      <img
                        src={logo.url}
                        alt={`${exhibition.name} ${g.title === "Sponsors" ? "sponsor" : "partner"} logo`}
                        loading="lazy"
                        className="max-h-full max-w-full object-contain"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </section>
      ) : null}

      {/* The linked exhibition centre: photo, address, live map, directions. */}
      <VenueSection centre={exhibition.centre} exhibitionName={exhibition.name} className="mt-14" />

      {/* Visitor -> organiser. Shown only when the backend can deliver to this
          listing; the organiser's address never reaches the page. */}
      {exhibition.contactable ? (
        <EnquiryForm
          className="mt-14"
          targetType="exhibition"
          targetId={exhibition.id}
          recipientLabel="the organiser"
          listingName={exhibition.name}
        />
      ) : null}

      {editions.length ? (
        <section aria-labelledby="editions-heading" className="mt-14">
          <h2
            id="editions-heading"
            className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white"
          >
            <History size={22} className="text-gray-400" aria-hidden="true" />
            Other editions
          </h2>
          <p className="mt-2 text-[15px] text-gray-600 dark:text-gray-400">
            Earlier and later editions of this show{exhibition.country ? <> in {exhibition.country}</> : null}.
          </p>
          <ol className="mt-5 divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
            {editions.map((e) => {
              const ended = e.endDate ? new Date(e.endDate) < new Date() : false;
              return (
                <li key={e.id}>
                  <Link
                    href={exhibitionPath(e.name, e.id)}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 transition hover:bg-gray-50 motion-reduce:transition-none dark:hover:bg-white/[0.03]"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold text-gray-900 dark:text-gray-50">{e.name}</span>
                      <span className="block text-sm text-gray-600 dark:text-gray-400">
                        {formatDateRange(e.startDate, e.endDate)}
                        {e.city ? <> · {e.city}</> : null}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        e.id === nextEdition?.id
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300"
                          : ended
                            ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            : "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300"
                      }`}
                    >
                      {e.id === nextEdition?.id ? "Next edition" : ended ? "Ended" : "Upcoming"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      {similar.items.length ? (
        <section aria-labelledby="similar-heading" className="mt-14">
          <h2
            id="similar-heading"
            className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white"
          >
            <Tag size={22} className="text-gray-400" aria-hidden="true" />
            Upcoming {similar.industry.label.toLowerCase()} exhibitions
          </h2>
          <p className="mt-2 text-[15px] text-gray-600 dark:text-gray-400">
            {isPast ? "Shows like this one that are still to come" : "More shows in the same industry"}
            {exhibition.country ? <>, starting with {exhibition.country}</> : null}.
          </p>
          <ul className="mt-6 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {similar.items.map((related) => (
              <li key={related.id}>
                <ExhibitionCard exhibition={related} className="h-full" />
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[15px]">
            <Link
              href={categoryLandingPath(similar.industry.slug)}
              className="font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300"
            >
              See all upcoming {similar.industry.label.toLowerCase()} exhibitions
            </Link>
          </p>
        </section>
      ) : null}

      {nearby.length ? (
        <section aria-labelledby="nearby-heading" className="mt-14">
          <h2
            id="nearby-heading"
            className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white"
          >
            <MapPin size={22} className="text-gray-400" aria-hidden="true" />
            {isPast ? "Upcoming exhibitions" : "Other exhibitions"} in {exhibition.city}
          </h2>
          <p className="mt-2 text-[15px] text-gray-600 dark:text-gray-400">
            More trade shows and business events coming up in the same city.
          </p>
          <ul className="mt-6 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {nearby.map((related) => (
              <li key={related.id}>
                <ExhibitionCard exhibition={related} className="h-full" />
              </li>
            ))}
          </ul>
          {placeLinks.citySlug ? (
            <p className="mt-5 text-[15px]">
              <Link
                href={cityLandingPath(placeLinks.countrySlug, placeLinks.citySlug)}
                className="font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300"
              >
                See all upcoming exhibitions in {exhibition.city}
              </Link>
            </p>
          ) : null}
        </section>
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
