"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  CalendarDays,
  Check,
  CircleCheck,
  Eye,
  Inbox,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Phone,
  X,
} from "lucide-react";

import { approveAccessRequest, getAdminAccessRequests, rejectAccessRequest } from "@/models/exhibition.model";
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
import { exhibitionPath } from "@/lib/routes";

/**
 * Admin: organisers asking to edit an exhibition.
 *
 * Approve = the same grant as "Give access" on the Exhibitions page (the
 * backend runs one function for both), so the person gets the "you can now
 * edit" email and finds the show under "Shared with you". Reject takes an
 * optional reason, which is emailed to them and shown on their dashboard.
 * Anything the server refuses (not an Organiser any more, 10 editors already)
 * is shown as written and the request stays pending.
 */

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

function dateRange(a, b) {
  if (!a) return "Dates not set";
  const from = fmtDate(a);
  const to = b ? fmtDate(b) : "";
  return to && to !== from ? `${from} – ${to}` : from;
}

export default function AdminRequestsClient() {
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState(null);
  const [counts, setCounts] = useState({});
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setRows(null);
    setError("");
    try {
      const { data } = await getAdminAccessRequests(tab);
      setRows(data?.data ?? []);
      setCounts(data?.counts ?? {});
    } catch (err) {
      setRows([]);
      setError(err?.response?.data?.message || "Could not load access requests.");
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const decided = (id) => {
    setRows((prev) => prev.filter((r) => r._id !== id));
    setCounts((c) => ({ ...c, pending: Math.max(0, (c.pending || 1) - 1) }));
  };

  return (
    <AdminPage>
      <AdminHeader
        title="Access requests"
        description="Organisers asking to edit an exhibition already on OneXhib, usually one the team listed. Approving gives them the same edit access as “Give access” on the Exhibitions page."
      />

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
                    active ? "bg-white text-[#131C55] shadow-sm dark:bg-gray-900 dark:text-white" : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
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
          <EmptyState icon={<KeyRound size={22} aria-hidden="true" />} title={tab === "pending" ? "No requests waiting" : `No ${tab} requests`}>
            {tab === "pending" ? "When an organiser asks to edit an exhibition, it appears here." : null}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r) => (
              <RequestRow key={r._id} r={r} onDecided={decided} />
            ))}
          </ul>
        )}
      </Panel>
    </AdminPage>
  );
}

function RequestRow({ r, onDecided }) {
  const [busy, setBusy] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const u = r.user;
  const ex = r.exhibition;

  async function approve() {
    setBusy("approve");
    setError("");
    try {
      const { data } = await approveAccessRequest(r._id);
      toast.success(`${u?.name || "They"} can now edit ${ex?.name || "the exhibition"}${data?.emailed ? ". We emailed them." : "."}`);
      onDecided(r._id);
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
      await rejectAccessRequest(r._id, note.trim());
      toast.success("Request rejected. We let them know.");
      onDecided(r._id);
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
              {u && u.designation !== "ORGANISER" ? <Badge tone="amber">Not an Organiser</Badge> : null}
              {u && !u.verified ? <Badge tone="amber">Unverified</Badge> : null}
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
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Wants to edit</p>
          {ex ? (
            <>
              <p className="mt-0.5 font-semibold text-gray-900 dark:text-gray-100">{ex.name}</p>
              <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays size={12} aria-hidden="true" />
                  {dateRange(ex.starting_date, ex.ending_date)}
                </span>
                {ex.place ? (
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin size={12} aria-hidden="true" />
                    <span className="truncate">{ex.place}</span>
                  </span>
                ) : null}
              </p>
              {ex.addedBy ? <p className="mt-0.5 truncate text-xs text-gray-400">Listed by {ex.addedBy}</p> : null}
            </>
          ) : (
            <p className="mt-0.5 italic text-gray-400">This exhibition no longer exists</p>
          )}
        </div>

        {/* Decision */}
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {ex ? (
            <Link href={exhibitionPath(ex.name, ex._id)} target="_blank" rel="noopener" className={btnRow} title="Open the public page">
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
              <button type="button" onClick={approve} className={`${btnPrimary} h-9 px-3.5`} disabled={Boolean(busy) || !ex || !u}>
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
        <blockquote className="mt-3 rounded-xl border-l-4 border-[#2B3FB8]/40 bg-gray-50 px-4 py-2.5 text-sm leading-relaxed text-gray-700 dark:border-blue-400/40 dark:bg-white/[0.03] dark:text-gray-300">
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
