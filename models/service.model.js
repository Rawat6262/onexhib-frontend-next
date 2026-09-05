import axios from "axios";

export const getAdminExhibitionServices = () => axios.get("/api/getexhibitionservice");

export const addExhibitionService = (formData) =>
  axios.post("/api/addexhibitionservice", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getExhibitionServiceById = (serviceId) =>
  axios.get(`/api/getexhibitionservicebyid/${serviceId}`);

export const updateExhibitionService = (serviceId, formData) =>
  axios.put(`/api/editexhibitionservice/${serviceId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteExhibitionService = (serviceId) =>
  axios.delete(`/api/deleteexhibitionservice/${serviceId}`);
