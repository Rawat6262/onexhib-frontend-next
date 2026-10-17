"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { History, KeyRound, Loader2, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";

import {
  getExhibitionEditors,
  grantExhibitionEditor,
  revokeExhibitionEditor,
} from "@/models/exhibition.model";
import { btnPrimary, btnRowDanger, btnRow, inputBase } from "@/components/dashboard/ui";

/**
 * Admin: who besides the OneXhib team may edit one exhibition.
 *
 * The server owns every rule (who can be added, the cap, what an editor may do;
 * see Onexhib_backend/Service/exhibitionAccess.js). This dialog shows its answers
 * as given - a refusal's message is written for the admin to read, e.g. "This is
 * a Visitor account... ask them to switch to Organiser".
 */

const FIELD_LABELS = {
  exhibition_name: "name",
  starting_date: "start date",
  ending_date: "end date",
  exhibition_address: "address",
  exhibtion_url: "image",
  original_image_url: "image",
  thumbnail_url: "image",
  layout_url: "layout",
  layout_preview_url: "layout",
  exhibition_brochure_url: "brochure",
  category: "category",
  description: "description",
  city: "city",
  state: "state",
  country: "country",
  venue: "venue",
  website: "website",
  email: "email",
  sponsor: "sponsor",
  partner: "partner",
};

function changedLabel(fields) {
  const names = [...new Set(fields.map((f) => FIELD_LABELS[f] || f.replace(/_/g, " ")))];
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;
}

function timeAgo(value) {
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return "";
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

const messageOf = (err, fallback) => err?.response?.data?.message || fallback;

export default function ExhibitionAccessDialog({ exhibitionId, exhibitionName, onClose }) {
  const [state, setState] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [granting, setGranting] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const inputRef = useRef(null);
  const openerRef = useRef(null);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const { data } = await getExhibitionEditors(exhibitionId);
      setState(data);
    } catch (err) {
      setLoadError(messageOf(err, "Could not load access for this exhibition."));
    }
  }, [exhibitionId]);

  useEffect(() => {
    load();
  }, [load]);

  // Escape closes; focus goes back to the button that opened the dialog. Read
  // through a ref so a parent passing a new arrow each render does not re-run
  // this and yank focus back to the input.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    openerRef.current = document.activeElement;
    inputRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      openerRef.current?.focus?.();
    };
  }, []);

  const editors = state?.editors ?? [];
  const max = state?.maxEditors ?? 10;
  const full = editors.length >= max;

  async function handleGrant(e) {
    e.preventDefault();
    const value = email.trim();
    if (!value) {
      setFormError("Enter the email address they signed up with.");
      return;
    }
    setGranting(true);
    setFormError("");
    try {
      const { data } = await grantExhibitionEditor(exhibitionId, value);
      setState(data);
      setEmail("");
      toast.success(
        data.emailed
          ? `${data.granted.name} can now edit this exhibition. We emailed them.`
          : `${data.granted.name} can now edit this exhibition.`
      );
    } catch (err) {
      setFormError(messageOf(err, "Could not give access. Please try again."));
    } finally {
      setGranting(false);
    }
  }

  async function handleRevoke(person) {
    setRemovingId(person._id);
    try {
      const { data } = await revokeExhibitionEditor(exhibitionId, person._id);
      setState(data);
      toast.success(`${person.name} can no longer edit this exhibition.`);
    } catch (err) {
      toast.error(messageOf(err, "Could not remove access."));
    } finally {
      setRemovingId(null);
      setConfirmId(null);
    }
  }

  const title = state?.exhibition?.name || exhibitionName || "this exhibition";

  return (
    <div className="ox-form fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-gray-950/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="access-title"
        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-gray-200 bg-white text-gray-900 shadow-2xl sm:max-w-xl sm:rounded-3xl dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
      >
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#131C55] to-[#2B3FB8] px-5 pb-5 pt-5 text-white sm:px-6">
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <KeyRound size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-100/80">Edit access</p>
              <h2 id="access-title" className="mt-0.5 truncate text-lg font-bold leading-snug" title={title}>
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1 -mt-1 rounded-lg p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <p className="relative mt-3 text-[13px] leading-relaxed text-blue-50/90">
            People you add can update this exhibition&apos;s details, dates, images and logos from their
            Organiser dashboard. They can&apos;t delete it or share it with anyone else.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {/* Grant */}
          <form onSubmit={handleGrant} noValidate>
            <label htmlFor="access-email" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Add a person by email
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                ref={inputRef}
                id="access-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (formError) setFormError("");
                }}
                placeholder="organiser@theirshow.com"
                disabled={full || granting}
                aria-invalid={Boolean(formError)}
                aria-describedby={formError ? "access-error" : "access-hint"}
                className={inputBase}
              />
              <button type="submit" disabled={full || granting || !state} className={`${btnPrimary} shrink-0`}>
                {granting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <UserPlus size={16} aria-hidden="true" />}
                {granting ? "Adding…" : "Give access"}
              </button>
            </div>
            {formError ? (
              <p
                id="access-error"
                role="alert"
                className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] leading-relaxed text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
              >
                {formError}
              </p>
            ) : (
              <p id="access-hint" className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {full
                  ? `This exhibition has the maximum of ${max} editors. Remove someone to add another.`
                  : "They need an Organiser account on OneXhib. We'll email them to let them know."}
              </p>
            )}
          </form>

          {/* Current editors */}
          <section aria-labelledby="access-people" className="mt-6">
            <div className="flex items-baseline justify-between">
              <h3 id="access-people" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                People with access
              </h3>
              {state ? (
                <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                  {editors.length} / {max}
                </span>
              ) : null}
            </div>

            {loadError ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-[13px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                {loadError}{" "}
                <button type="button" onClick={load} className="font-semibold underline underline-offset-2">
                  Try again
                </button>
              </div>
            ) : !state ? (
              <ul className="mt-3 space-y-2" aria-label="Loading">
                {[0, 1].map((i) => (
                  <li key={i} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                ))}
              </ul>
            ) : editors.length === 0 ? (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-dashed border-gray-300 px-4 py-4 text-[13px] text-gray-600 dark:border-gray-700 dark:text-gray-400">
                <ShieldCheck size={18} className="shrink-0 text-gray-400" aria-hidden="true" />
                Only the OneXhib team can edit this exhibition right now.
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
                {editors.map((person) => (
                  <li key={person._id} className="flex items-center gap-3 px-3 py-3">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2B3FB8]/10 text-xs font-bold text-[#2B3FB8] dark:bg-blue-400/15 dark:text-blue-300"
                    >
                      {initials(person.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{person.name}</p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {person.email}
                        {person.company_name ? ` · ${person.company_name}` : ""}
                      </p>
                    </div>
                    {confirmId === person._id ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRevoke(person)}
                          disabled={removingId === person._id}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                        >
                          {removingId === person._id ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : null}
                          Remove
                        </button>
                        <button type="button" onClick={() => setConfirmId(null)} className={btnRow}>
                          Keep
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmId(person._id)}
                        className={`${btnRowDanger} shrink-0`}
                        aria-label={`Remove access for ${person.name}`}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* History */}
          {state?.recentChanges?.length ? (
            <section aria-labelledby="access-history" className="mt-6">
              <h3 id="access-history" className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                <History size={15} aria-hidden="true" className="text-gray-400" />
                Recent changes
              </h3>
              <ol className="mt-3 space-y-2.5 border-l border-gray-200 pl-4 dark:border-gray-800">
                {state.recentChanges.map((c, i) => (
                  <li key={i} className="relative text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-[#2B3FB8] ring-4 ring-white dark:bg-blue-400 dark:ring-gray-900"
                    />
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{c.by}</span>
                    {c.role ? (
                      <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        {c.role}
                      </span>
                    ) : null}{" "}
                    changed {changedLabel(c.fields)}
                    <span className="text-gray-400 dark:text-gray-500"> · {timeAgo(c.at)}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
