"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { BedDouble, Clock, Globe, ImagePlus, Loader2, Mail, MapPin, Phone, Star, X } from "lucide-react";

import { createHotel, refreshHotelPages, updateHotel } from "@/models/hotel.model";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { adminInput, adminSelect, btnPrimary, btnSecondary } from "@/components/admin/AdminUI";
import { AMENITIES, CURRENCIES, MAX_PHOTOS } from "@/lib/hotels";

// The map picker pulls in Google Maps; load it only when the editor opens.
const LocationPicker = dynamic(() => import("@/components/maps/LocationPicker"), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />,
});

/**
 * The hotel editor, in a Sheet on the hotel dashboard (app/hotel).
 *
 * Same shape as the exhibition centre editor: find the hotel on Google Maps
 * (or drop a pin) and the address fills in; every field stays editable.
 * Then details, amenities, contact and up to six photos.
 *
 * `hotel` is the hotel being edited, or null to add one. `onSaved` gets the
 * saved hotel. Saving a renamed or moved live hotel puts it back in review -
 * the backend decides that and says so in its message, which is shown as is.
 */

const EMPTY = {
  name: "",
  address: "",
  city: "",
  state: "",
  country: "",
  postal_code: "",
  lat: "",
  lng: "",
  place_id: "",
  description: "",
  stars: "",
  rooms: "",
  price_from: "",
  currency: "INR",
  check_in: "14:00",
  check_out: "12:00",
  website: "",
  phone: "",
  email: "",
};

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const errMsg = (err, fallback) => err?.response?.data?.message || fallback;

export default function HotelEditor({ hotel, onSaved, onCancel }) {
  const editing = Boolean(hotel);
  const [form, setForm] = useState(() =>
    editing
      ? {
          ...EMPTY,
          ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, hotel[k] ?? EMPTY[k]])),
          lat: hotel.location?.lat ?? "",
          lng: hotel.location?.lng ?? "",
        }
      : { ...EMPTY }
  );
  const [amenities, setAmenities] = useState(() => new Set(editing ? hotel.amenities || [] : []));
  const [kept, setKept] = useState(() => (editing ? hotel.photos || [] : []));
  const [added, setAdded] = useState([]); // [{ file, preview }]
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => () => added.forEach((a) => URL.revokeObjectURL(a.preview)), [added]);

  const onPick = (p) => {
    setForm((f) => {
      const next = { ...f, lat: p.lat ?? f.lat, lng: p.lng ?? f.lng, place_id: p.place_id ?? f.place_id };
      for (const key of ["name", "address", "city", "state", "country", "postal_code"]) {
        if (p[key]) next[key] = p[key];
      }
      return next;
    });
    setFormError("");
  };

  const addPhotos = (files) => {
    const room = MAX_PHOTOS - kept.length - added.length;
    const list = Array.from(files || []);
    if (list.length > room) toast.error(`A hotel can have ${MAX_PHOTOS} photos. ${room ? `Only the first ${room} were added.` : "Remove one first."}`);
    const ok = [];
    for (const file of list.slice(0, Math.max(0, room))) {
      if (!PHOTO_TYPES.includes(file.type)) { toast.error(`${file.name}: please use JPG, PNG or WebP.`); continue; }
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} is larger than 5 MB.`); continue; }
      ok.push({ file, preview: URL.createObjectURL(file) });
    }
    if (ok.length) setAdded((a) => [...a, ...ok]);
  };

  const toggleAmenity = (key) =>
    setAmenities((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const save = async (e) => {
    e.preventDefault();
    for (const [key, label] of [["name", "Hotel name"], ["address", "Address"], ["city", "City"], ["country", "Country"]]) {
      if (!String(form[key]).trim()) return setFormError(`${label} is required.`);
    }
    if (form.lat === "" || form.lng === "") return setFormError("Pick the hotel on the map so it has a location.");
    setSaving(true);
    setFormError("");
    try {
      const body = { ...form, amenities: [...amenities] };
      const photos = added.map((a) => a.file);
      const removed = editing ? (hotel.photos || []).filter((p) => !kept.some((k) => k._id === p._id)).map((p) => p._id) : [];
      const { data } = editing ? await updateHotel(hotel._id, body, photos, removed) : await createHotel(body, photos);
      toast.success(data?.message || "Hotel saved.");
      refreshHotelPages();
      onSaved(data?.hotel);
    } catch (err) {
      setFormError(errMsg(err, "Could not save the hotel."));
    } finally {
      setSaving(false);
    }
  };

  const placed = form.lat !== "" && form.lng !== "";
  const photoCount = kept.length + added.length;

  const field = (key, label, { icon: Icon, hint, className = "", ...props } = {}) => (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</span>
      <span className="relative block">
        {Icon ? <Icon size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /> : null}
        <input value={form[key]} onChange={set(key)} className={`${adminInput} ${Icon ? "pl-9" : ""}`} {...props} />
      </span>
      {hint ? <span className="mt-1 block text-[11px] text-gray-500 dark:text-gray-400">{hint}</span> : null}
    </label>
  );

  return (
    <form onSubmit={save} className="flex min-h-full flex-col bg-gray-50 dark:bg-gray-950">
      <SheetHeader className="relative overflow-hidden bg-gradient-to-br from-ox-navy via-ox-royal to-ox-blue px-6 pb-6 pt-7 text-white">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            <BedDouble size={22} />
          </span>
          <div className="min-w-0">
            <SheetTitle className="text-xl font-bold text-white">{editing ? hotel.name : "Add a hotel"}</SheetTitle>
            <SheetDescription className="mt-1 text-sm leading-relaxed text-blue-100/90">
              {editing
                ? "Changing the name or location of a live hotel sends it back for a quick review."
                : "Find your hotel on Google Maps - the address fills in. It goes live once the OneXhib team approves it."}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="flex-1 space-y-5 px-4 py-5 sm:px-6">
        {/* 1. Location */}
        <EditorCard
          step="1"
          title="Location"
          subtitle="Visitors see your hotel beside the exhibition venues within 10 km."
          aside={
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                placed
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30"
                  : "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30"
              }`}
            >
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${placed ? "bg-emerald-500" : "bg-amber-500"}`} />
              {placed ? (form.place_id ? "Google place" : "Pinned") : "Not placed yet"}
            </span>
          }
        >
          <LocationPicker value={placed ? { lat: form.lat, lng: form.lng } : null} onPick={onPick} />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {field("name", "Hotel name *", { icon: BedDouble, required: true, maxLength: 160, className: "sm:col-span-2" })}
            {field("address", "Full address *", { icon: MapPin, required: true, maxLength: 400, className: "sm:col-span-2" })}
            {field("city", "City *", { required: true, maxLength: 100 })}
            {field("state", "State / region", { maxLength: 100 })}
            {field("country", "Country *", { required: true, maxLength: 100 })}
            {field("postal_code", "PIN / postal code", { maxLength: 20 })}
          </div>
        </EditorCard>

        {/* 2. About */}
        <EditorCard step="2" title="About the hotel">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">Star rating</span>
              <span className="relative block">
                <Star size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select value={form.stars} onChange={set("stars")} className={`${adminSelect} pl-9`}>
                  <option value="">Not rated</option>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{n} star{n === 1 ? "" : "s"}</option>
                  ))}
                </select>
              </span>
            </label>
            {field("rooms", "Rooms", { inputMode: "numeric", placeholder: "120" })}
            <div className="grid grid-cols-[1fr_auto] gap-2">
              {field("price_from", "Rates from (per night)", { inputMode: "numeric", placeholder: "4500" })}
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <span className="sr-only">Currency</span>&nbsp;
                </span>
                <select value={form.currency} onChange={set("currency")} aria-label="Currency" className={`${adminSelect} w-24`}>
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
            </div>
            {field("check_in", "Check-in", { icon: Clock, type: "time" })}
            {field("check_out", "Check-out", { icon: Clock, type: "time" })}
          </div>
          <label className="mt-4 block">
            <span className="mb-1.5 flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
              Description
              <span className="font-normal tabular-nums text-gray-400">{form.description.length} / 3000</span>
            </span>
            <textarea
              value={form.description}
              onChange={set("description")}
              rows={4}
              maxLength={3000}
              placeholder="Rooms, distance to the venue, what exhibitors and visitors like about staying here…"
              className={`${adminInput} h-auto py-2.5`}
            />
          </label>
        </EditorCard>

        {/* 3. Amenities */}
        <EditorCard step="3" title="Amenities" subtitle={`${amenities.size} selected`}>
          <div className="grid gap-2 sm:grid-cols-2">
            {AMENITIES.map(({ key, label, icon: Icon }) => {
              const on = amenities.has(key);
              return (
                <label
                  key={key}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition motion-reduce:transition-none ${
                    on
                      ? "border-ox-blue bg-ox-blue/[0.06] text-gray-900 dark:border-blue-400 dark:bg-blue-400/10 dark:text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                  }`}
                >
                  <input type="checkbox" checked={on} onChange={() => toggleAmenity(key)} className="size-4 accent-ox-blue" />
                  <Icon size={16} aria-hidden="true" className={on ? "text-ox-blue dark:text-blue-300" : "text-gray-400"} />
                  {label}
                </label>
              );
            })}
          </div>
        </EditorCard>

        {/* 4. Contact */}
        <EditorCard step="4" title="Contact" subtitle="Booking enquiries from visitors are emailed to this address.">
          <div className="grid gap-4 sm:grid-cols-2">
            {field("website", "Website / booking page", { icon: Globe, type: "url", placeholder: "https://", maxLength: 300, className: "sm:col-span-2" })}
            {field("phone", "Reservations phone", { icon: Phone, type: "tel", maxLength: 40 })}
            {field("email", "Reservations email", { icon: Mail, type: "email", maxLength: 160, hint: "Left empty, enquiries go to your account email." })}
          </div>
        </EditorCard>

        {/* 5. Photos */}
        <EditorCard step="5" title="Photos" subtitle={`${photoCount} of ${MAX_PHOTOS} · the first one is your cover`}>
          {photoCount ? (
            <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {kept.map((p, i) => (
                <PhotoTile key={p._id} src={p.url} cover={i === 0} onRemove={() => setKept((k) => k.filter((x) => x._id !== p._id))} />
              ))}
              {added.map((a, i) => (
                <PhotoTile
                  key={a.preview}
                  src={a.preview}
                  cover={!kept.length && i === 0}
                  onRemove={() => {
                    URL.revokeObjectURL(a.preview);
                    setAdded((list) => list.filter((x) => x !== a));
                  }}
                />
              ))}
            </ul>
          ) : null}
          {photoCount < MAX_PHOTOS ? (
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addPhotos(e.dataTransfer?.files); }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-7 text-center transition motion-reduce:transition-none ${
                dragOver ? "border-ox-blue bg-ox-blue/5" : "border-gray-300 bg-gray-50 hover:border-ox-blue/60 dark:border-gray-700 dark:bg-gray-900"
              }`}
            >
              <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-full bg-ox-blue/10 text-ox-blue dark:bg-blue-400/15 dark:text-blue-300">
                <ImagePlus size={20} />
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Drop photos here, or click to upload</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">JPG, PNG or WebP · up to 5 MB each</span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }}
                className="sr-only"
              />
            </label>
          ) : null}
        </EditorCard>
      </div>

      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-gray-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 dark:border-gray-800 dark:bg-gray-950/95">
        <p role="alert" className="min-w-0 text-sm text-red-600 dark:text-red-400">{formError}</p>
        <div className="flex shrink-0 gap-2">
          <button type="button" className={btnSecondary} onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
            {editing ? "Save changes" : "Submit for review"}
          </button>
        </div>
      </div>
    </form>
  );
}

function PhotoTile({ src, cover, onRemove }) {
  return (
    <li className="relative overflow-hidden rounded-xl ring-1 ring-gray-200 dark:ring-gray-800">
      {/* eslint-disable-next-line @next/next/no-img-element -- a blob: or Cloudinary preview */}
      <img src={src} alt="" className="aspect-[4/3] w-full object-cover" />
      {cover ? (
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Cover</span>
      ) : null}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove photo"
        className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-white/95 text-red-600 shadow hover:bg-white"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </li>
  );
}

/** One numbered card in the editor (same look as the centre editor's). */
function EditorCard({ step, title, subtitle, aside, children }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ox-navy text-xs font-bold text-white dark:bg-blue-500">
            {step}
          </span>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
            {subtitle ? <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p> : null}
          </div>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
