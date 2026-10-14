"use client";

// Migrated from views/admin/AdminCompanyView.jsx.
// Behaviour, markup and classes are unchanged. The sidebar now comes from
// app/admin/layout.jsx, getPageNumbers moved to lib/paginate.js, and
// navigation uses next/navigation with the new clean routes.
import dynamic from "next/dynamic";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

import { toast } from "sonner";
import { getAdminCompaniesPage } from "@/models/company.model";
import { getAdminExhibitionsPage } from "@/models/exhibition.model";
import TablePagination from "@/components/dashboard/TablePagination";

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
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  // Server page size, sent as `limit`; the backend caps it at 500.
  const [itemsPerPage, setItemsPerPage] = useState(50);

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
    <div className="mx-auto w-full max-w-6xl px-4 py-8 text-gray-900 sm:px-6 sm:py-12 dark:text-gray-100">
      {/* Sidebar */}

      {/* Main Content */}
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#2B3FB8] dark:text-blue-300"><span aria-hidden="true" className="h-px w-6 bg-current opacity-60" />Admin</p>
            <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#2B3FB8] dark:text-blue-300"><span aria-hidden="true" className="h-px w-6 bg-current opacity-60" />Admin</p>
            <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-[2.6rem] dark:text-white">Company Dashboard</h1>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
          {[
            { title: "Total Companies", value: companyCount },
            { title: "Exhibitions", value: exhibition },
            { title: "Products", value: productCount },
          ].map((card) => (
            <div
              key={card.title}
              className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">{card.title}</p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900 tabular-nums sm:text-3xl dark:text-white">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Table Section */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white pb-2 shadow-sm shadow-gray-900/[0.03] dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
          {/* Controls */}
          <div className="flex w-full flex-col gap-4 border-b border-gray-200 bg-gradient-to-b from-gray-50/80 to-white px-5 py-4 lg:flex-row lg:items-center lg:justify-between dark:border-gray-800 dark:from-white/[0.02] dark:to-transparent">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
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
              className="h-10 rounded-xl border border-gray-300 bg-white px-3.5 text-sm text-gray-900 placeholder-gray-500 transition focus:border-[#2B3FB8] focus:outline-none focus:ring-4 focus:ring-[#2B3FB8]/15 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 w-full sm:w-64"
            />
          </div>

          {/* List */}
          <div className="w-full">
            {paginatedCompanies.length === 0 ? (
              <p className="px-5 py-12 text-center text-[15px] text-gray-500 dark:text-gray-400">No companies found</p>
            ) : (
              <>
                {/* Card list — phones only */}
                <div className="flex flex-col gap-3 px-4 py-4 sm:hidden">
                  {paginatedCompanies.map((c, index) => (
                    <div key={c._id || index} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
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
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 transition hover:border-[#2B3FB8] hover:text-[#2B3FB8] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-400 dark:hover:text-white mt-3 w-full"
                      >
                        View
                      </button>
                    </div>
                  ))}
                </div>

                {/* Table — sm and up */}
                <div className="hidden max-h-[70vh] overflow-auto overscroll-contain text-left sm:block">
                  <table className="w-full min-w-[700px] border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {["#", "Company Name", "Address", "Mobile Number", "Action"].map(
                          (header) => (
                            <th
                              key={header}
                              className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 px-4 py-3 font-semibold dark:border-gray-800 dark:bg-gray-900"
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
                          className={"bg-white transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-white/[0.03]"}
                        >
                          <td className="border-b border-gray-100 px-4 py-3.5 text-gray-700 dark:border-gray-800 dark:text-gray-300">
                            {startIndex + index + 1}
                          </td>
                          <td className="border-b border-gray-100 px-4 py-3.5 text-gray-700 dark:border-gray-800 dark:text-gray-300">
                            {c.company_name}
                          </td>
                          <td className="border-b border-gray-100 px-4 py-3.5 text-gray-700 dark:border-gray-800 dark:text-gray-300">
                            {c.company_address}
                          </td>
                          <td className="border-b border-gray-100 px-4 py-3.5 text-gray-700 dark:border-gray-800 dark:text-gray-300">
                            {c.company_phone_number}
                          </td>
                          <td className="border-b border-gray-100 px-4 py-3.5 text-gray-700 dark:border-gray-800 dark:text-gray-300">
                            <button
                              onClick={() => router.push(`/companies/${c._id}`)}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 transition hover:border-[#2B3FB8] hover:text-[#2B3FB8] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-400 dark:hover:text-white"
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

          <div className="mt-6">
            <TablePagination
              page={currentPage}
              pageSize={itemsPerPage}
              total={companyCount}
              totalPages={totalPages}
              shownCount={filteredCompanies.length}
              onPageChange={handlePageChange}
              onPageSizeChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
              pageSizeOptions={[25, 50, 100]}
              itemLabel="companies"
            />
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
