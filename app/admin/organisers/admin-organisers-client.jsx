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
import { getPageNumbers } from "@/lib/paginate";

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
  const itemsPerPage = 50; // server page size — matches the params sent to /api/admin/exhibition
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
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-serif">

      <div className="flex-1 w-full mt-8 flex flex-col border border-gray-300 dark:border-gray-700 md:mx-4 lg:mx-6 bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-y-auto">
        {/* Header */}
        <div className="w-full flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between items-center px-4 sm:px-8 py-4 sm:h-20 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 rounded-t-lg">
          <h1 className="flex-1 font-bold text-2xl sm:text-3xl tracking-wide">SEM GROUP</h1>
        </div>

        {/* Summary Cards */}
        <div className="w-full px-3 sm:px-4 mt-6 grid grid-cols-3 gap-3 sm:gap-6">
          {[
            { title: "Exhibitions", value: total },
            { title: "Companies", value: companies },
            { title: "Products", value: products },
          ].map(
            (card) => (
              <div
                key={card.title}
                className="h-20 sm:h-24 rounded-xl flex flex-col justify-center items-center bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 shadow-sm px-2"
              >
                <p className="text-xs sm:text-lg font-medium text-gray-700 dark:text-gray-300 text-center">{card.title}</p>
                <p className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
              </div>
            )
          )}
        </div>

        {/* Table Section */}
        <div className="flex-1 w-full px-3 sm:px-4 mt-8 rounded-b-lg border border-t-0 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm pb-8 mb-8">
          {/* Controls */}
          <div className="py-4 w-full flex flex-col lg:flex-row justify-between gap-4 px-4 text-center">
            <h2 className="font-bold text-2xl sm:text-3xl text-gray-800 dark:text-gray-100">Exhibition List</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-end flex-wrap">
              {/* Month/year selects share a row even on the smallest phones. */}
              <div className="flex gap-3">
                <select
                  value={monthFilter}
                  onChange={(e) => {
                    setMonthFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 flex-1 min-w-0 border border-gray-400 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-100 px-2 sm:px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  className="h-10 flex-1 min-w-0 border border-gray-400 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-100 px-2 sm:px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                    className="h-10 shrink-0 border border-gray-400 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md px-3 sm:px-4 font-semibold transition-colors"
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
                className="h-10 w-full sm:w-64 border border-gray-400 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                className="h-10 w-full sm:w-48 border-2 border-blue-500 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950 rounded-md font-semibold transition-colors"
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
          <div className="flex-1 w-full mt-6">
            {loading ? (
              <p className="text-center py-6 text-gray-600 dark:text-gray-400">Loading...</p>
            ) : paginatedData.length === 0 ? (
              <p className="p-6 text-center text-gray-600 dark:text-gray-400 italic">No data found</p>
            ) : (
              <>
                {/* Card list — phones only */}
                <div className="sm:hidden flex flex-col gap-3 px-4">
                  {paginatedData.map((item, index) => (
                    <div
                      key={item._id || index}
                      className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-4"
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
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-blue-500 text-blue-500 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-950 transition"
                          onClick={() => router.push(`/exhibitions/${item._id}`)}
                        >
                          View
                        </button>
                        <button
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-green-500 text-green-500 dark:text-green-400 rounded-md hover:bg-green-100 dark:hover:bg-green-950 transition"
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
                <div className="hidden sm:block overflow-auto max-h-[70vh] overscroll-contain rounded-md text-left">
                  <table className="w-full min-w-[700px] border-collapse border border-gray-300 dark:border-gray-700">
                    <thead>
                      <tr className="bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-b border-gray-300 dark:border-gray-700">
                        {["#", "Exhibition BY", "Exhibition Name", "Address", "Category", "Start Date", "End Date", "Featured", "Action"].map(
                          (header) => (
                            <th key={header} className="px-4 py-3 border-r border-gray-300 dark:border-gray-700 last:border-r-0 sticky top-0 z-10 bg-gray-200 dark:bg-gray-800 shadow-[inset_-1px_-1px_0_0_#d1d5db] dark:shadow-[inset_-1px_-1px_0_0_#374151] last:shadow-[inset_0_-1px_0_0_#d1d5db] dark:last:shadow-[inset_0_-1px_0_0_#374151]">
                              {header}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedData.map((item, index) => (
                        <tr key={item._id || index} className={index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"}>
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">{startIndex + index + 1}</td>
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">{item.addedBy}</td>
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">{item.exhibition_name}</td>
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">{item.exhibition_address}</td>
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">{item.category}</td>
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">
                            {item.starting_date ? new Date(item.starting_date).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">
                            {item.ending_date ? new Date(item.ending_date).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700 text-center">
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
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                              <button
                                className="flex items-center gap-1 px-3 py-1 border border-blue-500 text-blue-500 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-950 transition"
                                onClick={() => router.push(`/exhibitions/${item._id}`)}
                              >
                                View
                              </button>
                              <button
                                className="flex items-center gap-1 px-3 py-1 border border-green-500 text-green-500 dark:text-green-400 rounded-md hover:bg-green-100 dark:hover:bg-green-950 transition"
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

          {/* Pagination Controls */}
          <div className="mt-6 px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {filteredData.length === 0 ? 0 : startIndex + 1}–{startIndex + filteredData.length}
              </span>{" "}
              of <span className="font-medium text-gray-700 dark:text-gray-300">{total}</span> exhibitions
              {" "}(page {currentPage} of {totalPages})
            </p>
            <div className="flex gap-1 items-center flex-wrap justify-center">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                aria-label="Previous page"
              >
                ‹
              </button>
              {getPageNumbers(currentPage, totalPages).map((page, i) =>
                page === "..." ? (
                  <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                    …
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`w-8 h-8 flex items-center justify-center rounded-md border text-sm font-medium transition-colors ${
                      page === currentPage
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
