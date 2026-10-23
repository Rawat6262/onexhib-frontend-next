"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";

import { cancelAccessRequest } from "@/models/exhibition.model";
import { btnRow } from "@/components/dashboard/ui";
import { Badge, fmtDate } from "@/components/admin/AdminUI";

const REQUEST_STATUS = {
  pending: { label: "Waiting for review", tone: "amber" },
  approved: { label: "Approved", tone: "emerald" },
  rejected: { label: "Not approved", tone: "rose" },
};

/** The organiser's access requests and where each stands. */
export default function MyAccessRequests({ items, onChange, onNew }) {
  const [busy, setBusy] = useState(null);
  async function cancel(id) {
    setBusy(id);
    try {
      await cancelAccessRequest(id);
      onChange();
    } catch {
      /* the list refresh below shows the real state */
      onChange();
    } finally {
      setBusy(null);
    }
  }
  return (
    <section aria-labelledby="requests-title" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="requests-title" className="text-lg font-bold text-gray-900 dark:text-gray-50">
            My access requests
          </h2>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
            Exhibitions you asked to edit. Approved ones appear under Shared with you.
          </p>
        </div>
        <button type="button" className={btnRow} onClick={onNew}>
          <Plus size={14} aria-hidden="true" />
          New request
        </button>
      </div>
      <ul className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
        {items.map((r) => {
          const st = REQUEST_STATUS[r.status] || { label: r.status, tone: "gray" };
          return (
            <li key={r._id} className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{r.exhibition?.name || "Exhibition removed"}</p>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Asked {fmtDate(r.createdAt)}
                  {r.decidedAt ? ` · decided ${fmtDate(r.decidedAt)}` : ""}
                </p>
                {r.status === "rejected" && r.note ? (
                  <p className="mt-1.5 text-[13px] text-rose-700 dark:text-rose-300">Note from the team: {r.note}</p>
                ) : null}
              </div>
              {r.status === "pending" ? (
                <button type="button" className={`${btnRow} shrink-0`} onClick={() => cancel(r._id)} disabled={busy === r._id}>
                  {busy === r._id ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : null}
                  Cancel request
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
