import Link from "next/link";
import { Sparkles } from "lucide-react";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import AiSearchPanel from "@/components/search/AiSearchPanel";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, pageMetadata, NOINDEX_FOLLOW } from "@/lib/seo";
import { breadcrumbNode, graph } from "@/lib/jsonld";

/**
 * /ai-search — natural-language exhibition search.
 *
 * WHY THE PAGE IS PUBLIC BUT NOINDEX
 * The route renders for everyone, because a guest arriving on it should see
 * what the feature is and be invited to sign in — redirecting them to /login
 * with no explanation is how a feature becomes invisible. The *search itself*
 * is gated: AiSearchPanel never calls the endpoint without a session.
 *
 * It is noindex,follow because there is nothing here for a search engine. The
 * page is a form; its value appears only after a signed-in user runs a query,
 * and those results are per-user, non-deterministic and generated at a cost.
 * Indexing this would put a login wall in the results — and indexing the
 * *results* would be worse: infinite near-duplicate URLs over content that is
 * already covered properly by /exhibitions, the country pages and the category
 * pages. Nothing under this route is in the sitemap, and results are rendered
 * client-side into this one URL, so no query ever becomes a crawlable page.
 *
 * It does not replace normal search. The site-wide SearchBar and the faceted
 * listing pages are unchanged and remain the primary path.
 */

export const metadata = pageMetadata({
  title: "AI exhibition search",
  description:
    "Search OneXhib's exhibition catalogue in plain language. Describe the industry, country or month you are interested in and get matching trade shows.",
  path: "/ai-search",
  robots: NOINDEX_FOLLOW,
});

export default function AiSearchPage() {
  const trail = [
    { name: "Home", path: "/" },
    { name: "AI search", path: "/ai-search" },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd graph={graph(breadcrumbNode(trail))} />

      <Breadcrumbs trail={trail} />

      <header className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#131C55]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#131C55] dark:bg-blue-400/10 dark:text-blue-300">
          <Sparkles size={13} aria-hidden="true" />
          Beta
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          Search exhibitions naturally
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          Describe what you are looking for in a sentence — an industry, a country, a month, or all
          three — and OneXhib will translate it into a search across the catalogue. It reads your
          description and filters the same listings you can browse by hand; it does not invent
          events or write descriptions.
        </p>
      </header>

      <div className="mt-8">
        <AiSearchPanel />
      </div>

      <section aria-labelledby="alt-heading" className="mt-14 border-t border-gray-200 pt-8 dark:border-gray-800">
        <h2 id="alt-heading" className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          Prefer to browse?
        </h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          Every exhibition is reachable without an account, organised by place, industry and date.
        </p>
        <nav aria-label="Browse alternatives" className="mt-4 flex flex-wrap gap-3">
          {[
            { href: PUBLIC_ROUTES.exhibitions, label: "All exhibitions" },
            { href: `${PUBLIC_ROUTES.exhibitions}/this-week`, label: "This week" },
            { href: `${PUBLIC_ROUTES.exhibitions}/monthly`, label: "By month" },
            { href: PUBLIC_ROUTES.locations, label: "By country" },
            { href: PUBLIC_ROUTES.categories, label: "By industry" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-[#131C55] hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-300 dark:hover:text-blue-300"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </section>
    </div>
  );
}
