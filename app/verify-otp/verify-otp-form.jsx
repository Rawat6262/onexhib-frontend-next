"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { verifyOtp, resendOtp } from "@/models/auth.model";
import { useAuth } from "@/components/auth/AuthProvider";
import { homeRouteForRole } from "@/lib/auth";
import AuthCard from "@/components/auth/AuthCard";
import OtpInput, { EMPTY_OTP } from "@/components/auth/OtpInput";

export default function VerifyOtpForm({ initialEmail = "" }) {
  const [otp, setOtp] = useState(EMPTY_OTP);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const otpRef = useRef(null);
  const router = useRouter();
  const { signIn } = useAuth();

  // Carried from signup. React Router passed this via navigate state, which the
  // App Router has no equivalent for — it arrives as a query param the page
  // reads on the server and hands down.
  const email = initialEmail;

  useEffect(() => {
    if (!email) {
      toast.error("Session expired. Please signup again.");
      router.replace("/signup");
    }
  }, [email, router]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpValue = otp.join("");

    if (otpValue.length < 6) {
      toast.error("Please enter all 6 digits.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await verifyOtp(email, Number(otpValue));

      if (data.success) {
        // The Vite version also did localStorage.setItem('token', data.token),
        // putting a raw JWT in storage readable by any script. Dropped: the
        // session already travels in the httpOnly uid cookie Express sets here.
        signIn(data.user);
        toast.success("Account verified successfully!");
        router.push(homeRouteForRole(data.user.designation));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Invalid OTP. Please try again.");
      setOtp(EMPTY_OTP);
      otpRef.current?.focusFirst();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    try {
      await resendOtp(email);
      toast.success("New OTP sent to your email!");
      setResendTimer(60);
      setCanResend(false);
      setOtp(EMPTY_OTP);
      otpRef.current?.focusFirst();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to resend OTP.");
    }
  };

  return (
    <AuthCard formProps={{ onSubmit: handleSubmit }}>
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Verify Your Email</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">We sent a 6-digit OTP to</p>
        <p className="text-sm font-semibold text-[#131C55] dark:text-blue-300 break-all">{email}</p>
      </div>

      <OtpInput ref={otpRef} value={otp} onChange={setOtp} />

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 text-lg rounded-xl bg-[#131C55] text-white font-semibold hover:bg-[#0E1B6B] shadow-sm transition disabled:opacity-60 motion-reduce:transition-none"
      >
        {isSubmitting ? "Verifying..." : "Verify OTP"}
      </button>

      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        Didn&apos;t receive the OTP?{" "}
        {canResend ? (
          <button
            type="button"
            onClick={handleResend}
            className="text-[#131C55] dark:text-blue-300 font-semibold underline-offset-4 hover:underline"
          >
            Resend OTP
          </button>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">
            Resend in <span className="font-semibold text-gray-600 dark:text-gray-300">{resendTimer}s</span>
          </span>
        )}
      </div>

      <div className="text-center">
        <Link
          href="/signup"
          className="text-sm text-gray-400 dark:text-gray-500 hover:text-[#131C55] dark:hover:text-gray-300 hover:underline transition motion-reduce:transition-none"
        >
          ← Back to Signup
        </Link>
      </div>
    </AuthCard>
  );
}
