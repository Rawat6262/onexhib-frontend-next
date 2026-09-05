"use client";

// Migrated from views/admin/AdminProductsView.jsx.
// Behaviour, markup and classes are unchanged. The sidebar now comes from
// app/admin/layout.jsx, getPageNumbers moved to lib/paginate.js, and
// navigation uses next/navigation with the new clean routes.
import dynamic from "next/dynamic";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

import { toast } from "sonner";
import { getAdminProductsPage } from "@/models/product.model";
import { getPageNumbers } from "@/lib/paginate";

// Modals are only needed once opened, so their code (and for the location
// forms, country-state-city's ~2.3 MB dataset) is split out of this page's
// first-load bundle.
const ProductPopupForm = dynamic(() => import("@/components/popups/ProductPopupForm"), { ssr: false });

export default function AdminProductsClient() {
  const router = useRouter();

  // State
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; // server page size — matches the params sent to /api/admin/product

  // Server-side pagination: fetches only the current page (products can scale into
  // the thousands, so loading everything up front doesn't scale).
  const fetchProducts = useCallback(async (page) => {
    try {
      const { data: response } = await getAdminProductsPage({ page, limit: itemsPerPage });
      setProducts(Array.isArray(response?.data) ? response.data : []);
      setTotal(response?.total || 0);
      setTotalPages(response?.totalPages || 1);
    } catch (error) {
      console.error("❌ Error fetching products:", error.message);
      toast.error("Failed to fetch products");
    }
  }, [itemsPerPage]);

  useEffect(() => {
    fetchProducts(currentPage);
  }, [currentPage, fetchProducts]);

  // The backend has no search endpoint, so this only filters the products
  // already loaded for the current page — not the full collection.
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter((p, index) =>
      [(index + 1).toString(), p.product_name, p.category, p.price]
        .some((field) => field?.toString().toLowerCase().includes(q))
    );
  }, [products, search]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts;

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-serif">
      {/* Sidebar */}

      {/* Main Content */}
      <div className="flex-1 w-full mt-8 flex flex-col border border-gray-300 dark:border-gray-700 md:mx-4 lg:mx-6 bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-y-auto">
        {/* Header */}
        <div className="w-full flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between items-center px-4 sm:px-8 py-4 sm:h-20 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 rounded-t-lg">
          <h1 className="font-bold text-2xl sm:text-3xl tracking-wide">Product Dashboard</h1>
        </div>

        {/* Summary Card */}
        <div className="w-full px-3 sm:px-4 mt-6 flex flex-wrap gap-6">
          <div className="h-24 w-48 rounded-xl flex flex-col justify-center items-center bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 shadow-sm">
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Total Products</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{total}</p>
          </div>
        </div>

        {/* Table Section */}
        <div className="flex-1 w-full px-3 sm:px-4 mt-8 rounded-b-lg border border-t-0 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm pb-8 mb-8">
          {/* Controls */}
          <div className="py-4 w-full flex flex-col lg:flex-row justify-between gap-4 px-4">
            <h2 className="font-bold text-2xl sm:text-3xl text-gray-800 dark:text-gray-100">Product List</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search this page (name, category, price)"
                title="Only filters the products currently loaded on this page"
                className="h-10 w-full sm:w-64 border border-gray-400 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

            </div>
          </div>

          {/* List */}
          <div className="flex-1 w-full mt-6">
            {paginatedProducts.length === 0 ? (
              <p className="p-6 text-center text-gray-600 dark:text-gray-400 italic">No products found</p>
            ) : (
              <>
                {/* Card list — phones only */}
                <div className="sm:hidden flex flex-col gap-3 px-4">
                  {paginatedProducts.map((p, index) => (
                    <div key={p._id || index} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-4">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {startIndex + index + 1}. {p.product_name}
                      </p>
                      <dl className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex gap-1">
                          <dt className="font-medium text-gray-500 dark:text-gray-400">Category:</dt>
                          <dd>{p.category || "—"}</dd>
                        </div>
                        <div className="flex gap-1">
                          <dt className="font-medium text-gray-500 dark:text-gray-400">Price:</dt>
                          <dd>{p.price}</dd>
                        </div>
                      </dl>
                      <button
                        onClick={() => router.push(`/products/${p._id}`)}
                        className="w-full mt-3 px-3 py-1.5 border border-blue-500 text-blue-500 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-950 transition-colors"
                      >
                        View
                      </button>
                    </div>
                  ))}
                </div>

                {/* Table — sm and up */}
                <div className="hidden sm:block overflow-auto max-h-[70vh] overscroll-contain rounded-md text-left">
                  <table className="w-full min-w-[700px] border-collapse border border-gray-300 dark:border-gray-700">
                    <thead>
                      <tr className="bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-b border-gray-300 dark:border-gray-700">
                        {["#", "Product Name", "Category", "Price", "Action"].map((header) => (
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
                      {paginatedProducts.map((p, index) => (
                        <tr
                          key={p._id || index}
                          className={index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"}
                        >
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">
                            {startIndex + index + 1}
                          </td>
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">
                            {p.product_name}
                          </td>
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">
                            {p.category}
                          </td>
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">
                            {p.price}
                          </td>
                          <td className="px-4 py-3 border border-gray-300 dark:border-gray-700">
                            <button
                              onClick={() => router.push(`/products/${p._id}`)}
                              className="px-3 py-1 border border-blue-500 text-blue-500 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-950 transition-colors"
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

          {/* Pagination */}
          <div className="mt-6 px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {filteredProducts.length === 0 ? 0 : startIndex + 1}–{startIndex + filteredProducts.length}
              </span>{" "}
              of <span className="font-medium text-gray-700 dark:text-gray-300">{total}</span> products
              {" "}(page {currentPage} of {totalPages})
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
                  <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">…</span>
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

      {/* Product Popup */}
      {showForm && (
        <ProductPopupForm
          Close={() => setShowForm(false)}
          refreshProducts={() => fetchProducts(currentPage)}
        />
      )}
    </div>
  );
}
