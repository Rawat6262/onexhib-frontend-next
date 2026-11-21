import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import DeviceTag from "@/components/public/DeviceTag";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";
import {
  breadcrumbNode,
  graph,
  iosApplicationNode,
  softwareApplicationNode,
} from "@/lib/jsonld";
import { APP_STORE_URL, BRAND_NAME, PLAY_STORE_URL } from "@/lib/business";

/**
 * /get-app - choose iPhone or Android, then go to that store.
 *
 * Linked from the "Get the app" button in the site header. Each card is one
 * link straight to the store listing (new tab), so it is one tap from here to
 * the install page. The matching card gets a "Your device" tag on phones (see
 * DeviceTag), but both choices are always shown: guessing wrong and hiding the
 * other store would strand the visitor.
 *
 * Same facts as the About page and nothing more: no feature list, ratings or
 * download counts, because none of that is recorded here.
 */

export const metadata = publicPageMetadata({
  title: "Get the OneXhib app for iPhone and Android",
  description:
    "Download the OneXhib exhibition discovery app from the App Store for iPhone or from Google Play for Android.",
  path: "/get-app",
});

const trail = [
  { name: "Home", path: "/" },
  { name: "Get the app", path: "/get-app" },
];

const STORES = [
  {
    platform: "ios",
    name: "iPhone",
    store: "App Store",
    href: APP_STORE_URL,
    badge: "/badges/app-store.svg",
    badgeAlt: "Download on the App Store",
    Logo: AppleLogo,
    glow: "from-sky-400/30 via-indigo-400/10",
  },
  {
    platform: "android",
    name: "Android",
    store: "Google Play",
    href: PLAY_STORE_URL,
    badge: "/badges/google-play.svg",
    badgeAlt: "Get it on Google Play",
    Logo: PlayLogo,
    glow: "from-emerald-400/30 via-amber-300/10",
  },
];

export default function GetAppPage() {
  return (
    <>
      <JsonLd graph={graph(breadcrumbNode(trail), softwareApplicationNode(), iosApplicationNode())} />

      <section className="relative mx-auto w-full max-w-5xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        {/* Soft colour behind the heading; decorative. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-80 max-w-3xl rounded-full bg-gradient-to-r from-sky-400/20 via-violet-400/20 to-emerald-400/20 blur-3xl"
        />

        <Breadcrumbs trail={trail} />

        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ox-blue dark:text-blue-300">
            iPhone and Android
          </p>
          <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] tracking-tight text-gray-900 sm:text-5xl dark:text-white">
            Get the{" "}
            <span className="bg-gradient-to-r from-ox-navy via-ox-blue to-ox-violet bg-clip-text text-transparent dark:from-blue-300 dark:via-indigo-300 dark:to-violet-300">
              {BRAND_NAME}
            </span>{" "}
            app
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed text-gray-600 dark:text-gray-400">
            Choose your phone and we&rsquo;ll take you to the right store.
          </p>
        </div>

        <ul className="mx-auto mt-12 grid max-w-4xl list-none gap-5 sm:grid-cols-2">
          {STORES.map(({ platform, name, store, href, badge, badgeAlt, Logo, glow }) => (
            <li key={platform}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${BRAND_NAME} for ${name} on the ${store} (opens in a new tab)`}
                className="group relative flex h-full flex-col items-center overflow-hidden rounded-[2rem] border border-gray-200 bg-white px-6 pb-8 pt-10 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:border-gray-300 hover:shadow-2xl hover:shadow-ox-navy/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ox-navy motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-white/10 dark:bg-gray-900 dark:hover:border-white/20 dark:hover:shadow-black/50 dark:focus-visible:outline-blue-300"
              >
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-gradient-to-b ${glow} to-transparent blur-2xl transition-transform duration-500 group-hover:scale-125 motion-reduce:transition-none`}
                />

                <div className="absolute right-4 top-4">
                  <DeviceTag platform={platform} />
                </div>

                <span className="relative flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-gray-950 shadow-xl shadow-black/20 ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-[-4deg] motion-reduce:transition-none motion-reduce:group-hover:transform-none dark:bg-black">
                  <Logo />
                </span>

                <h2 className="relative mt-6 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                  {name}
                </h2>
                <p className="relative mt-1 text-[15px] text-gray-500 dark:text-gray-400">
                  Download from {platform === "ios" ? "the App Store" : "Google Play"}
                </p>

                <Image
                  src={badge}
                  alt={badgeAlt}
                  width={180}
                  height={54}
                  className="relative mt-7 h-[52px] w-auto"
                />

                <span className="relative mt-5 inline-flex items-center gap-1 text-[13px] font-semibold text-ox-navy opacity-80 transition group-hover:opacity-100 motion-reduce:transition-none dark:text-blue-300">
                  Open {platform === "ios" ? "the App Store" : "Google Play"}
                  <ArrowUpRight size={14} aria-hidden="true" className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
                </span>
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-12 text-center text-[15px] text-gray-600 dark:text-gray-400">
          Prefer the website?{" "}
          <Link
            href={PUBLIC_ROUTES.exhibitions}
            className="inline-flex items-center gap-1 font-semibold text-ox-navy underline-offset-4 hover:underline dark:text-blue-300"
          >
            Browse exhibitions
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </p>
      </section>
    </>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" width="46" height="46" fill="#fff" aria-hidden="true">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

function PlayLogo() {
  return (
    <svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true">
      <path fill="#00a0ff" d="M1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924z" />
      <path fill="#00d26a" d="M13.544 10.989l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973z" />
      <path fill="#ffc400" d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594z" />
      <path fill="#ff3a44" d="M13.544 13.056l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z" />
    </svg>
  );
}
