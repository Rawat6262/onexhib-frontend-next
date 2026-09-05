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

/** Exhibition list filtered by city, using the backend's real `city` filter. */
export const exhibitionsInCityPath = (city) =>
  `${PUBLIC_ROUTES.exhibitions}?city=${encodeURIComponent(city)}`;

/** Exhibition list scoped to upcoming / ongoing / previous. */
export const exhibitionsScopePath = (scope) =>
  scope === "upcoming" ? PUBLIC_ROUTES.exhibitions : `${PUBLIC_ROUTES.exhibitions}?scope=${scope}`;
