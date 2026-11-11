import axios from "axios";

/**
 * Hotels. Every call goes through the /api rewrite to the backend
 * (Onexhib_backend/Controller/hotel.controller.js): the owner calls check the
 * HOTEL role there, the admin ones are behind restrictToAdmin.
 */

/**
 * The hotel form as multipart: its fields, any new photos, and on an edit the
 * ids of photos to remove. Amenities go as one JSON field.
 */
function toFormData(form, { photos = [], removePhotos = [] } = {}) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(form)) {
    if (value === undefined || value === null) continue;
    fd.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value));
  }
  for (const file of photos) fd.append("photos", file);
  if (removePhotos.length) fd.append("remove_photos", JSON.stringify(removePhotos));
  return fd;
}

export const getMyHotels = () => axios.get("/api/hotel/mine");

export const createHotel = (form, photos) => axios.post("/api/hotel", toFormData(form, { photos }));

export const updateHotel = (id, form, photos, removePhotos) =>
  axios.put(`/api/hotel/${id}`, toFormData(form, { photos, removePhotos }));

export const deleteHotel = (id) => axios.delete(`/api/hotel/${id}`);

/* ── Admin ────────────────────────────────────────────────────────────────── */

export const getAdminHotels = (params) => axios.get("/api/admin/hotels", { params });

/** decision: "approve" | "reject"; a reject needs a note the owner will read. */
export const reviewHotel = (id, decision, note = "") => axios.put(`/api/admin/hotels/${id}/review`, { decision, note });

export const adminDeleteHotel = (id) => axios.delete(`/api/admin/hotels/${id}`);

/**
 * Refresh the public hotel pages and "Stay nearby" lists after a change
 * (fire-and-forget), so they do not wait out their cache.
 * See app/api/revalidate/hotels/route.js.
 */
export const refreshHotelPages = () => {
  fetch("/api/revalidate/hotels", { method: "POST", credentials: "include" }).catch(() => {});
};
