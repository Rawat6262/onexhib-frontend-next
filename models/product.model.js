import axios from "axios";

export const getProductsForCompany = (companyId) => axios.get(`/api/product/${companyId}`);

export const getProductDetail = (productId) => fetch(`/api/product/detail/${productId}`);

// Caps each request at 500 records (see docs/admin-api.md). Single page, server-driven
// — for views that paginate/display server-side instead of loading the whole
// (potentially thousands-of-records) collection up front.
// Response shape: { data, page, limit, total, totalPages }
export const getAdminProductsPage = ({ page = 1, limit = 50 } = {}) =>
  axios.get("/api/admin/product", { params: { page, limit } });

export const deleteAllProducts = () => axios.delete("/api/admin/deleteallproduct");

export const updateProduct = (productId, payload) =>
  fetch(`/api/admin/updateproduct/${productId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // this route requires a logged-in admin
    body: JSON.stringify(payload),
  });

export const deleteProduct = (productId) =>
  fetch(`/api/delete/product/${productId}`, { method: "DELETE" });

export const createProduct = (formData) =>
  axios.post("/api/product", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// createdBy = the company ID these products are being bulk-added under —
// only that company's exhibition owner may upload.
export const uploadProductsExcel = (file, createdBy, onProgress) =>
  new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("createdBy", createdBy);

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

    xhr.open("POST", "/api/product/upload-excel");
    xhr.send(formData);
  });
