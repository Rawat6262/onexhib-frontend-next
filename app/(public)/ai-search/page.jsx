import Link from "next/link";
import { Sparkles } from "lucide-react";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import AiSearchClient from "@/components/public/AiSearchClient";
import { PUBLIC_ROUTES, pageMetadata, NOINDEX_FOLLOW } from "@/lib/seo";

/**
 * /ai-search — ask for exhibitions in plain language.
 *
 * WHY THIS IS noindex,follow
 * The page has no content of its own: everything below the search box requires
 * a signed-in session, so a crawler would only ever see the sign-in panel.
 * Indexing that would put a locked page into results for queries the catalogue
 * already answers with real listing pages. `follow` is kept so the links out of
 * the sign-in panel still pass through to the public tiers.
 *
 * It lives in the (public) group deliberately rather than under (dashboard):
 * the button is shown to everyone, so signed-out visitors have to be able to
 * reach the page and be told what it is. The gate is inside the component.
 */

export const metadata = pageMetadata({
  title: "AI exhibition search",
  description:
    "Ask for exhibitions in your own words and get matching listings from the OneXhib catalogue. Available to signed-in users.",
  path: "/ai-search",
  robots: NOINDEX_FOLLOW,
});

export default function AiSearchPage() {
  const trail = [
    { name: "Home", path: "/" },
    { name: "AI search", path: "/ai-search" },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Breadcrumbs trail={trail} />

      <header className="max-w-2xl">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-[#131C55]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#131C55] dark:bg-blue-400/10 dark:text-blue-300">
          <Sparkles size={12} aria-hidden="true" />
          AI search
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          Ask for exhibitions in your own words
        </h1>

        <p className="mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          Describe what you are looking for — an industry, a place, a month, or a specific show,
          venue or sponsor — and we will find the matching exhibitions in the catalogue.
        </p>

        {/* Says plainly what the AI does and does not do. The model only turns
            the sentence into filters; every result is a real database record. */}
        <p className="mt-2 text-[13px] leading-relaxed text-gray-500 dark:text-gray-500">
          Your question is used only to work out which filters to apply. Every result comes straight
          from the OneXhib catalogue — nothing is generated or invented. Prefer to browse instead?
          Use{" "}
          <Link href={PUBLIC_ROUTES.locations} className={link}>
            location
          </Link>{" "}
          or{" "}
          <Link href={PUBLIC_ROUTES.categories} className={link}>
            industry
          </Link>
          .
        </p>
      </header>

      <AiSearchClient />
    </div>
  );
}

const link = "underline underline-offset-4 hover:text-[#131C55] dark:hover:text-gray-300";
