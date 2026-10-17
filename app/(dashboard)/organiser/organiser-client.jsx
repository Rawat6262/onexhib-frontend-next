"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Pencil, Plus, Search } from "lucide-react";
import TablePagination from "@/components/dashboard/TablePagination";

import { getExhibitions, getSharedExhibitions } from "@/models/exhibition.model";
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
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [id, setId] = useState(null);
  const router = useRouter();
  const [editingId, setEditingId] = useState(null);
  // Exhibitions an admin gave this user edit access to. Kept apart from their
  // own list: they can edit these but not delete them.
  const [shared, setShared] = useState([]);

  const fetchShared = useCallback(async () => {
    try {
      const { data } = await getSharedExhibitions();
      setShared(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setShared([]); // the section simply stays hidden
    }
  }, []);

  useEffect(() => {
    fetchShared();
  }, [fetchShared]);

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
  // A delete or a bigger page size can leave the current page past the end;
  // pull it back rather than showing an empty table under a valid-looking pager.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);
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
          onClose={() => {
            setEditingId(null);
            fetchShared(); // a renamed shared show should show its new name
          }}
        />

        <TablePagination
          page={currentPage}
          pageSize={itemsPerPage}
          total={filteredData.length}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) => {
            setItemsPerPage(size);
            setCurrentPage(1);
          }}
          itemLabel="exhibitions"
        />
      </Panel>

      {shared.length > 0 && <SharedWithYou items={shared} onEdit={setEditingId} />}
    </div>
  );
}

const dateRange = (a, b) => {
  const fmt = (d) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "";
  const from = fmt(a);
  const to = fmt(b);
  return from && to && from !== to ? `${from} – ${to}` : from || to || "Dates not set";
};

/** Listings the OneXhib team created and an admin let this organiser edit. */
function SharedWithYou({ items, onEdit }) {
  const router = useRouter();
  return (
    <section aria-labelledby="shared-title" className="mt-10">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2B3FB8]/10 text-[#2B3FB8] dark:bg-blue-400/15 dark:text-blue-300">
          <KeyRound size={17} aria-hidden="true" />
        </span>
        <div>
          <h2 id="shared-title" className="text-lg font-bold text-gray-900 dark:text-gray-50">
            Shared with you
            <span className="ml-2 align-middle text-sm font-medium text-gray-500 dark:text-gray-400">{items.length}</span>
          </h2>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
            The OneXhib team gave you access to keep these listings up to date. You can edit them, but not
            delete them.
          </p>
        </div>
      </div>

      <ul className="mt-4 grid list-none grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item._id}
            className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-900/[0.03] transition hover:border-[#2B3FB8]/40 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-400/40"
          >
            <p className="font-semibold text-gray-900 dark:text-gray-100">{item.exhibition_name}</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {dateRange(item.starting_date, item.ending_date)}
            </p>
            {item.exhibition_address ? (
              <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-500" title={item.exhibition_address}>
                {item.exhibition_address}
              </p>
            ) : null}
            <div className="mt-auto flex items-center justify-between gap-2 pt-4">
              {item.category ? <span className={`${pill} truncate`}>{item.category}</span> : <span />}
              <div className="flex shrink-0 gap-2">
                <button type="button" className={btnRow} onClick={() => router.push(`/exhibitions/${item._id}`)}>
                  View
                </button>
                <button type="button" className={btnRow} onClick={() => onEdit(item._id)}>
                  <Pencil size={14} aria-hidden="true" />
                  Edit
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
