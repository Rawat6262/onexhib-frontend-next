import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import PostCover from "@/components/blog/PostCover";
import { PostRow } from "@/components/blog/PostCards";
import DiscoverGrid from "@/components/blog/DiscoverGrid";
import { blogPostingNode, breadcrumbNode, graph } from "@/lib/jsonld";
import { formatPostDate, getAllPosts, getPost, getPostsExcept } from "@/lib/blog";
import { getBlogData } from "@/lib/blog-data";
import { blogPostPath, countryLandingPath } from "@/lib/routes";
import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";

/**
 * /blog/[slug] - a single post.
 *
 * ROUTING AND SEO ARE UNCHANGED by the redesign: same URL, same
 * generateStaticParams, same dynamicParams=false, same publicPageMetadata and
 * the same BlogPosting + BreadcrumbList graph. Only the presentation moved.
 *
 * Still fully static. getBlogData() is awaited for the cover and the footer
 * links, but it reads endpoints the rest of the app already fetches, so it is
 * served from Next's cache rather than costing a request per post.
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

export default async function BlogPostPage({ params }) {
  const post = getPost(params.slug);
  if (!post) notFound();

  const path = blogPostPath(post.slug);
  const trail = [
    { name: "Home", path: "/" },
    { name: "Blog", path: PUBLIC_ROUTES.blog },
    { name: post.title, path },
  ];
  const { Body } = post;
  const related = getPostsExcept(post.slug);
  const data = await getBlogData();

  return (
    <>
      <JsonLd graph={graph(breadcrumbNode(trail), blogPostingNode(post, { path }))} />

      {/* ---------------- Article hero ---------------- */}
      <header className="relative overflow-hidden border-b border-gray-200 bg-gradient-to-b from-[#F7F8FC] to-white dark:border-gray-800 dark:from-gray-950 dark:to-gray-950">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.55] dark:opacity-[0.22]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(19,28,85,.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(19,28,85,.05) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, #000 40%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, #000 40%, transparent 100%)",
          }}
        />

        <div className="relative mx-auto w-full max-w-3xl px-4 pb-10 pt-6 sm:px-6 sm:pb-12">
          <Breadcrumbs trail={trail} />

          <div className="ox-reveal mt-6">
            {post.category ? (
              <span className="inline-flex items-center rounded-full bg-[#131C55]/[0.06] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#131C55] ring-1 ring-inset ring-[#131C55]/10 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/20">
                {post.category}
              </span>
            ) : null}

            <h1 className="mt-4 text-3xl font-bold leading-[1.15] tracking-tight text-gray-900 sm:text-4xl dark:text-white">
              {post.title}
            </h1>

            <p className="mt-4 text-[16px] leading-relaxed text-gray-600 sm:text-[17px] dark:text-gray-400">
              {post.description}
            </p>

            <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-gray-500 dark:text-gray-400">
              <time dateTime={post.published}>{formatPostDate(post.published)}</time>
              {post.readingMinutes ? (
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={13} aria-hidden="true" />
                  {post.readingMinutes} min read
                </span>
              ) : null}
            </p>
          </div>
        </div>
      </header>

      {/* ---------------- Featured visual ---------------- */}
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        <div className="ox-reveal -mt-2 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-gray-200 shadow-lg sm:aspect-[21/9] dark:border-gray-800">
          <PostCover kind={post.cover} data={data} />
        </div>
      </div>

      {/* ---------------- Article body ---------------- */}
      <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="ox-reveal">
          <Body />
        </div>

        {/* Route back into the catalogue the article is about. */}
        {data.topCountries.length ? (
          <aside
            aria-labelledby="jump-in-heading"
            className="mt-12 rounded-2xl border border-gray-200 bg-[#FAFBFE] p-5 sm:p-6 dark:border-gray-800 dark:bg-gray-900/50"
          >
            <h2
              id="jump-in-heading"
              className="text-[15px] font-bold tracking-tight text-gray-900 dark:text-gray-50"
            >
              Browse the data behind this article
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
              Every country named above has its own page of live listings.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {data.topCountries.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={countryLandingPath(c.slug)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:border-[#131C55]/30 hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-blue-300 dark:focus-visible:outline-blue-300"
                  >
                    {c.label}
                    <span className="tabular-nums text-gray-400 dark:text-gray-500">{c.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}

        <p className="mt-10 border-t border-gray-200 pt-6 dark:border-gray-800">
          <Link
            href={PUBLIC_ROUTES.blog}
            className="group inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#131C55] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#131C55] dark:text-blue-300 dark:focus-visible:outline-blue-300"
          >
            <ArrowLeft
              size={16}
              aria-hidden="true"
              className="transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none"
            />
            All articles
          </Link>
        </p>
      </article>

      {/* ---------------- Related reading ---------------- */}
      {related.length ? (
        <section
          aria-labelledby="related-heading"
          className="border-t border-gray-200 py-12 dark:border-gray-800"
        >
          <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
            <h2
              id="related-heading"
              className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl dark:text-gray-50"
            >
              Keep reading
            </h2>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {related.map((p) => (
                <li key={p.slug}>
                  <PostRow post={p} data={data} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ---------------- Explore more on OneXhib ---------------- */}
      <section
        aria-labelledby="explore-heading"
        className="border-t border-gray-200 bg-[#FAFBFE] py-12 sm:py-14 dark:border-gray-800 dark:bg-gray-900/40"
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="max-w-2xl">
              <h2
                id="explore-heading"
                className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl dark:text-gray-50"
              >
                Explore more on OneXhib
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
                The catalogues this article was counted from.
              </p>
            </div>
            <Link
              href={PUBLIC_ROUTES.exhibitions}
              className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[#131C55] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#131C55] dark:text-blue-300 dark:focus-visible:outline-blue-300"
            >
              Browse all exhibitions
              <ArrowRight
                size={16}
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
              />
            </Link>
          </div>

          <div className="mt-6">
            <DiscoverGrid counts={data.counts} upcomingTotal={data.upcomingTotal} />
          </div>
        </div>
      </section>
    </>
  );
}
