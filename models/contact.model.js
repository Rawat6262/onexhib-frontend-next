import axios from "axios";

/**
 * The website contact form. POST /api/contact is public (no session needed),
 * rate limited per IP, and delivers to the team inbox only.
 *
 * `payload`: { name, email, topic, message, website } - `website` is the
 * honeypot and must be sent empty by real visitors.
 */
export const sendContactMessage = (payload) => axios.post("/api/contact", payload);
