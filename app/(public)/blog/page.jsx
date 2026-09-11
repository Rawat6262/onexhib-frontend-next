import Link from "next/link";
import { ArrowRight, Compass, Database, LineChart, MapPin } from "lucide-react";

import Section from "@/components/public/Section";
import JsonLd from "@/components/seo/JsonLd";
import Breadcrumbs from "@/components/public/Breadcrumbs";
import BlogHero from "@/components/blog/BlogHero";
import DiscoverGrid from "@/components/blog/DiscoverGrid";
import DataBars from "@/components/blog/DataBars";
import SeasonCurve from "@/components/blog/SeasonCurve";
import SeoDestinations from "@/components/blog/SeoDestinations";
import { FeaturedPostCard, PostCard } from "@/components/blog/PostCards";
import { graph, itemListNode, breadcrumbNode } from "@/lib/jsonld";
import { getAllPosts, getFeaturedPost, isBlogEmpty } from "@/lib/blog";
import { getBlogData } from "@/lib/blog-data";
import { blogPostPath, categoryLandingPath, countryLandingPath } from "@/lib/routes";
import { PUBLIC_ROUTES, pageMetadata, publicPageMetadata } from "@/lib/seo";

/**
 * /blog - the post index, presented as an editorial front page.
 *
 * WHAT THIS PAGE ARGUES
 * OneXhib is not a list of events; it is a catalogue that can be counted. So the
 * page is built from the catalogue: the hero shows real listings, the stat row
 * and both charts read live figures, and each article's cover is the very
 * distribution that article discusses. Nothing here is a placeholder number or a
 * stock photograph, because the page's claim is precisely that the numbers are
 * real.
 *
 * NOINDEX WHILE EMPTY, unchanged from before. A hub with no posts is a thin
 * page, and the sitemap omits it on the same condition (app/sitemap.js). The
 * industry hub already follows this rule.
 *
 * Server Component throughout: no client JavaScript is added by this redesign.
 * The charts are divs, the reveals are CSS, and the only interactivity is links.
 */
const empty = isBlogEmpty();

export const metadata = empty
  ? pageMetadata({
      title: "Blog",
      description: "Articles about exhibitions and trade shows.",
      path: PUBLIC_ROUTES.blog,
      robots: { index: false, follow: true },
    })
  : publicPageMetadata({
      title: "Insights from the world of exhibitions",
      description:
        "Data-led articles on exhibitions and trade shows — where they happen, when the season peaks, and how to plan around it. Counted from the exhibitions listed on OneXhib.",
      path: PUBLIC_ROUTES.blog,
    });

export default async function BlogIndexPage() {
  const posts = getAllPosts();

  if (!posts.length) return <EmptyBlog />;

  const featured = getFeaturedPost();
  const rest = posts.filter((p) => p.slug !== featured?.slug);
  const data = await getBlogData();

  const trail = [
    { name: "Home", path: "/" },
    { name: "Blog", path: PUBLIC_ROUTES.blog },
  ];

  // Only figures the data layer actually returned. An absent statistic is
  // dropped, never rendered as zero - the same contract as CountsStrip.
  const heroStats = [
    data.upcomingTotal ? { value: data.upcomingTotal, label: "upcoming exhibitions" } : null,
    data.countryCount ? { value: data.countryCount, label: "countries covered" } : null,
    data.cityCount ? { value: data.cityCount, label: "cities" } : null,
  ].filter(Boolean);

  return (
    <>
      <JsonLd
        graph={graph(
          breadcrumbNode(trail),
          itemListNode(posts.map((p) => blogPostPath(p.slug)), { name: "OneXhib blog posts" })
        )}
      />

      <BlogHero stats={heroStats} items={data.upcomingItems} />

      <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
        <Breadcrumbs trail={trail} />
      </div>

      {/* ---------------- What this is ----------------

          Plain description of the source and the scope, placed before the
          articles so a first-time reader knows what they are reading before
          they read it. The links are the ones a reader following the sentence
          would actually want next, not extra anchors for their own sake. */}
      <div className="mx-auto w-full max-w-3xl px-4 pt-8 sm:px-6">
        <p className="ox-reveal text-[16px] leading-relaxed text-gray-600 dark:text-gray-400">
          OneXhib brings exhibition information together in one place — the shows, the
          companies exhibiting at them, and the products and services around them. These
          articles use that catalogue to answer practical questions: where exhibitions
          happen, when the season peaks, and which industries are represented. When an
          article raises something worth acting on, you can carry straight on into the
          live listings — by{" "}
          <Link href={PUBLIC_ROUTES.locations} className={inlineLink}>
            location
          </Link>
          ,{" "}
          <Link href={PUBLIC_ROUTES.categories} className={inlineLink}>
            industry
          </Link>
          , or the{" "}
          <Link href={PUBLIC_ROUTES.exhibitions} className={inlineLink}>
            full exhibition catalogue
          </Link>
          .
        </p>
      </div>

      {/* ---------------- Lead story ----------------

          A real <section> with a heading, not a bare <div>. The card's own title
          is an <h3> (the convention documented in Section.jsx: one h1, sections
          are h2, card titles h3), so without an h2 here the document jumped
          h1 -> h3 and the outline lost a level. The heading is visually hidden
          because the card already carries a "Featured" chip — repeating it in
          large type would be chrome for its own sake — but assistive tech still
          gets the level it needs. */}
      {featured ? (
        <section
          aria-labelledby="featured-heading"
          className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12"
        >
          <h2 id="featured-heading" className="sr-only">
            Featured article
          </h2>
          <FeaturedPostCard post={featured} data={data} />
        </section>
      ) : null}

      {/* ---------------- Remaining articles ---------------- */}
      {rest.length ? (
        <Section
          id="all-articles"
          title="More articles"
          intro="Each one is counted from the live catalogue and dated, so you can see how current it is."
          className="pb-14 sm:pb-16"
        >
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((post) => (
              <li key={post.slug}>
                <PostCard post={post} data={data} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* ---------------- Built from exhibition data ---------------- */}
      <div className="border-y border-gray-200 bg-[#FAFBFE] py-14 sm:py-16 dark:border-gray-800 dark:bg-gray-900/40">
        <Section
          id="built-from-data"
          title="Built from exhibition data"
          intro="These articles are not commentary. Every figure is counted from the exhibitions currently listed on OneXhib, and the charts below update as the catalogue does."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            {data.topCountries.length ? (
              <Panel
                icon={MapPin}
                title="Where exhibitions are listed"
                note="Countries with the most upcoming listings. Select one to browse it."
              >
                <DataBars
                  rows={data.topCountries}
                  hrefFor={(row) => countryLandingPath(row.slug)}
                  unitLabel="upcoming listings"
                />
              </Panel>
            ) : null}

            {data.monthly ? (
              <Panel
                icon={LineChart}
                title="When the season peaks"
                note="Upcoming listings by month across the next year."
              >
                <SeasonCurve
                  monthly={data.monthly}
                  caption="Later months are always thinner — organisers publish dates further ahead as the year progresses."
                />
              </Panel>
            ) : null}

            {data.topIndustries.length ? (
              <Panel
                icon={Database}
                title="Which industries show up most"
                note="Sectors with the most upcoming listings. Select one to browse it."
                className="lg:col-span-2"
              >
                {/* Split across two columns for layout, but both scale against
                    the whole list's max — otherwise each column would scale to
                    its own leader and the smaller half would read as equal to
                    the larger one. */}
                <div className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                  {[
                    data.topIndustries.slice(0, 3),
                    data.topIndustries.slice(3, 6),
                  ].map((half, i) =>
                    half.length ? (
                      <DataBars
                        key={i}
                        rows={half}
                        scaleMax={data.topIndustries[0]?.count}
                        hrefFor={(row) => categoryLandingPath(row.slug)}
                        unitLabel="upcoming listings"
                      />
                    ) : null
                  )}
                </div>
              </Panel>
            ) : null}
          </div>
        </Section>
      </div>

      {/* ---------------- The workflow ---------------- */}
      <Section
        id="how-it-fits"
        title="From a listing to a decision"
        intro="An exhibition record is the starting point, not the destination. Each step below is a real page you can open."
        className="py-14 sm:py-16"
      >
        <Workflow />
      </Section>

      {/* ---------------- Discovery ---------------- */}
      <div className="border-t border-gray-200 bg-[#FAFBFE] py-14 sm:py-16 dark:border-gray-800 dark:bg-gray-900/40">
        <Section
          id="discover"
          title="What you can discover on OneXhib"
          intro="The four catalogues these articles are written from."
          cta="Browse all exhibitions"
          ctaHref={PUBLIC_ROUTES.exhibitions}
        >
          <DiscoverGrid counts={data.counts} upcomingTotal={data.upcomingTotal} />
        </Section>
      </div>

      {/* ---------------- SEO destinations ---------------- */}
      <Section
        id="destinations"
        title="Explore exhibitions across OneXhib"
        intro="Looking for more than an article? Every country, city and industry below has its own page of live listings."
        className="py-14 sm:py-16"
      >
        <SeoDestinations
          countries={data.featuredCountries}
          industries={data.topIndustries}
          cities={data.featuredCities}
        />
      </Section>
    </>
  );
}

const inlineLink =
  "font-semibold text-[#131C55] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:text-blue-300 dark:focus-visible:outline-blue-300";

/** Panel frame for a data block. */
function Panel({ icon: Icon, title, note, children, className = "" }) {
  return (
    <div
      className={`ox-reveal rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-gray-900 ${className}`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#131C55]/[0.06] text-[#131C55] dark:bg-blue-400/10 dark:text-blue-300"
        >
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <h3 className="text-[16px] font-bold tracking-tight text-gray-900 dark:text-gray-50">{title}</h3>
          {note ? (
            <p className="mt-1 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">{note}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

/**
 * The four steps, each pointing at a route that exists.
 *
 * The connector is a CSS pseudo-line rather than an SVG path, so it reflows with
 * the cards instead of needing recalculation, and it is hidden on mobile where
 * the steps stack vertically and the numbering already implies the order.
 */
function Workflow() {
  const steps = [
    {
      n: "01",
      icon: Compass,
      title: "Discover",
      body: "Start from what is coming up, or narrow straight to a country or city.",
      href: PUBLIC_ROUTES.locations,
      cta: "Browse by location",
    },
    {
      n: "02",
      icon: Database,
      title: "Explore",
      body: "Open a show for its dates, venue and the companies exhibiting there.",
      href: PUBLIC_ROUTES.exhibitions,
      cta: "See exhibitions",
    },
    {
      n: "03",
      icon: LineChart,
      title: "Compare",
      body: "Look across an industry to see which shows serve the same audience.",
      href: PUBLIC_ROUTES.categories,
      cta: "Browse by industry",
    },
    {
      n: "04",
      icon: MapPin,
      title: "Plan",
      body: "Line up the suppliers a stand needs once the show is chosen.",
      href: PUBLIC_ROUTES.services,
      cta: "Find services",
    },
  ];

  return (
    <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent lg:block dark:via-gray-700"
      />
      {steps.map(({ n, icon: Icon, title, body, href, cta }) => (
        <li key={n} className="ox-reveal relative">
          <div className="flex h-full flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#131C55] text-white dark:bg-blue-400 dark:text-gray-950"
              >
                <Icon size={17} />
              </span>
              <span className="text-[12px] font-bold tabular-nums tracking-widest text-gray-300 dark:text-gray-600">
                {n}
              </span>
            </div>

            <h3 className="text-[16px] font-bold tracking-tight text-gray-900 dark:text-gray-50">{title}</h3>
            <p className="text-[14px] leading-relaxed text-gray-600 dark:text-gray-400">{body}</p>

            <Link
              href={href}
              className="mt-auto inline-flex items-center gap-1.5 pt-2 text-[13px] font-semibold text-[#131C55] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#131C55] dark:text-blue-300 dark:focus-visible:outline-blue-300"
            >
              {cta}
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** No posts yet: noindex, and a route out rather than a dead end. */
function EmptyBlog() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Blog</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
        No articles yet. In the meantime, browse{" "}
        <Link
          href={PUBLIC_ROUTES.exhibitions}
          className="font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300"
        >
          upcoming exhibitions
        </Link>
        .
      </p>
    </div>
  );
}
