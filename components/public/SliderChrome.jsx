"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Shared behaviour and controls for the homepage sliders (FeaturedSlider,
 * NewsSlider). Both are translated tracks with every slide left in the DOM;
 * this file owns the parts that must behave identically across them:
 *
 *   - autoplay that pauses on hover, on keyboard focus and when the tab is
 *     hidden, and never starts under prefers-reduced-motion
 *   - arrow-key paging, scoped to focus inside the slider
 *   - the bottom control bar: counter, progress dots, "Next up", prev/next
 */

export const AUTOPLAY_MS = 6000;

export function useSlider(count) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const rootRef = useRef(null);

  const go = useCallback(
    (n) => {
      if (count === 0) return;
      setIndex(((n % count) + count) % count);
    },
    [count],
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

  // Props for the slider root. Arrow keys page the slider only while focus is
  // inside it — a global listener would hijack arrow keys for the whole page.
  const rootProps = {
    ref: rootRef,
    onKeyDown: (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
    },
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocusCapture: () => setPaused(true),
    onBlurCapture: (e) => {
      if (!rootRef.current?.contains(e.relatedTarget)) setPaused(false);
    },
  };

  return { index, go, prev, next, paused, reducedMotion, rootProps };
}

/**
 * The control bar along the bottom of a slide. Click-through except for the
 * controls themselves, so it never blocks a stretched link underneath.
 */
export function SliderControls({
  slider,
  labels,
  upNext,
  prevLabel,
  nextLabel,
}) {
  const { index, go, prev, next, paused, reducedMotion } = slider;
  const count = labels.length;
  if (count < 2) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 border-t border-white/10 bg-gradient-to-t from-black/30 to-transparent px-6 py-4 sm:px-10 lg:px-12">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-5">
          <p
            className="shrink-0 font-semibold tabular-nums text-white"
            aria-hidden="true"
          >
            <span className="text-lg">{pad(index + 1)}</span>
            <span className="text-sm text-white/45"> / {pad(count)}</span>
          </p>

          {/* Many slides do not fit as dots on a phone; the counter says enough there. */}
          <div
            className={`pointer-events-auto items-center gap-1.5 ${count > 8 ? "hidden sm:flex" : "flex"}`}
          >
            {labels.map((label, i) => {
              const active = i === index;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Go to slide ${i + 1}: ${label}`}
                  aria-current={active ? "true" : undefined}
                  className={`relative h-1.5 overflow-hidden rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none ${
                    active
                      ? "w-10 bg-white/25"
                      : "w-2.5 bg-white/35 hover:bg-white/70"
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
              <span className="font-medium text-white/80">{upNext}</span>
            </p>
          ) : null}
        </div>

        <div className="pointer-events-auto flex shrink-0 gap-2">
          <SliderButton onClick={prev} label={prevLabel}>
            <ChevronLeft size={18} aria-hidden="true" />
          </SliderButton>
          <SliderButton onClick={next} label={nextLabel}>
            <ChevronRight size={18} aria-hidden="true" />
          </SliderButton>
        </div>
      </div>
    </div>
  );
}

function SliderButton({ onClick, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur transition hover:scale-105 hover:bg-white hover:text-ox-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none motion-reduce:hover:scale-100"
    >
      {children}
    </button>
  );
}

const pad = (n) => String(n).padStart(2, "0");
