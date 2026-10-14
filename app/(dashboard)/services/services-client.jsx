"use client";

// Migrated from views/service/ServiceListView.jsx.
// Behaviour is unchanged; the presentation now uses the shared primitives in
// components/dashboard/ui.jsx so this screen matches the public site. The old
// markup set font-serif on the page root (the site is Poppins) and used
// blue-500/green-500/red-400 accents that appear nowhere on the public pages.
import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";
import ServiceExcelUploadModal from "@/components/popups/ServiceExcelUploadModal";
import { Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import TablePagination from "@/components/dashboard/TablePagination";

import {
  getMyExhibitionServices,
  deleteExhibitionService,
} from "@/models/service.model";
import { SERVICE_CATEGORIES, canonicalServiceCategory } from "@/lib/service-taxonomy";
import {
  PageHeader,
  Panel,
  StatCard,
  NoResults,
  btnPrimary,
  btnSecondary,
  btnRow,
  btnRowDanger,
  inputBase,
  pill,
} from "@/components/dashboard/ui";

// Modals are only needed once opened, so their code (and for the location
// forms, country-state-city's ~2.3 MB dataset) is split out of this page's
// first-load bundle.
const ExhibitionServicePopupForm = dynamic(() => import("@/components/popups/ExhibitionServicePopupForm"), { ssr: false });
const ServiceEditPopup = dynamic(() => import("@/components/popups/ExhibitionServiceEditForm"), { ssr: false });

export default function ServicesClient() {
  const [services, setServices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchServices = async () => {
    try {
      /*
       * THE OWNER'S OWN LISTINGS ONLY.
       *
       * This used to call getAdminExhibitionServices, which is the PUBLIC endpoint
       * backing /exhibition-services - so every provider saw every other provider's
       * listings here, each with an Edit and a Delete button beside it. The buttons
       * never actually worked on somebody else's row (the backend pins ownership on
       * both mutations and answers 404 to a stranger), but the rows should not have
       * been on this page to click in the first place.
       *
       * /api/myexhibitionservices scopes to req.user._id with no id in the path or
       * query, so there is nothing to point at another account.
       */
      const { data } = await getMyExhibitionServices();
      if (data.success) {
        setServices(data.data);
      }
    } catch (error) {
      console.error("Error fetching services:", error.message);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this service?")) return;
    try {
      await deleteExhibitionService(id);
      setServices((prev) => prev.filter((s) => s._id !== id));
    } catch (error) {
      console.error("Delete failed:", error.message);
    }
  };

  const filteredData = useMemo(() => {
    return services.filter((item) =>
      [
        item.full_name,
        item.service_name,
        // Searchable too: "banners" is how a provider thinks of the listing, and
        // without this the only way to find it is by remembering the category.
        item.service_subcategory,
        item.city,
        item.state,
        item.country,
        item.mobile_number,
      ].some(
        (field) => field?.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [services, search]);

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

  /*
   * Per-category counts for the stat cards, over the CANONICAL category name.
   *
   * Resolved rather than matched literally, for the same reason the public
   * directory resolves: a listing written before the taxonomy migration still says
   * "Fabrication", and a literal match would count it under nothing and show the
   * provider a row of zeroes beside a table full of their own listings.
   *
   * ONLY THE CATEGORIES THIS PROVIDER ACTUALLY USES get a card. All 35 would be two
   * dozen zeroes - the hub's job is to describe what the platform supports; this
   * screen's job is to describe what THIS account has listed. Ordered by the
   * taxonomy so the cards do not reshuffle when a count changes.
   */
  const serviceCounts = services.reduce((acc, item) => {
    const resolved = canonicalServiceCategory(item.service_name, item.service_subcategory);
    const key = resolved ? resolved.category : null;
    if (key) acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const usedCategories = SERVICE_CATEGORIES.filter((name) => serviceCounts[name]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        title="Exhibition services"
        intro={`The service providers listed on your account, across the ${SERVICE_CATEGORIES.length} categories the platform supports.`}
        actions={
          <div className="flex items-center gap-2">
            <button type="button" className={btnSecondary} onClick={() => setShowUpload(true)}>
              <Upload size={16} aria-hidden="true" />
              Upload Excel
            </button>
            <button type="button" className={btnPrimary} onClick={() => setShowModal(true)}>
              <Plus size={16} aria-hidden="true" />
              Add service
            </button>
          </div>
        }
      />

      {showUpload && (
        <ServiceExcelUploadModal
          isOpen={showUpload}
          onClose={() => setShowUpload(false)}
          /* Refetch rather than splice the response in: a partial import inserts some rows
             and rejects others, so the server's list is the only accurate picture. */
          onSuccess={() => {
            setShowUpload(false);
            fetchServices();
          }}
        />
      )}

      {showModal && (
        <ExhibitionServicePopupForm
          onClose={() => {
            setShowModal(false);
            fetchServices();
          }}
        />
      )}

      {/* Totals first, then the per-category breakdown. Same StatCard as the
          organiser screen, so the two pages read as one product. */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="services listed" value={services.length} accent />
        {usedCategories.map((name) => (
          <StatCard key={name} label={name} value={serviceCounts[name]} />
        ))}
      </div>

      <Panel
        title="Service providers"
        count={`${filteredData.length} ${filteredData.length === 1 ? "provider" : "providers"}`}
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
              placeholder="Search services"
              aria-label="Search services"
              className={`${inputBase} pl-9`}
            />
          </div>
        }
      >
        {paginatedData.length === 0 ? (
          <NoResults>
            {search ? `No services match "${search}".` : "No services have been added yet."}
          </NoResults>
        ) : (
          <>
            {/* Card list — phones only */}
            <ul className="list-none divide-y divide-gray-200 sm:hidden dark:divide-gray-800">
              {paginatedData.map((item, index) => (
                <li key={item._id || index} className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar item={item} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900 dark:text-gray-100">
                        {item.full_name}
                      </p>
                      <span className={`${pill} mt-1`}>{item.service_name}</span>
                      {item.service_subcategory ? (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {item.service_subcategory}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <dl className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex gap-1.5">
                      <dt className="text-gray-500 dark:text-gray-500">Location</dt>
                      <dd className="truncate">
                        {[item.city, item.state, item.country].filter(Boolean).join(", ") || "—"}
                      </dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-gray-500 dark:text-gray-500">Mobile</dt>
                      <dd>{item.mobile_number || "—"}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex gap-2">
                    <button type="button" className={btnRow} onClick={() => setEditingId(item._id)}>
                      <Pencil size={14} aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      type="button"
                      className={btnRowDanger}
                      onClick={() => handleDelete(item._id)}
                      disabled={deletingId === item._id}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Table — sm and up */}
            <div className="hidden max-h-[70vh] overflow-auto overscroll-contain sm:block">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    {["#", "", "Name", "Service", "Location", "Mobile", ""].map((header, i) => (
                      <th
                        key={header || `col-${i}`}
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
                      <td className="py-3.5 pl-5 pr-0">
                        <Avatar item={item} />
                      </td>
                      <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-gray-100">
                        {item.full_name}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={pill}>{item.service_name}</span>
                        {item.service_subcategory ? (
                          <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                            {item.service_subcategory}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">
                        {[item.city, item.state, item.country].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">
                        {item.mobile_number || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className={btnRow}
                            onClick={() => setEditingId(item._id)}
                          >
                            <Pencil size={14} aria-hidden="true" />
                            Edit
                          </button>
                          <button
                            type="button"
                            className={btnRowDanger}
                            onClick={() => handleDelete(item._id)}
                            disabled={deletingId === item._id}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                            Delete
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

        {/* Mounted only while editing, exactly as before: the popup takes
            {serviceId, onClose} and fetches on mount, so it must not render
            with a null id. */}
        {editingId && (
          <ServiceEditPopup
            serviceId={editingId}
            onClose={() => {
              setEditingId(null);
              fetchServices();
            }}
          />
        )}

        <TablePagination
          page={currentPage}
          pageSize={itemsPerPage}
          total={filteredData.length}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) => {
            setItemsPerPage(size);
            setCurrentPage(1);
          }}
          itemLabel="providers"
        />
      </Panel>
    </div>
  );
}

/** Provider avatar, falling back to an initial on the brand navy. */
function Avatar({ item }) {
  if (item.image?.url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- provider images are
      // arbitrary remote URLs, not in next.config remotePatterns.
      <img
        src={item.image.url}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full border border-gray-200 object-cover dark:border-gray-700"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#131C55] text-xs font-bold text-white"
    >
      {item.full_name?.charAt(0).toUpperCase() || "?"}
    </div>
  );
}
