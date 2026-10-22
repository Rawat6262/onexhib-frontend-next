"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Building, ExternalLink, Globe, ImagePlus, Landmark, Link2Off, Loader2, Mail, MapPin, Pencil, Phone, Plane, Plus, Ruler, TrainFront, Trash2, X } from "lucide-react";

import {
  createCentre,
  deleteCentre,
  getAdminCentres,
  getCentreExhibitions,
  getVenueSuggestions,
  linkCentreExhibitions,
  refreshCentrePages,
  unlinkCentreExhibitions,
  updateCentre,
} from "@/models/exhibitionCentre.model";
import { confirmAction } from "@/lib/confirm";
import { exhibitionCentrePath } from "@/lib/routes";
import TablePagination from "@/components/dashboard/TablePagination";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AdminHeader,
  AdminPage,
  Badge,
  EmptyState,
  ErrorState,
  LoadingRows,
  Monogram,
  Panel,
  SearchField,
  adminInput,
  btnPrimary,
  btnRow,
  btnRowDanger,
  btnSecondary,
  fmtDate,
  tbody,
  td,
  th,
  thead,
  tr,
} from "@/components/admin/AdminUI";

// The map picker pulls in Google Maps; load it only when the editor opens.
const LocationPicker = dynamic(() => import("@/components/maps/LocationPicker"), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />,
});

/**
 * Admin: exhibition centres (venues).
 *
 * Two tabs:
 *   Centres               - what is listed; edit, delete, open the public page.
 *   From your exhibitions - venue names already typed on exhibitions that are
 *                           not linked to a centre, busiest first. "Add as
 *                           centre" opens the editor with the venue pre-searched
 *                           on Google Maps, and on save links every show at that
 *                           venue to the new centre.
 *
 * The editor is one map picker plus a form. Searching the venue (or dropping a
 * pin) fills the address, city, state, country, PIN and coordinates from Google;
 * every field stays editable before saving.
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

const place = (r) => [r.city, r.state, r.country].filter(Boolean).join(", ");
const errMsg = (err, fallback) => err?.response?.data?.message || fallback;

export default function AdminCentresClient() {
  const [tab, setTab] = useState("centres");

  // Centres
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const reqRef = useRef(0);

  // Suggestions
  const [suggestions, setSuggestions] = useState(null);
  // Every centre, for "link this venue spelling to an existing centre".
  const [allCentres, setAllCentres] = useState([]);
  const [suggestionsError, setSuggestionsError] = useState("");
  const [suggestionSearch, setSuggestionSearch] = useState("");

  // Editor
  const [editor, setEditor] = useState(null); // { mode: "create" | "edit", centre?, from? }

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadCentres = useCallback(async () => {
    const id = ++reqRef.current;
    setError("");
    try {
      const { data } = await getAdminCentres({ page, limit: pageSize, ...(search ? { search } : {}) });
      if (id !== reqRef.current) return;
      setRows(data.items || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (err) {
      if (id !== reqRef.current) return;
      setError(errMsg(err, "Could not load exhibition centres."));
    }
  }, [page, pageSize, search]);

  const loadSuggestions = useCallback(async () => {
    setSuggestionsError("");
    try {
      const { data } = await getVenueSuggestions(suggestionSearch.trim() ? { search: suggestionSearch.trim() } : {});
      setSuggestions(data.items || []);
    } catch (err) {
      setSuggestionsError(errMsg(err, "Could not load venues from your exhibitions."));
    }
  }, [suggestionSearch]);

  useEffect(() => {
    loadCentres();
  }, [loadCentres]);

  useEffect(() => {
    if (tab !== "suggestions") return undefined;
    const t = setTimeout(loadSuggestions, 250);
    return () => clearTimeout(t);
  }, [tab, loadSuggestions]);

  useEffect(() => {
    if (tab !== "suggestions") return;
    getAdminCentres({ limit: 100 })
      .then(({ data }) => setAllCentres((data.items || []).sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setAllCentres([]));
  }, [tab, total]);

  // The same venue is often typed several ways ("HITEX Exhibition Center" /
  // "...Centre"). Once one spelling is a centre, the others are linked to it here.
  const linkToExisting = async (suggestion, centreId) => {
    const centre = allCentres.find((c) => c._id === centreId);
    if (!centre) return;
    try {
      const { data } = await linkCentreExhibitions(centreId, { venue: suggestion.venue, city: suggestion.city, country: suggestion.country });
      refreshCentrePages();
      toast.success(`Linked ${data.linked} exhibition${data.linked === 1 ? "" : "s"} to ${centre.name}.`);
      loadSuggestions();
      loadCentres();
    } catch (err) {
      toast.error(errMsg(err, "Could not link these exhibitions."));
    }
  };

  const onSaved = () => {
    refreshCentrePages();
    setEditor(null);
    loadCentres();
    if (tab === "suggestions") loadSuggestions();
  };

  const remove = async (centre) => {
    const ok = await confirmAction({
      title: "Delete this exhibition centre?",
      description: `"${centre.name}" will be removed from the directory${centre.linkedCount ? ` and unlinked from ${centre.linkedCount} exhibition${centre.linkedCount === 1 ? "" : "s"}` : ""}. The exhibitions themselves are not deleted.`,
      confirmLabel: "Delete centre",
    });
    if (!ok) return;
    try {
      await deleteCentre(centre._id);
      refreshCentrePages();
      toast.success("Exhibition centre deleted.");
      loadCentres();
    } catch (err) {
      toast.error(errMsg(err, "Could not delete the centre."));
    }
  };

  return (
    <AdminPage>
      <AdminHeader
        title="Exhibition centres"
        description="Venues with their map location, address and details. Search a venue on Google Maps and everything fills in; each centre gets a public page listing its upcoming shows."
        actions={
          <button type="button" className={btnPrimary} onClick={() => setEditor({ mode: "create" })}>
            <Plus size={16} aria-hidden="true" /> Add centre
          </button>
        }
      />

      <div role="tablist" aria-label="Exhibition centre views" className="mt-8 inline-flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800/70">
        {[
          ["centres", `Centres${total ? ` (${total})` : ""}`],
          ["suggestions", "From your exhibitions"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition motion-reduce:transition-none ${
              tab === key ? "bg-white text-[#131C55] shadow-sm dark:bg-gray-900 dark:text-white" : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "centres" ? (
        <Panel
          className="mt-4"
          title="Listed centres"
          count={total}
          toolbar={<SearchField value={searchInput} onChange={setSearchInput} placeholder="Search name, city or country" label="Search centres" />}
          footer={
            rows && total > pageSize ? (
              <TablePagination page={page} totalPages={pages} total={total} pageSize={pageSize} itemLabel="centres" shownCount={rows.length} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
            ) : null
          }
        >
          {error ? (
            <ErrorState message={error} onRetry={loadCentres} />
          ) : !rows ? (
            <LoadingRows />
          ) : !rows.length ? (
            <EmptyState icon={<Landmark size={20} />} title={search ? "No centres match" : "No exhibition centres yet"}>
              {search ? "Try another name or city." : 'Add one with "Add centre", or start from the venues your exhibitions already use.'}
              {!search ? (
                <span className="mt-4 flex flex-wrap justify-center gap-2">
                  <button type="button" className={btnSecondary} onClick={() => setTab("suggestions")}>From your exhibitions</button>
                </span>
              ) : null}
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className={thead}>
                  <tr>
                    <th className={th}>Centre</th>
                    <th className={th}>Location</th>
                    <th className={th}>Shows linked</th>
                    <th className={th}>Added</th>
                    <th className={`${th} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={tbody}>
                  {rows.map((c) => (
                    <tr key={c._id} className={tr}>
                      <td className={td}>
                        <div className="flex items-center gap-3">
                          {c.photo?.url ? (
                            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                              <Image src={c.photo.url} alt="" fill sizes="40px" className="object-cover" />
                            </span>
                          ) : (
                            <Monogram name={c.name} />
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-gray-900 dark:text-white">{c.name}</p>
                            <p className="max-w-xs truncate text-xs text-gray-500 dark:text-gray-400">{c.address}</p>
                          </div>
                        </div>
                      </td>
                      <td className={td}>
                        <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                          <MapPin size={14} aria-hidden="true" className="text-gray-400" />
                          {place(c) || "—"}
                        </span>
                      </td>
                      <td className={td}>
                        <Badge tone={c.linkedCount ? "brand" : "gray"}>{c.linkedCount || 0}</Badge>
                      </td>
                      <td className={`${td} whitespace-nowrap text-gray-600 dark:text-gray-400`}>{fmtDate(c.createdAt)}</td>
                      <td className={`${td} text-right`}>
                        <div className="flex justify-end gap-2">
                          <Link href={exhibitionCentrePath(c.slug)} target="_blank" className={btnRow} aria-label={`Open the public page for ${c.name}`}>
                            <ExternalLink size={14} aria-hidden="true" /> Page
                          </Link>
                          <button type="button" className={btnRow} onClick={() => setEditor({ mode: "edit", centre: c })}>
                            <Pencil size={14} aria-hidden="true" /> Edit
                          </button>
                          <button type="button" className={btnRowDanger} onClick={() => remove(c)} aria-label={`Delete ${c.name}`}>
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      ) : (
        <Panel
          className="mt-4"
          title="Venues your exhibitions already use"
          description="Not linked to a centre yet. Adding one links every show at that venue to it."
          count={suggestions?.length}
          toolbar={<SearchField value={suggestionSearch} onChange={setSuggestionSearch} placeholder="Search venue names" label="Search venues" />}
        >
          {suggestionsError ? (
            <ErrorState message={suggestionsError} onRetry={loadSuggestions} />
          ) : !suggestions ? (
            <LoadingRows />
          ) : !suggestions.length ? (
            <EmptyState icon={<Landmark size={20} />} title="Nothing left to add">
              Every venue on your exhibitions is linked to a centre.
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className={thead}>
                  <tr>
                    <th className={th}>Venue (as typed on exhibitions)</th>
                    <th className={th}>Location</th>
                    <th className={th}>Shows</th>
                    <th className={`${th} text-right`}>Action</th>
                  </tr>
                </thead>
                <tbody className={tbody}>
                  {suggestions.map((s) => (
                    <tr key={`${s.venue}|${s.city}|${s.country}`} className={tr}>
                      <td className={`${td} font-medium text-gray-900 dark:text-white`}>{s.venue}</td>
                      <td className={`${td} text-gray-700 dark:text-gray-300`}>{place(s) || "—"}</td>
                      <td className={td}>
                        <span className="tabular-nums">{s.count}</span>
                        {s.upcoming ? <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">{s.upcoming} upcoming</span> : null}
                      </td>
                      <td className={`${td} text-right`}>
                        <div className="flex flex-wrap justify-end gap-2">
                          {allCentres.length ? (
                            <select
                              aria-label={`Link "${s.venue}" to an existing centre`}
                              defaultValue=""
                              onChange={(e) => {
                                const id = e.target.value;
                                e.target.value = "";
                                if (id) linkToExisting(s, id);
                              }}
                              className="h-8 max-w-[11rem] rounded-lg border border-gray-300 bg-white px-2 text-[13px] text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                            >
                              <option value="">Link to existing…</option>
                              {allCentres.map((c) => (
                                <option key={c._id} value={c._id}>
                                  {c.name}{c.city ? ` (${c.city})` : ""}
                                </option>
                              ))}
                            </select>
                          ) : null}
                          <button type="button" className={btnRow} onClick={() => setEditor({ mode: "create", from: s })}>
                            <Plus size={14} aria-hidden="true" /> Add as centre
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      <Sheet open={Boolean(editor)} onOpenChange={(open) => !open && setEditor(null)}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-3xl">
          {editor ? <CentreEditor key={editor.centre?._id || editor.from?.venue || "new"} editor={editor} onSaved={onSaved} onCancel={() => setEditor(null)} /> : null}
        </SheetContent>
      </Sheet>
    </AdminPage>
  );
}

/* ───────────────────────────────── Editor ───────────────────────────────── */

function CentreEditor({ editor, onSaved, onCancel }) {
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

  useEffect(() => {
    if (!editing) return;
    getCentreExhibitions(editor.centre._id)
      .then(({ data }) => setLinked(data.items || []))
      .catch(() => setLinked([]));
  }, [editing, editor]);

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
      const { data } = editing ? await updateCentre(editor.centre._id, body, photo) : await createCentre(body, photo);
      toast.success(
        editing
          ? "Exhibition centre updated."
          : data.linked
            ? `Centre added and linked to ${data.linked} exhibition${data.linked === 1 ? "" : "s"}.`
            : "Exhibition centre added."
      );
      onSaved();
    } catch (err) {
      setFormError(errMsg(err, "Could not save the centre."));
    } finally {
      setSaving(false);
    }
  };

  const unlink = async (exhibition) => {
    try {
      await unlinkCentreExhibitions(editor.centre._id, [exhibition._id]);
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

        {editing ? (
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

