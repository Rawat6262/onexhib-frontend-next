"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Search, Lock, AlertCircle, ArrowRight } from "lucide-react";

import ExhibitionCard from "@/components/public/ExhibitionCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { aiSearchExhibitions } from "@/models/aiSearch.model";
import { toCardExhibition, describeFilters, AI_SEARCH_EXAMPLES } from "@/lib/ai-search";
import { PUBLIC_ROUTES } from "@/lib/seo";

/**
 * AI exhibition search, for signed-in users.
 *
 * WHY THE GATE IS A PANEL AND NOT A REDIRECT
 * A signed-out visitor who clicks "Ask AI" is shown what the feature is and how
 * to get it, on the page they asked for. Bouncing them to /login loses the
 * context and reads like an error. They can still see the tool exists, which is
 * the point of showing the button publicly at all.
 *
 * IMPORTANT - THIS GATE IS UX, NOT SECURITY.
 * /api/exhibitions/ai-search currently carries no auth middleware on the
 * backend, so the endpoint answers anyone who calls it directly, and each call
 * spends OpenAI credit. Adding restrictToLoginUser to that route is what
 * actually protects it; this component only decides what the site offers.
 */
export default function AiSearchClient() {
  const { status } = useAuth();

  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (text, page = 1) => {
    const q = text.trim();
    if (!q || busy) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await aiSearchExhibitions({ query: q, page, limit: 12 });
      setResult(data);
      setSubmitted(q);
    } catch (err) {
      // 401 is handled globally by AuthProvider's interceptor, which signs the
      // user out and redirects; anything else is shown here.
      const msg = err?.response?.data?.message;
      setError(msg || "The search could not be completed. Please try again.");
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  /* ── while the cached session is being read ─────────────────────────── */
  if (status === "loading") {
    return (
      <div className="mt-10 h-40 animate-pulse rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900" />
    );
  }

  /* ── signed out ─────────────────────────────────────────────────────── */
  if (status !== "authed") {
    return (
      <section className="mt-10 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-gray-800 dark:bg-gray-900/60">
          <p className="inline-flex items-center gap-2 rounded-full bg-[#131C55]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#131C55] dark:bg-blue-400/10 dark:text-blue-300">
            <Lock size={12} aria-hidden="true" />
            Sign in required
          </p>
          <h2 className="mt-3 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            AI search is available to signed-in users
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
            Please sign in or create a free account to ask questions in your own words. If you have
            just signed up, verify your email first — the code is sent when you register.
          </p>
        </div>

        <div className="px-6 py-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#131C55] px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-[#0E1B6B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none"
            >
              Sign in
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-[15px] font-semibold text-gray-900 transition hover:border-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-500"
            >
              Create a free account
            </Link>
          </div>

          {/* The catalogue itself stays open to everyone - saying so keeps the
              gate from reading as "the whole site is locked". */}
          <p className="mt-5 text-[15px] text-gray-600 dark:text-gray-400">
            You can still browse everything without an account:{" "}
            <Link href={PUBLIC_ROUTES.exhibitions} className={link}>
              all exhibitions
            </Link>
            ,{" "}
            <Link href={PUBLIC_ROUTES.locations} className={link}>
              by location
            </Link>{" "}
            or{" "}
            <Link href={PUBLIC_ROUTES.categories} className={link}>
              by industry
            </Link>
            .
          </p>
        </div>
      </section>
    );
  }

  /* ── signed in ──────────────────────────────────────────────────────── */
  const chips = describeFilters(result?.filters);
  const items = result?.data || [];
  const understood = chips.length > 0;

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(query);
        }}
        className="mt-8"
      >
        <label htmlFor="ai-query" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          What are you looking for?
        </label>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={17}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              id="ai-query"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. upcoming technology exhibitions in Germany"
              className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 text-[15px] text-gray-900 placeholder-gray-400 transition focus:border-[#131C55] focus:outline-none focus:ring-2 focus:ring-[#131C55]/20 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !query.trim()}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#131C55] px-6 text-[15px] font-semibold text-white transition hover:bg-[#0E1B6B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] disabled:opacity-60 motion-reduce:transition-none"
          >
            <Sparkles size={16} aria-hidden="true" />
            {busy ? "Searching…" : "Ask"}
          </button>
        </div>
      </form>

      {/* Examples double as documentation: they show the kinds of question the
          backend can actually turn into filters. */}
      {!result && !busy ? (
        <div className="mt-4">
          <p className="text-[13px] text-gray-500 dark:text-gray-400">Try one of these:</p>
          <ul className="mt-2 flex list-none flex-wrap gap-2">
            {AI_SEARCH_EXAMPLES.map((ex) => (
              <li key={ex}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery(ex);
                    run(ex);
                  }}
                  className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-[13px] text-gray-600 transition hover:border-[#131C55]/40 hover:text-[#131C55] motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-white"
                >
                  {ex}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {busy ? (
        <div className="mt-8 space-y-4" aria-live="polite">
          <div className="h-5 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <ul className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-900" />
            ))}
          </ul>
        </div>
      ) : null}

      {error && !busy ? (
        <div
          role="alert"
          className="mt-8 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-900 dark:bg-red-950/40"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
          <div>
            <p className="text-[15px] font-semibold text-red-800 dark:text-red-300">{error}</p>
            <button
              type="button"
              onClick={() => run(submitted || query)}
              className="mt-2 text-sm font-semibold text-red-700 underline underline-offset-4 dark:text-red-300"
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}

      {result && !busy && !error ? (
        <section className="mt-8" aria-live="polite">
          {/* The message comes from the server, built from the real filter and
              count - never from the model - so it is safe to show as-is. */}
          <p className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">{result.message}</p>

          {understood ? (
            <div className="mt-3">
              <p className="text-[13px] text-gray-500 dark:text-gray-400">Understood as:</p>
              <ul className="mt-1.5 flex list-none flex-wrap gap-2">
                {chips.map((c) => (
                  <li
                    key={c.label + c.value}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#131C55]/10 px-3 py-1 text-[12px] font-medium text-[#131C55] dark:bg-blue-400/10 dark:text-blue-300"
                  >
                    <span className="opacity-70">{c.label}:</span> {c.value}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {items.length ? (
            <>
              <ul className="mt-6 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {items.map((row) => {
                  const ex = toCardExhibition(row);
                  return (
                    <li key={ex.id}>
                      <ExhibitionCard exhibition={ex} className="h-full" />
                    </li>
                  );
                })}
              </ul>

              {/* A local pager rather than components/public/Pagination: that one
                  builds <Link href> for crawlable listing URLs, and these results
                  live behind a sign-in and have no URL of their own. Paging here
                  re-runs the same query for the next page. */}
              {(result.totalPages || 1) > 1 ? (
                <nav aria-label="Result pages" className="mt-8 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => run(submitted, (result.page || 1) - 1)}
                    disabled={(result.page || 1) <= 1}
                    className={pagerBtn}
                  >
                    Previous
                  </button>
                  <span className="text-[13px] text-gray-500 dark:text-gray-400">
                    Page {result.page || 1} of {result.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => run(submitted, (result.page || 1) + 1)}
                    disabled={(result.page || 1) >= (result.totalPages || 1)}
                    className={pagerBtn}
                  >
                    Next
                  </button>
                </nav>
              ) : null}
            </>
          ) : (
            <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-10 text-center dark:border-gray-800 dark:bg-gray-900">
              <p className="text-[15px] text-gray-600 dark:text-gray-400">
                {understood
                  ? "Nothing in the catalogue matches that yet. Try widening the location or dropping the date."
                  : "Try naming a category, a place, a month, or a specific show, venue or sponsor."}
              </p>
              <Link href={PUBLIC_ROUTES.exhibitions} className={`${link} mt-3 inline-block`}>
                Browse all exhibitions instead
              </Link>
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}

const link =
  "font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300";

const pagerBtn =
  "rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-[#131C55] hover:text-[#131C55] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:text-white";
