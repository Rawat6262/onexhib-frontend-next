"use client";

// Migrated from views/product/ProductDetailView.jsx.
// Behaviour, markup and classes are unchanged. The sidebar comes from
// app/(dashboard)/layout.jsx and navigation uses next/navigation with the
// new clean routes.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getProductDetail, deleteProduct } from "@/models/product.model";

export default function ProductDetailClient({ id }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    setError(null);
    getProductDetail(id)
      .then((res) => res.json())
      .then((data) => setProduct(data))
      .catch((err) => {
        console.error(err);
        setError("Failed to load product. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      setDeleting(true);
      const res = await deleteProduct(id);

      if (res.ok) {
        router.push(`/companies/${product.createdBy}`);
      } else {
        alert("Delete failed");
      }
    } catch (error) {
      console.error(error);
      alert("Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex-1 p-6 md:p-10">
          <div className="max-w-5xl mx-auto animate-pulse">
            <div className="h-4 w-40 bg-gray-50 dark:bg-gray-800/80 rounded mb-6" />
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 sm:p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="aspect-square bg-gray-50 dark:bg-gray-800/80 rounded-2xl" />
                <div className="space-y-4">
                  <div className="h-3 w-20 bg-gray-50 dark:bg-gray-800/80 rounded" />
                  <div className="h-8 w-3/4 bg-gray-50 dark:bg-gray-800/80 rounded" />
                  <div className="h-6 w-24 bg-gray-50 dark:bg-gray-800/80 rounded-full" />
                  <div className="h-6 w-32 bg-gray-50 dark:bg-gray-800/80 rounded" />
                  <div className="space-y-2 pt-4">
                    <div className="h-3 bg-gray-50 dark:bg-gray-800/80 rounded" />
                    <div className="h-3 bg-gray-50 dark:bg-gray-800/80 rounded" />
                    <div className="h-3 w-2/3 bg-gray-50 dark:bg-gray-800/80 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
              {error || "Product not found."}
            </p>
            <button
              onClick={() => router.back()}
              className="mt-4 text-sm font-semibold text-gray-900 dark:text-gray-100 underline underline-offset-4 hover:text-gray-600 dark:hover:text-gray-400"
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">

      <div className="flex-1 p-6 md:p-10">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link
              href={product.createdBy ? `/companies/${product.createdBy}` : "#"}
              className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Company
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-gray-100 font-medium truncate">
              {product.product_name}
            </span>
          </div>

          {/* Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Image */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 sm:p-10 flex items-center justify-center">
                <div className="w-full max-w-md aspect-square rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-md ring-1 ring-black/5 dark:ring-white/10">
                  {product.product_url ? (
                    <img
                      src={product.product_url}
                      alt={product.product_name}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600 text-sm font-medium">
                      No image available
                    </div>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="p-6 sm:p-10 flex flex-col">
                {product.category && (
                  <span className="self-start mb-4 inline-block px-3 py-1 text-xs font-semibold tracking-wide uppercase text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 rounded-full ring-1 ring-indigo-100 dark:ring-indigo-900">
                    {product.category}
                  </span>
                )}

                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-2">
                  {product.product_name}
                </h1>

                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  {product.price != null && product.price !== ""
                    ? `₹ ${product.price}`
                    : <span className="text-base font-medium text-gray-400 dark:text-gray-500">Price on request</span>}
                </p>

                {product.details && (
                  <div className="mb-8">
                    <h2 className="text-xs font-semibold tracking-wide uppercase text-gray-400 dark:text-gray-500 mb-2">
                      Description
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                      {product.details}
                    </p>
                  </div>
                )}

                {product.unit && (
                  <div className="mb-8 text-sm text-gray-500 dark:text-gray-400">
                    Sold per <span className="font-medium text-gray-700 dark:text-gray-300">{product.unit}</span>
                  </div>
                )}

                <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-3">
                  <button className="flex-1 px-6 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-300 active:scale-[0.98] transition">
                    Contact Supplier
                  </button>

                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-6 py-3 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-950 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? "Deleting..." : "Delete Product"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

