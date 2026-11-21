import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarCheck,
  QrCode,
  Search,
  Sparkles,
  Ticket,
} from "lucide-react";

import AppGuide, { APP_FAQ } from "@/components/public/AppGuide";
import Breadcrumbs from "@/components/public/Breadcrumbs";
import DeviceTag from "@/components/public/DeviceTag";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";
import {
  breadcrumbNode,
  faqNode,
  graph,
  iosApplicationNode,
  softwareApplicationNode,
} from "@/lib/jsonld";
import { getCounts } from "@/lib/public-api";
import { APP_STORE_URL, BRAND_NAME, PLAY_STORE_URL } from "@/lib/business";

/**
 * /get-app - what the OneXhib app is, why to get it, and the two store links.
 *
 * WHY THE FIRST SCREEN CARRIES EVERYTHING
 * This URL is shared on its own ("here's our app"), so someone opening it cold
 * must see, without scrolling and on a phone too: the app's icon and name,
 * what it is for, the main reasons to install it, and both store badges. The
 * steps, benefits by role, notifications and FAQ (AppGuide) follow for anyone
 * who wants more.
 *
 * WHERE THE WORDS COME FROM
 * The benefit lines restate the app's own store listings (Google Play "About
 * this app" and the App Store "What's New" for 1.1.0, both checked on
 * 2026-11-21): find shows, ask AI, see who is exhibiting and request a
 * meeting, register and keep the entry pass offline, meeting alerts and
 * 15-minute reminders, lead scanning for exhibitors and gate check-in for
 * organisers. "Free" is what both listings say. The exhibition count is the
 * live catalogue figure (getCounts), not the listing's rounded "5,000+", and it
 * simply drops out if the API is unavailable. No ratings or download counts.
 *
 * The app icon is drawn here (the white wordmark on a dark tile, as on both
 * store listings) rather than hotlinked from a store CDN.
 */

export const revalidate = 3600;

export const metadata = publicPageMetadata({
  title: "Get the OneXhib app for iPhone and Android",
  description:
    "The OneXhib app: find exhibitions and trade shows, meet exhibitors, carry your entry pass and get meeting alerts. Free on the App Store and Google Play.",
  path: "/get-app",
});

const trail = [
  { name: "Home", path: "/" },
  { name: "Get the app", path: "/get-app" },
];

const STORES = [
  {
    platform: "ios",
    href: APP_STORE_URL,
    badge: "/badges/app-store.svg",
    alt: "Download OneXhib on the App Store",
  },
  {
    platform: "android",
    href: PLAY_STORE_URL,
    badge: "/badges/google-play.svg",
    alt: "Get OneXhib on Google Play",
  },
];

const BENEFITS = [
  {
    icon: Search,
    title: "Find the right shows",
    body: "Live, upcoming and near you. Search by industry or city, or just ask AI.",
    tone: "text-sky-600 bg-sky-500/10 dark:text-sky-300 dark:bg-sky-400/10",
  },
  {
    icon: Building2,
    title: "Meet the right companies",
    body: "See who is exhibiting at each show and request a meeting.",
    tone: "text-violet-600 bg-violet-500/10 dark:text-violet-300 dark:bg-violet-400/10",
  },
  {
    icon: Ticket,
    title: "Plan your visit",
    body: "Save shows, register to visit and keep your entry pass in the app, even offline.",
    tone: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-300 dark:bg-emerald-400/10",
  },
  {
    icon: Bell,
    title: "Never miss a meeting",
    body: "Alerts for requests, replies and enquiries, and a reminder 15 minutes before.",
    tone: "text-amber-600 bg-amber-500/10 dark:text-amber-300 dark:bg-amber-400/10",
  },
];

export default async function GetAppPage() {
  const counts = await getCounts();
  const shows = typeof counts?.exhibitions === "number" && counts.exhibitions > 0 ? counts.exhibitions.toLocaleString("en-US") : null;

  return (
    <>
      <JsonLd graph={graph(breadcrumbNode(trail), softwareApplicationNode(), iosApplicationNode(), faqNode(APP_FAQ))} />

      {/* ------------------------------------------------------------ Hero */}
      <section className="relative mx-auto w-full max-w-6xl px-4 pb-12 pt-5 sm:px-6 sm:pb-16 sm:pt-8 lg:pb-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-80 max-w-4xl rounded-full bg-gradient-to-r from-sky-400/20 via-violet-400/20 to-emerald-400/20 blur-3xl"
        />

        <Breadcrumbs trail={trail} />

        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
          <div className="min-w-0">
            {/* App identity: what this link is, at a glance. */}
            <div className="flex items-center gap-3.5">
              <AppIcon className="h-16 w-16 rounded-[1.1rem] sm:h-[72px] sm:w-[72px] sm:rounded-[1.25rem]" />
              <div className="min-w-0">
                <p className="text-lg font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white">
                  {BRAND_NAME}
                </p>
                <p className="text-[13.5px] text-gray-500 dark:text-gray-400">Exhibition &amp; trade show app</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px] font-semibold">
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">Free</span>
                  <span className="rounded-full bg-gray-900/[0.06] px-2 py-0.5 text-gray-700 dark:bg-white/10 dark:text-gray-200">iPhone</span>
                  <span className="rounded-full bg-gray-900/[0.06] px-2 py-0.5 text-gray-700 dark:bg-white/10 dark:text-gray-200">Android</span>
                </p>
              </div>
            </div>

            <h1 className="mt-5 text-[2rem] font-extrabold leading-[1.08] tracking-tight text-gray-900 sm:mt-6 sm:text-5xl dark:text-white">
              Get the{" "}
              <span className="bg-gradient-to-r from-ox-navy via-ox-blue to-ox-violet bg-clip-text text-transparent dark:from-blue-300 dark:via-indigo-300 dark:to-violet-300">
                {BRAND_NAME}
              </span>{" "}
              app
            </h1>
            <p className="mt-3 max-w-xl text-[15.5px] leading-relaxed text-gray-600 sm:text-[17px] dark:text-gray-400">
              Every trade show in one app. Discover {shows ? <strong className="font-semibold text-gray-900 dark:text-white">{shows} exhibitions</strong> : "exhibitions"}, meet
              the companies exhibiting, and carry your entry pass on the day.
            </p>

            <ul className="mt-5 grid list-none gap-x-5 gap-y-3 sm:mt-6 sm:grid-cols-2 sm:gap-y-4">
              {BENEFITS.map(({ icon: Icon, title, body, tone }) => (
                <li key={title} className="flex gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-bold leading-snug text-gray-900 dark:text-white">{title}</span>
                    <span className="block text-[13.5px] leading-snug text-gray-600 dark:text-gray-400">{body}</span>
                  </span>
                </li>
              ))}
            </ul>

            {/* The two store links: the point of the page. */}
            <ul className="mt-6 flex list-none flex-wrap items-start gap-3 sm:mt-8">
              {STORES.map(({ platform, href, badge, alt }) => (
                <li key={platform} className="flex flex-col items-center gap-1.5">
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-[10px] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ox-navy motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:focus-visible:outline-blue-300"
                  >
                    <Image src={badge} alt={alt} width={180} height={54} priority className="h-[46px] w-auto sm:h-[54px]" />
                  </a>
                  <DeviceTag platform={platform} />
                </li>
              ))}
            </ul>

            <p className="mt-4 flex items-start gap-2 text-[13px] leading-snug text-gray-500 dark:text-gray-400">
              <Sparkles size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-ox-blue dark:text-blue-300" />
              <span>
                Exhibiting or organising? Scan visitor passes to collect leads at your stand, or check
                visitors in at the gate.
              </span>
            </p>
          </div>

          <PhoneArt />
        </div>
      </section>

      <AppGuide />

      <p className="mx-auto w-full max-w-5xl px-4 pb-16 text-center text-[15px] text-gray-600 sm:px-6 dark:text-gray-400">
        Prefer the website?{" "}
        <Link
          href={PUBLIC_ROUTES.exhibitions}
          className="inline-flex items-center gap-1 font-semibold text-ox-navy underline-offset-4 hover:underline dark:text-blue-300"
        >
          Browse exhibitions
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </p>
    </>
  );
}

/**
 * The app icon as both stores show it: the white OneXhib wordmark on a dark
 * tile. Decorative next to the visible name, so the image has empty alt.
 */
function AppIcon({ className = "" }) {
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-gray-700 via-gray-900 to-black shadow-lg shadow-black/25 ring-1 ring-black/10 dark:ring-white/15 ${className}`}
    >
      <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_60%)]" />
      <Image src="/Untitled-2-01 1.png" alt="" width={124} height={42} className="relative w-[78%] h-auto" />
    </span>
  );
}

/**
 * Desktop-only illustration: a phone showing the app icon, with chips naming
 * real features. Hidden below lg so the phone layout keeps the badges in the
 * first screen. Not a mock of the app's screens.
 */
function PhoneArt() {
  const chips = [
    { icon: QrCode, label: "Entry pass ready", pos: "-left-10 top-24" },
    { icon: CalendarCheck, label: "Meeting in 15 min", pos: "-right-8 top-48" },
    { icon: Building2, label: "Lead saved", pos: "-left-6 bottom-20" },
  ];
  return (
    <div aria-hidden="true" className="relative mx-auto hidden h-[480px] w-full max-w-[340px] lg:block">
      <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-ox-blue/25 via-ox-violet/15 to-emerald-400/20 blur-3xl" />
      <div className="absolute left-1/2 top-0 h-[470px] w-[232px] -translate-x-1/2 overflow-hidden rounded-[2.6rem] border-[9px] border-gray-950 bg-gray-950 shadow-2xl shadow-black/40 ring-1 ring-white/10">
        <div className="absolute left-1/2 top-2.5 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
        <div className="absolute inset-0 bg-gradient-to-b from-ox-navy via-ox-royal to-ox-night" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="relative flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
          <AppIcon className="h-20 w-20 rounded-[1.4rem]" />
          <p className="text-[15px] font-bold text-white">Every trade show in one app</p>
          <div className="mt-2 w-full space-y-2">
            <div className="h-9 rounded-xl bg-white/90" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-16 rounded-xl bg-white/15" />
              <div className="h-16 rounded-xl bg-white/15" />
            </div>
            <div className="h-16 rounded-xl bg-white/15" />
          </div>
        </div>
      </div>
      {chips.map(({ icon: Icon, label, pos }) => (
        <div
          key={label}
          className={`absolute ${pos} flex items-center gap-2 rounded-2xl border border-gray-200 bg-white/95 px-3 py-2 text-[12.5px] font-semibold text-gray-900 shadow-xl shadow-black/10 backdrop-blur dark:border-white/10 dark:bg-gray-900/95 dark:text-white`}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
            <Icon size={15} />
          </span>
          {label}
        </div>
      ))}
    </div>
  );
}
