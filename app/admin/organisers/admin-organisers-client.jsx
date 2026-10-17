"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  CalendarDays,
  CalendarRange,
  Eye,
  KeyRound,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Plus,
  Star,
  X,
} from "lucide-react";

import {
  featureExhibition,
  getAdminExhibitionsPage,
  getExhibitionsByMonthYear,
  refreshExhibitionPage,
  unfeatureExhibition,
} from "@/models/exhibition.model";
import TablePagination from "@/components/dashboard/TablePagination";
import {
  AdminHeader,
  AdminPage,
  Badge,
  EmptyState,
  LoadingRows,
  Panel,
  SearchField,
  StatCard,
  StatGrid,
  adminSelect,
  btnPrimary,
  btnRow,
  fmtDate,
  tbody,
  td,
  th,
  thead,
  tr,
} from "@/components/admin/AdminUI";

// Modals are only needed once opened, so their code (and for the location
// forms, country-state-city's ~2.3 MB dataset) is split out of this page's
// first-load bundle.
const ExhibitionPopupForm = dynamic(() => import("@/components/popups/ExhibitionPopupForm"), { ssr: false });
const ExhibitionEditPopup = dynamic(() => import("@/components/popups/OrganiserEditPopup"), { ssr: false });
const ExhibitionAccessDialog = dynamic(() => import("@/components/admin/ExhibitionAccessDialog"), { ssr: false });

/**
 * Admin: every exhibition. (The URL is /admin/organisers for old bookmarks; the
 * page has always listed exhibitions, under a leftover "SEM GROUP" title.)
 *
 * THREE WAYS TO NARROW THE LIST
 *  - nothing: the admin listing, newest first, paged on the server;
 *  - month + year: the monthly endpoint, paged on the server;
 *  - search: the catalogue-wide search (/api/exhibitions/search, the same one
 *    the public site uses), top 24 matches across upcoming, live and past.
 *    It replaced "Search this page", which only filtered the 50 rows already
 *    loaded and so missed almost everything. Search results carry no "added
 *    by" - that route never exposes contact data.
 */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - 2 + i);
const SEARCH_LIMIT = 24;

const day = (v) => (v ? String(v).slice(0, 10) : "");
function statusOf(start, end) {
  const now = new Date().toISOString().slice(0, 10);
  const s = day(start);
  const e = day(end) || s;
  if (!s) return null;
  if (e < now) return { label: "Ended", tone: "gray" };
  if (s > now) return { label: "Upcoming", tone: "sky" };
  return { label: "Live", tone: "emerald" };
}

function dateRange(a, b) {
  if (!a) return "Dates not set";
  const from = fmtDate(a);
  const to = b ? fmtDate(b) : "";
  return to && to !== from ? `${from} – ${to}` : from;
}

/** Search results arrive in the public shape; map them onto the admin row. */
const fromSearch = (e) => ({
  _id: e.id,
  exhibition_name: e.name,
  exhibition_address: [e.venue, e.city, e.country].filter(Boolean).join(", "),
  category: e.category,
  starting_date: e.startDate,
  ending_date: e.endDate,
  is_featured: e.isFeatured,
  addedBy: null,
});

export default function AdminOrganisersClient() {
  const [rows, setRows] = useState(null);
  const [counts, setCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const monthActive = Boolean(month && year);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const searching = search.length >= 2;

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [accessFor, setAccessFor] = useState(null);
  const [featuringIds, setFeaturingIds] = useState(() => new Set());
  const reqRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    const id = ++reqRef.current;
    setRows(null);
    try {
      if (searching) {
        const res = await fetch(`/api/exhibitions/search?scope=all&limit=${SEARCH_LIMIT}&search=${encodeURIComponent(search)}`);
        const data = await res.json();
        if (id !== reqRef.current) return;
        const items = (data.items || []).map(fromSearch);
        setRows(items);
        setTotal(data.total || items.length);
        setTotalPages(1);
        return;
      }
      if (monthActive) {
        const { data } = await getExhibitionsByMonthYear({ month, year, page, limit: pageSize });
        if (id !== reqRef.current) return;
        setRows(data?.data ?? []);
        setTotal(data?.total || 0);
        setTotalPages(data?.totalPages || 1);
        return;
      }
      const { data } = await getAdminExhibitionsPage({ page, limit: pageSize });
      if (id !== reqRef.current) return;
      setRows(data?.data ?? []);
      setTotal(data?.total || 0);
      setTotalPages(data?.totalPages || 1);
      setCounts({ exhibitions: data?.exhibitions ?? data?.total ?? 0, companies: data?.companies ?? 0, products: data?.products ?? 0 });
    } catch {
      if (id !== reqRef.current) return;
      setRows([]);
      toast.error("Could not load exhibitions.");
    }
  }, [searching, search, monthActive, month, year, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  // The overall counts come from the plain listing; fetch them once even if the
  // page opens straight into a filter.
  useEffect(() => {
    getAdminExhibitionsPage({ page: 1, limit: 1 })
      .then(({ data }) => setCounts({ exhibitions: data?.total ?? 0, companies: data?.companies ?? 0, products: data?.products ?? 0 }))
      .catch(() => setCounts({ exhibitions: null, companies: null, products: null }));
  }, []);

  async function toggleFeature(item) {
    const next = !item.is_featured;
    setFeaturingIds((prev) => new Set(prev).add(item._id));
    try {
      if (next) await featureExhibition(item._id);
      else await unfeatureExhibition(item._id);
      toast.success(next ? "Exhibition featured. It now shows in the home page slider." : "Removed from featured.");
      setRows((prev) => prev.map((r) => (r._id === item._id ? { ...r, is_featured: next } : r)));
      refreshExhibitionPage(item._id, { featured: true }); // home slider + the show's page
    } catch {
      toast.error(next ? "Could not feature it." : "Could not unfeature it.");
    } finally {
      setFeaturingIds((prev) => {
        const s = new Set(prev);
        s.delete(item._id);
        return s;
      });
    }
  }

  const clearFilters = () => {
    setMonth("");
    setYear("");
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const mode = searching ? "search" : monthActive ? "month" : "all";
  const panelTitle =
    mode === "search"
      ? `Matches for “${search}”`
      : mode === "month"
        ? `Starting in ${MONTH_NAMES[Number(month) - 1]} ${year}`
        : "All exhibitions";

  return (
    <AdminPage>
      <AdminHeader
        title="Exhibitions"
        description="Every exhibition on OneXhib. Edit details, feature shows on the home page, or give an organiser access to keep their own listing up to date."
        actions={
          <button type="button" onClick={() => setShowAdd(true)} className={btnPrimary}>
            <Plus size={16} aria-hidden="true" />
            Add exhibition
          </button>
        }
      />

      <StatGrid cols={3}>
        <StatCard icon={<CalendarDays size={16} />} label="Exhibitions" value={counts.exhibitions} />
        <StatCard href="/admin/companies" icon={<Building2 size={16} />} tone="violet" label="Companies" value={counts.companies} />
        <StatCard href="/admin/products" icon={<Package size={16} />} tone="sky" label="Products" value={counts.products} />
      </StatGrid>

      <Panel
        title={panelTitle}
        count={rows ? total : undefined}
        description={
          mode === "search"
            ? `Top ${SEARCH_LIMIT} matches across upcoming, live and past exhibitions.`
            : mode === "month"
              ? "Exhibitions whose start date falls in this month."
              : "Newest first."
        }
        toolbar={
          <>
            <div className="flex gap-2">
              <select
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setPage(1);
                }}
                aria-label="Month"
                className={`${adminSelect} w-32`}
              >
                <option value="">Month</option>
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => {
                  setYear(e.target.value);
                  setPage(1);
                }}
                aria-label="Year"
                className={`${adminSelect} w-24`}
              >
                <option value="">Year</option>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <SearchField value={searchInput} onChange={setSearchInput} placeholder="Search all exhibitions" className="sm:w-72" />
            {mode !== "all" || month || year ? (
              <button type="button" onClick={clearFilters} className={`${btnRow} h-10`}>
                <X size={14} aria-hidden="true" />
                Clear
              </button>
            ) : null}
          </>
        }
        footer={
          rows && rows.length && mode !== "search" ? (
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
              itemLabel="exhibitions"
            />
          ) : null
        }
      >
        {month && !year ? (
          <p className="border-b border-gray-100 bg-sky-50/60 px-5 py-2 text-xs text-sky-800 dark:border-gray-800 dark:bg-sky-400/5 dark:text-sky-200">
            Pick a year too to filter by month.
          </p>
        ) : null}

        {rows === null ? (
          <LoadingRows rows={5} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<CalendarRange size={22} aria-hidden="true" />} title="No exhibitions found">
            {mode === "all" ? "Add the first one with “Add exhibition”." : "Try another search or month."}
          </EmptyState>
        ) : (
          <>
            <div className="hidden max-h-[70vh] overflow-auto overscroll-contain xl:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className={thead}>
                    <th scope="col" className={th}>Exhibition</th>
                    <th scope="col" className={th}>Dates</th>
                    <th scope="col" className={th}>Category</th>
                    <th scope="col" className={th}>Added by</th>
                    <th scope="col" className={th}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className={tbody}>
                  {rows.map((item) => (
                    <tr key={item._id} className={tr}>
                      <td className={`${td} min-w-[16rem] max-w-[24rem]`}>
                        <NameCell item={item} />
                      </td>
                      <td className={`${td} whitespace-nowrap text-[13px] text-gray-700 dark:text-gray-300`}>
                        {dateRange(item.starting_date, item.ending_date)}
                        {statusOf(item.starting_date, item.ending_date) ? (
                          <div className="mt-1">
                            <Badge tone={statusOf(item.starting_date, item.ending_date).tone}>
                              {statusOf(item.starting_date, item.ending_date).label}
                            </Badge>
                          </div>
                        ) : null}
                      </td>
                      <td className={`${td} max-w-[12rem] text-[13px] text-gray-700 dark:text-gray-300`}>
                        <span className="line-clamp-2">{item.category || "—"}</span>
                      </td>
                      <td className={`${td} max-w-[12rem] text-[13px] text-gray-600 dark:text-gray-400`}>
                        <span className="block truncate">{item.addedBy || (mode === "search" ? "—" : "Unknown")}</span>
                      </td>
                      <td className={td}>
                        <RowActions
                          item={item}
                          busy={featuringIds.has(item._id)}
                          onFeature={() => toggleFeature(item)}
                          onEdit={() => setEditingId(item._id)}
                          onAccess={() => setAccessFor({ id: item._id, name: item.exhibition_name })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className={`xl:hidden ${tbody}`}>
              {rows.map((item) => {
                const s = statusOf(item.starting_date, item.ending_date);
                return (
                  <li key={item._id} className="space-y-3 px-4 py-4 sm:px-5">
                    <NameCell item={item} />
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-gray-600 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={13} aria-hidden="true" className="text-gray-400" />
                        {dateRange(item.starting_date, item.ending_date)}
                      </span>
                      {s ? <Badge tone={s.tone}>{s.label}</Badge> : null}
                      {item.category ? <span className="truncate">{item.category}</span> : null}
                    </div>
                    {item.addedBy ? <p className="truncate text-xs text-gray-400">Added by {item.addedBy}</p> : null}
                    <RowActions
                      item={item}
                      busy={featuringIds.has(item._id)}
                      onFeature={() => toggleFeature(item)}
                      onEdit={() => setEditingId(item._id)}
                      onAccess={() => setAccessFor({ id: item._id, name: item.exhibition_name })}
                      wrap
                    />
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Panel>

      {showAdd && (
        <ExhibitionPopupForm
          onClose={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}
      <ExhibitionEditPopup
        open={Boolean(editingId)}
        exhibitionId={editingId}
        isAdmin
        onClose={() => {
          setEditingId(null);
          load();
        }}
      />
      {accessFor && (
        <ExhibitionAccessDialog exhibitionId={accessFor.id} exhibitionName={accessFor.name} onClose={() => setAccessFor(null)} />
      )}
    </AdminPage>
  );
}

function NameCell({ item }) {
  return (
    <div className="min-w-0">
      <div className="flex items-start gap-1.5">
        {item.is_featured ? <Star size={14} aria-label="Featured" className="mt-0.5 shrink-0 fill-amber-400 text-amber-400" /> : null}
        <p className="font-semibold leading-snug text-gray-900 dark:text-gray-100">{item.exhibition_name || "Untitled exhibition"}</p>
      </div>
      {item.exhibition_address ? (
        <p className="mt-0.5 flex items-start gap-1 text-xs text-gray-500 dark:text-gray-400">
          <MapPin size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span className="line-clamp-2">{item.exhibition_address}</span>
        </p>
      ) : null}
    </div>
  );
}

const iconBtn =
  "grid h-8 w-8 place-items-center rounded-lg border border-gray-300 bg-white text-gray-600 transition hover:border-[#2B3FB8] hover:text-[#2B3FB8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B3FB8] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-400 dark:hover:text-white";

/**
 * In the table (`wrap` false) View/Edit/Access are icon buttons with tooltips
 * so the row keeps its width for the name; on cards there is room for labels.
 */
function RowActions({ item, busy, onFeature, onEdit, onAccess, wrap = false }) {
  const label = (text) => (wrap ? text : null);
  const cls = wrap ? btnRow : iconBtn;
  return (
    <div className={`flex items-center gap-1.5 ${wrap ? "flex-wrap" : "justify-end"}`}>
      <Link href={`/exhibitions/${item._id}`} target="_blank" rel="noopener" className={cls} title="View public page" aria-label="View public page">
        <Eye size={14} aria-hidden="true" />
        {label("View")}
      </Link>
      <button type="button" onClick={onEdit} className={cls} title="Edit details" aria-label="Edit details">
        <Pencil size={14} aria-hidden="true" />
        {label("Edit")}
      </button>
      <button type="button" onClick={onAccess} className={cls} title="Edit access: let an organiser edit this exhibition" aria-label="Edit access">
        <KeyRound size={14} aria-hidden="true" />
        {label("Access")}
      </button>
      <button
        type="button"
        onClick={onFeature}
        disabled={busy}
        aria-pressed={Boolean(item.is_featured)}
        aria-label={item.is_featured ? "Featured - click to remove from the home page slider" : "Feature on the home page slider"}
        title={item.is_featured ? "Featured - click to remove from the home page slider" : "Feature on the home page slider"}
        className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-[13px] font-semibold transition disabled:opacity-60 ${
          wrap ? "px-3 py-1.5" : "h-8 w-8"
        } ${
          item.is_featured
            ? "bg-amber-50 text-amber-600 ring-1 ring-amber-500/40 hover:bg-amber-100 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/30"
            : "border border-gray-300 bg-white text-gray-600 hover:border-amber-400 hover:text-amber-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-amber-400 dark:hover:text-amber-300"
        }`}
      >
        {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Star size={14} aria-hidden="true" className={item.is_featured ? "fill-current" : ""} />}
        {wrap ? (item.is_featured ? "Featured" : "Feature") : null}
      </button>
    </div>
  );
}
