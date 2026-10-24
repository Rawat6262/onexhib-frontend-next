"use client";

import Link from "next/link";
import { LayoutGrid } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { homeRouteForRole } from "@/lib/auth";
import AccountMenu from "@/components/layout/AccountMenu";
import DashboardMenu from "@/components/layout/DashboardMenu";
import { MobileGroup, mobileLinksOf, mobileLink } from "@/components/layout/AppHeader";
import { COMMUNITY_MENU } from "@/components/layout/nav-config";

/**
 * The auth-aware right-hand side of the public header.
 *
 * THE BUG THIS FIXES
 * The public header hardcoded "Login / Sign up". A signed-in organiser who
 * clicked "Exhibitions" to browse the catalogue landed on a page telling them
 * to log in, so they did - reasonably concluding the app had signed them out.
 * Nothing had: the httpOnly `uid` cookie and the cached profile were both still
 * there. It was purely a header that never asked.
 *
 * WHY A CLIENT ISLAND AND NOT A SERVER CHECK
 * The public pages are statically prerendered and ISR-cached, and are shared by
 * every visitor. Reading the session on the server would make them per-user and
 * uncacheable - a large cost to the three pages the whole SEO effort exists to
 * serve. So the page stays static and this one small island swaps the controls
 * after hydration.
 *
 * WHY "loading" RENDERS THE SIGNED-OUT STATE
 * Server HTML and the first client render must agree or React reports a
 * hydration mismatch, and the server cannot know who you are. Guests - the
 * overwhelming majority of public-page traffic - therefore see the correct
 * controls immediately with no flash. A signed-in visitor sees Login/Sign up
 * for the few milliseconds before the effect in AuthProvider reads the cache.
 */
export default function HeaderAuthControls() {
  const { status, role } = useAuth();

  if (status !== "authed") return <SignedOutLinks />;

  return (
    <>
      {/* Community is a menu in the primary nav now (MegaNav, signed-in only),
          and Dashboard a menu here, so both are labelled and on every page. */}
      <DashboardMenu />
      <AccountMenu />
    </>
  );
}

function SignedOutLinks() {
  return (
    <>
      <Link
        href="/login"
        className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 transition hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none sm:block dark:text-gray-300 dark:hover:text-white"
      >
        Login
      </Link>
      <Link
        href="/signup"
        className="rounded-lg bg-[#131C55] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#0E1B6B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none sm:px-4"
      >
        Sign up
      </Link>
    </>
  );
}

/**
 * The same decision for the mobile disclosure list. Separate component because
 * these are <li> children of the menu's <ul>, not part of the button cluster.
 */
export function HeaderAuthMobileLinks() {
  const { status, role } = useAuth();

  if (status !== "authed") {
    return (
      <li className="pt-1 sm:hidden">
        <Link href="/login" className={mobileLink}>
          Login
        </Link>
      </li>
    );
  }

  return (
    <>
      <li aria-hidden="true" className="my-1 border-t border-gray-100 dark:border-gray-800" />
      <li>
        <Link href={homeRouteForRole(role)} className={`${mobileLink} flex items-center gap-2 font-semibold text-[#131C55] dark:text-blue-300`}>
          <LayoutGrid size={15} aria-hidden="true" />
          Dashboard
        </Link>
      </li>
      <MobileGroup label={COMMUNITY_MENU.label} links={mobileLinksOf(COMMUNITY_MENU).filter((l) => !l.profile)} />
    </>
  );
}
