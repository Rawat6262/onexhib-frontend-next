"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, Sparkles } from "lucide-react";

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
 * location, and the image sits on a raised card on the right. A slide with no
 * image loses an accent, not its content.
 *
 * WHERE THE COLOUR COMES FROM
 * Each slide's backdrop is its own image, blurred far past recognition and
 * drifting slowly under a navy scrim. A logo blurred that hard is just its
 * palette, so every slide gets a mood of its own (THAIFEX goes electric blue,
 * a textile fair goes warm) without any per-record art direction — and the
 * scrim keeps white text readable whatever the palette is. No image, no wash:
 * the slide falls back to the brand gradient underneath.
 *
 * WHY EVERY SLIDE STAYS IN THE DOM
 * The track is translated, never virtualised, so all slides are in the server
 * HTML and a crawler reads the whole set. Inactive slides are `inert` (and
 * aria-hidden), which removes their links from the tab order and from the
 * accessibility tree without removing them from the markup.
 *
 * MOTION
 * Auto-advance pauses on hover, on keyboard focus, when the tab is hidden, and
 * is never started at all under prefers-reduced-motion. The active dot fills
 * as a progress bar over the interval and freezes while paused. The transform
 * transition, the progress fill and the backdrop drift are all dropped for
 * reduced motion (see .ox-slide-* in globals.css), so the slider becomes a
 * plain manual pager rather than an animated one.
 */

const AUTOPLAY_MS = 6000;
const DAY_MS = 86_400_000;

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

  // setTimeout keyed on `index`, not setInterval: a manual jump restarts the full
  // interval, so the progress bar (which restarts on the same key) and the
  // actual advance can never disagree about how long is left.
  useEffect(() => {
    if (reducedMotion || paused || count < 2) return undefined;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [reducedMotion, paused, count, index]);

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

  const upNext = count > 1 ? slides[(index + 1) % count] : null;

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
      className={`relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0B1240] via-[#131C55] to-[#1B2A7A] shadow-[0_30px_80px_-30px_rgba(19,28,85,0.65)] ring-1 ring-white/10 ${className}`}
    >
      <div
        className={`flex ${reducedMotion ? "" : "transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"}`}
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((exhibition, i) => (
          <Slide
            key={exhibition.id}
            exhibition={exhibition}
            active={i === index}
            // No preload: the slider sits below the hero, so on load nothing in it
            // is visible and a preload here only triggers Chrome's unused-preload
            // warning. The first slide still loads normally as it scrolls in.
            priority={false}
            position={i + 1}
            total={count}
            id={`${baseId}-slide-${i}`}
          />
        ))}
      </div>

      {/* Announce slide changes to screen readers without moving focus. */}
      <p className="sr-only" aria-live="polite">
        Slide {index + 1} of {count}: {slides[index]?.name}
      </p>

      {/* Controls sit in a bar along the bottom rather than floating over the
          middle of the slide — vertically centred arrows landed on top of the
          headline, which runs to three lines on the longer exhibition names.
          The bar itself is click-through; only the controls take pointer events. */}
      {count > 1 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 border-t border-white/10 bg-gradient-to-t from-black/30 to-transparent px-6 py-4 sm:px-10 lg:px-12">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-5">
              <p className="shrink-0 font-semibold tabular-nums text-white" aria-hidden="true">
                <span className="text-lg">{pad(index + 1)}</span>
                <span className="text-sm text-white/45"> / {pad(count)}</span>
              </p>

              {/* Many slides do not fit as dots on a phone; the counter says enough there. */}
              <div className={`pointer-events-auto items-center gap-1.5 ${count > 8 ? "hidden sm:flex" : "flex"}`}>
                {slides.map((exhibition, i) => {
                  const active = i === index;
                  return (
                    <button
                      key={exhibition.id}
                      type="button"
                      onClick={() => go(i)}
                      aria-label={`Go to slide ${i + 1}: ${exhibition.name}`}
                      aria-current={active ? "true" : undefined}
                      className={`relative h-1.5 overflow-hidden rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none ${
                        active ? "w-10 bg-white/25" : "w-2.5 bg-white/35 hover:bg-white/70"
                      }`}
                    >
                      {active ? (
                        <span
                          key={index}
                          aria-hidden="true"
                          className={`absolute inset-0 rounded-full bg-white ${reducedMotion ? "" : "ox-slide-progress"}`}
                          style={{
                            "--ox-slide-ms": `${AUTOPLAY_MS}ms`,
                            animationPlayState: paused ? "paused" : "running",
                          }}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {upNext ? (
                <p className="hidden min-w-0 truncate text-sm text-white/55 md:block">
                  <span className="text-white/40">Next up · </span>
                  <span className="font-medium text-white/80">{upNext.name}</span>
                </p>
              ) : null}
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
  const tile = dateTile(startDate, endDate);
  const status = statusOf(startDate, endDate);

  return (
    <div
      id={id}
      role="group"
      aria-roledescription="slide"
      aria-label={`${position} of ${total}`}
      aria-hidden={!active}
      // React 19 renders the `inert` boolean attribute natively.
      inert={!active}
      className="relative w-full shrink-0 grow-0 basis-full overflow-hidden"
    >
      {/* ── Backdrop: the slide's own palette, then a scrim for contrast ── */}
      {image ? (
        <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
          {/* Named rather than alt="": the wrapper is aria-hidden, so screen readers
              skip it either way, and SEO checkers stop counting a blank alt. */}
          <Image
            src={image.url}
            alt={name}
            fill
            sizes="100vw"
            unoptimized={!image.optimized}
            className={`object-cover opacity-60 blur-3xl saturate-150 ${active ? "ox-slide-drift" : ""}`}
            style={{ transform: "scale(1.4)" }}
          />
        </div>
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0B1240]/95 via-[#131C55]/80 to-[#131C55]/35"
      />
      {/* Soft light from the top-left, and a dotted texture so large flat areas
          of the wash do not band. Inline SVG: no request. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-32 -z-10 h-96 w-96 rounded-full bg-blue-400/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.08]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23ffffff'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="grid items-center gap-10 px-6 pt-10 pb-28 sm:px-10 sm:pt-12 lg:grid-cols-[1.2fr_1fr] lg:gap-14 lg:px-12 lg:pt-14 lg:pb-28">
        {/* ── Copy ──────────────────────────────────────────────────────── */}
        {/* `relative` is load-bearing: it is what the stretched link below
            resolves its inset-0 against. Without it the overlay would size to
            the slider root and swallow the whole component. */}
        <div className="relative min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 to-amber-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-950 shadow-sm">
              <Sparkles size={12} aria-hidden="true" />
              Featured
            </p>
            {status ? (
              <p
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ring-1 backdrop-blur ${status.className}`}
                // Days-to-go is computed against "now", which can differ by a day
                // between the server render and hydration around midnight.
                suppressHydrationWarning
              >
                {status.live ? (
                  <span aria-hidden="true" className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75 motion-reduce:animate-none" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400" />
                  </span>
                ) : null}
                {status.label}
              </p>
            ) : null}
          </div>

          {/* Categories in this data run to full sentences ("Natural fibers
              (cotton, wool, silk…) and synthetic/blended yarns…"), so this is
              clamped to one line rather than allowed to wrap into a block. */}
          {category ? (
            <p className="mt-5 line-clamp-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-200/80">
              {category}
            </p>
          ) : null}

          <h3 className="mt-2 line-clamp-3 text-3xl leading-[1.08] font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
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

          <dl className="mt-6 flex flex-wrap items-stretch gap-3">
            {tile ? (
              <div className="flex items-center gap-3 rounded-2xl bg-white/10 py-2 pr-4 pl-2 ring-1 ring-white/15 backdrop-blur">
                <dt className="sr-only">Dates</dt>
                {/* Calendar tile: month over day, the shape people already read
                    as "a date" at a glance. */}
                <span
                  aria-hidden="true"
                  className="flex min-w-12 flex-col overflow-hidden rounded-xl bg-white text-center shadow-sm"
                >
                  <span className="bg-rose-500 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    {tile.month}
                  </span>
                  <span
                    className={`px-1.5 py-1 leading-none font-extrabold whitespace-nowrap text-gray-900 ${
                      tile.day.length > 2 ? "text-base" : "text-lg"
                    }`}
                  >
                    {tile.day}
                  </span>
                </span>
                <dd className="text-[15px] leading-snug font-medium text-white">
                  <time dateTime={toIsoDate(startDate)}>{dates}</time>
                </dd>
              </div>
            ) : null}

            {place ? (
              <div className="flex min-w-0 max-w-full items-center gap-2.5 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur">
                <dt className="sr-only">Location</dt>
                <MapPin size={18} className="shrink-0 text-blue-200" aria-hidden="true" />
                <dd className="line-clamp-2 text-[15px] leading-snug font-medium text-white">{place}</dd>
              </div>
            ) : null}
          </dl>

          {/* Visual affordance only — the stretched heading link above is the
              real target, so this is aria-hidden to avoid a duplicate link. */}
          <span
            aria-hidden="true"
            className="group/cta mt-8 inline-flex items-center gap-2 rounded-full bg-white py-3 pr-3 pl-6 text-[15px] font-semibold text-[#131C55] shadow-lg shadow-black/20"
          >
            View exhibition
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#131C55] text-white">
              <ArrowRight size={16} />
            </span>
          </span>
        </div>

        {/* ── Media ─────────────────────────────────────────────────────── */}
        <SlideMedia image={image} name={name} priority={priority} active={active} />
      </div>
    </div>
  );
}

/**
 * The image on a raised white card, with two tilted ghost cards behind it so
 * the panel reads as a stack of shows rather than a lone box. White, not
 * translucent: these are logos designed for white backgrounds, and on the old
 * navy-glass panel dark wordmarks all but disappeared.
 *
 * With no usable image the stack collapses on small screens and shows an
 * initials mark on large ones — the slide never shows a hole, and never
 * reserves a big empty box on a phone.
 */
function SlideMedia({ image, name, priority, active }) {
  return (
    <div className={`relative mx-auto w-full max-w-md ${image ? "" : "hidden lg:block"}`}>
      <div
        aria-hidden="true"
        className="absolute inset-0 translate-x-5 translate-y-3 rotate-6 rounded-3xl bg-white/10 ring-1 ring-white/15"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 translate-x-2.5 translate-y-1.5 rotate-3 rounded-3xl bg-white/15 ring-1 ring-white/20"
      />
      <div
        className={`relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-2xl shadow-black/40 ring-1 ring-black/5 transition duration-700 motion-reduce:transition-none ${
          image ? "bg-white" : "bg-gradient-to-br from-white/20 to-white/5"
        } ${active ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
      >
        {image ? (
          <Image
            src={image.url}
            alt={name}
            fill
            sizes="(min-width: 1024px) 448px, 90vw"
            priority={priority}
            unoptimized={!image.optimized}
            // object-contain, not cover: most of these images are logos and
            // portrait posters rather than banners, and cropping them to fill
            // the card cuts the wordmark in half.
            className="object-contain p-8"
          />
        ) : (
          <span
            aria-hidden="true"
            className="absolute inset-0 grid place-items-center text-6xl font-extrabold tracking-tight text-white/30 select-none"
          >
            {initials(name)}
          </span>
        )}
      </div>
    </div>
  );
}

/** Month and day for the calendar tile, in UTC to match formatDateRange. */
function dateTile(start, end) {
  const a = toDate(start);
  if (!a) return null;
  const b = toDate(end);
  const month = a.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const sameMonth = b && b.getUTCMonth() === a.getUTCMonth() && b.getUTCFullYear() === a.getUTCFullYear();
  const day =
    b && sameMonth && b.getUTCDate() !== a.getUTCDate()
      ? `${a.getUTCDate()}–${b.getUTCDate()}`
      : String(a.getUTCDate());
  return { month, day };
}

/** "Starts in 12 days" / "Happening now" / "Ended", with the chip's colours. */
function statusOf(start, end) {
  const a = toDate(start);
  if (!a) return null;
  const b = toDate(end) || a;
  const now = Date.now();

  if (now < a.getTime()) {
    const days = Math.ceil((a.getTime() - now) / DAY_MS);
    const label =
      days <= 1
        ? "Starts tomorrow"
        : days < 60
          ? `Starts in ${days} days`
          : `Starts in ${Math.round(days / 30)} months`;
    return { label, className: "bg-emerald-400/15 text-emerald-200 ring-emerald-300/30" };
  }
  // The end date is the last open day, so it counts as live until it is over.
  if (now < b.getTime() + DAY_MS) {
    return { label: "Happening now", live: true, className: "bg-rose-500/15 text-rose-100 ring-rose-300/30" };
  }
  return { label: "Ended", className: "bg-white/10 text-white/70 ring-white/20" };
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const pad = (n) => String(n).padStart(2, "0");

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
      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur transition hover:scale-105 hover:bg-white hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none motion-reduce:hover:scale-100"
    >
      {children}
    </button>
  );
}
