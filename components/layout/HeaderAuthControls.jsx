"use client";

import Link from "next/link";
import { LayoutGrid } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { homeRouteForRole } from "@/lib/auth";
import AccountMenu from "@/components/layout/AccountMenu";
import { mobileLink } from "@/components/layout/AppHeader";

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
      {/* The way back into the workspace. Without it, a signed-in user who
          browses into the public site has no route home except the URL bar. */}
      <Link
        href={homeRouteForRole(role)}
        className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 transition hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none sm:inline-flex dark:text-gray-300 dark:hover:text-white"
      >
        <LayoutGrid size={15} aria-hidden="true" />
        Dashboard
      </Link>
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
        <Link href={homeRouteForRole(role)} className={mobileLink}>
          Dashboard
        </Link>
      </li>
    </>
  );
}
