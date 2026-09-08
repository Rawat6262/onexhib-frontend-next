import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Building2, Search } from "lucide-react";

import ThemeToggle from "@/components/layout/ThemeToggle";

/**
 * Shared shell for every auth screen: login, signup, OTP, forgot/reset password.
 *
 * WHAT CHANGED AND WHY
 * The old shell was a blue-100 -> purple-100 gradient page holding a single
 * white card, with a blue-600 -> purple-600 gradient submit button. None of
 * those colours exist anywhere else in the product - the site is navy #131C55
 * on white - so signing in looked like arriving at a different company's app,
 * which is the same complaint the dashboard had.
 *
 * This is a split screen: the brand on the left, the form on the right. The
 * left panel reuses the exact treatment the homepage CTA and the featured
 * slider already use (the navy gradient plus the inline-SVG grid), so it is
 * recognisably the same product rather than a new theme invented for auth.
 *
 * WHY THE PANEL IS lg-ONLY
 * On a phone a decorative half-screen would push the password field below the
 * fold. Small screens get a compact navy header instead: brand presence, three
 * lines of it, and the form immediately after.
 *
 * The API is unchanged - `wide` and `formProps` - so all five screens using
 * this component needed no edits beyond their own field styling.
 *
 * @param {boolean} [wide]  signup's multi-column form needs a roomier column
 * @param {object}  [formProps]  spread onto the <form> (onSubmit lives here)
 * @param {{label: string, value: string}[]} [stats]  real platform totals,
 *        passed in from a Server Component. Omitted -> the block is not shown.
 *        Never invented here; see lib/public-api.js getCounts().
 */
export default function AuthCard({ children, wide = false, formProps, stats }) {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] dark:bg-gray-950">
      <BrandPanel stats={stats} wide={wide} />

      {/* ── Form column ────────────────────────────────────────────────── */}
      <div className="relative flex flex-col">
        {/* Mobile brand bar. The panel is hidden below lg, and an auth screen
            with no logo at all reads as an untrusted page asking for a
            password. */}
        <div className="flex items-center justify-between bg-[#131C55] px-4 py-3 lg:hidden">
          <Link href="/" aria-label="OneXhib home">
            <Image
              src="/Untitled-2-01 1.png"
              alt="OneXhib"
              width={160}
              height={48}
              priority
              className="h-7 w-auto object-contain"
            />
          </Link>
          <ThemeToggle className="text-white/80 hover:!bg-white/10" />
        </div>

        <div className="flex items-center justify-between px-4 pt-4 sm:px-8 lg:px-10">
          {/* The old auth pages had no route back to the site at all — if you
              opened /login by accident you were stuck with the browser's back
              button. */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-500 transition hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Back to site
          </Link>
          {/* Wrapped rather than given "hidden lg:inline-flex": ThemeToggle
              already sets inline-flex in its own base classes, and Tailwind
              resolves that by CSS order, not class-attribute order - so the
              toggle stayed visible and rendered twice on mobile. */}
          <div className="hidden lg:block">
            <ThemeToggle className="text-gray-500 dark:text-gray-400" />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8 sm:py-12 lg:px-10">
          <form
            {...formProps}
            className={`w-full space-y-6 ${wide ? "max-w-2xl" : "max-w-sm"}`}
          >
            {children}
          </form>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * The brand half.
 *
 * Three layers, cheapest first: the navy gradient (CSS), a 20 KB abstract
 * texture at low opacity, and the same inline-SVG grid the cards use. bg.png
 * is deliberately NOT used here - it is 2 MB and would dominate LCP on the one
 * page where people are waiting to type a password.
 */
function BrandPanel({ stats, wide }) {
  return (
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#131C55] to-[#0E1B6B] lg:flex lg:flex-col">
      <Image
        src="/bg2.jpg"
        alt=""
        aria-hidden="true"
        fill
        sizes="45vw"
        priority
        className="pointer-events-none object-cover opacity-[0.22] mix-blend-luminosity"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Cpath d='M32 0H0v32' fill='none' stroke='%23ffffff' stroke-width='1'/%3E%3C/svg%3E\")",
        }}
      />
      {/* Warms the lower-left corner so the panel is not a flat rectangle. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(76,99,210,0.35),transparent_65%)]"
      />

      <div className={`relative flex flex-1 flex-col justify-between p-10 ${wide ? "xl:p-12" : "xl:p-14"}`}>
        <Link href="/" aria-label="OneXhib home" className="w-fit">
          <Image
            src="/Untitled-2-01 1.png"
            alt="OneXhib"
            width={200}
            height={60}
            priority
            className="h-9 w-auto object-contain"
          />
        </Link>

        <div className="max-w-md py-10">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
            List your exhibition. Reach the people looking for it.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-blue-100/80">
            OneXhib brings exhibitions and trade shows from around the world into one place, along
            with the companies exhibiting and the products they bring.
          </p>

          {/* Capabilities the product genuinely has — the same three the public
              "How it works" section describes. No claims about outcomes. */}
          <ul className="mt-8 list-none space-y-4">
            {[
              { icon: CalendarDays, text: "Publish your exhibition with its dates, venue and category" },
              { icon: Building2, text: "Add the companies exhibiting and the products they showcase" },
              { icon: Search, text: "Be found by visitors browsing by city, country and industry" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-blue-100 ring-1 ring-white/15">
                  <Icon size={16} aria-hidden="true" />
                </span>
                <span className="text-[15px] leading-relaxed text-blue-50/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {stats?.length ? (
          <dl className="flex flex-wrap gap-x-10 gap-y-4 border-t border-white/15 pt-6">
            {stats.map(({ label, value }) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd>
                  <span className="block text-2xl font-bold tracking-tight text-white">{value}</span>
                  <span className="text-[13px] text-blue-200/70">{label}</span>
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <span aria-hidden="true" />
        )}
      </div>
    </aside>
  );
}

/* ── Shared field styles ───────────────────────────────────────────────────
   Same radius, borders and focus ring as the public SearchBar and the
   dashboard inputs, so a form field looks identical everywhere in the product.
   Exported as strings because the five auth screens own their own markup. */

export const authLabel =
  "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

export const authInput =
  "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:border-[#131C55] focus:outline-none focus:ring-2 focus:ring-[#131C55]/20 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20";

export const authPrimaryBtn =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#131C55] px-5 py-3 text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#0E1B6B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] disabled:opacity-60 motion-reduce:transition-none";

export const authSecondaryBtn =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-[15px] font-semibold text-gray-900 transition hover:border-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-500";

export const authLink =
  "font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300";
