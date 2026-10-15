"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, LocateFixed, MapPin } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import Section from "@/components/public/Section";
import Rail, { RailItem } from "@/components/public/Rail";
import ExhibitionCard from "@/components/public/ExhibitionCard";
import { PUBLIC_ROUTES } from "@/lib/seo";

/**
 * "Exhibitions near you" on the home page.
 *
 * The home page is static and shared by every visitor, so this is a client
 * island: once the session is known it reads the signed-in user's own city,
 * state and country (the ones given at signup, cached by AuthProvider) and asks
 * POST /api/exhibitions/nearby for upcoming shows at three widening levels.
 *
 * It opens on the most local level that has anything (city, else state, else
 * country) and the chips let the visitor widen or narrow it.
 *
 * Who sees what:
 *  - guests: a one-line prompt to sign in - the page does not ask the browser
 *    for GPS, because the account already says where the user is and a
 *    permission prompt on a landing page is a poor trade;
 *  - signed in with no location on file, or nothing nearby: nothing at all,
 *    rather than an empty rail under a "near you" heading.
 */

const LEVEL_WORD = { city: "City", state: "State", country: "Country" };

function exhibitionsHref(filter) {
  const qs = new URLSearchParams();
  for (const k of ["country", "state", "city"]) if (filter?.[k]) qs.set(k, filter[k]);
  const q = qs.toString();
  return q ? `${PUBLIC_ROUTES.exhibitions}?${q}` : PUBLIC_ROUTES.exhibitions;
}

export default function NearbyExhibitions({ className = "" }) {
  const { user, status } = useAuth();
  const [state, setState] = useState({ phase: "idle", levels: [], place: null });
  const [active, setActive] = useState(0);

  const country = user?.country || "";
  const region = user?.state || "";
  const city = user?.city || "";
  const hasPlace = Boolean(country || region || city);

  useEffect(() => {
    if (status !== "authed" || !hasPlace) return undefined;
    const controller = new AbortController();
    setState((s) => ({ ...s, phase: "loading" }));
    fetch("/api/exhibitions/nearby", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country, state: region, city }),
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : { levels: [] }))
      .then((data) => {
        setState({ phase: "ready", levels: data.levels || [], place: data.place || null });
        setActive(0);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setState({ phase: "ready", levels: [], place: null });
      });
    return () => controller.abort();
  }, [status, hasPlace, country, region, city]);

  // Guests: a compact invitation, not a section.
  if (status === "guest") {
    return (
      <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-[#2B3FB8]/30 bg-[#2B3FB8]/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between dark:border-blue-400/25 dark:bg-blue-400/[0.04]">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#2B3FB8] to-[#8B5CF6] text-white shadow-md">
              <LocateFixed size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">See exhibitions near you</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sign in and we&rsquo;ll show the shows coming to your city first.</p>
            </div>
          </div>
          <Link
            href="/login"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-[#131C55] to-[#2B3FB8] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-900/20 transition hover:brightness-110 motion-reduce:transition-none dark:from-blue-600 dark:to-indigo-500"
          >
            Sign in
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  if (status !== "authed" || !hasPlace) return null;
  if (state.phase === "ready" && !state.levels.length) return null;

  const level = state.levels[active];
  const placeLine = [state.place?.city, state.place?.state, state.place?.country].filter(Boolean).join(", ");

  return (
    <Section
      id="near-you"
      eyebrow="Near you"
      title={level?.level === "city" ? `Exhibitions in ${level.label}` : "Exhibitions near you"}
      intro={placeLine ? `Upcoming shows around ${placeLine}, from your profile.` : "Upcoming shows around you."}
      cta={level ? `See all ${level.total} in ${level.label}` : undefined}
      ctaHref={level ? exhibitionsHref(level.filter) : undefined}
      className={className}
    >
      {state.phase !== "ready" ? (
        <div aria-busy="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900" />
          ))}
        </div>
      ) : (
        <>
          {state.levels.length > 1 ? (
            <div role="tablist" aria-label="How far" className="mb-5 flex flex-wrap gap-2">
              {state.levels.map((l, i) => {
                const on = i === active;
                return (
                  <button
                    key={l.level}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setActive(i)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition motion-reduce:transition-none ${
                      on
                        ? "border-transparent bg-gradient-to-r from-[#131C55] to-[#2B3FB8] text-white shadow-sm shadow-indigo-900/20 dark:from-blue-500 dark:to-indigo-500"
                        : "border-gray-200 bg-white text-gray-700 hover:border-[#2B3FB8]/40 hover:text-[#2B3FB8] dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-400/40 dark:hover:text-white"
                    }`}
                  >
                    <MapPin size={13} aria-hidden="true" />
                    <span className={on ? "text-white/70" : "text-gray-400 dark:text-gray-500"}>{LEVEL_WORD[l.level]}</span>
                    {l.label}
                    <span className={`tabular-nums ${on ? "text-white/70" : "text-gray-400 dark:text-gray-500"}`}>{l.total}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <Rail>
            {level.items.map((exhibition) => (
              <RailItem key={exhibition.id}>
                <ExhibitionCard exhibition={exhibition} className="h-full" />
              </RailItem>
            ))}
          </Rail>
        </>
      )}
    </Section>
  );
}
