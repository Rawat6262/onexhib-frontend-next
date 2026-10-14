"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import AppHeader, { PUBLIC_NAV, mobileLink } from "@/components/layout/AppHeader";
import AccountMenu from "@/components/layout/AccountMenu";
import NotificationProvider from "@/components/social/NotificationProvider";
import NotificationBell from "@/components/social/NotificationBell";
import PageBackdrop from "@/components/public/PageBackdrop";

/**
 * Community sits in the SIGNED-IN header only, and this is the place that makes
 * that true without a single conditional.
 *
 * Every social endpoint requires the uid cookie, so a Community link shown to a
 * guest can only ever bounce them to /login. The obvious implementation — read
 * `status` from useAuth() inside AppHeader — would be wrong for a different
 * reason: AppHeader is deliberately NOT a client component, its mobile menu is a
 * native <details>, and the public site ships zero JavaScript for navigation.
 * Adding a hook there would opt every public page into a client bundle for a link
 * those visitors must not see anyway.
 *
 * AppShell already solves it. Its only three consumers are (dashboard), (social)
 * and admin, and all three wrap it in RequireAuth — so anything added to the nav
 * here is authenticated by construction. PublicHeader renders AppHeader directly
 * and never sees this entry.
 */
const COMMUNITY_NAV = [{ href: "/social", label: "Community" }];

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
 *
 * `variant="sidebar"` is the exception, and it is opt-in per area. Community has
 * five destinations rather than two, and its pages are a narrow reading column,
 * so on a wide screen the space either side of the feed was empty anyway — a
 * vertical rail spends that space instead of taking it from the content. Below
 * `lg` there is no such spare width, so the sidebar variant falls back to the
 * same horizontal tab strip as everyone else rather than a drawer that hides
 * the labels again. `navTitle` labels the rail.
 */
export default function AppShell({ items = [], variant = "tabs", navTitle, children }) {
  const pathname = usePathname();
  const activeHref = findActiveHref(items, pathname);
  const sidebar = variant === "sidebar" && items.length > 0;

  return (
    /*
     * ONE NotificationProvider PER AUTHENTICATED SHELL, and this is the place that
     * makes that true. AppShell's only consumers are (dashboard), (social) and
     * admin, each rendering it once inside RequireAuth — so an authenticated page
     * has exactly one provider and therefore exactly one unread poll, while public
     * pages never mount it and never poll for a session they do not have.
     *
     * It wraps the whole shell rather than just the header, because the badge and
     * /social/notifications must read the SAME count: two providers would be two
     * numbers that drift the moment one of them changed.
     *
     * The same reasoning that put Community in this nav applies to the bell — every
     * social endpoint needs only a login, so any signed-in user has an inbox.
     */
    <NotificationProvider>
    <div className="relative isolate flex min-h-screen flex-col bg-white dark:bg-gray-950">
      {/* Below the sticky header and sub-nav (z-40/z-50) and behind content. */}
      <PageBackdrop />
      <AppHeader
        nav={[...PUBLIC_NAV, ...COMMUNITY_NAV]}
        right={
          <>
            <NotificationBell />
            <AccountMenu />
          </>
        }
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
          admin area's four items behave on a phone without a second row. In the
          sidebar variant this strip is the below-`lg` fallback only. */}
      {items.length ? (
        <div
          className={`sticky top-[57px] z-40 border-b border-gray-200 bg-gray-50/90 backdrop-blur-md sm:top-[61px] dark:border-gray-800 dark:bg-gray-900/70 ${
            sidebar ? "lg:hidden" : ""
          }`}
        >
          <nav aria-label="Workspace" className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <ul className="-mb-px flex list-none items-center gap-1 overflow-x-auto">
              {items.map((item) => {
                const active = item.href === activeHref;
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

      {sidebar ? (
        <div className="mx-auto flex w-full max-w-6xl flex-1 lg:gap-8 lg:px-6">
          <SideNav items={items} activeHref={activeHref} title={navTitle} />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      ) : (
        <main className="flex-1">{children}</main>
      )}
    </div>
    </NotificationProvider>
  );
}

/**
 * Which item is the current page: the LONGEST href that matches on a path
 * segment boundary.
 *
 * A plain `pathname.startsWith(href)` was wrong as soon as one item's href was a
 * prefix of another's: "/social" matches "/social/people", so Feed stayed lit on
 * every Community page alongside the real one. Longest-match keeps nested routes
 * (e.g. /social/posts/123) under nothing rather than under Feed, and the "/"
 * boundary stops "/admin/organisers" from claiming "/admin/organisers-archive".
 */
function findActiveHref(items, pathname) {
  let best = null;
  for (const { href } of items) {
    if (!href) continue;
    const hit = pathname === href || pathname.startsWith(href.endsWith("/") ? href : `${href}/`);
    if (hit && (!best || href.length > best.length)) best = href;
  }
  return best;
}

/**
 * The vertical rail used by `variant="sidebar"`, `lg` and up only.
 *
 * Sticky just under the header so it stays reachable down a long feed, with its
 * top padding matched to the pages' own (py-12) so the rail and the page title
 * start on the same line. The active item gets a filled icon tile plus a tinted
 * row, not the tab strip's underline: a vertical list has no baseline to
 * underline, and colour alone would fail anyone who cannot tell navy from grey.
 */
function SideNav({ items, activeHref, title }) {
  return (
    <aside className="hidden w-60 shrink-0 lg:block">
      <div className="sticky top-[61px] pt-12 pb-8">
        <nav
          aria-label={title || "Workspace"}
          className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900/60"
        >
          {title ? (
            <p className="px-3 pt-2 pb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
              {title}
            </p>
          ) : null}
          <ul className="flex list-none flex-col gap-0.5">
            {items.map((item) => {
              const active = item.href === activeHref;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`group flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#131C55]/40 dark:focus-visible:ring-blue-400/50 ${
                      active
                        ? "bg-[#131C55]/[0.06] text-[#131C55] dark:bg-blue-400/10 dark:text-blue-200"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/70 dark:hover:text-white"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition motion-reduce:transition-none ${
                        active
                          ? "bg-[#131C55] text-white shadow-sm dark:bg-blue-500"
                          : "bg-gray-100 text-gray-500 group-hover:bg-white group-hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:group-hover:bg-gray-700 dark:group-hover:text-gray-200"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
