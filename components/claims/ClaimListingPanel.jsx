"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Clock3, KeyRound, Link2, Loader2, MapPin, Search, X } from "lucide-react";

import {
  cancelListingRequest,
  createListingRequest,
  getMyListingRequests,
  searchClaimableListings,
} from "@/models/listingRequest.model";
import { Badge, adminInput, btnPrimary, btnRow, fmtDate } from "@/components/admin/AdminUI";

/**
 * "Is your <listing> already on OneXhib? Claim it."
 *
 * Shared by the venue (/centre), services (/services) and hotel (/hotel)
 * dashboards. Search finds listings of one type; "Request access" sends a claim
 * with an optional note; an admin approves it and the listing moves to the
 * requester's dashboard. Below, the
 * account's own requests of this type with their status - including a venue's
 * "link this show" requests, sent from the venue dashboard.
 *
 * The backend enforces every rule (right account type, not already yours, one
 * pending request per listing, at most 10 waiting); we show its sentences as-is.
 */

const NOUN = {
  centre: { one: "venue", search: "Search by venue name or city" },
  service: { one: "service listing", search: "Search by business name or city" },
  hotel: { one: "hotel", search: "Search by hotel name or city" },
};
const STATUS = {
  pending: { label: "Waiting for review", tone: "amber" },
  approved: { label: "Approved", tone: "emerald" },
  rejected: { label: "Not approved", tone: "rose" },
};
const errMsg = (err, fallback) => err?.response?.data?.message || fallback;

export default function ClaimListingPanel({ listingType, title, intro, refreshKey = 0 }) {
  const noun = NOUN[listingType];
  const [requests, setRequests] = useState(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await getMyListingRequests(listingType);
      setRequests(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setRequests([]);
    }
  }, [listingType]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const cancel = async (r) => {
    try {
      await cancelListingRequest(r._id);
      setRequests((list) => list.filter((x) => x._id !== r._id));
      toast.success("Request cancelled.");
    } catch (err) {
      toast.error(errMsg(err, "Could not cancel the request."));
    }
  };

  return (
    <section aria-labelledby={`claim-${listingType}-title`} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ox-blue/10 text-ox-blue dark:bg-blue-400/15 dark:text-blue-300">
            <KeyRound size={19} />
          </span>
          <div>
            <h2 id={`claim-${listingType}-title`} className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">{intro}</p>
          </div>
        </div>
        {!open ? (
          <button type="button" className={btnPrimary} onClick={() => setOpen(true)}>
            <Search size={15} aria-hidden="true" /> Find my {noun.one}
          </button>
        ) : null}
      </div>

      {open ? <ClaimSearch listingType={listingType} noun={noun} onSent={load} onClose={() => setOpen(false)} /> : null}

      {requests?.length ? (
        <div className="mt-6 border-t border-gray-100 pt-5 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Your requests</h3>
          <ul className="mt-3 list-none space-y-2.5">
            {requests.map((r) => {
              const s = STATUS[r.status] || STATUS.pending;
              return (
                <li key={r._id} className="flex flex-col gap-2 rounded-2xl bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-gray-800/50">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {r.kind === "link" ? <Link2 size={14} aria-hidden="true" className="text-gray-400" /> : null}
                      {r.kind === "link"
                        ? `Link “${r.exhibition?.name || "an exhibition"}” to ${r.listing?.name || "your venue"}`
                        : r.listing?.name || `A ${noun.one} that was removed`}
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      Sent {fmtDate(r.createdAt)}
                      {r.decidedAt ? ` · decided ${fmtDate(r.decidedAt)}` : ""}
                    </p>
                    {r.status === "rejected" && r.note ? (
                      <p className="mt-1 text-[13px] text-rose-700 dark:text-rose-300">Note from the OneXhib team: {r.note}</p>
                    ) : null}
                  </div>
                  {r.status === "pending" ? (
                    <button type="button" className={btnRow} onClick={() => cancel(r)}>
                      <X size={14} aria-hidden="true" /> Cancel
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function ClaimSearch({ listingType, noun, onSent, onClose }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [asking, setAsking] = useState(null); // the listing being requested
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems(null);
      setError("");
      return undefined;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await searchClaimableListings(listingType, term, ctrl.signal);
        setItems(data?.items || []);
        setError("");
      } catch (err) {
        if (err?.name !== "CanceledError") setError(errMsg(err, "Search failed. Please try again."));
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, listingType]);

  const sent = (listingId) => {
    setItems((list) => list?.map((x) => (x._id === listingId ? { ...x, requested: true } : x)));
    setAsking(null);
    onSent();
  };

  return (
    <div className="mt-5 rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
      <div className="flex items-center gap-2">
        <label className="relative flex-1">
          <span className="sr-only">{noun.search}</span>
          <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={noun.search} className={`${adminInput} pl-9`} />
        </label>
        <button type="button" className={btnRow} onClick={onClose} aria-label="Close search">
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3" aria-live="polite">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Searching…</p>
        ) : error ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
        ) : items === null ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Type at least 2 letters.</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Nothing matches. If your {noun.one} isn&rsquo;t on OneXhib yet, add it instead.
          </p>
        ) : (
          <ul className="list-none divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((item) => (
              <li key={item._id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{item.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      {item.place ? <span className="inline-flex items-center gap-1"><MapPin size={12} aria-hidden="true" />{item.place}</span> : null}
                      {item.detail ? <span>{item.detail}</span> : null}
                      {item.claimed ? <span>Managed by another account</span> : null}
                    </p>
                  </div>
                  {item.mine ? (
                    <Badge tone="emerald"><Check size={11} aria-hidden="true" /> Yours</Badge>
                  ) : item.requested ? (
                    <Badge tone="amber"><Clock3 size={11} aria-hidden="true" /> Requested</Badge>
                  ) : asking?._id === item._id ? null : (
                    <button type="button" className={btnRow} onClick={() => setAsking(item)}>
                      <KeyRound size={14} aria-hidden="true" /> Request access
                    </button>
                  )}
                </div>
                {asking?._id === item._id ? (
                  <RequestForm listingType={listingType} item={item} onSent={() => sent(item._id)} onCancel={() => setAsking(null)} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RequestForm({ listingType, item, onSent, onCancel }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const send = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await createListingRequest({ kind: "claim", listingType, listing: item._id, message });
      toast.success("Request sent. We'll email you when the OneXhib team decides.");
      onSent();
    } catch (err) {
      toast.error(errMsg(err, "Could not send the request."));
      setSending(false);
    }
  };

  return (
    <form onSubmit={send} className="mt-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300" htmlFor={`msg-${item._id}`}>
        How can we confirm it&rsquo;s yours? <span className="font-normal text-gray-500">(optional)</span>
      </label>
      <textarea
        id={`msg-${item._id}`}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Your role, an official email address, a phone number we can call…"
        className={`${adminInput} mt-1.5`}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="submit" className={btnPrimary} disabled={sending}>
          {sending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <KeyRound size={14} aria-hidden="true" />}
          Send request
        </button>
        <button type="button" className={btnRow} onClick={onCancel} disabled={sending}>Cancel</button>
      </div>
    </form>
  );
}
