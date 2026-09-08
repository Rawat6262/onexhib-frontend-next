import Link from "next/link";
import { Tag } from "lucide-react";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import EmptyState from "@/components/public/EmptyState";
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
  "Find exhibitions and trade shows by industry, from technology and manufacturing to textiles, agriculture and healthcare. Each sector lists its upcoming events with dates and locations.";

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
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
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
        <ul className="mt-10 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={categoryLandingPath(c.slug)}
                className="ox-card flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 hover:border-[#131C55]/40 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-600"
              >
                <span className="inline-flex w-fit rounded-xl bg-[#131C55]/10 p-2.5 text-[#131C55] dark:bg-blue-400/10 dark:text-blue-300">
                  <Tag size={20} aria-hidden="true" />
                </span>
                <h2 className="mt-3.5 text-base font-semibold text-gray-900 dark:text-gray-50">
                  {c.label} exhibitions
                </h2>
                <p className="mt-1.5 text-[15px] text-gray-600 dark:text-gray-400">
                  {c.count} upcoming {c.count === 1 ? "event" : "events"}
                  {c.countries.length ? <> · {c.countries.slice(0, 2).map((x) => x.name).join(", ")}</> : null}
                </p>
              </Link>
            </li>
          ))}
        </ul>
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
