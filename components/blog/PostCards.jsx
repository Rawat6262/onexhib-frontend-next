import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

import PostCover from "@/components/blog/PostCover";
import { blogPostPath } from "@/lib/routes";
import { formatPostDate } from "@/lib/blog";

/**
 * Three card shapes, deliberately unlike each other.
 *
 * A grid of identical cards gives every article the same weight, which is a
 * layout that refuses to have an editorial opinion. The featured card is a
 * two-column spread, secondary cards are portrait, and the compact row is text
 * with a thin cover - so the page reads as edited rather than generated.
 *
 * All three wrap the whole card in one <Link> rather than putting a link only on
 * the title: the entire surface is the target, there is a single tab stop per
 * card, and the focus ring lands on something the size of the card.
 */

function Meta({ post, className = "" }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-gray-500 dark:text-gray-400 ${className}`}>
      <time dateTime={post.published}>{formatPostDate(post.published)}</time>
      {post.readingMinutes ? (
        <span className="inline-flex items-center gap-1">
          <Clock size={12} aria-hidden="true" />
          {post.readingMinutes} min read
        </span>
      ) : null}
    </p>
  );
}

function CategoryChip({ children, onDark = false }) {
  if (!children) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
        onDark
          ? "bg-white/15 text-white ring-1 ring-inset ring-white/25"
          : "bg-[#131C55]/[0.06] text-[#131C55] ring-1 ring-inset ring-[#131C55]/10 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/20"
      }`}
    >
      {children}
    </span>
  );
}

/** The lead story: a wide editorial spread. */
export function FeaturedPostCard({ post, data }) {
  return (
    <article className="ox-reveal">
      <Link
        href={blogPostPath(post.slug)}
        className="group grid overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#131C55] lg:grid-cols-2 dark:border-gray-800 dark:bg-gray-900 dark:focus-visible:outline-blue-300"
      >
        <div className="relative order-first aspect-[16/10] w-full lg:order-last lg:aspect-auto lg:min-h-[22rem]">
          <PostCover kind={post.cover} data={data} />
        </div>

        <div className="flex flex-col justify-center gap-4 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryChip>{post.category}</CategoryChip>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Featured
            </span>
          </div>

          <h3 className="text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl dark:text-white">
            {post.title}
          </h3>

          <p className="text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
            {post.description}
          </p>

          <Meta post={post} />

          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#131C55] dark:text-blue-300">
            Read article
            <ArrowRight
              size={16}
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            />
          </span>
        </div>
      </Link>
    </article>
  );
}

/** Secondary stories: portrait cards with the cover on top. */
export function PostCard({ post, data }) {
  return (
    <article className="ox-reveal h-full">
      <Link
        href={blogPostPath(post.slug)}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#131C55] motion-reduce:hover:translate-y-0 dark:border-gray-800 dark:bg-gray-900 dark:focus-visible:outline-blue-300"
      >
        <div className="relative aspect-[16/10] w-full">
          <PostCover kind={post.cover} data={data} compact />
        </div>

        <div className="flex flex-1 flex-col gap-3 p-5">
          <CategoryChip>{post.category}</CategoryChip>

          <h3 className="text-[17px] font-bold leading-snug tracking-tight text-gray-900 dark:text-gray-50">
            {post.title}
          </h3>

          <p className="line-clamp-3 text-[14px] leading-relaxed text-gray-600 dark:text-gray-400">
            {post.description}
          </p>

          <div className="mt-auto flex items-center justify-between gap-3 pt-1">
            <Meta post={post} />
            <ArrowRight
              size={16}
              aria-hidden="true"
              className="shrink-0 text-[#131C55] transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none dark:text-blue-300"
            />
          </div>
        </div>
      </Link>
    </article>
  );
}

/** Compact row, used for "related reading" at the foot of an article. */
export function PostRow({ post, data }) {
  return (
    <article className="h-full">
      <Link
        href={blogPostPath(post.slug)}
        className="group flex h-full gap-4 rounded-2xl border border-gray-200 bg-white p-3 transition-colors hover:border-[#131C55]/30 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#131C55] dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/60 dark:focus-visible:outline-blue-300"
      >
        <div className="relative hidden h-20 w-28 shrink-0 overflow-hidden rounded-xl sm:block">
          <PostCover kind={post.cover} data={data} compact />
        </div>
        <div className="flex min-w-0 flex-col justify-center gap-1.5">
          <CategoryChip>{post.category}</CategoryChip>
          <h3 className="text-[15px] font-semibold leading-snug text-gray-900 dark:text-gray-50">
            {post.title}
          </h3>
          <Meta post={post} />
        </div>
      </Link>
    </article>
  );
}
