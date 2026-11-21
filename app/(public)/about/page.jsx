import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Globe2,
  Layers,
  MapPin,
  Search,
  Smartphone,
  Wrench,
} from "lucide-react";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import CardMedia from "@/components/public/CardMedia";
import CountsStrip from "@/components/public/CountsStrip";
import StoreBadges from "@/components/public/StoreBadges";
import { PhotoCredits } from "@/components/home/HomeFeatureSections";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";
import {
  breadcrumbNode,
  graph,
  iosApplicationNode,
  softwareApplicationNode,
} from "@/lib/jsonld";
import { getCounts, getUpcomingExhibitions, SERVICE_CATEGORIES } from "@/lib/public-api";
import { exhibitionPath, exhibitionsScopePath } from "@/lib/routes";
import { formatDateRange, formatLocation, toIsoDate } from "@/lib/format";
import { BRAND_NAME, FOUNDED_ISO, FOUNDED_LABEL, LOCATION_LINE } from "@/lib/business";

/**
 * /about - who publishes this catalogue.
 *
 * Every factual claim here is either supplied by the business (lib/business.js)
 * or counted live from the catalogue. There are deliberately no statements
 * about users, traffic, partnerships, funding, team size, market position or
 * customer outcomes, because the product holds no data for any of them.
 *
 * The catalogue figures are fetched rather than written down so the page cannot
 * go stale into a false claim, and both fetchers fail soft - if the API is
 * unavailable the figures and the "happening next" card simply do not render.
 *
 * LAYOUT
 * This page used to sit in ProsePage's single max-w-3xl column. It now has its
 * own wider layout (photographs, cards, an app band), but keeps everything the
 * shell provided: the same visible breadcrumbs, the matching BreadcrumbList
 * JSON-LD, one <h1>, and the same section headings and ids.
 *
 * IMAGES
 * The three photographs are the open-licence ones the homepage already ships
 * (public/home), credited at the foot of the page as CC BY-SA requires. The
 * exhibition thumbnails are real upcoming listings from the catalogue.
 * Everything else is drawn in CSS/SVG and costs no request.
 *
 * MOTION
 * Only the existing .ox-reveal / .ox-drift scroll animations (CSS-only, behind
 * prefers-reduced-motion and @supports) and hover states. No client JS.
 */

export const revalidate = 300;

export const metadata = publicPageMetadata({
  title: "About the exhibition discovery platform",
  description:
    "An exhibition and trade-show discovery platform connecting organisers, exhibitors and service providers. Founded 2024, based in Ludhiana, India.",
  path: "/about",
});

const WRAP = "mx-auto w-full max-w-6xl px-4 sm:px-6";

export default async function AboutPage() {
  const [counts, upcoming] = await Promise.all([
    getCounts(),
    getUpcomingExhibitions({ limit: 3 }),
  ]);

  const n = (v) => (typeof v === "number" && v > 0 ? v.toLocaleString("en-US") : null);
  const upcomingTotal = n(upcoming?.total);
  const exhibitionsTotal = n(counts?.exhibitions);
  const nextUp = (upcoming?.items || []).filter(Boolean).slice(0, 3);

  const trail = [
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
  ];

  const audiences = [
    {
      icon: CalendarDays,
      title: "Organisers",
      body: "List an exhibition with its dates, venue, category and description, so the people looking for that event can find it.",
      tint: "from-sky-500/20 to-indigo-500/5 dark:from-sky-400/20",
      ring: "text-sky-700 bg-sky-500/10 dark:text-sky-300 dark:bg-sky-400/10",
    },
    {
      icon: Building2,
      title: "Exhibitors",
      body: "Appear on the exhibitions you are taking part in, describe what your business does, and add the products you are showcasing.",
      tint: "from-violet-500/20 to-fuchsia-500/5 dark:from-violet-400/20",
      ring: "text-violet-700 bg-violet-500/10 dark:text-violet-300 dark:bg-violet-400/10",
    },
    {
      icon: Wrench,
      title: "Service providers",
      body: `Offer the services exhibitors need to prepare for a show, across ${SERVICE_CATEGORIES.length} categories from stall fabrication and printing to logistics, staffing and catering.`,
      tint: "from-amber-500/20 to-rose-500/5 dark:from-amber-400/20",
      ring: "text-amber-700 bg-amber-500/10 dark:text-amber-300 dark:bg-amber-400/10",
    },
  ];

  const browseLinks = [
    { href: PUBLIC_ROUTES.exhibitions, label: "Upcoming exhibitions", icon: CalendarDays },
    { href: PUBLIC_ROUTES.companies, label: "Companies exhibiting", icon: Building2 },
    { href: PUBLIC_ROUTES.products, label: "Products on show", icon: Layers },
    { href: PUBLIC_ROUTES.services, label: "Exhibition services", icon: Wrench },
  ];

  return (
    <>
      {/* Both apps are real, verifiable properties of this organisation and are
          linked visibly in the app section, so the nodes describe something the
          page actually states. They are modelled as SoftwareApplication rather
          than stuffed into Organization.sameAs, which is for pages that identify
          the ORGANISATION, not one of its products. The BreadcrumbList matches
          the visible breadcrumbs (it used to be emitted by ProsePage). */}
      <JsonLd graph={graph(breadcrumbNode(trail), softwareApplicationNode(), iosApplicationNode())} />

      {/* ---------------------------------------------------------------- Hero */}
      <section className={`${WRAP} grid items-center gap-12 pb-14 pt-8 sm:pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pb-20`}>
        <div className="min-w-0">
          <Breadcrumbs trail={trail} />

          <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-ox-blue dark:text-blue-300">
            <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
            Exhibition discovery platform
          </p>
          <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] tracking-tight text-gray-900 sm:text-5xl lg:text-[3.4rem] dark:text-white">
            About{" "}
            <span className="bg-gradient-to-r from-ox-navy via-ox-blue to-ox-violet bg-clip-text text-transparent dark:from-blue-300 dark:via-indigo-300 dark:to-violet-300">
              {BRAND_NAME}
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-gray-600 sm:text-lg dark:text-gray-400">
            OneXhib brings exhibitions and trade shows from around the world into one place — with
            their dates, venues and categories, the companies exhibiting at them, and the products
            those companies bring.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={PUBLIC_ROUTES.exhibitions}
              className="group inline-flex h-12 items-center gap-2 rounded-xl bg-ox-navy px-6 text-[15px] font-semibold text-white shadow-lg shadow-ox-navy/20 transition hover:bg-ox-royal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ox-navy motion-reduce:transition-none dark:bg-white dark:text-ox-navy dark:shadow-black/30 dark:hover:bg-gray-100 dark:focus-visible:outline-white"
            >
              Browse exhibitions
              <ArrowRight size={18} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
            <a
              href="#app"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-gray-300 bg-white/70 px-5 text-[15px] font-semibold text-gray-900 backdrop-blur transition hover:border-gray-400 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ox-navy motion-reduce:transition-none dark:border-white/15 dark:bg-white/[0.04] dark:text-white dark:hover:border-white/30 dark:hover:bg-white/[0.08]"
            >
              <Smartphone size={17} aria-hidden="true" />
              Get the app
            </a>
          </div>
        </div>

        <HeroVisual items={nextUp} />
      </section>

      {/* ------------------------------------------------------ What we do */}
      <section aria-labelledby="what-we-do" className="relative border-y border-gray-200/70 bg-gray-50/70 py-16 sm:py-20 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <div className={`${WRAP} grid gap-12 lg:grid-cols-2 lg:items-center`}>
          <div className="ox-reveal min-w-0">
            <SectionEyebrow>What we do</SectionEyebrow>
            <h2 id="what-we-do" className={H2}>
              What OneXhib does
            </h2>
            <div className={PROSE}>
              <p>
                Exhibitions are how a great deal of business gets done, but finding the right one is
                harder than it should be. Event information is scattered across organiser websites,
                venue calendars and trade publications, each covering a slice of the picture and
                none of them comparable with the others.
              </p>
              <p>
                OneXhib is a discovery platform that pulls that information together. You can
                browse exhibitions by{" "}
                <Link href={PUBLIC_ROUTES.locations} className={LINK}>
                  city and country
                </Link>{" "}
                or by{" "}
                <Link href={PUBLIC_ROUTES.categories} className={LINK}>
                  industry
                </Link>
                , see when and where each one runs, and — where organisers have added them — the
                companies exhibiting and the products they are showcasing.
              </p>
            </div>
          </div>

          <div className="ox-reveal min-w-0">
            <ScatteredToOne />
          </div>
        </div>

        {upcomingTotal || exhibitionsTotal ? (
          <div className={`${WRAP} ox-reveal mt-14`}>
            <CountsStrip counts={counts} upcoming={upcoming?.total} />
            <p className="mt-4 text-[14.5px] leading-relaxed text-gray-600 dark:text-gray-400">
              The catalogue currently holds{" "}
              {exhibitionsTotal ? <strong className={STRONG}>{exhibitionsTotal} exhibitions</strong> : null}
              {exhibitionsTotal && upcomingTotal ? ", of which " : null}
              {upcomingTotal ? <strong className={STRONG}>{upcomingTotal} are still to come</strong> : null}
              . These figures are counted from the live catalogue whenever this page is rebuilt, not
              written down.
            </p>
          </div>
        ) : null}
      </section>

      {/* ---------------------------------------------------- Who it is for */}
      <section aria-labelledby="who-its-for" className={`${WRAP} py-16 sm:py-20`}>
        <div className="ox-reveal max-w-2xl">
          <SectionEyebrow>Three groups</SectionEyebrow>
          <h2 id="who-its-for" className={H2}>
            Who it is for
          </h2>
          <p className="mt-3 text-[15.5px] leading-relaxed text-gray-600 dark:text-gray-400">
            OneXhib serves three groups, and each has a different job to do on the platform.
          </p>
        </div>

        <ul className="mt-10 grid list-none gap-5 md:grid-cols-3">
          {audiences.map(({ icon: Icon, title, body, tint, ring }) => (
            <li
              key={title}
              className="ox-reveal group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ox-navy/[0.08] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-white/10 dark:bg-gray-900 dark:hover:shadow-black/40"
            >
              <div aria-hidden="true" className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br ${tint} blur-2xl transition-transform duration-500 group-hover:scale-125 motion-reduce:transition-none`} />
              <span className={`relative flex h-12 w-12 items-center justify-center rounded-2xl ${ring}`}>
                <Icon size={22} aria-hidden="true" />
              </span>
              <h3 className="relative mt-5 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                {title}
              </h3>
              <p className="relative mt-2 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
                {body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* ----------------------------------------- Browsing without an account */}
      <section aria-labelledby="browsing" className="relative isolate overflow-clip">
        <Image
          src="/home/ifa-berlin-stand.jpg"
          alt=""
          fill
          sizes="100vw"
          className="ox-drift -z-10 object-cover object-[40%_50%]"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-ox-night/90 via-ox-night/75 to-ox-night/45" />
        <div className={`${WRAP} py-20 sm:py-28`}>
          <div className="ox-reveal max-w-2xl text-white">
            <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-blue-200">
              <Globe2 size={14} aria-hidden="true" />
              Open to everyone
            </p>
            <h2 id="browsing" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Browsing without an account
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-white/85">
              Every exhibition, company and product page on OneXhib is public. You do not need an
              account to browse the catalogue, search it, or open any listing — an account is only
              needed to add or manage your own listings.
            </p>
            <p className="mt-6 text-[14px] font-semibold text-white/70">Start with</p>
          </div>

          <ul className="ox-reveal mt-3 grid max-w-3xl list-none gap-3 sm:grid-cols-2">
            {browseLinks.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 text-[15px] font-semibold text-white backdrop-blur-md transition hover:border-white/30 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <span className="flex-1">{label}</span>
                  <ArrowRight size={17} aria-hidden="true" className="opacity-70 transition-transform group-hover:translate-x-1 group-hover:opacity-100 motion-reduce:transition-none" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------- Apps */}
      <section aria-labelledby="app" className={`${WRAP} py-16 sm:py-24`}>
        <div className="ox-reveal relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-ox-navy via-ox-royal to-ox-night px-6 py-12 text-white shadow-2xl shadow-ox-navy/25 sm:px-12 lg:px-16 dark:shadow-black/50 dark:ring-1 dark:ring-white/10">
          {/* Decorative grid and glows, CSS only. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]"
          />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-ox-violet/40 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full bg-ox-indigo/40 blur-3xl" />

          <div className="relative grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-blue-200">
                <Smartphone size={14} aria-hidden="true" />
                iPhone and Android
              </p>
              <h2 id="app" className="mt-3 scroll-mt-28 text-3xl font-extrabold tracking-tight sm:text-4xl">
                OneXhib on your phone
              </h2>
              <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-white/85">
                OneXhib is also available as an app: for iPhone on the App Store, and for Android on
                the Google Play Store.
              </p>
              <StoreBadges size="lg" className="mt-8" />
            </div>

            <PhoneArt />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- Company */}
      <section aria-labelledby="company" className={`${WRAP} pb-16 sm:pb-20`}>
        <div className="ox-reveal grid gap-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10 lg:grid-cols-[0.9fr_1.1fr] dark:border-white/10 dark:bg-gray-900">
          <div>
            <SectionEyebrow>Who we are</SectionEyebrow>
            <h2 id="company" className={H2}>
              The company
            </h2>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <Fact icon={CalendarDays} label="Founded">
                <time dateTime={FOUNDED_ISO}>{FOUNDED_LABEL}</time>
              </Fact>
              <Fact icon={MapPin} label="Based in">
                {LOCATION_LINE}
              </Fact>
            </dl>
          </div>
          <div className={`${PROSE} lg:mt-12`}>
            <p>
              OneXhib was founded on <time dateTime={FOUNDED_ISO}>{FOUNDED_LABEL}</time> and is based
              in {LOCATION_LINE}.
            </p>
            <p>
              For anything you cannot find here, the{" "}
              <Link href="/contact" className={LINK}>
                contact page
              </Link>{" "}
              has our email address and a form that reaches us. Our{" "}
              <Link href="/terms" className={LINK}>
                terms of use
              </Link>{" "}
              and{" "}
              <Link href="/privacy-policy" className={LINK}>
                privacy policy
              </Link>{" "}
              set out how the platform may be used and how we handle your information.
            </p>
          </div>
        </div>
      </section>

      <PhotoCredits className="pb-12" />
    </>
  );
}

/* ------------------------------------------------------------------ Parts */

const H2 = "mt-2 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl dark:text-white";
const PROSE = "mt-4 space-y-4 text-[15.5px] leading-relaxed text-gray-600 dark:text-gray-400";
const STRONG = "font-semibold text-gray-900 dark:text-gray-100";
const LINK = "font-semibold text-ox-navy underline-offset-4 hover:underline dark:text-blue-300";

/** Small label above a section heading; decorative, so hidden from the outline. */
function SectionEyebrow({ children }) {
  return (
    <p aria-hidden="true" className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ox-blue dark:text-blue-300">
      {children}
    </p>
  );
}

function Fact({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.04]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ox-navy/10 text-ox-navy dark:bg-blue-400/10 dark:text-blue-300">
        <Icon size={18} aria-hidden="true" />
      </span>
      <div>
        <dt className="text-[12px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</dt>
        <dd className="text-[15px] font-semibold text-gray-900 dark:text-white">{children}</dd>
      </div>
    </div>
  );
}

/**
 * Hero photograph with a floating "Happening next" card of real upcoming
 * listings. The card drops out when the API returns fewer than two records
 * (a one-row card reads as an accident); the photograph stays.
 */
function HeroVisual({ items }) {
  const rows = items.length >= 2 ? items : [];
  return (
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
      <div aria-hidden="true" className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-ox-navy/[0.14] via-ox-violet/[0.06] to-transparent blur-2xl dark:from-[#4C63D2]/25" />
      <div aria-hidden="true" className="absolute inset-x-6 -bottom-3 top-6 rotate-[2deg] rounded-[2rem] border border-gray-200/80 bg-white/60 dark:border-white/10 dark:bg-white/[0.03]" />

      <div className="group relative overflow-hidden rounded-[2rem] border border-gray-200 shadow-2xl shadow-ox-navy/[0.12] dark:border-white/10 dark:shadow-black/50">
        <div className="relative aspect-[4/3] sm:aspect-[5/4]">
          <Image
            src="/home/messe-frankfurt-grounds.jpg"
            alt="Messe Frankfurt's exhibition grounds and the city towers behind them"
            fill
            priority
            sizes="(min-width: 1024px) 520px, (min-width: 640px) 576px, 100vw"
            className="object-cover object-[50%_55%] transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/0" />
          <p className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[12px] font-semibold text-gray-900 backdrop-blur dark:bg-gray-900/85 dark:text-white">
            <Search size={13} aria-hidden="true" />
            Find the show worth your time
          </p>
        </div>
      </div>

      {rows.length ? (
        <div className="relative -mt-12 ml-auto w-[94%] rounded-3xl border border-gray-200 bg-white/95 p-3 shadow-xl shadow-ox-navy/[0.1] backdrop-blur sm:-mt-20 sm:w-[80%] sm:p-4 dark:border-white/10 dark:bg-gray-900/95 dark:shadow-black/40">
          <p className="flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-ox-navy dark:text-blue-300">
            <span aria-hidden="true" className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Happening next
          </p>
          <ul className="mt-2 list-none space-y-0.5">
            {rows.map((e) => (
              <NextRow key={e.id} exhibition={e} />
            ))}
          </ul>
          <Link
            href={exhibitionsScopePath("upcoming")}
            className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-gray-50 px-4 py-2 text-[13px] font-semibold text-ox-navy transition hover:bg-gray-100 motion-reduce:transition-none dark:bg-white/[0.05] dark:text-blue-200 dark:hover:bg-white/[0.09]"
          >
            See all upcoming exhibitions
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}

/** One upcoming exhibition: logo, name, dates, place. The whole row is the link. */
function NextRow({ exhibition }) {
  const { id, name, startDate, endDate, city, state, country, image } = exhibition;
  const dates = formatDateRange(startDate, endDate, { short: true });
  const place = formatLocation({ city, state, country }, { includeVenue: false });
  return (
    <li className="relative">
      <div className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-gray-50 motion-reduce:transition-none dark:hover:bg-white/[0.05]">
        <div className="w-11 shrink-0 overflow-hidden rounded-xl border border-gray-200/80 dark:border-gray-700/60">
          <CardMedia
            image={image}
            alt={`${name} logo`}
            label={name}
            aspect="aspect-square"
            sizes="44px"
            fit="contain"
            bg="bg-white dark:bg-gray-100"
          />
        </div>
        <div className="min-w-0 flex-1">
          {/* A <p>, not a heading: these are a sample of listings, not sections. */}
          <p className="line-clamp-1 text-[13.5px] font-semibold text-gray-900 dark:text-gray-50">
            <Link href={exhibitionPath(name, id)} className="after:absolute after:inset-0 after:content-['']">
              {name}
            </Link>
          </p>
          <p className="mt-0.5 flex items-center gap-3 text-[11.5px] text-gray-500 dark:text-gray-400">
            {dates ? (
              <span className="flex shrink-0 items-center gap-1">
                <CalendarDays size={12} aria-hidden="true" />
                <time dateTime={toIsoDate(startDate)}>{dates}</time>
              </span>
            ) : null}
            {place ? (
              <span className="flex min-w-0 items-center gap-1">
                <MapPin size={12} className="shrink-0" aria-hidden="true" />
                <span className="truncate">{place}</span>
              </span>
            ) : null}
          </p>
        </div>
      </div>
    </li>
  );
}

/**
 * The problem and the fix from the copy beside it, drawn: the three kinds of
 * source the text names, each a partial slice, flowing into one catalogue.
 * Decorative (aria-hidden) - the prose carries the meaning.
 */
function ScatteredToOne() {
  const sources = [
    { label: "Organiser websites", icon: Globe2, tilt: "-rotate-2" },
    { label: "Venue calendars", icon: CalendarDays, tilt: "rotate-1" },
    { label: "Trade publications", icon: Layers, tilt: "-rotate-1" },
  ];
  return (
    <div aria-hidden="true" className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-6">
      <ul className="list-none space-y-3">
        {sources.map(({ label, icon: Icon, tilt }) => (
          <li
            key={label}
            className={`flex items-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-white/80 px-3 py-3 text-[12.5px] font-medium text-gray-500 transition hover:rotate-0 motion-reduce:transition-none sm:text-[13.5px] dark:border-white/15 dark:bg-white/[0.03] dark:text-gray-400 ${tilt}`}
          >
            <Icon size={15} className="shrink-0" />
            <span className="min-w-0">{label}</span>
          </li>
        ))}
      </ul>

      <svg width="40" height="120" viewBox="0 0 44 120" className="text-ox-blue/60 dark:text-blue-300/60">
        <path d="M2 14 C 24 14, 20 60, 42 60" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
        <path d="M2 60 L 42 60" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
        <path d="M2 106 C 24 106, 20 60, 42 60" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx="42" cy="60" r="3.5" fill="currentColor" />
      </svg>

      <div className="relative rounded-3xl bg-gradient-to-br from-ox-navy to-ox-royal p-4 text-white shadow-xl shadow-ox-navy/25 sm:p-5 dark:from-[#26338f] dark:to-ox-night dark:shadow-black/40 dark:ring-1 dark:ring-white/10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-200">One place</p>
        <p className="mt-1 text-lg font-extrabold tracking-tight">OneXhib</p>
        <ul className="mt-3 list-none space-y-1.5 text-[12.5px] text-white/85">
          {["Dates", "Venues", "Categories", "Exhibitors", "Products"].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * A phone drawn in CSS with one of the page's photographs as its screen.
 * Deliberately not a mock of the app's real UI, which would be a claim about
 * screens this page cannot keep in step with the app.
 */
function PhoneArt() {
  return (
    <div aria-hidden="true" className="relative mx-auto hidden h-[360px] w-full max-w-[320px] sm:block">
      <div className="absolute left-2 top-10 h-[300px] w-[150px] -rotate-[8deg] rounded-[2rem] border-[6px] border-white/15 bg-white/5 shadow-2xl backdrop-blur" />
      <div className="absolute left-1/2 top-0 h-[350px] w-[176px] -translate-x-1/2 rotate-[4deg] overflow-hidden rounded-[2.2rem] border-[7px] border-gray-950 bg-gray-950 shadow-2xl shadow-black/50 transition-transform duration-500 hover:rotate-0 motion-reduce:transition-none">
        <div className="absolute left-1/2 top-2 z-10 h-4 w-16 -translate-x-1/2 rounded-full bg-gray-950" />
        <Image src="/home/messe-frankfurt-hall-3.jpg" alt="" fill sizes="176px" className="object-cover object-[70%_60%]" />
        <div className="absolute inset-0 bg-gradient-to-b from-ox-night/30 via-transparent to-ox-night/90" />
        <div className="absolute inset-x-3 bottom-4 space-y-2">
          <p className="text-[15px] font-extrabold tracking-tight text-white">onexhib</p>
          <div className="h-8 rounded-xl bg-white/90" />
          <div className="flex gap-1.5">
            <div className="h-6 flex-1 rounded-lg bg-white/25" />
            <div className="h-6 flex-1 rounded-lg bg-white/25" />
          </div>
        </div>
      </div>
    </div>
  );
}
