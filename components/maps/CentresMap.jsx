"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { MAP_ID, loadGoogleMaps, onMapsAuthFailure } from "@/lib/google-maps";

/**
 * A read-only map of one or more exhibition centres, for the public pages.
 *
 * points: [{ id, name, lat, lng, href?, subtitle? }]
 *   one point  -> centred on it at street level
 *   many       -> fitted to show them all; a pin opens a card linking to its page
 *
 * LOADED ONLY WHEN SCROLLED INTO VIEW. Google bills per map load, and most
 * visitors to a long page never reach the map; an IntersectionObserver means
 * they never cost one. The card links are real <a> elements so a pin's page is
 * reachable by keyboard from the list beside the map as well.
 */
// `framed` draws the rounded border; turn it off when a parent card supplies the frame.
export default function CentresMap({ points = [], className = "h-80", label = "Map of exhibition centres", framed = true }) {
  const el = useRef(null);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [error, setError] = useState("");

  useEffect(() => {
    const node = el.current;
    if (!node) return undefined;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return undefined;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        io.disconnect();
      }
    }, { rootMargin: "200px" });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !points.length) return undefined;
    let cancelled = false;
    setStatus("loading");
    const off = onMapsAuthFailure(() => {
      setStatus("error");
      setError("The map could not be shown.");
    });

    (async () => {
      try {
        const maps = await loadGoogleMaps();
        const [{ Map, InfoWindow }, { AdvancedMarkerElement }, { LatLngBounds }] = await Promise.all([
          maps.importLibrary("maps"),
          maps.importLibrary("marker"),
          maps.importLibrary("core"),
        ]);
        if (cancelled || !el.current) return;
        const valid = points.filter((p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)));
        const first = valid[0];
        const map = new Map(el.current, {
          center: first ? { lat: Number(first.lat), lng: Number(first.lng) } : { lat: 20, lng: 0 },
          zoom: valid.length === 1 ? 15 : 3,
          mapId: MAP_ID,
          streetViewControl: false,
          mapTypeControl: false,
          gestureHandling: "cooperative",
        });
        const info = new InfoWindow();
        const bounds = new LatLngBounds();
        for (const p of valid) {
          const position = { lat: Number(p.lat), lng: Number(p.lng) };
          bounds.extend(position);
          const marker = new AdvancedMarkerElement({ map, position, title: p.name });
          if (valid.length > 1) {
            marker.addListener("click", () => {
              const box = document.createElement("div");
              box.style.cssText = "font:500 13px/1.4 system-ui,sans-serif;max-width:220px;color:#111827";
              const title = document.createElement(p.href ? "a" : "strong");
              title.textContent = p.name;
              if (p.href) {
                title.href = p.href;
                title.style.cssText = "color:#131C55;font-weight:600;text-decoration:underline";
              }
              box.appendChild(title);
              if (p.subtitle) {
                const sub = document.createElement("div");
                sub.textContent = p.subtitle;
                sub.style.cssText = "color:#6b7280;margin-top:2px";
                box.appendChild(sub);
              }
              info.setContent(box);
              info.open({ map, anchor: marker });
            });
          }
        }
        if (valid.length > 1) map.fitBounds(bounds, 48);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        // Google's own messages ("Cannot read properties of undefined") mean
        // nothing to a visitor; the browser console keeps the detail.
        console.warn("[CentresMap]", err);
        setError("The map could not be shown right now.");
      }
    })();

    return () => {
      cancelled = true;
      off();
    };
  }, [visible, points]);

  if (!points.length) return null;

  return (
    <div className={`relative overflow-hidden bg-gray-100 dark:bg-gray-800 ${framed ? "rounded-2xl border border-gray-200 dark:border-gray-800" : ""} ${className}`}>
      <div ref={el} role="region" aria-label={label} className="h-full w-full" />
      {status !== "ready" ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-gray-100 p-6 text-center text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {status === "error" ? (
            <span>{error}</span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Loading map…
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
