/**
 * Canonical public URLs for records.
 *
 * Kept apart from lib/seo.js so Client Components can import a path builder
 * without pulling in the metadata helpers, and apart from lib/public-api.js so
 * importing a URL never drags in the server-only data layer.
 */
import { toSlug } from "@/lib/slug";
import { PUBLIC_DETAIL_PREFIXES, PUBLIC_ROUTES } from "@/lib/seo";

export const exhibitionPath = (name, id) =>
  `${PUBLIC_DETAIL_PREFIXES.exhibition}/${toSlug(name, id)}`;

export const companyPath = (name, id) =>
  `${PUBLIC_DETAIL_PREFIXES.company}/${toSlug(name, id)}`;

export const productPath = (name, id) =>
  `${PUBLIC_DETAIL_PREFIXES.product}/${toSlug(name, id)}`;

/**
 * Exhibition list filtered by city, using the backend's real `city` filter.
 *
 * This is the NON-indexable view: it exists so any of the 448 cities in the
 * data can be browsed. A city with enough inventory also has an indexable
 * landing page - prefer cityLandingPath() for links whenever one exists.
 */
export const exhibitionsInCityPath = (city) =>
  `${PUBLIC_ROUTES.exhibitions}?city=${encodeURIComponent(city)}`;

/** Indexable country landing page: /exhibitions-in/germany */
export const countryLandingPath = (countrySlug) =>
  `${PUBLIC_ROUTES.locations}/${countrySlug}`;

/** Indexable industry landing page: /exhibitions-for/technology */
export const categoryLandingPath = (categorySlug) =>
  `${PUBLIC_ROUTES.categories}/${categorySlug}`;

/** Indexable city landing page: /exhibitions-in/germany/berlin */
export const cityLandingPath = (countrySlug, citySlug) =>
  `${PUBLIC_ROUTES.locations}/${countrySlug}/${citySlug}`;

/** A blog post: /blog/where-trade-shows-happen-2026-27 */
export const blogPostPath = (slug) => `${PUBLIC_ROUTES.blog}/${slug}`;

/**
 * Service category page: /exhibition-services/printing
 *
 * The slug is the frozen one from lib/services.js, never derived from the label
 * here — see the note there on why these URLs are written down.
 */
export const serviceCategoryPath = (categorySlug) =>
  `${PUBLIC_ROUTES.services}/${categorySlug}`;

/**
 * One provider's listing: /exhibition-service/aman-furniture-house-68f2...
 *
 * A provider can hold several listings - one per category - and each is its own
 * record with its own id, so this addresses the LISTING rather than the business.
 * The detail page cross-links the others.
 */
export const servicePath = (name, id) =>
  `${PUBLIC_DETAIL_PREFIXES.service}/${toSlug(name, id)}`;

/** Exhibition list scoped to upcoming / ongoing / previous. */
export const exhibitionsScopePath = (scope) =>
  scope === "upcoming" ? PUBLIC_ROUTES.exhibitions : `${PUBLIC_ROUTES.exhibitions}?scope=${scope}`;
