"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Search } from "lucide-react";

import { getExhibitions } from "@/models/exhibition.model";
import { getPageNumbers } from "@/lib/paginate";
import {
  PageHeader,
  Panel,
  StatCard,
  NoResults,
  btnPrimary,
  btnSecondary,
  btnRow,
  inputBase,
  pill,
} from "@/components/dashboard/ui";

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
 * Unchanged: data fetching, search, pagination and every popup.
 * Changed: the shell comes from app/(dashboard)/layout.jsx, and the
 * presentation now uses the shared primitives in components/dashboard/ui.jsx
 * so this screen matches the public site. The old markup carried font-serif on
 * the page root (the site is Poppins), a hardcoded "SEM GROUP" title left over
 * from a demo, and blue-500/green-500 accents used nowhere else in the product.
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
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        title="Your exhibitions"
        intro="The exhibitions you have listed. Add one at a time, or import a batch from a spreadsheet."
        actions={
          <>
            <button type="button" className={btnSecondary} onClick={() => setorganiser(true)}>
              Organiser details
            </button>
            <button type="button" className={btnSecondary} onClick={() => setIsOpen(true)}>
              Upload Excel
            </button>
            <button type="button" className={btnPrimary} onClick={() => setShowModal(true)}>
              <Plus size={16} aria-hidden="true" />
              Add exhibition
            </button>
          </>
        }
      />

      {showorganiser && <OrganiserPopup Cl={() => setorganiser(false)} data={id} />}
      <ExhibitionUploadModal isOpen={isOpen} onClose={() => setIsOpen(false)} onSuccess={fetchExhibitions} />
      {showModal && (
        <ExhibitionPopupForm
          onClose={() => {
            setShowModal(false);
            fetchExhibitions();
          }}
        />
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 sm:max-w-md">
        <StatCard label="exhibitions listed" value={exhibitions.length} />
        <StatCard label="showing after search" value={filteredData.length} accent />
      </div>

      <Panel
        title="Exhibition list"
        count={`${filteredData.length} ${filteredData.length === 1 ? "exhibition" : "exhibitions"}`}
        toolbar={
          <div className="relative sm:w-72">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search exhibitions"
              aria-label="Search exhibitions"
              className={`${inputBase} pl-9`}
            />
          </div>
        }
      >
        {paginatedData.length === 0 ? (
          <NoResults>
            {search ? `No exhibitions match "${search}".` : "You have not added any exhibitions yet."}
          </NoResults>
        ) : (
          <>
            {/* Card list — phones only */}
            <ul className="list-none divide-y divide-gray-200 sm:hidden dark:divide-gray-800">
              {paginatedData.map((item, index) => (
                <li key={item._id || index} className="px-5 py-4">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {item.exhibition_name}
                  </p>
                  {item.category ? <p className={`${pill} mt-1.5`}>{item.category}</p> : null}
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {item.exhibition_address || "No address given"}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className={btnRow}
                      onClick={() => router.push(`/exhibitions/${item._id}`)}
                    >
                      View
                    </button>
                    <button type="button" className={btnRow} onClick={() => setEditingId(item._id)}>
                      <Pencil size={14} aria-hidden="true" />
                      Edit
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Table — sm and up. Row dividers rather than a border on every
                cell: the public site has no gridlines anywhere, and the boxed
                table was the loudest element on the page. */}
            <div className="hidden max-h-[70vh] overflow-auto overscroll-contain sm:block">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    {["#", "Exhibition", "Address", "Category", ""].map((header) => (
                      <th
                        key={header || "actions"}
                        scope="col"
                        className="sticky top-0 z-10 bg-gray-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-800/80 dark:text-gray-400"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {paginatedData.map((item, index) => (
                    <tr
                      key={item._id || index}
                      className="transition hover:bg-gray-50 motion-reduce:transition-none dark:hover:bg-gray-800/50"
                    >
                      <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-gray-100">
                        {item.exhibition_name}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">
                        {item.exhibition_address || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        {item.category ? <span className={pill}>{item.category}</span> : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className={btnRow}
                            onClick={() => router.push(`/exhibitions/${item._id}`)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className={btnRow}
                            onClick={() => setEditingId(item._id)}
                          >
                            <Pencil size={14} aria-hidden="true" />
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

        <ExhibitionEditPopup
          open={Boolean(editingId)}
          exhibitionId={editingId}
          onClose={() => setEditingId(null)}
        />

        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row dark:border-gray-800">
          <p className="text-[13px] text-gray-500 dark:text-gray-400">
            Showing{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {filteredData.length === 0 ? 0 : startIndex + 1}–
              {Math.min(startIndex + itemsPerPage, filteredData.length)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {filteredData.length}
            </span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={pageBtn}
              aria-label="Previous page"
            >
              ‹
            </button>
            {getPageNumbers(currentPage, totalPages).map((page, i) =>
              page === "..." ? (
                <span
                  key={`dots-${i}`}
                  className="flex h-8 w-8 items-center justify-center text-sm text-gray-400"
                >
                  …
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  onClick={() => handlePageChange(page)}
                  aria-current={page === currentPage ? "page" : undefined}
                  className={page === currentPage ? pageBtnActive : pageBtn}
                >
                  {page}
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={pageBtn}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

const pageBtn =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-sm text-gray-600 transition hover:border-[#131C55] hover:text-[#131C55] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:text-white";

const pageBtnActive =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-[#131C55] bg-[#131C55] text-sm font-medium text-white";
