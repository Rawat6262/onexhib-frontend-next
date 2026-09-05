"use client";

// Migrated from views/product/ProductsView.jsx.
// Behaviour, markup and classes are unchanged. The sidebar comes from
// app/(dashboard)/layout.jsx and navigation uses next/navigation with the
// new clean routes.
import dynamic from "next/dynamic";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getPageNumbers } from "@/lib/paginate";

import { toast } from "sonner";

import { getProductsForCompany, deleteProduct } from "@/models/product.model";
import { getCompanyById, deleteCompany } from "@/models/company.model";

// Modals are only needed once opened, so their code (and for the location
// forms, country-state-city's ~2.3 MB dataset) is split out of this page's
// first-load bundle.
const ProductPopupForm = dynamic(() => import("@/components/popups/ProductPopupForm"), { ssr: false });
const ProductEditPopup = dynamic(() => import("@/components/popups/ProductEditPopup"), { ssr: false });
const ProductExcelUploadModal = dynamic(() => import("@/components/popups/ProductExcelUploadModal"), { ssr: false });

export default function CompanyProductsClient({ id }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [company, setCompany] = useState({});
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 5;

  /** ✅ Fetch products with memoized function */
  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await getProductsForCompany(id);
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("❌ Error fetching products:", error.message);
    }
  }, [id]);

   const deletecompany = async () => {
    try {
      if (!window.confirm("Are you sure you want to delete this company?"))
        return;
        console.log(company._id,id)
      await deleteCompany(company._id);
      toast.success("Company deleted successfully!");
      router.push(`/exhibitions/${company.createdBy}`);
    } catch (err) {
      console.error("❌ Error deleting Company:", err);
      toast.error("Failed to delete Company");
    }
  };
  /** ✅ Fetch company with memoized function */
  const fetchCompany = useCallback(async () => {
    try {
      const { data } = await getCompanyById(id);
      setCompany(data || {});
    } catch (error) {
      console.error("❌ Error fetching company:", error.message);
    }
  }, [id]);

  /** ✅ Run both fetches on mount */
  useEffect(() => {
    fetchCompany();
    fetchProducts();
  }, [fetchCompany, fetchProducts]);

  /** ✅ Filtered product list */
  const filteredData = useMemo(() => {
    const searchTerm = search.toLowerCase();
    return products.filter((item) =>
      [item.product_name, item.category, item.price].some((field) =>
        field?.toString().toLowerCase().includes(searchTerm)
      )
    );
  }, [products, search]);

  /** ✅ Pagination logic */
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteProduct(productId);
      toast.success("Product deleted successfully!");
      fetchProducts();
    } catch (err) {
      console.error("❌ Error deleting product:", err);
      toast.error("Failed to delete product");
    }
  };

  /** ✅ Brochure handler */
  const handleBrochureDownload = () => {
    if (!company?._id) return console.error("Company ID not available yet");
    window.open(`/api/brochure/${company._id}`, "_blank");
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-serif">

      <main className="flex-1 mt-2 md:mx-4 lg:mx-6 p-4 sm:p-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-300 dark:border-gray-700 p-4 sm:p-6">
          {/* HEADER */}
         <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-300 dark:border-gray-700 pb-4">

  {/* Title */}
  <h1 className="font-bold text-2xl sm:text-3xl">
    {company.company_name || "Loading..."}
  </h1>

  {/* Button Group */}
  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">

    {/* Delete Company */}
    <button
      className="px-4 py-2 border border-red-600 text-red-600 dark:text-red-400 bg-white dark:bg-gray-900 rounded-md font-semibold
                 hover:bg-red-600 hover:text-white transition-colors"
      onClick={()=>deletecompany()  }
    >
      Delete Company
    </button>

    {/* Download Brochure */}
    <button
      onClick={handleBrochureDownload}
      className="px-4 py-2 border border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900 rounded-md font-semibold
                 hover:bg-blue-600 hover:text-white transition-colors"
    >
      Download Brochure
    </button>

  </div>

</header>

          {/* SUMMARY */}
          <section className="mt-6 flex flex-wrap gap-4">
            <SummaryCard label="Products" value={products.length} />
          </section>

          {/* COMPANY INFO */}
          <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm bg-gray-50 dark:bg-gray-800 space-y-1">
              <p>
                <b>Phone:</b> {company.company_phone_number}
              </p>
              <p>
                <b>E-Mail:</b> {company.company_email}
              </p>
              <p>
                <b>Address:</b> {company.company_address}
              </p>
            </div>
            <div className="p-5 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm bg-gray-50 dark:bg-gray-800">
              <p className="font-bold text-gray-800 dark:text-gray-100">About</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                {company.about_company || "This is a demo about section."}
              </p>
            </div>
          </section>

          {/* PRODUCT LIST */}
          <section className="mt-8 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-900 p-4">
            {/* Controls */}
            <div className="flex flex-col lg:flex-row justify-between gap-4 items-center">
              <div className="text-center lg:text-left">
                <h2 className="font-bold text-2xl sm:text-3xl text-gray-800 dark:text-gray-100">
                  Product List
                </h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search Products"
                  className="h-10 w-full sm:w-64 border border-gray-400 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md px-3 text-gray-700 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                />
                <button
                  className="h-10 w-full sm:w-48 border border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900 hover:bg-blue-600 hover:text-white rounded-md font-semibold transition-colors"
                  onClick={() => setShowForm(true)}
                >
                  + Add Product
                </button>
                <button
                  className="h-10 w-full sm:w-48 border border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900 hover:bg-blue-600 hover:text-white rounded-md font-semibold transition-colors"
                  onClick={() => setShowUploadModal(true)}
                >
                  Upload Excel
                </button>
              </div>
            </div>

            {/* Table */}
            <ProductTable
              paginatedData={paginatedData}
              startIndex={startIndex}
              onDelete={handleDeleteProduct}
            />

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
            />
          </section>
        </div>
      </main>

      {/* Popup Form */}
      {showForm && (
        <ProductPopupForm
          Close={() => setShowForm(false)}
          data={id}
          refreshProducts={fetchProducts}
          exid={company.createdBy}
        />
      )}

      <ProductExcelUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={fetchProducts}
        companyId={id}
      />
    </div>
  );
}

/* ----------------- SUBCOMPONENTS ----------------- */

function SummaryCard({ label, value }) {
  return (
    <div className="h-24 w-48 rounded-xl flex flex-col justify-center items-center bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 shadow-sm">
      <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{label}</p>
      <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}

function ProductTable({ paginatedData, startIndex, onDelete }) {
    const [editOpen, setEditOpen] = useState(false);
const [selectedProductId, setSelectedProductId] = useState(null);
const router = useRouter();
  if (paginatedData.length === 0) {
    return <p className="mt-6 p-6 text-center text-gray-600 dark:text-gray-400 italic">No products found</p>;
  }

  return (
    <div className="mt-6">
      {/* Card list — phones only */}
      <div className="sm:hidden flex flex-col gap-3">
        {paginatedData.map((item, index) => (
          <div key={item._id || index} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-4">
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {startIndex + index + 1}. {item.product_name}
            </p>
            <dl className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex gap-1">
                <dt className="font-medium text-gray-500 dark:text-gray-400">Category:</dt>
                <dd>{item.category || "—"}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="font-medium text-gray-500 dark:text-gray-400">Price:</dt>
                <dd>₹{item.price}</dd>
              </div>
            </dl>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => router.push(`/products/${item._id}`)}
                className="flex-1 border border-blue-500 text-blue-500 dark:text-blue-400 rounded-md px-3 py-1.5 hover:bg-blue-100 dark:hover:bg-blue-950 transition-colors"
              >
                View
              </button>
              <button
                onClick={() => {
                  setSelectedProductId(item._id);
                  setEditOpen(true);
                }}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-green-500 text-green-500 dark:text-green-400 rounded-md hover:bg-green-100 dark:hover:bg-green-950 transition"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(item._id)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-red-500 text-red-500 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-950 transition"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Table — sm and up */}
      <div className="hidden sm:block overflow-auto max-h-[70vh] overscroll-contain rounded-md">
        <table className="w-full min-w-[700px] border-collapse border border-gray-300 dark:border-gray-700">
          <thead>
            <tr className="bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
              {["#", "Product Name", "Category", "Price", "Action"].map(
                (header) => (
                  <th
                    key={header}
                    className="px-4 py-3 border border-gray-300 dark:border-gray-700"
                  >
                    {header}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item, index) => (
              <tr
                key={item._id || index}
                className={index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"}
              >
                <td className="px-4 py-3 border border-gray-300 dark:border-gray-700 text-center">
                  {startIndex + index + 1}
                </td>

                <td className="px-4 py-3 border border-gray-300 dark:border-gray-700 text-center">
                  {item.product_name}
                </td>

                <td className="px-4 py-3 border border-gray-300 dark:border-gray-700 text-center">
                  {item.category}
                </td>

                <td className="px-4 py-3 border border-gray-300 dark:border-gray-700 text-center">
                  ₹{item.price}
                </td>

                <td className="px-4 py-3 border border-gray-300 dark:border-gray-700 flex justify-center gap-4">
                  <button
                    onClick={() => router.push(`/products/${item._id}`)}
                    className="border border-blue-500 text-blue-500 dark:text-blue-400 rounded-md px-3 py-1 hover:bg-blue-100 dark:hover:bg-blue-950 transition-colors"
                  >
                    View
                  </button>

                  <button
                    onClick={() => {
                      setSelectedProductId(item._id);
                      setEditOpen(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1 border border-green-500 text-green-500 dark:text-green-400 rounded-md hover:bg-green-100 dark:hover:bg-green-950 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(item._id)}
                    className="flex items-center gap-1 px-3 py-1 border border-red-500 text-red-500 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-950 transition"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ProductEditPopup
        open={editOpen}
        productId={selectedProductId}
        onClose={() => {
          setEditOpen(false);
          setSelectedProductId(null);
        }}
      />
    </div>
  );
}

function Pagination({ currentPage, totalPages, setCurrentPage }) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex gap-1 items-center flex-wrap justify-center">
      <button
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setCurrentPage(page)}
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
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
}
