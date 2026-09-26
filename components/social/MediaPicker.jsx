"use client";

import { useEffect, useMemo, useRef } from "react";
import { ImagePlus, X, FileVideo } from "lucide-react";

import {
  ACCEPT_ATTRIBUTE,
  MEDIA_MAX,
  mediaKind,
  remainingMediaSlots,
  validateSelection,
} from "@/lib/social/post-form";

/**
 * Choose local files to attach to a post, with previews.
 *
 * A native <input type="file" multiple> behind a styled label — no upload
 * library, no drag-and-drop dependency. The input itself is visually hidden but
 * remains a real focusable input, so the label is a genuine control rather than a
 * div that happens to click one.
 *
 * SEPARATE FROM PostMedia, DELIBERATELY. PostMedia renders backend media objects
 * ({ id, type, url, thumbnailUrl }); this renders local File objects behind blob
 * URLs. They are different contracts, and one component serving both would have to
 * guess which it was holding — the kind of ambiguity that ends with a blob URL
 * being sent to the server.
 *
 * OBJECT URL LIFECYCLE IS THE RISK HERE. Every createObjectURL holds its File in
 * memory until revoked, so a composer used a few times with videos leaks tens of
 * megabytes. The URLs are derived from `files` with useMemo and revoked by its
 * cleanup, which fires on every change to the list AND on unmount — so removing
 * one file, replacing the selection, resetting after a successful post and
 * navigating away all revoke correctly, without any one of those paths having to
 * remember to.
 */
export default function MediaPicker({
  files,
  onFilesChange,
  existingCount = 0,
  disabled = false,
  onRejected,
}) {
  const inputRef = useRef(null);

  // One URL per File, rebuilt whenever the list identity changes.
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file), kind: mediaKind(file) })),
    [files]
  );

  useEffect(
    () => () => {
      // Runs before each re-derivation and on unmount. Nothing else revokes, so
      // there is exactly one place this can be got wrong.
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    },
    [previews]
  );

  const slots = remainingMediaSlots(existingCount, files.length);

  const handleChange = (event) => {
    const chosen = event.target.files;
    const { accepted, rejected } = validateSelection(chosen, existingCount, files.length);

    if (accepted.length) onFilesChange([...files, ...accepted]);
    if (rejected.length && onRejected) onRejected(rejected);

    // Reset the input so choosing the same file again still fires a change event.
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeAt = (index) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label
          className={`inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#131C55] motion-reduce:transition-none dark:border-gray-700 ${
            disabled || slots === 0
              ? "cursor-not-allowed text-gray-400 dark:text-gray-600"
              : "cursor-pointer text-gray-700 hover:border-[#131C55] hover:text-[#131C55] dark:text-gray-200"
          }`}
        >
          <ImagePlus size={16} aria-hidden="true" />
          Add photos or video
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT_ATTRIBUTE}
            disabled={disabled || slots === 0}
            onChange={handleChange}
            className="sr-only"
          />
        </label>

        <p className="text-xs text-gray-500 dark:text-gray-500">
          {slots > 0
            ? `${slots} of ${MEDIA_MAX} remaining · images up to 5 MB, video up to 50 MB`
            : `Maximum ${MEDIA_MAX} media items reached`}
        </p>
      </div>

      {previews.length ? (
        <ul className="mt-3 grid list-none grid-cols-2 gap-2 sm:grid-cols-3">
          {previews.map((preview, index) => (
            <li key={`${preview.file.name}-${index}`} className="relative">
              <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800">
                {preview.kind === "IMAGE" ? (
                  // A plain <img>, not next/image: the source is a local blob URL,
                  // which the optimiser cannot fetch and must never be handed.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview.url} alt="" aria-hidden="true" className="h-full w-full object-cover" />
                ) : (
                  <video
                    src={preview.url}
                    controls
                    preload="metadata"
                    className="h-full w-full bg-black object-contain"
                  />
                )}
              </div>

              <button
                type="button"
                onClick={() => removeAt(index)}
                disabled={disabled}
                // Names the file, so a screen-reader user knows which of several
                // remove buttons they are on.
                aria-label={`Remove ${preview.file.name}`}
                className="absolute right-1.5 top-1.5 rounded-full bg-gray-900/80 p-1 text-white transition hover:bg-gray-900 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
              >
                <X size={14} aria-hidden="true" />
              </button>

              {/* The filename only — never a path. Truncated so a long name
                  cannot widen the grid. */}
              <p className="mt-1 flex items-center gap-1 truncate text-xs text-gray-600 dark:text-gray-400">
                {preview.kind === "VIDEO" ? <FileVideo size={12} aria-hidden="true" /> : null}
                <span className="truncate">{preview.file.name}</span>
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
