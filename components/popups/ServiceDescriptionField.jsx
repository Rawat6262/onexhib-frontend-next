"use client";

/**
 * "About your service" - the description on a service listing, shared by the
 * add and edit forms.
 *
 * Optional, but it decides whether the listing's public page is in Google:
 * a provider page without one is noindex and left out of the sitemap (see
 * app/(public)/exhibition-service/[slug]). The hint says so, because that is
 * the reason a provider would bother.
 *
 * DESCRIPTION_MAX matches Model/Service.model.js in the backend, which cuts
 * anything longer.
 */
export const DESCRIPTION_MAX = 1500;

export default function ServiceDescriptionField({ value, onChange }) {
  const left = DESCRIPTION_MAX - value.length;
  return (
    <div className="w-full">
      <label htmlFor="service-description" className="mb-1 block text-sm font-semibold text-gray-800 dark:text-gray-200">
        About your service <span className="font-normal text-gray-500 dark:text-gray-400">(optional)</span>
      </label>
      <textarea
        id="service-description"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, DESCRIPTION_MAX))}
        maxLength={DESCRIPTION_MAX}
        rows={4}
        aria-describedby="service-description-hint"
        placeholder="What you offer, the exhibitions and stand sizes you work on, your experience…"
        className="w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm outline-none transition placeholder-gray-400 focus:border-[#2B3FB8] focus:ring-4 focus:ring-[#2B3FB8]/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
      />
      <p id="service-description-hint" className="mt-1 flex justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span>Shown on your public page. Listings with a description can appear in Google search.</span>
        <span className="shrink-0 tabular-nums">{left.toLocaleString("en-US")} left</span>
      </p>
    </div>
  );
}
