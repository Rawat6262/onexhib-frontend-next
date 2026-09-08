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

/** Exhibition list scoped to upcoming / ongoing / previous. */
export const exhibitionsScopePath = (scope) =>
  scope === "upcoming" ? PUBLIC_ROUTES.exhibitions : `${PUBLIC_ROUTES.exhibitions}?scope=${scope}`;
