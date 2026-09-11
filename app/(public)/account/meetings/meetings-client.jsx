"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Handshake, MapPin } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";

/**
 * The signed-in user's meeting requests.
 *
 * WHAT THIS CAN AND CANNOT DO, AND WHY
 * /app/my/:userId lists the requests you SENT, and /app/status/:meetingId
 * changes a request's status. Both are implemented here.
 *
 * Creating a request is not, and cannot be from the public site as the API
 * stands: requestMeeting requires `requestedTo` — the recipient's user id. The
 * public layer deliberately never exposes user ids (the organiser's identity
 * reaches the frontend only as an email in `addedBy`, which is dropped as PII),
 * so there is no way to name a recipient from an exhibition or company page.
 * Publishing user ids to make the form work would be a privacy regression for a
 * feature with zero usage. It needs a backend endpoint that accepts an
 * exhibition or company id and resolves the owner server-side.
 *
 * So this page shows what exists and lets a user manage it, rather than
 * offering a form that cannot succeed.
 *
 * Client-rendered: this is one person's private correspondence, keyed on their
 * session cookie, and must never enter a shared ISR cache.
 */

const STATUS_STYLE = {
  pending: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  accepted: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  rejected: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  completed: "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
};

const fmtDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

export default function MeetingsClient() {
  const { status, user } = useAuth();
  const userId = user?._id || user?.id || null;
  const signedIn = status === "authed" && Boolean(userId);

  const [items, setItems] = useState([]);
  const [phase, setPhase] = useState("loading");
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    if (!signedIn) return;
    setPhase("loading");
    try {
      const res = await fetch(`/api/meetings?userId=${encodeURIComponent(userId)}`, {
        credentials: "include",
        headers: { "content-type": "application/json" },
      });
      if (res.status === 401) return setPhase("signed-out");
      if (res.status === 404) {
        setItems([]);
        return setPhase("done");
      }
      if (!res.ok) return setPhase("error");
      const body = await res.json().catch(() => null);
      setItems(Array.isArray(body?.data) ? body.data : []);
      setPhase("done");
    } catch {
      setPhase("error");
    }
  }, [signedIn, userId]);

  useEffect(() => {
    if (status === "loading") return;
    if (!signedIn) return setPhase("signed-out");
    load();
  }, [status, signedIn, load]);

  async function setStatus(meetingId, next) {
    if (busy) return;
    setBusy(meetingId);
    try {
      const res = await fetch(`/api/meetings/${encodeURIComponent(meetingId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) await load();
    } catch {
      /* the list simply stays as it was */
    } finally {
      setBusy(null);
    }
  }

  if (status === "loading" || phase === "loading") {
    return (
      <ul className="grid list-none gap-4">
        {[0, 1].map((i) => (
          <li
            key={i}
            className="h-28 animate-pulse rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
          />
        ))}
      </ul>
    );
  }

  if (phase === "signed-out") {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <Handshake size={22} aria-hidden="true" className="mx-auto text-[#131C55] dark:text-blue-300" />
        <h2 className="mt-3 text-base font-semibold text-gray-900 dark:text-gray-50">
          Sign in to see your meetings
        </h2>
        <Link
          href="/login"
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#131C55] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0E1B6B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55]"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-900/50">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your meetings could not be loaded right now.
        </p>
        <button
          type="button"
          onClick={load}
          className="mt-3 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#131C55] hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:text-gray-300"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900/50">
        <Handshake size={22} aria-hidden="true" className="mx-auto text-gray-400" />
        <h2 className="mt-3 text-base font-semibold text-gray-900 dark:text-gray-50">
          No meeting requests yet
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          Meeting requests you send will appear here, with their status and the organiser&apos;s reply.
          Requests are currently made from the OneXhib mobile app.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid list-none gap-4">
      {items.map((m) => {
        const to = m.requestedTo || {};
        const who =
          [to.first_name, to.last_name].filter(Boolean).join(" ") || to.company_name || "Organiser";
        const state = String(m.status || "pending").toLowerCase();
        return (
          <li
            key={m._id}
            className="ox-card rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">{who}</h2>
                {to.company_name && who !== to.company_name ? (
                  <p className="text-sm text-gray-500 dark:text-gray-500">{to.company_name}</p>
                ) : null}
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                  STATUS_STYLE[state] || STATUS_STYLE.pending
                }`}
              >
                {state}
              </span>
            </div>

            <dl className="mt-3 space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-start gap-2">
                <dt className="sr-only">When</dt>
                <CalendarClock size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-gray-400" />
                <dd>
                  {fmtDate(m.meetingDate)}
                  {m.meetingTime ? ` · ${m.meetingTime}` : ""}
                </dd>
              </div>
              {m.location ? (
                <div className="flex items-start gap-2">
                  <dt className="sr-only">Where</dt>
                  <MapPin size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-gray-400" />
                  <dd>{m.location}</dd>
                </div>
              ) : null}
            </dl>

            {m.purpose ? (
              <p className="mt-3 border-l-2 border-gray-200 pl-3 text-[15px] leading-relaxed text-gray-600 dark:border-gray-800 dark:text-gray-400">
                {m.purpose}
              </p>
            ) : null}

            {m.statusRemark ? (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                Reply: {m.statusRemark}
              </p>
            ) : null}

            {state === "pending" ? (
              <button
                type="button"
                onClick={() => setStatus(m._id, "cancelled")}
                disabled={busy === m._id}
                className="mt-4 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:opacity-50 dark:hover:bg-red-950/40 dark:hover:text-red-400"
              >
                {busy === m._id ? "Cancelling…" : "Cancel request"}
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
