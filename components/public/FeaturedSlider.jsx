"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, MapPin, Star } from "lucide-react";

import { exhibitionPath } from "@/lib/routes";
import { formatDateRange, formatLocation, toIsoDate } from "@/lib/format";

/**
 * Featured exhibitions, as a slider.
 *
 * WHY THE SLIDE IS TYPOGRAPHY-FIRST, NOT IMAGE-FIRST
 * The record images are logos and posters of wildly varying shape, hotlinked
 * from hosts we do not control, and some records have none at all. A hero
 * slider built around a full-bleed photo would therefore be inconsistent at
 * best and empty at worst. So the slide leads with the name, dates and
 * location on the brand gradient, and the image is a supporting panel on the
 * right. A slide with no image loses an accent, not its content.
 *
 * WHY EVERY SLIDE STAYS IN THE DOM
 * The track is translated, never virtualised, so all slides are in the server
 * HTML and a crawler reads the whole set. Inactive slides are `inert` (and
 * aria-hidden), which removes their links from the tab order and from the
 * accessibility tree without removing them from the markup.
 *
 * MOTION
 * Auto-advance pauses on hover, on keyboard focus, when the tab is hidden, and
 * is never started at all under prefers-reduced-motion. The transform
 * transition is likewise dropped for reduced motion, so the slider becomes a
 * plain manual pager rather than an animated one.
 */

const AUTOPLAY_MS = 6000;

export default function FeaturedSlider({ items = [], className = "" }) {
  const slides = items.filter(Boolean);
  const count = slides.length;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const rootRef = useRef(null);
  const baseId = useId();

  const go = useCallback(
    (next) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count]
  );
  const prev = useCallback(() => go(index - 1), [go, index]);
  const next = useCallback(() => go(index + 1), [go, index]);

  // Honour the OS "reduce motion" setting, and keep honouring it if the user
  // changes it while the page is open.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // A background tab should not burn timers advancing a slider nobody sees.
  useEffect(() => {
    const sync = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  useEffect(() => {
    if (reducedMotion || paused || count < 2) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [reducedMotion, paused, count]);

  // Arrow keys page the slider, but only while focus is inside it — a global
  // listener would hijack arrow keys for the whole page.
  const onKeyDown = (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    }
  };

  if (count === 0) return null;

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured exhibitions"
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget)) setPaused(false);
      }}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#131C55] to-[#0E1B6B] ${className}`}
    >
      {/* Faint grid wash, matching the CardMedia placeholder's texture so the
          slider reads as part of the same family. Inline SVG: no request. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Cpath d='M32 0H0v32' fill='none' stroke='%23ffffff' stroke-width='1'/%3E%3C/svg%3E\")",
        }}
      />

      <div
        className={`flex ${reducedMotion ? "" : "transition-transform duration-500 ease-out"}`}
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((exhibition, i) => (
          <Slide
            key={exhibition.id}
            exhibition={exhibition}
            active={i === index}
            priority={i === 0}
            position={i + 1}
            total={count}
            id={`${baseId}-slide-${i}`}
          />
        ))}
      </div>

      {/* Announce slide changes to screen readers without moving focus. */}
      <p className="sr-only" aria-live="polite">
        Slide {index + 1} of {count}
      </p>

      {/* Controls sit in a bar along the bottom rather than floating over the
          middle of the slide — vertically centred arrows landed on top of the
          headline, which runs to three lines on the longer exhibition names.
          The bar itself is click-through; only the buttons take pointer events. */}
      {count > 1 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-4 px-6 pb-6 sm:px-10 lg:px-12">
          <div className="pointer-events-auto flex flex-wrap gap-2">
            {slides.map((exhibition, i) => (
              <button
                key={exhibition.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}: ${exhibition.name}`}
                aria-current={i === index ? "true" : undefined}
                className={`h-1.5 rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none ${
                  i === index ? "w-7 bg-white" : "w-2.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>

          <div className="pointer-events-auto flex shrink-0 gap-2">
            <SliderButton onClick={prev} label="Previous featured exhibition">
              <ChevronLeft size={18} aria-hidden="true" />
            </SliderButton>
            <SliderButton onClick={next} label="Next featured exhibition">
              <ChevronRight size={18} aria-hidden="true" />
            </SliderButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * One slide. `inert` on the inactive ones is what keeps their links out of the
 * tab order — without it, tabbing would walk into slides that are translated
 * off-screen and the browser would scroll the track sideways to chase focus.
 */
function Slide({ exhibition, active, priority, position, total, id }) {
  const { id: exhibitionId, name, startDate, endDate, category, venue, city, state, country, image } =
    exhibition;

  const dates = formatDateRange(startDate, endDate);
  const place = formatLocation({ venue, city, state, country });
  const href = exhibitionPath(name, exhibitionId);

  return (
    <div
      id={id}
      role="group"
      aria-roledescription="slide"
      aria-label={`${position} of ${total}`}
      aria-hidden={!active}
      // React 19 renders the `inert` boolean attribute natively.
      inert={!active}
      className="w-full shrink-0 grow-0 basis-full"
    >
      <div className="grid items-center gap-8 px-6 pb-24 pt-10 sm:px-10 sm:pt-12 lg:grid-cols-[1.15fr_1fr] lg:gap-12 lg:px-12 lg:pb-24 lg:pt-14">
        {/* ── Copy ──────────────────────────────────────────────────────── */}
        {/* `relative` is load-bearing: it is what the stretched link below
            resolves its inset-0 against. Without it the overlay would size to
            the slider root and swallow the whole component. */}
        <div className="relative min-w-0">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-50 backdrop-blur">
            <Star size={12} aria-hidden="true" />
            Featured
          </p>

          {/* Categories in this data run to full sentences ("Natural fibers
              (cotton, wool, silk…) and synthetic/blended yarns…"), so this is
              clamped to one line rather than allowed to wrap into a block. */}
          {category ? (
            <p className="mt-3 line-clamp-1 text-[11px] font-semibold uppercase tracking-wide text-blue-200/80">
              {category}
            </p>
          ) : null}

          <h3 className="mt-2 line-clamp-3 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
            <Link
              href={href}
              // Stretched link: the heading carries the href so the accessible
              // name is the exhibition, while ::after makes the copy column
              // clickable. Scoped to the column, so it never covers the controls.
              className="rounded-sm after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              {name}
            </Link>
          </h3>

          <dl className="mt-5 space-y-2 text-[15px] text-blue-100/90">
            {dates ? (
              <div className="flex items-start gap-2.5">
                <dt className="sr-only">Dates</dt>
                <CalendarDays size={17} className="mt-0.5 shrink-0 text-blue-200/70" aria-hidden="true" />
                <dd>
                  <time dateTime={toIsoDate(startDate)}>{dates}</time>
                </dd>
              </div>
            ) : null}

            {place ? (
              <div className="flex items-start gap-2.5">
                <dt className="sr-only">Location</dt>
                <MapPin size={17} className="mt-0.5 shrink-0 text-blue-200/70" aria-hidden="true" />
                <dd className="line-clamp-2">{place}</dd>
              </div>
            ) : null}
          </dl>

          {/* Visual affordance only — the stretched heading link above is the
              real target, so this is aria-hidden to avoid a duplicate link. */}
          <span
            aria-hidden="true"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[15px] font-semibold text-[#131C55]"
          >
            View exhibition
            <ArrowRight size={17} />
          </span>
        </div>

        {/* ── Media ─────────────────────────────────────────────────────── */}
        <SlideMedia image={image} name={name} priority={priority} />
      </div>
    </div>
  );
}

/**
 * The image panel. When there is no usable image the panel collapses on small
 * screens and becomes an initials mark on large ones — the slide never shows a
 * hole, and never reserves a big empty box on a phone.
 */
function SlideMedia({ image, name, priority }) {
  if (image) {
    return (
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/15">
        <Image
          src={image.url}
          alt={name}
          fill
          sizes="(min-width: 1024px) 480px, 90vw"
          priority={priority}
          unoptimized={!image.optimized}
          // object-contain, not cover: most of these images are logos and
          // portrait posters rather than 16:10 banners, and cropping them to
          // fill the panel cuts the wordmark in half. Letterboxing against the
          // translucent panel reads as deliberate; a beheaded logo does not.
          className="object-contain p-4"
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="relative hidden aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-2xl bg-white/[0.07] ring-1 ring-white/15 lg:flex"
    >
      <span className="text-5xl font-bold tracking-tight text-white/25 select-none">
        {initials(name)}
      </span>
    </div>
  );
}

/** Initials from a record name: "India Textile Expo" -> "IT". Mirrors CardMedia. */
function initials(label) {
  const words = String(label || "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "OX";
  return words
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function SliderButton({ onClick, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex items-center justify-center rounded-full border border-white/25 bg-white/10 p-2.5 text-white backdrop-blur transition hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
    >
      {children}
    </button>
  );
}
