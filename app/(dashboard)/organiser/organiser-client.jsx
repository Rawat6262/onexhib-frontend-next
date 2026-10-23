"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Eye,
  FileSpreadsheet,
  KeyRound,
  MapPin,
  Pencil,
  Plus,
  Radio,
  Settings2,
  UserRound,
} from "lucide-react";

import { getExhibitions, getMyExhibitionDetails, getSharedExhibitions } from "@/models/exhibition.model";
import { useAuth } from "@/components/auth/AuthProvider";
import TablePagination from "@/components/dashboard/TablePagination";
import { PageHeader, Panel, StatCard, btnPrimary, btnSecondary, pill } from "@/components/dashboard/ui";
import {
  Badge,
  LoadingRows,
  Monogram,
  SearchField,
  btnRow,
  fmtDate,
  tbody,
  td,
  th,
  thead,
  tr,
} from "@/components/admin/AdminUI";
import { exhibitionPath } from "@/lib/routes";

// Modals are only needed once opened, so their code (and for the location
// forms, country-state-city's ~2.3 MB dataset) is split out of this page's
// first-load bundle.
const ExhibitionPopupForm = dynamic(() => import("@/components/popups/ExhibitionPopupForm"), { ssr: false });
const OrganiserPopup = dynamic(() => import("@/components/organiser/OrganiserDetailsPopup"), { ssr: false });
const ExhibitionEditPopup = dynamic(() => import("@/components/popups/OrganiserEditPopup"), { ssr: false });
const ExhibitionUploadModal = dynamic(() => import("@/components/popups/ExhibitionUploadModal"), { ssr: false });

/**
 * The organiser's home: their own exhibitions, and any an admin shared with them.
 *
 * Reads /api/exhibition/details (dates and image included) so each show can say
 * whether it is live, upcoming or over - the plain list had no dates, so the
 * table could not. Falls back to the plain list if that call fails.
 *
 * Each row has three actions with distinct jobs:
 *   View    - the public page, as visitors see it (new tab);
 *   Manage  - /exhibitions/[id]: the companies exhibiting, news, delete;
 *   Edit    - the details form.
 * "View" used to open Manage, which is why both looked like the same button.
 */

const day = (v) => (v ? String(v).slice(0, 10) : "");
function statusOf(start, end, now = new Date().toISOString().slice(0, 10)) {
  const s = day(start);
  const e = day(end) || s;
  if (!s) return "undated";
  if (e < now) return "ended";
  if (s > now) return "upcoming";
  return "live";
}
const STATUS = {
  live: { label: "Live now", tone: "emerald" },
  upcoming: { label: "Upcoming", tone: "sky" },
  ended: { label: "Ended", tone: "gray" },
  undated: { label: "No dates", tone: "amber" },
};
const TABS = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "live", label: "Live now" },
  { key: "ended", label: "Ended" },
];

function dateRange(a, b) {
  if (!a) return "Dates not set";
  const from = fmtDate(a);
  const to = b ? fmtDate(b) : "";
  return to && to !== from ? `${from} – ${to}` : from;
}

export default function OrganiserClient() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [shared, setShared] = useState([]);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showAdd, setShowAdd] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [editingId, setEditingId] = useState(null);

  /*
   * ONE PAGE AT A TIME, filtered on the server. An organiser can own thousands
   * of shows (one account has 2,041); loading them all to count and filter here
   * took ~10s. The server answers the current page plus the per-status counts
   * and the next upcoming show (/api/exhibition/details?withCounts=1).
   */
  const [counts, setCounts] = useState(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [nextUp, setNextUp] = useState(null);
  const [query, setQuery] = useState("");
  const reqRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    const id = ++reqRef.current;
    setItems(null);
    const params = {
      page,
      limit: pageSize,
      withCounts: "1",
      ...(tab !== "all" ? { status: tab } : {}),
      ...(query ? { search: query } : {}),
    };
    let body = null;
    try {
      ({ data: body } = await getMyExhibitionDetails(params));
    } catch {
      try {
        ({ data: body } = await getExhibitions({ page, limit: pageSize }));
      } catch {
        body = { data: [], total: 0 };
      }
    }
    if (id !== reqRef.current) return; // a newer filter or page won
    const rows = body?.data ?? [];
    setItems(rows.map((r) => ({ ...r, status: statusOf(r.starting_date, r.ending_date) })));
    setTotal(body?.total ?? rows.length);
    setTotalPages(body?.totalPages || 1);
    setCounts(body?.counts || { all: body?.total ?? rows.length, upcoming: 0, live: 0, ended: 0, undated: 0 });
    setNextUp(body?.nextUp || null);
  }, [page, pageSize, tab, query]);

  const loadShared = useCallback(async () => {
    try {
      const { data } = await getSharedExhibitions();
      setShared(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setShared([]); // the section simply stays hidden
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadShared();
  }, [loadShared]);

  const pageRows = items || [];
  const firstName = user?.first_name || "";
  // Brand new: nothing listed at all (not merely nothing matching a filter).
  const isNew = counts !== null && counts.all === 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHeader
        eyebrow="Organiser dashboard"
        title={firstName ? `Welcome back, ${firstName}` : "Your exhibitions"}
        intro="Everything you have listed on OneXhib. Keep dates and details current, and add the companies exhibiting at each show."
        actions={
          <>
            <button type="button" className={btnSecondary} onClick={() => setShowProfile(true)}>
              <UserRound size={16} aria-hidden="true" />
              Organiser details
            </button>
            <button type="button" className={btnSecondary} onClick={() => setShowUpload(true)}>
              <FileSpreadsheet size={16} aria-hidden="true" />
              Import Excel
            </button>
            <Link href="/organiser/request-access" className={btnSecondary} title="Your show is already listed? Ask to edit it">
              <KeyRound size={16} aria-hidden="true" />
              Request access
            </Link>
            <button type="button" className={btnPrimary} onClick={() => setShowAdd(true)}>
              <Plus size={16} aria-hidden="true" />
              Add exhibition
            </button>
          </>
        }
      />

      {isNew ? (
        <Onboarding onAdd={() => setShowAdd(true)} onImport={() => setShowUpload(true)} />
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              accent
              icon={<CalendarDays size={16} />}
              label="Exhibitions listed"
              value={counts ? counts.all : undefined}
              hint={nextUp ? `Next: ${nextUp.exhibition_name}` : ""}
            />
            <StatCard icon={<CalendarClock size={16} />} tone="sky" label="Upcoming" value={counts ? counts.upcoming : undefined} />
            <StatCard icon={<Radio size={16} />} tone="emerald" label="Live now" value={counts ? counts.live : undefined} />
            <StatCard
              icon={<CalendarCheck size={16} />}
              tone="violet"
              label="Ended"
              value={counts ? counts.ended : undefined}
              hint={counts?.undated ? `${counts.undated} without dates` : ""}
              warn={(counts?.undated || 0) > 0}
            />
          </div>

          <Panel
            title="My exhibitions"
            count={items ? total : undefined}
            toolbar={
              <>
                <div role="tablist" aria-label="Filter by status" className="flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1 dark:bg-gray-800/70">
                  {TABS.map((t) => {
                    const active = tab === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => {
                          setTab(t.key);
                          setPage(1);
                        }}
                        className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
                          active ? "bg-white text-[#131C55] shadow-sm dark:bg-gray-900 dark:text-white" : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                        }`}
                      >
                        {t.label}
                        <span className="text-[11px] tabular-nums text-gray-400">{counts ? counts[t.key] : "…"}</span>
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
                  placeholder="Search my exhibitions"
                  className="sm:w-64"
                />
              </>
            }
            footer={
              items && total ? (
                <TablePagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  totalPages={totalPages}
                  shownCount={pageRows.length}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                  itemLabel="exhibitions"
                />
              ) : null
            }
          >
            {items === null ? (
              <LoadingRows rows={4} />
            ) : pageRows.length === 0 ? (
              <div className="px-5 py-12 text-center text-[15px] text-gray-500 dark:text-gray-400">
                {search ? `No exhibitions match “${search}”.` : "No exhibitions in this group."}
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={thead}>
                        <th scope="col" className={th}>Exhibition</th>
                        <th scope="col" className={th}>Dates</th>
                        <th scope="col" className={th}>Category</th>
                        <th scope="col" className={th}><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className={tbody}>
                      {pageRows.map((it) => (
                        <tr key={it._id} className={tr}>
                          <td className={`${td} min-w-[16rem]`}>
                            <ShowCell it={it} />
                          </td>
                          <td className={`${td} whitespace-nowrap text-[13px] text-gray-700 dark:text-gray-300`}>
                            {dateRange(it.starting_date, it.ending_date)}
                            <div className="mt-1">
                              <Badge tone={STATUS[it.status].tone}>{STATUS[it.status].label}</Badge>
                            </div>
                          </td>
                          <td className={`${td} max-w-[12rem]`}>
                            {it.category ? <span className={`${pill} max-w-full truncate`}>{it.category}</span> : <span className="text-gray-400">—</span>}
                          </td>
                          <td className={td}>
                            <Actions it={it} onEdit={() => setEditingId(it._id)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className={`md:hidden ${tbody}`}>
                  {pageRows.map((it) => (
                    <li key={it._id} className="space-y-3 px-4 py-4">
                      <ShowCell it={it} />
                      <div className="flex flex-wrap items-center gap-2 text-[13px] text-gray-600 dark:text-gray-400">
                        <span>{dateRange(it.starting_date, it.ending_date)}</span>
                        <Badge tone={STATUS[it.status].tone}>{STATUS[it.status].label}</Badge>
                      </div>
                      <Actions it={it} onEdit={() => setEditingId(it._id)} wrap />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>
        </>
      )}

      {shared.length > 0 && <SharedWithYou items={shared} onEdit={setEditingId} />}

      {showProfile && <OrganiserPopup Cl={() => setShowProfile(false)} data={user?._id || null} />}
      <ExhibitionUploadModal isOpen={showUpload} onClose={() => setShowUpload(false)} onSuccess={load} />
      {showAdd && (
        <ExhibitionPopupForm
          onClose={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}
      <ExhibitionEditPopup
        open={Boolean(editingId)}
        exhibitionId={editingId}
        onClose={() => {
          setEditingId(null);
          load();
          loadShared(); // a renamed shared show should show its new name
        }}
      />
    </div>
  );
}

function ShowCell({ it }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="flex min-w-0 items-center gap-3">
      {it.exhibtion_url && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- uploaded or hotlinked; failures fall back
        <img
          src={it.exhibtion_url}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-11 w-16 shrink-0 rounded-lg bg-gray-100 object-cover ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-800"
        />
      ) : (
        <Monogram name={it.exhibition_name} size="h-11 w-16" />
      )}
      <div className="min-w-0">
        <p className="font-semibold leading-snug text-gray-900 dark:text-gray-100">{it.exhibition_name}</p>
        {it.exhibition_address ? (
          <p className="mt-0.5 flex items-start gap-1 text-xs text-gray-500 dark:text-gray-400">
            <MapPin size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
            <span className="line-clamp-1">{it.exhibition_address}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Actions({ it, onEdit, wrap = false }) {
  return (
    <div className={`flex gap-1.5 ${wrap ? "flex-wrap" : "justify-end"}`}>
      <Link href={exhibitionPath(it.exhibition_name, it._id)} target="_blank" rel="noopener" className={btnRow} title="See it as visitors do">
        <Eye size={13} aria-hidden="true" />
        View
      </Link>
      <Link href={`/exhibitions/${it._id}`} className={btnRow} title="Companies exhibiting, news, delete">
        <Settings2 size={13} aria-hidden="true" />
        Manage
      </Link>
      <button type="button" className={btnRow} onClick={onEdit}>
        <Pencil size={13} aria-hidden="true" />
        Edit
      </button>
    </div>
  );
}

/** First visit: no exhibitions yet - say what to do, not "nothing found". */
function Onboarding({ onAdd, onImport }) {
  const steps = [
    { n: 1, title: "List your exhibition", text: "Name, dates, venue and category. Add a cover image and brochure if you have them." },
    { n: 2, title: "Add the exhibitors", text: "Open Manage on your show to add the companies exhibiting and their products." },
    { n: 3, title: "Get found", text: "Your show appears in search, the calendar and its city and industry pages." },
  ];
  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br from-white to-[#2B3FB8]/[0.04] p-6 sm:p-8 dark:border-gray-800 dark:from-gray-900 dark:to-blue-400/[0.05]">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Let’s get your first exhibition online</h2>
      <p className="mt-1 text-[15px] text-gray-600 dark:text-gray-400">Three steps, a few minutes each.</p>
      <ol className="mt-6 grid gap-4 sm:grid-cols-3">
        {steps.map((s) => (
          <li key={s.n} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#131C55] text-sm font-bold text-white dark:bg-blue-500">{s.n}</span>
            <p className="mt-3 font-semibold text-gray-900 dark:text-gray-100">{s.title}</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{s.text}</p>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap gap-2.5">
        <button type="button" className={btnPrimary} onClick={onAdd}>
          <Plus size={16} aria-hidden="true" />
          Add your first exhibition
        </button>
        <button type="button" className={btnSecondary} onClick={onImport}>
          <FileSpreadsheet size={16} aria-hidden="true" />
          Import from Excel
        </button>
      </div>
      <p className="mt-5 text-sm text-gray-600 dark:text-gray-400">
        Is your exhibition already on OneXhib?{" "}
        <Link href="/organiser/request-access" className="font-semibold text-[#2B3FB8] underline-offset-4 hover:underline dark:text-blue-300">
          Request access to edit it
        </Link>{" "}
        instead of adding it again.
      </p>
    </section>
  );
}

/** Listings the OneXhib team created and an admin let this organiser edit. */
function SharedWithYou({ items, onEdit }) {
  return (
    <section aria-labelledby="shared-title" className="mt-10">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#2B3FB8]/10 text-[#2B3FB8] dark:bg-blue-400/15 dark:text-blue-300">
          <KeyRound size={17} aria-hidden="true" />
        </span>
        <div>
          <h2 id="shared-title" className="text-lg font-bold text-gray-900 dark:text-gray-50">
            Shared with you
            <span className="ml-2 align-middle text-sm font-medium text-gray-500 dark:text-gray-400">{items.length}</span>
          </h2>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
            The OneXhib team gave you access to keep these listings up to date. You can edit them, but not delete them.
          </p>
        </div>
      </div>

      <ul className="mt-4 grid list-none grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const st = STATUS[statusOf(item.starting_date, item.ending_date)];
          return (
            <li
              key={item._id}
              className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-900/[0.03] transition hover:border-[#2B3FB8]/40 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-400/40"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-gray-900 dark:text-gray-100">{item.exhibition_name}</p>
                <Badge tone={st.tone}>{st.label}</Badge>
              </div>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{dateRange(item.starting_date, item.ending_date)}</p>
              {item.exhibition_address ? (
                <p className="mt-0.5 truncate text-sm text-gray-500" title={item.exhibition_address}>
                  {item.exhibition_address}
                </p>
              ) : null}
              <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                {item.category ? <span className={`${pill} truncate`}>{item.category}</span> : <span />}
                <div className="flex shrink-0 gap-2">
                  <Link href={exhibitionPath(item.exhibition_name, item._id)} target="_blank" rel="noopener" className={btnRow}>
                    View
                  </Link>
                  <button type="button" className={btnRow} onClick={() => onEdit(item._id)}>
                    <Pencil size={14} aria-hidden="true" />
                    Edit
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
