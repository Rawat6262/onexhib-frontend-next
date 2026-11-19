"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Clock3,
  ExternalLink,
  History,
  Landmark,
  Link2,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
} from "lucide-react";

import CentreEditor from "@/components/exhibition-centres/CentreEditor";
import ClaimListingPanel from "@/components/claims/ClaimListingPanel";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge, adminInput, btnPrimary, btnRow, fmtDate } from "@/components/admin/AdminUI";
import { createMyVenue, getMyVenueExhibitions, getMyVenues, searchShowsToLink, updateMyVenue } from "@/models/exhibitionCentre.model";
import { createListingRequest } from "@/models/listingRequest.model";
import { exhibitionCentrePath, exhibitionPath } from "@/lib/routes";

/**
 * The venue dashboard (role EXHIBITION_CENTRE). Backed by /api/centre/* and
 * /api/listing-requests in Onexhib_backend (centreOwner / listingRequest
 * controllers), which only ever return the caller's own venues and requests.
 *
 *   - My venues: each with its review status and show counts. A venue added
 *     here is hidden until an admin approves it; a rejected one shows the
 *     admin's note, and editing it sends it back for review.
 *   - Shows (a Sheet per venue): upcoming and past exhibitions linked to it,
 *     and a search to ask for more to be linked - an admin approves each link.
 *   - Claim: a venue already on OneXhib (most are, added by the OneXhib team)
 *     is claimed rather than added again.
 */

const STATUS = {
  pending: { label: "Waiting for review", tone: "amber" },
  approved: { label: "Live", tone: "emerald" },
  rejected: { label: "Needs changes", tone: "rose" },
};
const VENUE_API = { create: createMyVenue, update: updateMyVenue };
const errMsg = (err, fallback) => err?.response?.data?.message || fallback;
const place = (c) => [c.city, c.state, c.country].filter(Boolean).join(", ");

export default function CentreClient() {
  const [venues, setVenues] = useState(null);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState(null); // { mode, centre? }
  const [showsFor, setShowsFor] = useState(null); // venue whose shows are open
  const [requestsKey, setRequestsKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const { data } = await getMyVenues();
      setVenues(data?.items || []);
      setError("");
    } catch (err) {
      setError(errMsg(err, "Your venues could not be loaded."));
      setVenues([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSaved = () => {
    setEditor(null);
    load();
  };

  const live = venues?.filter((v) => v.status === "approved").length || 0;
  const upcoming = venues?.reduce((n, v) => n + (v.upcomingCount || 0), 0) || 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <header className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-ox-night via-ox-navy to-ox-blue px-6 py-8 text-white shadow-lg sm:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 -z-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">Venue dashboard</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">My venues</h1>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-blue-100/85">
              Keep your venue&rsquo;s page accurate (photos, halls, floor area, how to get there) and make sure every
              exhibition held there is listed on it. Organisers and visitors find your venue from each show&rsquo;s page.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditor({ mode: "create" })}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-ox-navy shadow-sm transition hover:bg-blue-50 motion-reduce:transition-none"
          >
            <Plus size={16} aria-hidden="true" /> Add a venue
          </button>
        </div>
        {venues?.length ? (
          <p className="mt-5 text-sm text-blue-100/80">
            {live} live · {venues.length - live} not public yet · {upcoming} upcoming show{upcoming === 1 ? "" : "s"}
          </p>
        ) : null}
      </header>

      {error ? (
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>
      ) : null}

      {venues === null ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => <div key={i} className="h-72 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />)}
        </div>
      ) : venues.length === 0 && !error ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center dark:border-gray-700 dark:bg-gray-900">
          <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-2xl bg-ox-blue/10 text-ox-blue dark:bg-blue-400/15 dark:text-blue-300">
            <Landmark size={26} />
          </span>
          <h2 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">Set up your venue</h2>
          <p className="mt-1 max-w-md text-sm text-gray-600 dark:text-gray-400">
            Most exhibition centres are already on OneXhib. Find yours below and request access. If it isn&rsquo;t
            listed, add it: the OneXhib team checks it before it goes live.
          </p>
          <button type="button" onClick={() => setEditor({ mode: "create" })} className={`${btnPrimary} mt-5`}>
            <Plus size={16} aria-hidden="true" /> Add a venue
          </button>
        </div>
      ) : (
        <ul className="grid list-none gap-5 sm:grid-cols-2">
          {venues.map((v) => (
            <VenueCard key={v._id} venue={v} onEdit={() => setEditor({ mode: "edit", centre: v })} onShows={() => setShowsFor(v)} />
          ))}
        </ul>
      )}

      <ClaimListingPanel
        listingType="centre"
        refreshKey={requestsKey}
        title="Is your venue already on OneXhib?"
        intro="The OneXhib team has listed many exhibition centres. Find yours and request access instead of adding it again. Once we confirm you represent the venue, it moves to this dashboard."
      />

      <Sheet open={Boolean(editor)} onOpenChange={(o) => !o && setEditor(null)}>
        <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-3xl">
          {editor ? (
            <CentreEditor key={editor.centre?._id || "new"} editor={editor} api={VENUE_API} onSaved={onSaved} onCancel={() => setEditor(null)} />
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(showsFor)} onOpenChange={(o) => !o && setShowsFor(null)}>
        <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-2xl">
          {showsFor ? <VenueShows key={showsFor._id} venue={showsFor} onRequested={() => setRequestsKey((k) => k + 1)} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function VenueCard({ venue, onEdit, onShows }) {
  const status = STATUS[venue.status] || STATUS.approved;
  const cover = venue.photo?.url;
  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="relative aspect-[16/9] bg-gradient-to-br from-ox-navy via-ox-royal to-ox-blue">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL, owner-only page
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span aria-hidden="true" className="absolute inset-0 grid place-items-center text-white/60"><Landmark size={40} strokeWidth={1.5} /></span>
        )}
        <span className="absolute left-3 top-3"><Badge tone={status.tone}>{status.label}</Badge></span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h2 className="text-lg font-bold leading-tight text-gray-900 dark:text-white">{venue.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <MapPin size={14} aria-hidden="true" className="shrink-0" />
            {place(venue)}
          </p>
        </div>

        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
          <span className="inline-flex items-center gap-1"><CalendarDays size={14} aria-hidden="true" />{venue.upcomingCount || 0} upcoming</span>
          <span className="inline-flex items-center gap-1"><History size={14} aria-hidden="true" />{venue.pastCount || 0} past</span>
          {venue.halls ? <span>{venue.halls} hall{venue.halls === 1 ? "" : "s"}</span> : null}
        </p>

        {venue.status === "pending" ? (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">
            <Clock3 size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
            The OneXhib team is reviewing this venue. It is not public yet; you will get an email when it goes live.
          </p>
        ) : venue.status === "rejected" ? (
          <div className="rounded-xl bg-rose-50 px-3 py-2.5 text-[13px] text-rose-800 dark:bg-rose-400/10 dark:text-rose-200">
            <p className="flex items-start gap-2 font-semibold">
              <AlertTriangle size={15} aria-hidden="true" className="mt-0.5 shrink-0" /> Not approved yet
            </p>
            {venue.review_note ? <p className="mt-1 pl-6">{venue.review_note}</p> : null}
            <p className="mt-1 pl-6 text-rose-700/80 dark:text-rose-200/70">Edit the venue and save to send it for review again.</p>
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <button type="button" className={btnRow} onClick={onEdit}><Pencil size={14} aria-hidden="true" /> Edit</button>
          <button type="button" className={btnRow} onClick={onShows}><CalendarDays size={14} aria-hidden="true" /> Exhibitions</button>
          {venue.status === "approved" && venue.slug ? (
            <Link href={exhibitionCentrePath(venue.slug)} className={btnRow} target="_blank">
              <ExternalLink size={14} aria-hidden="true" /> View page
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function ShowRow({ show }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <Link href={exhibitionPath(show.exhibition_name, show._id)} target="_blank" className="font-medium text-gray-900 hover:underline dark:text-gray-100">
          {show.exhibition_name}
        </Link>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {show.starting_date ? fmtDate(show.starting_date) : "Dates not set"}
          {show.ending_date ? ` – ${fmtDate(show.ending_date)}` : ""}
        </p>
      </div>
    </li>
  );
}

/** One venue's linked shows, and asking for more to be linked. */
function VenueShows({ venue, onRequested }) {
  const [shows, setShows] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("upcoming");

  useEffect(() => {
    getMyVenueExhibitions(venue._id)
      .then(({ data }) => setShows({ upcoming: data?.upcoming || [], past: data?.past || [] }))
      .catch((err) => {
        setError(errMsg(err, "The exhibitions could not be loaded."));
        setShows({ upcoming: [], past: [] });
      });
  }, [venue._id]);

  const list = shows ? shows[tab] : [];

  return (
    <div className="flex flex-col">
      <SheetHeader className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
        <SheetTitle>Exhibitions at {venue.name}</SheetTitle>
        <SheetDescription>Shows linked to your venue appear on its page, and the venue appears on theirs.</SheetDescription>
      </SheetHeader>

      <div className="space-y-6 px-6 py-5">
        <div>
          <div role="tablist" aria-label="Which exhibitions" className="inline-flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
            {[
              { key: "upcoming", label: `Upcoming${shows ? ` (${shows.upcoming.length})` : ""}` },
              { key: "past", label: `Past${shows ? ` (${shows.past.length})` : ""}` },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition motion-reduce:transition-none ${
                  tab === t.key ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {error ? <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
          {shows === null ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-gray-500"><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Loading…</p>
          ) : list.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {tab === "upcoming" ? "No upcoming exhibitions are linked yet. Link one below." : "No past exhibitions are linked."}
            </p>
          ) : (
            <ul className="mt-3 list-none divide-y divide-gray-100 dark:divide-gray-800">
              {list.map((s) => <ShowRow key={s._id} show={s} />)}
            </ul>
          )}
        </div>

        {venue.status === "approved" ? (
          <LinkShows venue={venue} onRequested={onRequested} />
        ) : (
          <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
            You can link exhibitions once the venue is approved.
          </p>
        )}
      </div>
    </div>
  );
}

function LinkShows({ venue, onRequested }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems(null);
      return undefined;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await searchShowsToLink(venue._id, term, ctrl.signal);
        setItems(data?.items || []);
      } catch (err) {
        if (err?.name !== "CanceledError") toast.error(errMsg(err, "Search failed."));
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, venue._id]);

  const request = async (show) => {
    setSending(show._id);
    try {
      await createListingRequest({ kind: "link", listingType: "centre", listing: venue._id, exhibition: show._id });
      setItems((list) => list.map((x) => (x._id === show._id ? { ...x, requested: true } : x)));
      toast.success("Link requested. The OneXhib team will confirm it.");
      onRequested();
    } catch (err) {
      toast.error(errMsg(err, "Could not send the request."));
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
        <Link2 size={15} aria-hidden="true" /> Link an exhibition held here
      </h3>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">The OneXhib team confirms each link before it shows on the pages.</p>
      <label className="relative mt-3 block">
        <span className="sr-only">Search exhibitions by name</span>
        <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exhibitions by name" className={`${adminInput} pl-9`} />
      </label>
      <div className="mt-2" aria-live="polite">
        {loading ? (
          <p className="flex items-center gap-2 py-2 text-sm text-gray-500"><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Searching…</p>
        ) : items === null ? null : items.length === 0 ? (
          <p className="py-2 text-sm text-gray-500 dark:text-gray-400">No exhibitions match.</p>
        ) : (
          <ul className="list-none divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((s) => (
              <li key={s._id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{s.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {s.starting_date ? fmtDate(s.starting_date) : "Dates not set"}
                    {s.place ? ` · ${s.place}` : ""}
                    {s.linkedElsewhere ? " · listed at another venue" : ""}
                  </p>
                </div>
                {s.linkedHere ? (
                  <Badge tone="emerald"><Check size={11} aria-hidden="true" /> Linked</Badge>
                ) : s.requested ? (
                  <Badge tone="amber"><Clock3 size={11} aria-hidden="true" /> Requested</Badge>
                ) : (
                  <button type="button" className={btnRow} onClick={() => request(s)} disabled={sending === s._id}>
                    {sending === s._id ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Link2 size={14} aria-hidden="true" />}
                    Request link
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
