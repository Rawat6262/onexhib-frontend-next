"use client";

// Frontend: ProductEditPopup.jsx
// Props:
// - open (bool)
// - onClose (fn)
// - productId (string)

import React, { useEffect, useState } from "react";
import { getProductDetail, updateProduct } from "@/models/product.model";

export default function ProductEditPopup({ open, onClose, productId }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    product_name: "",
    category: "",
    details: "",
    price: "",
    unit: "",
    product_url: "",
    product_video_url: "",
    createdBy: "",
    exhibitionid: ""
  });

  useEffect(() => {
    if (!open || !productId) return;

    setLoading(true);
    setError(null);

    getProductDetail(productId)
      .then((res) => {
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setForm({
          product_name: data.product_name || "",
          category: data.category || "",
          details: data.details || "",
          price: data.price || "",
          unit: data.unit || "",
          product_url: data.product_url || "",
          product_video_url: data.product_video_url || "",
          createdBy: data.createdBy || "",
          exhibitionid: data.exhibitionid || ""
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [open, productId]);

  if (!open) return null;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await updateProduct(productId, {
        ...form,
        price: Number(form.price)
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Save failed: ${res.status}`);
      }

      await res.json();
      onClose && onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 w-[92vw] sm:w-[80vw] h-[90vh] rounded-2xl shadow-2xl p-4 sm:p-6 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Edit Product</h2>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="text-red-600 dark:text-red-400">Error: {error}</div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm">Product Name</label>
              <input
                name="product_name"
                value={form.product_name}
                onChange={handleChange}
                className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1"
              />
            </div>

            <div>
              <label className="block text-sm">Category</label>
              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1"
              />
            </div>

            <div>
              <label className="block text-sm">Price</label>
              <input
                name="price"
                type="number"
                value={form.price}
                onChange={handleChange}
                className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1"
              />
            </div>

            <div>
              <label className="block text-sm">Unit</label>
              <input
                name="unit"
                value={form.unit}
                onChange={handleChange}
                className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1"
              />
            </div>

            <div>
              <label className="block text-sm">Product URL</label>
              <input
                name="product_url"
                value={form.product_url}
                onChange={handleChange}
                className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm">Product Details</label>
              <textarea
                name="details"
                rows={4}
                value={form.details}
                onChange={handleChange}
                className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm">Product Video URL</label>
              <input
                name="product_video_url"
                value={form.product_video_url}
                onChange={handleChange}
                className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1"
              />
            </div>

            <div className="col-span-2 flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded bg-blue-600 text-white"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
 