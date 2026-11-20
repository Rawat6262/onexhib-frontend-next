"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import {
  webPushConfigured,
  webPushSupported,
  needsIosHomeScreen,
  pushPermission,
  isEnrolled,
  enableWebPush,
  disableWebPush,
} from "@/lib/web-push";

/**
 * The one place a visitor turns browser notifications on or off.
 *
 * The browser's permission prompt only ever appears from the "Turn on" click,
 * never on page load. Renders nothing when push is not configured for this
 * deployment, so a missing Firebase setup leaves no dead control behind.
 */
export default function WebPushCard() {
  const { user } = useAuth();
  // null until read on the client: the browser APIs do not exist during SSR.
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!webPushConfigured()) return setState("hidden");
    if (needsIosHomeScreen()) return setState("ios");
    if (!webPushSupported()) return setState("unsupported");
    const permission = pushPermission();
    if (permission === "denied") return setState("denied");
    setState(permission === "granted" && isEnrolled(user) ? "on" : "off");
  }, [user]);

  if (!state || state === "hidden") return null;

  const turnOn = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await enableWebPush(user);
      setState(result === "granted" ? "on" : result === "denied" ? "denied" : "off");
    } catch (err) {
      console.error("Could not turn on notifications:", err);
      setError("Notifications could not be turned on. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    setError("");
    try {
      await disableWebPush(user);
      setState("off");
    } catch (err) {
      console.error("Could not turn off notifications:", err);
      setError("Notifications could not be turned off. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const copy = {
    off: {
      title: "Get notified when the site is closed",
      text: "Meeting requests, enquiries, new followers and comments, and the shows on today, as browser notifications.",
    },
    on: {
      title: "Browser notifications are on",
      text: "This browser will alert you even when OneXhib is closed.",
    },
    denied: {
      title: "Notifications are blocked for this site",
      text: "To turn them on, allow notifications for OneXhib in your browser's site settings, then reload this page.",
    },
    ios: {
      title: "Notifications on iPhone and iPad",
      text: "Tap Share, then Add to Home Screen. Open OneXhib from your Home Screen and turn notifications on here.",
    },
    unsupported: {
      title: "Notifications are not available in this browser",
      text: "Try a recent version of Chrome, Edge, Firefox or Safari.",
    },
  }[state];

  const Icon = state === "on" || state === "off" ? BellRing : BellOff;

  return (
    <section
      aria-labelledby="web-push-title"
      className="mt-6 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center dark:border-gray-800 dark:bg-gray-900/50"
    >
      <Icon size={20} aria-hidden="true" className="shrink-0 text-ox-navy dark:text-blue-300" />
      <div className="min-w-0 flex-1">
        <h2 id="web-push-title" className="text-sm font-semibold text-gray-900 dark:text-white">
          {copy.title}
        </h2>
        <p className="mt-0.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{copy.text}</p>
        {error ? (
          <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
      </div>
      {state === "off" ? (
        <button
          type="button"
          onClick={turnOn}
          disabled={busy}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-ox-navy px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ox-navy motion-reduce:transition-none"
        >
          {busy ? "Turning on…" : "Turn on"}
        </button>
      ) : null}
      {state === "on" ? (
        <button
          type="button"
          onClick={turnOff}
          disabled={busy}
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-ox-navy hover:text-ox-navy disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ox-navy motion-reduce:transition-none dark:border-gray-700 dark:text-gray-300"
        >
          {busy ? "Turning off…" : "Turn off"}
        </button>
      ) : null}
    </section>
  );
}
