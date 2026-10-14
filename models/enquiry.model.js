import axios from "axios";

/**
 * Message the owner of a listing (exhibition organiser, or the company behind a
 * company or product page). Signed-in only; the backend resolves the recipient's
 * address itself and never returns it.
 *
 * `targetType`: "exhibition" | "company" | "product"
 */
export const sendEnquiry = ({ targetType, targetId, message }) =>
  axios.post("/api/enquiries", { targetType, targetId, message });
