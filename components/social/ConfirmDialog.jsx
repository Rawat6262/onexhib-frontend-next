"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/**
 * A destructive-action confirmation.
 *
 * NOT window.confirm. That blocks the main thread, cannot be styled, cannot be
 * dismissed with Escape in a way the page controls, and reads a browser-chrome
 * string rather than the application's own wording. Radix gives a real focus trap
 * and returns focus to the trigger on close.
 *
 * role="alertdialog" with an associated title and description, so assistive
 * technology announces it as an interruption requiring a decision rather than as
 * an ordinary dialog.
 *
 * The confirm button stays mounted and disabled while the action runs, so focus is
 * not lost mid-request and a second click cannot fire.
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  pendingLabel = "Working…",
  onConfirm,
  pending = false,
}) {
  return (
    <Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <DialogContent role="alertdialog" aria-busy={pending || undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:text-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 motion-reduce:transition-none"
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
