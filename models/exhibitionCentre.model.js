import axios from "axios";

/**
 * Exhibition centres. Every call goes through the /api rewrite to the backend
 * (Controller/exhibitionCentre.controller.js in Onexhib_backend): the admin
 * calls are behind restrictToAdmin, the organiser ones check the role there.
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

/*
 * ORGANISER side (/api/organiser/exhibition-centres). Lists every centre, each
 * with `mine`; create, and edit or delete only the ones this account added.
 * Admins may use these too (they own everything), which is why the exhibition
 * form's "Add new venue" uses createMyCentre for both roles.
 */
export const getOrganiserCentres = (params) => axios.get("/api/organiser/exhibition-centres", { params });

export const createMyCentre = (form, photo) => axios.post("/api/organiser/exhibition-centres", toFormData(form, photo));

export const updateMyCentre = (id, form, photo) => axios.put(`/api/organiser/exhibition-centres/${id}`, toFormData(form, photo));

export const deleteMyCentre = (id) => axios.delete(`/api/organiser/exhibition-centres/${id}`);
