"use client";

// Migrated from views/service/ServiceListView.jsx.
// Behaviour, markup and classes are unchanged. The sidebar comes from
// app/(dashboard)/layout.jsx and navigation uses next/navigation with the
// new clean routes.
import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";

import {
  getAdminExhibitionServices,
  deleteExhibitionService,
} from "@/models/service.model";

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
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-serif">

      <div className="flex-1 w-full mt-8 flex flex-col border border-gray-300 dark:border-gray-700 md:mx-4 lg:mx-6 bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-y-auto">
        {/* Header */}
        <div className="h-20 w-full flex flex-col sm:flex-row justify-between items-center px-8 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 rounded-t-lg">
          <h1 className="flex-1 font-bold text-3xl tracking-wide">Services</h1>
        </div>

        {/* Summary Cards */}
        <div className="w-full px-3 sm:px-4 mt-6 grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 justify-start">
          <div className="h-20 sm:h-24 sm:w-48 rounded-xl flex flex-col justify-center items-center bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 shadow-sm px-2">
            <p className="text-xs sm:text-lg font-medium text-gray-700 dark:text-gray-300 text-center">Total Services</p>
            <p className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">{services.length}</p>
          </div>
          {SERVICE_NAMES.map((name) => (
            <div
              key={name}
              className="h-20 sm:h-24 sm:w-48 rounded-xl flex flex-col justify-center items-center bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 shadow-sm px-2 text-center"
            >
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 leading-tight">{name}</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">{serviceCounts[name] || 0}</p>
            </div>
          ))}
        </div>

        {/* Table Section */}
        <div className="flex-1 w-full px-3 sm:px-4 mt-8 rounded-b-lg border border-t-0 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm pb-8 mb-8">
          {/* Controls */}
          <div className="py-4 w-full flex flex-col lg:flex-row justify-between gap-4 px-4 text-center">
            <h2 className="font-bold text-2xl sm:text-3xl text-gray-800 dark:text-gray-100">Service Providers</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search Services"
                className="h-10 w-full sm:w-64 border border-gray-400 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                className="h-10 w-full sm:w-48 border-2 border-blue-500 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950 rounded-md font-semibold transition-colors"
                onClick={() => setShowModal(true)}
              >
                + Add Service
              </button>
            </div>
          </div>

          {showModal && (
            <ExhibitionServicePopupForm
              onClose={() => {
                setShowModal(false);
                fetchServices();
              }}
            />
          )}

          {/* List */}
          <div className="flex-1 w-full mt-6">
            {paginatedData.length === 0 ? (
              <p className="p-6 text-center text-gray-600 dark:text-gray-400 italic">No services found</p>
            ) : (
              <>
                {/* Card list — phones only */}
                <div className="sm:hidden flex flex-col gap-3 px-4">
                  {paginatedData.map((item, index) => (
                    <div key={item._id || index} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-4">
                      <div className="flex items-center gap-3">
                        {item.image?.url ? (
                          <img
                            src={item.image.url}
                            alt={item.full_name}
                            className="h-10 w-10 rounded-full object-cover border border-gray-300 dark:border-gray-700 shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300 text-xs font-bold">
                            {item.full_name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {startIndex + index + 1}. {item.full_name}
                          </p>
                          <span className="inline-block mt-0.5 px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full border border-blue-200 dark:border-blue-900">
                            {item.service_name}
                          </span>
                        </div>
                      </div>
                      <dl className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex gap-1">
                          <dt className="font-medium text-gray-500 dark:text-gray-400">Location:</dt>
                          <dd className="truncate">{[item.city, item.state, item.country].filter(Boolean).join(", ") || "—"}</dd>
                        </div>
                        <div className="flex gap-1">
                          <dt className="font-medium text-gray-500 dark:text-gray-400">Mobile:</dt>
                          <dd>{item.mobile_number || "—"}</dd>
                        </div>
                      </dl>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-green-500 text-green-600 dark:text-green-400 rounded-md hover:bg-green-50 dark:hover:bg-green-950 transition text-sm font-medium"
                          onClick={() => setEditingId(item._id)}
                        >
                          Edit
                        </button>
                        <button
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-red-400 text-red-500 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950 transition text-sm font-medium"
                          onClick={() => handleDelete(item._id)}
                        >
                          Delete
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
                        {["#", "Image", "Full Name", "Service", "Location", "Mobile", "Action"].map((header) => (
                          <th key={header} className="px-4 py-3 border-r border-gray-300 dark:border-gray-700 last:border-r-0 sticky top-0 z-10 bg-gray-200 dark:bg-gray-800 shadow-[inset_-1px_-1px_0_0_#d1d5db] dark:shadow-[inset_-1px_-1px_0_0_#374151] last:shadow-[inset_0_-1px_0_0_#d1d5db] dark:last:shadow-[inset_0_-1px_0_0_#374151]">
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
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">{startIndex + index + 1}</td>

                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">
                            {item.image?.url ? (
                              <img
                                src={item.image.url}
                                alt={item.full_name}
                                className="h-10 w-10 rounded-full object-cover border border-gray-300 dark:border-gray-700"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300 text-xs font-bold">
                                {item.full_name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700 font-medium">{item.full_name}</td>

                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">
                            <span className="px-2 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full border border-blue-200 dark:border-blue-900">
                              {item.service_name}
                            </span>
                          </td>

                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
                            {[item.city, item.state, item.country].filter(Boolean).join(", ")}
                          </td>

                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700 text-sm">{item.mobile_number}</td>

                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">
                            <div className="flex gap-2">
                              <button
                                className="flex items-center gap-1 px-3 py-1 border border-green-500 text-green-600 dark:text-green-400 rounded-md hover:bg-green-50 dark:hover:bg-green-950 transition text-sm font-medium"
                                onClick={() => setEditingId(item._id)}
                              >
                                Edit
                              </button>
                              <button
                                className="flex items-center gap-1 px-3 py-1 border border-red-400 text-red-500 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950 transition text-sm font-medium"
                                onClick={() => handleDelete(item._id)}
                              >
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
          </div>

          {editingId && (
            <ServiceEditPopup
              serviceId={editingId}
              onClose={() => {
                setEditingId(null);
                fetchServices();
              }}
            />
          )}

          {/* Pagination */}
          <div className="mt-6 flex justify-center gap-4 items-center">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 border-2 border-blue-500 text-blue-500 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-950 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-gray-700 dark:text-gray-300 font-semibold">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border-2 border-blue-500 text-blue-500 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-950 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
