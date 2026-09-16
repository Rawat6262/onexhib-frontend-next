"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { PUBLIC_ROUTES } from "@/lib/seo";
import {
  ALL_SCOPE,
  SCOPE_SEARCH_HINTS,
  isSearchableScope,
} from "@/lib/exhibition-scopes";

/**
 * Hero search box. One of only two client islands on the homepage.
 *
 * It is a real <form> with a real GET action, so it works before hydration and
 * with JavaScript disabled: submitting navigates to /exhibitions?search=... and
 * the server renders the results. The router.push below is a progressive
 * enhancement for a client-side transition, not the mechanism.
 *
 * `scope` and `search` are the only fields, because they are the only ones the
 * backend accepts — the *search endpoints take `search` alone, and scope picks
 * which of the three it hits. No invented parameters.
 *
 * WHY SCOPE IS CARRIED EXPLICITLY
 * This form used to submit `search` alone. /exhibitions defaults a missing
 * scope to `upcoming`, so a search started on the Ongoing or Past tab silently
 * became an upcoming-only search and reported "no exhibitions matched" for
 * records that existed. The scope now travels with the query — as a hidden
 * field so the no-JS GET path carries it too, not only router.push.
 *
 * The default is ALL_SCOPE, for the homepage box where no tab is selected:
 * with nothing chosen, searching everything is the only answer that cannot
 * hide a match.
 */
export default function SearchBar({ scope = ALL_SCOPE, className = "" }) {
  const router = useRouter();
  const [term, setTerm] = useState("");

  // An unrecognised scope would otherwise be forwarded into the URL and
  // silently fall back server-side; searching everything is the safer default.
  const activeScope = isSearchableScope(scope) ? scope : ALL_SCOPE;

  function onSubmit(event) {
    event.preventDefault();
    const q = term.trim();
    if (!q) {
      router.push(PUBLIC_ROUTES.exhibitions);
      return;
    }
    const qs = new URLSearchParams({ scope: activeScope, search: q });
    router.push(`${PUBLIC_ROUTES.exhibitions}?${qs.toString()}`);
  }

  return (
    <form
      role="search"
      action={PUBLIC_ROUTES.exhibitions}
      method="get"
      onSubmit={onSubmit}
      className={`flex w-full items-center gap-2 rounded-xl border border-gray-300 bg-white p-1.5 shadow-sm focus-within:border-[#131C55] focus-within:ring-2 focus-within:ring-[#131C55]/15 dark:border-gray-700 dark:bg-gray-900 dark:focus-within:border-blue-400 ${className}`}
    >
      {/* Carries the scope on the plain-HTML submit path, before hydration
          and with JavaScript off. Without it the server defaults to upcoming. */}
      <input type="hidden" name="scope" value={activeScope} />
      <label htmlFor="exhibition-search" className="sr-only">
        {SCOPE_SEARCH_HINTS[activeScope]} by name, category, venue or city
      </label>
      <Search size={18} className="ml-2 shrink-0 text-gray-400" aria-hidden="true" />
      <input
        id="exhibition-search"
        name="search"
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder={`${SCOPE_SEARCH_HINTS[activeScope]} — name, category, venue or city`}
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100"
      />
      <button
        type="submit"
        className="shrink-0 rounded-lg bg-[#131C55] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0E1B6B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none"
      >
        Search
      </button>
    </form>
  );
}
