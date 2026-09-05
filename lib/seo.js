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

/**
 * Site-wide description. Rewritten for the public launch: the previous wording
 * ("list and manage") described the authenticated app, which is not what a
 * first-time visitor arriving from search is looking for. This one leads with
 * discovery, which is what the public pages actually offer.
 *
 * It says "worldwide", not "in India", because the catalogue is global: of
 * 2,178 upcoming exhibitions, the largest countries are Indonesia, Germany and
 * China, and India accounts for 137. India is a well-supported facet at
 * /exhibitions?country=India, not the headline claim.
 */
export const SITE_DESCRIPTION =
  "Discover exhibitions, trade shows and business events worldwide on OneXhib — browse upcoming and ongoing exhibitions by city and country, the companies exhibiting at them, and their products.";

/** Generated at /opengraph-image by app/opengraph-image.jsx (1200x630). */
export const OG_IMAGE = "/opengraph-image";

/**
 * Public discovery routes. Each is a real page backed by public API data, and
 * each is a distinct search intent — see the keyword map in the landing-page
 * audit. Detail routes are dynamic and enumerated by app/sitemap.js instead.
 */
export const PUBLIC_ROUTES = Object.freeze({
  home: "/",
  exhibitions: "/exhibitions",
  companies: "/companies",
  products: "/products",
  services: "/exhibition-services",
});

/**
 * Prefixes of the public dynamic detail routes.
 *
 * PLURAL LISTS, SINGULAR DETAILS — and that is not a style choice.
 *
 * The authenticated app already owns "/exhibitions/[id]", "/companies/[id]" and
 * "/products/[id]" (app/(dashboard)/...), and two pages resolving the same path
 * is a hard Next.js build failure, not a runtime precedence question. So the
 * public detail pages take the singular form and the authenticated routes are
 * left completely untouched:
 *
 *   /exhibitions            public list      /exhibitions/[id]  authenticated
 *   /exhibition/[slug]      public detail
 *   /companies              public list      /companies/[id]    authenticated
 *   /company/[slug]         public detail
 *   /products               public list      /products/[id]     authenticated
 *   /product/[slug]         public detail
 *   /exhibition-services    public list      /services          authenticated
 *
 * The plural list routes are safe because the dashboard has no index page at
 * any of them — only the [id] children exist.
 */
export const PUBLIC_DETAIL_PREFIXES = Object.freeze({
  exhibition: "/exhibition",
  company: "/company",
  product: "/product",
});

/**
 * Static routes that should be crawled and indexed. Everything else is either an
 * account-utility page (a form with no unique content) or sits behind login.
 * Keep this list and app/sitemap.js in agreement.
 */
export const INDEXABLE_ROUTES = [
  ...Object.values(PUBLIC_ROUTES),
  "/privacy-policy",
  "/delete-account",
];

/**
 * Authenticated areas. These are kept OUT of robots.txt on purpose — blocking a
 * URL there would stop a crawler from ever reading its `noindex`. Each page
 * carries robots: NOINDEX_NOFOLLOW instead. Listed here for reference and for
 * whatever tooling wants the set.
 */
export const PRIVATE_ROUTES = [
  "/organiser",
  "/services", // authenticated service-provider area; public equivalent is /exhibition-services
  "/exhibitions/[id]", // authenticated management; public detail is /exhibition/[slug]
  "/companies/[id]", // authenticated management; public detail is /company/[slug]
  "/products/[id]", // authenticated management; public detail is /product/[slug]
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

/**
 * Metadata for a PUBLIC page.
 *
 * Identical to pageMetadata() except that it forces `robots: { index: true }`.
 * That is the whole point of it existing: app/layout.jsx sets a site-wide
 * default of `index: false` so authenticated pages are private by default, and
 * a public page that forgets to opt in ships invisible to search engines. Going
 * through this helper makes that impossible to forget.
 */
export function publicPageMetadata({ title, description, path, images }) {
  const meta = pageMetadata({ title, description, path, robots: { index: true, follow: true } });
  if (images?.length) {
    meta.openGraph.images = images;
    meta.twitter.images = images;
  }
  return meta;
}

/** Absolute URL for canonicals, JSON-LD @id values and sitemap entries. */
export function absoluteUrl(path = "/") {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
