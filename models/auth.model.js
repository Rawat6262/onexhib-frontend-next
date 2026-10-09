import axios from "axios";

export const login = (email, password, rememberMe) =>
  axios.post(
    "/api/login",
    { email, password, rememberMe },
    { withCredentials: true }
  );

/*
 * Every OTP-issuing endpoint below (signup, resendOtp, requestPasswordReset)
 * answers with a `channels` block alongside the usual fields:
 *
 *   { email: true, sms: true, smsTo: "••••••3214" }
 *
 * The OTP goes to the account's mobile number as well as its email, but the SMS
 * is best effort on the server and `sms` can be false for reasons that are not
 * failures (no gateway key in this environment, a non-Indian number). Read it
 * through lib/otp.js rather than assuming both channels fired.
 */
export const signup = (payload, config) => axios.post("/api/signup", payload, config);

export const verifyOtp = (email, otp) => axios.post("/api/verify-otp", { email, otp });

/*
 * Re-issues the signup OTP over both channels.
 *
 * This route existed on the client long before it existed on the server: every
 * call answered 404 and the verify screen reported "Failed to resend OTP" with
 * no way forward. It is mounted now (Route.js :: POST /api/resend-otp).
 *
 * The server enforces a 60-second floor between codes and answers 429 with a
 * wait time, so the screen's countdown is a courtesy rather than the control —
 * every resend costs an email and a paid SMS.
 */
export const resendOtp = (email) => axios.post("/api/resend-otp", { email });

// newPass is sent up front and only applied once the OTP below confirms it's really the account owner.
export const requestPasswordReset = (email, newPass) =>
  axios.post("/api/app/forgot-password", { email, newPass });

export const confirmPasswordReset = (email, otp) =>
  axios.post("/api/app/verify-forgot-password", { email, otp });

export const logout = () => axios.post("/api/logout");
