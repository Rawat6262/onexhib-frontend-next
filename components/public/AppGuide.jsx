import Link from "next/link";
import {
  BadgeCheck,
  Bell,
  Bookmark,
  Building2,
  CalendarDays,
  ChevronDown,
  Download,
  Flame,
  LogIn,
  MessageSquare,
  QrCode,
  Ticket,
  Users,
} from "lucide-react";

/**
 * The explanation under the store cards on /get-app: how to use it (first,
 * written for a visitor), benefits by role, notifications and a short FAQ.
 *
 * Every statement describes something the app and backend actually do - the
 * QR pass (Service/qrCode.js), exhibitor lead scanning with hot/warm/cold and
 * a note, kept on the phone and backed up to the account (lead.controller.js),
 * organiser gate check-in with totals rather than names (checkIn.controller.js),
 * one account shared by app and website (both auth controllers use the same
 * Signup model) and the notification types - and matches the privacy policy's
 * "The OneXhib App" section. No ratings, download counts, prices or
 * testimonials: none of that is recorded here.
 */

const ROLES = [
  {
    icon: Ticket,
    title: "For visitors",
    tint: "from-sky-500/20 dark:from-sky-400/20",
    ring: "text-sky-700 bg-sky-500/10 dark:text-sky-300 dark:bg-sky-400/10",
    points: [
      "Carry your OneXhib pass on your phone: a QR code tied to your account.",
      "Get checked in at the entrance with one scan when the organiser checks passes.",
      "Share your details with an exhibitor by letting them scan your pass, instead of handing over a business card.",
      "Get reminders for the shows you saved and the meetings you have booked.",
    ],
  },
  {
    icon: Building2,
    title: "For exhibitors",
    tint: "from-violet-500/20 dark:from-violet-400/20",
    ring: "text-violet-700 bg-violet-500/10 dark:text-violet-300 dark:bg-violet-400/10",
    points: [
      "Scan a visitor's pass at your stand to capture them as a lead: name, email, phone, company, role, location, website, industry and what they are looking for.",
      "Mark each lead hot, warm or cold and add a note while the conversation is fresh.",
      "Leads are kept on your phone as you scan and backed up to your OneXhib account.",
      "Get alerts for new enquiries and meetings.",
    ],
  },
  {
    icon: Users,
    title: "For organisers",
    tint: "from-amber-500/20 dark:from-amber-400/20",
    ring: "text-amber-700 bg-amber-500/10 dark:text-amber-300 dark:bg-amber-400/10",
    points: [
      "Check visitors in at the entrance by scanning their passes.",
      "See attendance totals on the show's statistics screen and in its PDF report.",
      "Visitors' privacy is kept: organisers see the totals, not a list of names.",
    ],
  },
];

const STEPS = [
  {
    icon: Download,
    title: "Install the app",
    body: "Tap the App Store or Google Play badge above. The store opens on OneXhib; install it like any other app.",
  },
  {
    icon: LogIn,
    title: "Sign in",
    body: "Use the account you already have on the OneXhib website, or create one in the app in a minute.",
  },
  {
    icon: Bookmark,
    title: "Save your shows",
    body: "Save the exhibitions you plan to visit. You get reminders, and an 11 am note on the day they are on.",
  },
  {
    icon: QrCode,
    title: "Show your pass",
    body: "At the show, open your QR pass: it checks you in at the entrance and shares your details with the exhibitors you choose.",
  },
];

const ALERTS = [
  { icon: CalendarDays, label: "Your meetings" },
  { icon: MessageSquare, label: "Enquiries" },
  { icon: Users, label: "Community activity" },
  { icon: Flame, label: "Shows you saved" },
  { icon: Bell, label: "A daily 11 am note about shows on that day" },
];

/** Rendered below and emitted as FAQPage JSON-LD by the page: one array for both. */
export const APP_FAQ = [
  {
    q: "Do I need a separate account for the app?",
    a: "No. The app uses the same OneXhib account as the website, so you can sign in with the details you already have, or create an account in the app.",
  },
  {
    q: "Who sees my details when my pass is scanned?",
    a: "When an exhibitor scans your pass at their stand, your card details are saved in that exhibitor's account so they can follow up, and are not shared with anyone else. When an organiser scans it at the entrance, OneXhib records that you attended that show on that day, and organisers see totals, not names.",
  },
  {
    q: "Can I turn notifications off?",
    a: "Yes. Notifications only arrive if you allow them, and you can switch each type off in Account.",
  },
  {
    q: "What happens if I delete my account?",
    a: "Deleting your account removes your profile, leads, check-ins and notification settings. Copies of your card that exhibitors already scanned stay in their accounts as their leads; you can ask an exhibitor to remove them.",
  },
];

const WRAP = "mx-auto w-full max-w-5xl px-4 sm:px-6";
const H2 = "mt-2 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl dark:text-white";
const EYEBROW = "text-[12px] font-semibold uppercase tracking-[0.14em] text-ox-blue dark:text-blue-300";

export default function AppGuide() {
  return (
    <>
      {/* ---------------------------------------------------- How to use it */}
      <section aria-labelledby="app-how" className={`${WRAP} py-16 sm:py-20`}>
        <div className="ox-reveal mx-auto max-w-2xl text-center">
          <p aria-hidden="true" className={EYEBROW}>
            How to use it
          </p>
          <h2 id="app-how" className={H2}>
            From download to the show floor in four steps
          </h2>
          <p className="mt-3 text-[15.5px] leading-relaxed text-gray-600 dark:text-gray-400">
            Everything you need on the day, in your pocket.
          </p>
        </div>

        <div className="relative mt-12">
          {/* The line joining the steps, desktop only; decorative. */}
          <div
            aria-hidden="true"
            className="absolute left-[12.5%] right-[12.5%] top-7 hidden h-px bg-gradient-to-r from-sky-400/60 via-violet-400/60 to-emerald-400/60 lg:block"
          />
          <ol className="relative grid list-none gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="ox-reveal text-center">
                <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-ox-navy to-ox-royal text-white shadow-lg shadow-ox-navy/25 ring-4 ring-white dark:ring-gray-950">
                  <Icon size={22} aria-hidden="true" />
                  <span
                    aria-hidden="true"
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[12px] font-bold text-white ring-2 ring-white dark:ring-gray-950"
                  >
                    {i + 1}
                  </span>
                </span>
                <h3 className="mt-4 text-base font-bold text-gray-900 dark:text-white">{title}</h3>
                <p className="mx-auto mt-1.5 max-w-[30ch] text-[14.5px] leading-relaxed text-gray-600 dark:text-gray-400">
                  {body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------- Why use the app */}
      <section
        aria-labelledby="app-benefits"
        className="border-t border-gray-200/70 bg-gray-50/70 py-16 sm:py-20 dark:border-white/[0.06] dark:bg-white/[0.02]"
      >
        <div className={WRAP}>
          <div className="ox-reveal mx-auto max-w-2xl text-center">
            <p aria-hidden="true" className={EYEBROW}>
              Why use the app
            </p>
            <h2 id="app-benefits" className={H2}>
              Built for the show floor
            </h2>
            <p className="mt-3 text-[15.5px] leading-relaxed text-gray-600 dark:text-gray-400">
              The website helps you find the right exhibition. The app is for the days you are
              there: passes, scanning and alerts, for everyone on both sides of the stand.
            </p>
          </div>

          <ul className="mt-10 grid list-none gap-5 md:grid-cols-3">
            {ROLES.map(({ icon: Icon, title, tint, ring, points }) => (
              <li
                key={title}
                className="ox-reveal group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ox-navy/[0.08] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-white/10 dark:bg-gray-900 dark:hover:shadow-black/40"
              >
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br ${tint} to-transparent blur-2xl transition-transform duration-500 group-hover:scale-125 motion-reduce:transition-none`}
                />
                <span className={`relative flex h-12 w-12 items-center justify-center rounded-2xl ${ring}`}>
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3 className="relative mt-5 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                  {title}
                </h3>
                <ul className="relative mt-3 list-none space-y-2.5">
                  {points.map((p) => (
                    <li key={p} className="flex gap-2.5 text-[14.5px] leading-relaxed text-gray-600 dark:text-gray-400">
                      <BadgeCheck size={16} aria-hidden="true" className="mt-[3px] shrink-0 text-emerald-500" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------- Notifications */}
      <section aria-labelledby="app-alerts" className={`${WRAP} pb-16 sm:pb-20`}>
        <div className="ox-reveal relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-ox-navy via-ox-royal to-ox-night px-6 py-10 text-white shadow-2xl shadow-ox-navy/25 sm:px-10 dark:shadow-black/50 dark:ring-1 dark:ring-white/10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-ox-violet/40 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-blue-200">
                <Bell size={14} aria-hidden="true" />
                Notifications
              </p>
              <h2 id="app-alerts" className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Stay on top of every show
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-white/80">
                If you allow notifications, OneXhib alerts you about the things listed here. Each
                one can be switched off in Account.
              </p>
            </div>
            <ul className="grid list-none gap-3 sm:grid-cols-2">
              {ALERTS.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-[14.5px] font-medium backdrop-blur sm:last:col-span-2"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- FAQ */}
      <section aria-labelledby="app-faq" className="mx-auto w-full max-w-3xl px-4 pb-20 sm:px-6">
        <div className="ox-reveal text-center">
          <p aria-hidden="true" className={EYEBROW}>
            Questions
          </p>
          <h2 id="app-faq" className={H2}>
            Good to know
          </h2>
        </div>
        <div className="mt-8 space-y-3">
          {APP_FAQ.map(({ q, a }) => (
            <details
              key={q}
              className="ox-reveal group rounded-2xl border border-gray-200 bg-white px-5 shadow-sm transition-shadow open:shadow-md dark:border-white/10 dark:bg-gray-900"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 text-[15.5px] font-semibold text-gray-900 marker:content-none [&::-webkit-details-marker]:hidden dark:text-white">
                {q}
                <ChevronDown
                  size={18}
                  aria-hidden="true"
                  className="shrink-0 text-gray-400 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                />
              </summary>
              <p className="pb-5 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">{a}</p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-center text-[14px] text-gray-500 dark:text-gray-400">
          More detail is in our{" "}
          <Link
            href="/privacy-policy"
            className="font-semibold text-ox-navy underline-offset-4 hover:underline dark:text-blue-300"
          >
            privacy policy
          </Link>
          .
        </p>
      </section>
    </>
  );
}
