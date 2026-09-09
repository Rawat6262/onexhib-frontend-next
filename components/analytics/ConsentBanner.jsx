"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CONSENT_KEY } from "./ConsentGate";

/**
 * Cookie consent banner for analytics.
 *
 * Only appears when the visitor has made no choice yet. The decision is stored
 * per-browser in localStorage and mirrored to Google Consent Mode via
 * `gtag('consent', 'update')`, which ConsentGate has already primed with
 * denied-by-default. Declining is a first-class outcome: it is recorded so the
 * banner does not nag, and no analytics cookie is ever written.
 *
 * Renders nothing until mounted. Reading localStorage during render would
 * differ between server and client and cause a hydration mismatch, so the
 * first paint is deliberately empty and the banner appears a frame later.
 */
export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let stored = null;
    // Private browsing and blocked site-data both throw here rather than
    // returning null, so a bare read would break the whole page.
    try {
      stored = window.localStorage.getItem(CONSENT_KEY);
    } catch {
      // No storage available: show the banner, but a choice cannot persist,
      // so the visitor would see it again. Staying silent is the kinder
      // behaviour, and consent stays denied.
      return;
    }
    if (stored !== "granted" && stored !== "denied") setVisible(true);
  }, []);

  const choose = (value) => {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // Ignore: the gtag update below still applies for this page view.
    }
    if (typeof window.gtag === "function") {
      window.gtag("consent", "update", {
        analytics_storage: value === "granted" ? "granted" : "denied",
      });
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-[100] px-4 pb-4 sm:px-6 sm:pb-6"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-xl backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 sm:flex-row sm:items-center sm:gap-6">
        <p className="flex-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          We&apos;d like to use analytics cookies to understand how OneXhib is used so we can
          improve it. They&apos;re never used for advertising. You can decline and the site works
          exactly the same.{" "}
          <Link
            href="/privacy-policy"
            className="font-medium text-[#131C55] underline underline-offset-2 hover:opacity-80 dark:text-blue-400"
          >
            Privacy Policy
          </Link>
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => choose("denied")}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 sm:flex-none"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose("granted")}
            className="flex-1 rounded-lg bg-[#131C55] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0E1B6B] sm:flex-none"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
