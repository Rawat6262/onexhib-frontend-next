"use client";

// Migrated from views/service/ServiceListView.jsx.
// Behaviour is unchanged; the presentation now uses the shared primitives in
// components/dashboard/ui.jsx so this screen matches the public site. The old
// markup set font-serif on the page root (the site is Poppins) and used
// blue-500/green-500/red-400 accents that appear nowhere on the public pages.
import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import {
  getAdminExhibitionServices,
  deleteExhibitionService,
} from "@/models/service.model";
import {
  PageHeader,
  Panel,
  StatCard,
  NoResults,
  btnPrimary,
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
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const itemsPerPage = 5;

  const fetchServices = async () => {
    try {
      const { data } = await getAdminExhibitionServices();
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
      [item.full_name, item.service_name, item.city, item.state, item.country, item.mobile_number].some(
        (field) => field?.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [services, search]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  const SERVICE_NAMES = [
    "Printing",
    "Furniture Rental",
    "LED / TV Rental",
    "Fabrication",
    "Protocol Staff",
    "Catalog Printing",
    "Corporate Gifting",
  ];

  // Count per service type
  const serviceCounts = SERVICE_NAMES.reduce((acc, name) => {
    acc[name] = services.filter((s) => s.service_name === name).length;
    return acc;
  }, {});

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        title="Exhibition services"
        intro="The service providers listed on your account, across the seven categories the platform supports."
        actions={
          <button type="button" className={btnPrimary} onClick={() => setShowModal(true)}>
            <Plus size={16} aria-hidden="true" />
            Add service
          </button>
        }
      />

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
        {SERVICE_NAMES.map((name) => (
          <StatCard key={name} label={name} value={serviceCounts[name] || 0} />
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
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => handlePageChange(page)}
                aria-current={page === currentPage ? "page" : undefined}
                className={page === currentPage ? pageBtnActive : pageBtn}
              >
                {page}
              </button>
            ))}
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

const pageBtn =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-sm text-gray-600 transition hover:border-[#131C55] hover:text-[#131C55] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:text-white";

const pageBtnActive =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-[#131C55] bg-[#131C55] text-sm font-medium text-white";
