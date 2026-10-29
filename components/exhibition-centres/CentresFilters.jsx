"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Search, X } from "lucide-react";

import { PUBLIC_ROUTES } from "@/lib/seo";

/**
 * Search, country and sort controls for /exhibition-centres.
 *
 * A real GET <form>, so it works before hydration and with JavaScript off: the
 * server reads q / country / sort and renders the filtered list. Changing a
 * select submits straight away as a progressive enhancement; typing waits for
 * Enter or the Search button. A new filter always starts back on page 1, so
 * `page` is never carried.
 */
export default function CentresFilters({ q, country, sort, countries }) {
  const router = useRouter();
  const formRef = useRef(null);

  function go(form) {
    const data = new FormData(form);
    const qs = new URLSearchParams();
    const term = String(data.get("q") || "").trim();
    if (term) qs.set("q", term);
    if (data.get("country")) qs.set("country", String(data.get("country")));
    if (data.get("sort") && data.get("sort") !== "upcoming") qs.set("sort", String(data.get("sort")));
    const s = qs.toString();
    router.push(s ? `${PUBLIC_ROUTES.centres}?${s}` : PUBLIC_ROUTES.centres, { scroll: false });
  }

  return (
    <form
      ref={formRef}
      role="search"
      action={PUBLIC_ROUTES.centres}
      method="get"
      onSubmit={(e) => {
        e.preventDefault();
        go(e.currentTarget);
      }}
      className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm sm:flex-row sm:items-center dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 focus-within:ring-2 focus-within:ring-[#131C55]/15 dark:focus-within:ring-blue-400/30">
        <Search size={18} aria-hidden="true" className="shrink-0 text-gray-400" />
        <label htmlFor="centre-search" className="sr-only">
          Search exhibition centres by name or city
        </label>
        <input
          id="centre-search"
          name="q"
          type="search"
          key={q}
          defaultValue={q}
          placeholder="Search by venue name or city"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100"
        />
      </div>

      <div className="flex gap-2">
        <label htmlFor="centre-country" className="sr-only">
          Country
        </label>
        <select
          id="centre-country"
          name="country"
          key={`c-${country}`}
          defaultValue={country}
          onChange={() => go(formRef.current)}
          className={selectCls}
        >
          <option value="">All countries</option>
          {countries.map(([name, count]) => (
            <option key={name} value={name}>
              {name} ({count})
            </option>
          ))}
        </select>

        <label htmlFor="centre-sort" className="sr-only">
          Sort by
        </label>
        <select
          id="centre-sort"
          name="sort"
          key={`s-${sort}`}
          defaultValue={sort}
          onChange={() => go(formRef.current)}
          className={selectCls}
        >
          <option value="upcoming">Most shows first</option>
          <option value="name">Name A–Z</option>
        </select>

        <button
          type="submit"
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-[#131C55] px-4 text-sm font-semibold text-white transition hover:bg-[#1d2a7a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:bg-blue-500 dark:text-gray-950 dark:hover:bg-blue-400"
        >
          Search
        </button>
      </div>

      {q || country ? (
        <button
          type="button"
          onClick={() => router.push(PUBLIC_ROUTES.centres, { scroll: false })}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-1 rounded-xl px-3 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          <X size={15} aria-hidden="true" />
          Clear
        </button>
      ) : null}
    </form>
  );
}

const selectCls =
  "h-11 min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-800 outline-none focus:border-[#131C55] focus:ring-2 focus:ring-[#131C55]/15 sm:w-44 sm:flex-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400";
