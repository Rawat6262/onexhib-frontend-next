import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "@/components/layout/ThemeToggle";
import JsonLd from "@/components/seo/JsonLd";
import { SITE_DESCRIPTION } from "@/lib/seo";

export const metadata = {
  // Uses the layout's default title ("OneXhib") rather than the "%s · OneXhib"
  // template, so the homepage title isn't "OneXhib · OneXhib".
  title: { absolute: "OneXhib — exhibitions, exhibitors and products" },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

/**
 * Minimal public entry point. Server Component — ThemeToggle is the only client
 * island. Deliberately a shell: no exhibition content, no marketing sections, no
 * SEO copy. The real landing page is a later, separate piece of work.
 */
export default function Home() {
  return (
    <>
      <JsonLd />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 py-5">
        <Image src="/Dark.png" alt="OneXhib" width={160} height={48} priority className="h-9 sm:h-10 w-auto object-contain" />
        <ThemeToggle className="text-gray-500 dark:text-gray-400" />
      </header>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10">
        <div className="w-full max-w-md text-center space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
              OneXhib
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
              A platform for exhibition organisers, exhibitors and service providers
              to manage exhibitions, companies and products.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-center">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#131C55] text-white font-semibold hover:bg-[#0E1B6B] transition"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold hover:border-[#131C55] dark:hover:border-gray-500 transition"
            >
              Signup
            </Link>
          </div>
        </div>
      </div>

      <footer className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-gray-400 dark:text-gray-500 space-x-3">
        <Link href="/privacy-policy" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition">
          Privacy Policy
        </Link>
        <span>·</span>
        <Link href="/delete-account" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition">
          Delete Account
        </Link>
      </footer>
      </main>
    </>
  );
}
