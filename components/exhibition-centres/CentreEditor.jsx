"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Building, Globe, ImagePlus, Landmark, Link2Off, Loader2, Mail, MapPin, Phone, Plane, Ruler, TrainFront, X } from "lucide-react";

import { refreshCentrePages } from "@/models/exhibitionCentre.model";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { adminInput, btnPrimary, btnRow, btnSecondary, fmtDate } from "@/components/admin/AdminUI";

// The map picker pulls in Google Maps; load it only when the editor opens.
const LocationPicker = dynamic(() => import("@/components/maps/LocationPicker"), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />,
});

/**
 * The exhibition centre editor, shown in a Sheet by the admin console and by
 * the organiser dashboard.
 *
 * One map picker plus a form: searching the venue (or dropping a pin) fills
 * the address, city, state, country, PIN and coordinates from Google; every
 * field stays editable before saving.
 *
 * `editor`  { mode: "create" | "edit", centre?, from? } - `from` is an admin venue
 *           suggestion whose shows are linked on save.
 * `api`     { create, update, getLinked?, unlink? } - the admin or organiser
 *           endpoints. Without getLinked the "Linked exhibitions" card is hidden.
 * `onSaved` gets the saved centre. The public centre pages are refreshed here.
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
  website: "",
  phone: "",
  email: "",
  halls: "",
  area_sqm: "",
  description: "",
  nearest_airport: "",
  nearest_station: "",
};

const errMsg = (err, fallback) => err?.response?.data?.message || fallback;

export default function CentreEditor({ editor, api, onSaved, onCancel }) {
  const editing = editor.mode === "edit";
  const source = editor.from;
  const [form, setForm] = useState(() => {
    if (editing) {
      const c = editor.centre;
      return {
        ...EMPTY,
        ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, c[k] ?? ""])),
        lat: c.location?.lat ?? "",
        lng: c.location?.lng ?? "",
        halls: c.halls ?? "",
        area_sqm: c.area_sqm ?? "",
      };
    }
    if (source) return { ...EMPTY, name: source.venue, city: source.city, state: source.state, country: source.country };
    return { ...EMPTY };
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(editing ? editor.centre.photo?.url || "" : "");
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [linked, setLinked] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Linked shows are an admin view (it lists other organisers' shows).
  const showLinked = editing && Boolean(api.getLinked);

  useEffect(() => {
    if (!showLinked) return;
    api.getLinked(editor.centre._id)
      .then(({ data }) => setLinked(data.items || []))
      .catch(() => setLinked([]));
  }, [showLinked, api, editor]);

  useEffect(() => () => {
    if (photoPreview && photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  // Google's answer fills the location fields; the name only when Google has one
  // (a searched place), since a dropped pin has no name.
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

  const choosePhoto = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please choose a JPG, PNG or WebP photo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("That photo is larger than 5 MB.");
      return;
    }
    setPhoto(file);
    setRemovePhoto(false);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const save = async (e) => {
    e.preventDefault();
    for (const [key, label] of [["name", "Name"], ["address", "Address"], ["city", "City"], ["country", "Country"]]) {
      if (!String(form[key]).trim()) return setFormError(`${label} is required.`);
    }
    if (form.lat === "" || form.lng === "") return setFormError("Pick the centre on the map so it has a location.");
    setSaving(true);
    setFormError("");
    try {
      const body = { ...form };
      if (editing && removePhoto && !photo) body.remove_photo = "true";
      if (!editing && source) {
        body.link_venue = source.venue;
        body.link_city = source.city;
        body.link_country = source.country;
      }
      const { data } = editing ? await api.update(editor.centre._id, body, photo) : await api.create(body, photo);
      toast.success(
        editing
          ? "Exhibition centre updated."
          : data.linked
            ? `Centre added and linked to ${data.linked} exhibition${data.linked === 1 ? "" : "s"}.`
            : "Exhibition centre added."
      );
      refreshCentrePages();
      onSaved(data?.centre);
    } catch (err) {
      setFormError(errMsg(err, "Could not save the centre."));
    } finally {
      setSaving(false);
    }
  };

  const unlink = async (exhibition) => {
    try {
      await api.unlink(editor.centre._id, [exhibition._id]);
      setLinked((list) => list.filter((x) => x._id !== exhibition._id));
      refreshCentrePages();
      toast.success("Exhibition unlinked.");
    } catch (err) {
      toast.error(errMsg(err, "Could not unlink the exhibition."));
    }
  };

  const placed = form.lat !== "" && form.lng !== "";
  const [dragOver, setDragOver] = useState(false);

  const field = (key, label, { icon: Icon, suffix, hint, className = "", ...props } = {}) => (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</span>
      <span className="relative block">
        {Icon ? <Icon size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /> : null}
        <input value={form[key]} onChange={set(key)} className={`${adminInput} ${Icon ? "pl-9" : ""} ${suffix ? "pr-14" : ""}`} {...props} />
        {suffix ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">{suffix}</span> : null}
      </span>
      {hint ? <span className="mt-1 block text-[11px] text-gray-500 dark:text-gray-400">{hint}</span> : null}
    </label>
  );

  const onDropPhoto = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) choosePhoto({ target: { files: [file], value: "" } });
  };

  return (
    <form onSubmit={save} className="flex min-h-full flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header: what this is, where the data comes from */}
      <SheetHeader className="relative overflow-hidden bg-gradient-to-br from-[#131C55] via-[#1B2A7A] to-[#2B3FB8] px-6 pb-6 pt-7 text-white">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            <Landmark size={22} />
          </span>
          <div className="min-w-0">
            <SheetTitle className="text-xl font-bold text-white">{editing ? editor.centre.name : "Add exhibition centre"}</SheetTitle>
            <SheetDescription className="mt-1 text-sm leading-relaxed text-blue-100/90">
              {source
                ? `From "${source.venue}" · ${source.count} show${source.count === 1 ? "" : "s"} will be linked on save.`
                : editing
                  ? "Update the venue's location, details and photo."
                  : "Find the venue on Google Maps - the address fills in automatically."}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="flex-1 space-y-5 px-4 py-5 sm:px-6">
        {/* 1. Location */}
        <EditorCard
          step="1"
          title="Location"
          aside={
            placed ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {form.place_id ? "Google place" : "Pinned"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Not placed yet
              </span>
            )
          }
        >
          <LocationPicker
            value={placed ? { lat: form.lat, lng: form.lng } : null}
            initialQuery={source ? [source.venue, source.city].filter(Boolean).join(", ") : ""}
            onPick={onPick}
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {field("name", "Centre name *", { icon: Landmark, required: true, maxLength: 160, className: "sm:col-span-2" })}
            {field("address", "Full address *", { icon: MapPin, required: true, maxLength: 400, className: "sm:col-span-2" })}
            {field("city", "City *", { required: true, maxLength: 100, hint: "Google sometimes gives the local town - use the city people know." })}
            {field("state", "State / region", { maxLength: 100 })}
            {field("country", "Country *", { required: true, maxLength: 100 })}
            {field("postal_code", "PIN / postal code", { maxLength: 20 })}
          </div>
          {placed ? (
            <p className="mt-3 text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
              {Number(form.lat).toFixed(5)}, {Number(form.lng).toFixed(5)}
            </p>
          ) : null}
        </EditorCard>

        {/* 2. Contact & size */}
        <EditorCard step="2" title="Contact & size" subtitle="Optional - shown on the centre's public page.">
          <div className="grid gap-4 sm:grid-cols-2">
            {field("website", "Website", { icon: Globe, type: "url", placeholder: "https://", maxLength: 300, className: "sm:col-span-2" })}
            {field("phone", "Phone", { icon: Phone, type: "tel", maxLength: 40 })}
            {field("email", "Email", { icon: Mail, type: "email", maxLength: 160 })}
            {field("halls", "Halls", { icon: Building, inputMode: "numeric", placeholder: "12", suffix: "halls" })}
            {field("area_sqm", "Exhibition area", { icon: Ruler, inputMode: "numeric", placeholder: "120000", suffix: "sq m" })}
          </div>
        </EditorCard>

        {/* 3. About & getting there */}
        <EditorCard step="3" title="About & getting there">
          <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
              Description
              <span className="font-normal tabular-nums text-gray-400">{form.description.length} / 2000</span>
            </span>
            <textarea
              value={form.description}
              onChange={set("description")}
              rows={4}
              maxLength={2000}
              placeholder="What the venue is known for, its halls, facilities…"
              className={`${adminInput} h-auto py-2.5`}
            />
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {field("nearest_airport", "Nearest airport", { icon: Plane, maxLength: 160, placeholder: "e.g. Kempegowda Intl (35 km)" })}
            {field("nearest_station", "Nearest metro / railway", { icon: TrainFront, maxLength: 160, placeholder: "e.g. Madavara metro" })}
          </div>
        </EditorCard>

        {/* 4. Photo */}
        <EditorCard step="4" title="Photo" subtitle="A wide photo of the building works best.">
          {photoPreview && !removePhoto ? (
            <div className="relative overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element -- a blob: or Cloudinary preview */}
              <img src={photoPreview} alt="" className="aspect-[16/8] w-full object-cover" />
              <div className="absolute bottom-3 right-3 flex gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-[13px] font-semibold text-gray-800 shadow hover:bg-white">
                  <ImagePlus size={14} aria-hidden="true" /> Replace
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} className="sr-only" />
                </label>
                <button
                  type="button"
                  onClick={() => { setPhoto(null); setRemovePhoto(true); }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-[13px] font-semibold text-red-600 shadow hover:bg-white"
                >
                  <X size={14} aria-hidden="true" /> Remove
                </button>
              </div>
            </div>
          ) : (
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDropPhoto}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition motion-reduce:transition-none ${
                dragOver
                  ? "border-[#2B3FB8] bg-[#2B3FB8]/5"
                  : "border-gray-300 bg-gray-50 hover:border-[#2B3FB8]/60 dark:border-gray-700 dark:bg-gray-900"
              }`}
            >
              <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-full bg-[#2B3FB8]/10 text-[#2B3FB8] dark:bg-blue-400/15 dark:text-blue-300">
                <ImagePlus size={20} />
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Drop a photo here, or click to upload</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">JPG, PNG or WebP · up to 5 MB</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} className="sr-only" />
            </label>
          )}
        </EditorCard>

        {showLinked ? (
          <EditorCard step="5" title="Linked exhibitions" subtitle={linked ? `${linked.length} show${linked.length === 1 ? "" : "s"} held here` : undefined}>
            {!linked ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : !linked.length ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">None yet. Link shows from the "From your exhibitions" tab, or pick this centre in an exhibition's Venue field.</p>
            ) : (
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
                {linked.map((x) => (
                  <li key={x._id} className="flex items-center justify-between gap-3 bg-white px-4 py-2.5 text-sm dark:bg-gray-900">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-gray-900 dark:text-white">{x.exhibition_name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(x.starting_date)}</span>
                    </span>
                    <button type="button" className={btnRow} onClick={() => unlink(x)}>
                      <Link2Off size={14} aria-hidden="true" /> Unlink
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </EditorCard>
        ) : null}
      </div>

      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-gray-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 dark:border-gray-800 dark:bg-gray-950/95">
        <p role="alert" className="min-w-0 text-sm text-red-600 dark:text-red-400">{formError}</p>
        <div className="flex shrink-0 gap-2">
          <button type="button" className={btnSecondary} onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
            {editing ? "Save changes" : "Add centre"}
          </button>
        </div>
      </div>
    </form>
  );
}

/** One numbered card in the centre editor. */
function EditorCard({ step, title, subtitle, aside, children }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#131C55] text-xs font-bold text-white dark:bg-blue-500">
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

