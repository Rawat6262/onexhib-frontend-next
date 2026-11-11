"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BedDouble, Check, CircleCheck, ExternalLink, Globe, Inbox, Loader2, Mail, MapPin, Phone, Star, Trash2, X } from "lucide-react";

import { adminDeleteHotel, getAdminHotels, refreshHotelPages, reviewHotel } from "@/models/hotel.model";
import {
  AdminHeader,
  AdminPage,
  Badge,
  EmptyState,
  ErrorState,
  LoadingRows,
  Panel,
  StatCard,
  StatGrid,
  adminInput,
  btnPrimary,
  btnRow,
  btnRowDanger,
  timeAgo,
} from "@/components/admin/AdminUI";
import { confirmAction } from "@/lib/confirm";
import { STATUS, amenityOf, formatRate } from "@/lib/hotels";
import { directionsUrl } from "@/lib/google-maps";
import { hotelPath } from "@/lib/routes";

/**
 * Admin: the hotel review queue (Onexhib_backend Controller/hotel.controller.js).
 *
 * A hotel is shown next to exhibitions as a place to stay, so each one is
 * checked before it goes public: that it is a real hotel, where the map says,
 * with its own photos. Rejecting needs a reason - the owner is emailed it and
 * sees it on their dashboard, and saving any change sends the hotel back here.
 */

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Live" },
  { key: "rejected", label: "Rejected" },
];

export default function AdminHotelsClient() {
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState(null);
  const [counts, setCounts] = useState({});
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setRows(null);
    setError("");
    try {
      const { data } = await getAdminHotels({ status: tab });
      setRows(data?.items ?? []);
      setCounts(data?.counts ?? {});
    } catch (err) {
      setRows([]);
      setError(err?.response?.data?.message || "Could not load hotels.");
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const done = (id, from, to) => {
    setRows((prev) => prev.filter((r) => r._id !== id));
    setCounts((c) => ({ ...c, [from]: Math.max(0, (c[from] || 1) - 1), ...(to ? { [to]: (c[to] || 0) + 1 } : {}) }));
  };

  return (
    <AdminPage>
      <AdminHeader
        title="Hotels"
        description="Hotels listed by hotel accounts. Approved hotels appear beside every exhibition centre within 10 km and on the pages of the shows held there."
      />

      <StatGrid cols={3}>
        <StatCard icon={<Inbox size={16} />} tone="amber" label="Waiting for review" value={rows === null && counts.pending === undefined ? undefined : counts.pending || 0} warn={(counts.pending || 0) > 0} />
        <StatCard icon={<CircleCheck size={16} />} tone="emerald" label="Live" value={counts.approved ?? (rows === null ? undefined : 0)} />
        <StatCard icon={<X size={16} />} tone="rose" label="Rejected" value={counts.rejected ?? (rows === null ? undefined : 0)} />
      </StatGrid>

      <Panel
        title={TABS.find((t) => t.key === tab).label}
        count={rows ? rows.length : undefined}
        description={tab === "pending" ? "Oldest first, so nobody waits longest." : "Most recent first."}
        toolbar={
          <div role="tablist" aria-label="Filter by status" className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800/70">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
                    active ? "bg-white text-ox-navy shadow-sm dark:bg-gray-900 dark:text-white" : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  {t.label}
                  <span className="text-[11px] tabular-nums text-gray-400">{counts[t.key] ?? 0}</span>
                </button>
              );
            })}
          </div>
        }
      >
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : rows === null ? (
          <LoadingRows rows={3} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<BedDouble size={22} aria-hidden="true" />} title={tab === "pending" ? "No hotels waiting" : `No ${TABS.find((t) => t.key === tab).label.toLowerCase()} hotels`}>
            {tab === "pending" ? "When a hotel account submits a hotel, it appears here." : null}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((h) => (
              <HotelRow key={h._id} h={h} onDone={done} />
            ))}
          </ul>
        )}
      </Panel>
    </AdminPage>
  );
}

function HotelRow({ h, onDone }) {
  const [busy, setBusy] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const owner = h.owner || {};
  const ownerName = [owner.first_name, owner.last_name].filter(Boolean).join(" ") || owner.company_name || "Unknown account";
  const rate = formatRate(h.price_from, h.currency);
  const status = STATUS[h.status] || STATUS.pending;

  const decide = async (decision) => {
    if (decision === "reject" && !note.trim()) {
      setError("Say why, so the hotel knows what to fix.");
      return;
    }
    setBusy(decision);
    setError("");
    try {
      const { data } = await reviewHotel(h._id, decision, note.trim());
      toast.success(data?.message || "Saved.");
      refreshHotelPages();
      onDone(h._id, h.status, decision === "approve" ? "approved" : "rejected");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not save the decision.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    const ok = await confirmAction({
      title: `Delete ${h.name}?`,
      description: "The hotel, its page and its photos are removed for good. The owner's account is not affected.",
      confirmLabel: "Delete hotel",
      tone: "danger",
    });
    if (!ok) return;
    setBusy("delete");
    try {
      await adminDeleteHotel(h._id);
      toast.success("Hotel deleted.");
      refreshHotelPages();
      onDone(h._id, h.status, null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete the hotel.");
      setBusy(null);
    }
  };

  return (
    <li className="grid gap-5 px-5 py-5 lg:grid-cols-[13rem_minmax(0,1fr)_auto]">
      {/* Photos: the main thing to check against the name and the map. */}
      <div className="grid grid-cols-3 gap-1.5 self-start lg:grid-cols-2">
        {(h.photos || []).slice(0, 4).map((p, i) => (
          <a key={p._id || i} href={p.url} target="_blank" rel="noopener noreferrer" className={i === 0 ? "col-span-3 lg:col-span-2" : ""}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL, admin-only page */}
            <img src={p.url} alt="" className={`w-full rounded-lg object-cover ring-1 ring-gray-200 dark:ring-gray-800 ${i === 0 ? "aspect-[16/10]" : "aspect-square"}`} />
          </a>
        ))}
        {!h.photos?.length ? (
          <div className="col-span-3 grid aspect-[16/10] place-items-center rounded-lg bg-gray-100 text-xs text-gray-500 lg:col-span-2 dark:bg-gray-800">No photos</div>
        ) : null}
      </div>

      <div className="min-w-0 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{h.name}</h3>
          <Badge tone={status.tone}>{status.label}</Badge>
          {h.stars ? (
            <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-300">
              <Star size={12} aria-hidden="true" className="fill-current" /> {h.stars}
            </span>
          ) : null}
        </div>
        <p className="flex items-start gap-1.5 text-sm text-gray-600 dark:text-gray-300">
          <MapPin size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-gray-400" />
          <span>
            {h.address}
            {h.location ? (
              <>
                {" · "}
                <a href={directionsUrl({ lat: h.location.lat, lng: h.location.lng })} target="_blank" rel="noopener noreferrer" className="font-medium text-ox-blue hover:underline dark:text-blue-300">
                  Check on map
                </a>
              </>
            ) : null}
          </span>
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-gray-500 dark:text-gray-400">
          {rate ? <span>from {rate} / night</span> : null}
          {h.rooms ? <span>{h.rooms} rooms</span> : null}
          {h.website ? (
            <a href={h.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 hover:text-ox-blue">
              <Globe size={13} aria-hidden="true" /> Website
            </a>
          ) : null}
          {h.phone ? <span className="inline-flex items-center gap-1"><Phone size={13} aria-hidden="true" /> {h.phone}</span> : null}
          {h.email ? <span className="inline-flex items-center gap-1"><Mail size={13} aria-hidden="true" /> {h.email}</span> : null}
        </p>
        {h.amenities?.length ? (
          <p className="flex flex-wrap gap-1.5">
            {h.amenities.map((a) => <Badge key={a}>{amenityOf(a)?.label || a}</Badge>)}
          </p>
        ) : null}
        {h.description ? <p className="line-clamp-3 text-sm text-gray-600 dark:text-gray-400">{h.description}</p> : null}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Listed by <span className="font-semibold text-gray-700 dark:text-gray-200">{ownerName}</span>
          {owner.email ? ` · ${owner.email}` : ""}
          {owner.mobile_number ? ` · ${owner.mobile_number}` : ""} · {timeAgo(h.createdAt)}
        </p>
        {h.status === "rejected" && h.review_note ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-800 dark:bg-rose-400/10 dark:text-rose-200">Rejected: {h.review_note}</p>
        ) : null}

        {rejecting ? (
          <div className="space-y-2 pt-1">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">Why is it not approved? The owner sees this.</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={500}
                autoFocus
                placeholder="e.g. The photos show a different hotel. Please upload photos of this property."
                className={`${adminInput} h-auto py-2`}
              />
            </label>
            <div className="flex gap-2">
              <button type="button" className={btnRowDanger} disabled={busy} onClick={() => decide("reject")}>
                {busy === "reject" ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <X size={14} aria-hidden="true" />} Reject with reason
              </button>
              <button type="button" className={btnRow} onClick={() => { setRejecting(false); setError(""); }}>Cancel</button>
            </div>
          </div>
        ) : null}
        {error ? <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      </div>

      <div className="flex flex-wrap items-start gap-2 lg:flex-col lg:items-stretch">
        {h.status !== "approved" ? (
          <button type="button" className={btnPrimary} disabled={busy} onClick={() => decide("approve")}>
            {busy === "approve" ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Check size={15} aria-hidden="true" />} Approve
          </button>
        ) : (
          <Link href={hotelPath(h.slug)} target="_blank" className={btnRow}>
            <ExternalLink size={14} aria-hidden="true" /> View page
          </Link>
        )}
        {!rejecting && h.status !== "rejected" ? (
          <button type="button" className={btnRow} disabled={busy} onClick={() => setRejecting(true)}>
            <X size={14} aria-hidden="true" /> {h.status === "approved" ? "Take down" : "Reject"}
          </button>
        ) : null}
        <button type="button" className={btnRowDanger} disabled={busy} onClick={remove}>
          <Trash2 size={14} aria-hidden="true" /> Delete
        </button>
      </div>
    </li>
  );
}
