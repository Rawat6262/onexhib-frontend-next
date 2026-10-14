"use client";

// Migrated from views/product/ProductsView.jsx.
// Behaviour, markup and classes are unchanged. The sidebar comes from
// app/(dashboard)/layout.jsx and navigation uses next/navigation with the
// new clean routes.
import dynamic from "next/dynamic";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { getProductsForCompany, deleteProduct } from "@/models/product.model";
import { getCompanyById, deleteCompany } from "@/models/company.model";
import TablePagination from "@/components/dashboard/TablePagination";

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

  const [itemsPerPage, setItemsPerPage] = useState(10);

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
  // A delete or a bigger page size can leave the current page past the end.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);
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
    <div className="mx-auto w-full max-w-6xl px-4 py-8 text-gray-900 sm:px-6 sm:py-12 dark:text-gray-100">

      <main className="flex-1 mt-2 md:mx-4 lg:mx-6 p-4 sm:p-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-900/[0.03] sm:p-6 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
          {/* HEADER */}
         <header className="flex flex-col items-start justify-between gap-4 border-b border-gray-200 pb-4 sm:flex-row sm:items-center dark:border-gray-800">

  {/* Title */}
  <h1 className="font-bold text-2xl sm:text-3xl">
    {company.company_name || "Loading..."}
  </h1>

  {/* Button Group */}
  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">

    {/* Delete Company */}
    <button
      className="px-4 py-2 border border-red-600 text-red-600 dark:text-red-400 bg-white dark:bg-gray-900 rounded-lg font-semibold
                 hover:bg-red-600 hover:text-white transition-colors"
      onClick={()=>deletecompany()  }
    >
      Delete Company
    </button>

    {/* Download Brochure */}
    <button
      onClick={handleBrochureDownload}
      className="px-4 py-2 border border-[#131C55] text-[#131C55] dark:text-blue-300 bg-white dark:bg-gray-900 rounded-lg font-semibold
                 hover:bg-[#131C55] hover:text-white transition-colors"
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
            <div className="space-y-1 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
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
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="font-bold text-gray-800 dark:text-gray-100">About</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                {company.about_company || "This is a demo about section."}
              </p>
            </div>
          </section>

          {/* PRODUCT LIST */}
          <section className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-sm shadow-gray-900/[0.03] dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
            {/* Controls */}
            <div className="flex flex-col lg:flex-row justify-between gap-4 items-center">
              <div className="text-center lg:text-left">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
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
                  className="h-10 w-full sm:w-64 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 rounded-lg px-3 text-gray-700 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                />
                <button
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#131C55] to-[#2B3FB8] px-4 text-sm font-semibold text-white shadow-md shadow-indigo-900/20 transition hover:brightness-110 sm:w-48 motion-reduce:transition-none dark:from-blue-600 dark:to-indigo-500"
                  onClick={() => setShowForm(true)}
                >
                  + Add Product
                </button>
                <button
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#131C55] to-[#2B3FB8] px-4 text-sm font-semibold text-white shadow-md shadow-indigo-900/20 transition hover:brightness-110 sm:w-48 motion-reduce:transition-none dark:from-blue-600 dark:to-indigo-500"
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
            <TablePagination
            page={currentPage}
            pageSize={itemsPerPage}
            total={filteredData.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setItemsPerPage(size);
              setCurrentPage(1);
            }}
            itemLabel="products"
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
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900 w-48">
      <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="bg-gradient-to-r from-[#131C55] to-[#2B3FB8] bg-clip-text text-4xl font-extrabold text-transparent dark:from-blue-300 dark:to-violet-300">{value}</p>
    </div>
  );
}

function ProductTable({ paginatedData, startIndex, onDelete }) {
    const [editOpen, setEditOpen] = useState(false);
const [selectedProductId, setSelectedProductId] = useState(null);
const router = useRouter();
  if (paginatedData.length === 0) {
    return <p className="mt-6 px-5 py-12 text-center text-[15px] text-gray-500 dark:text-gray-400">No products found</p>;
  }

  return (
    <div className="mt-6">
      {/* Card list — phones only */}
      <div className="flex flex-col gap-3 p-4 sm:hidden">
        {paginatedData.map((item, index) => (
          <div key={item._id || index} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
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
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 transition hover:border-[#2B3FB8] hover:text-[#2B3FB8] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-400 dark:hover:text-white flex-1"
              >
                View
              </button>
              <button
                onClick={() => {
                  setSelectedProductId(item._id);
                  setEditOpen(true);
                }}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300 rounded-lg hover:border-[#131C55] hover:text-[#131C55] dark:hover:border-gray-500 transition"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(item._id)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-red-500 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-950 transition"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Table — sm and up */}
      <div className="hidden max-h-[70vh] overflow-auto overscroll-contain sm:block">
        <table className="w-full min-w-[700px] border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400">
              {["#", "Product Name", "Category", "Price", "Action"].map(
                (header) => (
                  <th
                    key={header}
                    className="border-b border-gray-100 px-4 py-3.5 text-gray-700 dark:border-gray-800 dark:text-gray-300"
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
                className={"bg-white transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-white/[0.03]"}
              >
                <td className="border-b border-gray-100 px-4 py-3.5 text-center text-gray-700 dark:border-gray-800 dark:text-gray-300">
                  {startIndex + index + 1}
                </td>

                <td className="border-b border-gray-100 px-4 py-3.5 text-center text-gray-700 dark:border-gray-800 dark:text-gray-300">
                  {item.product_name}
                </td>

                <td className="border-b border-gray-100 px-4 py-3.5 text-center text-gray-700 dark:border-gray-800 dark:text-gray-300">
                  {item.category}
                </td>

                <td className="border-b border-gray-100 px-4 py-3.5 text-center text-gray-700 dark:border-gray-800 dark:text-gray-300">
                  ₹{item.price}
                </td>

                <td className="flex justify-center gap-2 border-b border-gray-100 px-4 py-3.5 dark:border-gray-800">
                  <button
                    onClick={() => router.push(`/products/${item._id}`)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 transition hover:border-[#2B3FB8] hover:text-[#2B3FB8] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-400 dark:hover:text-white"
                  >
                    View
                  </button>

                  <button
                    onClick={() => {
                      setSelectedProductId(item._id);
                      setEditOpen(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1 border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300 rounded-lg hover:border-[#131C55] hover:text-[#131C55] dark:hover:border-gray-500 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(item._id)}
                    className="flex items-center gap-1 px-3 py-1 border border-red-500 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-950 transition"
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
