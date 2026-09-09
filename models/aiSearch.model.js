import axios from "axios";

/**
 * Natural-language exhibition search.
 *
 * POST /api/exhibitions/ai-search  { query, page, limit }
 *
 * The backend uses the model only to turn a sentence into structured filters
 * (category, country, state, city, status, month/year, keyword) and then runs
 * those against MongoDB. Every exhibition in `data` is a real record - the model
 * never writes result content - so anything rendered from this response is as
 * trustworthy as the rest of the catalogue.
 *
 * Response shape:
 *   { success, message, filters, total, page, limit, totalPages, data[] }
 *
 * `message` is built server-side from the real filter and count, so it is safe
 * to show verbatim; it cannot describe results that were not actually returned.
 */
export const aiSearchExhibitions = ({ query, page = 1, limit = 12 }) =>
  axios.post("/api/exhibitions/ai-search", { query, page, limit });
