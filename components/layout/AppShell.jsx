"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import AppHeader, { PUBLIC_NAV, mobileLink } from "@/components/layout/AppHeader";
import AccountMenu from "@/components/layout/AccountMenu";

/**
 * The signed-in shell: same header as the public site, plus a workspace sub-nav.
 *
 * REPLACES SidebarShell, and the reasoning is worth keeping. The old shell was
 * a fixed 256px navy sidebar carrying two links. It cost a fifth of the screen
 * on a laptop to show two words, it was the single biggest visual break between
 * the public site and the app, and its collapsed state hid the labels behind
 * icons that had to be guessed. A horizontal sub-nav under the shared header
 * shows both labels permanently, in less vertical space than the sidebar used
 * horizontally, and inherits the site's chrome for free.
 *
 * The public nav stays in the header while signed in on purpose: an organiser
 * is also a visitor, and losing the way back to the exhibitions catalogue the
 * moment you log in is exactly the discontinuity this is meant to fix.
 *
 * `items` keeps SidebarShell's shape ({label, href, icon}) so the two route
 * layouts that pass it needed no changes beyond the import.
 */
export default function AppShell({ items = [], children }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950">
      <AppHeader
        nav={PUBLIC_NAV}
        right={<AccountMenu />}
        mobileExtra={
          items.length ? (
            <>
              <li aria-hidden="true" className="my-1 border-t border-gray-100 dark:border-gray-800" />
              {items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={mobileLink}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </>
          ) : null
        }
      />

      {/* Workspace sub-nav. Scrolls horizontally rather than wrapping, so the
          admin area's four items behave on a phone without a second row. */}
      {items.length ? (
        <div className="sticky top-[57px] z-40 border-b border-gray-200 bg-gray-50/90 backdrop-blur-md sm:top-[61px] dark:border-gray-800 dark:bg-gray-900/70">
          <nav aria-label="Workspace" className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <ul className="-mb-px flex list-none items-center gap-1 overflow-x-auto">
              {items.map((item) => {
                const active = item.href && pathname.startsWith(item.href);
                return (
                  <li key={item.href} className="shrink-0">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      // An underline rather than a filled pill: the header
                      // above already carries the brand colour, and two navy
                      // blocks stacked read as two competing navigations.
                      className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition motion-reduce:transition-none ${
                        active
                          ? "border-[#131C55] text-[#131C55] dark:border-blue-300 dark:text-blue-300"
                          : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-white"
                      }`}
                    >
                      <span aria-hidden="true" className={active ? "" : "text-gray-400"}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      ) : null}

      <main className="flex-1">{children}</main>
    </div>
  );
}
