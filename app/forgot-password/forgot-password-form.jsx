"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { requestPasswordReset } from "@/models/auth.model";
import AuthCard from "@/components/auth/AuthCard";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&^_-]{8,}$/;

export default function ForgotPasswordForm({ initialEmail = "" }) {
  const router = useRouter();

  // Prefilled when the user comes back from the OTP step to request a new code.
  const [email, setEmail] = useState(initialEmail);
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = "Email is required.";
    else if (!EMAIL_RE.test(email.trim())) e.email = "Enter a valid email address.";

    if (!newPass) e.newPass = "New password is required.";
    else if (!PASSWORD_RE.test(newPass))
      e.newPass = "Password must be at least 8 characters and include a letter and a number.";

    if (newPass !== confirmPass) e.confirmPass = "Passwords do not match.";

    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      toast.error("Please fix the highlighted errors.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await requestPasswordReset(email.trim(), newPass);
      if (data.success) {
        toast.success(data.message || "OTP sent to your email!");
        // Was navigate(..., { state: { email } }) under React Router.
        router.push(`/reset-password?email=${encodeURIComponent(email.trim())}`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send OTP.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass = (hasError) =>
    `w-full px-4 py-2 rounded-lg border ${
      hasError ? "border-red-500" : "border-gray-300 dark:border-gray-700"
    } bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition`;

  return (
    <AuthCard formProps={{ onSubmit: handleSubmit }}>
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Reset Password</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Enter your email and a new password — we&apos;ll send an OTP to confirm it&apos;s you.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300" htmlFor="email">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            className={fieldClass(errors.email)}
          />
          {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300" htmlFor="newPass">
            New Password
          </label>
          <input
            type="password"
            id="newPass"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            className={fieldClass(errors.newPass)}
          />
          {errors.newPass && <p className="text-xs text-red-600 mt-1">{errors.newPass}</p>}
        </div>

        <div>
          <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300" htmlFor="confirmPass">
            Confirm New Password
          </label>
          <input
            type="password"
            id="confirmPass"
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            className={fieldClass(errors.confirmPass)}
          />
          {errors.confirmPass && <p className="text-xs text-red-600 mt-1">{errors.confirmPass}</p>}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 mt-2 text-lg rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-700 hover:to-purple-700 shadow-lg transition duration-200 disabled:opacity-60"
      >
        {isSubmitting ? "Sending OTP..." : "Send OTP"}
      </button>

      <div className="text-center">
        <Link
          href="/login"
          className="text-sm text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition"
        >
          ← Back to Login
        </Link>
      </div>
    </AuthCard>
  );
}
