"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";

import { MAP_ID, MapsUnavailableError, loadGoogleMaps, onMapsAuthFailure, parseAddressComponents } from "@/lib/google-maps";

/**
 * Pick a place on Google Maps, and get its address fields back.
 *
 * Two ways in:
 *   1. Search: type the venue's name ("Pragati Maidan"), pick a suggestion.
 *      Places (New) answers with the name, full address, coordinates and the
 *      address parts, plus Google's place id (used to stop duplicates).
 *   2. Pin: click the map, or drag the pin. The Geocoder turns the point into
 *      an address. The venue name is left alone - a pin has no name.
 *
 * onPick({ name?, address, city, state, country, postal_code, lat, lng, place_id })
 * fires after either. Everything it returns is a suggestion: the parent form
 * keeps every field editable, because Google is not always right about a city.
 *
 * Billing note: suggestions are fetched with a session token, so one search -
 * however many keystrokes - is billed as one session when a place is picked.
 */
const DEFAULT_CENTER = { lat: 22.5, lng: 79 }; // India, zoomed out

/** A marker position is a LatLng (methods) or a LatLngLiteral (numbers) depending on how it was set. */
const coordOf = (p, key) => (typeof p?.[key] === "function" ? p[key]() : Number(p?.[key]));
const SEARCH_DELAY = 250;

export default function LocationPicker({ value, initialQuery = "", onPick, className = "" }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const libsRef = useRef(null);
  const sessionRef = useRef(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState("");
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState([]);
  // Opened with a name already typed (from a venue suggestion or the exhibition
  // form): show Google's matches straight away instead of waiting for a click.
  const [open, setOpen] = useState(Boolean(initialQuery));
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(-1);

  // ── Load Maps, build the map and the draggable pin ─────────────────────────
  useEffect(() => {
    let cancelled = false;
    const off = onMapsAuthFailure(() => {
      setStatus("error");
      setError(`Google blocked the map on ${window.location.host}. Add "${window.location.origin}/*" to the key's website restrictions in Google Cloud (and check the three Maps APIs are enabled).`);
    });

    (async () => {
      try {
        const maps = await loadGoogleMaps();
        const [{ Map }, { AdvancedMarkerElement }, places, { Geocoder }] = await Promise.all([
          maps.importLibrary("maps"),
          maps.importLibrary("marker"),
          maps.importLibrary("places"),
          maps.importLibrary("geocoding"),
        ]);
        if (cancelled || !mapEl.current) return;
        libsRef.current = { places, geocoder: new Geocoder(), maps };

        const start = value?.lat != null && value?.lng != null ? { lat: Number(value.lat), lng: Number(value.lng) } : null;
        const map = new Map(mapEl.current, {
          center: start || DEFAULT_CENTER,
          zoom: start ? 15 : 4,
          mapId: MAP_ID,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          clickableIcons: false,
          gestureHandling: "cooperative",
        });
        const marker = new AdvancedMarkerElement({ map: start ? map : null, position: start, gmpDraggable: true, title: "Drag to the venue entrance" });
        marker.addListener("dragend", () => {
          const p = marker.position;
          reverseGeocode({ lat: coordOf(p, "lat"), lng: coordOf(p, "lng") });
        });
        map.addListener("click", (e) => {
          const point = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          placeMarker(point);
          reverseGeocode(point);
        });
        mapRef.current = map;
        markerRef.current = marker;
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        console.warn("[LocationPicker]", err);
        // Our own errors (missing key, script blocked) are written for people;
        // anything from inside Google's code is not, so it gets a plain message.
        setError(err instanceof MapsUnavailableError ? err.message : "Google Maps could not be loaded on this page. Check that this website is allowed on the Maps API key.");
      }
    })();

    return () => {
      cancelled = true;
      off();
    };
    // The map is built once; later value changes move the pin (effect below).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A parent that loads a saved centre after mount moves the pin.
  useEffect(() => {
    if (status !== "ready" || value?.lat == null || value?.lng == null) return;
    const point = { lat: Number(value.lat), lng: Number(value.lng) };
    const current = markerRef.current?.position;
    const same = current && Math.abs(coordOf(current, "lat") - point.lat) < 1e-7 && Math.abs(coordOf(current, "lng") - point.lng) < 1e-7;
    if (!same) {
      placeMarker(point);
      mapRef.current?.setZoom(15);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, value?.lat, value?.lng]);

  function placeMarker(point) {
    const marker = markerRef.current;
    const map = mapRef.current;
    if (!marker || !map) return;
    marker.position = point;
    marker.map = map;
    map.panTo(point);
  }

  async function reverseGeocode(point) {
    const geocoder = libsRef.current?.geocoder;
    if (!geocoder) return;
    setBusy(true);
    try {
      const { results } = await geocoder.geocode({ location: point });
      // Prefer a real address over a plus code or a bare road.
      const best =
        results.find((r) => r.types.some((t) => ["premise", "establishment", "point_of_interest", "street_address"].includes(t))) ||
        results[0];
      const parts = parseAddressComponents(best?.address_components || []);
      onPickRef.current?.({
        address: best?.formatted_address || "",
        ...parts,
        lat: point.lat,
        lng: point.lng,
        // A dropped pin is not a Google place: no id, so no duplicate check.
        place_id: "",
      });
    } catch {
      onPickRef.current?.({ lat: point.lat, lng: point.lng, place_id: "" });
    } finally {
      setBusy(false);
    }
  }

  // ── Search suggestions (Places API (New)) ──────────────────────────────────
  useEffect(() => {
    if (status !== "ready") return undefined;
    const input = query.trim();
    if (input.length < 3) {
      setSuggestions([]);
      return undefined;
    }
    let stale = false;
    const t = setTimeout(async () => {
      const { places } = libsRef.current;
      if (!sessionRef.current) sessionRef.current = new places.AutocompleteSessionToken();
      try {
        const { suggestions: found } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: sessionRef.current,
        });
        if (stale) return;
        setSuggestions(
          (found || [])
            .map((s) => s.placePrediction)
            .filter(Boolean)
            .slice(0, 6)
            .map((p) => ({
              prediction: p,
              main: p.mainText?.text || p.text?.text || "",
              secondary: p.secondaryText?.text || "",
              full: p.text?.text || "",
            }))
        );
        setActive(-1);
      } catch {
        if (!stale) setSuggestions([]);
      }
    }, SEARCH_DELAY);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [query, status]);

  async function choose(s) {
    setOpen(false);
    setQuery(s.main);
    setBusy(true);
    try {
      const place = s.prediction.toPlace();
      await place.fetchFields({ fields: ["id", "displayName", "formattedAddress", "location", "addressComponents"] });
      // The token is spent once a place's details are fetched; the next search
      // starts a new billing session.
      sessionRef.current = null;
      const point = { lat: place.location.lat(), lng: place.location.lng() };
      placeMarker(point);
      mapRef.current?.setZoom(16);
      onPickRef.current?.({
        name: place.displayName || s.main,
        address: place.formattedAddress || "",
        ...parseAddressComponents(place.addressComponents || []),
        ...point,
        place_id: place.id || "",
      });
    } catch (err) {
      sessionRef.current = null;
      /*
       * Google sometimes suggests a place whose id it can no longer resolve
       * ("The provided Place ID is no longer valid" - seen for Ludhiana
       * Exhibition & Convention Centre). The suggestion's text is still a good
       * address, so look THAT up with the Geocoder instead of giving up.
       */
      console.warn("[LocationPicker] place details failed, geocoding the text instead", err);
      const placed = await geocodeText(s.full || [s.main, s.secondary].filter(Boolean).join(", "), s.main);
      if (!placed) setError("Google could not load that place. Try another suggestion, or drop the pin on the map.");
    } finally {
      setBusy(false);
    }
  }

  /** Address text -> pin + fields, via the Geocoder. Returns true on success. */
  async function geocodeText(text, name) {
    const geocoder = libsRef.current?.geocoder;
    if (!geocoder || !text) return false;
    try {
      const { results } = await geocoder.geocode({ address: text });
      const best = results?.[0];
      if (!best?.geometry?.location) return false;
      const point = { lat: best.geometry.location.lat(), lng: best.geometry.location.lng() };
      placeMarker(point);
      mapRef.current?.setZoom(16);
      onPickRef.current?.({
        name,
        address: best.formatted_address || text,
        ...parseAddressComponents(best.address_components || []),
        ...point,
        // The Geocoder's id for this address; still blocks the same spot being added twice.
        place_id: best.place_id || "",
      });
      return true;
    } catch {
      return false;
    }
  }

  function onKeyDown(e) {
    if (!open || !suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(suggestions[active >= 0 ? active : 0]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={className}>
      <div className="relative">
        <label htmlFor="centre-map-search" className="sr-only">
          Search for the exhibition centre on Google Maps
        </label>
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          id="centre-map-search"
          type="search"
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls="centre-map-suggestions"
          aria-autocomplete="list"
          autoComplete="off"
          disabled={status !== "ready"}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setError("");
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder={status === "ready" ? "Search the venue, e.g. Bharat Mandapam, New Delhi" : "Loading Google Maps…"}
          className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-9 pr-10 text-sm text-gray-900 outline-none focus:border-[#131C55] focus:ring-2 focus:ring-[#131C55]/15 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        {busy ? <Loader2 size={16} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" /> : null}

        {open && suggestions.length ? (
          <ul
            id="centre-map-suggestions"
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-900"
          >
            {suggestions.map((s, i) => (
              <li key={`${s.main}-${i}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(s)}
                  className={`flex w-full items-start gap-2.5 px-3 py-2 text-left text-sm ${i === active ? "bg-gray-100 dark:bg-white/10" : "hover:bg-gray-50 dark:hover:bg-white/5"}`}
                >
                  <MapPin size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-gray-400" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-gray-900 dark:text-white">{s.main}</span>
                    {s.secondary ? <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{s.secondary}</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="relative mt-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800">
        <div ref={mapEl} className="h-72 w-full sm:h-80" />
        {status !== "ready" ? (
          // Opaque, so Google's own "Oops! Something went wrong" box underneath
          // never shows through and doubles up with this message.
          <div className="absolute inset-0 z-10 grid place-items-center bg-gray-100 p-6 text-center text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {status === "loading" ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Loading Google Maps…
              </span>
            ) : (
              <span role="alert">{error}</span>
            )}
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Search the venue, or click the map / drag the pin to the right spot. The fields below fill in from Google; you can correct any of them.
      </p>
      {status === "ready" && error ? (
        <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
