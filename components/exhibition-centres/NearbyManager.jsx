"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BedDouble, Hospital, Loader2, Plane, RefreshCw, Trash2, UtensilsCrossed } from "lucide-react";

import { refreshCentreNearby, refreshCentrePages, removeCentreNearby } from "@/models/exhibitionCentre.model";
import { btnRowDanger, btnSecondary, fmtDate } from "@/components/admin/AdminUI";

/**
 * Admin: the places stored "around the venue" for one centre, from
 * OpenStreetMap (Onexhib_backend/Service/nearbyPlaces.js).
 *
 * They are fetched automatically when a centre is created or moved. Here an
 * admin can take out a wrong one - it stays out of every later refresh - or
 * fetch the lot again. A refresh runs on the server in the background and can
 * take a minute or two (Overpass is a shared, often busy service), so the
 * panel says so instead of waiting.
 */
const CATEGORIES = [
  { key: "airports", label: "Airports", icon: Plane },
  { key: "hotels", label: "Hotels", icon: BedDouble },
  { key: "restaurants", label: "Restaurants", icon: UtensilsCrossed },
  { key: "hospitals", label: "Hospitals", icon: Hospital },
];

const errMsg = (err, fallback) => err?.response?.data?.message || fallback;

export default function NearbyManager({ centre, onChanged }) {
  const [nearby, setNearby] = useState(centre.nearby || null);
  const [busy, setBusy] = useState(null); // "refresh" or an osm_id
  const [refreshNote, setRefreshNote] = useState("");

  const refresh = async () => {
    setBusy("refresh");
    try {
      const { data } = await refreshCentreNearby(centre._id);
      setRefreshNote(data?.message || "Refreshing in the background.");
    } catch (err) {
      toast.error(errMsg(err, "The refresh could not be started."));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (category, place) => {
    setBusy(place.osm_id);
    try {
      const { data } = await removeCentreNearby(centre._id, category, place.osm_id);
      setNearby(data.nearby);
      onChanged?.(data.nearby);
      refreshCentrePages();
      toast.success(`Removed ${place.name}. It will not come back on a refresh.`);
    } catch (err) {
      toast.error(errMsg(err, "That place could not be removed."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">Around the venue</p>
        <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{centre.name}</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {nearby?.fetched_at
            ? `From OpenStreetMap, last fetched ${fmtDate(nearby.fetched_at)}.`
            : "Not fetched yet. New and moved centres are fetched automatically a minute or two after saving."}{" "}
          Shown on this centre&rsquo;s page and on every exhibition held here.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className={btnSecondary} onClick={refresh} disabled={busy === "refresh"}>
            {busy === "refresh" ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={15} aria-hidden="true" />}
            Refresh from OpenStreetMap
          </button>
          {refreshNote ? <p className="text-sm text-gray-600 dark:text-gray-400" role="status">{refreshNote}</p> : null}
        </div>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {CATEGORIES.map(({ key, label, icon: Icon }) => {
          const places = nearby?.[key] || [];
          return (
            <section key={key} className="px-6 py-4" aria-labelledby={`nearby-admin-${key}`}>
              <h3 id={`nearby-admin-${key}`} className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                <Icon size={15} aria-hidden="true" className="text-gray-400" />
                {label}
                <span className="font-normal text-gray-400">{places.length}</span>
              </h3>
              {places.length ? (
                <ul className="mt-2 list-none space-y-1">
                  {places.map((p) => (
                    <li key={p.osm_id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-gray-900 dark:text-gray-100">
                          {p.name}
                          {p.code ? <span className="ml-1.5 text-xs font-semibold text-gray-500">{p.code}</span> : null}
                          {p.stars ? <span className="ml-1.5 text-xs text-gray-500">{p.stars}★</span> : null}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {p.km} km
                          {p.cuisine ? ` · ${p.cuisine}` : ""}
                          {p.emergency ? " · emergency" : ""}
                          {" · "}
                          <a
                            href={`https://www.openstreetmap.org/${{ n: "node", w: "way", r: "relation" }[p.osm_id[0]]}/${p.osm_id.slice(1)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            on OSM
                          </a>
                        </p>
                      </div>
                      <button
                        type="button"
                        className={btnRowDanger}
                        onClick={() => remove(key, p)}
                        disabled={busy === p.osm_id}
                        aria-label={`Remove ${p.name}`}
                      >
                        {busy === p.osm_id ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Trash2 size={14} aria-hidden="true" />}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">None stored.</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
