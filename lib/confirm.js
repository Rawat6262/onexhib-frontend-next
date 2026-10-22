/**
 * Promise-based confirmation - the drop-in replacement for window.confirm.
 *
 *   if (!(await confirmAction({ title: "Delete this exhibition?", confirmLabel: "Delete" }))) return;
 *
 * Opens the app's own ConfirmDialog (rendered once, by components/ui/ConfirmHost
 * in app/providers.jsx) and resolves true on confirm, false on cancel / Escape /
 * clicking outside. window.confirm showed the browser's "onexhib.com says" box,
 * which cannot be styled and blocks the page.
 *
 * Options: title, description, confirmLabel, cancelLabel, tone ("danger" | "brand").
 */
let listener = null;

export function confirmAction(options = {}) {
  if (typeof window === "undefined") return Promise.resolve(false);
  // No host mounted (should not happen): fall back rather than silently refuse.
  if (!listener) return Promise.resolve(window.confirm(options.title || "Are you sure?"));
  return new Promise((resolve) => listener({ ...options, resolve }));
}

/** Used by ConfirmHost only. Returns an unsubscribe function. */
export function onConfirmRequest(fn) {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}
