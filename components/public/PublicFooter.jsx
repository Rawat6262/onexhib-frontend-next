import Image from "next/image";
import Link from "next/link";
import { ArrowUp, Globe2, Mail } from "lucide-react";

import { PUBLIC_ROUTES, SITE_NAME } from "@/lib/seo";
import { cityLandingPath, countryLandingPath, exhibitionsScopePath } from "@/lib/routes";
import { isBlogEmpty } from "@/lib/blog";
import SocialLinks from "@/components/public/SocialLinks";

/**
 * Public site footer.
 *
 * Its main job is internal linking: every public route is reachable as a plain
 * <a> from every page, which is how crawlers find the deeper discovery pages
 * and how link equity reaches them. Login and Signup are ordinary links too —
 * nothing here is behind JavaScript.
 *
 * The location links are passed in from the layout rather than hardcoded,
 * because they are derived from live inventory: a place only appears once it
 * clears the quality threshold in lib/locations.js, so the footer can never
 * link to a page that does not exist or is too thin to rank.
 *
 * NAVY IN BOTH THEMES. A footer the same colour as the page let the last
 * section bleed into it; a fixed dark ground closes the page decisively in
 * light mode and still steps down from the page in dark mode. Because the
 * ground never changes, the footer always uses the light-on-dark logo and
 * white-alpha text, and needs no dark: variants of its own.
 *
 * Place links show the bare place name with its count. The heading already
 * says "Exhibitions by city", and the full "Exhibitions in Nadarzyn (Warsaw
 * metropolitan area)" wrapped to three lines in a narrow column. The anchor
 * text keeps the "Exhibitions in" phrase for crawlers and screen readers via
 * sr-only, because that phrase is what each landing page ranks for.
 */
export default function PublicFooter({ locations }) {
  const year = new Date().getFullYear();
  const hasPosts = !isBlogEmpty();
  const countries = locations?.countries || [];
  const cities = countries
    .flatMap((c) => c.cities)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <footer
      id="site-footer"
      className="relative isolate mt-20 overflow-hidden bg-[#070C2B] text-white/70"
    >
      {/* Light from above, a violet counter-glow, and a fine grid faded towards
          the bottom - texture, not decoration you notice. Inline: no requests. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-[#2B3FB8]/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -bottom-40 -z-10 h-96 w-96 rounded-full bg-violet-600/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 text-white opacity-[0.04] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* A hairline of brand gradient where the page ends. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"
      />

      <div className="mx-auto w-full max-w-6xl px-4 pt-16 pb-8 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          {/* ── Brand ─────────────────────────────────────────────────── */}
          <div className="lg:col-span-4 lg:pr-6">
            <Image
              src="/Untitled-2-01 1.png"
              alt={SITE_NAME}
              width={124}
              height={42}
              loading="lazy"
              className="h-9 w-auto object-contain"
            />
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/60">
              Discover exhibitions and trade shows worldwide, the companies exhibiting at them, and
              the products they bring.
            </p>

            {countries.length ? (
              <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/75 ring-1 ring-white/10">
                <Globe2 size={14} aria-hidden="true" className="text-blue-300" />
                Upcoming exhibitions in {countries.length} {countries.length === 1 ? "country" : "countries"}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#131C55] shadow-lg shadow-black/20 transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
              >
                <Mail size={15} aria-hidden="true" />
                Contact us
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center rounded-full px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
              >
                List your event
              </Link>
            </div>

            {/* The only outbound links in a footer whose whole job is internal
                linking — see the note at the top of this file. They are the
                brand's own profiles, so they are followed rather than nofollowed. */}
            <SocialLinks tone="onDark" className="mt-8" />
          </div>

          {/* ── Link columns ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:col-span-8 lg:grid-cols-4">
            <FooterColumn title="Explore">
              <FooterLink href={PUBLIC_ROUTES.exhibitions}>All exhibitions</FooterLink>
              <FooterLink href={exhibitionsScopePath("ongoing")}>Ongoing exhibitions</FooterLink>
              <FooterLink href={`${PUBLIC_ROUTES.exhibitions}/this-week`}>This week</FooterLink>
              <FooterLink href={`${PUBLIC_ROUTES.exhibitions}/monthly`}>Exhibition calendar</FooterLink>
              <FooterLink href={exhibitionsScopePath("previous")}>Past exhibitions</FooterLink>
              <FooterLink href={PUBLIC_ROUTES.locations}>By location</FooterLink>
              <FooterLink href={PUBLIC_ROUTES.categories}>By industry</FooterLink>
            </FooterColumn>

            <FooterColumn title="Directory">
              <FooterLink href={PUBLIC_ROUTES.companies}>Companies</FooterLink>
              <FooterLink href={PUBLIC_ROUTES.products}>Products</FooterLink>
              <FooterLink href={PUBLIC_ROUTES.services}>Exhibition services</FooterLink>
              <FooterLink href="/news">Industry news</FooterLink>
              {/* Rendered only when there is something to read: the hub is
                  noindex while empty, and a site-wide link into a noindex page
                  would spend crawl budget on a dead end. */}
              {hasPosts ? <FooterLink href={PUBLIC_ROUTES.blog}>Blog</FooterLink> : null}
              <FooterLink href="/ai-search">AI Search</FooterLink>
            </FooterColumn>

            {cities.length ? (
              <FooterColumn title="Top cities">
                {cities.map((c) => (
                  <PlaceLink key={`${c.countrySlug}/${c.slug}`} href={cityLandingPath(c.countrySlug, c.slug)} name={c.city} count={c.count} />
                ))}
                <FooterLink href={PUBLIC_ROUTES.locations}>All locations →</FooterLink>
              </FooterColumn>
            ) : null}

            {countries.length ? (
              <FooterColumn title="Top countries">
                {countries.slice(0, 5).map((c) => (
                  <PlaceLink key={c.slug} href={countryLandingPath(c.slug)} name={c.country} count={c.count} />
                ))}
              </FooterColumn>
            ) : null}

            <FooterColumn title="Company">
              <FooterLink href="/about">About {SITE_NAME}</FooterLink>
              <FooterLink href="/contact">Contact</FooterLink>
              <FooterLink href="/terms">Terms of use</FooterLink>
              <FooterLink href="/privacy-policy">Privacy policy</FooterLink>
            </FooterColumn>

            <FooterColumn title="Account">
              <FooterLink href="/login">Login</FooterLink>
              <FooterLink href="/signup">Create an account</FooterLink>
              <FooterLink href="/delete-account">Delete account</FooterLink>
            </FooterColumn>
          </div>
        </div>

        {/* Bottom bar: copyright and back-to-top share one line on anything
            wider than a phone and stack on a phone. */}
        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/45">
            © {year} {SITE_NAME}. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-xs">
            <Link href="/terms" className="text-white/45 transition hover:text-white motion-reduce:transition-none">
              Terms
            </Link>
            <Link href="/privacy-policy" className="text-white/45 transition hover:text-white motion-reduce:transition-none">
              Privacy
            </Link>
            {/* A plain fragment link: no script, and "#" scrolls to the top of
                the document in every browser. */}
            <a
              href="#"
              className="group inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 font-medium text-white/70 ring-1 ring-white/10 transition hover:bg-white hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
            >
              <ArrowUp
                size={13}
                aria-hidden="true"
                className="transition group-hover:-translate-y-0.5 motion-reduce:transform-none"
              />
              Back to top
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }) {
  return (
    <div>
      <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white">{title}</h2>
      <ul className="mt-4 list-none space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-white/60 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
      >
        {children}
      </Link>
    </li>
  );
}

/** A place with its count. "Exhibitions in" stays in the anchor text, visually hidden. */
function PlaceLink({ href, name, count }) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center justify-between gap-2 text-sm text-white/60 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
      >
        <span className="truncate">
          <span className="sr-only">Exhibitions in </span>
          {name}
        </span>
        <span className="shrink-0 rounded-full bg-white/[0.06] px-1.5 py-px text-[10px] font-semibold text-white/50 tabular-nums transition group-hover:bg-white/15 group-hover:text-white motion-reduce:transition-none">
          {count}
        </span>
      </Link>
    </li>
  );
}
