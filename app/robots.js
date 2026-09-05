import { SITE_URL } from "@/lib/seo";

/**
 * Serves /robots.txt.
 *
 * Deliberately does NOT disallow the app's own pages, even the private ones.
 * Disallow and noindex conflict: a crawler blocked by robots.txt never fetches
 * the page, so it never sees the `noindex` meta tag — and a blocked URL that is
 * linked from anywhere can still be indexed as a bare URL. Every non-public
 * route already carries `robots: { index: false }` in its metadata, which is the
 * reliable signal, so crawling is left open for that signal to be read.
 *
 * /api/* is the exception: it proxies to Express and returns JSON, which has no
 * meta tag to carry a directive, so it is blocked here.
 */
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
