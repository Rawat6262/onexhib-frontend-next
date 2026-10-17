"use client";

// Migrated from views/admin/AdminDashboardView.jsx.
// Behaviour, markup and classes are unchanged. The sidebar now comes from
// app/admin/layout.jsx, getPageNumbers moved to lib/paginate.js, and
// navigation uses next/navigation with the new clean routes.
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getOrganisers } from "@/models/organiser.model";
import TablePagination from "@/components/dashboard/TablePagination";

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
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
  // A delete or a bigger page size can leave the current page past the end.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(
    startIndex,
    startIndex + itemsPerPage
  );

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
            <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-[2.6rem] dark:text-white">Admin Dashboard</h1>
          </div>
          <button
            onClick={() => setShowPopup(true)}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#131C55] to-[#2B3FB8] px-4 text-sm font-semibold text-white shadow-md shadow-indigo-900/20 transition hover:brightness-110 sm:w-48 motion-reduce:transition-none dark:from-blue-600 dark:to-indigo-500"
          >
            + New Organiser
          </button>
        </div>

        {/* Summary Cards */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <SummaryCard title="Organiser" value={bigdata.length} />
          <SummaryCard title="Exhibition" value={exhibition} />
          <SummaryCard title="Company" value={company} />
          <SummaryCard title="Product" value={product} />
        </div>

        {/* Search Bar */}
        <div className="mt-2 flex w-full flex-col gap-4 px-5 py-4 lg:flex-row lg:justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
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
            className="h-10 rounded-xl border border-gray-300 bg-white px-3.5 text-sm text-gray-900 placeholder-gray-500 transition focus:border-[#2B3FB8] focus:outline-none focus:ring-4 focus:ring-[#2B3FB8]/15 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 w-full sm:w-64"
          />
        </div>

        {/* List */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white pb-2 shadow-sm shadow-gray-900/[0.03] dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
          {paginatedData.length === 0 ? (
            <p className="px-5 py-12 text-center text-[15px] text-gray-500 dark:text-gray-400">No data found</p>
          ) : (
            <>
              {/* Card list — phones only */}
              <div className="sm:hidden flex flex-col gap-3 p-4">
                {paginatedData.map((item, index) => (
                  <div key={item._id || index} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
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
              <div className="hidden max-h-[70vh] overflow-auto overscroll-contain sm:block">
                <table className="w-full min-w-[700px] border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {["#", "Full Name", "E-mail", "Phone", "Company", "Designation"].map((header) => (
                        <th key={header} className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 px-4 py-3 font-semibold dark:border-gray-800 dark:bg-gray-900">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((item, index) => (
                      <tr key={item._id || index} className={"bg-white transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-white/[0.03]"}>
                        <td className="border-b border-gray-100 px-4 py-3.5 text-center text-gray-700 dark:border-gray-800 dark:text-gray-300">{startIndex + index + 1}</td>
                        <td className="border-b border-gray-100 px-4 py-3.5 text-center text-gray-700 dark:border-gray-800 dark:text-gray-300">
                          {`${item.first_name || ""} ${item.last_name || ""}`.trim()}
                        </td>
                        <td className="border-b border-gray-100 px-4 py-3.5 text-center text-gray-700 dark:border-gray-800 dark:text-gray-300">{item.email}</td>
                        <td className="border-b border-gray-100 px-4 py-3.5 text-center text-gray-700 dark:border-gray-800 dark:text-gray-300">{item.mobile_number}</td>
                        <td className="border-b border-gray-100 px-4 py-3.5 text-center text-gray-700 dark:border-gray-800 dark:text-gray-300">{item.company_name}</td>
                        <td className="border-b border-gray-100 px-4 py-3.5 text-center text-gray-700 dark:border-gray-800 dark:text-gray-300">{item.designation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="mt-6">
          <TablePagination
            page={currentPage}
            pageSize={itemsPerPage}
            total={filteredData.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setItemsPerPage(size);
              setCurrentPage(1);
            }}
            itemLabel="organisers"
          />
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
  <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900">
    <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">{title}</p>
    <p className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900 tabular-nums sm:text-3xl dark:text-white">{value}</p>
  </div>
);

