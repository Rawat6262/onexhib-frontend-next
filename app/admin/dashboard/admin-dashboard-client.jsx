"use client";

// Migrated from views/admin/AdminDashboardView.jsx.
// Behaviour, markup and classes are unchanged. The sidebar now comes from
// app/admin/layout.jsx, getPageNumbers moved to lib/paginate.js, and
// navigation uses next/navigation with the new clean routes.
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getOrganisers } from "@/models/organiser.model";
import { getPageNumbers } from "@/lib/paginate";

// Modals are only needed once opened, so their code (and for the location
// forms, country-state-city's ~2.3 MB dataset) is split out of this page's
// first-load bundle.
const UserPopupForm = dynamic(() => import("@/components/popups/NewOrganiserPopup"), { ssr: false });

export default function AdminDashboardClient() {
  const [bigdata, setBigdata] = useState([]);
  const [company, setCompany] = useState(0);
  const [exhibition, setExhibition] = useState(0);
  const [product, setProduct] = useState(0);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showPopup, setShowPopup] = useState(false);
  const itemsPerPage = 6;

  // /api/admin/signup now returns organiser counts for exhibitions/companies/products
  // alongside the organiser list, so one call covers everything this page needs —
  // no more fetching (and fully paginating) three other full record sets just for a count.
  const fetchDashboardData = useCallback(async () => {
    try {
      const result = await getOrganisers();
      const body = result.data ?? {};

      setBigdata(body.data || []);
      setExhibition(body.exhibitions || 0);
      setCompany(body.companies || 0);
      setProduct(body.products || 0);
    } catch (e) {
      console.error("Error fetching dashboard data:", e);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Fixed and robust search filtering!
  const filteredData = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return bigdata;
    return bigdata.filter((item) =>
      [
        item?.first_name ?? "",
        item?.last_name ?? "",
        item?.email ?? "",
        item?.mobile_number ?? "",
        item?.company_name ?? "",
        item?.designation ?? "",
      ].some((field) =>
        String(field).toLowerCase().includes(query)
      )
    );
  }, [bigdata, search]);

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-serif">

      <div className="flex-1 w-full mt-8 flex flex-col border border-gray-300 dark:border-gray-700 md:mx-4 lg:mx-6 bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-y-auto">
        {/* Header */}
        <div className="w-full flex flex-col sm:flex-row gap-3 sm:gap-0 items-center justify-between px-4 sm:px-8 py-4 sm:h-20 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 rounded-t-lg">
          <h1 className="font-bold text-2xl sm:text-3xl tracking-wide">Admin Dashboard</h1>
          <button
            onClick={() => setShowPopup(true)}
            className="h-10 w-full sm:w-48 border-2 border-blue-500 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950 rounded-md font-semibold transition-colors"
          >
            + New Organiser
          </button>
        </div>

        {/* Summary Cards */}
        <div className="w-full px-3 sm:px-4 mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
          <SummaryCard title="Organiser" value={bigdata.length} />
          <SummaryCard title="Exhibition" value={exhibition} />
          <SummaryCard title="Company" value={company} />
          <SummaryCard title="Product" value={product} />
        </div>

        {/* Search Bar */}
        <div className="py-4 w-full px-3 sm:px-4 flex flex-col lg:flex-row justify-between gap-4 px-4 mt-6">
          <h2 className="font-bold text-2xl sm:text-3xl text-gray-800 dark:text-gray-100">
            Organisers
          </h2>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search organisers"
            className="h-10 w-full sm:w-64 border border-gray-400 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* List */}
        <div className="flex-1 w-full px-3 sm:px-4 mt-4 rounded-b-lg border border-t-0 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm pb-8 mb-8">
          {paginatedData.length === 0 ? (
            <p className="p-6 text-center text-gray-600 dark:text-gray-400 italic">No data found</p>
          ) : (
            <>
              {/* Card list — phones only */}
              <div className="sm:hidden flex flex-col gap-3 p-4">
                {paginatedData.map((item, index) => (
                  <div key={item._id || index} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-4">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {startIndex + index + 1}. {`${item.first_name || ""} ${item.last_name || ""}`.trim()}
                    </p>
                    <dl className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex gap-1">
                        <dt className="font-medium text-gray-500 dark:text-gray-400">Email:</dt>
                        <dd className="truncate">{item.email || "—"}</dd>
                      </div>
                      <div className="flex gap-1">
                        <dt className="font-medium text-gray-500 dark:text-gray-400">Phone:</dt>
                        <dd>{item.mobile_number || "—"}</dd>
                      </div>
                      <div className="flex gap-1">
                        <dt className="font-medium text-gray-500 dark:text-gray-400">Company:</dt>
                        <dd className="truncate">{item.company_name || "—"}</dd>
                      </div>
                      <div className="flex gap-1">
                        <dt className="font-medium text-gray-500 dark:text-gray-400">Designation:</dt>
                        <dd>{item.designation || "—"}</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>

              {/* Table — sm and up */}
              <div className="hidden sm:block overflow-auto max-h-[70vh] overscroll-contain rounded-md">
                <table className="w-full min-w-[700px] border-collapse border border-gray-300 dark:border-gray-700">
                  <thead>
                    <tr className="bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-b border-gray-300 dark:border-gray-700">
                      {["#", "Full Name", "E-mail", "Phone", "Company", "Designation"].map((header) => (
                        <th key={header} className="px-4 py-3 border-r border-gray-300 dark:border-gray-700 last:border-r-0 sticky top-0 z-10 bg-gray-200 dark:bg-gray-800 shadow-[inset_-1px_-1px_0_0_#d1d5db] dark:shadow-[inset_-1px_-1px_0_0_#374151] last:shadow-[inset_0_-1px_0_0_#d1d5db] dark:last:shadow-[inset_0_-1px_0_0_#374151]">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((item, index) => (
                      <tr key={item._id || index} className={index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"}>
                        <td className="px-4 py-3 border border-gray-300 dark:border-gray-700 text-center">{startIndex + index + 1}</td>
                        <td className="px-4 py-3 border border-gray-300 dark:border-gray-700 text-center">
                          {`${item.first_name || ""} ${item.last_name || ""}`.trim()}
                        </td>
                        <td className="px-4 py-3 border border-gray-300 dark:border-gray-700 text-center">{item.email}</td>
                        <td className="px-4 py-3 border border-gray-300 dark:border-gray-700 text-center">{item.mobile_number}</td>
                        <td className="px-4 py-3 border border-gray-300 dark:border-gray-700 text-center">{item.company_name}</td>
                        <td className="px-4 py-3 border border-gray-300 dark:border-gray-700 text-center">{item.designation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Pagination */}
          <div className="mt-6 px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {filteredData.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredData.length)}
              </span>{" "}
              of <span className="font-medium text-gray-700 dark:text-gray-300">{filteredData.length}</span> organisers
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

      {/* Popup */}
      {showPopup && (
        <UserPopupForm
          onClose={() => setShowPopup(false)}

        />
      )}
    </div>
  );
}

const SummaryCard = ({ title, value }) => (
  <div className="h-20 sm:h-24 rounded-xl flex flex-col justify-center items-center bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 shadow-sm px-2">
    <p className="text-xs sm:text-lg font-medium text-gray-700 dark:text-gray-300 text-center">{title}</p>
    <p className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
  </div>
);

