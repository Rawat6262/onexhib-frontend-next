"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

import { getExhibitions } from "@/models/exhibition.model";
import { getPageNumbers } from "@/lib/paginate";

// Modals are only needed once opened, so their code (and for the location
// forms, country-state-city's ~2.3 MB dataset) is split out of this page's
// first-load bundle.
const ExhibitionPopupForm = dynamic(() => import("@/components/popups/ExhibitionPopupForm"), { ssr: false });
const OrganiserPopup = dynamic(() => import("@/components/organiser/OrganiserDetailsPopup"), { ssr: false });
const ExhibitionEditPopup = dynamic(() => import("@/components/popups/OrganiserEditPopup"), { ssr: false });
const ExhibitionUploadModal = dynamic(() => import("@/components/popups/ExhibitionUploadModal"), { ssr: false });

/**
 * Migrated from views/organiser/OrganiserView.jsx.
 *
 * Unchanged: data fetching, search, pagination, all popups and every class.
 * Changed: the sidebar is no longer rendered here (app/(dashboard)/layout.jsx
 * owns it), and navigation targets use the new clean routes.
 */
export default function OrganiserClient() {
  const [isOpen, setIsOpen] = useState(false);
  const [showorganiser, setorganiser] = useState(false);
  const [exhibitions, setExhibitions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [id, setId] = useState(null);
  const router = useRouter();
  const [editingId, setEditingId] = useState(null);

  const fetchExhibitions = useCallback(async () => {
    try {
      const { data: exhibitionsPage } = await getExhibitions();
      const data = exhibitionsPage?.data;

      if (Array.isArray(data) && data.length > 0) {
        setId(data[0]?.createdby || null);
        setExhibitions(data);
      } else {
        setId(null);
        setExhibitions([]);
      }
    } catch (error) {
      console.error("Error fetching exhibitions:", error.message);
    }
  }, []);

  useEffect(() => {
    fetchExhibitions();
  }, [fetchExhibitions]);

  const filteredData = useMemo(() => {
    return exhibitions.filter((item) =>
      [item.exhibition_name, item.category, item.exhibition_address].some((field) =>
        field?.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [exhibitions, search]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-serif">
      <div className="flex-1 w-full mt-8 flex flex-col border border-gray-300 dark:border-gray-700 md:mx-4 lg:mx-6 bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-y-auto">
        {/* Header */}
        <div className="h-20 w-full flex flex-col sm:flex-row justify-between items-center px-8 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 rounded-t-lg">
          <h1 className="flex-1 font-bold text-3xl tracking-wide">SEM GROUP</h1>
          <button
            onClick={() => setorganiser(true)}
            className="h-10 w-full sm:w-64 border-2 border-blue-500 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950 rounded-md font-semibold transition-colors"
          >
            View Organiser Details
          </button>
          {showorganiser && <OrganiserPopup Cl={() => setorganiser(false)} data={id} />}
        </div>

        {/* Summary Cards */}
        <div className="w-full px-3 sm:px-4 mt-6 grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-6 justify-start">
          {[{ title: "Exhibitions", value: exhibitions.length }, { title: "Companies", value: 1 }].map(
            (card) => (
              <div
                key={card.title}
                className="h-20 sm:h-24 sm:w-48 rounded-xl flex flex-col justify-center items-center bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 shadow-sm px-2"
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
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search Exhibitions"
                className="h-10 w-full sm:w-64 border border-gray-400 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                className="h-10 w-full sm:w-48 border-2 border-blue-500 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950 rounded-md font-semibold transition-colors"
                onClick={() => setIsOpen(true)}
              >
                Upload Excel
              </button>
              <button
                className="h-10 w-full sm:w-48 border-2 border-blue-500 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950 rounded-md font-semibold transition-colors"
                onClick={() => setShowModal(true)}
              >
                + Add Exhibition
              </button>

              <ExhibitionUploadModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSuccess={fetchExhibitions}
              />
            </div>
          </div>

          {showModal && (
            <ExhibitionPopupForm
              onClose={() => {
                setShowModal(false);
                fetchExhibitions();
              }}
            />
          )}

          {/* List */}
          <div className="flex-1 w-full mt-6">
            {paginatedData.length === 0 ? (
              <p className="p-6 text-center text-gray-600 dark:text-gray-400 italic">No data found</p>
            ) : (
              <>
                {/* Card list — phones only */}
                <div className="sm:hidden flex flex-col gap-3 px-4">
                  {paginatedData.map((item, index) => (
                    <div key={item._id || index} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-4">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {startIndex + index + 1}. {item.exhibition_name}
                      </p>
                      <dl className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex gap-1">
                          <dt className="font-medium text-gray-500 dark:text-gray-400">Category:</dt>
                          <dd>{item.category || "—"}</dd>
                        </div>
                        <div className="flex gap-1">
                          <dt className="font-medium text-gray-500 dark:text-gray-400">Address:</dt>
                          <dd className="truncate">{item.exhibition_address || "—"}</dd>
                        </div>
                      </dl>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          className="flex-1 border-2 border-blue-500 text-blue-500 dark:text-blue-400 rounded-md px-3 py-1.5 hover:bg-blue-100 dark:hover:bg-blue-950 transition-colors"
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
                      </div>
                    </div>
                  ))}
                </div>

                {/* Table — sm and up */}
                <div className="hidden sm:block overflow-auto max-h-[70vh] overscroll-contain rounded-md text-left">
                  <table className="w-full min-w-[700px] border-collapse border border-gray-300 dark:border-gray-700">
                    <thead>
                      <tr className="bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-b border-gray-300 dark:border-gray-700">
                        {["#", "Exhibition Name", "Address", "Category", "Action"].map((header) => (
                          <th
                            key={header}
                            className="px-4 py-3 border-r border-gray-300 dark:border-gray-700 last:border-r-0 sticky top-0 z-10 bg-gray-200 dark:bg-gray-800 shadow-[inset_-1px_-1px_0_0_#d1d5db] dark:shadow-[inset_-1px_-1px_0_0_#374151] last:shadow-[inset_0_-1px_0_0_#d1d5db] dark:last:shadow-[inset_0_-1px_0_0_#374151]"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((item, index) => (
                        <tr
                          key={item._id || index}
                          className={index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"}
                        >
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">
                            {startIndex + index + 1}
                          </td>
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">
                            {item.exhibition_name}
                          </td>
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">
                            {item.exhibition_address}
                          </td>
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">
                            {item.category}
                          </td>
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700 flex gap-2">
                            <button
                              className="border-2 border-blue-500 text-blue-500 dark:text-blue-400 rounded-md px-3 py-1 hover:bg-blue-100 dark:hover:bg-blue-950 transition-colors"
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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <ExhibitionEditPopup
            open={Boolean(editingId)}
            exhibitionId={editingId}
            onClose={() => setEditingId(null)}
          />

          {/* Pagination Controls */}
          <div className="mt-6 px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {filteredData.length === 0 ? 0 : startIndex + 1}–
                {Math.min(startIndex + itemsPerPage, filteredData.length)}
              </span>{" "}
              of <span className="font-medium text-gray-700 dark:text-gray-300">{filteredData.length}</span> exhibitions
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
