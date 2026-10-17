"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CalendarClock,
  CalendarDays,
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
 */

const STATUS = {
  live: { label: "Live now", tone: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25" },
  upcoming: { label: "Upcoming", tone: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/25" },
  ended: { label: "Ended", tone: "bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/25" },
  undated: { label: "No dates", tone: "bg-gray-100 text-gray-600 ring-gray-500/20 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-600/30" },
};

const TABS = [
  { key: "all", label: "All" },
  { key: "live", label: "Live now" },
  { key: "upcoming", label: "Upcoming" },
  { key: "ended", label: "Ended" },
];

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

/** The featured endpoint, every page of it. */
async function loadAllFeatured() {
  const all = [];
  for (let page = 1; page <= 20; page += 1) {
    const { data } = await getFeaturedExhibitionsPage({ page, limit: 100 });
    const rows = Array.isArray(data?.data) ? data.data : [];
    all.push(...rows);
    if (page >= (data?.totalPages || 1) || rows.length === 0) break;
  }
  return all.map((d) => ({
    id: String(d._id),
    name: d.exhibition_name || "Untitled exhibition",
    start: d.starting_date || null,
    end: d.ending_date || null,
    image: d.exhibtion_url || "",
    category: d.category || "",
    where: place(d.city, d.country),
    status: statusOf(d.starting_date, d.ending_date),
  }));
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
      if (c[it.status] !== undefined) c[it.status] += 1;
    }
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items || [])
      .filter((it) => tab === "all" || it.status === tab)
      .filter((it) => !q || [it.name, it.where, it.category].some((f) => f.toLowerCase().includes(q)))
      // Live first, then upcoming soonest-first, then ended most-recent-first.
      .sort((a, b) => {
        const rank = { live: 0, upcoming: 1, undated: 2, ended: 3 };
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
        const cmp = String(a.start).localeCompare(String(b.start));
        return a.status === "ended" ? -cmp : cmp;
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
    const ended = (items || []).filter((it) => it.status === "ended");
    if (!ended.length) return;
    setClearing(true);
    let done = 0;
    for (const it of ended) {
      // One at a time: a handful of requests, and a failure leaves the rest intact.
      if (await unfeature(it, { quiet: true })) done += 1;
    }
    setClearing(false);
    if (done === ended.length) toast.success(`Removed ${done} ended ${done === 1 ? "show" : "shows"} from featured.`);
    else toast.error(`Removed ${done} of ${ended.length}. Try again for the rest.`);
  }

  const onFeatured = useCallback(() => load(), [load]);

  return (
    <AdminPage>
      <AdminHeader
        title="Featured exhibitions"
        description="The home page slider shows featured exhibitions that are live or upcoming, soonest first (up to 20). Ended shows drop out of the slider automatically but stay featured here until you remove them."
        actions={
          <button type="button" onClick={() => setShowAdd((v) => !v)} className={btnPrimary} aria-expanded={showAdd}>
            {showAdd ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
            {showAdd ? "Close" : "Feature an exhibition"}
          </button>
        }
      />

      {showAdd && <AddFeatured onFeatured={onFeatured} featuredIds={new Set((items || []).map((i) => i.id))} />}

      <StatGrid>
        <StatCard icon={<Star size={16} />} tone="amber" label="Featured" value={items ? counts.all : undefined} />
        <StatCard icon={<Radio size={16} />} tone="emerald" label="Live now" value={items ? counts.live : undefined} />
        <StatCard icon={<CalendarClock size={16} />} tone="sky" label="Upcoming" value={items ? counts.upcoming : undefined} />
        <StatCard
          icon={<StarOff size={16} />}
          tone="rose"
          label="Ended"
          value={items ? counts.ended : undefined}
          hint={counts.ended ? "not shown in the slider" : items ? "none" : ""}
          warn={counts.ended > 0}
        />
      </StatGrid>

      {counts.ended > 0 && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200">
          <p>
            <strong className="font-semibold">
              {counts.ended} featured {counts.ended === 1 ? "show has" : "shows have"} already ended.
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
                      {it.category ? <p className={`${pill} mt-2 max-w-full truncate`}>{it.category}</p> : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                    <Link href={exhibitionPath(it.name, it.id)} className={btnRow} target="_blank" rel="noopener">
                      View
                    </Link>
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

  async function feature(item) {
    setBusyId(item.id);
    try {
      await featureExhibition(item.id);
      refreshExhibitionPage(item.id, { featured: true });
      setJustAdded((prev) => new Set(prev).add(item.id));
      toast.success(`"${item.name}" is now featured.`);
      onFeatured();
    } catch {
      toast.error("Could not feature it. Please try again.");
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
            const s = STATUS[statusOf(r.startDate, r.endDate)];
            return (
              <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
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
                ) : (
                  <button
                    type="button"
                    onClick={() => feature(r)}
                    disabled={busyId === r.id}
                    className={`${btnSecondary} h-8 shrink-0 px-3 text-[13px]`}
                  >
                    {busyId === r.id ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Star size={13} aria-hidden="true" />}
                    Feature
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
