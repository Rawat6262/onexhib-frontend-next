"use client";

// Migrated from views/admin/AdminOrganiserView.jsx.
// Behaviour, markup and classes are unchanged. The sidebar now comes from
// app/admin/layout.jsx, getPageNumbers moved to lib/paginate.js, and
// navigation uses next/navigation with the new clean routes.
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  getAdminExhibitionsPage,
  getExhibitionsByMonthYear,
  featureExhibition,
  unfeatureExhibition,
} from "@/models/exhibition.model";
import TablePagination from "@/components/dashboard/TablePagination";

// Modals are only needed once opened, so their code (and for the location
// forms, country-state-city's ~2.3 MB dataset) is split out of this page's
// first-load bundle.
const ExhibitionPopupForm = dynamic(() => import("@/components/popups/ExhibitionPopupForm"), { ssr: false });
const OrganiserPopup = dynamic(() => import("@/components/organiser/OrganiserDetailsPopup"), { ssr: false });
const ExhibitionEditPopup = dynamic(() => import("@/components/popups/OrganiserEditPopup"), { ssr: false });

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Exhibitions can be scheduled well ahead of time, so bias the range forward.
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - 2 + i);

export default function AdminOrganisersClient() {
  const [exhibitions, setExhibitions] = useState([]);
  const [companies, setCompanies] = useState(0);
  const [products, setProducts] = useState(0);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  // Server page size, sent as `limit`; the backend caps it at 500.
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [organiserId, setOrganiserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [update, setupdate] = useState(false);
  const router = useRouter();
  const [editingId, setEditingId] = useState(null);

  // Month/year filter — when both are set, the list comes from the monthly
  // endpoint instead of the plain admin listing.
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const isMonthFilterActive = Boolean(monthFilter && yearFilter);

  // Guards against out-of-order responses: if the filter changes while an older
  // request is still in flight, the older response is discarded instead of
  // overwriting the list with stale (or mismatched) data.
  const requestIdRef = useRef(0);

  // Server-side pagination: fetches only the current page (thousands of exhibitions
  // exist, so loading everything up front doesn't scale).
  const fetchExhibitions = useCallback(async (page) => {
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);

      if (isMonthFilterActive) {
        const { data: response } = await getExhibitionsByMonthYear({
          month: monthFilter,
          year: yearFilter,
          page,
          limit: itemsPerPage,
        });
        if (requestId !== requestIdRef.current) return; // superseded by a newer request
        setExhibitions(response?.data ?? []);
        setTotal(response?.total || 0);
        setTotalPages(response?.totalPages || 1);
        return;
      }

      const { data: response } = await getAdminExhibitionsPage({ page, limit: itemsPerPage });
      if (requestId !== requestIdRef.current) return; // superseded by a newer request
      const data = response?.data ?? [];

      setOrganiserId(data[0]?.createdby || null);
      setExhibitions(data);
      setCompanies(response?.companies || 0);
      setProducts(response?.products || 0);
      setTotal(response?.total || 0);
      setTotalPages(response?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching exhibitions:", error.message);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [itemsPerPage, isMonthFilterActive, monthFilter, yearFilter]);

  useEffect(() => {
    fetchExhibitions(currentPage);
  }, [currentPage, fetchExhibitions]);

  // Applying/clearing the filter resets to page 1 via the change handlers below
  // (not a separate effect) — otherwise the page-reset and the filter change
  // each trigger their own fetch, racing each other.

  // Tracks which exhibition IDs currently have a feature/unfeature request in
  // flight, so each row's button can disable itself independently.
  const [featuringIds, setFeaturingIds] = useState(() => new Set());

  const handleToggleFeature = async (id, nextFeatured) => {
    setFeaturingIds((prev) => new Set(prev).add(id));
    try {
      if (nextFeatured) {
        await featureExhibition(id);
        toast.success("Exhibition marked as featured");
      } else {
        await unfeatureExhibition(id);
        toast.success("Exhibition removed from featured");
      }
      setExhibitions((prev) =>
        prev.map((item) => (item._id === id ? { ...item, is_featured: nextFeatured } : item))
      );
    } catch (error) {
      console.error("Error updating featured status:", error.message);
      toast.error(nextFeatured ? "Failed to feature exhibition" : "Failed to unfeature exhibition");
    } finally {
      setFeaturingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // The backend has no search endpoint, so this only filters the exhibitions
  // already loaded for the current page — not the full collection.
  const filteredData = useMemo(() => {
    if (!search.trim()) return exhibitions;
    return exhibitions.filter((item) =>
      [item.exhibition_name, item.category, item.addedBy, item.exhibition_address].some((field) =>
        field?.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [exhibitions, search]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData;

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 text-gray-900 sm:px-6 sm:py-12 dark:text-gray-100">

      <div className="flex flex-col">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#2B3FB8] dark:text-blue-300"><span aria-hidden="true" className="h-px w-6 bg-current opacity-60" />Admin</p>
            <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#2B3FB8] dark:text-blue-300"><span aria-hidden="true" className="h-px w-6 bg-current opacity-60" />Admin</p>
            <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-[2.6rem] dark:text-white">SEM GROUP</h1>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
          {[
            { title: "Exhibitions", value: total },
            { title: "Companies", value: companies },
            { title: "Products", value: products },
          ].map(
            (card) => (
              <div
                key={card.title}
                className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900"
              >
                <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">{card.title}</p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900 tabular-nums sm:text-3xl dark:text-white">{card.value}</p>
              </div>
            )
          )}
        </div>

        {/* Table Section */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white pb-2 shadow-sm shadow-gray-900/[0.03] dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
          {/* Controls */}
          <div className="flex w-full flex-col gap-4 border-b border-gray-200 bg-gradient-to-b from-gray-50/80 to-white px-5 py-4 text-center lg:flex-row lg:items-center lg:justify-between dark:border-gray-800 dark:from-white/[0.02] dark:to-transparent">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Exhibition List</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-end flex-wrap">
              {/* Month/year selects share a row even on the smallest phones. */}
              <div className="flex gap-3">
                <select
                  value={monthFilter}
                  onChange={(e) => {
                    setMonthFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 rounded-xl border border-gray-300 bg-white px-3.5 text-sm text-gray-900 placeholder-gray-500 transition focus:border-[#2B3FB8] focus:outline-none focus:ring-4 focus:ring-[#2B3FB8]/15 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 min-w-0 flex-1"
                >
                  <option value="">Month</option>
                  {MONTH_NAMES.map((name, i) => (
                    <option key={name} value={i + 1}>{name}</option>
                  ))}
                </select>
                <select
                  value={yearFilter}
                  onChange={(e) => {
                    setYearFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 rounded-xl border border-gray-300 bg-white px-3.5 text-sm text-gray-900 placeholder-gray-500 transition focus:border-[#2B3FB8] focus:outline-none focus:ring-4 focus:ring-[#2B3FB8]/15 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 min-w-0 flex-1"
                >
                  <option value="">Year</option>
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                {isMonthFilterActive && (
                  <button
                    onClick={() => {
                      setMonthFilter("");
                      setYearFilter("");
                      setCurrentPage(1);
                    }}
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-[#2B3FB8] hover:text-[#2B3FB8] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-400 dark:hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search this page"
                title="Only filters the exhibitions currently loaded on this page"
                className="h-10 rounded-xl border border-gray-300 bg-white px-3.5 text-sm text-gray-900 placeholder-gray-500 transition focus:border-[#2B3FB8] focus:outline-none focus:ring-4 focus:ring-[#2B3FB8]/15 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 w-full sm:w-64"
              />
              <button
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#131C55] to-[#2B3FB8] px-4 text-sm font-semibold text-white shadow-md shadow-indigo-900/20 transition hover:brightness-110 sm:w-48 motion-reduce:transition-none dark:from-blue-600 dark:to-indigo-500"
                onClick={() => setShowModal(true)}
              >
                + Add Exhibition
              </button>
            </div>
          </div>

          {showModal && (
            <ExhibitionPopupForm
              onClose={() => {
                setShowModal(false);
                fetchExhibitions(currentPage);
              }}
            />
          )}

          {/* List */}
          <div className="w-full">
            {loading ? (
              <p className="px-5 py-12 text-center text-[15px] text-gray-500 dark:text-gray-400">Loading...</p>
            ) : paginatedData.length === 0 ? (
              <p className="px-5 py-12 text-center text-[15px] text-gray-500 dark:text-gray-400">No data found</p>
            ) : (
              <>
                {/* Card list — phones only */}
                <div className="flex flex-col gap-3 px-4 py-4 sm:hidden">
                  {paginatedData.map((item, index) => (
                    <div
                      key={item._id || index}
                      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {startIndex + index + 1}. {item.exhibition_name}
                        </p>
                      </div>
                      <dl className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex gap-1">
                          <dt className="font-medium text-gray-500 dark:text-gray-400">By:</dt>
                          <dd className="truncate">{item.addedBy || "—"}</dd>
                        </div>
                        <div className="flex gap-1">
                          <dt className="font-medium text-gray-500 dark:text-gray-400">Category:</dt>
                          <dd>{item.category || "—"}</dd>
                        </div>
                        <div className="flex gap-1">
                          <dt className="font-medium text-gray-500 dark:text-gray-400">Address:</dt>
                          <dd className="truncate">{item.exhibition_address || "—"}</dd>
                        </div>
                        <div className="flex gap-1">
                          <dt className="font-medium text-gray-500 dark:text-gray-400">Dates:</dt>
                          <dd>
                            {item.starting_date ? new Date(item.starting_date).toLocaleDateString() : "—"}
                            {" – "}
                            {item.ending_date ? new Date(item.ending_date).toLocaleDateString() : "—"}
                          </dd>
                        </div>
                      </dl>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 transition hover:border-[#2B3FB8] hover:text-[#2B3FB8] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-400 dark:hover:text-white flex-1"
                          onClick={() => router.push(`/exhibitions/${item._id}`)}
                        >
                          View
                        </button>
                        <button
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 transition hover:border-emerald-500 hover:text-emerald-600 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-emerald-400 dark:hover:text-emerald-300 flex-1"
                          onClick={() => setEditingId(item._id)}
                        >
                          Edit
                        </button>
                        <button
                          className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed ${
                            item.is_featured
                              ? "border-amber-400 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 hover:bg-amber-100 dark:hover:bg-amber-900"
                              : "border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950"
                          }`}
                          disabled={featuringIds.has(item._id)}
                          onClick={() => handleToggleFeature(item._id, !item.is_featured)}
                          title={item.is_featured ? "Click to unfeature" : "Click to feature"}
                        >
                          {featuringIds.has(item._id) ? "..." : item.is_featured ? "★ Featured" : "Feature"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Table — sm and up */}
                <div className="hidden max-h-[70vh] overflow-auto overscroll-contain text-left sm:block">
                  <table className="w-full min-w-[700px] border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {["#", "Exhibition BY", "Exhibition Name", "Address", "Category", "Start Date", "End Date", "Featured", "Action"].map(
                          (header) => (
                            <th key={header} className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 px-4 py-3 font-semibold dark:border-gray-800 dark:bg-gray-900">
                              {header}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedData.map((item, index) => (
                        <tr key={item._id || index} className={"bg-white transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-white/[0.03]"}>
                          <td className="border-b border-gray-100 px-4 py-3.5 text-gray-700 dark:border-gray-800 dark:text-gray-300">{startIndex + index + 1}</td>
                          <td className="border-b border-gray-100 px-4 py-3.5 text-gray-700 dark:border-gray-800 dark:text-gray-300">{item.addedBy}</td>
                          <td className="border-b border-gray-100 px-4 py-3.5 text-gray-700 dark:border-gray-800 dark:text-gray-300">{item.exhibition_name}</td>
                          <td className="border-b border-gray-100 px-4 py-3.5 text-gray-700 dark:border-gray-800 dark:text-gray-300">{item.exhibition_address}</td>
                          <td className="border-b border-gray-100 px-4 py-3.5 text-gray-700 dark:border-gray-800 dark:text-gray-300">{item.category}</td>
                          <td className="border-b border-gray-100 px-4 py-3.5 text-gray-700 dark:border-gray-800 dark:text-gray-300">
                            {item.starting_date ? new Date(item.starting_date).toLocaleDateString() : "—"}
                          </td>
                          <td className="border-b border-gray-100 px-4 py-3.5 text-gray-700 dark:border-gray-800 dark:text-gray-300">
                            {item.ending_date ? new Date(item.ending_date).toLocaleDateString() : "—"}
                          </td>
                          <td className="border-b border-gray-100 px-4 py-3.5 text-center text-gray-700 dark:border-gray-800 dark:text-gray-300">
                            <button
                              className={`px-3 py-1 border rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed ${
                                item.is_featured
                                  ? "border-amber-400 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 hover:bg-amber-100 dark:hover:bg-amber-900"
                                  : "border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950"
                              }`}
                              disabled={featuringIds.has(item._id)}
                              onClick={() => handleToggleFeature(item._id, !item.is_featured)}
                              title={item.is_featured ? "Click to unfeature" : "Click to feature"}
                            >
                              {featuringIds.has(item._id) ? "..." : item.is_featured ? "★ Featured" : "Feature"}
                            </button>
                          </td>
                          <td className="border-b border-gray-100 px-4 py-3.5 text-gray-700 dark:border-gray-800 dark:text-gray-300">
                            <div className="flex items-center gap-2">
                              <button
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 transition hover:border-[#2B3FB8] hover:text-[#2B3FB8] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-400 dark:hover:text-white"
                                onClick={() => router.push(`/exhibitions/${item._id}`)}
                              >
                                View
                              </button>
                              <button
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 transition hover:border-emerald-500 hover:text-emerald-600 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-emerald-400 dark:hover:text-emerald-300"
                                onClick={() => setEditingId(item._id)}
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Render popup ONCE, at the end (or top) of component */}
    <ExhibitionEditPopup
      open={Boolean(editingId)}
      exhibitionId={editingId}
      isAdmin
      onClose={() => setEditingId(null)}
    />
  </div>

          <div className="mt-6">
            <TablePagination
              page={currentPage}
              pageSize={itemsPerPage}
              total={total}
              totalPages={totalPages}
              shownCount={filteredData.length}
              onPageChange={handlePageChange}
              onPageSizeChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
              pageSizeOptions={[25, 50, 100]}
              itemLabel="exhibitions"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
