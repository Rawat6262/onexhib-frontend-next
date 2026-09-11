"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Search, Sparkles } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { exhibitionPath } from "@/lib/routes";
import { formatDateRange, formatLocation } from "@/lib/format";
import { trackAiSearch, trackAiSearchResultClick } from "@/lib/analytics";

/**
 * Natural-language exhibition search.
 *
 * COST DISCIPLINE — the reason this is a form and not a live search box.
 * Every submission spends OpenAI credit, and the backend rate-limits to 10 a
 * minute and 100 a day per user for exactly that reason. So:
 *   - nothing is sent on keystroke, on mount, on focus, or on blur;
 *   - the only trigger is an explicit submit;
 *   - the button is disabled while a request is in flight, so a double-click
 *     cannot spend twice.
 * Anything resembling search-as-you-type would burn a day's quota in a sentence.
 *
 * AUTH
 * The endpoint is signed-in only. Guests are shown a sign-in prompt instead of
 * the form — the request is never attempted, so nobody is taught that the
 * feature is broken when it is simply gated. A 401 mid-session (an expired
 * cookie) falls back to the same prompt.
 *
 * ERRORS
 * Each status the backend can return maps to a sentence a person can act on.
 * The raw message is never shown: a 500 here reads "AI search failed" upstream,
 * which tells a user nothing and leaks that something broke internally.
 */

const EXAMPLES = [
  "Technology exhibitions in Germany in November",
  "Manufacturing trade shows in India",
  "What is happening in Dubai next month?",
];

const MAX_QUERY_LENGTH = 500; // mirrors MAX_QUERY_LENGTH in the controller

export default function AiSearchPanel() {
  const { status, user } = useAuth();
  const [query, setQuery] = useState("");
  const [state, setState] = useState({ phase: "idle", results: [], message: "", total: 0 });
  const inputId = useId();
  const inFlight = useRef(false);

  const signedIn = status === "authed" && Boolean(user);

  async function onSubmit(event) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || inFlight.current) return;

    inFlight.current = true;
    setState((s) => ({ ...s, phase: "loading" }));

    try {
      const res = await fetch("/api/exhibitions/ai-search", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: trimmed, limit: 12 }),
      });

      if (res.status === 401) {
        setState({ phase: "signed-out", results: [], message: "", total: 0 });
        return;
      }
      if (res.status === 429) {
        setState({
          phase: "error",
          results: [],
          total: 0,
          message:
            "You have made a lot of searches in a short time. Please wait a minute and try again.",
        });
        return;
      }

      const body = await res.json().catch(() => null);

      if (res.status === 400) {
        setState({
          phase: "error",
          results: [],
          total: 0,
          message:
            trimmed.length > MAX_QUERY_LENGTH
              ? `That search is too long — please keep it under ${MAX_QUERY_LENGTH} characters.`
              : "Please describe what you are looking for in a sentence.",
        });
        return;
      }
      if (!res.ok || !body?.success) {
        setState({
          phase: "error",
          results: [],
          total: 0,
          message: "Search is unavailable right now. Please try again in a moment.",
        });
        return;
      }

      const results = Array.isArray(body.data) ? body.data : [];
      trackAiSearch(trimmed.length, body.total ?? results.length);
      setState({
        phase: "done",
        results,
        total: Number(body.total) || results.length,
        message: typeof body.message === "string" ? body.message : "",
      });
    } catch {
      setState({
        phase: "error",
        results: [],
        total: 0,
        message: "Search could not be reached. Please check your connection and try again.",
      });
    } finally {
      inFlight.current = false;
    }
  }

  if (status === "loading") {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="h-11 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  if (!signedIn || state.phase === "signed-out") {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900">
        <Sparkles size={22} aria-hidden="true" className="mx-auto text-[#131C55] dark:text-blue-300" />
        <h2 className="mt-3 text-base font-semibold text-gray-900 dark:text-gray-50">
          Sign in to use AI search
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          AI search is available to signed-in accounts. Every search runs a live query, so it is kept
          to registered users.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#131C55] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0E1B6B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55]"
        >
          Sign in
        </Link>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
          Or{" "}
          <Link
            href="/exhibitions"
            className="font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300"
          >
            browse all exhibitions
          </Link>{" "}
          — no account needed.
        </p>
      </div>
    );
  }

  const loading = state.phase === "loading";

  return (
    <div>
      <form onSubmit={onSubmit} className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-900">
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Describe what you are looking for
        </label>
        <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
          <input
            id={inputId}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value.slice(0, MAX_QUERY_LENGTH))}
            maxLength={MAX_QUERY_LENGTH}
            placeholder="Technology exhibitions in Germany in November"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[15px] text-gray-900 placeholder:text-gray-400 focus:border-[#131C55] focus:outline-none focus:ring-2 focus:ring-[#131C55]/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#131C55] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0E1B6B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Search size={16} aria-hidden="true" />
            {loading ? "Searching…" : "Search"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-500">Try:</span>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setQuery(example)}
              className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-[#131C55] hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:text-gray-400 dark:hover:border-blue-300 dark:hover:text-blue-300"
            >
              {example}
            </button>
          ))}
        </div>
      </form>

      {/* One live region for every outcome, so a screen reader is told what
          happened without the results stealing focus. */}
      <div aria-live="polite" className="mt-6">
        {loading ? (
          <ul className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="h-40 animate-pulse rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
              />
            ))}
          </ul>
        ) : null}

        {state.phase === "error" ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center dark:border-gray-700 dark:bg-gray-900/50">
            <p className="text-sm text-gray-600 dark:text-gray-400">{state.message}</p>
          </div>
        ) : null}

        {state.phase === "done" ? (
          state.results.length ? (
            <>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                {state.message || `${state.total} matching exhibitions.`}
              </p>
              <ul className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {state.results.map((r, i) => {
                  const dates = formatDateRange(r.starting_date, r.ending_date);
                  const place = formatLocation({
                    venue: r.venue,
                    city: r.city,
                    state: r.state,
                    country: r.country,
                  });
                  return (
                    <li key={r._id}>
                      <Link
                        href={exhibitionPath(r.exhibition_name, r._id)}
                        onClick={() => trackAiSearchResultClick(i + 1)}
                        className="ox-card flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 hover:border-[#131C55]/30 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-600"
                      >
                        {r.category ? (
                          <span className="line-clamp-1 text-[11px] font-semibold uppercase tracking-wide text-[#131C55] dark:text-blue-300">
                            {r.category}
                          </span>
                        ) : null}
                        <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug text-gray-900 dark:text-gray-50">
                          {r.exhibition_name}
                        </h3>
                        <dl className="mt-auto space-y-1.5 pt-3 text-sm text-gray-600 dark:text-gray-400">
                          {dates ? (
                            <div className="flex items-start gap-2">
                              <dt className="sr-only">Dates</dt>
                              <CalendarDays size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-gray-400" />
                              <dd>{dates}</dd>
                            </div>
                          ) : null}
                          {place ? (
                            <div className="flex items-start gap-2">
                              <dt className="sr-only">Location</dt>
                              <MapPin size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-gray-400" />
                              <dd className="line-clamp-1">{place}</dd>
                            </div>
                          ) : null}
                        </dl>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center dark:border-gray-700 dark:bg-gray-900/50">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {state.message || "No exhibitions matched that search."} Try naming a country, a city
                or an industry, or{" "}
                <Link
                  href="/exhibitions"
                  className="font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300"
                >
                  browse everything
                </Link>
                .
              </p>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
