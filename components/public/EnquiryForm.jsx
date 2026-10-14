"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, Loader2, LockKeyhole, MessageSquareText, Send, ShieldCheck } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { sendEnquiry } from "@/models/enquiry.model";

/**
 * "Send a message" to the owner of a listing, on exhibition, company and product
 * pages. Posts to POST /api/enquiries (Onexhib_backend/Controller/enquiry.controller.js).
 *
 * The page renders this only when the listing is `contactable`, so the form is
 * never offered for a listing the backend cannot deliver to.
 *
 * Guests see a sign-in prompt instead of the form: enquiries carry the sender's
 * account identity and reply address, which is what makes them worth answering
 * and what keeps the owner's inbox free of anonymous spam. The prompt returns
 * them to this page afterwards (?next=, validated by safeNextPath on /login).
 *
 * The recipient's address is never in the browser - not as a prop, not in a
 * response. The sender's own address IS shown, because that is where the reply
 * will come and they should be able to check it.
 */

const MIN = 10;
const MAX = 2000;

export default function EnquiryForm({ targetType, targetId, recipientLabel, listingName, className = "" }) {
  const pathname = usePathname();
  const { user, status } = useAuth();

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState("");

  const senderName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.company_name || "Your account";

  const submit = async (e) => {
    e.preventDefault();
    if (sending) return;
    const text = message.trim();
    if (text.length < MIN) {
      setError(`Please write at least ${MIN} characters.`);
      return;
    }
    setSending(true);
    setError("");
    try {
      const { data } = await sendEnquiry({ targetType, targetId, message: text });
      setSentTo(data?.message || `Your message was sent to ${recipientLabel}.`);
    } catch (err) {
      setError(err?.response?.data?.message || "Your message could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      aria-labelledby="enquiry-heading"
      className={`relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl shadow-indigo-900/[0.06] dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/30 ${className}`}
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#2B3FB8] via-[#5B5BF0] to-[#8B5CF6]" />

      <div className="grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {/* ── Intro ───────────────────────────────────────────────────── */}
        <div className="relative isolate overflow-hidden bg-gradient-to-br from-[#0B1240] via-[#131C55] to-[#2B1F7A] p-6 text-white sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -top-16 -right-16 -z-10 h-56 w-56 rounded-full bg-blue-400/25 blur-3xl" />
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <MessageSquareText size={22} aria-hidden="true" />
          </span>
          <h2 id="enquiry-heading" className="mt-5 text-2xl font-extrabold tracking-tight">
            Contact {recipientLabel}
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-blue-100/85">
            Ask about <span className="font-semibold text-white">{listingName}</span> — stands, pricing, availability,
            or anything else. Your message goes straight to their inbox.
          </p>
          <ul className="mt-6 list-none space-y-2.5 text-sm text-blue-100/80">
            <li className="flex items-start gap-2.5">
              <ShieldCheck size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-300" />
              Their email address stays private.
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-300" />
              They reply to you directly by email.
            </li>
          </ul>
        </div>

        {/* ── Form / states ──────────────────────────────────────────── */}
        <div className="p-6 sm:p-8">
          {status === "loading" ? (
            <div aria-busy="true" className="h-56 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ) : status !== "authed" ? (
            <div className="flex h-full flex-col items-center justify-center py-6 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#2B3FB8]/10 text-[#2B3FB8] dark:bg-blue-400/10 dark:text-blue-300">
                <LockKeyhole size={22} aria-hidden="true" />
              </span>
              <p className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">Sign in to send a message</p>
              <p className="mt-1.5 max-w-sm text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
                Messages are sent from your OneXhib account so {recipientLabel} knows who is asking and can reply.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link
                  href={`/login?next=${encodeURIComponent(pathname || "/")}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#131C55] to-[#2B3FB8] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/25 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:from-blue-600 dark:to-indigo-500"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 transition hover:border-[#2B3FB8] hover:text-[#2B3FB8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  Create account
                </Link>
              </div>
            </div>
          ) : sentTo ? (
            <div role="status" className="flex h-full flex-col items-center justify-center py-6 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                <CheckCircle2 size={28} aria-hidden="true" />
              </span>
              <p className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Message sent</p>
              <p className="mt-1.5 max-w-sm text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
                {sentTo} Replies will come to{" "}
                <strong className="text-gray-900 dark:text-gray-100">{user?.email}</strong>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSentTo("");
                  setMessage("");
                }}
                className="mt-5 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:border-[#2B3FB8] hover:text-[#2B3FB8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200 dark:bg-white/[0.03] dark:ring-white/10">
                <span
                  aria-hidden="true"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#131C55] text-xs font-bold text-white"
                >
                  {initials(senderName)}
                </span>
                <div className="min-w-0 text-sm">
                  <p className="truncate font-semibold text-gray-900 dark:text-gray-100">{senderName}</p>
                  <p className="truncate text-gray-500 dark:text-gray-400">Replies go to {user?.email}</p>
                </div>
              </div>

              <label htmlFor="enquiry-message" className="mt-5 mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Your message
              </label>
              <textarea
                id="enquiry-message"
                rows={6}
                maxLength={MAX}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (error) setError("");
                }}
                placeholder={`Hi, I'm interested in ${listingName}. Could you tell me more about…`}
                aria-invalid={Boolean(error)}
                aria-describedby="enquiry-count"
                className={`w-full resize-y rounded-xl border bg-white px-3.5 py-3 text-sm leading-relaxed text-gray-900 placeholder-gray-400 transition focus:outline-none focus:ring-4 motion-reduce:transition-none dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-500 ${
                  error
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
                    : "border-gray-300 focus:border-[#2B3FB8] focus:ring-[#2B3FB8]/15 dark:border-gray-700 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
                }`}
              />
              <p id="enquiry-count" className="mt-1.5 text-right text-xs text-gray-400 tabular-nums dark:text-gray-500">
                {message.length} / {MAX}
              </p>

              {error ? (
                <p role="alert" className="mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={sending}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#131C55] to-[#2B3FB8] px-6 py-3 text-[15px] font-semibold text-white shadow-lg shadow-indigo-900/25 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] disabled:opacity-60 motion-reduce:transition-none sm:w-auto dark:from-blue-600 dark:to-indigo-500"
              >
                {sending ? <Loader2 size={17} aria-hidden="true" className="animate-spin" /> : <Send size={17} aria-hidden="true" />}
                {sending ? "Sending…" : `Send to ${recipientLabel}`}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function initials(name) {
  return (
    String(name || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "OX"
  );
}
