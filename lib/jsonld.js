/**
 * schema.org node builders.
 *
 * GROUND RULE: every value emitted here must be either a fact stated on the
 * page itself or a field the database actually holds. There are deliberately no
 * builders for aggregateRating, review, offers-with-invented-prices, attendee
 * counts, sameAs social profiles, foundingDate or postal addresses, because the
 * product has no such data. Fabricated structured data risks a manual action,
 * and the rich result it might buy is not worth that.
 *
 * Nodes are assembled into a single @graph per page and cross-referenced by
 * @id, which is how search engines understand that the Organization publishing
 * the site is the same entity across pages.
 */
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, PUBLIC_ROUTES } from "@/lib/seo";
import { toIsoDate } from "@/lib/format";

export const ORG_ID = `${SITE_URL}/#organization`;
export const SITE_ID = `${SITE_URL}/#website`;

const abs = (path) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** Only the facts the site states about itself: name, URL, logo, support email. */
export function organizationNode() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: abs("/Dark.png"),
    contactPoint: {
      "@type": "ContactPoint",
      email: "onexhib@gmail.com",
      contactType: "customer support",
    },
  };
}

/**
 * The site node, with a SearchAction.
 *
 * The SearchAction is only truthful because /exhibitions?search= is a real,
 * server-rendered page that answers the query — it was omitted while the
 * homepage was a placeholder, and is included now that the target exists.
 */
export function webSiteNode() {
  return {
    "@type": "WebSite",
    "@id": SITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    publisher: { "@id": ORG_ID },
    inLanguage: "en",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${abs(PUBLIC_ROUTES.exhibitions)}?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * FAQPage. Callers must pass the same array that is rendered as visible text —
 * lib/faq.js exists so there is only one array to pass.
 */
export function faqNode(items) {
  if (!items?.length) return null;
  return {
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

/** Breadcrumbs. `trail` is [{ name, path }] from the site root downwards. */
export function breadcrumbNode(trail) {
  if (!trail?.length) return null;
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map(({ name, path }, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: abs(path),
    })),
  };
}

/** ItemList of real URLs on a listing page. Order matches what is rendered. */
export function itemListNode(urls, { name } = {}) {
  if (!urls?.length) return null;
  return {
    "@type": "ItemList",
    ...(name ? { name } : {}),
    numberOfItems: urls.length,
    itemListElement: urls.map((url, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: url.startsWith("http") ? url : abs(url),
    })),
  };
}

/**
 * An exhibition as a schema.org Event.
 *
 * Emitted only for exhibitions that have not finished: marking a long-past
 * event as an Event adds nothing and ages badly. Optional properties are
 * included only when the record actually has them — an Event with a missing
 * location is invalid, so null is returned rather than a half-built node.
 *
 * eventAttendanceMode is OfflineEventAttendanceMode because every exhibition in
 * this catalogue has a physical venue; there is no online-event concept in the
 * data model to misrepresent.
 */
export function eventNode(exhibition, { path, isPast }) {
  if (!exhibition?.name || !exhibition.startDate || isPast) return null;

  const locality = [exhibition.city, exhibition.state, exhibition.country].filter(Boolean);
  if (!locality.length && !exhibition.venue) return null;

  const address = {
    "@type": "PostalAddress",
    ...(exhibition.city ? { addressLocality: exhibition.city } : {}),
    ...(exhibition.state ? { addressRegion: exhibition.state } : {}),
    ...(exhibition.country ? { addressCountry: exhibition.country } : {}),
  };

  return {
    "@type": "Event",
    "@id": `${abs(path)}#event`,
    name: exhibition.name,
    url: abs(path),
    startDate: toIsoDate(exhibition.startDate),
    ...(exhibition.endDate ? { endDate: toIsoDate(exhibition.endDate) } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: exhibition.venue || locality.join(", "),
      address,
    },
    // Only Cloudinary-hosted images survive the data layer's allow-list, so an
    // image here is always one the platform actually serves.
    ...(exhibition.image ? { image: exhibition.image.url } : {}),
    ...(exhibition.about ? { description: exhibition.about.slice(0, 500) } : {}),
    ...(exhibition.category ? { keywords: exhibition.category } : {}),
  };
}

/**
 * A product. `offers` is attached only when a real positive price exists —
 * most products have none, and an invented price is exactly the kind of
 * fabrication that gets structured data penalised.
 */
export function productNode(product, { path, brandName }) {
  if (!product?.name) return null;
  const price = Number(product.price);
  const hasPrice = Number.isFinite(price) && price > 0;

  return {
    "@type": "Product",
    "@id": `${abs(path)}#product`,
    name: product.name,
    url: abs(path),
    ...(product.details ? { description: product.details.slice(0, 500) } : {}),
    ...(product.image ? { image: product.image.url } : {}),
    ...(product.category ? { category: product.category } : {}),
    ...(brandName ? { brand: { "@type": "Brand", name: brandName } } : {}),
    ...(hasPrice
      ? {
          offers: {
            "@type": "Offer",
            price: String(price),
            priceCurrency: "INR",
            availability: "https://schema.org/InStock",
            url: abs(path),
          },
        }
      : {}),
  };
}

/** An exhibiting company. No address node: only a free-text address exists. */
export function companyNode(company, { path }) {
  if (!company?.name) return null;
  return {
    "@type": "Organization",
    "@id": `${abs(path)}#organization`,
    name: company.name,
    url: abs(path),
    ...(company.about ? { description: company.about.slice(0, 500) } : {}),
    ...(company.image ? { logo: company.image.url } : {}),
    ...(company.website ? { sameAs: [company.website] } : {}),
  };
}

/** Wrap nodes into one @graph, dropping any the builders declined to produce. */
export function graph(...nodes) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter(Boolean),
  };
}
