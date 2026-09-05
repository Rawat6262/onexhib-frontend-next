"use client";

// Frontend: ExhibitionEditPopup.jsx
// React component that fetches exhibition data by id and allows updating it.
// Props:
// - open (bool)
// - onClose (fn)
// - exhibitionId (string)  <-- id to fetch
// - isAdmin (bool)  <-- true when opened from the admin screens, uses the admin-only update endpoint

import React, { useEffect, useState } from "react";
import { fetchExhibitionById, updateExhibition, adminUpdateExhibition } from "@/models/exhibition.model";

export default function ExhibitionEditPopup({ open, onClose, exhibitionId, isAdmin = false }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    exhibition_name: "",
    addedBy: "",
    exhibition_address: "",
    category: "",
    venue: "",
    starting_date: "",
    ending_date: "",
    email: "",
    about_exhibition: "",
    speakers: "",
    session: "",
    sponsor: "",
    privacy_policy: "",
    partners: "",
    terms_of_service: "",
    Support: "",
    exhibitor_profile: "",
    vistor: "",
    city: "",
    state: "",
    country: "",
    about_organiser: "",
    why_Exhibit: "",
    why_visit: "",
    exhibtion_url: "",
    original_image_url: "",
    thumbnail_url: "",
    layout_url: "",
    layout_preview_url: "",
    exhibition_brochure_url: "",
  });

  useEffect(() => {
    if (!open || !exhibitionId) return;

    setLoading(true);
    setError(null);

    // Fetch exhibition by id
    fetchExhibitionById(exhibitionId)
      .then((res) => {
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        // map server fields to form fields
        setForm({
          exhibition_name: data.exhibition_name || "",
          addedBy: data.addedBy || "",
          exhibition_address: data.exhibition_address || "",
          category: data.category || "",
          venue: data.venue || "",
          starting_date: data.starting_date ? data.starting_date.slice(0, 10) : "",
          ending_date: data.ending_date ? data.ending_date.slice(0, 10) : "",
          email: data.email || "",
          about_exhibition: data.about_exhibition || "",
          speakers: data.speakers || "",
          session: data.session || "",
          sponsor: data.sponsor || "",
          privacy_policy: data.privacy_policy || "",
          partners: data.partners || "",
          terms_of_service: data.terms_of_service || "",
          Support: data.Support || "",
          exhibitor_profile: data.exhibitor_profile || "",
          vistor: data.vistor || "",
          city: data.city || "",
          state: data.state || "",
          country: data.country || "",
          about_organiser: data.about_organiser || "",
          why_Exhibit: data.why_Exhibit || "",
          why_visit: data.why_visit || "",
          exhibtion_url: data.exhibtion_url || "",
          original_image_url: data.original_image_url || "",
          thumbnail_url: data.thumbnail_url || "",
          layout_url: data.layout_url || "",
          layout_preview_url: data.layout_preview_url || "",
          exhibition_brochure_url: data.exhibition_brochure_url || "",
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [open, exhibitionId]);

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
      const res = isAdmin
        ? await adminUpdateExhibition(exhibitionId, form)
        : await updateExhibition(exhibitionId, form);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Save failed: ${res.status}`);
      }

      const updated = await res.json();
      console.log("Saved:", updated);
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
          <h2 className="text-xl font-semibold">Edit Exhibition</h2>
          <button onClick={onClose} className="px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="text-red-600 dark:text-red-400">Error: {error}</div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm">Exhibition Name</label>
              <input name="exhibition_name" value={form.exhibition_name} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm ">Added By</label>
              <input name="addedBy" value={form.addedBy} onChange={handleChange} disabled className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1 opacity-20" />
            </div>

            <div>
              <label className="block text-sm">Exhibition Address</label>
              <input name="exhibition_address" value={form.exhibition_address} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm">Category</label>
              <input name="category" value={form.category} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm">Venue</label>
              <input name="venue" value={form.venue} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm">Starting Date</label>
              <input name="starting_date" type="date" value={form.starting_date} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm">Ending Date</label>
              <input name="ending_date" type="date" value={form.ending_date} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm">City</label>
              <input name="city" value={form.city} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm">State</label>
              <input name="state" value={form.state} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm">Country</label>
              <input name="country" value={form.country} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm">About Exhibition</label>
              <textarea name="about_exhibition" value={form.about_exhibition} onChange={handleChange} rows={4} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm">About Organiser</label>
              <textarea name="about_organiser" value={form.about_organiser} onChange={handleChange} rows={4} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm">Why Exhibit</label>
              <textarea name="why_Exhibit" value={form.why_Exhibit} onChange={handleChange} rows={3} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm">Why Visit</label>
              <textarea name="why_visit" value={form.why_visit} onChange={handleChange} rows={3} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm">Speakers</label>
              <input name="speakers" value={form.speakers} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm">Session</label>
              <input name="session" value={form.session} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm">Sponsor</label>
              <input name="sponsor" value={form.sponsor} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm">Privacy Policy</label>
              <input name="privacy_policy" value={form.privacy_policy} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm">Partners</label>
              <input name="partners" value={form.partners} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm">Terms of Service</label>
              <input name="terms_of_service" value={form.terms_of_service} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm">Support</label>
              <input name="Support" value={form.Support} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm">Exhibitor Profile</label>
              <input name="exhibitor_profile" value={form.exhibitor_profile} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm">Visitor</label>
              <input name="vistor" value={form.vistor} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            {/* -------------------- Media -------------------- */}

            <div className="col-span-2 border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
              <h3 className="text-sm font-semibold mb-2">Media URLs</h3>
            </div>

            <div>
              <label className="block text-sm">Exhibition Image URL</label>
              <input name="exhibtion_url" value={form.exhibtion_url} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm">Original Image URL</label>
              <input name="original_image_url" value={form.original_image_url} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm">Thumbnail URL</label>
              <input name="thumbnail_url" value={form.thumbnail_url} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm">Layout URL</label>
              <input name="layout_url" value={form.layout_url} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm">Layout Preview URL</label>
              <input name="layout_preview_url" value={form.layout_preview_url} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm">Exhibition Brochure URL</label>
              <input name="exhibition_brochure_url" value={form.exhibition_brochure_url} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div className="col-span-2 flex justify-end gap-3 mt-4">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded bg-blue-600 text-white">
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}
