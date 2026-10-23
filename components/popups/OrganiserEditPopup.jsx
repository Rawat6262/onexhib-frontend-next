"use client";

// Frontend: ExhibitionEditPopup.jsx
// React component that fetches exhibition data by id and allows updating it.
// Props:
// - open (bool)
// - onClose (fn)
// - exhibitionId (string)  <-- id to fetch
// - isAdmin (bool)  <-- true when opened from the admin screens, uses the admin-only update endpoint

import React, { useEffect, useState } from "react";
import { fetchExhibitionById, updateExhibition, adminUpdateExhibition, addExhibitionLogos, removeExhibitionLogo, refreshExhibitionPage } from "@/models/exhibition.model";
import { toast } from "sonner";
import LogoPicker from "@/components/popups/LogoPicker";
import VenueField from "@/components/exhibition/VenueField";
import { refreshCentrePages } from "@/models/exhibitionCentre.model";
import { useAuth } from "@/components/auth/AuthProvider";
import { ROLES } from "@/lib/auth";

export default function ExhibitionEditPopup({ open, onClose, exhibitionId, isAdmin = false }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  /*
   * Sponsor / partner logos are managed live, not through Save: each add uploads
   * at once and each remove deletes at once (POST/DELETE /api/exhibition/:id/logos),
   * for owner and admin alike. They are deliberately NOT part of `form`, so the
   * JSON Save never sends a logo list (the API ignores one anyway).
   */
  const [logos, setLogos] = useState({ sponsor_logos: [], partner_logos: [] });
  const [logoBusy, setLogoBusy] = useState(null); // "sponsor" | "partner" | null
  const { role } = useAuth();
  // The linked exhibition centre ({ id, name }) or null. Loaded from the
  // exhibition (the API populates it) and changed through the Venue field.
  const [centre, setCentre] = useState(null);
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
        setCentre(
          data.exhibition_centre && typeof data.exhibition_centre === "object" && data.exhibition_centre._id
            ? { id: data.exhibition_centre._id, name: data.exhibition_centre.name }
            : null
        );
        setLogos({
          sponsor_logos: Array.isArray(data.sponsor_logos) ? data.sponsor_logos : [],
          partner_logos: Array.isArray(data.partner_logos) ? data.partner_logos : [],
        });
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

  async function addLogos(kind, files) {
    setLogoBusy(kind);
    try {
      const { data } = await addExhibitionLogos(exhibitionId, kind, files);
      setLogos({ sponsor_logos: data.sponsor_logos || [], partner_logos: data.partner_logos || [] });
      refreshExhibitionPage(exhibitionId); // show the new logos on the public page now
      toast.success(`${files.length} ${files.length === 1 ? "logo" : "logos"} added.`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "The logos could not be uploaded.");
    } finally {
      setLogoBusy(null);
    }
  }

  async function removeLogo(kind, logoId) {
    setLogoBusy(kind);
    try {
      const { data } = await removeExhibitionLogo(exhibitionId, kind, logoId);
      setLogos({ sponsor_logos: data.sponsor_logos || [], partner_logos: data.partner_logos || [] });
      refreshExhibitionPage(exhibitionId);
    } catch (err) {
      toast.error(err?.response?.data?.message || "The logo could not be removed.");
    } finally {
      setLogoBusy(null);
    }
  }

  const logoItems = (list) => list.map((l) => ({ key: String(l._id), url: l.url }));

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // The centre link travels with the form: an id links, "" unlinks
      // (the backend keeps only an id of a centre that exists).
      const payload = { ...form, exhibition_centre: centre?.id || "" };
      const res = isAdmin
        ? await adminUpdateExhibition(exhibitionId, payload)
        : await updateExhibition(exhibitionId, payload);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Save failed: ${res.status}`);
      }

      const updated = await res.json();
      refreshExhibitionPage(exhibitionId);
      // The show's centre may have changed: centre pages list their shows.
      refreshCentrePages();
      console.log("Saved:", updated);
      onClose && onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ox-form fixed inset-0 z-50 flex items-center justify-center">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Exhibition Name</label>
              <input name="exhibition_name" value={form.exhibition_name} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm ">Added By</label>
              <input name="addedBy" value={form.addedBy} onChange={handleChange} disabled className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1 opacity-20" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Exhibition Address</label>
              <input name="exhibition_address" value={form.exhibition_address} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
              <input name="category" value={form.category} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            {/* Venue: pick an exhibition centre (fills address, city, state and
                country below) or add a new one from Google Maps. Full width so
                the dropdown and the map panel have room. */}
            <div className="sm:col-span-2">
              <VenueField
                id="edit-venue"
                value={form.venue}
                onChange={(venue) => setForm((f) => ({ ...f, venue }))}
                centre={centre}
                onSelectCentre={(c) => {
                  setCentre({ id: c._id, name: c.name });
                  setForm((f) => ({
                    ...f,
                    venue: c.name,
                    exhibition_address: c.address || f.exhibition_address,
                    city: c.city || f.city,
                    state: c.state || f.state,
                    country: c.country || f.country,
                  }));
                }}
                onClearCentre={() => setCentre(null)}
                onUseLocation={(loc) =>
                  setForm((f) => ({
                    ...f,
                    venue: loc.name || f.venue,
                    exhibition_address: loc.address || f.exhibition_address,
                    city: loc.city || f.city,
                    state: loc.state || f.state,
                    country: loc.country || f.country,
                  }))
                }
                canCreate={isAdmin || role === ROLES.ADMIN || role === ROLES.ORGANISER}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Starting Date</label>
              <input name="starting_date" type="date" value={form.starting_date} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ending Date</label>
              <input name="ending_date" type="date" value={form.ending_date} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
              <input name="city" value={form.city} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">State</label>
              <input name="state" value={form.state} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Country</label>
              <input name="country" value={form.country} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">About Exhibition</label>
              <textarea name="about_exhibition" value={form.about_exhibition} onChange={handleChange} rows={4} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">About Organiser</label>
              <textarea name="about_organiser" value={form.about_organiser} onChange={handleChange} rows={4} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Why Exhibit</label>
              <textarea name="why_Exhibit" value={form.why_Exhibit} onChange={handleChange} rows={3} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Why Visit</label>
              <textarea name="why_visit" value={form.why_visit} onChange={handleChange} rows={3} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Speakers</label>
              <input name="speakers" value={form.speakers} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Session</label>
              <input name="session" value={form.session} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Privacy Policy</label>
              <input name="privacy_policy" value={form.privacy_policy} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Terms of Service</label>
              <input name="terms_of_service" value={form.terms_of_service} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            {/* Logos save immediately - see the note on `logos` above. */}
            <div className="grid gap-5 rounded-2xl border border-gray-200 p-4 sm:col-span-2 md:grid-cols-2 dark:border-gray-800">
              <LogoPicker
                id="edit-sponsor-logos"
                label="Sponsor logos"
                hint="Added and removed straight away - no need to press Save."
                items={logoItems(logos.sponsor_logos)}
                busy={logoBusy === "sponsor"}
                onAdd={(files) => addLogos("sponsor", files)}
                onRemove={(id) => removeLogo("sponsor", id)}
                onError={(m) => toast.error(m)}
              />
              <LogoPicker
                id="edit-partner-logos"
                label="Partner logos"
                hint="Added and removed straight away - no need to press Save."
                items={logoItems(logos.partner_logos)}
                busy={logoBusy === "partner"}
                onAdd={(files) => addLogos("partner", files)}
                onRemove={(id) => removeLogo("partner", id)}
                onError={(m) => toast.error(m)}
              />
              {form.sponsor || form.partners ? (
                <p className="text-xs text-gray-500 md:col-span-2 dark:text-gray-400">
                  Listed earlier as text: {[form.sponsor && `Sponsors - ${form.sponsor}`, form.partners && `Partners - ${form.partners}`].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Support</label>
              <input name="Support" value={form.Support} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Exhibitor Profile</label>
              <input name="exhibitor_profile" value={form.exhibitor_profile} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Visitor</label>
              <input name="vistor" value={form.vistor} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            {/* -------------------- Media -------------------- */}

            <div className="col-span-2 border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
              <h3 className="text-sm font-semibold mb-2">Media URLs</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Exhibition Image URL</label>
              <input name="exhibtion_url" value={form.exhibtion_url} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Original Image URL</label>
              <input name="original_image_url" value={form.original_image_url} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Thumbnail URL</label>
              <input name="thumbnail_url" value={form.thumbnail_url} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Layout URL</label>
              <input name="layout_url" value={form.layout_url} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Layout Preview URL</label>
              <input name="layout_preview_url" value={form.layout_preview_url} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Exhibition Brochure URL</label>
              <input name="exhibition_brochure_url" value={form.exhibition_brochure_url} onChange={handleChange} className="mt-1 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1" />
            </div>

            <div className="col-span-2 flex justify-end gap-3 mt-4">
              <button type="button" onClick={onClose} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#2B3FB8] hover:text-[#2B3FB8] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-blue-400 dark:hover:text-white">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#131C55] to-[#2B3FB8] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/25 transition hover:brightness-110 disabled:opacity-70 disabled:cursor-not-allowed motion-reduce:transition-none dark:from-blue-600 dark:to-indigo-500">
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}
