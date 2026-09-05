import axios from "axios";

export const login = (email, password, rememberMe) =>
  axios.post(
    "/api/login",
    { email, password, rememberMe },
    { withCredentials: true }
  );

export const signup = (payload, config) => axios.post("/api/signup", payload, config);

export const verifyOtp = (email, otp) => axios.post("/api/verify-otp", { email, otp });

export const resendOtp = (email) => axios.post("/api/resend-otp", { email });

// newPass is sent up front and only applied once the OTP below confirms it's really the account owner.
export const requestPasswordReset = (email, newPass) =>
  axios.post("/api/app/forgot-password", { email, newPass });

export const confirmPasswordReset = (email, otp) =>
  axios.post("/api/app/verify-forgot-password", { email, otp });

export const logout = () => axios.post("/api/logout");
