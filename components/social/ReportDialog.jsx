"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  REPORT_DETAILS_MAX,
  buildReportPayload,
  validateReport,
  reportDetailsRemaining,
  describeRelationshipError,
  REPORT_SUCCESS_MESSAGE,
} from "@/lib/social/relationship";

/**
 * Report a user, a post or a comment.
 *
 * ONE DIALOG FOR ALL THREE TARGETS, because the form is identical: the backend stores no
 * target type and the ROUTE is what says what was reported. So the caller passes a
 * `submit` function that already knows its route, and this component never holds a
 * "kind" variable that could be wrong. `targetLabel` is for the human only.
 *
 * WHAT THE CONFIRMATION MAY CLAIM, which is the part most likely to go wrong later.
 * A stored report has NO side effect: nothing is removed, nobody is banned, the target is
 * not told, and no block or mute is applied. So the success copy promises only that it
 * was received. Anything stronger would be a statement about a moderation decision that
 * has not been made, and lib/social/relationship.js keeps a list of the words it must not
 * contain so a later edit cannot quietly promise more.
 *
 * NO HTML SINK. Every string is rendered as React text. Details are the reporter's own
 * free text and go nowhere near dangerouslySetInnerHTML.
 *
 * role="alertdialog" with a described title, matching ConfirmDialog, so assistive
 * technology announces an interruption requiring a decision. Radix supplies the focus
 * trap and returns focus to the trigger on close.
 */
export default function ReportDialog({
  open,
  onOpenChange,
  targetLabel = "this",
  submit,
  onDone,
}) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState(false);

  const detailsId = useId();
  const errorId = useId();
  const firstRadioRef = useRef(null);

  // Every open starts clean. A reason left selected from a previous target is the kind of
  // carry-over that gets the wrong thing reported.
  useEffect(() => {
    if (!open) return;
    setReason("");
    setDetails("");
    setError(null);
    setTouched(false);
    setPending(false);
  }, [open]);

  const verdict = validateReport({ reason, details });
  const remaining = reportDetailsRemaining(details);
  // OTHER is the one reason that requires a description — the server enforces it too.
  const detailsRequired = reason === "OTHER";

  async function onSubmit(event) {
    event.preventDefault();
    setTouched(true);

    const check = validateReport({ reason, details });
    if (!check.ok) {
      setError(check.error);
      return;
    }
    // A second submit while the first is in flight would file two reports; the server
    // dedupes by reporter+target, but the button must not depend on that.
    if (pending) return;

    setPending(true);
    setError(null);
    try {
      // buildReportPayload, never the form object: the body is a strict { reason, details }
      // allow-list and the server REFUSES any other key rather than ignoring it.
      await submit(buildReportPayload({ reason, details }));
      setPending(false);
      onOpenChange(false);
      if (onDone) onDone(REPORT_SUCCESS_MESSAGE);
    } catch (err) {
      setPending(false);
      setError(describeRelationshipError(err, "Your report could not be sent."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <DialogContent role="alertdialog" aria-busy={pending || undefined}>
        <form onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Report {targetLabel}</DialogTitle>
            <DialogDescription>
              Reports go to the OneXhib team for review. The person you are reporting is not
              told who reported them.
            </DialogDescription>
          </DialogHeader>

          <fieldset className="mt-4 space-y-2 border-0 p-0">
            <legend className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Why are you reporting this?
            </legend>
            {REPORT_REASONS.map((value, i) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 transition hover:border-[#131C55] has-[:checked]:border-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:text-gray-200"
              >
                <input
                  ref={i === 0 ? firstRadioRef : undefined}
                  type="radio"
                  name="report-reason"
                  value={value}
                  checked={reason === value}
                  disabled={pending}
                  onChange={() => { setReason(value); setError(null); }}
                  className="h-4 w-4 accent-[#131C55]"
                />
                {/* React text, not markup — these are our own labels, but the habit is
                    what keeps the reporter's details safe too. */}
                <span>{REPORT_REASON_LABELS[value]}</span>
              </label>
            ))}
          </fieldset>

          <div className="mt-4">
            <label
              htmlFor={detailsId}
              className="block text-sm font-semibold text-gray-900 dark:text-gray-100"
            >
              {detailsRequired ? "What happened?" : "Anything else? (optional)"}
            </label>
            <textarea
              id={detailsId}
              value={details}
              disabled={pending}
              rows={3}
              // maxLength stops the overflow at the keyboard; validateReport still checks,
              // because a paste or an autofill can arrive past the cap.
              maxLength={REPORT_DETAILS_MAX}
              required={detailsRequired}
              aria-required={detailsRequired || undefined}
              aria-describedby={error ? errorId : undefined}
              aria-invalid={touched && !verdict.ok && verdict.field === "details" ? true : undefined}
              onChange={(e) => { setDetails(e.target.value); setError(null); }}
              className="mt-1.5 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500" aria-live="polite">
              {remaining} characters left
            </p>
          </div>

          {error ? (
            <p id={errorId} role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}

          <DialogFooter className="mt-5">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={pending}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:text-gray-200"
            >
              Cancel
            </button>
            {/* Stays mounted while the request runs, so focus is not lost mid-submit and a
                second click cannot fire. */}
            <button
              type="submit"
              disabled={pending || !verdict.ok}
              className="rounded-xl bg-[#131C55] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1b2670] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none"
            >
              {pending ? "Sending…" : "Send report"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
