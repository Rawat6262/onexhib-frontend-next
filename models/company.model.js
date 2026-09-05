import axios from "axios";

// Caps each request at 500 records (see docs/admin-api.md). Single page, server-driven
// — for views that paginate/display server-side instead of loading the whole
// (potentially thousands-of-records) collection up front.
// Response shape: { data, page, limit, total, totalPages, companies, products }
export const getAdminCompaniesPage = ({ page = 1, limit = 50 } = {}) =>
  axios.get("/api/admin/company", { params: { page, limit } });

export const deleteAllCompanies = () => axios.delete("/api/admin/deleteallcompany");

export const getCompanyDetail = (companyId) => fetch(`/api/companydetail/${companyId}`);

export const updateCompany = (companyId, payload) =>
  fetch(`/api/admin/updatecompany/${companyId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // this route requires a logged-in admin
    body: JSON.stringify(payload),
  });

export const getCompaniesForExhibition = (exhibitionId) =>
  axios.get(`/api/company/${exhibitionId}`);

export const getCompanyById = (companyId) =>
  axios.get(`/api/company/addproduct/${companyId}`);

export const deleteCompany = (companyId) => axios.delete(`/api/delete/company/${companyId}`);

export const createCompany = (formData) =>
  axios.post("/api/company", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// createdBy = the exhibition ID these companies are being bulk-added under —
// only that exhibition's owner may upload.
export const uploadCompaniesExcel = (file, createdBy, onProgress) =>
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

    xhr.open("POST", "/api/company/upload-excel");
    xhr.send(formData);
  });
