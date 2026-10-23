"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, ExternalLink, Landmark, MapPin, Pencil, Plus, Trash2, UserRoundCheck } from "lucide-react";

import { createMyCentre, deleteMyCentre, getOrganiserCentres, refreshCentrePages, updateMyCentre } from "@/models/exhibitionCentre.model";
import { confirmAction } from "@/lib/confirm";
import { exhibitionCentrePath } from "@/lib/routes";
import { PageHeader, Panel, btnPrimary, btnSecondary } from "@/components/dashboard/ui";
import { Badge, ErrorState, LoadingRows, SearchField, btnRow, btnRowDanger } from "@/components/admin/AdminUI";
import TablePagination from "@/components/dashboard/TablePagination";
import CentresMap from "@/components/maps/CentresMap";
import CentreEditor from "@/components/exhibition-centres/CentreEditor";
import { Sheet, SheetContent } from "@/components/ui/sheet";

/**
 * Organiser: Exhibition centres.
 *
 * Every centre on OneXhib, not only the organiser's: picking an existing venue
 * in an exhibition's Venue field beats adding a second copy of it. Edit and
 * Delete appear only on the centres this account added (`mine`, decided by
 * the backend, which enforces the same rule). A centre another organiser's
 * show uses cannot be deleted; the server says so in a sentence we show as-is.
 */

const ORGANISER_API = { create: createMyCentre, update: updateMyCentre };
const VIEWS = [
  { key: "all", label: "All centres" },
  { key: "mine", label: "Added by me" },
];
const errMsg = (err, fallback) => err?.response?.data?.message || fallback;
const place = (c) => [c.city, c.state, c.country].filter(Boolean).join(", ");

export default function OrganiserCentresClient() {
  const [view, setView] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState(null);
  const reqRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    const id = ++reqRef.current;
    setError("");
    try {
      const { data: body } = await getOrganiserCentres({
        page,
        limit: pageSize,
        ...(query ? { search: query } : {}),
        ...(view === "mine" ? { mine: "1" } : {}),
      });
      if (id === reqRef.current) setData(body);
    } catch (err) {
      if (id === reqRef.current) setError(errMsg(err, "Could not load exhibition centres."));
    }
  }, [page, pageSize, query, view]);

  useEffect(() => {
    load();
  }, [load]);

  const items = data?.items || [];

  const remove = async (centre) => {
    const ok = await confirmAction({
      title: "Delete this exhibition centre?",
      description: `"${centre.name}" will be removed from the directory, and your exhibitions at it will no longer be linked to it. The exhibitions themselves are not deleted.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteMyCentre(centre._id);
      refreshCentrePages();
      toast.success("Exhibition centre deleted.");
      load();
    } catch (err) {
      toast.error(errMsg(err, "Could not delete the centre."));
    }
  };

  const onSaved = () => {
    setEditor(null);
    load();
  };

  const points = items
    .filter((c) => Number.isFinite(c.location?.lat) && Number.isFinite(c.location?.lng))
    .map((c) => ({ id: c._id, name: c.name, lat: c.location.lat, lng: c.location.lng, href: exhibitionCentrePath(c.slug), subtitle: place(c) }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHeader
        eyebrow="Exhibition centres"
        title="Venues on OneXhib"
        intro="Every exhibition centre listed on OneXhib. Pick one in your exhibition's Venue field, or add a venue that is missing. You can edit and delete the centres you added."
        actions={
          <>
            <Link href="/exhibition-centres" target="_blank" rel="noopener" className={btnSecondary}>
              <ExternalLink size={16} aria-hidden="true" />
              Public directory
            </Link>
            <button type="button" className={btnPrimary} onClick={() => setEditor({ mode: "create" })}>
              <Plus size={16} aria-hidden="true" />
              Add centre
            </button>
          </>
        }
      />

      {points.length ? (
        <div className="mt-8 h-72 overflow-hidden rounded-3xl border border-gray-200 shadow-sm sm:h-80 dark:border-gray-800">
          <CentresMap points={points} className="h-full" framed={false} label="Map of the exhibition centres on this page" />
        </div>
      ) : null}

      <Panel
        title={view === "mine" ? "Added by me" : "All centres"}
        count={data ? data.total : undefined}
        toolbar={
          <>
            <div role="tablist" aria-label="Which centres" className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800/70">
              {VIEWS.map((v) => {
                const active = view === v.key;
                return (
                  <button
                    key={v.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setView(v.key);
                      setPage(1);
                    }}
                    className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
                      active ? "bg-white text-[#131C55] shadow-sm dark:bg-gray-900 dark:text-white" : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    }`}
                  >
                    {v.label}
                    {v.key === "mine" && data ? <span className="text-[11px] tabular-nums text-gray-400">{data.mineTotal}</span> : null}
                  </button>
                );
              })}
            </div>
            <SearchField
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search name, city or country"
              className="sm:w-64"
            />
          </>
        }
        footer={
          data && data.total ? (
            <TablePagination
              page={page}
              pageSize={pageSize}
              pageSizeOptions={[12, 24, 48]}
              total={data.total}
              totalPages={data.pages}
              shownCount={items.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              itemLabel="centres"
            />
          ) : null
        }
      >
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !data ? (
          <LoadingRows rows={4} />
        ) : !items.length ? (
          <div className="px-5 py-12 text-center">
            <p className="text-[15px] text-gray-600 dark:text-gray-400">
              {query
                ? `No centres match “${query}”.`
                : view === "mine"
                  ? "You have not added any exhibition centres yet."
                  : "No exhibition centres yet."}
            </p>
            <button type="button" className={`${btnPrimary} mt-4`} onClick={() => setEditor({ mode: "create" })}>
              <Plus size={16} aria-hidden="true" />
              Add a centre
            </button>
          </div>
        ) : (
          <ul className="grid list-none gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
            {items.map((c) => (
              <CentreCard key={c._id} centre={c} onEdit={() => setEditor({ mode: "edit", centre: c })} onDelete={() => remove(c)} />
            ))}
          </ul>
        )}
      </Panel>

      <Sheet open={Boolean(editor)} onOpenChange={(open) => !open && setEditor(null)}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-3xl">
          {editor ? (
            <CentreEditor key={editor.centre?._id || "new"} editor={editor} api={ORGANISER_API} onSaved={onSaved} onCancel={() => setEditor(null)} />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CentreCard({ centre, onEdit, onDelete }) {
  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-[#2B3FB8]/40 hover:shadow-md motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-400/40">
      <div className="relative aspect-[16/8] bg-gradient-to-br from-[#131C55] via-[#1B2A7A] to-[#2B3FB8]">
        {centre.photo?.url ? (
          <Image src={centre.photo.url} alt="" fill sizes="(min-width: 1024px) 340px, (min-width: 640px) 50vw, 100vw" className="object-cover" unoptimized />
        ) : (
          <span aria-hidden="true" className="absolute inset-0 grid place-items-center text-white/60">
            <Landmark size={36} strokeWidth={1.5} />
          </span>
        )}
        {centre.mine ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#131C55] shadow">
            <UserRoundCheck size={12} aria-hidden="true" /> Added by you
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="font-semibold leading-snug text-gray-900 dark:text-gray-100">{centre.name}</p>
        {place(centre) ? (
          <p className="mt-1 flex items-start gap-1 text-[13px] text-gray-600 dark:text-gray-400">
            <MapPin size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
            {place(centre)}
          </p>
        ) : null}
        <div className="mt-3">
          <Badge tone={centre.upcomingCount ? "sky" : "gray"}>
            <CalendarDays size={12} aria-hidden="true" />
            {centre.upcomingCount ? `${centre.upcomingCount} upcoming show${centre.upcomingCount === 1 ? "" : "s"}` : "No upcoming shows"}
          </Badge>
        </div>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
          <Link href={exhibitionCentrePath(centre.slug)} target="_blank" rel="noopener" className={btnRow}>
            <ExternalLink size={13} aria-hidden="true" /> View page
          </Link>
          {centre.mine ? (
            <>
              <button type="button" className={btnRow} onClick={onEdit}>
                <Pencil size={13} aria-hidden="true" /> Edit
              </button>
              <button type="button" className={btnRowDanger} onClick={onDelete}>
                <Trash2 size={13} aria-hidden="true" /> Delete
              </button>
            </>
          ) : null}
        </div>
      </div>
    </li>
  );
}
