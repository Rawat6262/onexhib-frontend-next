import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { PUBLIC_ROUTES } from "@/lib/seo";

/**
 * Public site header.
 *
 * A Server Component. The mobile menu is a native <details>/<summary>
 * disclosure rather than a React state toggle, so the entire navigation costs
 * zero JavaScript and works before hydration — ThemeToggle stays the only
 * client island in the header.
 *
 * Every destination is a real <a>, so crawlers follow the whole public site
 * from any page, and Login/Signup are plain links rather than script handlers.
 */

const NAV = [
  { href: PUBLIC_ROUTES.exhibitions, label: "Exhibitions" },
  { href: PUBLIC_ROUTES.companies, label: "Companies" },
  { href: PUBLIC_ROUTES.products, label: "Products" },
  { href: PUBLIC_ROUTES.services, label: "Services" },
];

export default function PublicHeader() {
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

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex list-none items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle className="text-gray-500 dark:text-gray-400" />

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
              className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-800 dark:bg-gray-900"
            >
              <ul className="list-none space-y-0.5">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li className="pt-1 sm:hidden">
                  <Link
                    href="/login"
                    className="block rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    Login
                  </Link>
                </li>
              </ul>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
