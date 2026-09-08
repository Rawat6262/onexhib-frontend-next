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

  const itemsPerPage = 5;

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
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCompanies = filteredCompanies.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="flex-1 w-full mt-8 flex flex-col border border-gray-300 dark:border-gray-700 md:mx-4 lg:mx-6 bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-y-auto">
        {/* Header */}
        <div className="w-full flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between items-center px-4 sm:px-8 py-4 sm:h-20 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 rounded-t-lg">
          <h1 className="flex-1 font-bold text-2xl sm:text-3xl tracking-wide">
            {exhibition.exhibition_name || "Exhibition"}
          </h1>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              className="h-10 w-full sm:w-48 border border-[#131C55] text-[#131C55] dark:text-blue-300 hover:bg-[#131C55]/5 dark:hover:bg-blue-400/10 rounded-lg font-semibold transition-colors"
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
        <div className="w-full px-3 sm:px-4 mt-6 grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-6 justify-start">
          {[
            { title: "Total Companies", value: companies.length },
            { title: "Exhibition Stats", value: "Active" },
          ].map((card) => (
            <div
              key={card.title}
              className="h-20 sm:h-24 sm:w-48 rounded-xl flex flex-col justify-center items-center bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 shadow-sm px-2"
            >
              <p className="text-xs sm:text-lg font-medium text-gray-700 dark:text-gray-300 text-center">{card.title}</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Table Section */}
        <div className="flex-1 w-full px-3 sm:px-4 mt-8 rounded-b-lg border border-t-0 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm pb-8 mb-8">
          {/* Controls */}
          <div className="py-4 w-full flex flex-col lg:flex-row justify-between gap-4 px-4 text-center">
            <h2 className="font-bold text-2xl sm:text-3xl text-gray-800 dark:text-gray-100">Company List</h2>
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
                className="h-10 w-full sm:w-48 border border-[#131C55] text-[#131C55] dark:text-blue-300 hover:bg-[#131C55]/5 dark:hover:bg-blue-400/10 rounded-lg font-semibold transition-colors"
              >
                + Add News
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="h-10 w-full sm:w-48 border border-[#131C55] text-[#131C55] dark:text-blue-300 hover:bg-[#131C55]/5 dark:hover:bg-blue-400/10 rounded-lg font-semibold transition-colors"
              >
                + Add Company
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="h-10 w-full sm:w-48 border border-[#131C55] text-[#131C55] dark:text-blue-300 hover:bg-[#131C55]/5 dark:hover:bg-blue-400/10 rounded-lg font-semibold transition-colors"
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
          <div className="flex-1 w-full mt-6">
            {paginatedCompanies.length === 0 ? (
              <p className="p-6 text-center text-gray-600 dark:text-gray-400 italic">No companies found</p>
            ) : (
              <>
                {/* Card list — phones only */}
                <div className="sm:hidden flex flex-col gap-3 px-4">
                  {paginatedCompanies.map((c, index) => (
                    <div key={c._id || index} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4">
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
                          className="flex-1 border border-[#131C55] text-[#131C55] dark:text-blue-300 rounded-lg px-3 py-1.5 hover:bg-[#131C55]/5 dark:hover:bg-blue-400/10 transition-colors"
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
                <div className="hidden sm:block overflow-auto max-h-[70vh] overscroll-contain rounded-lg text-left">
                  <table className="w-full min-w-[700px] border-collapse border border-gray-300 dark:border-gray-700">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 border-b border-gray-300 dark:border-gray-700 text-center">
                        {["#", "Company Name", "Email", "Phone", "Action"].map((header) => (
                          <th
                            key={header}
                            className="px-4 py-3 border-r border-gray-300 dark:border-gray-700 last:border-r-0 sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/80 shadow-[inset_-1px_-1px_0_0_#d1d5db] dark:shadow-[inset_-1px_-1px_0_0_#374151] last:shadow-[inset_0_-1px_0_0_#d1d5db] dark:last:shadow-[inset_0_-1px_0_0_#374151] text-center"
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
                          className={index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"}
                        >
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700 text-center">
                            {startIndex + index + 1}
                          </td>
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700 text-center">
                            {c.company_name}
                          </td>
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700 text-center">
                            {c.company_email}
                          </td>
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700 text-center">
                            {c.company_phone_number}
                          </td>
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700 flex justify-center gap-4">
                            <button
                              onClick={() => router.push(`/companies/${c._id}`)}
                              className="border border-[#131C55] text-[#131C55] dark:text-blue-300 rounded-lg px-3 py-1 hover:bg-[#131C55]/5 dark:hover:bg-blue-400/10 transition-colors"
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

          {/* Pagination */}
          <div className="mt-6 flex justify-center gap-4 items-center">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-[#131C55] text-[#131C55] dark:text-blue-300 rounded-lg hover:bg-[#131C55]/5 dark:hover:bg-blue-400/10 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-gray-700 dark:text-gray-300 font-semibold">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-[#131C55] text-[#131C55] dark:text-blue-300 rounded-lg hover:bg-[#131C55]/5 dark:hover:bg-blue-400/10 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
