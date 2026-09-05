import { generateSitemaps } from "@/app/sitemap";
import { SITE_URL } from "@/lib/seo";

/**
 * Sitemap index at /sitemap.xml.
 *
 * WHY THIS FILE EXISTS
 * app/sitemap.js uses generateSitemaps() to chunk its output, which makes Next
 * serve the chunks at /sitemap/0.xml, /sitemap/1.xml … and stop serving
 * /sitemap.xml altogether. robots.txt points at /sitemap.xml, and that is also
 * the URL submitted to Search Console and the one crawlers try first, so
 * without this route the entire sitemap would be a 404.
 *
 * A sitemap index is the correct answer rather than repointing robots.txt at a
 * single chunk: the chunk count changes as the catalogue grows, and an index
 * absorbs that automatically.
 */

export const revalidate = 3600;

export async function GET() {
  const chunks = await generateSitemaps();
  const lastmod = new Date().toISOString();

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${chunks
  .map(
    ({ id }) => `  <sitemap>
    <loc>${SITE_URL}/sitemap/${id}.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`
  )
  .join("\n")}
</sitemapindex>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
