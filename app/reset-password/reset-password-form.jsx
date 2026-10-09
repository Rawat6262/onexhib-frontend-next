"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { confirmPasswordReset } from "@/models/auth.model";
import { parseSmsParam } from "@/lib/otp";
import AuthCard from "@/components/auth/AuthCard";
import OtpInput, { EMPTY_OTP } from "@/components/auth/OtpInput";

export default function ResetPasswordForm({ initialEmail = "", initialSmsTo = "" }) {
  const [otp, setOtp] = useState(EMPTY_OTP);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const otpRef = useRef(null);
  const router = useRouter();

  // Carried from the forgot-password step (was navigate state under React
  // Router); the page reads it from the query string on the server.
  const email = initialEmail;

  // The masked number the code was also texted to, or "" if it went to the inbox
  // only. Validated against the server's mask shape because it arrives from the
  // query string and is rendered. No state: unlike the signup verify screen,
  // this one has no resend button to re-report the channels.
  const smsTo = parseSmsParam(initialSmsTo);

  useEffect(() => {
    if (!email) {
      toast.error("Session expired. Please request a new OTP.");
      router.replace("/forgot-password");
    }
  }, [email, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpValue = otp.join("");

    if (otpValue.length < 6) {
      toast.error("Please enter all 6 digits.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await confirmPasswordReset(email, otpValue);

      if (data.success) {
        toast.success(data.message || "Password reset successfully!");
        router.push("/login");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Invalid OTP. Please try again.");
      setOtp(EMPTY_OTP);
      otpRef.current?.focusFirst();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard formProps={{ onSubmit: handleSubmit }}>
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Confirm Password Reset</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          We sent a 6-digit OTP to{smsTo ? " both of these" : ""}
        </p>
        <p className="text-sm font-semibold text-[#131C55] dark:text-blue-300 break-all">{email}</p>
        {/* Only when the server confirms the SMS left the gateway. The number is
            the one already on the account — a reset code is never sent to a
            number supplied with the request. */}
        {smsTo && (
          <p className="text-sm font-semibold text-[#131C55] dark:text-blue-300">
            and by SMS to {smsTo}
          </p>
        )}
      </div>

      <OtpInput ref={otpRef} value={otp} onChange={setOtp} />

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 text-lg rounded-xl bg-[#131C55] text-white font-semibold hover:bg-[#0E1B6B] shadow-sm transition disabled:opacity-60 motion-reduce:transition-none"
      >
        {isSubmitting ? "Verifying..." : "Reset Password"}
      </button>

      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        Didn&apos;t receive the OTP?{" "}
        <Link
          href={`/forgot-password?email=${encodeURIComponent(email)}`}
          className="text-[#131C55] dark:text-blue-300 font-semibold underline-offset-4 hover:underline"
        >
          Request a new one
        </Link>
      </div>

      <div className="text-center">
        <Link
          href="/login"
          className="text-sm text-gray-400 dark:text-gray-500 hover:text-[#131C55] dark:hover:text-gray-300 hover:underline transition motion-reduce:transition-none"
        >
          ← Back to Login
        </Link>
      </div>
    </AuthCard>
  );
}
