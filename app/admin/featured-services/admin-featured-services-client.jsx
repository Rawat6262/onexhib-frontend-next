"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BriefcaseBusiness, Hourglass, Loader2, MapPin, Plus, Radio, Search, Star, StarOff, TimerReset, X } from "lucide-react";

import {
  adminFeatureService,
  adminUnfeatureService,
  getAdminServicesPage,
  refreshFeaturedServices,
} from "@/models/service.model";
import TablePagination from "@/components/dashboard/TablePagination";
import { servicePath } from "@/lib/routes";
import { AdminHeader, AdminPage, StatCard, StatGrid } from "@/components/admin/AdminUI";
import { btnPrimary, btnRow, btnRowDanger, btnSecondary, inputBase, pill } from "@/components/dashboard/ui";
import {
  FeaturedBadge,
  ServiceFeaturePanel,
  daysLeftOf,
  featuredNow,
  fmtDay,
  isoDay,
  untilFor,
} from "@/components/admin/ServiceFeature";

/**
 * Admin: every featured service provider in one place - the services
 * counterpart of the Featured exhibitions page (app/admin/featured).
 *
 * Featured providers feed the "Featured services" slider on the home page,
 * directly under the featured exhibitions slider. This page lists them, says
 * which are ending soon and which have run out (they leave the slider by
 * themselves but stay featured here until removed), and features new ones by
 * search without leaving the page.
 *
 * DURATION. Featuring asks for a number of days (today is day 1, at most 365);
 * a listing has no end date of its own, so there is no "until it ends". The
 * API checks the same rule (serviceFeatureWindow in the backend).
 *
 * Every change asks the home page to drop its cached list straight away.
 */

const ENDING_SOON_DAYS = 7;

const STATUS = {
  live: { label: "On home page", tone: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25" },
  ending: { label: "Ending soon", tone: "bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/25" },
  expired: { label: "Feature over", tone: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/25" },
};

const TABS = [
  { key: "all", label: "All" },
  { key: "live", label: "On home page" },
  { key: "ending", label: `Ending in ${ENDING_SOON_DAYS} days` },
  { key: "expired", label: "Feature over" },
];

const place = (...parts) => parts.filter(Boolean).join(", ");

function statusOf(r) {
  if (!featuredNow(r)) return "expired";
  return daysLeftOf(r.featured_until) <= ENDING_SOON_DAYS ? "ending" : "live";
}

/** A row from /api/admin/services, shaped for this page. */
function toItem(r) {
  return {
    id: String(r._id),
    name: r.full_name || "Service provider",
    category: r.service_name || "",
    subcategory: r.service_subcategory && r.service_subcategory !== "General" ? r.service_subcategory : "",
    where: place(r.city, r.country),
    image: r.image || "",
    is_featured: Boolean(r.is_featured),
    featured_until: r.featured_until || null,
    status: statusOf(r),
  };
}

/** Every featured listing, run-out windows included. Paged at the API's 100 cap. */
async function loadAllFeatured() {
  const all = [];
  for (let page = 1; page <= 20; page += 1) {
    const { data } = await getAdminServicesPage({ featured: "yes", page, limit: 100, stats: "0" });
    const rows = Array.isArray(data?.data) ? data.data : [];
    all.push(...rows);
    if (page >= (data?.totalPages || 1) || rows.length === 0) break;
  }
  return all.map(toItem);
}

export default function AdminFeaturedServicesClient() {
  const [items, setItems] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [busy, setBusy] = useState(() => new Set());
  const [confirmId, setConfirmId] = useState(null);
  const [durationId, setDurationId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      setItems(await loadAllFeatured());
    } catch (err) {
      setLoadError(err?.response?.data?.message || "Could not load featured services.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { all: 0, live: 0, ending: 0, expired: 0 };
    for (const it of items || []) {
      c.all += 1;
      c[it.status] += 1;
    }
    // "On home page" counts everything still in its window, ending soon included.
    c.live += c.ending;
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items || [])
      .filter((it) => tab === "all" || it.status === tab || (tab === "live" && it.status === "ending"))
      .filter((it) => !q || [it.name, it.where, it.category, it.subcategory].some((f) => f.toLowerCase().includes(q)))
      // On the home page first, the soonest to end at the top; run-out ones last, most recent first.
      .sort((a, b) => {
        const overA = a.status === "expired";
        const overB = b.status === "expired";
        if (overA !== overB) return overA ? 1 : -1;
        const cmp = isoDay(a.featured_until).localeCompare(isoDay(b.featured_until));
        return overA ? -cmp : cmp;
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
      await adminUnfeatureService(it.id);
      setItems((prev) => prev.filter((x) => x.id !== it.id));
      if (!quiet) {
        refreshFeaturedServices();
        toast.success(`"${it.name}" is no longer featured.`);
      }
      return true;
    } catch {
      if (!quiet) toast.error("Could not remove it from featured. Please try again.");
      return false;
    } finally {
      setBusyFor(it.id, false);
      setConfirmId(null);
    }
  }

  async function clearExpired() {
    const over = (items || []).filter((it) => it.status === "expired");
    if (!over.length) return;
    setClearing(true);
    let done = 0;
    for (const it of over) {
      // One at a time: a handful of requests, and a failure leaves the rest intact.
      if (await unfeature(it, { quiet: true })) done += 1;
    }
    setClearing(false);
    refreshFeaturedServices();
    if (done === over.length) toast.success(`Removed ${done} ${done === 1 ? "listing" : "listings"} from featured.`);
    else toast.error(`Removed ${done} of ${over.length}. Try again for the rest.`);
  }

  async function changeDuration(it, days) {
    setBusyFor(it.id, true);
    try {
      await adminFeatureService(it.id, days);
      refreshFeaturedServices();
      toast.success(`"${it.name}" is featured until ${fmtDay(untilFor(days))}.`);
      setDurationId(null);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not change the duration. Please try again.");
    } finally {
      setBusyFor(it.id, false);
    }
  }

  const onFeatured = useCallback(() => load(), [load]);

  return (
    <AdminPage>
      <AdminHeader
        title="Featured services"
        description="The home page shows featured service providers in a slider directly under the featured exhibitions, for the number of days you choose (up to 365). When a feature runs out the provider leaves the slider automatically but stays listed here until you remove it or feature it again."
        actions={
          <button type="button" onClick={() => setShowAdd((v) => !v)} className={btnPrimary} aria-expanded={showAdd}>
            {showAdd ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
            {showAdd ? "Close" : "Feature a service"}
          </button>
        }
      />

      {showAdd && <AddFeatured onFeatured={onFeatured} />}

      <StatGrid>
        <StatCard icon={<Star size={16} />} tone="amber" label="Featured" value={items ? counts.all : undefined} />
        <StatCard icon={<Radio size={16} />} tone="emerald" label="Live" value={items ? counts.live : undefined} hint="on the home page" />
        <StatCard
          icon={<TimerReset size={16} />}
          tone="sky"
          label="Ending soon"
          value={items ? counts.ending : undefined}
          hint={`within ${ENDING_SOON_DAYS} days`}
        />
        <StatCard
          icon={<StarOff size={16} />}
          tone="rose"
          label="Over"
          value={items ? counts.expired : undefined}
          hint={counts.expired ? "not on the home page" : items ? "none" : ""}
          warn={counts.expired > 0}
        />
      </StatGrid>

      {counts.expired > 0 && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200">
          <p>
            <strong className="font-semibold">
              {counts.expired} featured {counts.expired === 1 ? "listing has" : "listings have"} run out of featured days.
            </strong>{" "}
            They are no longer on the home page; remove them to keep this list tidy.
          </p>
          <button
            type="button"
            onClick={clearExpired}
            disabled={clearing}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60 dark:bg-amber-500 dark:text-gray-950 dark:hover:bg-amber-400"
          >
            {clearing ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <StarOff size={15} aria-hidden="true" />}
            {clearing ? "Removing…" : "Remove all finished"}
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
                      ? "bg-white text-ox-navy shadow-sm dark:bg-gray-900 dark:text-white"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  {t.label}
                  <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${active ? "bg-ox-blue/10 text-ox-blue dark:bg-blue-400/15 dark:text-blue-300" : "bg-gray-200/80 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
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
              placeholder="Search featured services"
              aria-label="Search featured services"
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
              {items.length === 0 ? "No service is featured yet" : "No featured services match"}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {items.length === 0
                ? "Use “Feature a service” above to pick providers for the home page."
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
                        {it.subcategory ? (
                          <span className="inline-flex items-center gap-1">
                            <BriefcaseBusiness size={13} aria-hidden="true" className="text-gray-400" />
                            {it.subcategory}
                          </span>
                        ) : null}
                        {it.where ? (
                          <span className="inline-flex min-w-0 items-center gap-1">
                            <MapPin size={13} aria-hidden="true" className="shrink-0 text-gray-400" />
                            <span className="truncate">{it.where}</span>
                          </span>
                        ) : null}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <FeaturedBadge r={it} className="" />
                        {it.category ? <p className={`${pill} max-w-full truncate`}>{it.category}</p> : null}
                      </div>
                      {durationId === it.id ? (
                        <ServiceFeaturePanel
                          r={it}
                          busy={isBusy}
                          allowUnfeature={false}
                          onFeature={(n) => changeDuration(it, n)}
                          onCancel={() => setDurationId(null)}
                        />
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    <Link href={servicePath(it.name, it.id)} className={btnRow} target="_blank" rel="noopener">
                      View
                    </Link>
                    {confirmId !== it.id ? (
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
              itemLabel="featured services"
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
    <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-ox-navy/10 to-ox-blue/15 ring-1 ring-gray-200 dark:from-blue-400/10 dark:to-indigo-400/10 dark:ring-gray-800">
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- provider uploads; a failed image falls back below
        <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" />
      ) : (
        <BriefcaseBusiness size={18} className="text-ox-blue/50 dark:text-blue-300/50" aria-hidden="true" />
      )}
    </div>
  );
}

/**
 * Search every service listing and feature one from the results. Uses the
 * admin services list (/api/admin/services), which carries each listing's
 * featured state.
 */
function AddFeatured({ onFeatured }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [pickingId, setPickingId] = useState(null);
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
        const { data } = await getAdminServicesPage({ search: term, limit: 12, stats: "0" });
        if (id === reqRef.current) setResults(Array.isArray(data?.data) ? data.data.map(toItem) : []);
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
      const { data } = await adminFeatureService(item.id, days);
      refreshFeaturedServices();
      const until = data?.data?.featured_until || untilFor(days);
      const patch = { is_featured: true, featured_until: until };
      setResults((prev) => (prev || []).map((r) => (r.id === item.id ? { ...r, ...patch, status: statusOf(patch) } : r)));
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
    <div className="mt-6 rounded-2xl border border-ox-blue/20 bg-gradient-to-b from-ox-blue/[0.04] to-transparent p-4 sm:p-5 dark:border-blue-400/20 dark:from-blue-400/[0.06]">
      <label htmlFor="feature-service-search" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Find a service provider to feature
      </label>
      <div className="relative mt-2">
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          id="feature-service-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Business name, city, country or speciality…"
          className={`${inputBase} pl-9`}
          autoComplete="off"
        />
        {searching ? (
          <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" aria-hidden="true" />
        ) : null}
      </div>

      {results === null ? (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Type at least 2 letters.</p>
      ) : results.length === 0 && !searching ? (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">No service listings match “{q.trim()}”.</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
          {results.map((r) => {
            const featured = featuredNow(r);
            return (
              <li key={r.id} className="px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100" title={r.name}>
                      {r.name}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {[r.category, r.where].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {featured ? (
                    <span
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[13px] font-semibold text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/25"
                      title={`Until ${fmtDay(r.featured_until)}`}
                    >
                      <Star size={13} className="fill-current" aria-hidden="true" />
                      Featured
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPickingId((cur) => (cur === r.id ? null : r.id))}
                      aria-expanded={pickingId === r.id}
                      className={`${btnSecondary} h-8 shrink-0 px-3 text-[13px]`}
                    >
                      <Star size={13} aria-hidden="true" />
                      {r.is_featured ? "Feature again" : "Feature"}
                    </button>
                  )}
                </div>
                {pickingId === r.id && !featured ? (
                  <ServiceFeaturePanel
                    r={r}
                    busy={busyId === r.id}
                    allowUnfeature={false}
                    onFeature={(n) => feature(r, n)}
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
