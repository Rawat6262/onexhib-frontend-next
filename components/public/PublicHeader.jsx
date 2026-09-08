import Link from "next/link";
import AppHeader, { PUBLIC_NAV, mobileLink } from "@/components/layout/AppHeader";

/**
 * Public site header — the signed-out configuration of the shared AppHeader.
 *
 * All the chrome (logo, nav, theme toggle, mobile disclosure) now lives in
 * AppHeader so the dashboard renders exactly the same bar rather than a
 * lookalike that drifts. This file supplies only what is specific to being
 * signed out: the Login and Sign up links.
 *
 * Still a Server Component shipping no JavaScript for navigation.
 */
export default function PublicHeader() {
  return (
    <AppHeader
      nav={PUBLIC_NAV}
      right={
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
      }
      mobileExtra={
        <li className="pt-1 sm:hidden">
          <Link href="/login" className={mobileLink}>
            Login
          </Link>
        </li>
      }
    />
  );
}
