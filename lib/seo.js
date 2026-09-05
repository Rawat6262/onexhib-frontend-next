/**
 * Central SEO configuration.
 *
 * SITE_URL is the canonical origin. It defaults to the production domain the
 * Express backend already allow-lists in CORS (index.js), and can be overridden
 * per environment with NEXT_PUBLIC_SITE_URL — set that on staging so preview
 * builds don't emit canonicals pointing at production.
 *
 * NEXT_PUBLIC_ is correct here: this is a public origin, never a secret.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://onexhib.com"
).replace(/\/+$/, "");

export const SITE_NAME = "OneXhib";

export const SITE_DESCRIPTION =
  "OneXhib is a platform for exhibition organisers, exhibitors and service providers to list and manage exhibitions, companies and products in one place.";

/** Generated at /opengraph-image by app/opengraph-image.jsx (1200x630). */
export const OG_IMAGE = "/opengraph-image";

/**
 * Routes that should be crawled and indexed. Everything else is either an
 * account-utility page (a form with no unique content) or sits behind login.
 * Keep this list and app/sitemap.js in agreement.
 */
export const INDEXABLE_ROUTES = ["/", "/privacy-policy", "/delete-account"];

/**
 * Authenticated areas. These are kept OUT of robots.txt on purpose — blocking a
 * URL there would stop a crawler from ever reading its `noindex`. Each page
 * carries robots: NOINDEX_NOFOLLOW instead. Listed here for reference and for
 * whatever tooling wants the set.
 */
export const PRIVATE_ROUTES = [
  "/organiser",
  "/services",
  "/exhibitions/",
  "/companies/",
  "/products/",
  "/admin/",
];

/** Account-utility pages: reachable, linked, but not worth indexing. */
export const UTILITY_ROUTES = [
  "/login",
  "/signup",
  "/verify-otp",
  "/forgot-password",
  "/reset-password",
];

/** Crawl directive for pages that shouldn't rank but whose links should be followed. */
export const NOINDEX_FOLLOW = { index: false, follow: true };

/** Crawl directive for anything behind authentication. */
export const NOINDEX_NOFOLLOW = { index: false, follow: false };

/**
 * Build a page's metadata with a canonical URL attached.
 * @param {{title?: string, description?: string, path: string, robots?: object}} opts
 */
export function pageMetadata({ title, description, path, robots }) {
  const meta = {
    alternates: { canonical: path },
  };
  if (title) meta.title = title;
  if (description) meta.description = description;
  if (robots) meta.robots = robots;

  // Declaring `openGraph` on a page replaces the parent's object wholesale, so
  // the shared image has to be restated here or social cards lose it. Same for
  // `twitter`, which would otherwise keep showing the generic site blurb.
  const shared = {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
  };
  meta.openGraph = { ...shared, url: path, images: [OG_IMAGE] };
  meta.twitter = { ...shared, card: "summary_large_image", images: [OG_IMAGE] };

  return meta;
}
