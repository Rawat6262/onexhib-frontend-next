import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { PUBLIC_ROUTES } from "@/lib/seo";

/**
 * The one site header, used signed-out and signed-in.
 *
 * WHY THIS EXISTS
 * The public site and the dashboard were two different products visually: a
 * light, centred, navy-accented site before login, and a Vite-era full-height
 * navy sidebar with generic blue-500 accents after it. Logging in felt like
 * being handed to a different company. The single most effective fix is for the
 * first thing you see after login to be the thing you were already looking at,
 * so both sides now render THIS component - same logo, same height, same blur,
 * same nav, same theme toggle.
 *
 * The only difference between the two is the `right` slot: signed-out gets
 * Login/Sign up links, signed-in gets the account menu. Everything else is
 * shared by construction rather than by two files agreeing to look alike.
 *
 * NOT a client component. It has no state of its own - the mobile menu is a
 * native <details> disclosure, so the public site still ships zero JavaScript
 * for navigation. When the dashboard imports it into a client tree it simply
 * becomes part of that bundle; nothing here forces a boundary either way.
 */

export const PUBLIC_NAV = [
  { href: PUBLIC_ROUTES.exhibitions, label: "Exhibitions" },
  { href: PUBLIC_ROUTES.companies, label: "Companies" },
  { href: PUBLIC_ROUTES.products, label: "Products" },
  { href: PUBLIC_ROUTES.services, label: "Services" },
];

export default function AppHeader({ nav = PUBLIC_NAV, right = null, mobileExtra = null }) {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/85 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/85">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="OneXhib home">
          <Image
            src="/Dark.png"
            alt="OneXhib"
            width={200}
            height={45}
            priority
            className="h-8 w-auto object-contain sm:h-9"
          />
        </Link>

        {nav.length ? (
          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex list-none items-center gap-1">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={navLink}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle className="text-gray-500 dark:text-gray-400" />
          {right}

          {/* Native disclosure: no JavaScript, no hydration, closes on Esc. */}
          <details className="group relative md:hidden">
            <summary
              className="flex cursor-pointer items-center rounded-lg p-2 text-gray-600 marker:content-none [&::-webkit-details-marker]:hidden dark:text-gray-300"
              aria-label="Open menu"
            >
              <Menu size={20} aria-hidden="true" />
            </summary>
            <nav
              aria-label="Mobile"
              className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-800 dark:bg-gray-900"
            >
              <ul className="list-none space-y-0.5">
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className={mobileLink}>
                      {item.label}
                    </Link>
                  </li>
                ))}
                {mobileExtra}
              </ul>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

const navLink =
  "rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white";

export const mobileLink =
  "block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800";
