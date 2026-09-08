"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { login as loginRequest } from "@/models/auth.model";
import { useAuth } from "@/components/auth/AuthProvider";
import { homeRouteForRole } from "@/lib/auth";
import AuthCard, {
  authInput,
  authLabel,
  authLink,
  authPrimaryBtn,
  authSecondaryBtn,
} from "@/components/auth/AuthCard";

export default function LoginForm({ stats }) {
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
    <AuthCard formProps={{ onSubmit: handleSubmit }} stats={stats}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
          Welcome back
        </h1>
        <p className="mt-2 text-[15px] text-gray-600 dark:text-gray-400">
          Sign in to manage your exhibitions, companies and products.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className={authLabel} htmlFor="email">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@company.com"
            autoComplete="email"
            className={authInput}
          />
        </div>

        <div>
          <label className={authLabel} htmlFor="password">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Your password"
            autoComplete="current-password"
            className={authInput}
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={() => setRememberMe((prev) => !prev)}
              className="h-4 w-4 rounded border-gray-300 accent-[#131C55] dark:border-gray-600"
            />
            Remember me
          </label>
          <Link href="/forgot-password" className={`${authLink} text-sm`}>
            Forgot password?
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        <button type="submit" disabled={isSubmitting} className={authPrimaryBtn}>
          {isSubmitting ? "Signing in\u2026" : "Sign in"}
        </button>

        {/* A real link, not a second submit button: it navigates, and styling
            it as the primary action next to "Sign in" made the two compete. */}
        <Link href="/signup" className={authSecondaryBtn}>
          Create an account
        </Link>
      </div>

      <p className="text-center text-xs text-gray-400 dark:text-gray-500">
        <Link href="/privacy-policy" className="hover:text-[#131C55] hover:underline dark:hover:text-gray-300">
          Privacy policy
        </Link>
        <span className="mx-2">·</span>
        <Link href="/delete-account" className="hover:text-[#131C55] hover:underline dark:hover:text-gray-300">
          Delete account
        </Link>
      </p>
    </AuthCard>
  );
}
