import axios from "axios";
import { fetchAllPages } from "@/lib/paginate";

// Caps each request at 500 records (see docs/admin-api.md), so this walks every
// page to get the full set. Response shape: { data, page, limit, total, totalPages }
export const getOrganisers = () =>
  fetchAllPages((page, limit) =>
    axios.get("/api/admin/signup", { params: { page, limit } })
  );

export const getOrganiserById = (organiserId) =>
  axios.get(`/api/find/signup/${organiserId}`);
