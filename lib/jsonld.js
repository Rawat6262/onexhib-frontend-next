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
import {
  BRAND_NAME,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  FOUNDED_ISO,
  LEGAL_NAME,
  LOCATION,
  PLAY_STORE_URL,
} from "@/lib/business";
import { toIsoDate } from "@/lib/format";

export const ORG_ID = `${SITE_URL}/#organization`;
export const SITE_ID = `${SITE_URL}/#website`;

const abs = (path) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * An image URL fit for structured data, or null.
 *
 * lib/public-api.js accepts a base64 `data:` URI when that is the only image a
 * record has, which is correct for an <img> but wrong here: a crawler cannot
 * fetch a schema.org image it has no URL for, and emitting one is an invalid
 * property value rather than a harmless extra. Third-party https URLs ARE
 * emitted — they are the real image of the record and they resolve.
 */
const schemaImage = (image) =>
  image && image.host !== "inline" && image.url.startsWith("https://") ? image.url : null;

/**
 * The publisher of the site.
 *
 * Every property is a fact supplied by the business (lib/business.js) or
 * already stated on the site. Absent on purpose, because they were never
 * provided: sameAs (no social profiles are known), a registered street address,
 * and any registration or tax number. An invented sameAs pointing at the wrong
 * profile is worse than no sameAs at all.
 *
 * The address is a PostalAddress with locality, region and country only. It
 * describes where the business is based, which is what the Contact page says -
 * it is NOT presented as a registered office, because no street address exists.
 *
 * NOTE ON THE PLAY STORE LINK: it is deliberately not in sameAs. sameAs is for
 * pages that identify this ORGANISATION; a Play Store listing identifies one of
 * its products. It is modelled as a SoftwareApplication instead, emitted on
 * /about where the app is actually mentioned.
 */
export function organizationNode() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: BRAND_NAME,
    legalName: LEGAL_NAME,
    url: SITE_URL,
    logo: abs("/Dark.png"),
    foundingDate: FOUNDED_ISO,
    email: CONTACT_EMAIL,
    telephone: CONTACT_PHONE,
    address: {
      "@type": "PostalAddress",
      addressLocality: LOCATION.locality,
      addressRegion: LOCATION.region,
      addressCountry: LOCATION.country,
    },
    contactPoint: {
      "@type": "ContactPoint",
      email: CONTACT_EMAIL,
      telephone: CONTACT_PHONE,
      contactType: "customer support",
    },
  };
}

/**
 * The official Android app.
 *
 * Emitted only by /about, which links to the store listing in visible copy, so
 * the markup always describes something the page says.  points at
 * the single Organization @id rather than restating it, which is what keeps
 * one entity across the whole site instead of two competing ones.
 *
 * No  or : the price and rating are Google Play's
 * data, not ours, and guessing them is exactly the fabrication this file exists
 * to avoid. Without them there is no rich result - only an accurate entity.
 */
export function softwareApplicationNode() {
  return {
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#android-app`,
    name: BRAND_NAME,
    url: PLAY_STORE_URL,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Android",
    publisher: { "@id": ORG_ID },
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

/**
 * A blog post as a schema.org BlogPosting.
 *
 * The author and publisher are the organisation, not a person: these posts are
 * written from the platform's own listing data and are not bylined, so naming
 * an individual would be inventing an author. `dateModified` falls back to the
 * publication date rather than to "now", which would otherwise claim the post
 * had been revised every time the page rebuilt.
 */
export function blogPostingNode(post, { path }) {
  if (!post?.title || !post.published) return null;
  return {
    "@type": "BlogPosting",
    "@id": `${abs(path)}#post`,
    headline: post.title,
    ...(post.description ? { description: post.description } : {}),
    datePublished: post.published,
    dateModified: post.updated || post.published,
    author: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    isPartOf: { "@id": SITE_ID },
    mainEntityOfPage: abs(path),
    inLanguage: "en",
    ...(post.tags?.length ? { keywords: post.tags.join(", ") } : {}),
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
    ...(schemaImage(exhibition.image) ? { image: schemaImage(exhibition.image) } : {}),
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
    ...(schemaImage(product.image) ? { image: schemaImage(product.image) } : {}),
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
    ...(schemaImage(company.image) ? { logo: schemaImage(company.image) } : {}),
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
