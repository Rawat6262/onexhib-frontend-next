"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { login as loginRequest } from "@/models/auth.model";
import { useAuth } from "@/components/auth/AuthProvider";
import { homeRouteForRole } from "@/lib/auth";
import AuthCard from "@/components/auth/AuthCard";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { signIn } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data } = await loginRequest(email, password, rememberMe);

      if (data.success) {
        // Only the non-sensitive profile is cached. The session itself lives in
        // the httpOnly uid cookie Express just set — never in localStorage.
        signIn(data.user);
        toast.success("Login successful!");
        router.push(homeRouteForRole(data.user.designation));
      } else {
        toast.error("Login failed!");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || `Login failed! ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard formProps={{ onSubmit: handleSubmit }}>
      <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100">
        Sign in to OneXhib
      </h1>

      <div className="space-y-6">
        <div>
          <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300" htmlFor="email">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Email"
            autoComplete="email"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition"
          />
        </div>

        <div>
          <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300" htmlFor="password">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Password"
            autoComplete="current-password"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition"
          />
          <div className="flex justify-between mt-2">
            <label className="flex items-center text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe((prev) => !prev)}
                className="mr-2 accent-blue-600"
              />
              Remember me
            </label>
            <Link
              href="/forgot-password"
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
            >
              Forgot password?
            </Link>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 mt-6 text-lg rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-700 hover:to-purple-700 shadow-lg transition duration-200 disabled:opacity-60"
      >
        {isSubmitting ? "Logging in..." : "Login"}
      </button>

      <Link
        href="/signup"
        className="block text-center w-full py-3 mt-3 text-lg rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-semibold hover:bg-blue-600 hover:text-white shadow-md transition duration-200"
      >
        Signup
      </Link>

      <p className="text-center text-xs text-gray-400 dark:text-gray-500 space-x-3">
        <Link href="/privacy-policy" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition">
          Privacy Policy
        </Link>
        <span>·</span>
        <Link href="/delete-account" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition">
          Delete Account
        </Link>
      </p>
    </AuthCard>
  );
}
