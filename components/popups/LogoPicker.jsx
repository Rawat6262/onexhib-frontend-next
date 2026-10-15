"use client";

import { useRef } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

/**
 * A grid of logo tiles with an "Add logos" tile, used for an exhibition's
 * Sponsors and Partners in both the Add and the Edit popup.
 *
 * Presentational only - the parent decides what adding and removing mean:
 *  - Add form: files are kept locally and sent with the create request.
 *  - Edit form: each add uploads straight away and each remove deletes on the
 *    server (POST/DELETE /api/exhibition/:id/logos/:kind).
 *
 * `items`: [{ key, url, busy? }]. Picking files is checked here (type, size,
 * how many fit under `max`) so a wrong file fails at once; the server checks
 * the same things again.
 */

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 5 * 1024 * 1024;

export default function LogoPicker({ id, label, hint, items = [], max = 20, busy = false, onAdd, onRemove, onError }) {
  const inputRef = useRef(null);
  const room = Math.max(0, max - items.length);

  const pick = (e) => {
    const chosen = Array.from(e.target.files || []);
    e.target.value = ""; // the same files can be picked again after a failure
    if (!chosen.length) return;
    const bad = chosen.find((f) => !ACCEPT.split(",").includes(f.type));
    if (bad) return onError?.("Logos must be JPG, PNG or WebP images.");
    const big = chosen.find((f) => f.size > MAX_BYTES);
    if (big) return onError?.(`"${big.name}" is larger than 5 MB.`);
    if (chosen.length > room) {
      onError?.(room ? `You can add ${room} more ${room === 1 ? "logo" : "logos"} here.` : `This list is full (${max} logos).`);
      if (!room) return;
    }
    onAdd?.(chosen.slice(0, room));
  };

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="block text-sm font-bold text-gray-900 dark:text-gray-100">
          {label}
        </label>
        <span className="text-xs text-gray-500 tabular-nums dark:text-gray-400">
          {items.length}/{max}
        </span>
      </div>

      <ul className="grid list-none grid-cols-3 gap-2 sm:grid-cols-4">
        {items.map((item) => (
          <li
            key={item.key}
            className="group relative aspect-[3/2] overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-100"
          >
            <img src={item.url} alt="" className="h-full w-full object-contain p-2" />
            {item.busy ? (
              <span className="absolute inset-0 grid place-items-center bg-white/70 dark:bg-black/50">
                <Loader2 size={18} aria-hidden="true" className="animate-spin text-[#2B3FB8]" />
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onRemove?.(item.key)}
                disabled={busy}
                aria-label="Remove logo"
                className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-100 transition hover:bg-red-600 disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X size={13} aria-hidden="true" />
              </button>
            )}
          </li>
        ))}

        {room > 0 ? (
          <li>
            <button
              type="button"
              id={id}
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="flex aspect-[3/2] w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 text-xs font-semibold text-gray-500 transition hover:border-[#2B3FB8] hover:bg-[#2B3FB8]/5 hover:text-[#2B3FB8] disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-blue-400 dark:hover:bg-blue-400/10 dark:hover:text-blue-300"
            >
              {busy ? <Loader2 size={18} aria-hidden="true" className="animate-spin" /> : <ImagePlus size={18} aria-hidden="true" />}
              Add logos
            </button>
          </li>
        ) : null}
      </ul>
      <input ref={inputRef} type="file" accept={ACCEPT} multiple onChange={pick} className="sr-only" tabIndex={-1} aria-hidden="true" />
      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{hint || "JPG, PNG or WebP, up to 5 MB each. You can pick several at once."}</p>
    </div>
  );
}
