"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { adminPendingChanged } from "@/lib/admin-pending";
import { Check, Globe, Landmark, Loader2, Mail, MapPin, Phone, X } from "lucide-react";

import { getAdminCentres, refreshCentrePages, reviewCentre } from "@/models/exhibitionCentre.model";
import {
  AdminHeader,
  AdminPage,
  Badge,
  EmptyState,
  ErrorState,
  LoadingRows,
  Panel,
  adminInput,
  btnPrimary,
  btnRow,
  timeAgo,
} from "@/components/admin/AdminUI";

/**
 * Admin: exhibition centres added by venue accounts. They stay out of every
 * public list until approved here. Rejecting keeps the venue hidden and shows
 * the reason on the venue's dashboard; when they edit and save it, it comes
 * back to "Waiting". Edit anything first on the Exhibition centres page.
 */

const TABS = [
  { key: "pending", label: "Waiting" },
  { key: "rejected", label: "Rejected" },
];

export default function PendingVenuesClient({ nav = null }) {
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setRows(null);
    setError("");
    try {
      const { data } = await getAdminCentres({ status: tab, limit: 100 });
      setRows(data?.items ?? []);
    } catch (err) {
      setRows([]);
      setError(err?.response?.data?.message || "Could not load venues.");
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const decided = (id) => {
    setRows((prev) => prev.filter((r) => r._id !== id));
    adminPendingChanged();
  };

  return (
    <AdminPage>
      <AdminHeader
        title="New venues"
        description="Exhibition centres added by venue accounts. They are hidden from the public until you approve them. Check the location and that it isn't already listed under another name."
      />
      {nav}

      <Panel
        className="mt-8"
        title={TABS.find((t) => t.key === tab).label}
        count={rows ? rows.length : undefined}
        toolbar={
          <div role="tablist" aria-label="Filter by status" className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800/70">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
                  tab === t.key ? "bg-white text-ox-navy shadow-sm dark:bg-gray-900 dark:text-white" : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      >
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : rows === null ? (
          <LoadingRows rows={3} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<Landmark size={22} aria-hidden="true" />} title={tab === "pending" ? "No venues waiting" : "No rejected venues"}>
            {tab === "pending" ? "When a venue account adds its centre, it appears here." : null}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((c) => (
              <VenueRow key={c._id} c={c} onDecided={decided} />
            ))}
          </ul>
        )}
      </Panel>
    </AdminPage>
  );
}

function VenueRow({ c, onDecided }) {
  const [busy, setBusy] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const mapUrl =
    c.location?.lat != null ? `https://www.google.com/maps/search/?api=1&query=${c.location.lat},${c.location.lng}` : null;

  async function decide(status) {
    setBusy(status);
    setError("");
    try {
      await reviewCentre(c._id, status, status === "rejected" ? note.trim() : "");
      toast.success(status === "approved" ? `${c.name} is now public.` : "Venue rejected. We let them know.");
      if (status === "approved") refreshCentrePages();
      onDecided(c._id);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not save the decision. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className="px-4 py-5 sm:px-5">
      <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-start">
        <div className="relative h-20 w-32 overflow-hidden rounded-xl bg-gradient-to-br from-ox-navy to-ox-blue">
          {c.photo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL, admin-only page
            <img src={c.photo.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span aria-hidden="true" className="absolute inset-0 grid place-items-center text-white/60"><Landmark size={26} strokeWidth={1.5} /></span>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{c.name}</p>
          <p className="mt-0.5 flex items-start gap-1.5 text-[13px] text-gray-600 dark:text-gray-400">
            <MapPin size={13} aria-hidden="true" className="mt-0.5 shrink-0 text-gray-400" />
            <span>{[c.address, c.city, c.state, c.country].filter(Boolean).join(", ")}</span>
          </p>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            {c.halls ? <span>{c.halls} halls</span> : null}
            {c.area_sqm ? <span>{Number(c.area_sqm).toLocaleString()} m²</span> : null}
            {c.website ? <a href={c.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline"><Globe size={12} aria-hidden="true" />Website</a> : null}
            {c.email ? <span className="inline-flex items-center gap-1"><Mail size={12} aria-hidden="true" />{c.email}</span> : null}
            {c.phone ? <span className="inline-flex items-center gap-1"><Phone size={12} aria-hidden="true" />{c.phone}</span> : null}
            {mapUrl ? <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">Check on the map</a> : null}
          </p>
          {c.description ? <p className="mt-2 line-clamp-3 text-sm text-gray-700 dark:text-gray-300">{c.description}</p> : null}
          <p className="mt-2 text-xs text-gray-400">
            Added {timeAgo(c.createdAt)}
            {c.status === "rejected" && c.review_note ? ` · reason: ${c.review_note}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {c.status === "rejected" ? <Badge tone="rose">Rejected</Badge> : null}
          {c.status === "pending" ? (
            <button type="button" onClick={() => setRejecting((v) => !v)} className={btnRow} disabled={Boolean(busy)}>
              <X size={13} aria-hidden="true" /> Reject
            </button>
          ) : null}
          <button type="button" onClick={() => decide("approved")} className={`${btnPrimary} h-9 px-3.5`} disabled={Boolean(busy)}>
            {busy === "approved" ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
            Approve
          </button>
        </div>
      </div>

      {rejecting ? (
        <div className="mt-3 flex flex-col gap-2 rounded-xl border border-gray-200 p-3 sm:flex-row sm:items-center dark:border-gray-800">
          <input
            type="text"
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What should they fix? (sent to them and shown on their dashboard)"
            aria-label="Reason for rejecting"
            className={adminInput}
          />
          <button
            type="button"
            onClick={() => decide("rejected")}
            disabled={Boolean(busy)}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {busy === "rejected" ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
            Confirm reject
          </button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      ) : null}
    </li>
  );
}
