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
      <div className="relative isolate flex flex-col overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(43,63,184,0.12),transparent_65%)] dark:bg-[radial-gradient(circle,rgba(76,99,210,0.22),transparent_65%)]" />
          <div
            className="absolute inset-0 text-[#131C55] opacity-[0.04] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)] dark:text-white dark:opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>
        {/* Mobile brand bar. The panel is hidden below lg, and an auth screen
            with no logo at all reads as an untrusted page asking for a
            password. */}
        <div className="flex items-center justify-between bg-gradient-to-r from-[#0B1240] to-[#1B2A7A] px-4 py-3 lg:hidden">
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
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#0B1240] via-[#131C55] to-[#2B1F7A] lg:flex lg:flex-col">
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
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-20 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.30),transparent_65%)]"
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
          <h2 className="text-3xl leading-[1.1] font-extrabold tracking-tight text-white xl:text-[2.6rem]">
            List your exhibition.{" "}
            <span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-violet-300 bg-clip-text text-transparent">
              Reach the people looking for it.
            </span>
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
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-white/20 to-white/5 text-white ring-1 ring-white/20 backdrop-blur">
                  <Icon size={16} aria-hidden="true" />
                </span>
                <span className="text-[15px] leading-relaxed text-blue-50/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {stats?.length ? (
          <dl className="grid grid-cols-3 divide-x divide-white/10 overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-white/10 backdrop-blur">
            {stats.map(({ label, value }) => (
              <div key={label} className="px-4 py-4">
                <dt className="sr-only">{label}</dt>
                <dd>
                  <span className="block text-2xl font-extrabold tracking-tight text-white tabular-nums">{value}</span>
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
  "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:border-[#2B3FB8] focus:outline-none focus:ring-4 focus:ring-[#2B3FB8]/15 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20";

export const authPrimaryBtn =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#131C55] to-[#2B3FB8] px-5 py-3 text-[15px] font-semibold text-white shadow-lg shadow-indigo-900/25 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] disabled:opacity-60 disabled:hover:brightness-100 motion-reduce:transition-none dark:from-blue-600 dark:to-indigo-500";

export const authSecondaryBtn =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-[15px] font-semibold text-gray-900 transition hover:border-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-500";

export const authLink =
  "font-semibold text-[#2B3FB8] underline-offset-4 hover:underline dark:text-blue-300";
