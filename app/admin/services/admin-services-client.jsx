"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BriefcaseBusiness,
  CalendarPlus,
  Loader2,
  MapPin,
  PhoneCall,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { adminDeleteService, getAdminServicesPage } from "@/models/service.model";
import TablePagination from "@/components/dashboard/TablePagination";
import { AdminHeader, AdminPage, StatCard, StatGrid } from "@/components/admin/AdminUI";
import { btnRow, btnRowDanger, inputBase, pill } from "@/components/dashboard/ui";
import { servicePath } from "@/lib/routes";

/**
 * Admin: every exhibition-service listing - who added it, when, where, and how
 * often exhibitors opened its contact details (the closest thing to a lead the
 * platform records). Before this page an admin could not see services at all:
 * the public directory has no owners, and each provider sees only their own.
 *
 * Everything is filtered and paged on the server (/api/admin/services); the
 * summary cards and the two breakdowns describe the whole catalogue, not the
 * current filter, so they stay put while you narrow the table.
 */

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "leads", label: "Most contacted" },
  { value: "name", label: "Name A–Z" },
];

const ROLE_LABELS = {
  EXHIBITION_SERVICE: "Service provider",
  ORGANISER: "Organiser",
  Exhibitor: "Exhibitor",
  VISITOR: "Visitor",
  ADMIN: "Admin",
};

const selectCls = `${inputBase} pr-8`;

function fmtDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function ago(v) {
  if (!v) return "";
  const days = Math.floor((Date.now() - new Date(v).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months} mo ago` : `${Math.floor(months / 12)} yr ago`;
}

const place = (r) => [r.city, r.country].filter(Boolean).join(", ");

export default function AdminServicesClient() {
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [owner, setOwner] = useState(null); // { id, name } | { id: "none", name } | null
  const [leadsOnly, setLeadsOnly] = useState(false);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [confirmId, setConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const reqRef = useRef(0);
  const haveStats = useRef(false);

  // Debounce the search box into the query.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    const id = ++reqRef.current;
    setError("");
    try {
      const { data } = await getAdminServicesPage({
        page,
        limit: pageSize,
        sort,
        ...(search ? { search } : {}),
        ...(category ? { category } : {}),
        ...(country ? { country } : {}),
        ...(owner ? { owner: owner.id } : {}),
        ...(leadsOnly ? { leads: "yes" } : {}),
        // The catalogue stats do not change with the filters; fetch them once.
        ...(haveStats.current ? { stats: "0" } : {}),
      });
      if (id !== reqRef.current) return;
      setRows(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (data.stats) {
        setStats(data.stats);
        haveStats.current = true;
      }
      if (Array.isArray(data.categories)) setCategories(data.categories);
    } catch (err) {
      if (id !== reqRef.current) return;
      setError(err?.response?.data?.message || "Could not load services.");
    }
  }, [page, pageSize, sort, search, category, country, owner, leadsOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshStats = () => {
    haveStats.current = false;
    load();
  };

  const filtersOn = Boolean(search || category || country || owner || leadsOnly);
  const clearAll = () => {
    setSearchInput("");
    setSearch("");
    setCategory("");
    setCountry("");
    setOwner(null);
    setLeadsOnly(false);
    setPage(1);
  };
  const apply = (fn) => {
    fn();
    setPage(1);
  };

  async function remove(r) {
    setDeletingId(r._id);
    try {
      await adminDeleteService(r._id);
      toast.success(`"${r.full_name}" was removed from the directory.`);
      setConfirmId(null);
      refreshStats();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete this listing.");
    } finally {
      setDeletingId(null);
    }
  }

  const maxCat = Math.max(1, ...(stats?.byCategory || []).map((c) => c.count));

  return (
    <AdminPage>
      <AdminHeader
        title="Exhibition services"
        description="Every service provider listing: who added it, when, where, and how often exhibitors have opened its contact details."
      />

      <StatGrid>
        <StatCard icon={<BriefcaseBusiness size={16} />} tone="emerald" label="Listings" value={error && !stats ? null : stats?.total} />
        <StatCard icon={<Users size={16} />} label="Providers" value={error && !stats ? null : stats?.providers} hint="accounts with a listing" />
        <StatCard
          icon={<CalendarPlus size={16} />}
          tone="sky"
          label="Added this week"
          value={error && !stats ? null : stats?.last7}
          hint={stats ? `${stats.last30} in the last 30 days` : ""}
        />
        <StatCard
          icon={<PhoneCall size={16} />}
          tone="violet"
          label="Contact requests"
          value={error && !stats ? null : stats?.contactViews}
          hint="contact details opened"
        />
      </StatGrid>

      {/* Breakdowns */}
      {stats ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:col-span-3 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Listings by category</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Click a category to filter the table.</p>
            <ul className="mt-4 space-y-2">
              {stats.byCategory.slice(0, 8).map((c) => {
                const active = category === c.name;
                return (
                  <li key={c.name}>
                    <button
                      type="button"
                      onClick={() => apply(() => setCategory(active ? "" : c.name))}
                      aria-pressed={active}
                      className={`group grid w-full grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3 rounded-lg px-1.5 py-1 text-left text-[13px] transition sm:grid-cols-[minmax(0,14rem)_1fr_auto] ${
                        active ? "bg-[#2B3FB8]/10 dark:bg-blue-400/15" : "hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                      }`}
                    >
                      <span className={`truncate ${active ? "font-semibold text-[#2B3FB8] dark:text-blue-300" : "text-gray-700 dark:text-gray-300"}`}>
                        {c.name}
                      </span>
                      <span className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-[#131C55] to-[#2B3FB8] dark:from-blue-500 dark:to-indigo-400"
                          style={{ width: `${Math.max(3, (c.count / maxCat) * 100)}%` }}
                        />
                      </span>
                      <span className="w-10 text-right font-semibold tabular-nums text-gray-900 dark:text-gray-100">{c.count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {stats.byCategory.length > 8 ? (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                +{stats.byCategory.length - 8} more categories — use the category filter below.
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:col-span-2 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Top countries</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Click to filter.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {stats.topCountries.map((c) => {
                const active = country.toLowerCase() === c.name.toLowerCase();
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => apply(() => setCountry(active ? "" : c.name))}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition ${
                      active
                        ? "border-[#2B3FB8] bg-[#2B3FB8] text-white dark:border-blue-400 dark:bg-blue-500"
                        : "border-gray-200 text-gray-700 hover:border-[#2B3FB8]/50 hover:text-[#2B3FB8] dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-400/60 dark:hover:text-blue-300"
                    }`}
                  >
                    {c.name}
                    <span className={`tabular-nums text-[11px] ${active ? "text-white/80" : "text-gray-400"}`}>{c.count}</span>
                  </button>
                );
              })}
            </div>
            {stats.unowned > 0 ? (
              <button
                type="button"
                onClick={() => apply(() => setOwner(owner?.id === "none" ? null : { id: "none", name: "No owner" }))}
                className="mt-5 block text-left text-xs text-gray-500 underline-offset-2 hover:text-[#2B3FB8] hover:underline dark:text-gray-400 dark:hover:text-blue-300"
              >
                {stats.unowned} older {stats.unowned === 1 ? "listing has" : "listings have"} no owner account (added
                before ownership was recorded). Show them
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Table */}
      <section className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm shadow-gray-900/[0.03] dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
        <div className="space-y-3 border-b border-gray-200 bg-gradient-to-b from-gray-50/80 to-white px-4 py-4 sm:px-5 dark:border-gray-800 dark:from-white/[0.02] dark:to-transparent">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_0.8fr_auto]">
            <div className="relative">
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search business, city, country, speciality"
                aria-label="Search services"
                className={`${inputBase} pl-9`}
              />
            </div>
            <select value={category} onChange={(e) => apply(() => setCategory(e.target.value))} aria-label="Category" className={selectCls}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select value={sort} onChange={(e) => apply(() => setSort(e.target.value))} aria-label="Sort" className={selectCls}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border border-gray-300 px-3 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={leadsOnly}
                onChange={(e) => apply(() => setLeadsOnly(e.target.checked))}
                className="h-4 w-4 accent-[#2B3FB8]"
              />
              Contacted only
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {rows === null ? "Loading…" : `${total.toLocaleString("en-US")} ${total === 1 ? "listing" : "listings"}`}
            </span>
            {country ? <FilterChip label={`Country: ${country}`} onClear={() => apply(() => setCountry(""))} /> : null}
            {owner ? <FilterChip label={`Added by: ${owner.name}`} onClear={() => apply(() => setOwner(null))} /> : null}
            {filtersOn ? (
              <button type="button" onClick={clearAll} className="ml-1 font-medium text-[#2B3FB8] hover:underline dark:text-blue-300">
                Clear all
              </button>
            ) : null}
          </div>
        </div>

        {error ? (
          <p className="px-5 py-12 text-center text-[15px] text-red-600 dark:text-red-400">
            {error}{" "}
            <button type="button" onClick={load} className="font-semibold underline underline-offset-2">
              Try again
            </button>
          </p>
        ) : rows === null ? (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800" aria-label="Loading">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex gap-4 px-5 py-4">
                <div className="h-11 w-11 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                </div>
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <BriefcaseBusiness size={28} className="mx-auto text-gray-300 dark:text-gray-600" aria-hidden="true" />
            <p className="mt-3 text-[15px] font-semibold text-gray-900 dark:text-gray-100">No listings match</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try another search or clear the filters.</p>
          </div>
        ) : (
          <>
            {/* Table — lg and up */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400">
                    <th scope="col" className="px-5 py-3 font-semibold">Provider</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Category</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Added by</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Added</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Contacts</th>
                    <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rows.map((r) => (
                    <tr key={r._id} className="align-top transition hover:bg-gray-50/70 dark:hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5">
                        <ProviderCell r={r} />
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => apply(() => setCategory(r.service_name))}
                          className="text-left text-[13px] font-medium text-gray-800 hover:text-[#2B3FB8] hover:underline dark:text-gray-200 dark:hover:text-blue-300"
                          title="Filter by this category"
                        >
                          {r.service_name}
                        </button>
                        {r.service_subcategory && r.service_subcategory !== "General" ? (
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{r.service_subcategory}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5">
                        <OwnerCell owner={r.owner} onPick={(o) => apply(() => setOwner(o))} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-[13px] text-gray-700 dark:text-gray-300">
                        {fmtDate(r.createdAt)}
                        <p className="text-xs text-gray-400">{ago(r.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Leads r={r} />
                      </td>
                      <td className="px-5 py-3.5">
                        <Actions
                          r={r}
                          confirming={confirmId === r._id}
                          deleting={deletingId === r._id}
                          onAsk={() => setConfirmId(r._id)}
                          onCancel={() => setConfirmId(null)}
                          onDelete={() => remove(r)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards — below lg */}
            <ul className="divide-y divide-gray-100 lg:hidden dark:divide-gray-800">
              {rows.map((r) => (
                <li key={r._id} className="space-y-3 px-4 py-4 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <ProviderCell r={r} />
                    <Leads r={r} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={pill}>{r.service_name}</span>
                    {r.service_subcategory && r.service_subcategory !== "General" ? (
                      <span className="text-xs text-gray-500 dark:text-gray-400">{r.service_subcategory}</span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0 text-[13px]">
                      <OwnerCell owner={r.owner} onPick={(o) => apply(() => setOwner(o))} />
                      <p className="mt-1 text-xs text-gray-400">Added {fmtDate(r.createdAt)} · {ago(r.createdAt)}</p>
                    </div>
                    <Actions
                      r={r}
                      confirming={confirmId === r._id}
                      deleting={deletingId === r._id}
                      onAsk={() => setConfirmId(r._id)}
                      onCancel={() => setConfirmId(null)}
                      onDelete={() => remove(r)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {rows && total > 0 ? (
          <div className="border-t border-gray-100 py-2 dark:border-gray-800">
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
              shownCount={rows.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              pageSizeOptions={[25, 50, 100]}
              itemLabel="listings"
            />
          </div>
        ) : null}
      </section>
    </AdminPage>
  );
}

function FilterChip({ label, onClear }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#2B3FB8]/10 py-0.5 pl-2.5 pr-1 font-medium text-[#2B3FB8] dark:bg-blue-400/15 dark:text-blue-300">
      {label}
      <button type="button" onClick={onClear} aria-label={`Remove filter ${label}`} className="rounded-full p-0.5 hover:bg-[#2B3FB8]/15">
        <X size={12} aria-hidden="true" />
      </button>
    </span>
  );
}

function ProviderCell({ r }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#131C55]/10 to-[#2B3FB8]/15 ring-1 ring-gray-200 dark:from-blue-400/10 dark:to-indigo-400/10 dark:ring-gray-800">
        {r.image && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element -- provider uploads; failures fall back below
          <img src={r.image} alt="" loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" />
        ) : (
          <BriefcaseBusiness size={18} className="text-[#2B3FB8]/60 dark:text-blue-300/60" aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0">
        <p className="truncate font-semibold text-gray-900 dark:text-gray-100" title={r.full_name}>
          {r.full_name}
        </p>
        {place(r) ? (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-500 dark:text-gray-400">
            <MapPin size={12} aria-hidden="true" className="shrink-0" />
            {place(r)}
          </p>
        ) : null}
        {r.mobile_number ? <p className="mt-0.5 text-xs tabular-nums text-gray-400">{r.mobile_number}</p> : null}
      </div>
    </div>
  );
}

function OwnerCell({ owner, onPick }) {
  if (!owner) {
    return <span className="text-[13px] italic text-gray-400">No owner account</span>;
  }
  if (!owner.email) {
    return <span className="text-[13px] italic text-gray-400">{owner.name}</span>;
  }
  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => onPick({ id: owner._id, name: owner.name })}
        className="inline-flex max-w-full items-center gap-1.5 text-left text-[13px] font-medium text-gray-800 hover:text-[#2B3FB8] hover:underline dark:text-gray-200 dark:hover:text-blue-300"
        title="Show everything this person added"
      >
        <UserRound size={13} aria-hidden="true" className="shrink-0 text-gray-400" />
        <span className="truncate">{owner.name}</span>
      </button>
      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{owner.email}</p>
      {owner.designation ? (
        <span className="mt-1 inline-block rounded-full bg-gray-100 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          {ROLE_LABELS[owner.designation] || owner.designation}
        </span>
      ) : null}
    </div>
  );
}

function Leads({ r }) {
  const n = r.contact_views || 0;
  return (
    <div className="shrink-0 text-right" title={r.last_contacted_at ? `Last opened ${fmtDate(r.last_contacted_at)}` : "Nobody has opened the contact details yet"}>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums ${
          n > 0
            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25"
            : "text-gray-400"
        }`}
      >
        <PhoneCall size={11} aria-hidden="true" />
        {n}
      </span>
      {r.last_contacted_at ? <p className="mt-0.5 text-[11px] text-gray-400">{ago(r.last_contacted_at)}</p> : null}
    </div>
  );
}

function Actions({ r, confirming, deleting, onAsk, onCancel, onDelete }) {
  return (
    <div className="flex shrink-0 items-center justify-end gap-2">
      <Link href={servicePath(r.full_name, r._id)} target="_blank" rel="noopener" className={btnRow}>
        View
      </Link>
      {confirming ? (
        <>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {deleting ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : null}
            Delete
          </button>
          <button type="button" onClick={onCancel} className={btnRow}>
            Keep
          </button>
        </>
      ) : (
        <button type="button" onClick={onAsk} className={btnRowDanger} aria-label={`Delete ${r.full_name}`}>
          <Trash2 size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
