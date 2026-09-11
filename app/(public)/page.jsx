import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Compass,
  Handshake,
  MapPin,
  Package,
  Search as SearchIcon,
  TrendingUp,
} from "lucide-react";

import SearchBar from "@/components/public/SearchBar";
import Section from "@/components/public/Section";
import Rail, { RailItem } from "@/components/public/Rail";
import ExhibitionCard from "@/components/public/ExhibitionCard";
import FeaturedSlider from "@/components/public/FeaturedSlider";
import HeroShowcase from "@/components/public/HeroShowcase";
import CompanyCard from "@/components/public/CompanyCard";
import ProductCard from "@/components/public/ProductCard";
import CountsStrip from "@/components/public/CountsStrip";
import SponsorBanners from "@/components/public/SponsorBanners";
import EmptyState from "@/components/public/EmptyState";
import Faq from "@/components/public/Faq";
import HomeJsonLd from "@/components/seo/HomeJsonLd";

import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";
import { categoryLandingPath, cityLandingPath, countryLandingPath, exhibitionsScopePath } from "@/lib/routes";
import { getLocationIndex } from "@/lib/locations";
import { getBanners } from "@/lib/newsroom";
import { getCategoryIndex } from "@/lib/categories";
import {
  getCompanies,
  getCounts,
  getFeaturedExhibitions,
  getOngoingExhibitions,
  getPreviousExhibitions,
  getProducts,
  getUpcomingExhibitions,
} from "@/lib/public-api";

/**
 * The public homepage.
 *
 * A Server Component end to end. The only client JavaScript on the page is the
 * hero search box and the theme toggle in the header — every exhibition,
 * company and product below is rendered into the initial HTML, which is the
 * whole point: this content exists to be indexed.
 *
 * Positioning is worldwide, not India-first, because that is what the catalogue
 * actually is: 2,017 upcoming exhibitions spread across 66 countries, the
 * largest being Germany, Poland and China, with India fourth at 144. Copy that
 * claimed an Indian focus would misrepresent the inventory and would be
 * competing for queries the data cannot satisfy. India remains a strong
 * filtered view at /exhibitions?country=India.
 */

export const metadata = publicPageMetadata({
  // app/layout.jsx appends " · OneXhib" via the title template, so this title
  // must not repeat the brand: it previously rendered as
  // "OneXhib — ... worldwide · OneXhib", 78 characters with the name twice,
  // which truncates in search results and wastes the most valuable pixels.
  title: "Exhibitions, trade shows and exhibitors worldwide",
  description:
    "Browse upcoming and ongoing exhibitions and trade shows worldwide. Find events by city and country, and see the companies exhibiting at each one.",
  path: "/",
});

// The homepage is prerendered and refreshed on a 5-minute cycle; the individual
// fetches carry the same revalidate, so nothing here goes stale independently.
export const revalidate = 300;

export default async function HomePage() {
  // One parallel round of requests. Every fetcher fails soft, so a slow or
  // unreachable backend degrades individual sections instead of the page.
  const [featured, ongoing, upcoming, previous, locations, industries, companies, products, counts, banners] = await Promise.all([
    getFeaturedExhibitions({ limit: 8 }),
    getOngoingExhibitions({ limit: 8 }),
    getUpcomingExhibitions({ limit: 8 }),
    getPreviousExhibitions({ limit: 1 }), // archive count only, per the plan
    // The full facet index, not the 100-record sample: these links point at
    // real indexable landing pages, so they must reflect the whole catalogue.
    getLocationIndex(),
    // Shares the location index's catalogue walk, so this is a cache read
    // rather than a second pass over 2,000 records.
    getCategoryIndex(),
    getCompanies({ page: 1, limit: 8 }),
    getProducts({ page: 1, limit: 8 }),
    getCounts(),
    // Empty today, so SponsorBanners renders nothing and the page closes up
    // around it — no placeholder frame, no reserved space.
    getBanners(),
  ]);

  return (
    <>
      <HomeJsonLd upcomingCount={upcoming.total} />

      <Hero counts={counts} upcoming={upcoming} />

      {/* Renders nothing while there are no live banners - no empty frame. */}
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <SponsorBanners banners={banners} />
      </div>

      {/* ── Featured ────────────────────────────────────────────── */}
      {/* Rendered only when the curated set is non-empty - an empty-state box
          directly under the hero would be worse than no section at all. */}
      {featured.items.length ? (
        <Section
          id="featured"
          title="Featured exhibitions"
          intro="A curated selection of the trade shows worth planning around."
          cta="All upcoming exhibitions"
          ctaHref={PUBLIC_ROUTES.exhibitions}
          className="mt-16 sm:mt-20"
        >
          <FeaturedSlider items={featured.items} />
        </Section>
      ) : null}

      {/* ── Ongoing ─────────────────────────────────────────────────────── */}
      <Section
        id="ongoing"
        title="Exhibitions happening now"
        intro="Trade shows and business exhibitions open to visitors today."
        cta="All ongoing exhibitions"
        ctaHref={exhibitionsScopePath("ongoing")}
        className="mt-16 sm:mt-20"
      >
        {ongoing.items.length ? (
          <Rail>
            {ongoing.items.map((exhibition, i) => (
              <RailItem key={exhibition.id}>
                <ExhibitionCard exhibition={exhibition} priority={i === 0} className="h-full" />
              </RailItem>
            ))}
          </Rail>
        ) : (
          <EmptyState>No exhibitions are running right now. Browse what is coming up next.</EmptyState>
        )}
      </Section>

      {/* ── Upcoming ────────────────────────────────────────────────────── */}
      <Section
        id="upcoming"
        title="Upcoming exhibitions"
        intro="Plan ahead with exhibition dates, venues and categories from across the world."
        cta="All upcoming exhibitions"
        ctaHref={PUBLIC_ROUTES.exhibitions}
        className="mt-16 sm:mt-20"
      >
        {upcoming.items.length ? (
          <Rail>
            {upcoming.items.map((exhibition) => (
              <RailItem key={exhibition.id}>
                <ExhibitionCard exhibition={exhibition} className="h-full" />
              </RailItem>
            ))}
          </Rail>
        ) : (
          <EmptyState>Exhibition listings are temporarily unavailable. Please try again shortly.</EmptyState>
        )}
      </Section>

      {/* ── Location discovery ──────────────────────────────────────────── */}
      {/* These link to /exhibitions-in/... landing pages, not to the noindex
          ?city= filter. That is the point of the whole location tier: the
          anchor text a crawler reads here ("Exhibitions in Berlin") now lands
          on a page that is allowed to rank for exactly that phrase. */}
      {locations.countries.length ? (
        <Section
          id="locations"
          title="Find exhibitions by city and country"
          intro="Trade shows cluster around a handful of exhibition centres. Jump straight to the business events happening where you are, or where you are heading."
          cta="All exhibition locations"
          ctaHref={PUBLIC_ROUTES.locations}
          className="mt-16 sm:mt-20"
        >
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Top cities
          </h3>
          <ul className="mt-3 flex list-none flex-wrap gap-2.5">
            {topCities(locations, 12).map((c) => (
              <li key={`${c.countrySlug}/${c.slug}`}>
                <Link
                  href={cityLandingPath(c.countrySlug, c.slug)}
                  className="ox-card group flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 hover:border-[#131C55]/40 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-600"
                >
                  <MapPin size={15} className="text-gray-400" aria-hidden="true" />
                  <span>Exhibitions in {c.city}</span>
                  <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {c.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Top countries
          </h3>
          <ul className="mt-3 flex list-none flex-wrap gap-2">
            {locations.countries.slice(0, 12).map((c) => (
              <li key={c.slug}>
                <Link
                  href={countryLandingPath(c.slug)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-gray-600 transition hover:border-[#131C55]/40 hover:text-[#131C55] motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-white"
                >
                  Exhibitions in {c.country}
                  <span className="text-gray-400 dark:text-gray-600">{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* ── Industry discovery ───────────────────────────────────────────── */}
      {/* Renders only once the API projects `category`; until then the whole
          tier is absent rather than empty. */}
      {industries.categories.length ? (
        <Section
          id="industries"
          title="Find exhibitions by industry"
          intro="Most trade shows are organised around a sector. Jump to the events in yours."
          cta="All industries"
          ctaHref={PUBLIC_ROUTES.categories}
          className="mt-16 sm:mt-20"
        >
          <ul className="flex list-none flex-wrap gap-2.5">
            {industries.categories.slice(0, 12).map((c) => (
              <li key={c.slug}>
                <Link
                  href={categoryLandingPath(c.slug)}
                  className="ox-card flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 hover:border-[#131C55]/40 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-600"
                >
                  <span>{c.label} exhibitions</span>
                  <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {c.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* ── Companies ───────────────────────────────────────────────────── */}
      <Section
        id="companies"
        title="Discover businesses exhibiting"
        intro="Companies taking part in listed exhibitions, with what they do and where they are based."
        cta="Explore companies"
        ctaHref={PUBLIC_ROUTES.companies}
        className="mt-16 sm:mt-20"
      >
        {companies.items.length ? (
          <Rail>
            {companies.items.slice(0, 4).map((company) => (
              <RailItem key={company.id}>
                <CompanyCard company={company} className="h-full" />
              </RailItem>
            ))}
          </Rail>
        ) : (
          <EmptyState>Company listings are temporarily unavailable.</EmptyState>
        )}
      </Section>

      {/* ── Products ────────────────────────────────────────────────────── */}
      <Section
        id="products"
        title="Discover products"
        intro="What exhibiting companies are showcasing, from machinery to consumer goods."
        cta="Explore products"
        ctaHref={PUBLIC_ROUTES.products}
        className="mt-16 sm:mt-20"
      >
        {products.items.length ? (
          <Rail>
            {products.items.slice(0, 4).map((product) => (
              <RailItem key={product.id}>
                <ProductCard product={product} className="h-full" />
              </RailItem>
            ))}
          </Rail>
        ) : (
          <EmptyState>Product listings are temporarily unavailable.</EmptyState>
        )}
      </Section>

      <WhyOneXhib archiveTotal={previous.total} />
      <ForBusinesses />
      <HowItWorks />

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <Section
        id="faq"
        title="Questions about OneXhib"
        intro="What the platform covers and how to use it."
        className="mt-16 sm:mt-24"
      >
        <Faq />
      </Section>

      <FinalCta />
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * The busiest cities across every country in the index.
 *
 * The index is grouped by country, so the cities have to be flattened before
 * they can be ranked globally — otherwise "top cities" would silently mean
 * "cities of the largest country".
 */
function topCities(locations, max) {
  return locations.countries
    .flatMap((c) => c.cities)
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city))
    .slice(0, max);
}

/**
 * The one <h1> on the page. It names the product and the job it does in a
 * single line, so a first-time visitor arriving from search knows within a
 * second what OneXhib is — not generic SaaS phrasing.
 */
function Hero({ counts, upcoming }) {
  return (
    <section className="relative overflow-hidden border-b border-gray-200 dark:border-gray-800">
      {/* Lightweight brand wash. A CSS gradient rather than an image: public/bg.png
          is 2 MB and would dominate LCP for no design benefit. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#131C55]/[0.07] via-transparent to-[#0E1B6B]/[0.05] dark:from-[#131C55]/25 dark:to-transparent"
      />

      {/* Soft radial accent behind the showcase panel, so the right side of the
          band is not flat colour even on the widest viewports. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(19,28,85,0.10),transparent_65%)] dark:bg-[radial-gradient(circle,rgba(76,99,210,0.18),transparent_65%)]"
      />

      {/* Two columns from lg up: the copy no longer runs out halfway across the
          band and leaves the right half empty. Below lg it is one column and the
          showcase removes itself — see HeroShowcase. */}
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-14 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-3 py-1 text-xs font-medium text-gray-600 backdrop-blur dark:border-gray-700 dark:bg-gray-900/70 dark:text-gray-300">
            <Compass size={13} aria-hidden="true" />
            Exhibition discovery worldwide
          </p>

          <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl lg:text-[3.05rem] dark:text-white">
            Discover exhibitions,
            <br className="hidden sm:block" /> exhibitors and products
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg dark:text-gray-400">
            OneXhib brings exhibitions and trade shows from around the world into one place — with
            their dates, venues and categories, the companies exhibiting at them, and the products
            those companies bring.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href={PUBLIC_ROUTES.exhibitions}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#131C55] px-6 py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#0E1B6B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none"
            >
              Explore exhibitions
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3.5 text-[15px] font-semibold text-gray-900 transition hover:border-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-500"
            >
              Create account
            </Link>
          </div>

          <div className="mt-8 max-w-xl">
            <SearchBar />
          </div>

          <div className="mt-10">
            <CountsStrip counts={counts} upcoming={upcoming.total} />
          </div>
        </div>

        <HeroShowcase items={upcoming.items} total={upcoming.total} />
      </div>
    </section>
  );
}

/**
 * Value proposition grounded in what the platform actually does. No claims
 * about audience size, satisfaction or partnerships — none of that is data the
 * product holds.
 */
function WhyOneXhib({ archiveTotal }) {
  const points = [
    {
      icon: CalendarDays,
      title: "One calendar, many countries",
      body: "Upcoming, ongoing and past exhibitions in a single listing, with dates, venue and location on every entry — instead of checking dozens of individual event sites.",
    },
    {
      icon: SearchIcon,
      title: "Search that matches how you think",
      body: "Look for an exhibition by name, by category, by venue, or by the city or country you are travelling to. Filter down to one location and see everything scheduled there.",
    },
    {
      icon: Building2,
      title: "See who is exhibiting",
      body: "Where exhibitor listings exist, an exhibition page shows the companies taking part and the products they are showcasing — so you know what you will find before you go.",
    },
    {
      icon: TrendingUp,
      title: "A record that builds up",
      body: archiveTotal
        ? `Past exhibitions stay listed — ${archiveTotal.toLocaleString("en-US")} of them so far — so you can see what an event covered before deciding to attend the next edition.`
        : "Past exhibitions stay listed, so you can see what an event covered before deciding to attend the next edition.",
    },
  ];

  return (
    <Section
      id="why"
      title="Why use OneXhib"
      intro="Exhibition information is scattered across organiser sites, PDFs and directories. This is the alternative."
      className="mt-16 sm:mt-24"
    >
      <ul className="grid list-none gap-4 sm:grid-cols-2">
        {points.map(({ icon: Icon, title, body }) => (
          <li
            key={title}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <span className="inline-flex rounded-xl bg-[#131C55]/10 p-2.5 text-[#131C55] dark:bg-blue-400/10 dark:text-blue-300">
              <Icon size={20} aria-hidden="true" />
            </span>
            <h3 className="mt-3.5 text-base font-semibold text-gray-900 dark:text-gray-50">{title}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">{body}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Both sides of the platform, described only in terms of features that exist. */
function ForBusinesses() {
  const audiences = [
    {
      icon: CalendarDays,
      role: "Organisers",
      body: "List your exhibition with its dates, venue, category and description, add the layout and brochure, and keep the details current as the event approaches.",
    },
    {
      icon: Building2,
      role: "Exhibiting companies",
      body: "Appear on the exhibition you are taking part in, describe what your business does, and add the products you are showcasing with images and details.",
    },
    {
      icon: Handshake,
      role: "Service providers",
      body: "List the services you offer to exhibitors — printing, fabrication, furniture and LED rental, staffing and gifting — and the locations you cover.",
    },
  ];

  return (
    <Section
      id="for-business"
      title="For organisers, exhibitors and service providers"
      intro="Everything on OneXhib is listed by the businesses behind it. Creating an account is how you get on the platform."
      className="mt-16 sm:mt-24"
    >
      <ul className="grid list-none gap-4 md:grid-cols-3">
        {audiences.map(({ icon: Icon, role, body }) => (
          <li
            key={role}
            className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <span className="inline-flex w-fit rounded-xl bg-[#131C55]/10 p-2.5 text-[#131C55] dark:bg-blue-400/10 dark:text-blue-300">
              <Icon size={20} aria-hidden="true" />
            </span>
            <h3 className="mt-3.5 text-base font-semibold text-gray-900 dark:text-gray-50">{role}</h3>
            <p className="mt-1.5 flex-1 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">{body}</p>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-xl bg-[#131C55] px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#0E1B6B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none"
        >
          Join OneXhib
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </Section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: Compass,
      title: "Discover",
      body: "Search or browse exhibitions by name, category, venue, city or country, and open the ones worth your time.",
    },
    {
      icon: Building2,
      title: "Connect",
      body: "See which companies are exhibiting and what they are showcasing, so you arrive knowing who you want to meet.",
    },
    {
      icon: Package,
      title: "Grow",
      body: "List your own exhibition, company or products, and be found by the visitors and buyers already searching.",
    },
  ];

  return (
    <Section id="how-it-works" title="How OneXhib works" className="mt-16 sm:mt-24">
      <ol className="grid list-none gap-4 md:grid-cols-3">
        {steps.map(({ icon: Icon, title, body }, i) => (
          <li
            key={title}
            className="relative rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#131C55] text-sm font-bold text-white">
                {i + 1}
              </span>
              <Icon size={19} className="text-[#131C55] dark:text-blue-300" aria-hidden="true" />
            </div>
            <h3 className="mt-3.5 text-base font-semibold text-gray-900 dark:text-gray-50">{title}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">{body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function FinalCta() {
  return (
    <section
      aria-labelledby="cta-heading"
      className="mx-auto mt-20 w-full max-w-6xl px-4 sm:mt-24 sm:px-6"
    >
      <div className="ox-reveal overflow-hidden rounded-3xl bg-gradient-to-br from-[#131C55] to-[#0E1B6B] px-6 py-14 text-center sm:px-12">
        <h2 id="cta-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Discover what&apos;s happening with OneXhib
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-blue-100/90 sm:text-base">
          Browse exhibitions worldwide without an account, or sign up to list your own exhibition,
          company or products.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={PUBLIC_ROUTES.exhibitions}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-[15px] font-semibold text-[#131C55] transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
          >
            Explore exhibitions
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-xl border border-white/30 px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
          >
            Create account
          </Link>
        </div>
      </div>
    </section>
  );
}
