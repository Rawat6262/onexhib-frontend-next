import axios from "axios";

/**
 * Listing requests (Onexhib_backend Controller/listingRequest.controller.js).
 *
 * Venue, service-provider and hotel accounts claim a listing already on
 * OneXhib ("this is mine, let me manage it"); a venue also asks to link an
 * exhibition to its centre. An admin approves or rejects each one.
 *
 * `listingType` is "centre" | "service" | "hotel"; `kind` is "claim" | "link".
 */

/** Listings of one type matching `q` (2+ characters), each with mine / claimed / requested. */
export const searchClaimableListings = (type, q, signal) =>
  axios.get("/api/listing-claims/search", { params: { type, q }, signal });

export const createListingRequest = (body) => axios.post("/api/listing-requests", body);

/** The caller's own requests, newest first; `type` narrows to one listing type. */
export const getMyListingRequests = (type) => axios.get("/api/listing-requests/mine", { params: type ? { type } : {} });

export const cancelListingRequest = (id) => axios.delete(`/api/listing-requests/${id}`);

/* Admin */
export const getAdminListingRequests = (status) => axios.get("/api/admin/listing-requests", { params: { status } });
export const approveListingRequest = (id) => axios.post(`/api/admin/listing-requests/${id}/approve`);
export const rejectListingRequest = (id, note) => axios.post(`/api/admin/listing-requests/${id}/reject`, { note });
