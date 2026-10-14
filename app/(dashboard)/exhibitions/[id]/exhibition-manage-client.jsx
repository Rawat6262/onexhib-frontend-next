"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  deleteExhibition as deleteExhibitionRequest,
  adminDeleteExhibition,
  findExhibitionByOrganiser,
} from "@/models/exhibition.model";
import { getCompaniesForExhibition } from "@/models/company.model";
import { useAuth } from "@/components/auth/AuthProvider";
import { ROLES } from "@/lib/auth";
import TablePagination from "@/components/dashboard/TablePagination";

// Modals are only needed once opened, so their code (and for the location
// forms, country-state-city's ~2.3 MB dataset) is split out of this page's
// first-load bundle.
const CompanyPopupForm = dynamic(() => import("@/components/popups/CompanyPopupForm"), { ssr: false });
const ExhibitionPopup = dynamic(() => import("@/components/popups/ExhibitionPopup"), { ssr: false });
const CompanyEditPopup = dynamic(() => import("@/components/popups/CompanyEditPopup"), { ssr: false });
const CompanyExcelUploadModal = dynamic(() => import("@/components/popups/CompanyExcelUploadModal"), { ssr: false });
const AddNewsModal = dynamic(() => import("@/components/news/AddNewsModal"), { ssr: false });

/**
 * Migrated from views/organiser/ExhibitionManageView.jsx.
 *
 * Unchanged: fetching, search, pagination, delete flow, every popup and class.
 *
 * Changed:
 *  - the sidebar is rendered by app/(dashboard)/layout.jsx, not here;
 *  - `id` arrives as a prop from the Server Component page, not useParams();
 *  - admin mode is derived from the signed-in user's role. The Vite version read
 *    it from React Router's location.state, which has no App Router equivalent —
 *    and which any user could set by navigating with their own state object.
 *    Reading the role instead is both portable and harder to spoof (Express
 *    still authorises the delete either way).
 */
export default function ExhibitionManageClient({ id }) {
  const router = useRouter();
  const { role } = useAuth();
  const isAdmin = role === ROLES.ADMIN;

  const [exhibition, setExhibition] = useState({});
  const [companies, setCompanies] = useState([]);
  const [showdetail, setDetails] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showFormnew, setShowFormnew] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState(null);

  const [itemsPerPage, setItemsPerPage] = useState(10);

  const deleteExhibition = async () => {
    try {
      if (!window.confirm("Are you sure you want to delete this exhibition?")) return;

      if (isAdmin) {
        await adminDeleteExhibition(id);
      } else {
        await deleteExhibitionRequest(id);
      }
      toast.success("Exhibition deleted successfully!");
      router.push(isAdmin ? "/admin/organisers" : "/organiser");
    } catch (err) {
      console.error("Error deleting exhibition:", err);
      toast.error("Failed to delete exhibition");
    }
  };

  const fetchExhibitionData = useCallback(async () => {
    try {
      const { data } = await findExhibitionByOrganiser(id);
      setExhibition(data);
    } catch (err) {
      console.error("Error fetching exhibition:", err);
    }
  }, [id]);

  const fetchCompany = useCallback(async () => {
    try {
      const { data } = await getCompaniesForExhibition(id);
      setCompanies(Array.isArray(data) ? data : [data]);
    } catch (error) {
      console.error("Error fetching company:", error.response?.data?.message || error.message);
    }
  }, [id]);

  const filteredCompanies = useMemo(() => {
    const query = (search || "").trim().toLowerCase();
    if (!query) return companies;

    return companies.filter((c, index) => {
      const rowNumber = String(index + 1);
      return (
        rowNumber.includes(query) ||
        String(c?.company_name || "").toLowerCase().includes(query) ||
        String(c?.company_email || "").toLowerCase().includes(query) ||
        String(c?.company_phone_number || "").toLowerCase().includes(query)
      );
    });
  }, [companies, search]);

  useEffect(() => {
    fetchExhibitionData();
    fetchCompany();
  }, [fetchExhibitionData, fetchCompany]);

  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage) || 1;
  // A delete or a bigger page size can leave the current page past the end.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCompanies = filteredCompanies.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 text-gray-900 sm:px-6 sm:py-12 dark:text-gray-100">
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="flex-1 text-3xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-[2.6rem] dark:text-white">
            {exhibition.exhibition_name || "Exhibition"}
          </h1>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 transition hover:border-[#2B3FB8] hover:text-[#2B3FB8] sm:w-48 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-blue-400"
              onClick={() => setDetails(true)}
            >
              Exhibition Details
            </button>
            {showdetail && <ExhibitionPopup onClose={() => setDetails(false)} exhibitionId={id} />}
            <button
              className="h-10 w-full sm:w-48 border border-red-500 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950 rounded-lg font-semibold transition-colors"
              onClick={deleteExhibition}
            >
              Delete Exhibition
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-4">
          {[
            { title: "Total Companies", value: companies.length },
            { title: "Exhibition Stats", value: "Active" },
          ].map((card) => (
            <div
              key={card.title}
              className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-4 sm:w-48 dark:border-gray-800 dark:bg-gray-900"
            >
              <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">{card.title}</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Table Section */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white pb-2 shadow-sm shadow-gray-900/[0.03] dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
          {/* Controls */}
          <div className="flex w-full flex-col gap-4 border-b border-gray-200 bg-gradient-to-b from-gray-50/80 to-white px-5 py-4 text-center lg:flex-row lg:items-center lg:justify-between dark:border-gray-800 dark:from-white/[0.02] dark:to-transparent">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Company List</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by name, email, phone or #..."
                className="h-10 w-full sm:w-64 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 px-3 focus:outline-none focus:ring-1 focus:ring-[#131C55]/20"
              />

              <button
                onClick={() => setShowFormnew(true)}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 transition hover:border-[#2B3FB8] hover:text-[#2B3FB8] sm:w-48 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-blue-400"
              >
                + Add News
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 transition hover:border-[#2B3FB8] hover:text-[#2B3FB8] sm:w-48 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-blue-400"
              >
                + Add Company
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 transition hover:border-[#2B3FB8] hover:text-[#2B3FB8] sm:w-48 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-blue-400"
              >
                Upload Excel
              </button>

              {showFormnew && <AddNewsModal onClose={() => setShowFormnew(false)} />}
              {showForm && (
                <CompanyPopupForm
                  Close={() => setShowForm(false)}
                  data={id}
                  onCompanyAdded={fetchCompany}
                />
              )}
              <CompanyExcelUploadModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                onSuccess={fetchCompany}
                exhibitionId={id}
              />
            </div>
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
                          <dt className="font-medium text-gray-500 dark:text-gray-400">Email:</dt>
                          <dd className="truncate">{c.company_email || "—"}</dd>
                        </div>
                        <div className="flex gap-1">
                          <dt className="font-medium text-gray-500 dark:text-gray-400">Phone:</dt>
                          <dd>{c.company_phone_number || "—"}</dd>
                        </div>
                      </dl>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => router.push(`/companies/${c._id}`)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 transition hover:border-[#2B3FB8] hover:text-[#2B3FB8] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-400 dark:hover:text-white flex-1"
                        >
                          View
                        </button>
                        <button
                          onClick={() => setEditingId(c._id)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300 rounded-lg hover:border-[#131C55] hover:text-[#131C55] dark:hover:border-gray-500 transition"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Table — sm and up */}
                <div className="hidden max-h-[70vh] overflow-auto overscroll-contain text-left sm:block">
                  <table className="w-full min-w-[700px] border-collapse text-sm">
                    <thead>
                      <tr className="text-center text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {["#", "Company Name", "Email", "Phone", "Action"].map((header) => (
                          <th
                            key={header}
                            className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 px-4 py-3 font-semibold dark:border-gray-800 dark:bg-gray-900"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCompanies.map((c, index) => (
                        <tr
                          key={c._id || index}
                          className={"bg-white transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-white/[0.03]"}
                        >
                          <td className="border-b border-gray-100 px-4 py-3.5 text-center text-gray-700 dark:border-gray-800 dark:text-gray-300">
                            {startIndex + index + 1}
                          </td>
                          <td className="border-b border-gray-100 px-4 py-3.5 text-center text-gray-700 dark:border-gray-800 dark:text-gray-300">
                            {c.company_name}
                          </td>
                          <td className="border-b border-gray-100 px-4 py-3.5 text-center text-gray-700 dark:border-gray-800 dark:text-gray-300">
                            {c.company_email}
                          </td>
                          <td className="border-b border-gray-100 px-4 py-3.5 text-center text-gray-700 dark:border-gray-800 dark:text-gray-300">
                            {c.company_phone_number}
                          </td>
                          <td className="flex justify-center gap-2 border-b border-gray-100 px-4 py-3.5 dark:border-gray-800">
                            <button
                              onClick={() => router.push(`/companies/${c._id}`)}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 transition hover:border-[#2B3FB8] hover:text-[#2B3FB8] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-400 dark:hover:text-white"
                            >
                              View
                            </button>
                            <button
                              onClick={() => setEditingId(c._id)}
                              className="flex items-center gap-1 px-3 py-1 border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300 rounded-lg hover:border-[#131C55] hover:text-[#131C55] dark:hover:border-gray-500 transition"
                            >
                              Edit
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

          <CompanyEditPopup
            open={Boolean(editingId)}
            companyId={editingId}
            onClose={() => setEditingId(null)}
          />

          <div className="mt-6">
          <TablePagination
            page={currentPage}
            pageSize={itemsPerPage}
            total={filteredCompanies.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setItemsPerPage(size);
              setCurrentPage(1);
            }}
            itemLabel="companies"
          />
          </div>
        </div>
      </div>
    </div>
  );
}
