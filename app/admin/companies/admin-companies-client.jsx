"use client";

// Migrated from views/admin/AdminCompanyView.jsx.
// Behaviour, markup and classes are unchanged. The sidebar now comes from
// app/admin/layout.jsx, getPageNumbers moved to lib/paginate.js, and
// navigation uses next/navigation with the new clean routes.
import dynamic from "next/dynamic";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

import { toast } from "sonner";
import { getAdminCompaniesPage, deleteAllCompanies } from "@/models/company.model";
import { getAdminExhibitionsPage } from "@/models/exhibition.model";
import { getPageNumbers } from "@/lib/paginate";

// Modals are only needed once opened, so their code (and for the location
// forms, country-state-city's ~2.3 MB dataset) is split out of this page's
// first-load bundle.
const ExhibitionPopupForm = dynamic(() => import("@/components/popups/ExhibitionPopupForm"), { ssr: false });

export default function AdminCompaniesClient() {
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [exhibition, setExhibition] = useState(0);
  const [companyCount, setCompanyCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; // server page size — matches the params sent to /api/admin/company

  // Server-side pagination: fetches only the current page (companies scale into the
  // hundreds/thousands, so loading everything up front doesn't scale). Exhibitions
  // count comes from a separate, minimal (limit: 1) request just to read its total.
  const fetchCompanies = useCallback(async (page) => {
    try {
      setLoading(true);
      const [companiesRes, exhibitionsRes] = await Promise.all([
        getAdminCompaniesPage({ page, limit: itemsPerPage }),
        getAdminExhibitionsPage({ page: 1, limit: 1 }),
      ]);

      const body = companiesRes.data ?? {};
      setCompanies(body.data ?? []);
      setCompanyCount(body.companies ?? body.total ?? 0);
      setProductCount(body.products ?? 0);
      setTotalPages(body.totalPages || 1);
      setExhibition(exhibitionsRes.data?.total ?? 0);
    } catch (err) {
      console.error("❌ Error fetching companies:", err);
      toast.error("Failed to fetch companies");
    } finally {
      setLoading(false);
    }
  }, [itemsPerPage]);

  useEffect(() => {
    fetchCompanies(currentPage);
  }, [currentPage, fetchCompanies]);

  // ✅ Delete all companies
  const handleDeleteAllCompanies = async () => {
    try {
      setLoading(true);
      const { data } = await deleteAllCompanies();
      toast.success(data.message || "All companies deleted successfully");
      setShowDeleteConfirm(false);
      setCurrentPage(1);
      fetchCompanies(1);
    } catch (err) {
      console.error("❌ Error deleting companies:", err);
      toast.error("Failed to delete companies");
    } finally {
      setLoading(false);
    }
  };

  // The backend has no search endpoint, so this only filters the companies
  // already loaded for the current page — not the full collection.
  const filteredCompanies = useMemo(() => {
    if (!search.trim()) return companies;
    const query = search.toLowerCase();
    return companies.filter((c, index) => {
      const rowNumber = (index + 1).toString();
      return (
        rowNumber.includes(query) ||
        (c.company_name || "").toLowerCase().includes(query) ||
        (c.address || "").toLowerCase().includes(query) ||
        (c.mobile_number || "").toLowerCase().includes(query)
      );
    });
  }, [companies, search]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCompanies = filteredCompanies;

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-serif">
      {/* Sidebar */}

      {/* Main Content */}
      <div className="flex-1 w-full mt-8 flex flex-col border border-gray-300 dark:border-gray-700 md:mx-4 lg:mx-6 bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-y-auto">
        {/* Header */}
        <div className="w-full flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between items-center px-4 sm:px-8 py-4 sm:h-20 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 rounded-t-lg">
          <h1 className="font-bold text-2xl sm:text-3xl tracking-wide">Company Dashboard</h1>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="h-10 w-full sm:w-48 border border-red-500 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950 rounded-md font-semibold transition-colors"
          >
            Delete All Company
          </button>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 px-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 w-full max-w-sm">
              <h2 className="text-xl font-bold mb-4 text-center">
                Are you sure?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                This will permanently delete all companies. This action cannot be undone.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border-2 border-gray-400 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAllCompanies}
                  className="px-4 py-2 border-2 border-red-500 text-red-500 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-950 transition-colors"
                  disabled={loading}
                >
                  {loading ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="w-full px-3 sm:px-4 mt-6 grid grid-cols-3 gap-3 sm:gap-6">
          {[
            { title: "Total Companies", value: companyCount },
            { title: "Exhibitions", value: exhibition },
            { title: "Products", value: productCount },
          ].map((card) => (
            <div
              key={card.title}
              className="h-20 sm:h-24 rounded-xl flex flex-col justify-center items-center bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 shadow-sm px-2"
            >
              <p className="text-xs sm:text-lg font-medium text-gray-700 dark:text-gray-300 text-center">{card.title}</p>
              <p className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Table Section */}
        <div className="flex-1 w-full px-3 sm:px-4 mt-8 rounded-b-lg border border-t-0 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm pb-8 mb-8">
          {/* Controls */}
          <div className="py-4 w-full flex flex-col lg:flex-row justify-between gap-4 px-4">
            <h2 className="font-bold text-2xl sm:text-3xl text-gray-800 dark:text-gray-100">
              Company List
            </h2>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search this page (name, address, mobile, #)"
              title="Only filters the companies currently loaded on this page"
              className="h-10 w-full sm:w-64 border border-gray-400 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* List */}
          <div className="flex-1 w-full mt-6">
            {paginatedCompanies.length === 0 ? (
              <p className="p-6 text-center text-gray-600 dark:text-gray-400 italic">No companies found</p>
            ) : (
              <>
                {/* Card list — phones only */}
                <div className="sm:hidden flex flex-col gap-3 px-4">
                  {paginatedCompanies.map((c, index) => (
                    <div key={c._id || index} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-4">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {startIndex + index + 1}. {c.company_name}
                      </p>
                      <dl className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex gap-1">
                          <dt className="font-medium text-gray-500 dark:text-gray-400">Address:</dt>
                          <dd className="truncate">{c.company_address || "—"}</dd>
                        </div>
                        <div className="flex gap-1">
                          <dt className="font-medium text-gray-500 dark:text-gray-400">Mobile:</dt>
                          <dd>{c.company_phone_number || "—"}</dd>
                        </div>
                      </dl>
                      <button
                        onClick={() => router.push(`/companies/${c._id}`)}
                        className="w-full mt-3 border border-blue-500 text-blue-500 dark:text-blue-400 rounded-md px-3 py-1.5 hover:bg-blue-100 dark:hover:bg-blue-950 transition-colors"
                      >
                        View
                      </button>
                    </div>
                  ))}
                </div>

                {/* Table — sm and up */}
                <div className="hidden sm:block overflow-auto max-h-[70vh] overscroll-contain rounded-md text-left">
                  <table className="w-full min-w-[700px] border-collapse border border-gray-300 dark:border-gray-700">
                    <thead>
                      <tr className="bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-b border-gray-300 dark:border-gray-700">
                        {["#", "Company Name", "Address", "Mobile Number", "Action"].map(
                          (header) => (
                            <th
                              key={header}
                              className="px-4 py-3 border-r border-gray-300 dark:border-gray-700 last:border-r-0 sticky top-0 z-10 bg-gray-200 dark:bg-gray-800 shadow-[inset_-1px_-1px_0_0_#d1d5db] dark:shadow-[inset_-1px_-1px_0_0_#374151] last:shadow-[inset_0_-1px_0_0_#d1d5db] dark:last:shadow-[inset_0_-1px_0_0_#374151]"
                            >
                              {header}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCompanies.map((c, index) => (
                        <tr
                          key={c._id || index}
                          className={index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"}
                        >
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">
                            {startIndex + index + 1}
                          </td>
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">
                            {c.company_name}
                          </td>
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">
                            {c.company_address}
                          </td>
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">
                            {c.company_phone_number}
                          </td>
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">
                            <button
                              onClick={() => router.push(`/companies/${c._id}`)}
                              className="border border-blue-500 text-blue-500 dark:text-blue-400 rounded-md px-3 py-1 hover:bg-blue-100 dark:hover:bg-blue-950 transition-colors"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Pagination */}
          <div className="mt-6 px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {filteredCompanies.length === 0 ? 0 : startIndex + 1}–{startIndex + filteredCompanies.length}
              </span>{" "}
              of <span className="font-medium text-gray-700 dark:text-gray-300">{companyCount}</span> companies
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
                  <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">…</span>
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

      {/* Popup Form */}
      {showForm && (
        <ExhibitionPopupForm
          Close={() => setShowForm(false)}
          onCompanyAdded={() => fetchCompanies(currentPage)}
        />
      )}
    </div>
  );
}
