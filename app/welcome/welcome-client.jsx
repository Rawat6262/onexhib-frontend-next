"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  Briefcase,
  CalendarClock,
  Users,
  CalendarDays,
  Check,
  Building2,
  Compass,
  Loader2,
  MessagesSquare,
  Presentation,
  Store,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/AuthProvider";
import { changeMyRole } from "@/models/auth.model";
import { ROLES, homeRouteForRole } from "@/lib/auth";
import { ACCOUNT_TYPES, accountTypeFor } from "@/lib/account-types";
import { PUBLIC_ROUTES } from "@/lib/seo";

const TYPE_ICONS = {
  [ROLES.VISITOR]: Ticket,
  [ROLES.EXHIBITOR]: Store,
  [ROLES.ORGANISER]: Presentation,
  [ROLES.EXHIBITION_SERVICE]: Briefcase,
};

const QUICK_LINKS = [
  {
    href: PUBLIC_ROUTES.exhibitions,
    title: "Browse exhibitions",
    body: "Search thousands of trade shows by industry, city or date.",
    Icon: Compass,
  },
  {
    href: `${PUBLIC_ROUTES.exhibitions}/monthly`,
    title: "Exhibition calendar",
    body: "See what's on, month by month.",
    Icon: CalendarDays,
  },
  {
    href: PUBLIC_ROUTES.companies,
    title: "Companies & products",
    body: "Explore who exhibits and what they bring.",
    Icon: Building2,
  },
  {
    href: "/social",
    title: "Community",
    body: "Follow people, share updates and join the conversation.",
    Icon: MessagesSquare,
  },
];

/**
 * The home of an account with no workspace, and the account-type switcher.
 *
 * Two jobs, in that order. A VISITOR or Exhibitor first needs to know what they
 * CAN do (the quick links), because "no dashboard" is not the same as "nothing
 * here". Second, anyone who picked the wrong type at signup can fix it without
 * support — select a card, save, and land in the right place.
 *
 * Select-then-save rather than switch-on-click: a type change moves the user to a
 * different home, so a stray click should not do that. No confirm dialog either —
 * the change is reversible from this same page, and the shared ConfirmDialog is
 * styled for destructive actions.
 */
export default function WelcomeClient() {
  const router = useRouter();
  const { user, role, signIn } = useAuth();

  const [selected, setSelected] = useState(role);
  const [saving, setSaving] = useState(false);

  const current = accountTypeFor(role);
  const isAdmin = role === ROLES.ADMIN;
  const hasWorkspace = Boolean(current?.workspace) || isAdmin;
  const firstName = user?.first_name || user?.company_name || "";
  const dirty = Boolean(selected) && selected !== role;
  const target = accountTypeFor(selected);

  const handleSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const { data } = await changeMyRole(selected);
      // Merge rather than replace: the cached profile may hold fields this
      // response shapes differently, and losing them would blank the header.
      signIn({ ...user, ...(data?.user || {}), designation: selected, role: selected });
      toast.success(`You're now set up as ${target?.label || "your new account type"}.`);
      router.push(homeRouteForRole(selected));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Your account type could not be changed. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      {/* ---- Hero ---------------------------------------------------------- */}
      <section className="relative overflow-hidden rounded-3xl bg-[#131C55] px-6 py-8 text-white shadow-lg sm:px-10 sm:py-10 dark:bg-gradient-to-br dark:from-[#131C55] dark:to-gray-900 dark:ring-1 dark:ring-white/10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl"
        />
        <div className="relative">
          {current || isAdmin ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-100 ring-1 ring-white/15">
              Your account: {isAdmin ? "Admin" : current.label}
            </span>
          ) : null}
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {firstName ? `Welcome, ${firstName}` : "Welcome to OneXhib"}
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-blue-100/90">
            {hasWorkspace
              ? "Your dashboard is ready. You can also change your account type below if it no longer fits."
              : "Visitor accounts don't have a dashboard. Everything on OneXhib is open to you, and the links below are a good place to start. If you exhibit, run exhibitions or offer services, switch your account type further down this page."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {hasWorkspace ? (
              <Link
                href={homeRouteForRole(role)}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#131C55] transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
              >
                {role === ROLES.EXHIBITOR ? "Open my exhibitor workspace" : "Go to my dashboard"}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            ) : (
              <Link
                href={PUBLIC_ROUTES.exhibitions}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#131C55] transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
              >
                Explore exhibitions
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
            <a
              href="#account-type"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
            >
              Change account type
            </a>
          </div>

          {/* Every account's own things - a visitor's real "dashboard". They
              were reachable only from the account menu. */}
          <ul className="mt-8 grid list-none grid-cols-1 gap-2.5 border-t border-white/10 pt-6 sm:grid-cols-3">
            {[
              { href: "/account/saved", label: "Saved exhibitions", sub: "Shows you bookmarked", Icon: Bookmark },
              { href: "/account/meetings", label: "My meetings", sub: "Requests and bookings", Icon: CalendarClock },
              { href: "/social", label: "Community", sub: "Posts from people you follow", Icon: Users },
            ].map(({ href, label, sub, Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-3 ring-1 ring-white/10 transition hover:bg-white/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white">
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white">{label}</span>
                    <span className="block truncate text-xs text-blue-100/70">{sub}</span>
                  </span>
                  <ArrowRight size={15} aria-hidden="true" className="shrink-0 text-blue-100/60 transition group-hover:translate-x-0.5 motion-reduce:transform-none" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- What you can do ---------------------------------------------- */}
      <section aria-labelledby="quick-links-heading" className="mt-12">
        <h2 id="quick-links-heading" className="text-xl font-semibold text-gray-900 dark:text-gray-50">
          What you can do on OneXhib
        </h2>
        <ul className="mt-4 grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map(({ href, title, body, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#131C55]/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transform-none motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-400/30"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#131C55]/[0.07] text-[#131C55] dark:bg-blue-400/10 dark:text-blue-300">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="mt-4 text-base font-semibold text-gray-900 dark:text-gray-50">{title}</span>
                <span className="mt-1 flex-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{body}</span>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#131C55] dark:text-blue-300">
                  Open
                  <ArrowRight
                    size={14}
                    aria-hidden="true"
                    className="transition group-hover:translate-x-0.5 motion-reduce:transform-none"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- Account type --------------------------------------------------- */}
      <section id="account-type" aria-labelledby="account-type-heading" className="mt-14 scroll-mt-24">
        <h2 id="account-type-heading" className="text-xl font-semibold text-gray-900 dark:text-gray-50">
          Your account type
        </h2>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          Choose the one that best describes you. It decides which tools you see. You can change it again at any time.
        </p>

        {isAdmin ? (
          <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            Admin accounts can&rsquo;t change their own type. Ask another admin if this needs to change.
          </p>
        ) : (
          <>
            <div role="radiogroup" aria-labelledby="account-type-heading" className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {ACCOUNT_TYPES.map((type) => {
                const Icon = TYPE_ICONS[type.value];
                const checked = selected === type.value;
                const isCurrent = role === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => setSelected(type.value)}
                    disabled={saving}
                    className={`relative flex h-full flex-col rounded-2xl border-2 p-5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] disabled:opacity-70 motion-reduce:transition-none ${
                      checked
                        ? "border-[#131C55] bg-[#131C55]/[0.03] shadow-sm dark:border-blue-400 dark:bg-blue-400/[0.06]"
                        : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
                    }`}
                  >
                    <span className="flex items-start gap-3">
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition motion-reduce:transition-none ${
                          checked
                            ? "bg-[#131C55] text-white dark:bg-blue-500 dark:text-gray-950"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        <Icon size={20} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-semibold text-gray-900 dark:text-gray-50">{type.label}</span>
                          {isCurrent ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                              Current
                            </span>
                          ) : null}
                          {type.workspace ? (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                              Dashboard
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                          {type.summary}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition motion-reduce:transition-none ${
                          checked
                            ? "border-[#131C55] bg-[#131C55] text-white dark:border-blue-400 dark:bg-blue-400 dark:text-gray-950"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {checked ? <Check size={12} strokeWidth={3} /> : null}
                      </span>
                    </span>
                    <ul className="mt-4 list-none space-y-1.5 border-t border-gray-100 pt-4 dark:border-gray-800">
                      {type.perks.map((perk) => (
                        <li key={perk} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <Check size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-900/60">
              <p className="text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
                {dirty ? (
                  <>
                    Switch from <strong className="text-gray-900 dark:text-gray-100">{current?.label || "your current type"}</strong> to{" "}
                    <strong className="text-gray-900 dark:text-gray-100">{target?.label}</strong>
                    {target?.workspace ? " — you'll be taken to your new dashboard." : "."}
                  </>
                ) : (
                  "Select a different type above to switch."
                )}
              </p>
              <button
                type="button"
                onClick={handleSave}
                disabled={!dirty || saving}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#131C55] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0E1B6B] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:bg-blue-500 dark:text-gray-950 dark:hover:bg-blue-400"
              >
                {saving ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : null}
                {saving ? "Saving…" : "Save account type"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
