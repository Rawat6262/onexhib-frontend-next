import Image from "next/image";
import Link from "next/link";
import { PUBLIC_ROUTES, SITE_NAME } from "@/lib/seo";
import { exhibitionsScopePath } from "@/lib/routes";

/**
 * Public site footer.
 *
 * Its main job is internal linking: every public route is reachable as a plain
 * <a> from every page, which is how crawlers find the deeper discovery pages
 * and how link equity reaches them. Login and Signup are ordinary links too —
 * nothing here is behind JavaScript.
 *
 * The city links are passed in from the page rather than hardcoded, because
 * they are derived from live inventory. A city with no exhibitions simply never
 * appears instead of becoming an empty page.
 */
export default function PublicFooter({ cities = [] }) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Image
              src="/Dark.png"
              alt={SITE_NAME}
              width={200}
              height={45}
              loading="lazy"
              className="h-8 w-auto object-contain"
            />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Discover exhibitions and trade shows worldwide, the companies exhibiting at them, and
              the products they bring.
            </p>
          </div>

          <FooterColumn title="Discover">
            <FooterLink href={PUBLIC_ROUTES.exhibitions}>All exhibitions</FooterLink>
            <FooterLink href={exhibitionsScopePath("ongoing")}>Ongoing exhibitions</FooterLink>
            <FooterLink href={exhibitionsScopePath("previous")}>Past exhibitions</FooterLink>
            <FooterLink href={PUBLIC_ROUTES.companies}>Companies</FooterLink>
            <FooterLink href={PUBLIC_ROUTES.products}>Products</FooterLink>
            <FooterLink href={PUBLIC_ROUTES.services}>Exhibition services</FooterLink>
          </FooterColumn>

          {cities.length ? (
            <FooterColumn title="Exhibitions by city">
              {cities.slice(0, 6).map(({ city }) => (
                <FooterLink key={city} href={`${PUBLIC_ROUTES.exhibitions}?city=${encodeURIComponent(city)}`}>
                  Exhibitions in {city}
                </FooterLink>
              ))}
            </FooterColumn>
          ) : null}

          <FooterColumn title="Account">
            <FooterLink href="/login">Login</FooterLink>
            <FooterLink href="/signup">Create an account</FooterLink>
            <FooterLink href="/privacy-policy">Privacy policy</FooterLink>
            <FooterLink href="/delete-account">Delete account</FooterLink>
          </FooterColumn>
        </div>

        <p className="mt-10 border-t border-gray-200 pt-6 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-500">
          © {year} {SITE_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-gray-100">
        {title}
      </h2>
      <ul className="mt-3 list-none space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-gray-600 underline-offset-4 transition hover:text-[#131C55] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:text-gray-400 dark:hover:text-white"
      >
        {children}
      </Link>
    </li>
  );
}
