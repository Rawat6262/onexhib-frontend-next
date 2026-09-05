"use client";

import React, { useState } from "react";
import { addNews } from "@/models/news.model";

// Reusing your styled InputField component
const InputField = ({ label, value, onChange, required, type = "text", placeholder }) => (
  <div className="w-full">
    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>

    <input
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:outline-none transition-all duration-200"
    />
  </div>
);

export default function NewsView({ onClose }) {
  // 1. All state is now managed INSIDE the popup
  const [form, setForm] = useState({
    news_title: "",
    news_description: "",
    news_url: "",
    new_category: "",
    news_image_file: null,
  });

  const [preview, setPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2. Logic to update text fields
  const updateField = (field) => (e) => {
    setForm((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  // 3. Logic to handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm((prev) => ({ ...prev, news_image_file: file }));
      setPreview(URL.createObjectURL(file));
    }
  };

  // 4. Logic to handle submission
  const handleSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);

  try {
    // Build FormData so multer can parse
    // the image file on the server
    const formData = new FormData();

    formData.append("news_title",       form.news_title);
    formData.append("news_description", form.news_description);
    formData.append("news_url",        form.news_url);
    formData.append("new_category",    form.new_category);

    // Key must match multer field name: 'news_image_url'
    if (form.news_image_file) {
      formData.append("news_image_url", form.news_image_file);
    }

    const response = await addNews(formData);

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || "Failed to publish");
    }

    const data = await response.json();
    console.log("News created:", data);
    onClose();                // close modal on success

  } catch (error) {
    console.error("Error submitting news:", error);
    // Optionally surface to UI: setError(error.message)
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90%] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
              Add News & Announcements
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
              Publish a new update or article for the exhibition
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 dark:text-slate-500 hover:text-red-500 text-4xl leading-none transition-colors focus:outline-none"
          >
            &times;
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50/60 dark:bg-slate-950/60">
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 flex flex-col gap-8">

            {/* Primary Details Card */}
            <div className="bg-white dark:bg-slate-900 p-7 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow duration-200 space-y-6">
              <h3 className="text-blue-600 dark:text-blue-400 font-bold uppercase text-xs tracking-widest border-b border-slate-50 dark:border-slate-800 pb-3">
                News Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  label="News Title"
                  value={form.news_title}
                  onChange={updateField("news_title")}
                  placeholder="Enter the headline..."
                  required
                />

                <InputField
                  label="Category"
                  value={form.new_category}
                  onChange={updateField("new_category")}
                  placeholder="e.g. Technology, Update, Alert"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl p-4 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:outline-none transition-all duration-200"
                  rows={5}
                  placeholder="Write the full news description here..."
                  value={form.news_description}
                  onChange={updateField("news_description")}
                  required
                />
              </div>
            </div>

            {/* Media & Links Card */}
            <div className="bg-white dark:bg-slate-900 p-7 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow duration-200 space-y-6">
              <h3 className="text-blue-600 dark:text-blue-400 font-bold uppercase text-xs tracking-widest border-b border-slate-50 dark:border-slate-800 pb-3">
                Media & External Links
              </h3>

              <InputField
                label="External Article URL"
                type="url"
                value={form.news_url}
                onChange={updateField("news_url")}
                placeholder="https://..."
              />

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  News Cover Image
                </label>

                {preview && (
                  <div className="mt-3 mb-4">
                    <img
                      src={preview}
                      alt="news preview"
                      className="h-32 w-auto rounded-xl border border-slate-200 dark:border-slate-700 object-cover shadow-sm"
                    />
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-950 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900 transition-all border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 cursor-pointer"
                  onChange={handleImageChange}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-2 p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 rounded-xl">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 hover:shadow-lg transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                {isSubmitting ? "Publishing..." : "Publish News"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
