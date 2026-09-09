"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Lock } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";

/**
 * The "Ask AI" entry point on the homepage hero.
 *
 * WHY THE BUTTON IS SHOWN TO EVERYONE
 * Hiding it from signed-out visitors would hide the reason to sign up. So it is
 * always visible, and the difference is what happens on click:
 *
 *   signed in  -> straight to /ai-search
 *   signed out -> an inline notice explaining that sign-in is required, with
 *                 the two links needed to resolve it
 *
 * The notice appears in place rather than as a redirect or a toast: a visitor
 * who clicks a button on the homepage should not be thrown to /login with no
 * explanation, and a toast disappears before it can be acted on.
 *
 * While the session is still being read the button routes to /ai-search anyway
 * - that page runs the same check and shows the same panel, so the worst case
 * is one extra navigation rather than a wrong answer.
 */
export default function AiSearchLauncher() {
  const { status } = useAuth();
  const router = useRouter();
  const [showNotice, setShowNotice] = useState(false);

  const signedOut = status === "guest";

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => {
          if (signedOut) setShowNotice(true);
          else router.push("/ai-search");
        }}
        aria-expanded={signedOut ? showNotice : undefined}
        className="inline-flex items-center gap-2 rounded-xl border border-[#131C55]/25 bg-white px-4 py-2.5 text-sm font-semibold text-[#131C55] transition hover:border-[#131C55] hover:bg-[#131C55]/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-blue-400/30 dark:bg-gray-900 dark:text-blue-300 dark:hover:border-blue-400"
      >
        <Sparkles size={16} aria-hidden="true" />
        Ask AI to find an exhibition
        <ArrowRight size={15} aria-hidden="true" className="opacity-60" />
      </button>

      {signedOut && showNotice ? (
        <div
          role="status"
          className="mt-3 max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <Lock size={14} aria-hidden="true" className="text-[#131C55] dark:text-blue-300" />
            Please sign in to use AI search
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
            AI search is available to signed-in users. If you have just registered, verify your
            email first using the code we sent you.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#131C55] px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#0E1B6B] motion-reduce:transition-none"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-[13px] font-semibold text-gray-900 transition hover:border-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-500"
            >
              Create an account
            </Link>
            <button
              type="button"
              onClick={() => setShowNotice(false)}
              className="rounded-lg px-3 py-2 text-[13px] font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Not now
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
