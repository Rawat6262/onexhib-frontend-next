"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  Briefcase,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  KeyRound,
  Landmark,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
  Store,
  UserRoundPen,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { ROLES, homeRouteForRole } from "@/lib/auth";

/**
 * "Dashboard" in the header, on EVERY signed-in page - the public site,
 * Community and the dashboards themselves. Before, Community's header had no
 * way back to the dashboard at all, and the public header had a plain link to
 * the home page only.
 *
 * A button with a menu: the workspace pages for the account's role, then the
 * personal pages. The role decides the list because the backend refuses the
 * others (a service provider cannot open the organiser's centre editor).
 */

const WORKSPACE = {
  [ROLES.ORGANISER]: [
    { href: "/organiser", label: "My exhibitions", hint: "Manage your shows", icon: CalendarDays },
    { href: "/organiser/exhibition-centres", label: "Exhibition centres", hint: "Venues you added", icon: Landmark },
    { href: "/organiser/request-access", label: "Request access", hint: "Edit a show already listed", icon: KeyRound },
    { href: "/services", label: "My services", hint: "Your service listings", icon: Briefcase },
  ],
  [ROLES.EXHIBITION_SERVICE]: [
    { href: "/services", label: "My services", hint: "Your service listings", icon: Briefcase },
    { href: "/organiser", label: "My exhibitions", hint: "Shows you listed", icon: CalendarDays },
  ],
  [ROLES.ADMIN]: [
    { href: "/admin/dashboard", label: "Admin console", hint: "Everything on OneXhib", icon: ShieldCheck },
    { href: "/admin/exhibition-centres", label: "Exhibition centres", hint: "All venues", icon: Landmark },
    { href: "/admin/requests", label: "Access requests", hint: "Waiting for a decision", icon: KeyRound },
    { href: "/organiser", label: "My exhibitions", hint: "Organiser view", icon: CalendarDays },
  ],
  [ROLES.EXHIBITOR]: [{ href: "/exhibitor", label: "Exhibitor workspace", hint: "Company, products, shows", icon: Store }],
  [ROLES.VISITOR]: [{ href: "/welcome", label: "Get started", hint: "Choose what you do on OneXhib", icon: Sparkles }],
};

const PERSONAL = [
  { href: "/account/profile", label: "Profile", icon: UserRoundPen },
  { href: "/account/saved", label: "Saved", icon: Bookmark },
  { href: "/account/meetings", label: "Meetings", icon: CalendarClock },
];

const ROLE_LABEL = {
  [ROLES.ORGANISER]: "Organiser",
  [ROLES.EXHIBITION_SERVICE]: "Service provider",
  [ROLES.ADMIN]: "Admin",
  [ROLES.EXHIBITOR]: "Exhibitor",
  [ROLES.VISITOR]: "Visitor",
};

export default function DashboardMenu() {
  const { user, role } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);

  const home = homeRouteForRole(role);
  const items = WORKSPACE[role] || WORKSPACE[ROLES.VISITOR];
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.company_name || "Your account";
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "OX";

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onDown = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-white shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none sm:px-3 ${
          open ? "bg-[#0E1B6B]" : "bg-[#131C55] hover:bg-[#0E1B6B]"
        } dark:bg-blue-500 dark:hover:bg-blue-400`}
      >
        <LayoutGrid size={15} aria-hidden="true" />
        <span className="hidden sm:inline">Dashboard</span>
        <ChevronDown size={14} aria-hidden="true" className={`opacity-80 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          role="menu"
          className="ox-menu-in absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-[#131C55]/10 dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/40"
        >
          {/* Who and where to: the account, its role, and its home. */}
          <Link
            href={home}
            role="menuitem"
            className="group relative flex items-center gap-3 overflow-hidden bg-gradient-to-br from-[#131C55] via-[#1B2A7A] to-[#2B3FB8] px-4 py-4 text-white"
          >
            <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-blue-400/30 blur-2xl" />
            <span aria-hidden="true" className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 text-sm font-bold ring-1 ring-white/25">
              {initials}
            </span>
            <span className="relative min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{name}</span>
              <span className="block text-xs text-blue-100/85">{ROLE_LABEL[role] || "Member"} · Open dashboard</span>
            </span>
            <ArrowRight size={16} aria-hidden="true" className="relative transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Link>

          <p className="px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2B3FB8] dark:text-blue-300">Workspace</p>
          <ul className="list-none px-2 pb-2">
            {items.map((item) => {
              const here = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    role="menuitem"
                    aria-current={here ? "page" : undefined}
                    className={`group flex items-center gap-3 rounded-xl px-2 py-2 transition motion-reduce:transition-none ${
                      here ? "bg-[#2B3FB8]/[0.08] dark:bg-white/[0.06]" : "hover:bg-[#2B3FB8]/[0.06] dark:hover:bg-white/[0.05]"
                    }`}
                  >
                    <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#2B3FB8]/10 text-[#2B3FB8] transition group-hover:bg-[#2B3FB8] group-hover:text-white motion-reduce:transition-none dark:bg-blue-400/15 dark:text-blue-300">
                      <item.icon size={17} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold text-gray-900 dark:text-gray-100">{item.label}</span>
                      <span className="block truncate text-[12px] text-gray-500 dark:text-gray-400">{item.hint}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex gap-2 border-t border-gray-100 bg-gray-50/70 px-3 py-2.5 dark:border-gray-800 dark:bg-white/[0.02]">
            {PERSONAL.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] font-medium text-gray-700 transition hover:bg-white hover:text-[#131C55] dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                <item.icon size={14} aria-hidden="true" className="text-gray-400" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
