"use client";

import { useEffect, useState } from "react";
import { getAdminAccessRequests } from "@/models/exhibition.model";
import { getAdminListingRequests } from "@/models/listingRequest.model";
import { getAdminCentres } from "@/models/exhibitionCentre.model";
import { getAdminHotels } from "@/models/hotel.model";

/**
 * How many things wait for an admin decision, in one place, so the sidebar
 * badge, the Requests tabs and the dashboard's "Needs attention" agree.
 *
 * Each page that decides something calls adminPendingChanged() afterwards and
 * every mounted useAdminPending() refetches. Before this the sidebar and the
 * tab badges were fetched once and kept showing a request that had just been
 * approved.
 *
 * A source that fails is left undefined (not 0), so a badge never claims
 * "nothing waiting" when it simply could not ask.
 */
const EVENT = "admin:pending-changed";

export function adminPendingChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export async function fetchAdminPending() {
  const [a, c, v, h] = await Promise.allSettled([
    getAdminAccessRequests("pending"),
    getAdminListingRequests("pending"),
    getAdminCentres({ status: "pending", limit: 1 }),
    getAdminHotels({ status: "pending" }),
  ]);
  const pick = (r, read) => (r.status === "fulfilled" ? read(r.value.data) ?? 0 : undefined);
  const access = pick(a, (d) => d?.counts?.pending);
  const claims = pick(c, (d) => d?.counts?.pending);
  const venues = pick(v, (d) => d?.total);
  const hotels = pick(h, (d) => d?.counts?.pending);
  return { access, claims, venues, hotels, requests: (access || 0) + (claims || 0) + (venues || 0) };
}

export function useAdminPending(enabled = true) {
  const [pending, setPending] = useState({});
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    const run = () =>
      fetchAdminPending().then((p) => {
        if (alive) setPending(p);
      });
    run();
    window.addEventListener(EVENT, run);
    return () => {
      alive = false;
      window.removeEventListener(EVENT, run);
    };
  }, [enabled]);
  return pending;
}
