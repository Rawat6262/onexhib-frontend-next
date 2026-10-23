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
import { Sheet, SheetContent } from "@/components/ui/sheet";
import CentreEditor from "@/components/exhibition-centres/CentreEditor";
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


// The editor's endpoints: admins may also see and unlink every linked show.
const ADMIN_API = { create: createCentre, update: updateCentre, getLinked: getCentreExhibitions, unlink: unlinkCentreExhibitions };

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
          {editor ? <CentreEditor key={editor.centre?._id || editor.from?.venue || "new"} editor={editor} api={ADMIN_API} onSaved={onSaved} onCancel={() => setEditor(null)} /> : null}
        </SheetContent>
      </Sheet>
    </AdminPage>
  );
}
