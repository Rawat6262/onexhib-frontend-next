import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Compass,
  Globe2,
  Handshake,
  Sparkles,
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
import AiSearchBand from "@/components/public/AiSearchBand";
import EmptyState from "@/components/public/EmptyState";
import Faq from "@/components/public/Faq";
import HomeJsonLd from "@/components/seo/HomeJsonLd";

import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";
import { categoryLandingPath, cityLandingPath, countryLandingPath, exhibitionsScopePath } from "@/lib/routes";
import { getLocationIndex } from "@/lib/locations";
import { getBanners, getNews } from "@/lib/newsroom";
import { getThisWeekExhibitions } from "@/lib/discovery";
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
  const [featured, ongoing, upcoming, previous, locations, industries, companies, products, counts, banners, thisWeek, news] = await Promise.all([
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
    // The current Monday-to-Sunday window, read from the public scope
    // endpoints (see lib/discovery.js for why not /api/exhibitions/thisweek).
    getThisWeekExhibitions(),
    // Quality-gated, so the section stays hidden while the feed holds only
    // test records.
    getNews(),
  ]);

  const cityCards = topCities(locations, 8);
  const cityMax = Math.max(1, ...cityCards.map((c) => c.count));

  return (
    <>
      <HomeJsonLd upcomingCount={upcoming.total} />

      <Hero counts={counts} upcoming={upcoming} />

      {/* Renders nothing while there are no live banners - no empty frame. */}
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <SponsorBanners banners={banners} />
      </div>

      <AiSearchBand />

      {/* ── Featured ────────────────────────────────────────────── */}
      {/* Rendered only when the curated set is non-empty - an empty-state box
          directly under the hero would be worse than no section at all. */}
      {featured.items.length ? (
        <Section
          id="featured"
          eyebrow="Spotlight"
          title="Featured exhibitions"
          intro="A curated selection of the trade shows worth planning around."
          cta="All upcoming exhibitions"
          ctaHref={PUBLIC_ROUTES.exhibitions}
          className="mt-16 sm:mt-20"
        >
          <FeaturedSlider items={featured.items} />
        </Section>
      ) : null}

      {/* ── This week ───────────────────────────────────────────────────── */}
      {/* Rendered only when the week holds something - an empty rail under a
          "this week" heading reads as broken rather than quiet. */}
      {thisWeek.length ? (
        <Section
          id="this-week"
          eyebrow="This week"
          title="Exhibitions this week"
          intro="Opening between now and Sunday, worldwide."
          cta="See the full week"
          ctaHref={`${PUBLIC_ROUTES.exhibitions}/this-week`}
          className="mt-16 sm:mt-20"
        >
          <Rail>
            {thisWeek.slice(0, 8).map((exhibition) => (
              <RailItem key={exhibition.id}>
                <ExhibitionCard exhibition={exhibition} className="h-full" />
              </RailItem>
            ))}
          </Rail>
        </Section>
      ) : null}

      {/* ── Ongoing ─────────────────────────────────────────────────────── */}
      <Section
        id="ongoing"
        eyebrow="Live now"
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
        eyebrow="Coming up"
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
          eyebrow="Explore by place"
          title="Find exhibitions by city and country"
          intro="Trade shows cluster around a handful of exhibition centres. Jump straight to the business events happening where you are, or where you are heading."
          cta="All exhibition locations"
          ctaHref={PUBLIC_ROUTES.locations}
          className="mt-16 sm:mt-20"
        >
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Top cities
          </h3>
          {/* Cards rather than chips: the city is the decision here, so it gets
              the type size, and the count sits on a bar scaled to the busiest
              city so relative size reads without comparing numbers. */}
          <ul className="mt-4 grid list-none grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {cityCards.map((c, i) => (
              <li key={`${c.countrySlug}/${c.slug}`}>
                <Link
                  href={cityLandingPath(c.countrySlug, c.slug)}
                  className="ox-card group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 hover:border-[#131C55]/30 hover:shadow-lg sm:p-5 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-400/30"
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full opacity-60 blur-2xl transition group-hover:opacity-100 motion-reduce:transition-none ${CITY_GLOWS[i % CITY_GLOWS.length]}`}
                  />
                  <span aria-hidden="true" className="relative flex items-center justify-between gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#131C55]/[0.06] text-[#2B3FB8] dark:bg-blue-400/10 dark:text-blue-300">
                      <MapPin size={17} />
                    </span>
                    <ArrowRight
                      size={16}
                      className="text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-[#2B3FB8] motion-reduce:transition-none dark:text-gray-600 dark:group-hover:text-blue-300"
                    />
                  </span>
                  {/* "Exhibitions in" stays in the anchor text (visually
                      hidden) - it is the phrase the landing page ranks for. */}
                  <span className="relative mt-4 line-clamp-1 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                    <span className="sr-only">Exhibitions in </span>
                    {c.city}
                  </span>
                  <span className="relative line-clamp-1 text-[13px] text-gray-500 dark:text-gray-400">{c.country}</span>
                  <span className="relative mt-4 flex items-center gap-2.5">
                    <span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-[#2B3FB8] to-[#8B5CF6]"
                        style={{ width: `${Math.max(8, Math.round((c.count / cityMax) * 100))}%` }}
                      />
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-gray-700 tabular-nums dark:text-gray-300">
                      {c.count} {c.count === 1 ? "show" : "shows"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <h3 className="mt-10 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Top countries
          </h3>
          <ul className="mt-3 flex list-none flex-wrap gap-2">
            {locations.countries.slice(0, 12).map((c) => (
              <li key={c.slug}>
                <Link
                  href={countryLandingPath(c.slug)}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1.5 pr-1.5 pl-3.5 text-[13px] font-medium text-gray-700 transition hover:border-[#131C55]/40 hover:text-[#131C55] hover:shadow-sm motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-400/40 dark:hover:text-white"
                >
                  <Globe2 size={14} aria-hidden="true" className="text-gray-400" />
                  Exhibitions in {c.country}
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600 tabular-nums dark:bg-gray-800 dark:text-gray-400">
                    {c.count}
                  </span>
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
          eyebrow="Explore by sector"
          title="Find exhibitions by industry"
          intro="Most trade shows are organised around a sector. Jump to the events in yours."
          cta="All industries"
          ctaHref={PUBLIC_ROUTES.categories}
          className="mt-16 sm:mt-20"
        >
          {/* Tiles with a coloured monogram: twelve sectors read as a grid of
              distinct destinations, where a wrapped row of grey chips read as
              one long sentence. The anchor text is unchanged for crawlers. */}
          <ul className="grid list-none grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {industries.categories.slice(0, 12).map((c, i) => (
              <li key={c.slug}>
                <Link
                  href={categoryLandingPath(c.slug)}
                  className="ox-card group flex h-full items-center gap-3.5 rounded-2xl border border-gray-200 bg-white p-3.5 hover:border-[#131C55]/30 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-400/30"
                >
                  <span
                    aria-hidden="true"
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-base font-extrabold ${INDUSTRY_TONES[i % INDUSTRY_TONES.length]}`}
                  >
                    {c.label.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-gray-900 dark:text-gray-100">
                      {c.label}
                      <span className="sr-only"> exhibitions</span>
                    </span>
                    <span className="text-[13px] text-gray-500 tabular-nums dark:text-gray-400">
                      {c.count} upcoming
                    </span>
                  </span>
                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-[#2B3FB8] motion-reduce:transition-none dark:text-gray-600 dark:group-hover:text-blue-300"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* ── Companies ───────────────────────────────────────────────────── */}
      <Section
        id="companies"
        eyebrow="Exhibitors"
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
        eyebrow="Showcase"
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

      {/* ── Industry news ───────────────────────────────────────────────── */}
      {/* Hidden entirely while the feed holds nothing publishable, which is the
          case today — the two records in it are admin test rows. lib/newsroom.js
          filters them, so this section appears on its own when real news lands
          rather than needing a code change. */}
      {news.items.length ? (
        <Section
          id="news"
          eyebrow="Newsroom"
          title="Industry news"
          intro="Announcements from across the exhibition world."
          cta="All news"
          ctaHref="/news"
          className="mt-16 sm:mt-20"
        >
          <ul className="grid list-none grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {news.items.slice(0, 3).map((article) => (
              <li
                key={article.id}
                className="ox-card flex flex-col rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
              >
                {article.category ? (
                  <span className="line-clamp-1 text-[11px] font-semibold uppercase tracking-wide text-[#131C55] dark:text-blue-300">
                    {article.category}
                  </span>
                ) : null}
                <h3 className="mt-1.5 line-clamp-2 text-base font-semibold leading-snug text-gray-900 dark:text-gray-50">
                  {article.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
                  {article.description}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <Section
        id="faq"
        eyebrow="FAQ"
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
/** Corner glows for the city cards, cycled. Static class strings so Tailwind sees them. */
const CITY_GLOWS = [
  "bg-blue-400/25",
  "bg-violet-400/25",
  "bg-emerald-400/20",
  "bg-amber-400/25",
  "bg-rose-400/20",
  "bg-cyan-400/25",
];

/** Monogram tones for the industry tiles, cycled. Each pairs a tint with a readable ink. */
const INDUSTRY_TONES = [
  "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300",
];

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
    <section className="relative overflow-hidden border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      {/* Lightweight brand wash. A CSS gradient rather than an image: public/bg.png
          is 2 MB and would dominate LCP for no design benefit. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#131C55]/[0.07] via-transparent to-[#0E1B6B]/[0.05] dark:from-[#131C55]/25 dark:to-transparent"
      />

      {/* Soft radial accents behind the showcase panel and under the headline,
          so neither side of the band is flat colour on the widest viewports. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(43,63,184,0.16),transparent_65%)] dark:bg-[radial-gradient(circle,rgba(76,99,210,0.30),transparent_65%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-32 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.10),transparent_65%)] dark:bg-[radial-gradient(circle,rgba(139,92,246,0.18),transparent_65%)]"
      />
      {/* Fine grid, faded out towards the edges with a radial mask so it reads
          as texture behind the copy rather than as graph paper. Inline SVG. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 text-[#131C55] opacity-[0.06] [mask-image:radial-gradient(ellipse_at_30%_40%,black,transparent_70%)] dark:text-white dark:opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Two columns from lg up: the copy no longer runs out halfway across the
          band and leaves the right half empty. Below lg it is one column and the
          showcase removes itself — see HeroShowcase. */}
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-14 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 py-1 pr-3 pl-1.5 text-xs font-medium text-gray-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
              <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70 motion-reduce:animate-none" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
            {upcoming.total
              ? `${upcoming.total.toLocaleString("en-US")} upcoming exhibitions worldwide`
              : "Exhibition discovery worldwide"}
          </p>

          <h1 className="mt-5 text-4xl font-extrabold leading-[1.06] tracking-tight text-gray-900 sm:text-5xl lg:text-[3.4rem] dark:text-white">
            Discover{" "}
            {/* The one word the page is about, in the brand gradient. Text stays
                real text: a crawler and a screen reader read the same h1. */}
            <span className="bg-gradient-to-r from-[#2B3FB8] via-[#5B5BF0] to-[#8B5CF6] bg-clip-text text-transparent dark:from-blue-300 dark:via-indigo-300 dark:to-violet-300">
              exhibitions
            </span>
            ,
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

  // A full-bleed tinted band: after a long run of card rails this is where the
  // page changes from "browse" to "about", and a change of ground says so before
  // a single word is read.
  return (
    <div className="mt-20 border-y border-gray-200 bg-gradient-to-b from-gray-50 to-white py-16 sm:mt-28 sm:py-20 dark:border-white/5 dark:from-white/[0.03] dark:to-transparent">
      <Section
        id="why"
        eyebrow="The platform"
        title="Why use OneXhib"
        intro="Exhibition information is scattered across organiser sites, PDFs and directories. This is the alternative."
      >
        <ul className="grid list-none gap-4 sm:grid-cols-2">
          {points.map(({ icon: Icon, title, body }, i) => (
            <li
              key={title}
              className="ox-card group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
            >
              <span
                aria-hidden="true"
                className="absolute top-4 right-5 text-5xl font-extrabold tracking-tighter text-gray-100 select-none dark:text-white/[0.04]"
              >
                0{i + 1}
              </span>
              <span className="relative inline-flex rounded-xl bg-gradient-to-br from-[#2B3FB8] to-[#8B5CF6] p-3 text-white shadow-md shadow-indigo-500/20">
                <Icon size={20} aria-hidden="true" />
              </span>
              <h3 className="relative mt-4 text-lg font-semibold text-gray-900 dark:text-gray-50">{title}</h3>
              <p className="relative mt-1.5 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">{body}</p>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

/** Both sides of the platform, described only in terms of features that exist. */
function ForBusinesses() {
  const audiences = [
    {
      icon: CalendarDays,
      role: "Organisers",
      action: "List your exhibition",
      accent: "from-blue-500 to-indigo-500",
      body: "List your exhibition with its dates, venue, category and description, add the layout and brochure, and keep the details current as the event approaches.",
    },
    {
      icon: Building2,
      role: "Exhibiting companies",
      action: "Showcase your company",
      accent: "from-violet-500 to-fuchsia-500",
      body: "Appear on the exhibition you are taking part in, describe what your business does, and add the products you are showcasing with images and details.",
    },
    {
      icon: Handshake,
      role: "Service providers",
      action: "Offer your services",
      accent: "from-emerald-500 to-teal-500",
      body: "List the services you offer to exhibitors — printing, fabrication, furniture and LED rental, staffing and gifting — and the locations you cover.",
    },
  ];

  return (
    <Section
      id="for-business"
      eyebrow="For business"
      title="For organisers, exhibitors and service providers"
      intro="Everything on OneXhib is listed by the businesses behind it. Creating an account is how you get on the platform."
      className="mt-16 sm:mt-24"
    >
      <ul className="grid list-none gap-4 md:grid-cols-3">
        {audiences.map(({ icon: Icon, role, body, action, accent }) => (
          <li
            key={role}
            className="ox-card relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
          >
            <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
            <span className={`inline-flex w-fit rounded-xl bg-gradient-to-br p-3 text-white shadow-md ${accent}`}>
              <Icon size={20} aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-50">{role}</h3>
            <p className="mt-1.5 flex-1 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">{body}</p>
            <Link
              href="/signup"
              className="group mt-5 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-[#2B3FB8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#131C55] dark:text-blue-300"
            >
              {action}
              <ArrowRight
                size={15}
                aria-hidden="true"
                className="transition group-hover:translate-x-0.5 motion-reduce:transition-none"
              />
            </Link>
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
    <Section id="how-it-works" eyebrow="Three steps" title="How OneXhib works" className="mt-16 sm:mt-24">
      {/* A dashed rail joins the three numbers on md+, so the steps read as a
          sequence rather than as three unrelated cards. */}
      <ol className="relative grid list-none gap-8 md:grid-cols-3 md:gap-6">
        <span
          aria-hidden="true"
          className="absolute top-7 right-[16%] left-[16%] hidden border-t-2 border-dashed border-gray-200 md:block dark:border-gray-700"
        />
        {steps.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="relative flex flex-col items-center text-center">
            <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#131C55] to-[#2B3FB8] text-white shadow-lg ring-8 shadow-indigo-900/20 ring-white dark:ring-gray-950">
              <Icon size={22} aria-hidden="true" />
              <span className="absolute -top-2 -right-2 grid h-6 w-6 place-items-center rounded-full bg-amber-400 text-[11px] font-extrabold text-amber-950 shadow">
                {i + 1}
              </span>
            </span>
            <h3 className="mt-5 text-lg font-semibold text-gray-900 dark:text-gray-50">{title}</h3>
            <p className="mt-1.5 max-w-xs text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">{body}</p>
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
      <div className="ox-reveal relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0B1240] via-[#131C55] to-[#2B1F7A] px-6 py-16 text-center shadow-[0_30px_80px_-30px_rgba(19,28,85,0.6)] ring-1 ring-white/10 sm:px-12 sm:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-blue-500/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -bottom-24 -z-10 h-64 w-64 rounded-full bg-violet-500/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 text-white opacity-[0.07] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-100 ring-1 ring-white/15">
          <Sparkles size={13} aria-hidden="true" />
          Free to browse — no account needed
        </p>
        <h2 id="cta-heading" className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
          Discover what&apos;s happening with OneXhib
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-blue-100/90 sm:text-base">
          Browse exhibitions worldwide without an account, or sign up to list your own exhibition,
          company or products.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={PUBLIC_ROUTES.exhibitions}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-[15px] font-semibold text-[#131C55] shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transform-none motion-reduce:transition-none"
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
