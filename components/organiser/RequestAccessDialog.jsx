"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CalendarDays, Check, KeyRound, Loader2, MapPin, Search, Send, X } from "lucide-react";

import { requestExhibitionAccess } from "@/models/exhibition.model";
import { btnPrimary, btnSecondary, inputBase } from "@/components/dashboard/ui";
import { fmtDate } from "@/components/admin/AdminUI";

/**
 * Organiser: ask the OneXhib team for edit access to an exhibition they did not
 * create (usually their own show, listed by the team).
 *
 * Two steps: find the exhibition (the public catalogue search, all dates), then
 * say who you are. An admin approves or rejects in the admin console; approval
 * makes the show appear under "Shared with you", exactly like a direct grant.
 * The server's refusals ("you already own it", "switch to Organiser") are shown
 * as written.
 */
export default function RequestAccessDialog({ onClose, onSent, pendingIds = new Set(), sharedIds = new Set() }) {
  const [step, setStep] = useState("find");
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const reqRef = useRef(0);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(null);
      setSearching(false);
      return undefined;
    }
    const id = ++reqRef.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/exhibitions/search?scope=all&limit=12&search=${encodeURIComponent(term)}`);
        const data = await res.json();
        if (id === reqRef.current) setResults(Array.isArray(data?.items) ? data.items : []);
      } catch {
        if (id === reqRef.current) setResults([]);
      } finally {
        if (id === reqRef.current) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  async function send(e) {
    e.preventDefault();
    if (!picked) return;
    setSending(true);
    setError("");
    try {
      await requestExhibitionAccess(picked.id, message.trim());
      toast.success("Request sent. We will email you when an admin decides.");
      onSent?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not send the request. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const where = (r) => [r.venue, r.city, r.country].filter(Boolean).join(", ");
  const dates = (r) => (r.startDate ? `${fmtDate(r.startDate)}${r.endDate && fmtDate(r.endDate) !== fmtDate(r.startDate) ? ` – ${fmtDate(r.endDate)}` : ""}` : "Dates not set");

  return (
    <div className="ox-form fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-gray-950/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="req-title"
        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-gray-200 bg-white text-gray-900 shadow-2xl sm:max-w-xl sm:rounded-3xl dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-[#131C55] to-[#2B3FB8] px-5 py-5 text-white sm:px-6">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <KeyRound size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-100/80">
                Step {step === "find" ? "1" : "2"} of 2
              </p>
              <h2 id="req-title" className="mt-0.5 text-lg font-bold leading-snug">
                {step === "find" ? "Find your exhibition" : "Tell us who you are"}
              </h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 -mt-1 rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-blue-50/90">
            Is your show already on OneXhib? Ask for access and, once an admin approves, you can update its details,
            dates, images and logos from this dashboard.
          </p>
        </div>

        {step === "find" ? (
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <label htmlFor="req-search" className="text-sm font-semibold">
              Exhibition name, city or category
            </label>
            <div className="relative mt-2">
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                id="req-search"
                type="search"
                autoComplete="off"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="e.g. India Furniture Expo"
                className={`${inputBase} pl-9`}
              />
              {searching ? <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" aria-hidden="true" /> : null}
            </div>

            {results === null ? (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Type at least 2 letters. Upcoming, live and past shows are all searched.</p>
            ) : results.length === 0 && !searching ? (
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                No exhibitions match “{q.trim()}”. If it is not listed yet, close this and use “Add exhibition” instead.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
                {results.map((r) => {
                  const shared = sharedIds.has(r.id);
                  const pending = pendingIds.has(r.id);
                  const disabled = shared || pending;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setPicked(r);
                          setStep("note");
                          setError("");
                        }}
                        className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/[0.03]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{r.name}</p>
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {dates(r)}
                            {where(r) ? ` · ${where(r)}` : ""}
                          </p>
                        </div>
                        {shared ? (
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <Check size={13} aria-hidden="true" /> You have access
                          </span>
                        ) : pending ? (
                          <span className="shrink-0 text-xs font-semibold text-amber-600 dark:text-amber-400">Requested</span>
                        ) : (
                          <span className="shrink-0 text-xs font-semibold text-[#2B3FB8] dark:text-blue-300">Select</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <form onSubmit={send} className="flex-1 overflow-y-auto px-5 py-5 sm:px-6" noValidate>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
              <p className="font-semibold">{picked?.name}</p>
              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays size={12} aria-hidden="true" />
                  {picked ? dates(picked) : ""}
                </span>
                {picked && where(picked) ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} aria-hidden="true" />
                    {where(picked)}
                  </span>
                ) : null}
              </p>
            </div>

            <label htmlFor="req-message" className="mt-5 block text-sm font-semibold">
              Your role at this exhibition
            </label>
            <textarea
              id="req-message"
              rows={4}
              maxLength={500}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (error) setError("");
              }}
              placeholder="e.g. I'm the marketing manager at the organising company. You can reach me on +91 98XXX XXXXX to verify."
              className={`${inputBase} h-auto py-2.5`}
            />
            <p className="mt-1 text-right text-xs tabular-nums text-gray-400">{message.length}/500</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Helps the team confirm you represent the show. We will email you once it is decided.
            </p>

            {error ? (
              <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] leading-relaxed text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-between gap-2">
              <button type="button" className={btnSecondary} onClick={() => setStep("find")}>
                <ArrowLeft size={16} aria-hidden="true" />
                Back
              </button>
              <button type="submit" className={btnPrimary} disabled={sending}>
                {sending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
                {sending ? "Sending…" : "Send request"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
