"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Search, Sparkles } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { PUBLIC_ROUTES } from "@/lib/seo";
import {
  AI_LINK,
  COMMUNITY_MENU,
  DIRECTORY_MENU,
  EXHIBITIONS_MENU,
  NEWS_LINK,
  ORGANISER_LINKS,
} from "@/components/layout/nav-config";

/**
 * The desktop (xl and up) primary navigation: Exhibitions, Directory and, when
 * signed in, Community open full-width dropdown panels; News and AI Search
 * stay plain links. Below xl the header's mobile menu lists the same pages
 * (see nav-config.js, shared by both).
 *
 * BEHAVIOUR
 *  - Pointer: opens on hover after a short delay (so sweeping across the bar
 *    does not flash panels) and closes shortly after the pointer leaves the
 *    bar AND the panel; moving between them keeps it open.
 *  - Click/tap and keyboard: the trigger toggles; Escape closes and returns
 *    focus to the trigger; a click outside or a route change closes.
 *  - The panels' live numbers come from /api/nav-summary, fetched once, on the
 *    first hover or focus - the header itself stays static and costs nothing.
 *
 * Every page a menu lists is also reachable from the page it groups under
 * (Exhibitions, Companies, Community), so the menus are a shortcut and never
 * the only way to a destination.
 */

const OPEN_DELAY = 90;
const CLOSE_DELAY = 160;

const fmt = (n) => (Number.isFinite(n) ? n.toLocaleString("en-US") : null);
// "/exhibition/" style entries match any page under that prefix; the others
// match the page itself and anything below it.
const isActive = (pathname, match = []) =>
  match.some((m) => (m.endsWith("/") ? pathname.startsWith(m) : pathname === m || pathname.startsWith(`${m}/`)));

let summaryPromise = null;
function loadSummary() {
  summaryPromise ||= fetch("/api/nav-summary")
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => {
      summaryPromise = null; // try again on the next open
      return null;
    });
  return summaryPromise;
}

export default function MegaNav() {
  const pathname = usePathname() || "/";
  const { status, user } = useAuth();
  const authed = status === "authed";
  const [open, setOpen] = useState(null);
  const [summary, setSummary] = useState(null);
  const rootRef = useRef(null);
  const timer = useRef(null);
  const triggers = useRef({});
  const baseId = useId();

  const menus = [EXHIBITIONS_MENU, DIRECTORY_MENU, ...(authed ? [COMMUNITY_MENU] : [])];

  const warm = useCallback(() => {
    if (!summary) loadSummary().then((s) => s && setSummary(s));
  }, [summary]);

  const schedule = (fn, ms) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  };

  // Close on navigation.
  useEffect(() => setOpen(null), [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        triggers.current[open]?.focus();
        setOpen(null);
      }
    };
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const active = menus.find((m) => m.key === open);

  return (
    <div
      ref={rootRef}
      className="hidden xl:block"
      onPointerLeave={(e) => e.pointerType === "mouse" && schedule(() => setOpen(null), CLOSE_DELAY)}
      onPointerEnter={(e) => e.pointerType === "mouse" && clearTimeout(timer.current)}
    >
      <nav aria-label="Primary">
        <ul className="flex list-none items-center gap-0.5">
          {menus.map((menu) => {
            const expanded = open === menu.key;
            const here = isActive(pathname, menu.match);
            return (
              <li key={menu.key}>
                <button
                  ref={(el) => (triggers.current[menu.key] = el)}
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`${baseId}-${menu.key}`}
                  onPointerEnter={(e) => {
                    if (e.pointerType !== "mouse") return;
                    warm();
                    schedule(() => setOpen(menu.key), open ? 0 : OPEN_DELAY);
                  }}
                  onFocus={warm}
                  onClick={() => {
                    warm();
                    clearTimeout(timer.current);
                    setOpen((cur) => (cur === menu.key ? null : menu.key));
                  }}
                  className={`relative inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none ${
                    expanded
                      ? "bg-[#2B3FB8]/[0.08] text-[#131C55] dark:bg-blue-400/10 dark:text-white"
                      : here
                        ? "text-[#131C55] dark:text-white"
                        : "text-gray-700 hover:bg-gray-100 hover:text-[#131C55] dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                  }`}
                >
                  {menu.label}
                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={`text-gray-400 transition-transform motion-reduce:transition-none ${expanded ? "rotate-180 text-[#2B3FB8] dark:text-blue-300" : ""}`}
                  />
                  {here ? <span aria-hidden="true" className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-[#2B3FB8] dark:bg-blue-300" /> : null}
                </button>
              </li>
            );
          })}
          <li>
            <Link
              href={NEWS_LINK.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none ${
                isActive(pathname, [NEWS_LINK.href]) ? "text-[#131C55] dark:text-white" : "text-gray-700 hover:bg-gray-100 hover:text-[#131C55] dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              }`}
            >
              {NEWS_LINK.label}
            </Link>
          </li>
          <li className="ml-1">
            <Link
              href={AI_LINK.href}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-gradient-to-r from-[#2B3FB8] to-[#6D4CF0] px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none"
            >
              <Sparkles size={14} aria-hidden="true" className="shrink-0" />
              {AI_LINK.label}
            </Link>
          </li>
        </ul>
      </nav>

      {/* The panel hangs off the whole header (its nearest positioned
          ancestor), full width, so every menu lines up under the logo. */}
      {active ? (
        <div className="absolute inset-x-0 top-full z-50 px-4 pt-2 sm:px-6">
          <div
            id={`${baseId}-${active.key}`}
            role="region"
            aria-label={`${active.label} menu`}
            className="ox-menu-in mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl shadow-[#131C55]/10 dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/40"
          >
            {active.key === "exhibitions" ? (
              <ExhibitionsPanel summary={summary} />
            ) : active.key === "directory" ? (
              <DirectoryPanel summary={summary} />
            ) : (
              <CommunityPanel userId={user?._id} />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ── Panels ─────────────────────────────────────────────────────────────── */

function ExhibitionsPanel({ summary }) {
  const [browse, explore] = EXHIBITIONS_MENU.columns;
  return (
    <>
      <div className="grid gap-5 bg-gradient-to-b from-[#F7F8FD] to-white p-5 lg:grid-cols-[15.5rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] dark:from-white/[0.02] dark:to-transparent">
        <SummaryCard summary={summary} />
        <Column title={browse.title} links={browse.links} summary={summary} />
        <Column title={explore.title} links={explore.links} summary={summary} />
        <div>
          <ColumnTitle>Happening next</ColumnTitle>
          <ul className="list-none space-y-2">
            {summary?.next?.length
              ? summary.next.map((e, i) => <NextShow key={e.id} show={e} tone={i} />)
              : [0, 1, 2].map((i) => <li key={i} className="h-[58px] animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />)}
          </ul>
          <Link href={PUBLIC_ROUTES.exhibitions} className="mt-3 inline-flex items-center gap-1 px-1 text-[13px] font-semibold text-[#2B3FB8] hover:underline dark:text-blue-300">
            See all upcoming <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-5 py-3.5 dark:border-gray-800">
        {summary?.popular?.length ? (
          <>
            <span className="mr-1 text-[13px] font-semibold text-gray-900 dark:text-gray-100">Popular:</span>
            {summary.popular.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[12.5px] font-medium text-gray-700 transition hover:border-[#2B3FB8] hover:text-[#2B3FB8] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-300 dark:hover:text-blue-300"
              >
                {p.label}
              </Link>
            ))}
          </>
        ) : (
          <span className="text-[13px] text-gray-500 dark:text-gray-400">Exhibitions, trade shows and business events worldwide.</span>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          {ORGANISER_LINKS.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                i === 0
                  ? "inline-flex items-center gap-1.5 rounded-xl bg-[#131C55] px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#0E1B6B] dark:bg-blue-500 dark:hover:bg-blue-400"
                  : "inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-[13px] font-semibold text-gray-800 transition hover:border-[#131C55] dark:border-gray-700 dark:text-gray-200"
              }
            >
              <l.icon size={14} aria-hidden="true" />
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

function SummaryCard({ summary }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#131C55] via-[#1B2A7A] to-[#2B3FB8] p-5 text-white shadow-lg shadow-indigo-900/20">
      <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-400/30 blur-3xl" />
      <p className="relative text-[11px] font-bold uppercase tracking-[0.16em] text-blue-100/80">Exhibitions</p>
      <p className="relative mt-2 text-3xl font-extrabold tabular-nums leading-none">
        {summary ? fmt(summary.upcoming) || "Worldwide" : <span className="inline-block h-7 w-24 animate-pulse rounded bg-white/15 align-middle" />}
      </p>
      <p className="relative mt-1.5 text-[13px] text-blue-50/85">upcoming shows worldwide</p>
      <div className="relative mt-3 flex flex-wrap gap-1.5 text-[11.5px] font-medium">
        {summary?.live ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {fmt(summary.live)} live
          </span>
        ) : null}
        {summary?.thisWeek ? <span className="rounded-full bg-white/15 px-2.5 py-1">{fmt(summary.thisWeek)} this week</span> : null}
      </div>
      <form action={PUBLIC_ROUTES.exhibitions} className="relative mt-4" role="search">
        <label htmlFor="mega-search" className="sr-only">
          Search exhibitions
        </label>
        <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-100/80" />
        <input
          id="mega-search"
          name="search"
          type="search"
          placeholder="Search shows, cities…"
          className="w-full rounded-xl border border-white/20 bg-white/10 py-2 pl-9 pr-3 text-[13px] text-white placeholder:text-blue-100/70 outline-none transition focus:border-white/50 focus:bg-white/15"
        />
      </form>
    </div>
  );
}

function DirectoryPanel({ summary }) {
  return (
    <div className="grid gap-4 bg-gradient-to-b from-[#F7F8FD] to-white p-5 md:grid-cols-3 dark:from-white/[0.02] dark:to-transparent">
      {DIRECTORY_MENU.cards.map((card) => {
        const extra = card.dynamicLinks ? (summary?.[card.dynamicLinks] || []).map((l) => ({ ...l, hint: "", icon: card.icon })) : [];
        const n = fmt(summary?.[card.stat]);
        return (
          <section key={card.title} className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <Link
              href={card.href}
              className="group relative flex h-[76px] items-end gap-2.5 overflow-hidden bg-gradient-to-br from-[#131C55] via-[#1B2A7A] to-[#2B3FB8] px-4 pb-3 text-white"
            >
              <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-blue-400/30 blur-2xl" />
              <card.icon size={19} aria-hidden="true" className="relative" />
              <span className="relative text-[15px] font-semibold">{card.title}</span>
              <span className="relative ml-auto text-[12px] text-blue-50/85">{n ? `${n}${card.statSuffix}` : ""}</span>
              <ArrowRight size={15} aria-hidden="true" className="relative transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
            <ul className="list-none space-y-0.5 p-2">
              {[...card.links, ...extra].map((l) => (
                <li key={l.href}>
                  <MenuItem link={l} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function CommunityPanel({ userId }) {
  const [feed, you] = COMMUNITY_MENU.columns;
  const fix = (l) => (l.profile ? (userId ? { ...l, href: `/social/profile/${encodeURIComponent(String(userId))}` } : null) : l);
  return (
    <div className="grid gap-5 bg-gradient-to-b from-[#F7F8FD] to-white p-5 md:grid-cols-[1fr_1fr_1.1fr] dark:from-white/[0.02] dark:to-transparent">
      <Column title={feed.title} links={feed.links} />
      <Column title={you.title} links={you.links.map(fix).filter(Boolean)} />
      <Link
        href="/social"
        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#131C55] via-[#1B2A7A] to-[#2B3FB8] p-5 text-white"
      >
        <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-400/30 blur-3xl" />
        <span className="relative text-[11px] font-bold uppercase tracking-[0.16em] text-blue-100/80">OneXhib community</span>
        <span className="relative mt-2 text-lg font-bold leading-snug">Talk to organisers, exhibitors and service providers</span>
        <span className="relative mt-4 inline-flex items-center gap-1 text-[13px] font-semibold">
          Open the feed <ArrowRight size={14} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </span>
      </Link>
    </div>
  );
}

/* ── Pieces ─────────────────────────────────────────────────────────────── */

function ColumnTitle({ children }) {
  return (
    <p className="mb-2 flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2B3FB8] dark:text-blue-300">
      <span aria-hidden="true" className="h-px w-4 bg-current opacity-60" />
      {children}
    </p>
  );
}

function Column({ title, links, summary }) {
  return (
    <div>
      <ColumnTitle>{title}</ColumnTitle>
      <ul className="list-none space-y-0.5">
        {links.map((l) => (
          <li key={l.href}>
            <MenuItem link={l} summary={summary} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function MenuItem({ link, summary }) {
  const n = link.stat ? fmt(summary?.[link.stat]) : null;
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      className="group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-[#2B3FB8]/[0.06] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#2B3FB8] motion-reduce:transition-none dark:hover:bg-white/[0.05]"
    >
      <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#2B3FB8]/10 text-[#2B3FB8] transition group-hover:bg-[#2B3FB8] group-hover:text-white motion-reduce:transition-none dark:bg-blue-400/15 dark:text-blue-300 dark:group-hover:bg-blue-500 dark:group-hover:text-white">
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold text-gray-900 dark:text-gray-100">{link.label}</span>
        {link.hint ? <span className="block truncate text-[12px] text-gray-500 dark:text-gray-400">{link.hint}</span> : null}
      </span>
      {link.tag ? (
        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">{link.tag}</span>
      ) : null}
      {n ? (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
            link.live ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          {n}
        </span>
      ) : null}
    </Link>
  );
}

const TONES = ["bg-[#131C55]", "bg-[#2B3FB8]", "bg-[#4F46E5]"];

function NextShow({ show, tone }) {
  const d = show.startDate ? new Date(show.startDate) : null;
  const valid = d && !Number.isNaN(d.getTime());
  return (
    <li>
      <Link
        href={show.href}
        className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-2 transition hover:border-[#2B3FB8]/40 hover:shadow-sm motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-400/40"
      >
        <span aria-hidden="true" className={`flex h-[42px] w-[42px] shrink-0 flex-col items-center justify-center rounded-xl text-white ${TONES[tone % TONES.length]}`}>
          <span className="text-[15px] font-bold leading-none">{valid ? d.getUTCDate() : "–"}</span>
          <span className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-wide opacity-85">
            {valid ? d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }) : ""}
          </span>
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold text-gray-900 dark:text-gray-100">{show.name}</span>
          {show.place ? <span className="block truncate text-[11.5px] text-gray-500 dark:text-gray-400">{show.place}</span> : null}
        </span>
      </Link>
    </li>
  );
}
