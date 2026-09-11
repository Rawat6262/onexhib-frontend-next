"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, CalendarDays, MapPin, Trash2 } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { fetchSaved, unsaveExhibition } from "@/lib/saved-exhibitions";
import { trackSaveToggled } from "@/lib/analytics";
import { exhibitionPath } from "@/lib/routes";
import { formatDateRange, formatLocation } from "@/lib/format";

/**
 * The signed-in user's saved exhibitions.
 *
 * Client-rendered rather than server-rendered because the list is per-user
 * private data keyed on the httpOnly cookie: rendering it on the server would
 * mean caching a personal list in a layer designed to be shared, and the whole
 * public data layer is ISR-cached. Nothing here is indexable anyway (the page
 * is noindex,nofollow), so there is no SEO cost to client rendering.
 *
 * The snapshot stored at save time can outlive the exhibition it describes, so
 * each card links by id and lets the detail route resolve it — a merged
 * duplicate 301s to its keeper rather than disappearing from this list without
 * explanation.
 */
export default function SavedClient() {
  const { status, user } = useAuth();
  const userId = user?._id || user?.id || null;
  const signedIn = status === "authed" && Boolean(userId);

  const [items, setItems] = useState([]);
  const [phase, setPhase] = useState("loading");
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    if (!signedIn) return;
    setPhase("loading");
    const { items: rows, error } = await fetchSaved(userId);
    if (error === "signed-out") {
      setPhase("signed-out");
      return;
    }
    if (error) {
      setPhase("error");
      return;
    }
    setItems(rows);
    setPhase("done");
  }, [signedIn, userId]);

  useEffect(() => {
    if (status === "loading") return;
    if (!signedIn) {
      setPhase("signed-out");
      return;
    }
    load();
  }, [status, signedIn, load]);

  async function onRemove(savedId) {
    if (removing) return;
    setRemoving(savedId);
    const before = items;
    setItems((list) => list.filter((i) => i.savedId !== savedId));

    const result = await unsaveExhibition(userId, savedId);
    if (!result.ok) {
      setItems(before); // rollback
      setRemoving(null);
      return;
    }
    trackSaveToggled(false);
    setRemoving(null);
  }

  if (status === "loading" || phase === "loading") {
    return (
      <ul className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="h-40 animate-pulse rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
          />
        ))}
      </ul>
    );
  }

  if (phase === "signed-out") {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <Bookmark size={22} aria-hidden="true" className="mx-auto text-[#131C55] dark:text-blue-300" />
        <h2 className="mt-3 text-base font-semibold text-gray-900 dark:text-gray-50">
          Sign in to see your saved exhibitions
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          Saved exhibitions are tied to your account so you can pick up where you left off.
        </p>
        <Link
          href="/login?next=%2Faccount%2Fsaved"
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#131C55] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0E1B6B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55]"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-900/50">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your saved exhibitions could not be loaded right now.
        </p>
        <button
          type="button"
          onClick={load}
          className="mt-3 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#131C55] hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:text-gray-300"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900/50">
        <Bookmark size={22} aria-hidden="true" className="mx-auto text-gray-400" />
        <h2 className="mt-3 text-base font-semibold text-gray-900 dark:text-gray-50">
          Nothing saved yet
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          Save an exhibition from its page and it will appear here.
        </p>
        <Link
          href="/exhibitions"
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#131C55] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0E1B6B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55]"
        >
          Browse exhibitions
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mb-5 text-sm text-gray-500 dark:text-gray-500">
        {items.length} saved {items.length === 1 ? "exhibition" : "exhibitions"}
      </p>
      <ul className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const dates = formatDateRange(item.startDate, item.endDate);
          const place = formatLocation({
            venue: item.venue,
            city: item.city,
            state: item.state,
            country: item.country,
          });
          return (
            <li
              key={item.savedId}
              className="ox-card flex flex-col rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              {item.category ? (
                <span className="line-clamp-1 text-[11px] font-semibold uppercase tracking-wide text-[#131C55] dark:text-blue-300">
                  {item.category}
                </span>
              ) : null}
              <h2 className="mt-1 line-clamp-2 text-base font-semibold leading-snug text-gray-900 dark:text-gray-50">
                <Link
                  href={exhibitionPath(item.name, item.id)}
                  className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55]"
                >
                  {item.name}
                </Link>
              </h2>
              <dl className="mt-3 space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
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
              <button
                type="button"
                onClick={() => onRemove(item.savedId)}
                disabled={removing === item.savedId}
                aria-label={`Remove ${item.name} from your saved list`}
                className="mt-4 inline-flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:opacity-50 dark:hover:bg-red-950/40 dark:hover:text-red-400"
              >
                <Trash2 size={13} aria-hidden="true" />
                {removing === item.savedId ? "Removing…" : "Remove"}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
