"use client";

import { TITLE_MAX, DESCRIPTION_MAX, VISIBILITIES } from "@/lib/social/post-form";
import { VISIBILITY_LABELS } from "@/lib/social/post";

/**
 * The title / description / visibility fields, shared by the composer and the
 * edit sheet.
 *
 * ONE implementation, so create and edit cannot drift apart on trimming, limits,
 * counter behaviour or how a validation message is associated with its field —
 * which is exactly what two hand-written forms do after a few changes.
 *
 * Labels come from VISIBILITY_LABELS, the same map PostCard renders, so the
 * wording on the chip and in the picker can never disagree. Only the two values
 * VISIBILITIES holds are offered: no Private, no Friends, no Connections.
 */
export default function PostFormFields({ form, errors, onChange, disabled, idPrefix }) {
  const set = (field) => (event) => onChange(field, event.target.value);

  const titleOver = form.title.length > TITLE_MAX;
  const descriptionOver = form.description.length > DESCRIPTION_MAX;

  const titleId = `${idPrefix}-title`;
  const descId = `${idPrefix}-description`;
  const visId = `${idPrefix}-visibility`;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={titleId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Title <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <input
          id={titleId}
          type="text"
          value={form.title}
          onChange={set("title")}
          disabled={disabled}
          // Double the limit, so the counter can show an over-limit state rather
          // than silently truncating what the user typed.
          maxLength={TITLE_MAX * 2}
          aria-invalid={titleOver || Boolean(errors.title) ? true : undefined}
          aria-describedby={`${titleId}-hint`}
          className="mt-1.5 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:bg-gray-950"
        />
        {/* The counter doubles as the error slot, so one id associates both. */}
        <p
          id={`${titleId}-hint`}
          className={`mt-1 text-xs ${titleOver || errors.title ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-500"}`}
        >
          {errors.title || `${form.title.length} / ${TITLE_MAX}`}
        </p>
      </div>

      <div>
        <label htmlFor={descId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          What would you like to share?
        </label>
        <textarea
          id={descId}
          rows={5}
          value={form.description}
          onChange={set("description")}
          disabled={disabled}
          maxLength={DESCRIPTION_MAX * 2}
          aria-invalid={descriptionOver || Boolean(errors.description) ? true : undefined}
          aria-describedby={`${descId}-hint`}
          className="mt-1.5 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:bg-gray-950"
        />
        <p
          id={`${descId}-hint`}
          className={`mt-1 text-xs ${descriptionOver || errors.description ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-500"}`}
        >
          {errors.description || `${form.description.length} / ${DESCRIPTION_MAX}`}
        </p>
      </div>

      <div>
        <label htmlFor={visId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Who can see this?
        </label>
        <select
          id={visId}
          value={form.visibility}
          onChange={set("visibility")}
          disabled={disabled}
          aria-describedby={`${visId}-hint`}
          className="mt-1.5 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:bg-gray-950"
        >
          {VISIBILITIES.map((value) => (
            <option key={value} value={value}>
              {VISIBILITY_LABELS[value]}
            </option>
          ))}
        </select>
        <p id={`${visId}-hint`} className="mt-1 text-xs text-gray-500 dark:text-gray-500">
          {form.visibility === "PUBLIC"
            ? "Anyone signed in to OneXhib can see this post."
            : "Only people who follow you can see this post."}
        </p>
      </div>
    </div>
  );
}
