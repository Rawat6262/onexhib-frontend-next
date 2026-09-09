import Link from "next/link";

import ProsePage from "@/components/public/ProsePage";
import JsonLd from "@/components/seo/JsonLd";
import { graph, itemListNode } from "@/lib/jsonld";
import { formatPostDate, getAllPosts, isBlogEmpty } from "@/lib/blog";
import { blogPostPath } from "@/lib/routes";
import { PUBLIC_ROUTES, pageMetadata, publicPageMetadata } from "@/lib/seo";

/**
 * /blog - the post index.
 *
 * NOINDEX WHILE EMPTY. A hub with no posts is a thin page, and asking Google to
 * index one is exactly the doorway-page pattern this site avoids everywhere
 * else. The same rule already governs the industry hub, so the behaviour is
 * consistent rather than special-cased here. The sitemap omits it on the same
 * condition (see app/sitemap.js).
 */
const empty = isBlogEmpty();

export const metadata = empty
  ? pageMetadata({
      title: "Blog",
      description: "Articles about exhibitions and trade shows.",
      path: PUBLIC_ROUTES.blog,
      robots: { index: false, follow: true },
    })
  : publicPageMetadata({
      title: "Blog",
      description:
        "Data-led articles on exhibitions and trade shows — where they happen, when the season peaks, and how to plan around it.",
      path: PUBLIC_ROUTES.blog,
    });

export default function BlogIndexPage() {
  const posts = getAllPosts();
  const trail = [
    { name: "Home", path: "/" },
    { name: "Blog", path: PUBLIC_ROUTES.blog },
  ];

  return (
    <ProsePage
      title="Blog"
      intro="Articles built from the exhibition data on OneXhib — what it shows, and what it means if you are planning where to exhibit."
      trail={trail}
    >
      {posts.length ? (
        <JsonLd
          graph={graph(
            itemListNode(
              posts.map((p) => blogPostPath(p.slug)),
              { name: "OneXhib blog posts" }
            )
          )}
        />
      ) : null}

      {posts.length === 0 ? (
        <p className="text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          No articles yet. In the meantime, browse{" "}
          <Link href={PUBLIC_ROUTES.exhibitions} className={link}>
            upcoming exhibitions
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-8">
          {posts.map((post) => (
            <li key={post.slug}>
              <article>
                <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
                  <Link href={blogPostPath(post.slug)} className="hover:underline">
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
                  {post.description}
                </p>
                <p className="mt-2 text-[13px] text-gray-500 dark:text-gray-500">
                  <time dateTime={post.published}>{formatPostDate(post.published)}</time>
                  {post.readingMinutes ? ` · ${post.readingMinutes} min read` : ""}
                </p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </ProsePage>
  );
}

const link =
  "font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300";
