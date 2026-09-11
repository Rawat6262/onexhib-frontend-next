import Link from "next/link";
import { ArrowUpRight, Newspaper } from "lucide-react";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import EmptyState from "@/components/public/EmptyState";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata, pageMetadata, NOINDEX_FOLLOW } from "@/lib/seo";
import { breadcrumbNode, graph, itemListNode } from "@/lib/jsonld";
import { getNews } from "@/lib/newsroom";

/**
 * /news — industry news from the backend's news feed.
 *
 * INDEXABLE ONLY ONCE IT HAS SOMETHING TO SAY. The route follows the same rule
 * the blog hub already uses: noindex,follow while empty, indexable the moment a
 * publishable article exists, and listed in app/sitemap.js only in that second
 * state. A hub with no items is a thin page, and pointing a crawler at one is
 * worse than not having the route.
 *
 * Records are filtered by lib/newsroom.js before they reach here. Today the
 * feed holds two test rows ("rgr", "sdfgf"), so nothing renders and the page
 * shows an honest empty state rather than gibberish. Nothing about this page
 * changes when real news is added - it simply starts showing it.
 */

export const revalidate = 1800;

const TITLE = "Exhibition industry news";
const DESCRIPTION =
  "News and announcements from the exhibition and trade show industry, alongside the events listed on OneXhib.";

export async function generateMetadata() {
  const { items } = await getNews();
  const path = "/news";

  if (!items.length) {
    return pageMetadata({ title: TITLE, description: DESCRIPTION, path, robots: NOINDEX_FOLLOW });
  }
  return publicPageMetadata({ title: TITLE, description: DESCRIPTION, path });
}

export default async function NewsPage() {
  const { items } = await getNews();

  const trail = [
    { name: "Home", path: "/" },
    { name: "News", path: "/news" },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        graph={graph(
          breadcrumbNode(trail),
          items.length ? itemListNode(items.map(() => "/news"), { name: TITLE }) : null
        )}
      />

      <Breadcrumbs trail={trail} />

      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          {TITLE}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          Announcements and updates from across the exhibition industry. For longer, data-led pieces
          on where and when trade shows happen, see the{" "}
          <Link
            href={PUBLIC_ROUTES.blog}
            className="font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300"
          >
            OneXhib blog
          </Link>
          .
        </p>
      </header>

      {items.length ? (
        <ul className="mt-10 grid list-none grid-cols-1 gap-5 sm:grid-cols-2">
          {items.map((article) => (
            <li
              key={article.id}
              className="ox-card flex flex-col rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              {article.category ? (
                <span className="line-clamp-1 text-[11px] font-semibold uppercase tracking-wide text-[#131C55] dark:text-blue-300">
                  {article.category}
                </span>
              ) : null}
              <h2 className="mt-1.5 text-lg font-semibold leading-snug text-gray-900 dark:text-gray-50">
                {article.title}
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
                {article.description}
              </p>
              {/* Rendered only for a public https destination — a link to a
                  private inbox or an http URL is dropped upstream. */}
              {article.link ? (
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="mt-4 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-[#131C55] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:text-blue-300"
                >
                  Read the full story
                  <ArrowUpRight size={15} aria-hidden="true" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-10">
          <EmptyState>
            <Newspaper size={20} aria-hidden="true" className="mx-auto mb-2 text-gray-400" />
            No industry news has been published yet. In the meantime, the{" "}
            <Link
              href={PUBLIC_ROUTES.blog}
              className="font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300"
            >
              blog
            </Link>{" "}
            covers where and when exhibitions happen, and{" "}
            <Link
              href={`${PUBLIC_ROUTES.exhibitions}/this-week`}
              className="font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300"
            >
              this week&apos;s exhibitions
            </Link>{" "}
            is updated continuously.
          </EmptyState>
        </div>
      )}
    </div>
  );
}
