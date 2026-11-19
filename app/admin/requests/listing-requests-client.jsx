"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { adminPendingChanged } from "@/lib/admin-pending";
import { ArrowRightLeft, BedDouble, Briefcase, Building2, Check, CircleCheck, Eye, Inbox, Landmark, Link2, Loader2, Mail, MapPin, Phone, ShieldCheck, X } from "lucide-react";

import { approveListingRequest, getAdminListingRequests, rejectListingRequest } from "@/models/listingRequest.model";
import {
  AdminHeader,
  AdminPage,
  Badge,
  EmptyState,
  ErrorState,
  LoadingRows,
  Monogram,
  Panel,
  StatCard,
  StatGrid,
  adminInput,
  btnPrimary,
  btnRow,
  fmtDate,
  timeAgo,
} from "@/components/admin/AdminUI";
import { exhibitionCentrePath, exhibitionPath, hotelPath, servicePath } from "@/lib/routes";

/**
 * Admin: listing claims and venue link requests (ListingRequest).
 *
 * A claim: a venue, service-provider or hotel account says a listing is theirs.
 * Approving makes them its owner - moving it away from whoever managed it
 * before, which the row warns about. A link: a venue asks for an exhibition to
 * be listed at its centre; approving sets the show's venue (moving it if it
 * pointed elsewhere, also warned). Reject takes an optional reason, emailed to
 * them and shown on their dashboard. Anything the server refuses is shown as
 * written and the request stays pending.
 */

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];
const TYPE = {
  centre: { label: "Exhibition centre", claim: "Claims an exhibition centre", icon: Landmark, role: "EXHIBITION_CENTRE" },
  service: { label: "Service listing", claim: "Claims a service listing", icon: Briefcase, role: "EXHIBITION_SERVICE" },
  hotel: { label: "Hotel", claim: "Claims a hotel", icon: BedDouble, role: "HOTEL" },
};

export default function ListingRequestsClient({ nav = null }) {
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState(null);
  const [counts, setCounts] = useState({});
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setRows(null);
    setError("");
    try {
      const { data } = await getAdminListingRequests(tab);
      setRows(data?.data ?? []);
      setCounts(data?.counts ?? {});
    } catch (err) {
      setRows([]);
      setError(err?.response?.data?.message || "Could not load listing requests.");
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  // Move the row's count from Pending to where it went, and tell the sidebar
  // and section badges to refetch.
  const decided = (id, to) => {
    setRows((prev) => prev.filter((r) => r._id !== id));
    setCounts((c) => ({ ...c, pending: Math.max(0, (c.pending || 1) - 1), [to]: (c[to] || 0) + 1 }));
    adminPendingChanged();
  };

  return (
    <AdminPage>
      <AdminHeader
        title="Listing claims"
        description="Venues, service providers and hotels asking to manage a listing already on OneXhib, and venues asking for a show to be listed at their centre. Check who they are before approving: approving hands them the listing."
      />
      {nav}

      <StatGrid cols={3}>
        <StatCard icon={<Inbox size={16} />} tone="amber" label="Waiting for you" value={rows === null && counts.pending === undefined ? undefined : counts.pending || 0} warn={(counts.pending || 0) > 0} />
        <StatCard icon={<CircleCheck size={16} />} tone="emerald" label="Approved" value={counts.approved ?? (rows === null ? undefined : 0)} />
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
          <EmptyState icon={<ShieldCheck size={22} aria-hidden="true" />} title={tab === "pending" ? "No claims waiting" : `No ${tab} requests`}>
            {tab === "pending" ? "When a venue, service provider or hotel claims a listing, it appears here." : null}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r) => (
              <ClaimRow key={r._id} r={r} onDecided={decided} />
            ))}
          </ul>
        )}
      </Panel>
    </AdminPage>
  );
}

function listingHref(r) {
  const l = r.listing;
  if (!l) return null;
  if (r.listingType === "centre" && l.slug) return exhibitionCentrePath(l.slug);
  if (r.listingType === "hotel" && l.slug) return hotelPath(l.slug);
  if (r.listingType === "service" && l._id) return servicePath(l.name, l._id);
  return null;
}

function ClaimRow({ r, onDecided }) {
  const [busy, setBusy] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const u = r.user;
  const type = TYPE[r.listingType] || TYPE.centre;
  const TypeIcon = type.icon;
  const isLink = r.kind === "link";
  const href = isLink && r.exhibition ? exhibitionPath(r.exhibition.name, r.exhibition._id) : listingHref(r);

  async function approve() {
    setBusy("approve");
    setError("");
    try {
      const { data } = await approveListingRequest(r._id);
      toast.success(
        isLink
          ? `${r.exhibition?.name || "The show"} is now listed at ${r.listing?.name || "their venue"}${data?.emailed ? ". We emailed them." : "."}`
          : `${u?.name || "They"} now manage ${r.listing?.name || "the listing"}${data?.emailed ? ". We emailed them." : "."}`
      );
      onDecided(r._id, "approved");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not approve. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    setBusy("reject");
    setError("");
    try {
      await rejectListingRequest(r._id, note.trim());
      toast.success("Request rejected. We let them know.");
      onDecided(r._id, "rejected");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not reject. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className="px-4 py-5 sm:px-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-start">
        {/* Who */}
        <div className="flex min-w-0 items-start gap-3">
          <Monogram name={u?.name || "?"} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-semibold text-gray-900 dark:text-gray-100">{u?.name || "Deleted account"}</p>
              {u && u.designation !== type.role ? <Badge tone="amber">Account type changed</Badge> : null}
            </div>
            {u ? (
              <div className="mt-1 space-y-0.5 text-[13px] text-gray-600 dark:text-gray-400">
                <p className="flex items-center gap-1.5 truncate">
                  <Mail size={12} aria-hidden="true" className="shrink-0 text-gray-400" />
                  <a href={`mailto:${u.email}`} className="truncate hover:underline">{u.email}</a>
                </p>
                {u.phone ? (
                  <p className="flex items-center gap-1.5 tabular-nums">
                    <Phone size={12} aria-hidden="true" className="shrink-0 text-gray-400" />
                    {u.phone}
                  </p>
                ) : null}
                {u.company ? (
                  <p className="flex items-center gap-1.5 truncate">
                    <Building2 size={12} aria-hidden="true" className="shrink-0 text-gray-400" />
                    {u.company}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* What */}
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            {isLink ? <Link2 size={12} aria-hidden="true" /> : <TypeIcon size={12} aria-hidden="true" />}
            {isLink ? "Link a show to their venue" : type.claim}
          </p>
          {isLink ? (
            <>
              <p className="mt-0.5 font-semibold text-gray-900 dark:text-gray-100">{r.exhibition?.name || "A deleted exhibition"}</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {r.exhibition?.starting_date ? fmtDate(r.exhibition.starting_date) : "Dates not set"}
                {r.exhibition?.place ? ` · ${r.exhibition.place}` : ""}
              </p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">at <b>{r.listing?.name || "a deleted venue"}</b></p>
              {r.exhibition?.linkedTo ? (
                <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                  <ArrowRightLeft size={12} aria-hidden="true" /> Currently listed at {r.exhibition.linkedTo}; approving moves it.
                </p>
              ) : null}
            </>
          ) : r.listing ? (
            <>
              <p className="mt-0.5 font-semibold text-gray-900 dark:text-gray-100">{r.listing.name}</p>
              <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-500 dark:text-gray-400">
                {r.listing.place ? (
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin size={12} aria-hidden="true" />
                    <span className="truncate">{r.listing.place}</span>
                  </span>
                ) : null}
                {r.listing.detail ? <span>{r.listing.detail}</span> : null}
              </p>
              {r.currentOwner ? (
                <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                  <ArrowRightLeft size={12} aria-hidden="true" /> Managed now by {r.currentOwner.name} ({r.currentOwner.email}); approving moves it.
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-0.5 italic text-gray-400">This listing no longer exists</p>
          )}
        </div>

        {/* Decision */}
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {href ? (
            <Link href={href} target="_blank" rel="noopener" className={btnRow} title="Open the public page">
              <Eye size={13} aria-hidden="true" />
              View
            </Link>
          ) : null}
          {r.status === "pending" ? (
            <>
              <button type="button" onClick={() => setRejecting((v) => !v)} className={btnRow} disabled={Boolean(busy)}>
                <X size={13} aria-hidden="true" />
                Reject
              </button>
              <button type="button" onClick={approve} className={`${btnPrimary} h-9 px-3.5`} disabled={Boolean(busy) || !r.listing || !u}>
                {busy === "approve" ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
                Approve
              </button>
            </>
          ) : (
            <Badge tone={r.status === "approved" ? "emerald" : "rose"}>
              {r.status === "approved" ? "Approved" : "Rejected"}
              {r.decidedBy ? ` by ${r.decidedBy}` : ""}
            </Badge>
          )}
        </div>
      </div>

      {r.message ? (
        <blockquote className="mt-3 rounded-xl border-l-4 border-ox-blue/40 bg-gray-50 px-4 py-2.5 text-sm leading-relaxed text-gray-700 dark:border-blue-400/40 dark:bg-white/[0.03] dark:text-gray-300">
          {r.message}
        </blockquote>
      ) : (
        <p className="mt-3 text-xs italic text-gray-400">No note added.</p>
      )}
      <p className="mt-2 text-xs text-gray-400">
        Asked {timeAgo(r.createdAt)}
        {r.decidedAt ? ` · decided ${fmtDate(r.decidedAt)}` : ""}
        {r.status === "rejected" && r.note ? ` · reason: ${r.note}` : ""}
      </p>

      {rejecting && r.status === "pending" ? (
        <div className="mt-3 flex flex-col gap-2 rounded-xl border border-gray-200 p-3 sm:flex-row sm:items-center dark:border-gray-800">
          <input
            type="text"
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason (optional) - sent to them, e.g. we could not verify you"
            aria-label="Reason for rejecting"
            className={adminInput}
          />
          <button
            type="button"
            onClick={reject}
            disabled={Boolean(busy)}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {busy === "reject" ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
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
