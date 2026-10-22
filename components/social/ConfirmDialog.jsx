"use client";

import { AlertTriangle, HelpCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

/**
 * A confirmation - the app's replacement for window.confirm.
 *
 * NOT window.confirm. That blocks the main thread, cannot be styled, shows the
 * browser's "onexhib.com says" chrome instead of our wording, and cannot be
 * dismissed with Escape in a way the page controls. Radix gives a real focus
 * trap and returns focus to the trigger on close.
 *
 * role="alertdialog" with an associated title and description, so assistive
 * technology announces it as an interruption requiring a decision.
 *
 * `tone`: "danger" (default - deletes, blocks) shows a red badge and button;
 * "brand" is for reversible decisions.
 *
 * The confirm button stays mounted and disabled while the action runs, so focus
 * is not lost mid-request and a second click cannot fire.
 *
 * Also rendered by components/ui/ConfirmHost.jsx for the promise-based
 * confirmAction() in lib/confirm.js.
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  pendingLabel = "Working…",
  onConfirm,
  pending = false,
  tone = "danger",
}) {
  const danger = tone === "danger";
  const Icon = danger ? AlertTriangle : HelpCircle;

  return (
    <Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <DialogContent
        role="alertdialog"
        aria-busy={pending || undefined}
        className="max-w-[26rem] overflow-hidden rounded-3xl p-0 shadow-2xl shadow-indigo-950/20 dark:shadow-black/50"
      >
        {/* A thin coloured edge carries the tone, like the toasts. */}
        <div aria-hidden="true" className={`h-1 w-full ${danger ? "bg-gradient-to-r from-red-500 to-rose-400" : "bg-gradient-to-r from-[#131C55] to-[#2B3FB8]"}`} />

        <div className="flex gap-4 px-6 pb-2 pt-6">
          <span
            aria-hidden="true"
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ring-1 ${
              danger
                ? "bg-red-50 text-red-600 ring-red-100 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20"
                : "bg-[#2B3FB8]/10 text-[#2B3FB8] ring-[#2B3FB8]/15 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/20"
            }`}
          >
            <Icon size={21} strokeWidth={2.2} />
          </span>
          <div className="min-w-0 pt-0.5">
            <DialogTitle className="text-[17px] font-bold leading-snug text-gray-900 dark:text-white">{title}</DialogTitle>
            {description ? (
              <DialogDescription className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {description}
              </DialogDescription>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/70 px-6 py-4 sm:flex-row sm:justify-end dark:border-gray-800 dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-md transition disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none ${
              danger
                ? "bg-gradient-to-r from-red-600 to-rose-500 shadow-red-900/20 hover:brightness-110 focus-visible:outline-red-600"
                : "bg-gradient-to-r from-[#131C55] to-[#2B3FB8] shadow-indigo-900/20 hover:brightness-110 focus-visible:outline-[#131C55] dark:from-blue-600 dark:to-indigo-500"
            }`}
          >
            {pending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : null}
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
