"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, UserCheck, X } from "lucide-react";
import { toast } from "sonner";

import { Panel, NoResults, btnRow, btnRowDanger } from "@/components/dashboard/ui";
import { Badge, Monogram, fmtDate } from "@/components/admin/AdminUI";
import { getSelfListedExhibitors, refreshExhibitionPage, setSelfListedStatus } from "@/models/exhibition.model";
import { confirmAction } from "@/lib/confirm";

/**
 * Companies that listed themselves at this exhibition from the exhibitor
 * workspace ("I'm exhibiting here"), and the organiser's say over them.
 *
 * Every such company waits here as pending until the organiser approves it;
 * only then does it appear in the show's public exhibitor list. The organiser
 * can decline a listing, which hides it - and can approve it again later.
 * Declining deletes nothing: the company belongs to its exhibitor. The same
 * requests across all of an organiser's shows are on /organiser/exhibitor-requests.
 * Backend rules live in Onexhib_backend/Controller/exhibitorApproval.controller.js.
 *
 * Renders nothing when the caller cannot manage this show (the API answers 404),
 * so it is safe to mount on any manage page.
 */
const STATUS = {
  pending: { label: "Waiting for approval", tone: "amber" },
  approved: { label: "Listed", tone: "emerald" },
  declined: { label: "Declined", tone: "rose" },
};

const message = (err, fallback) => err?.response?.data?.message || fallback;

export default function SelfListedExhibitors({ exhibitionId, onChange }) {
  const [state, setState] = useState(null); // { items }
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(null); // a companyId

  const load = useCallback(async () => {
    try {
      const { data } = await getSelfListedExhibitors(exhibitionId);
      setState(data);
    } catch (err) {
      if (err?.response?.status === 404) setHidden(true);
      else setState({ items: [], error: true });
    }
  }, [exhibitionId]);

  useEffect(() => {
    load();
  }, [load]);

  // Every write answers with the panel's whole state. The public exhibitor list
  // changes too, so the cached exhibition page is dropped and the parent's
  // company table refetched.
  const applied = (data) => {
    setState(data);
    refreshExhibitionPage(exhibitionId);
    onChange?.();
  };

  const decide = async (item, status) => {
    if (status === "declined") {
      const ok = await confirmAction({
        title: `Decline ${item.company_name || "this company"}?`,
        description:
          "They will be hidden from this exhibition's exhibitor list and cannot list themselves here again. You can approve them later.",
        confirmLabel: "Decline",
      });
      if (!ok) return;
    }
    setBusy(item.companyId);
    try {
      const { data } = await setSelfListedStatus(exhibitionId, item.companyId, status);
      applied(data);
      toast.success(status === "approved" ? `${item.company_name} is now listed.` : `${item.company_name} was declined.`);
    } catch (err) {
      toast.error(message(err, "That could not be saved."));
    } finally {
      setBusy(null);
    }
  };

  if (hidden) return null;

  const items = state?.items || [];
  const pending = items.filter((i) => i.status === "pending").length;

  return (
    <Panel
      title="Self-listed exhibitors"
      count={pending ? `${pending} waiting` : items.length}
      description="Companies that added themselves to this show from their exhibitor workspace. They appear on the show's page only after you approve them."
    >
      {!state ? (
        <div className="flex items-center gap-2 px-5 py-6 text-sm text-gray-500">
          <Loader2 size={15} className="animate-spin" aria-hidden="true" /> Loading…
        </div>
      ) : state.error ? (
        <NoResults>
          Self-listed exhibitors could not be loaded.{" "}
          <button type="button" onClick={load} className="font-semibold text-[#2B3FB8] hover:underline dark:text-blue-300">
            Try again
          </button>
        </NoResults>
      ) : items.length === 0 ? (
        <NoResults title="No self-listed exhibitors yet" icon={<UserCheck size={22} aria-hidden="true" />}>
          When a company lists itself at this show, it will wait here for your approval.
        </NoResults>
      ) : (
        <ul className="list-none divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((item) => {
            const s = STATUS[item.status] || STATUS.approved;
            const stand = [item.hall_no && `Hall ${item.hall_no}`, item.stall_no && `Stall ${item.stall_no}`].filter(Boolean).join(" · ");
            const working = busy === item.companyId;
            return (
              <li key={item.companyId} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Monogram name={item.company_name} />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-gray-900 dark:text-gray-100">{item.company_name || "Unnamed company"}</span>
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                      {[item.company_email, item.company_phone_number, stand, item.requested_at && `Added ${fmtDate(item.requested_at)}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {item.status !== "approved" ? (
                    <button type="button" disabled={working} onClick={() => decide(item, "approved")} className={btnRow}>
                      {working ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Check size={13} aria-hidden="true" />}
                      Approve
                    </button>
                  ) : null}
                  {item.status !== "declined" ? (
                    <button type="button" disabled={working} onClick={() => decide(item, "declined")} className={btnRowDanger}>
                      <X size={13} aria-hidden="true" />
                      Decline
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
