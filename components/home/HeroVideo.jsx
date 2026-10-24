"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The home hero's background film.
 *
 * Two films are kept, and HERO_FILM picks the one on the page:
 *  - "city": a 4K time-lapse of a busy crossing, encoded for the web as a
 *    12 s seamless loop (the last second fades into the first): 1080p at
 *    5 Mbps (7.5 MB) for screens 1280px and up, 720p (3.8 MB) below that, and
 *    a 170 KB still shown until the film plays.
 *  - "hall": a generated camera move through an exhibition hall, 8 s at
 *    1080p (10 MB), a little soft - so it gets a light sharpening filter.
 *
 * Only fetched where it pays off:
 *  - not on phones (under 768px) - the hero there is mostly text, and the
 *    data would cost more than the motion is worth;
 *  - not with "reduce motion" switched on;
 *  - not on a Save-Data connection.
 * Everyone else first sees the navy backdrop the section paints (or the
 * still), and the film fades in once it is actually playing, so there is
 * never a black box or a jump. It pauses while scrolled out of view or in a
 * hidden tab.
 *
 * Decorative: aria-hidden, muted, no controls, and the page reads the same
 * without it.
 *
 * PICTURE. Every browser gets a small contrast / colour / brightness lift. A
 * film marked `sharpen` also gets a light unsharp mask (an SVG convolution) in
 * Chromium and Firefox - measured at 0 dropped frames. Safari is left out of
 * the sharpening on purpose: its SVG filters on <video> are unreliable and can
 * blank the element.
 */
export const HERO_FILMS = {
  city: {
    src: "/home/hero-city-1080.mp4",
    srcSmall: "/home/hero-city-720.mp4",
    poster: "/home/hero-city-poster.jpg",
    sharpen: false,
  },
  hall: {
    src: "/home/hero-exhibition-hall.mp4",
    srcSmall: null,
    poster: null,
    sharpen: true,
  },
};
export const HERO_FILM = "city";

const LIFT = "contrast(1.06) saturate(1.12) brightness(1.02)";
const SHARPEN_ID = "ox-hero-sharpen";

export default function HeroVideo({ film = HERO_FILMS[HERO_FILM], className = "" }) {
  const [enabled, setEnabled] = useState(false);
  const [src, setSrc] = useState(null);
  const [sharpen, setSharpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 768px)");
    const large = window.matchMedia("(min-width: 1280px)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () => {
      setEnabled(wide.matches && !calm.matches && !navigator.connection?.saveData);
      // Chosen once per width band; the 1080p file only where it is seen at size.
      setSrc(large.matches || !film.srcSmall ? film.src : film.srcSmall);
    };
    decide();
    const ua = navigator.userAgent;
    setSharpen(film.sharpen && !(/safari/i.test(ua) && !/chrome|chromium|crios|android|edg/i.test(ua)));
    const media = [wide, large, calm];
    media.forEach((m) => m.addEventListener("change", decide));
    return () => media.forEach((m) => m.removeEventListener("change", decide));
  }, [film]);

  // Play only while on screen and the tab is visible.
  useEffect(() => {
    const video = ref.current;
    if (!enabled || !video) return undefined;
    let inView = true;
    const sync = () => {
      if (inView && !document.hidden) video.play().catch(() => {});
      else video.pause();
    };
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    io.observe(video);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [enabled, src]);

  if (!enabled || !src) return null;

  return (
    <>
      {sharpen ? (
        <svg aria-hidden="true" width="0" height="0" className="absolute">
          <filter id={SHARPEN_ID} colorInterpolationFilters="sRGB">
            <feConvolveMatrix order="3" preserveAlpha="true" kernelMatrix="0 -0.35 0 -0.35 2.4 -0.35 0 -0.35 0" />
          </filter>
        </svg>
      ) : null}
      {/* The still sits under the film and shows the moment it is decoded. */}
      {film.poster ? (
        // eslint-disable-next-line @next/next/no-img-element -- decorative backdrop, sized by CSS
        <img src={film.poster} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover" style={{ filter: LIFT }} />
      ) : null}
      <video
        key={src}
        ref={ref}
        aria-hidden="true"
        tabIndex={-1}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        onPlaying={() => setPlaying(true)}
        style={{ filter: sharpen ? `url(#${SHARPEN_ID}) ${LIFT}` : LIFT }}
        className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 motion-reduce:transition-none ${
          playing ? "opacity-100" : "opacity-0"
        } ${className}`}
      />
    </>
  );
}
