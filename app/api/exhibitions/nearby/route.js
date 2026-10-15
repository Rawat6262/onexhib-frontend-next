import { NextResponse } from "next/server";
import { getExhibitions } from "@/lib/public-api";

/**
 * POST /api/exhibitions/nearby  { country, state, city }
 *
 * Upcoming exhibitions around a place, at three widening levels - the city, the
 * state, the country - so the home page's "Near you" rail can start as local as
 * the data allows and let the visitor widen it. Each level is one call to the
 * same paginated upcoming listing the rest of the site uses (the backend's
 * buildLocationFilter, any subset of country/state/city).
 *
 * POST, not GET: the place comes from the visitor's own profile, and a body
 * keeps it out of URLs, access logs and proxy caches. It is coarse (city level)
 * but it is still theirs.
 *
 * NORMALISATION. Newer accounts store names ("India", "Punjab"); older ones
 * stored the signup form's codes ("IN", "PB"). A 2-letter country is resolved to
 * its name, and a short state code to its name within that country, using the
 * same country-state-city dataset the signup form uses - loaded here on the
 * server only, never shipped to the browser.
 */

export const dynamic = "force-dynamic";

const LIMIT = 8;
const MAX_LEN = 80;

const clean = (v) => (typeof v === "string" ? v.trim().slice(0, MAX_LEN) : "");

let cscPromise = null;
const loadCsc = () => (cscPromise ||= import("country-state-city").catch(() => null));

async function normalise({ country, state, city }) {
  let countryName = country;
  let countryCode = /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : "";
  let stateName = state;

  const csc = countryCode || (state && state.length <= 3) ? await loadCsc() : null;

  if (countryCode) {
    countryName = csc?.Country?.getCountryByCode(countryCode)?.name || countryName;
  } else if (csc && country) {
    countryCode = csc.Country.getAllCountries().find((c) => c.name.toLowerCase() === country.toLowerCase())?.isoCode || "";
  }
  if (csc && countryCode && state && state.length <= 3) {
    stateName = csc.State.getStateByCodeAndCountry(state.toUpperCase(), countryCode)?.name || "";
  }
  return { country: countryName, state: stateName, city };
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ levels: [] }, { status: 400 });
  }

  const place = await normalise({
    country: clean(body?.country),
    state: clean(body?.state),
    city: clean(body?.city),
  });

  if (!place.country && !place.state && !place.city) {
    return NextResponse.json({ place, levels: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  // Widening levels; a level is skipped when the place lacks its part, and a
  // level identical to a narrower one (no state on record) is not repeated.
  const candidates = [
    place.city ? { level: "city", label: place.city, filter: { country: place.country, state: place.state, city: place.city } } : null,
    place.state ? { level: "state", label: place.state, filter: { country: place.country, state: place.state } } : null,
    place.country ? { level: "country", label: place.country, filter: { country: place.country } } : null,
  ].filter(Boolean);

  const results = await Promise.all(
    candidates.map(async (c) => {
      const list = await getExhibitions("upcoming", { page: 1, limit: LIMIT, ...c.filter });
      return { level: c.level, label: c.label, filter: c.filter, total: list.total || list.items.length, items: list.items };
    })
  );

  return NextResponse.json(
    { place, levels: results.filter((r) => r.items.length) },
    {
      headers: {
        "Cache-Control": "no-store",
        // A JSON payload carries no meta tag, so the crawl directive goes here.
        "X-Robots-Tag": "noindex",
      },
    }
  );
}
