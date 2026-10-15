import Link from "next/link";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import EmptyState from "@/components/public/EmptyState";
import IndustryExplorer from "@/components/public/IndustryExplorer";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata, pageMetadata, NOINDEX_FOLLOW } from "@/lib/seo";
import { breadcrumbNode, graph, itemListNode } from "@/lib/jsonld";
import { categoryLandingPath } from "@/lib/routes";
import { getCategoryIndex, MIN_CATEGORY } from "@/lib/categories";

/**
 * The industry hub: /exhibitions-for
 *
 * Crawl depth for the category tier, and the page that answers "what kinds of
 * trade show are there?" — a question the individual category pages cannot.
 * Mirrors /exhibitions-in exactly, so the two tiers behave the same way.
 */

export const revalidate = 3600;

const TITLE = "Exhibitions by industry — trade shows by sector";
const DESCRIPTION =
  "Find exhibitions and trade shows by industry, from technology and manufacturing to textiles, agriculture and healthcare, each with dates and locations.";

/**
 * Indexable only once it has industries to list.
 *
 * Until the API projects `category` this hub has no content, and asking Google
 * to index an empty page is how a site collects "Crawled - currently not
 * indexed" and thin-content signals. It flips to index,follow by itself the
 * moment the backend ships — no code change, no redeploy of intent.
 */
export async function generateMetadata() {
  const { categories } = await getCategoryIndex();
  const opts = { title: TITLE, description: DESCRIPTION, path: PUBLIC_ROUTES.categories };
  return categories.length ? publicPageMetadata(opts) : pageMetadata({ ...opts, robots: NOINDEX_FOLLOW });
}

export default async function CategoriesHubPage() {
  const { categories } = await getCategoryIndex();

  const trail = [
    { name: "Home", path: "/" },
    { name: "Exhibitions by industry", path: PUBLIC_ROUTES.categories },
  ];

  const covered = categories.reduce((n, c) => n + c.count, 0);

  /*
   * Compact data for the interactive explorer: each industry's exhibitions as
   * [startDate, countryIndex] pairs into one shared country list. Built from the
   * records the index already holds - no extra request - and small enough to
   * ship (two short values per event). `today` travels with it so the client's
   * first render matches this HTML exactly.
   */
  const countryIndex = new Map();
  const countryNames = [];
  const indexOf = (name) => {
    const label = String(name || "").trim();
    if (!label) return -1;
    const key = label.toLowerCase();
    if (!countryIndex.has(key)) {
      countryIndex.set(key, countryNames.length);
      countryNames.push(label);
    }
    return countryIndex.get(key);
  };
  const today = new Date().toISOString().slice(0, 10);
  const explorerData = categories.map((c) => ({
    label: c.label,
    slug: c.slug,
    events: c.items
      .map((e) => [String(e.startDate || "").slice(0, 10), indexOf(e.country)])
      .filter(([d, ci]) => d.length === 10 && ci >= 0),
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        graph={graph(
          breadcrumbNode(trail),
          itemListNode(
            categories.map((c) => categoryLandingPath(c.slug)),
            { name: "Exhibition industries" }
          )
        )}
      />

      <Breadcrumbs trail={trail} />

      <header className="max-w-3xl">
        <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-[2.6rem] dark:text-white">
          Exhibitions by industry
        </h1>
        {categories.length ? (
          <>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
              Most trade shows are organised around a sector rather than a place. These are the{" "}
              {categories.length} industries in the OneXhib catalogue with enough upcoming
              exhibitions to browse on their own, covering {covered.toLocaleString("en-US")} events
              between them.
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
              An industry appears here with {MIN_CATEGORY} or more upcoming exhibitions. Smaller and
              more specific sectors can still be found by searching the{" "}
              <Link
                href={PUBLIC_ROUTES.exhibitions}
                className="underline underline-offset-4 hover:text-[#131C55] dark:hover:text-white"
              >
                full exhibitions listing
              </Link>
              .
            </p>
          </>
        ) : null}
      </header>

      {categories.length ? (
        <IndustryExplorer industries={explorerData} countries={countryNames} today={today} />
      ) : (
        <div className="mt-10">
          {/* Not an error state: the live API does not yet return `category`, so
              there is genuinely nothing to group. The page says so plainly
              rather than pretending the catalogue is empty. */}
          <EmptyState>
            Industry listings are not available yet. Browse the{" "}
            <Link
              href={PUBLIC_ROUTES.exhibitions}
              className="underline underline-offset-4 hover:text-[#131C55] dark:hover:text-white"
            >
              full exhibitions listing
            </Link>{" "}
            or{" "}
            <Link
              href={PUBLIC_ROUTES.locations}
              className="underline underline-offset-4 hover:text-[#131C55] dark:hover:text-white"
            >
              browse by location
            </Link>{" "}
            in the meantime.
          </EmptyState>
        </div>
      )}
    </div>
  );
}
