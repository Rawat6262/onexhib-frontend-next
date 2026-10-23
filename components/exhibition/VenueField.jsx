"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Check, Landmark, Loader2, MapPin, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { createMyCentre, refreshCentrePages, searchCentres } from "@/models/exhibitionCentre.model";

const LocationPicker = dynamic(() => import("@/components/maps/LocationPicker"), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />,
});

/**
 * The exhibition form's "Venue Name" field.
 *
 * Type, and matching exhibition centres drop down (name, city, country).
 * Picking one fills the venue, address, country, state and city in the form
 * and links the show to that centre (onSelectCentre).
 *
 * Not listed? "Add new venue" opens the Google Maps picker inside the form:
 * the picked place fills the same fields (onUseLocation). For organisers and
 * admins (canCreate) it is also saved as a new exhibition centre and linked,
 * so the next show at that venue can simply pick it. The centre is recorded as
 * the organiser's own, which they can then edit under Exhibition centres.
 *
 * Typing over a picked centre's name unlinks it - the text no longer names it.
 */
const MIN_CHARS = 2;

export default function VenueField({
  id = "venue",
  value,
  onChange,
  centre, // { id, name, city, country } | null
  onSelectCentre,
  onClearCentre,
  onUseLocation,
  canCreate = false,
  error,
  onBlur,
}) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [adding, setAdding] = useState(false);
  const abortRef = useRef(null);

  // Search centres as the venue is typed (not while a centre is linked).
  useEffect(() => {
    const q = String(value || "").trim();
    if (centre || q.length < MIN_CHARS) {
      setResults([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const { data } = await searchCentres(q, controller.signal);
        setResults((data?.items || []).slice(0, 8));
        setActive(-1);
      } catch (err) {
        if (err?.name !== "CanceledError") setResults([]);
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [value, centre]);

  const typed = String(value || "").trim();
  const exact = results.some((r) => r.name.trim().toLowerCase() === typed.toLowerCase());
  const options = [
    ...results.map((r) => ({ kind: "centre", centre: r })),
    ...(typed.length >= MIN_CHARS && !exact ? [{ kind: "add" }] : []),
  ];

  const pick = (option) => {
    setOpen(false);
    if (option.kind === "add") {
      setAdding(true);
      return;
    }
    onSelectCentre?.(option.centre);
  };

  const onKeyDown = (e) => {
    if (!open || !options.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(options[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="w-full">
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold tracking-wide text-gray-900 dark:text-gray-100">
        Venue Name <span className="text-base text-red-600">*</span>
      </label>

      <div className="relative">
        <input
          id={id}
          name={id}
          type="text"
          role="combobox"
          aria-expanded={open && options.length > 0}
          aria-controls={`${id}-options`}
          aria-autocomplete="list"
          aria-invalid={!!error}
          autoComplete="off"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (centre) onClearCentre?.();
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setTimeout(() => setOpen(false), 150);
            onBlur?.();
          }}
          onKeyDown={onKeyDown}
          placeholder="Start typing the venue, e.g. Bharat Mandapam"
          className={`w-full rounded-xl border px-4 py-3 pr-10 text-sm text-gray-900 outline-none transition focus:ring-4 dark:bg-gray-800 dark:text-gray-100 ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
              : "border-gray-300 focus:border-[#2B3FB8] focus:ring-[#2B3FB8]/15 dark:border-gray-700"
          }`}
        />
        {loading ? (
          <Loader2 size={16} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
        ) : null}

        {open && options.length ? (
          <ul
            id={`${id}-options`}
            role="listbox"
            className="absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-900"
          >
            {options.map((option, i) => (
              <li key={option.kind === "add" ? "__add" : option.centre._id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(option)}
                  className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm ${i === active ? "bg-gray-100 dark:bg-white/10" : "hover:bg-gray-50 dark:hover:bg-white/5"}`}
                >
                  {option.kind === "add" ? (
                    <>
                      <Plus size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-[#2B3FB8] dark:text-blue-300" />
                      <span className="min-w-0">
                        <span className="block font-semibold text-[#2B3FB8] dark:text-blue-300">Add new venue “{typed}”</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          Find it on Google Maps to fill the address{canCreate ? " and add it to Exhibition centres" : ""}
                        </span>
                      </span>
                    </>
                  ) : (
                    <>
                      <Landmark size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-gray-400" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-gray-900 dark:text-white">{option.centre.name}</span>
                        <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                          {[option.centre.city, option.centre.state, option.centre.country].filter(Boolean).join(", ")}
                        </span>
                      </span>
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : centre ? (
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <Check size={13} aria-hidden="true" /> Linked to the exhibition centre “{centre.name}”. Address and location are filled in.
          <button type="button" onClick={onClearCentre} className="ml-1 underline underline-offset-2 hover:text-emerald-900 dark:hover:text-emerald-300">
            Unlink
          </button>
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Pick a listed exhibition centre, or add a new venue from Google Maps.</p>
      )}

      {adding ? (
        <NewVenuePanel
          initialQuery={typed}
          canCreate={canCreate}
          onCancel={() => setAdding(false)}
          onDone={(result) => {
            setAdding(false);
            onUseLocation?.(result.location);
            if (result.centre) onSelectCentre?.(result.centre);
          }}
        />
      ) : null}
    </div>
  );
}

/** The inline "Add new venue" panel: the map picker, then "Use this venue". */
function NewVenuePanel({ initialQuery, canCreate, onCancel, onDone }) {
  const [place, setPlace] = useState(null);
  const [addToDirectory, setAddToDirectory] = useState(true);
  const [saving, setSaving] = useState(false);

  const use = async () => {
    if (!place?.lat) return;
    const location = {
      name: place.name || initialQuery,
      address: place.address || "",
      country: place.country || "",
      state: place.state || "",
      city: place.city || "",
    };
    if (!(canCreate && addToDirectory)) {
      onDone({ location });
      return;
    }
    setSaving(true);
    try {
      const { data } = await createMyCentre({
        name: location.name,
        address: location.address,
        city: location.city,
        state: location.state,
        country: location.country,
        postal_code: place.postal_code || "",
        lat: place.lat,
        lng: place.lng,
        place_id: place.place_id || "",
      });
      refreshCentrePages();
      toast.success(`"${data.centre.name}" added to Exhibition centres.`);
      onDone({ location, centre: data.centre });
    } catch (err) {
      const existing = err?.response?.data?.existing;
      if (err?.response?.status === 409 && existing) {
        // Already listed: link to the existing centre instead of failing.
        toast.info(`"${existing.name}" is already an exhibition centre; linked to it.`);
        onDone({ location, centre: { ...existing, name: existing.name, address: location.address, city: location.city, state: location.state, country: location.country } });
      } else {
        toast.error(err?.response?.data?.message || "Could not add the venue. You can still use the address below.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-[#2B3FB8]/20 bg-[#2B3FB8]/[0.03] p-4 dark:border-blue-400/20 dark:bg-blue-400/[0.04]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
          <MapPin size={16} aria-hidden="true" className="text-[#2B3FB8] dark:text-blue-300" /> Find the venue on Google Maps
        </p>
        <button type="button" onClick={onCancel} aria-label="Close" className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10">
          <X size={16} />
        </button>
      </div>

      <LocationPicker initialQuery={initialQuery} value={place?.lat ? { lat: place.lat, lng: place.lng } : null} onPick={(p) => setPlace((prev) => ({ ...prev, ...p }))} />

      {place?.lat ? (
        <div className="mt-3 rounded-xl bg-white p-3 text-sm dark:bg-gray-900">
          <p className="font-semibold text-gray-900 dark:text-white">{place.name || initialQuery}</p>
          <p className="mt-0.5 text-gray-600 dark:text-gray-400">{place.address}</p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {canCreate ? (
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={addToDirectory} onChange={(e) => setAddToDirectory(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            Also add to Exhibition centres
          </label>
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400">The address, country, state and city will be filled in for you.</span>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            Cancel
          </button>
          <button
            type="button"
            onClick={use}
            disabled={!place?.lat || saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#131C55] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0E1B6B] disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : null}
            Use this venue
          </button>
        </div>
      </div>
    </div>
  );
}
