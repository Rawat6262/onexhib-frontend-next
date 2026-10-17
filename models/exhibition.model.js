import axios from "axios";

// No page/limit → backend returns every exhibition the user owns.
// Pass { page, limit } to get a paginated slice instead.
export const getExhibitions = (params) =>
  axios.get("/api/exhibition", { params, withCredentials: true });

// Admin list endpoint has no per-user scoping and caps each request at 500 records
// (see docs/admin-api.md). Single page, server-driven — for views that paginate/
// display server-side instead of loading the whole (potentially thousands-of-
// records) collection up front.
// Response shape: { success, data, page, limit, total, totalPages, companies, products }
export const getAdminExhibitionsPage = ({ page = 1, limit = 50 } = {}) =>
  axios.get("/api/admin/exhibition", { params: { page, limit } });

// Admin-only — exhibitions whose starting_date falls within a given month/year, paginated.
export const getExhibitionsByMonthYear = ({ month, year, page = 1, limit = 50 } = {}) =>
  axios.get("/api/exhibitions/monthly", { params: { month, year, page, limit } });
// export const getAdminExhibitionsPage = ({ page = 1, limit = 50 } = {}) =>
//   axios.get("/api/admin/exhibition", { params: { page, limit } });

export const getExhibitionById = (exhibitionId) =>
  axios.get(`/api/find/exhibition/${exhibitionId}`);

export const fetchExhibitionById = (exhibitionId) =>
  fetch(`/api/find/exhibition/${exhibitionId}`);

export const findExhibitionByOrganiser = (id) =>
  axios.post("/api/findexhibition", { id });

export const createExhibition = (formData) =>
  axios.post("/api/exhibition", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const updateExhibition = (exhibitionId, payload) =>
  fetch(`/api/exhibition/${exhibitionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // this route requires a logged-in owner
    body: JSON.stringify(payload),
  });

// Admin-only equivalent — updates any exhibition regardless of owner.
export const adminUpdateExhibition = (exhibitionId, payload) =>
  fetch(`/api/admin/updateexhibitions/${exhibitionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // this route requires a logged-in admin
    body: JSON.stringify(payload),
  });

export const deleteExhibition = (id) => axios.delete(`/api/delete/exhibition/${id}`);

/*
 * EDIT ACCESS - an admin lets a show's real organiser edit a listing the OneXhib
 * team created. The editor saves through the normal owner routes above
 * (updateExhibition, the logo calls); the server decides who may. They can edit,
 * never delete. Refusals come back as 409 with a message to show as-is.
 */

// Exhibitions an admin gave the signed-in user edit access to ("Shared with you").
export const getSharedExhibitions = () => axios.get("/api/exhibition/shared");

// Admin-only. Each answers with the panel's full state:
// { exhibition, editors: [{ _id, name, email, company_name }], recentChanges, maxEditors }
export const getExhibitionEditors = (id) => axios.get(`/api/admin/exhibition/${id}/editors`);

export const grantExhibitionEditor = (id, email) =>
  axios.post(`/api/admin/exhibition/${id}/editors`, { email });

export const revokeExhibitionEditor = (id, userId) =>
  axios.delete(`/api/admin/exhibition/${id}/editors/${userId}`);

// Admin-only equivalent — deletes any exhibition regardless of owner.
export const adminDeleteExhibition = (id) => axios.delete(`/api/admin/exhibition/${id}`);

// Admin-only — marks an exhibition as featured (is_featured: true).
export const featureExhibition = (id) =>
  axios.put(`/api/admin/exhibition/${id}/feature`, {}, { withCredentials: true });

// Admin-only — removes an exhibition from featured (is_featured: false).
export const unfeatureExhibition = (id) =>
  axios.put(`/api/admin/exhibition/${id}/unfeature`, {}, { withCredentials: true });

export const uploadExhibitionsExcel = (file, onProgress) =>
  new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      const response = JSON.parse(xhr.responseText);
      if (xhr.status === 200 || xhr.status === 201) {
        resolve(response);
      } else {
        reject(new Error(response.message || "Upload failed"));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error. Please try again.")));

    xhr.open("POST", "/api/exhibition/upload-excel");
    xhr.send(formData);
  });

/*
 * Sponsor / partner logos on an existing exhibition (owner or admin).
 * kind: "sponsor" | "partner". Each answers { sponsor_logos, partner_logos }.
 * No Content-Type is set for the upload - the browser adds the multipart boundary.
 */
export const addExhibitionLogos = (exhibitionId, kind, files) => {
  const data = new FormData();
  for (const f of files) data.append("logos", f);
  return axios.post(`/api/exhibition/${encodeURIComponent(exhibitionId)}/logos/${kind}`, data);
};

export const removeExhibitionLogo = (exhibitionId, kind, logoId) =>
  axios.delete(`/api/exhibition/${encodeURIComponent(exhibitionId)}/logos/${kind}/${encodeURIComponent(logoId)}`);

/**
 * Ask the site to rebuild one exhibition's public page now rather than after its
 * 5-minute cache. Fire-and-forget: a failure only means the change appears a
 * few minutes later, so it never blocks or fails the edit that triggered it.
 */
export const refreshExhibitionPage = (exhibitionId) => {
  if (!exhibitionId) return;
  fetch("/api/revalidate/exhibition", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id: String(exhibitionId) }),
  }).catch(() => {});
};
