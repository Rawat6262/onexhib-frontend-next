import { notFound } from "next/navigation";
import Link from "next/link";

import ProsePage from "@/components/public/ProsePage";
import JsonLd from "@/components/seo/JsonLd";
import { blogPostingNode, graph } from "@/lib/jsonld";
import { formatPostDate, getAllPosts, getPost } from "@/lib/blog";
import { blogPostPath } from "@/lib/routes";
import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";

/**
 * /blog/[slug] - a single post.
 *
 * Fully static: the set of posts is fixed at build time, so generateStaticParams
 * prerenders every one and an unknown slug 404s rather than rendering an empty
 * shell. `dynamicParams = false` is what enforces that — without it, Next would
 * try to render arbitrary slugs on demand.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }) {
  const post = getPost(params.slug);
  if (!post) return {};
  return publicPageMetadata({
    title: post.title,
    description: post.description,
    path: blogPostPath(post.slug),
  });
}

export default function BlogPostPage({ params }) {
  const post = getPost(params.slug);
  if (!post) notFound();

  const path = blogPostPath(post.slug);
  const trail = [
    { name: "Home", path: "/" },
    { name: "Blog", path: PUBLIC_ROUTES.blog },
    { name: post.title, path },
  ];
  const { Body } = post;

  return (
    <ProsePage
      title={post.title}
      intro={post.description}
      trail={trail}
      aside={
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
          <time dateTime={post.published}>{formatPostDate(post.published)}</time>
          {post.readingMinutes ? ` · ${post.readingMinutes} min read` : ""}
        </p>
      }
    >
      <JsonLd graph={graph(blogPostingNode(post, { path }))} />

      <div>
        <Body />
      </div>

      <p className="border-t border-gray-200 pt-6 text-[15px] text-gray-600 dark:border-gray-800 dark:text-gray-400">
        ← Back to{" "}
        <Link href={PUBLIC_ROUTES.blog} className={link}>
          all articles
        </Link>
      </p>
    </ProsePage>
  );
}

const link =
  "font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300";
