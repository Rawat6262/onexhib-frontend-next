"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Check, Loader2, MapPin, Settings2, UserCheck, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel, NoResults, btnRow, btnRowDanger } from "@/components/dashboard/ui";
import { Monogram, fmtDate } from "@/components/admin/AdminUI";
import { getExhibitorRequests, refreshExhibitionPage, setSelfListedStatus } from "@/models/exhibition.model";
import { confirmAction } from "@/lib/confirm";

/**
 * Organiser: every company waiting to be approved as an exhibitor, across all
 * the organiser's shows (an admin sees every show).
 *
 * An exhibitor who presses "I'm exhibiting here" in their workspace is pending
 * until someone who can edit that show approves them; only then are they in the
 * show's public exhibitor list. Each show's Manage page has the same requests
 * for that one show (components/dashboard/SelfListedExhibitors.jsx) - this page
 * exists because an organiser with thousands of shows cannot open each one to
 * find who is waiting. Backend: Onexhib_backend/Controller/exhibitorApproval.controller.js.
 */

const message = (err, fallback) => err?.response?.data?.message || fallback;

function dateRange(a, b) {
  if (!a) return "";
  const from = fmtDate(a);
  const to = b ? fmtDate(b) : "";
  return to && to !== from ? `${from} – ${to}` : from;
}

export default function ExhibitorRequestsClient() {
  const [state, setState] = useState(null); // { items, total } or { error: true }
  const [busy, setBusy] = useState(null); // `${exhibitionId}:${companyId}`

  const load = useCallback(async () => {
    try {
      const { data } = await getExhibitorRequests();
      setState({ items: data?.items || [], total: data?.total || 0 });
    } catch {
      setState({ items: [], total: 0, error: true });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (item, status) => {
    const name = item.company_name || "this company";
    if (status === "declined") {
      const ok = await confirmAction({
        title: `Decline ${name}?`,
        description: `They will not be listed as an exhibitor at ${item.exhibition.name} and cannot list themselves there again. You can approve them later from the show's Manage page.`,
        confirmLabel: "Decline",
      });
      if (!ok) return;
    }
    const key = `${item.exhibition.id}:${item.companyId}`;
    setBusy(key);
    try {
      await setSelfListedStatus(item.exhibition.id, item.companyId, status);
      refreshExhibitionPage(item.exhibition.id); // the show's public exhibitor list changes
      setState((s) => ({
        ...s,
        items: s.items.filter((i) => `${i.exhibition.id}:${i.companyId}` !== key),
        total: Math.max(0, s.total - 1),
      }));
      toast.success(status === "approved" ? `${name} is now listed at ${item.exhibition.name}.` : `${name} was declined.`);
    } catch (err) {
      toast.error(message(err, "That could not be saved."));
    } finally {
      setBusy(null);
    }
  };

  const items = state?.items || [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHeader
        eyebrow="Exhibitor requests"
        title="Exhibitors waiting for you"
        intro="Companies that said they are exhibiting at one of your shows. They appear on the show's page only after you approve them."
      />

      <div className="mt-8">
        <Panel title="Waiting for approval" count={state && !state.error ? state.total : undefined}>
          {!state ? (
            <div className="flex items-center gap-2 px-5 py-6 text-sm text-gray-500">
              <Loader2 size={15} className="animate-spin" aria-hidden="true" /> Loading…
            </div>
          ) : state.error ? (
            <NoResults>
              Requests could not be loaded.{" "}
              <button type="button" onClick={load} className="font-semibold text-[#2B3FB8] hover:underline dark:text-blue-300">
                Try again
              </button>
            </NoResults>
          ) : items.length === 0 ? (
            <NoResults title="No one is waiting" icon={<UserCheck size={22} aria-hidden="true" />}>
              When a company lists itself at one of your shows, it will wait here for your approval.
            </NoResults>
          ) : (
            <ul className="list-none divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((item) => {
                const key = `${item.exhibition.id}:${item.companyId}`;
                const working = busy === key;
                const stand = [item.hall_no && `Hall ${item.hall_no}`, item.stall_no && `Stall ${item.stall_no}`].filter(Boolean).join(" · ");
                const where = [item.exhibition.city, item.exhibition.country].filter(Boolean).join(", ");
                const when = dateRange(item.exhibition.starting_date, item.exhibition.ending_date);
                return (
                  <li key={key} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <Monogram name={item.company_name} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900 dark:text-gray-100">{item.company_name || "Unnamed company"}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                          {[item.company_email, item.company_phone_number, stand, item.requested_at && `Asked ${fmtDate(item.requested_at)}`]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-gray-700 dark:text-gray-300">
                          <span className="font-medium">at {item.exhibition.name || "an exhibition"}</span>
                          {when ? (
                            <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                              <CalendarDays size={13} aria-hidden="true" /> {when}
                            </span>
                          ) : null}
                          {where ? (
                            <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                              <MapPin size={13} aria-hidden="true" /> {where}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      <button type="button" disabled={working} onClick={() => decide(item, "approved")} className={btnRow}>
                        {working ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Check size={13} aria-hidden="true" />}
                        Approve
                      </button>
                      <button type="button" disabled={working} onClick={() => decide(item, "declined")} className={btnRowDanger}>
                        <X size={13} aria-hidden="true" />
                        Decline
                      </button>
                      <Link href={`/exhibitions/${item.exhibition.id}`} className={btnRow} title="Open this show's Manage page">
                        <Settings2 size={13} aria-hidden="true" />
                        Manage show
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        {state && state.total > items.length ? (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Showing the newest {items.length} of {state.total}. Decide on these and the rest will follow.
          </p>
        ) : null}
      </div>
    </div>
  );
}
