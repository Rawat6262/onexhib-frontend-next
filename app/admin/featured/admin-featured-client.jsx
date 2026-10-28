"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CalendarClock,
  CalendarDays,
  Hourglass,
  Loader2,
  Radio,
  MapPin,
  Plus,
  Search,
  Star,
  StarOff,
  X,
} from "lucide-react";

import {
  featureExhibition,
  getFeaturedExhibitionsPage,
  refreshExhibitionPage,
  unfeatureExhibition,
} from "@/models/exhibition.model";
import TablePagination from "@/components/dashboard/TablePagination";
import { exhibitionPath } from "@/lib/routes";
import { AdminHeader, AdminPage, StatCard, StatGrid } from "@/components/admin/AdminUI";
import { btnPrimary, btnRow, btnRowDanger, btnSecondary, inputBase, pill } from "@/components/dashboard/ui";

/**
 * Admin: every featured exhibition in one place.
 *
 * Featured shows feed the slider at the top of the home page. The only way to
 * see which ones were featured used to be scrolling the 5,000-row exhibition
 * list for a star; this page lists just them, says which have already ended
 * (they stay featured until someone removes them), and can feature new ones by
 * search without leaving the page.
 *
 * Feature/unfeature use the same admin endpoints as the Organiser list, and
 * both ask the home page to refresh its slider straight away.
 *
 * DURATION. Featuring asks for a number of days (today is day 1). The window
 * can never run past the show's ending date - the picker caps it and the API
 * refuses anything longer (Service/featureWindow.js in the backend). When the
 * window runs out the show leaves the slider and is listed here as "Feature
 * over", next to ended shows, until it is removed or featured again.
 */

const STATUS = {
  live: { label: "Live now", tone: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25" },
  upcoming: { label: "Upcoming", tone: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/25" },
  ended: { label: "Ended", tone: "bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/25" },
  expired: { label: "Feature over", tone: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/25" },
  undated: { label: "No dates", tone: "bg-gray-100 text-gray-600 ring-gray-500/20 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-600/30" },
};

const TABS = [
  { key: "all", label: "All" },
  { key: "live", label: "Live now" },
  { key: "upcoming", label: "Upcoming" },
  { key: "ended", label: "Ended / over" },
];

const MAX_DAYS = 365;
const PRESETS = [7, 14, 30];
const DAY_MS = 24 * 60 * 60 * 1000;

const day = (v) => (v ? String(v).slice(0, 10) : "");
const today = () => new Date().toISOString().slice(0, 10);

function statusOf(start, end, now = today()) {
  const s = day(start);
  const e = day(end) || s;
  if (!s) return "undated";
  if (e < now) return "ended";
  if (s > now) return "upcoming";
  return "live";
}

function dateRange(start, end) {
  const fmt = (v) =>
    new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  if (!start) return "Dates not set";
  const a = fmt(start);
  const b = end ? fmt(end) : "";
  return b && b !== a ? `${a} – ${b}` : a;
}

const place = (...parts) => parts.filter(Boolean).join(", ");

const fmtDay = (v) =>
  new Date(`${day(v)}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Days from today through the show's last day, inclusive (0 once it has ended). Mirrors the API. */
function daysLeftOf(start, end, now = today()) {
  const last = day(end) || day(start);
  if (!last) return 0;
  return Math.max(0, Math.round((Date.parse(`${last}T00:00:00Z`) - Date.parse(`${now}T00:00:00Z`)) / DAY_MS) + 1);
}

/** The last featured day of an n-day window that starts today. */
const untilFor = (n, now = today()) => new Date(Date.parse(`${now}T00:00:00Z`) + (n - 1) * DAY_MS).toISOString().slice(0, 10);

/** Ended shows and run-out feature windows sit together: neither is in the slider. */
const isOver = (status) => status === "ended" || status === "expired";

/** The featured endpoint, every page of it. */
async function loadAllFeatured() {
  const all = [];
  for (let page = 1; page <= 20; page += 1) {
    const { data } = await getFeaturedExhibitionsPage({ page, limit: 100 });
    const rows = Array.isArray(data?.data) ? data.data : [];
    all.push(...rows);
    if (page >= (data?.totalPages || 1) || rows.length === 0) break;
  }
  const now = today();
  return all.map((d) => {
    const until = day(d.featured_until);
    const status = statusOf(d.starting_date, d.ending_date, now);
    return {
      id: String(d._id),
      name: d.exhibition_name || "Untitled exhibition",
      start: d.starting_date || null,
      end: d.ending_date || null,
      image: d.exhibtion_url || "",
      category: d.category || "",
      where: place(d.city, d.country),
      until,
      status: status !== "ended" && until && until < now ? "expired" : status,
    };
  });
}

export default function AdminFeaturedClient() {
  const [items, setItems] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [busy, setBusy] = useState(() => new Set());
  const [confirmId, setConfirmId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      setItems(await loadAllFeatured());
    } catch (err) {
      setLoadError(err?.response?.data?.message || "Could not load featured exhibitions.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { all: 0, live: 0, upcoming: 0, ended: 0 };
    for (const it of items || []) {
      c.all += 1;
      if (isOver(it.status)) c.ended += 1;
      else if (c[it.status] !== undefined) c[it.status] += 1;
    }
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items || [])
      .filter((it) => tab === "all" || it.status === tab || (tab === "ended" && isOver(it.status)))
      .filter((it) => !q || [it.name, it.where, it.category].some((f) => f.toLowerCase().includes(q)))
      // Live first, then upcoming soonest-first, then ended most-recent-first.
      .sort((a, b) => {
        const rank = { live: 0, upcoming: 1, undated: 2, expired: 3, ended: 4 };
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
        const cmp = String(a.start).localeCompare(String(b.start));
        return isOver(a.status) ? -cmp : cmp;
      });
  }, [items, tab, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const setBusyFor = (id, on) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  async function unfeature(it, { quiet = false } = {}) {
    setBusyFor(it.id, true);
    try {
      await unfeatureExhibition(it.id);
      refreshExhibitionPage(it.id, { featured: true });
      setItems((prev) => prev.filter((x) => x.id !== it.id));
      if (!quiet) toast.success(`"${it.name}" is no longer featured.`);
      return true;
    } catch {
      if (!quiet) toast.error("Could not remove it from featured. Please try again.");
      return false;
    } finally {
      setBusyFor(it.id, false);
      setConfirmId(null);
    }
  }

  async function clearEnded() {
    const ended = (items || []).filter((it) => isOver(it.status));
    if (!ended.length) return;
    setClearing(true);
    let done = 0;
    for (const it of ended) {
      // One at a time: a handful of requests, and a failure leaves the rest intact.
      if (await unfeature(it, { quiet: true })) done += 1;
    }
    setClearing(false);
    if (done === ended.length) toast.success(`Removed ${done} ${done === 1 ? "show" : "shows"} from featured.`);
    else toast.error(`Removed ${done} of ${ended.length}. Try again for the rest.`);
  }

  const onFeatured = useCallback(() => load(), [load]);
  const [durationId, setDurationId] = useState(null);

  async function changeDuration(it, days) {
    setBusyFor(it.id, true);
    try {
      await featureExhibition(it.id, days);
      refreshExhibitionPage(it.id, { featured: true });
      toast.success(`"${it.name}" is featured until ${fmtDay(untilFor(days))}.`);
      setDurationId(null);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not change the duration. Please try again.");
    } finally {
      setBusyFor(it.id, false);
    }
  }

  return (
    <AdminPage>
      <AdminHeader
        title="Featured exhibitions"
        description="The home page slider shows featured exhibitions that are live or upcoming, soonest first (up to 20), for the number of days you choose - never past the show's ending date. Ended shows and finished feature windows drop out of the slider automatically but stay listed here until you remove them."
        actions={
          <button type="button" onClick={() => setShowAdd((v) => !v)} className={btnPrimary} aria-expanded={showAdd}>
            {showAdd ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
            {showAdd ? "Close" : "Feature an exhibition"}
          </button>
        }
      />

      {showAdd && (
        <AddFeatured
          onFeatured={onFeatured}
          featuredIds={new Set((items || []).filter((i) => !isOver(i.status)).map((i) => i.id))}
        />
      )}

      <StatGrid>
        <StatCard icon={<Star size={16} />} tone="amber" label="Featured" value={items ? counts.all : undefined} />
        <StatCard icon={<Radio size={16} />} tone="emerald" label="Live now" value={items ? counts.live : undefined} />
        <StatCard icon={<CalendarClock size={16} />} tone="sky" label="Upcoming" value={items ? counts.upcoming : undefined} />
        <StatCard
          icon={<StarOff size={16} />}
          tone="rose"
          label="Ended / over"
          value={items ? counts.ended : undefined}
          hint={counts.ended ? "not shown in the slider" : items ? "none" : ""}
          warn={counts.ended > 0}
        />
      </StatGrid>

      {counts.ended > 0 && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200">
          <p>
            <strong className="font-semibold">
              {counts.ended} featured {counts.ended === 1 ? "show has" : "shows have"} ended or run out of featured days.
            </strong>{" "}
            They are no longer shown in the slider; remove them to keep this list tidy.
          </p>
          <button
            type="button"
            onClick={clearEnded}
            disabled={clearing}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60 dark:bg-amber-500 dark:text-gray-950 dark:hover:bg-amber-400"
          >
            {clearing ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <StarOff size={15} aria-hidden="true" />}
            {clearing ? "Removing…" : "Remove all ended"}
          </button>
        </div>
      )}

      {/* List */}
      <section className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm shadow-gray-900/[0.03] dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
        <div className="flex flex-col gap-3 border-b border-gray-200 bg-gradient-to-b from-gray-50/80 to-white px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between dark:border-gray-800 dark:from-white/[0.02] dark:to-transparent">
          <div role="tablist" aria-label="Filter by status" className="flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1 dark:bg-gray-800/70">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setTab(t.key);
                    setPage(1);
                  }}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
                    active
                      ? "bg-white text-[#131C55] shadow-sm dark:bg-gray-900 dark:text-white"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  {t.label}
                  <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${active ? "bg-[#2B3FB8]/10 text-[#2B3FB8] dark:bg-blue-400/15 dark:text-blue-300" : "bg-gray-200/80 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
                    {counts[t.key]}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative lg:w-72">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search featured shows"
              aria-label="Search featured shows"
              className={`${inputBase} pl-9`}
            />
          </div>
        </div>

        {loadError ? (
          <p className="px-5 py-12 text-center text-[15px] text-red-600 dark:text-red-400">
            {loadError}{" "}
            <button type="button" onClick={load} className="font-semibold underline underline-offset-2">
              Try again
            </button>
          </p>
        ) : items === null ? (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800" aria-label="Loading">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex gap-4 px-5 py-4">
                <div className="h-16 w-24 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                </div>
              </li>
            ))}
          </ul>
        ) : pageItems.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Star size={28} className="mx-auto text-gray-300 dark:text-gray-600" aria-hidden="true" />
            <p className="mt-3 text-[15px] font-semibold text-gray-900 dark:text-gray-100">
              {items.length === 0 ? "Nothing is featured yet" : "No featured shows match"}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {items.length === 0
                ? "Use “Feature an exhibition” above to pick shows for the home page."
                : "Try another filter or search."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {pageItems.map((it) => {
              const s = STATUS[it.status];
              const isBusy = busy.has(it.id);
              return (
                <li key={it.id} className="flex flex-col gap-3 px-4 py-4 transition hover:bg-gray-50/70 sm:flex-row sm:items-center sm:gap-4 sm:px-5 dark:hover:bg-white/[0.02]">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <Thumb src={it.image} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-gray-900 dark:text-gray-100" title={it.name}>
                          {it.name}
                        </p>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${s.tone}`}>
                          {s.label}
                        </span>
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-gray-600 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays size={13} aria-hidden="true" className="text-gray-400" />
                          {dateRange(it.start, it.end)}
                        </span>
                        {it.where ? (
                          <span className="inline-flex min-w-0 items-center gap-1">
                            <MapPin size={13} aria-hidden="true" className="shrink-0 text-gray-400" />
                            <span className="truncate">{it.where}</span>
                          </span>
                        ) : null}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <FeatureWindow it={it} />
                        {it.category ? <p className={`${pill} max-w-full truncate`}>{it.category}</p> : null}
                      </div>
                      {durationId === it.id ? (
                        <DurationPicker
                          start={it.start}
                          end={it.end}
                          busy={isBusy}
                          onConfirm={(n) => changeDuration(it, n)}
                          onCancel={() => setDurationId(null)}
                        />
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                    <Link href={exhibitionPath(it.name, it.id)} className={btnRow} target="_blank" rel="noopener">
                      View
                    </Link>
                    {it.status !== "ended" && it.status !== "undated" && confirmId !== it.id ? (
                      <button
                        type="button"
                        onClick={() => setDurationId((cur) => (cur === it.id ? null : it.id))}
                        disabled={isBusy || clearing}
                        className={btnRow}
                        aria-expanded={durationId === it.id}
                      >
                        <Hourglass size={14} aria-hidden="true" />
                        {it.status === "expired" ? "Feature again" : "Change days"}
                      </button>
                    ) : null}
                    {confirmId === it.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => unfeature(it)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                        >
                          {isBusy ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : null}
                          Unfeature
                        </button>
                        <button type="button" onClick={() => setConfirmId(null)} className={btnRow}>
                          Keep
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmId(it.id)}
                        disabled={isBusy || clearing}
                        className={btnRowDanger}
                        aria-label={`Remove ${it.name} from featured`}
                      >
                        <StarOff size={14} aria-hidden="true" />
                        Unfeature
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {items && filtered.length > 0 ? (
          <div className="border-t border-gray-100 py-2 dark:border-gray-800">
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              pageSizeOptions={[12, 24, 48]}
              itemLabel="featured shows"
            />
          </div>
        ) : null}
      </section>
    </AdminPage>
  );
}

/** "Featured until 3 Nov 2026 - 6 days left", or when the window ran out. */
function FeatureWindow({ it }) {
  if (it.status === "ended") return null;
  const now = today();
  let text;
  let tone = "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/25";
  if (!it.until) {
    text = "Featured until the show ends";
  } else if (it.until < now) {
    text = `Feature ended ${fmtDay(it.until)}`;
    tone = "bg-gray-100 text-gray-600 ring-gray-500/20 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-600/30";
  } else {
    const left = daysLeftOf(null, it.until, now);
    text = `Featured until ${fmtDay(it.until)} · ${left === 1 ? "last day" : `${left} days left`}`;
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${tone}`}>
      <Hourglass size={11} aria-hidden="true" />
      {text}
    </span>
  );
}

const chip = (on) =>
  `h-9 rounded-lg px-2.5 text-xs font-semibold ring-1 transition ${
    on
      ? "bg-[#2B3FB8] text-white ring-[#2B3FB8] dark:bg-blue-500 dark:ring-blue-500"
      : "bg-white text-gray-700 ring-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-800"
  }`;

/**
 * How many days to feature a show for. Today is day 1; the longest window ends
 * on the show's last day (and never beyond 365 days), and the confirm button
 * stays disabled for anything outside 1..max. The API checks the same rule.
 */
function DurationPicker({ start, end, busy, onConfirm, onCancel }) {
  const maxDays = Math.min(MAX_DAYS, daysLeftOf(start, end));
  const [value, setValue] = useState(() => String(Math.min(7, maxDays) || ""));
  const inputRef = useRef(null);
  const id = useId();

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  if (maxDays < 1) {
    return <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">This show has ended, so it cannot be featured.</p>;
  }

  const n = Number(value);
  const valid = value !== "" && Number.isInteger(n) && n >= 1 && n <= maxDays;
  const lastDay = fmtDay(day(end) || day(start));
  const hint =
    value === ""
      ? `Enter 1 to ${maxDays} days.`
      : !Number.isInteger(n) || n < 1
        ? "Use a whole number of days, at least 1."
        : n > maxDays
          ? `Too long - the show ends on ${lastDay}, so at most ${maxDays} ${maxDays === 1 ? "day" : "days"}.`
          : `In the slider until ${fmtDay(untilFor(n))}${n === maxDays ? " (the show's last day)" : ""}.`;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !busy) onConfirm(n);
      }}
      className="mt-3 rounded-xl border border-[#2B3FB8]/20 bg-white p-3 dark:border-blue-400/20 dark:bg-gray-950/40"
    >
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor={id} className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
            Feature for how many days?
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              ref={inputRef}
              id={id}
              type="number"
              inputMode="numeric"
              min={1}
              max={maxDays}
              step={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-invalid={value !== "" && !valid}
              aria-describedby={`${id}-hint`}
              className={`${inputBase} h-9 w-24 tabular-nums`}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">max {maxDays}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick choices">
          {PRESETS.filter((d) => d < maxDays).map((d) => (
            <button key={d} type="button" onClick={() => setValue(String(d))} aria-pressed={n === d} className={chip(n === d)}>
              {d} days
            </button>
          ))}
          <button type="button" onClick={() => setValue(String(maxDays))} aria-pressed={n === maxDays} className={chip(n === maxDays)}>
            Until it ends ({maxDays} {maxDays === 1 ? "day" : "days"})
          </button>
        </div>
      </div>
      <p
        id={`${id}-hint`}
        aria-live="polite"
        className={`mt-2 text-xs ${value !== "" && !valid ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}
      >
        {hint}
      </p>
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={!valid || busy} className={`${btnPrimary} h-9 px-3 text-[13px] disabled:opacity-50`}>
          {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Star size={14} aria-hidden="true" />}
          {valid ? `Feature for ${n} ${n === 1 ? "day" : "days"}` : "Feature"}
        </button>
        <button type="button" onClick={onCancel} className={btnRow}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Thumb({ src }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-[#131C55]/10 to-[#2B3FB8]/15 ring-1 ring-gray-200 dark:from-blue-400/10 dark:to-indigo-400/10 dark:ring-gray-800">
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- hotlinked hosts vary; a failed image falls back below
        <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" />
      ) : (
        <Star size={18} className="text-[#2B3FB8]/50 dark:text-blue-300/50" aria-hidden="true" />
      )}
    </div>
  );
}

/**
 * Search the whole catalogue and feature a show from the results. Uses the
 * public search route (/api/exhibitions/search), which already marks each
 * result's featured state.
 */
function AddFeatured({ onFeatured, featuredIds }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [pickingId, setPickingId] = useState(null);
  const [justAdded, setJustAdded] = useState(() => new Set());
  const inputRef = useRef(null);
  const reqRef = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(null);
      setSearching(false);
      return undefined;
    }
    const id = ++reqRef.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/exhibitions/search?scope=all&limit=12&search=${encodeURIComponent(term)}`);
        const data = await res.json();
        if (id === reqRef.current) setResults(Array.isArray(data?.items) ? data.items : []);
      } catch {
        if (id === reqRef.current) setResults([]);
      } finally {
        if (id === reqRef.current) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  async function feature(item, days) {
    setBusyId(item.id);
    try {
      await featureExhibition(item.id, days);
      refreshExhibitionPage(item.id, { featured: true });
      setJustAdded((prev) => new Set(prev).add(item.id));
      setPickingId(null);
      toast.success(`"${item.name}" is featured for ${days} ${days === 1 ? "day" : "days"}, until ${fmtDay(untilFor(days))}.`);
      onFeatured();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not feature it. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-[#2B3FB8]/20 bg-gradient-to-b from-[#2B3FB8]/[0.04] to-transparent p-4 sm:p-5 dark:border-blue-400/20 dark:from-blue-400/[0.06]">
      <label htmlFor="feature-search" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Find an exhibition to feature
      </label>
      <div className="relative mt-2">
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          id="feature-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name, city or category…"
          className={`${inputBase} pl-9`}
          autoComplete="off"
        />
        {searching ? (
          <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" aria-hidden="true" />
        ) : null}
      </div>

      {results === null ? (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Type at least 2 letters. Searches upcoming, live and past shows.</p>
      ) : results.length === 0 && !searching ? (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">No exhibitions match “{q.trim()}”.</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
          {results.map((r) => {
            const featured = r.isFeatured || featuredIds.has(r.id) || justAdded.has(r.id);
            const status = statusOf(r.startDate, r.endDate);
            const s = STATUS[status];
            return (
              <li key={r.id} className="px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100" title={r.name}>
                      {r.name}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {dateRange(r.startDate, r.endDate)}
                      {place(r.city, r.country) ? ` · ${place(r.city, r.country)}` : ""}
                      <span className={`ml-2 inline-flex rounded-full px-1.5 text-[10px] font-semibold ring-1 ${s.tone}`}>{s.label}</span>
                    </p>
                  </div>
                  {featured ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[13px] font-semibold text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/25">
                      <Star size={13} className="fill-current" aria-hidden="true" />
                      Featured
                    </span>
                  ) : status === "ended" || status === "undated" ? (
                    <span className="shrink-0 px-1 text-xs text-gray-500 dark:text-gray-400" title="Only live or upcoming shows can be featured">
                      Can’t feature
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPickingId((cur) => (cur === r.id ? null : r.id))}
                      aria-expanded={pickingId === r.id}
                      className={`${btnSecondary} h-8 shrink-0 px-3 text-[13px]`}
                    >
                      <Star size={13} aria-hidden="true" />
                      Feature
                    </button>
                  )}
                </div>
                {pickingId === r.id && !featured ? (
                  <DurationPicker
                    start={r.startDate}
                    end={r.endDate}
                    busy={busyId === r.id}
                    onConfirm={(n) => feature(r, n)}
                    onCancel={() => setPickingId(null)}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
