"use client";

import { useEffect, useRef, useState } from "react";
import { BedDouble, Hospital, Loader2, Navigation, Plane, Star, UtensilsCrossed, X } from "lucide-react";

import { MAP_ID, loadGoogleMaps, onMapsAuthFailure } from "@/lib/google-maps";

/**
 * "Around the venue": airports, hotels, restaurants and hospitals near an
 * exhibition centre.
 *
 * TWO SOURCES, ON PURPOSE.
 *  - `saved`: places the backend stored on the centre from OpenStreetMap
 *    (Onexhib_backend/Service/nearbyPlaces.js). Rendered as four lists in the
 *    server HTML, so search engines read "hotels near <venue>". Free to show,
 *    and the ODbL credit under them is required.
 *  - Google Places, live: ratings and price levels, which OSM does not have.
 *    Behind a "Ratings on Google" button on hotels and restaurants, because
 *    every Nearby Search is billed and Google's terms forbid storing results.
 *    A centre that has not been looked up yet (saved is null) falls back to
 *    Google for all four categories, as before.
 *
 * NOTHING FROM GOOGLE LOADS UNTIL A BUTTON IS CLICKED. A category is fetched
 * once and kept for the visit; the map is created on the first click and its
 * pins swapped after that. Rating and price level are Enterprise fields, so
 * they are requested only for hotels and restaurants.
 */

const BASE_FIELDS = ["id", "displayName", "location", "formattedAddress"];
const RATED_FIELDS = [...BASE_FIELDS, "rating", "userRatingCount", "priceLevel"];

const CATEGORIES = [
  {
    key: "airports",
    label: "Airports",
    icon: Plane,
    color: "#2B3FB8",
    // "airport" covers international airports too. "international_airport" on
    // its own was worse: around Delhi it matched a cab firm and a plot of land.
    // Ranked by popularity so the main airport leads, not the nearest airstrip.
    search: { includedPrimaryTypes: ["airport"], excludedPrimaryTypes: ["heliport"], radius: 50000 },
    max: 3,
    fields: BASE_FIELDS,
  },
  {
    key: "hotels",
    label: "Hotels",
    icon: BedDouble,
    color: "#7C3AED",
    search: { includedPrimaryTypes: ["hotel"], radius: 3000 },
    max: 10,
    fields: RATED_FIELDS,
    rated: true,
  },
  {
    key: "restaurants",
    label: "Restaurants",
    icon: UtensilsCrossed,
    color: "#EA580C",
    // includedTypes, not primary: "italian_restaurant" and the like are their
    // own primary types. Hotels that merely have a restaurant are left out.
    search: { includedTypes: ["restaurant"], excludedPrimaryTypes: ["hotel", "lodging"], radius: 1500 },
    max: 10,
    fields: RATED_FIELDS,
    rated: true,
  },
  {
    key: "hospitals",
    label: "Hospitals",
    icon: Hospital,
    color: "#E11D48",
    // Google files many small clinics and care agencies as "hospital"; by
    // distance they crowded out the real ones, by popularity they do not.
    search: { includedPrimaryTypes: ["hospital"], radius: 10000 },
    max: 5,
    fields: BASE_FIELDS,
  },
];

/** Straight-line distance in km - routing would need another paid API. */
function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

const fmtKm = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`);

// Price level is relative to the place's own market, so it is shown as a tier
// out of four, not a currency - a rupee sign would be wrong in Amsterdam.
const PRICE_LEVEL = { INEXPENSIVE: 1, MODERATE: 2, EXPENSIVE: 3, VERY_EXPENSIVE: 4 };

/**
 * Google Maps directions from the venue. A live Google result is addressed by
 * its place id; a saved OSM place by its coordinates and name.
 */
function directionsFromVenue(venue, place, { google = false } = {}) {
  const params = new URLSearchParams({ api: "1", origin: `${venue.lat},${venue.lng}` });
  if (google) {
    params.set("destination", place.name);
    params.set("destination_place_id", place.id);
  } else {
    params.set("destination", `${place.lat},${place.lng}`);
  }
  return `https://www.google.com/maps/dir/?${params}`;
}

const directionsClass =
  "inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-ox-navy hover:text-ox-navy motion-reduce:transition-none dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-300 dark:hover:text-blue-300";

export default function AroundVenue({ venue, saved = null, className = "" }) {
  const [active, setActive] = useState(null); // category key shown from Google
  const [results, setResults] = useState({}); // key -> { status, places, error }
  const mapEl = useRef(null);
  const panelRef = useRef(null);
  const mapRef = useRef(null); // { map, markers, AdvancedMarkerElement, PinElement, LatLngBounds }
  const center = { lat: Number(venue.lat), lng: Number(venue.lng) };

  // Search a category on Google the first time it is opened.
  const open = async (category) => {
    setActive(category.key);
    if (results[category.key]) return;
    setResults((r) => ({ ...r, [category.key]: { status: "loading", places: [] } }));
    try {
      const maps = await loadGoogleMaps();
      const { Place, SearchNearbyRankPreference } = await maps.importLibrary("places");
      const { radius, ...types } = category.search;
      // Every category ranks by popularity: by distance, the nearest airstrip
      // beat the main airport and clinics beat hospitals. Google's order is
      // kept, and the distance is shown on each row instead.
      const { places } = await Place.searchNearby({
        fields: category.fields,
        locationRestriction: { center, radius },
        ...types,
        maxResultCount: category.max,
        rankPreference: SearchNearbyRankPreference.POPULARITY,
        language: "en",
      });
      const shaped = (places || []).map((p) => {
        const lat = p.location?.lat();
        const lng = p.location?.lng();
        return {
          id: p.id,
          name: p.displayName || "Unnamed place",
          address: p.formattedAddress || "",
          lat,
          lng,
          km: Number.isFinite(lat) ? distanceKm(center, { lat, lng }) : null,
          rating: p.rating ?? null,
          ratings: p.userRatingCount ?? null,
          price: p.priceLevel ?? null,
        };
      });
      setResults((r) => ({ ...r, [category.key]: { status: "ready", places: shaped } }));
    } catch (err) {
      console.warn("[AroundVenue]", err);
      setResults((r) => ({
        ...r,
        [category.key]: { status: "error", places: [], error: "Places near this venue could not be loaded right now." },
      }));
    }
  };

  // With saved lists the Google panel opens below them; bring it into view.
  const openFromCard = (category) => {
    open(category);
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };

  // The map: created once, the first time a category has results, then its
  // pins are swapped as the visitor moves between categories.
  const current = active ? results[active] : null;
  const category = CATEGORIES.find((c) => c.key === active);
  useEffect(() => {
    if (!current || current.status !== "ready" || !mapEl.current) return undefined;
    let cancelled = false;
    const off = onMapsAuthFailure(() => {
      setResults((r) => ({ ...r, [active]: { ...r[active], status: "error", error: "The map could not be shown." } }));
    });
    (async () => {
      const maps = await loadGoogleMaps();
      if (!mapRef.current) {
        const [{ Map }, { AdvancedMarkerElement, PinElement }, { LatLngBounds }] = await Promise.all([
          maps.importLibrary("maps"),
          maps.importLibrary("marker"),
          maps.importLibrary("core"),
        ]);
        if (cancelled || !mapEl.current) return;
        const map = new Map(mapEl.current, {
          center,
          zoom: 14,
          mapId: MAP_ID,
          streetViewControl: false,
          mapTypeControl: false,
          gestureHandling: "cooperative",
        });
        // The venue keeps a large dark pin of its own across every category.
        const venuePin = new PinElement({ background: "#131C55", borderColor: "#0B1240", glyphColor: "#fff", scale: 1.25 });
        new AdvancedMarkerElement({ map, position: center, title: venue.name, content: venuePin.element, zIndex: 1000 });
        mapRef.current = { map, markers: [], AdvancedMarkerElement, PinElement, LatLngBounds };
      }
      if (cancelled) return;
      const { map, AdvancedMarkerElement, PinElement, LatLngBounds } = mapRef.current;
      mapRef.current.markers.forEach((m) => (m.map = null));
      const bounds = new LatLngBounds();
      bounds.extend(center);
      mapRef.current.markers = current.places
        .filter((p) => Number.isFinite(p.lat))
        .map((p, i) => {
          const pin = new PinElement({ background: category.color, borderColor: "#fff", glyphColor: "#fff", glyph: String(i + 1) });
          bounds.extend({ lat: p.lat, lng: p.lng });
          return new AdvancedMarkerElement({ map, position: { lat: p.lat, lng: p.lng }, title: p.name, content: pin.element });
        });
      if (mapRef.current.markers.length) map.fitBounds(bounds, 48);
      else map.setCenter(center);
    })().catch((err) => console.warn("[AroundVenue] map", err));
    return () => {
      cancelled = true;
      off();
    };
    // `center` is rebuilt each render from the same venue; the venue's
    // coordinates are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, active, venue.lat, venue.lng]);

  const hasSaved = Boolean(saved);

  return (
    <section aria-labelledby="around-venue-heading" className={className}>
      <h2 id="around-venue-heading" className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Around the venue
      </h2>
      <p className="mt-1.5 text-[15px] text-gray-600 dark:text-gray-400">
        Airports, hotels, restaurants and hospitals near {venue.name}.
      </p>

      {hasSaved ? (
        <>
          {/* items-start: a card with one airport should not stretch to the
              height of eight hotels beside it. */}
          <div className="mt-5 grid items-start gap-4 md:grid-cols-2">
            {CATEGORIES.map((c) => (
              <SavedCard
                key={c.key}
                category={c}
                places={saved[c.key] || []}
                venue={venue}
                googleOpen={active === c.key}
                onGoogle={c.rated ? () => openFromCard(c) : null}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
            Places ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-gray-700 dark:hover:text-gray-300"
            >
              OpenStreetMap contributors
            </a>
            . Distances are in a straight line from the venue.
          </p>
        </>
      ) : (
        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Show places near the venue">
          {CATEGORIES.map((c) => {
            const on = active === c.key;
            const Icon = c.icon;
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={on}
                onClick={() => open(c)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ox-navy motion-reduce:transition-none ${
                  on
                    ? "border-ox-navy bg-ox-navy text-white dark:border-blue-400 dark:bg-blue-500"
                    : "border-gray-300 bg-white text-gray-800 hover:border-ox-navy dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                }`}
              >
                <Icon size={16} aria-hidden="true" />
                {c.label}
              </button>
            );
          })}
        </div>
      )}

      {active ? (
        <div
          ref={panelRef}
          className="mt-5 grid scroll-mt-24 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] dark:border-gray-800 dark:bg-gray-900"
        >
          {/* List */}
          <div className="flex min-w-0 flex-col" aria-live="polite">
            {hasSaved ? (
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3 dark:border-gray-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{category.label} rated on Google</p>
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  aria-label="Close Google ratings"
                  className="grid h-8 w-8 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            ) : null}
            {current?.status === "loading" ? (
              <p className="flex items-center gap-2 px-5 py-8 text-sm text-gray-600 dark:text-gray-400">
                <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Finding {category.label.toLowerCase()} near the venue…
              </p>
            ) : current?.status === "error" ? (
              <p className="px-5 py-8 text-sm text-gray-600 dark:text-gray-400">{current.error}</p>
            ) : current?.places.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-600 dark:text-gray-400">
                No {category.label.toLowerCase()} found close to the venue.
              </p>
            ) : (
              <ol className="max-h-[26rem] list-none divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
                {current?.places.map((p, i) => (
                  <li key={p.id} className="flex items-start gap-3 px-5 py-3.5">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                      style={{ background: category.color }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-gray-600 dark:text-gray-400">
                        {p.km !== null ? <span>{fmtKm(p.km)} from the venue</span> : null}
                        {p.rating !== null ? (
                          <span className="inline-flex items-center gap-0.5">
                            <Star size={12} aria-hidden="true" className="fill-amber-400 text-amber-400" />
                            {p.rating.toFixed(1)}
                            {p.ratings ? <span className="text-gray-400">({p.ratings.toLocaleString("en-US")})</span> : null}
                          </span>
                        ) : null}
                        {PRICE_LEVEL[p.price] ? (
                          <span title={`Price level ${PRICE_LEVEL[p.price]} of 4`}>
                            <span aria-hidden="true" className="font-semibold text-gray-700 dark:text-gray-300">{"$".repeat(PRICE_LEVEL[p.price])}</span>
                            <span aria-hidden="true" className="text-gray-300 dark:text-gray-600">{"$".repeat(4 - PRICE_LEVEL[p.price])}</span>
                            <span className="sr-only">Price level {PRICE_LEVEL[p.price]} of 4</span>
                          </span>
                        ) : null}
                      </p>
                      {p.address ? <p className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-gray-500">{p.address}</p> : null}
                    </div>
                    <a
                      href={directionsFromVenue(venue, p, { google: true })}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Directions from ${venue.name} to ${p.name}`}
                      className={directionsClass}
                    >
                      <Navigation size={12} aria-hidden="true" /> Directions
                    </a>
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-auto border-t border-gray-100 px-5 py-2.5 text-[11px] text-gray-500 dark:border-gray-800 dark:text-gray-500">
              Places and ratings from Google. Distances are in a straight line.
            </p>
          </div>

          {/* Map - created on the first click, then reused. */}
          <div className="relative h-80 border-t border-gray-200 lg:h-auto lg:min-h-[26rem] lg:border-l lg:border-t-0 dark:border-gray-800">
            <div ref={mapEl} role="region" aria-label={`Map of places near ${venue.name}`} className="absolute inset-0 bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
      ) : null}
    </section>
  );
}

/** One category of saved (OpenStreetMap) places, as a card. */
function SavedCard({ category, places, venue, googleOpen, onGoogle }) {
  const Icon = category.icon;
  const headingId = `around-${category.key}`;
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <h3 id={headingId} className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-3.5 text-base font-semibold text-gray-900 dark:border-gray-800 dark:text-gray-100">
        <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ background: category.color }}>
          <Icon size={16} />
        </span>
        {category.label}
      </h3>
      {places.length ? (
        <ul aria-labelledby={headingId} className="list-none divide-y divide-gray-100 dark:divide-gray-800">
          {places.map((p) => (
            <li key={p.id || p.name} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 font-medium text-gray-900 dark:text-gray-100">
                  <span>{p.name}</span>
                  {p.code ? (
                    <span className="rounded bg-ox-blue/10 px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-ox-blue dark:bg-blue-400/10 dark:text-blue-300">
                      {p.code}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-gray-600 dark:text-gray-400">
                  {p.km !== null ? <span>{fmtKm(p.km)}</span> : null}
                  {p.stars ? (
                    <span className="inline-flex items-center gap-0.5">
                      {p.stars}
                      <Star size={11} aria-hidden="true" className="fill-amber-400 text-amber-400" />
                      <span className="sr-only">star hotel</span>
                    </span>
                  ) : null}
                  {p.cuisine ? <span>{p.cuisine}</span> : null}
                  {p.emergency ? <span className="font-medium text-rose-600 dark:text-rose-400">Emergency department</span> : null}
                </p>
              </div>
              <a
                href={directionsFromVenue(venue, p)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Directions from ${venue.name} to ${p.name}`}
                className={directionsClass}
              >
                <Navigation size={12} aria-hidden="true" />
                <span className="hidden sm:inline">Directions</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400">None found close to the venue.</p>
      )}
      {onGoogle ? (
        <div className="mt-auto border-t border-gray-100 px-5 py-3 dark:border-gray-800">
          <button
            type="button"
            onClick={onGoogle}
            aria-pressed={googleOpen}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ox-blue hover:underline dark:text-blue-300"
          >
            <Star size={14} aria-hidden="true" className="fill-amber-400 text-amber-400" />
            {googleOpen ? "Ratings shown below" : `${category.label} with ratings on Google`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
