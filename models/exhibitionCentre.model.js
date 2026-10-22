import axios from "axios";

/**
 * Exhibition centres, admin side. Every call goes through the /api rewrite to
 * the backend; all of these are behind restrictToLoginUser + restrictToAdmin
 * there (Controller/exhibitionCentre.controller.js in Onexhib_backend).
 */

/**
 * PUBLIC. Centres matching a name, city or country - the exhibition form's
 * venue dropdown. Every signed-in user (organisers too) can read it.
 */
export const searchCentres = (search, signal) =>
  axios.get("/api/exhibition-centres", { params: { search }, signal });

export const getAdminCentres = (params) => axios.get("/api/admin/exhibition-centres", { params });

/** Venues typed on exhibitions that are not linked to a centre yet, busiest first. */
export const getVenueSuggestions = (params) => axios.get("/api/admin/exhibition-centres/suggestions", { params });

/** Shows linked to one centre. */
export const getCentreExhibitions = (id) => axios.get(`/api/admin/exhibition-centres/${id}/exhibitions`);

/**
 * Create or edit. `form` is the centre's fields; `photo` an optional File.
 * Sent as multipart because of the photo; the browser sets the boundary.
 */
function toFormData(form, photo) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(form)) {
    if (value === undefined || value === null) continue;
    fd.append(key, typeof value === "boolean" ? String(value) : value);
  }
  if (photo) fd.append("photo", photo);
  return fd;
}

export const createCentre = (form, photo) => axios.post("/api/admin/exhibition-centres", toFormData(form, photo));

export const updateCentre = (id, form, photo) => axios.put(`/api/admin/exhibition-centres/${id}`, toFormData(form, photo));

export const deleteCentre = (id) => axios.delete(`/api/admin/exhibition-centres/${id}`);

export const linkCentreExhibitions = (id, body) => axios.post(`/api/admin/exhibition-centres/${id}/link`, body);

/**
 * Refresh the public centre pages after a change (fire-and-forget), so they do
 * not wait out their one-hour cache. See app/api/revalidate/centres/route.js.
 */
export const refreshCentrePages = () => {
  fetch("/api/revalidate/centres", { method: "POST", credentials: "include" }).catch(() => {});
};

export const unlinkCentreExhibitions = (id, exhibitionIds) =>
  axios.post(`/api/admin/exhibition-centres/${id}/unlink`, { exhibitionIds });
