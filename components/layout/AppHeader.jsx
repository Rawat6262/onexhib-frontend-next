import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Menu, Sparkles } from "lucide-react";
import ThemeToggle from "@/components/layout/ThemeToggle";
import MegaNav from "@/components/layout/MegaNav";
import { AI_LINK, DIRECTORY_MENU, EXHIBITIONS_MENU, NEWS_LINK } from "@/components/layout/nav-config";
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
 * NOT a client component. The desktop menus (MegaNav) are a client island;
 * the mobile menu is native <details> disclosures, one per group, so it needs
 * no JavaScript. Both list the pages in nav-config.js.
 */

/**
 * The flat list of the main sections. No longer rendered as the header's row
 * (MegaNav groups them), but kept for anything that wants the plain list.
 */
export const PUBLIC_NAV = [
  { href: PUBLIC_ROUTES.exhibitions, label: "Exhibitions" },
  { href: `${PUBLIC_ROUTES.exhibitions}/monthly`, label: "Calendar" },
  { href: "/news", label: "News" },
  { href: PUBLIC_ROUTES.companies, label: "Companies" },
  { href: PUBLIC_ROUTES.products, label: "Products" },
  { href: PUBLIC_ROUTES.services, label: "Services" },
  // `highlight` renders this as a filled pill rather than a plain link. AI
  // search is the one entry worth pulling out of the row: it is the newest
  // capability and the least discoverable, since nothing else on the site
  // hints that you can type a sentence instead of using filters.
  { href: "/ai-search", label: "AI Search", highlight: true },
];

export default function AppHeader({ right = null, mobileExtra = null }) {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/85 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/85">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="OneXhib home">
          <Image
            src="/Dark.png"
            alt="OneXhib"
            width={200}
            height={45}
            // Lazy (next/image's default) on purpose - neither priority NOR eager.
            // Only one of these two logos is ever visible (the theme is a class
            // the server cannot see). Priority adds a <link rel=preload>, and
            // React 19 also auto-preloads any non-lazy <img> during SSR, so
            // either way the hidden logo was preloaded and Chrome warned
            // "preloaded but not used" on every page. Lazy loads the visible one
            // straight away (it is at the top of the viewport) and never fetches
            // the display:none one at all.
            className="h-8 w-auto object-contain dark:hidden sm:h-9"
          />
          <Image
            src="/Untitled-2-01 1.png"
            alt="OneXhib"
            width={124}
            height={42}
            className="hidden h-8 w-auto object-contain dark:block sm:h-9"
          />
        </Link>

        <MegaNav />

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle className="text-gray-500 dark:text-gray-400" />
          {right}

          {/* Native disclosure: no JavaScript, no hydration, closes on Esc. */}
          <details className="group relative xl:hidden">
            <summary
              className="flex cursor-pointer items-center rounded-lg p-2 text-gray-600 marker:content-none [&::-webkit-details-marker]:hidden dark:text-gray-300"
              aria-label="Open menu"
            >
              <Menu size={20} aria-hidden="true" />
            </summary>
            <nav
              aria-label="Mobile"
              className="absolute right-0 top-full mt-2 max-h-[calc(100vh-5rem)] w-72 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-800 dark:bg-gray-900"
            >
              <ul className="list-none space-y-0.5">
                {[EXHIBITIONS_MENU, DIRECTORY_MENU].map((menu) => (
                  <MobileGroup key={menu.key} label={menu.label} links={mobileLinksOf(menu)} />
                ))}
                <li>
                  <Link href={NEWS_LINK.href} className={mobileLink}>
                    {NEWS_LINK.label}
                  </Link>
                </li>
                <li>
                  <Link href={AI_LINK.href} className={`${mobileLink} flex items-center gap-1.5 font-semibold text-[#131C55] dark:text-blue-300`}>
                    <Sparkles size={14} aria-hidden="true" className="shrink-0" />
                    {AI_LINK.label}
                  </Link>
                </li>
                {mobileExtra}
              </ul>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

export const mobileLink =
  "block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800";

/** A menu's links for the phone menu: its columns or cards, flattened. */
export function mobileLinksOf(menu) {
  if (menu.columns) return menu.columns.flatMap((c) => c.links);
  return menu.cards.map((c) => ({ href: c.href, label: c.title, icon: c.icon }));
}

/**
 * One collapsible group in the phone menu. A nested <details>, so it opens
 * and closes without JavaScript like the menu around it.
 */
export function MobileGroup({ label, links }) {
  return (
    <li>
      <details className="group/m">
        <summary className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 marker:content-none hover:bg-gray-100 [&::-webkit-details-marker]:hidden dark:text-gray-100 dark:hover:bg-gray-800">
          {label}
          <ChevronDown size={15} aria-hidden="true" className="text-gray-400 transition-transform group-open/m:rotate-180 motion-reduce:transition-none" />
        </summary>
        <ul className="mb-1 ml-3 list-none space-y-0.5 border-l border-gray-100 pl-2 dark:border-gray-800">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13.5px] font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
                {l.icon ? <l.icon size={15} aria-hidden="true" className="shrink-0 text-[#2B3FB8] dark:text-blue-300" /> : null}
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}
