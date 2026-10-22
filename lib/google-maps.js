/**
 * Loads the Google Maps JavaScript API once, in the browser, on demand.
 *
 * Only pages that show a map pay for the script: nothing is in the layout, and
 * the first component that needs Maps triggers the load. Later callers share
 * the same promise.
 *
 * THE KEY. NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is meant to be public: a Maps key is
 * always visible in the page. It is safe because it is restricted in Google
 * Cloud to OneXhib's own websites and to three APIs (Maps JavaScript, Places
 * (New), Geocoding). Never put any other Google key here.
 *
 * Everything runs in the browser: a website-restricted key cannot be used from
 * a server, so there is no server-side geocoding anywhere in the app.
 */

let loading = null;
const authListeners = new Set();

export const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// Advanced markers need a Map ID. Google's DEMO_MAP_ID works everywhere; set
// NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID to a real Map ID to style the maps later.
export const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

export class MapsUnavailableError extends Error {}

/**
 * Called by Google when it rejects the key (wrong website, API not enabled,
 * billing off). Components subscribe to show a useful message instead of the
 * grey "Oops! Something went wrong" box.
 */
export function onMapsAuthFailure(fn) {
  authListeners.add(fn);
  if (typeof window !== "undefined" && window.__oxMapsAuthFailed) fn();
  return () => authListeners.delete(fn);
}

/** Resolves to `google.maps` once the API is ready. */
export function loadGoogleMaps() {
  if (typeof window === "undefined") return Promise.reject(new MapsUnavailableError("Maps runs in the browser only."));
  if (!MAPS_KEY) {
    return Promise.reject(
      new MapsUnavailableError("The map is not set up: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing.")
    );
  }
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps);
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    const callback = "__oxGoogleMapsReady";
    window[callback] = () => {
      delete window[callback];
      resolve(window.google.maps);
    };
    window.gm_authFailure = () => {
      window.__oxMapsAuthFailed = true;
      for (const fn of authListeners) fn();
    };
    const params = new URLSearchParams({
      key: MAPS_KEY,
      v: "weekly",
      loading: "async",
      libraries: "places,marker,geocoding",
      language: "en",
      callback,
    });
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new MapsUnavailableError("Google Maps could not be loaded. Check the connection and try again."));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/* ─────────────────────────── Address parsing ─────────────────────────── */

/**
 * Google answers with address components in two shapes: Places (New) uses
 * { longText, shortText, types }, the Geocoder uses { long_name, short_name,
 * types }. This reads either into the fields an exhibition centre stores.
 */
export function parseAddressComponents(components = []) {
  const list = components.map((c) => ({
    long: c.longText ?? c.long_name ?? "",
    short: c.shortText ?? c.short_name ?? "",
    types: c.types || [],
  }));
  const pick = (...types) => {
    for (const type of types) {
      const hit = list.find((c) => c.types.includes(type));
      if (hit && hit.long) return hit.long;
    }
    return "";
  };
  return {
    // locality is the city almost everywhere; postal_town covers the UK, and
    // the admin levels cover places Google files under a district instead.
    city: pick("locality", "postal_town", "administrative_area_level_3", "administrative_area_level_2", "sublocality_level_1", "sublocality"),
    state: pick("administrative_area_level_1"),
    country: pick("country"),
    postal_code: pick("postal_code"),
  };
}

/** A Google Maps link that opens directions to a centre. */
export function directionsUrl({ lat, lng, placeId } = {}) {
  const params = new URLSearchParams({ api: "1", destination: `${lat},${lng}` });
  if (placeId) params.set("destination_place_id", placeId);
  return `https://www.google.com/maps/dir/?${params}`;
}
