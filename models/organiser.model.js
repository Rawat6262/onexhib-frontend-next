import axios from "axios";
import { fetchAllPages } from "@/lib/paginate";

// Caps each request at 500 records (see docs/admin-api.md), so this walks every
// page to get the full set. Response shape: { data, page, limit, total, totalPages }
export const getOrganisers = () =>
  fetchAllPages((page, limit) =>
    axios.get("/api/admin/signup", { params: { page, limit } })
  );

/**
 * Contact details for one organiser: first/last name, company, email, mobile and
 * address. Six fields, and the backend cannot return a seventh.
 *
 * PHASE 12B replaced `/api/find/signup/:id`, which answered with the ENTIRE Signup
 * document — bcrypt password hash, otp, otpExpires, otpAttempts, pendingPassword,
 * pincode, qrCode, isapproved and role included — to any authenticated caller.
 * The replacement is projected server-side and gated to self-or-admin.
 *
 * The id is encoded: it reaches a path segment, and this layer must not depend on
 * a caller having validated it.
 *
 * Response shape: { success, organiser: { ...six fields } } — note the wrapper,
 * which the old endpoint did not have.
 */
export const getOrganiserById = (organiserId) =>
  axios.get(`/api/organisers/${encodeURIComponent(String(organiserId))}/contact`);
