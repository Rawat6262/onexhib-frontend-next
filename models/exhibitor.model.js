import axios from "axios";

/**
 * The signed-in user's OWN exhibitor workspace (company, products, shows).
 * Every call is self-scoped: the backend resolves the company from the session,
 * so no company id is ever sent. Each write answers with the whole workspace
 * ({ company, products, participations }), which the page swaps in.
 *
 * Multipart calls set NO Content-Type - the browser adds the boundary.
 */
export const getWorkspace = () => axios.get("/api/exhibitor/workspace");

/** FormData with company fields and an optional "image" (logo). Creates on first save. */
export const saveCompany = (formData) => axios.put("/api/exhibitor/company", formData);

/** FormData with product fields and an optional "image". */
export const addProduct = (formData) => axios.post("/api/exhibitor/products", formData);
export const updateProduct = (productId, formData) => axios.put(`/api/exhibitor/products/${encodeURIComponent(productId)}`, formData);
export const deleteProduct = (productId) => axios.delete(`/api/exhibitor/products/${encodeURIComponent(productId)}`);

export const saveParticipation = (exhibitionId, { hall_no = "", stall_no = "" } = {}) =>
  axios.put(`/api/exhibitor/participations/${encodeURIComponent(exhibitionId)}`, { hall_no, stall_no });
export const removeParticipation = (exhibitionId) =>
  axios.delete(`/api/exhibitor/participations/${encodeURIComponent(exhibitionId)}`);
