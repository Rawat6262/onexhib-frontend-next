import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Standard section frame: an <h2>, optional intro, optional CTA, and the
 * content. Using one component for every section is what keeps the heading
 * hierarchy honest — the page has exactly one <h1> in the hero and every
 * section below it is an <h2>, with card titles as <h3>.
 */
export default function Section({
  id,
  eyebrow,
  title,
  intro,
  cta,
  ctaHref,
  children,
  className = "",
  headingClassName = "",
}) {
  return (
    <section
      id={id}
      // aria-labelledby ties the region to its heading so assistive tech can
      // list the page's sections by name.
      aria-labelledby={id ? `${id}-heading` : undefined}
      className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}
    >
      <div className="ox-reveal">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="max-w-2xl">
            {/* Eyebrow: a short label that groups the long home page into
                chapters (Discover, Explore, For business…) so the eye can tell
                one block of rails from the next without reading the headings. */}
            {eyebrow ? (
              <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#2B3FB8] dark:text-blue-300">
                <span aria-hidden="true" className="h-px w-6 bg-current opacity-60" />
                {eyebrow}
              </p>
            ) : null}
            <h2
              id={id ? `${id}-heading` : undefined}
              className={`text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-gray-50 ${headingClassName}`}
            >
              {title}
            </h2>
            {intro ? (
              <p className="mt-2 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">{intro}</p>
            ) : null}
          </div>

          {cta && ctaHref ? (
            <Link
              href={ctaHref}
              className="group inline-flex shrink-0 items-center gap-1.5 rounded-lg text-sm font-semibold text-[#131C55] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#131C55] dark:text-blue-300 dark:focus-visible:outline-blue-300"
            >
              {cta}
              <ArrowRight
                size={16}
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
              />
            </Link>
          ) : null}
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}
