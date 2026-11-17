"use client";

import { useId } from "react";
import Image from "next/image";
import { ArrowUpRight, Newspaper } from "lucide-react";

import NewsImage from "@/components/public/NewsImage";
import { SliderControls, useSlider } from "@/components/public/SliderChrome";

/**
 * Industry news on the homepage, as a slider — the sibling of FeaturedSlider,
 * sharing its frame, controls and motion rules (see SliderChrome.jsx).
 *
 * WHY THIS ONE IS PHOTO-FIRST WHEN THE FEATURED SLIDER IS NOT
 * Featured exhibitions carry logos and posters of every shape, so that slider
 * keeps them small on a white card. News items carry editorial photos, nearly
 * all 1200×630-ish banners, which crop cleanly to a landscape frame. So here the
 * photo gets a large cover-fit panel, and on a phone it leads the slide.
 *
 * Every slide stays in the DOM (inactive ones are `inert` + aria-hidden), so the
 * server HTML holds every headline and outbound link for crawlers.
 */
export default function NewsSlider({ items = [], className = "" }) {
  const slides = items.filter(Boolean);
  const count = slides.length;
  const slider = useSlider(count);
  const { index, reducedMotion, rootProps } = slider;
  const baseId = useId();

  if (count === 0) return null;

  const upNext = count > 1 ? slides[(index + 1) % count] : null;

  return (
    <div
      {...rootProps}
      role="region"
      aria-roledescription="carousel"
      aria-label="Industry news"
      className={`relative isolate overflow-hidden rounded-[var(--radius-feature)] bg-gradient-to-br from-ox-night via-ox-navy to-ox-royal shadow-[0_30px_80px_-30px_color-mix(in_oklab,var(--color-ox-navy)_65%,transparent)] ring-1 ring-white/10 ${className}`}
    >
      <div
        className={`flex ${reducedMotion ? "" : "transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"}`}
        // --ox-dir is -1 under dir="rtl" (globals.css): a flex row runs
        // right-to-left there, so the track has to move the other way.
        style={{ transform: `translateX(calc(var(--ox-dir, 1) * -${index * 100}%))` }}
      >
        {slides.map((article, i) => (
          <Slide
            key={article.id}
            article={article}
            active={i === index}
            position={i + 1}
            total={count}
            id={`${baseId}-news-${i}`}
          />
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        Slide {index + 1} of {count}: {slides[index]?.title}
      </p>

      <SliderControls
        slider={slider}
        labels={slides.map((a) => a.title)}
        upNext={upNext?.title}
        prevLabel="Previous news story"
        nextLabel="Next news story"
      />
    </div>
  );
}

function Slide({ article, active, position, total, id }) {
  const { title, description, category, link, image, source } = article;

  return (
    <div
      id={id}
      role="group"
      aria-roledescription="slide"
      aria-label={`${position} of ${total}`}
      aria-hidden={!active}
      inert={!active}
      className="relative w-full shrink-0 grow-0 basis-full overflow-hidden"
    >
      {/* Backdrop: the photo blurred into a colour wash, under a scrim — the
          same treatment as the featured slider, so each story gets its own mood. */}
      {image ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 overflow-hidden"
        >
          <Image
            src={image}
            alt={title}
            fill
            sizes="100vw"
            unoptimized
            referrerPolicy="no-referrer"
            className={`object-cover opacity-50 blur-3xl saturate-150 ${active ? "ox-slide-drift" : ""}`}
            style={{ transform: "scale(1.4)" }}
          />
        </div>
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-ox-night/95 via-ox-navy/85 to-ox-navy/45"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-32 -z-10 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl"
      />

      <div className="grid items-center gap-8 px-6 pt-6 pb-28 sm:px-10 sm:pt-10 lg:grid-cols-[1fr_1.1fr] lg:gap-12 lg:px-12 lg:pt-12 lg:pb-28">
        {/* ── Copy ─────────────────────────────────────────────────────── */}
        <div className="relative min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-300 to-sky-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-sky-950 shadow-sm">
              <Newspaper size={12} aria-hidden="true" />
              News
            </p>
            {source ? (
              <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/80 ring-1 ring-white/20 backdrop-blur">
                {source}
              </p>
            ) : null}
          </div>

          {category ? (
            <p className="mt-5 line-clamp-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-200/80">
              {category}
            </p>
          ) : null}

          <h3 className="mt-2 line-clamp-3 text-2xl leading-[1.12] font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">
            {link ? (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer nofollow"
                // Stretched link over the copy column, as in FeaturedSlider.
                className="rounded-sm after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                {title}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              title
            )}
          </h3>

          <p className="mt-4 line-clamp-3 text-[15px] leading-relaxed text-white/75 sm:text-base">
            {description}
          </p>

          {link ? (
            <span
              aria-hidden="true"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-white py-3 pr-3 pl-6 text-[15px] font-semibold text-ox-navy shadow-lg shadow-black/20"
            >
              Read the full story
              <span className="grid h-8 w-8 place-items-center rounded-full bg-ox-navy text-white">
                <ArrowUpRight size={16} />
              </span>
            </span>
          ) : null}
        </div>

        {/* ── Photo ── leads the slide on a phone, sits right on desktop. */}
        <div className="order-first lg:order-none">
          <div
            className={`relative aspect-[16/10] w-full overflow-hidden rounded-3xl bg-white/5 shadow-2xl shadow-black/40 ring-1 ring-white/15 transition duration-700 motion-reduce:transition-none ${
              active ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
          >
            <NewsImage
              src={image}
              alt={title}
              sizes="(min-width: 1024px) 560px, 92vw"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
