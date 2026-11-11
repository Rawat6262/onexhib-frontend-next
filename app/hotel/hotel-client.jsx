"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, BedDouble, Clock3, ExternalLink, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";

import HotelEditor from "@/components/hotels/HotelEditor";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge, btnPrimary, btnRow, btnRowDanger } from "@/components/admin/AdminUI";
import { deleteHotel, getMyHotels, refreshHotelPages } from "@/models/hotel.model";
import { confirmAction } from "@/lib/confirm";
import { STATUS, formatRate } from "@/lib/hotels";
import { hotelPath } from "@/lib/routes";

/**
 * The hotel dashboard: the account's hotels, each with its review status, and
 * the editor in a Sheet. Backed by /api/hotel/* (Onexhib_backend
 * Controller/hotel.controller.js), which only ever returns the caller's own.
 *
 * A hotel is public once an admin approves it. Until then - or after a
 * rejection, with the admin's reason shown here - it is visible only on this
 * page, which says so plainly so nobody wonders why their hotel is missing
 * from the venue pages.
 */
export default function HotelClient() {
  const [hotels, setHotels] = useState(null);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState(null); // { hotel: object | null }

  const load = useCallback(async () => {
    try {
      const { data } = await getMyHotels();
      setHotels(data?.items || []);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Your hotels could not be loaded.");
      setHotels([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSaved = () => {
    setEditor(null);
    load();
  };

  const remove = async (hotel) => {
    const ok = await confirmAction({
      title: `Delete ${hotel.name}?`,
      description: "Its page and photos are removed, and it stops appearing near exhibition venues. This cannot be undone.",
      confirmLabel: "Delete hotel",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteHotel(hotel._id);
      toast.success("Hotel deleted.");
      refreshHotelPages();
      setHotels((list) => list.filter((h) => h._id !== hotel._id));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete the hotel.");
    }
  };

  const live = hotels?.filter((h) => h.status === "approved").length || 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <header className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-ox-night via-ox-navy to-ox-blue px-6 py-8 text-white shadow-lg sm:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 -z-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">Hotel dashboard</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">My hotels</h1>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-blue-100/85">
              Approved hotels appear beside every exhibition venue within 10 km, and on the pages of the exhibitions held there.
              Visitors can send you a booking enquiry from your hotel page.
            </p>
          </div>
          <button type="button" onClick={() => setEditor({ hotel: null })} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-ox-navy shadow-sm transition hover:bg-blue-50 motion-reduce:transition-none">
            <Plus size={16} aria-hidden="true" /> Add a hotel
          </button>
        </div>
        {hotels?.length ? (
          <p className="mt-5 text-sm text-blue-100/80">
            {live} live · {hotels.length - live} not public yet
          </p>
        ) : null}
      </header>

      {error ? (
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>
      ) : null}

      {hotels === null ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => <div key={i} className="h-72 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />)}
        </div>
      ) : hotels.length === 0 && !error ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center dark:border-gray-700 dark:bg-gray-900">
          <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-2xl bg-ox-blue/10 text-ox-blue dark:bg-blue-400/15 dark:text-blue-300">
            <BedDouble size={26} />
          </span>
          <h2 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">List your first hotel</h2>
          <p className="mt-1 max-w-md text-sm text-gray-600 dark:text-gray-400">
            Pick it on the map, add photos and rates. Once approved, it is shown to everyone visiting an exhibition nearby.
          </p>
          <button type="button" onClick={() => setEditor({ hotel: null })} className={`${btnPrimary} mt-5`}>
            <Plus size={16} aria-hidden="true" /> Add a hotel
          </button>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2">
          {hotels.map((h) => (
            <HotelCard key={h._id} hotel={h} onEdit={() => setEditor({ hotel: h })} onDelete={() => remove(h)} />
          ))}
        </ul>
      )}

      <Sheet open={Boolean(editor)} onOpenChange={(open) => !open && setEditor(null)}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-3xl">
          {editor ? <HotelEditor key={editor.hotel?._id || "new"} hotel={editor.hotel} onSaved={onSaved} onCancel={() => setEditor(null)} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function HotelCard({ hotel, onEdit, onDelete }) {
  const status = STATUS[hotel.status] || STATUS.pending;
  const cover = hotel.photos?.[0]?.url;
  const rate = formatRate(hotel.price_from, hotel.currency);

  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="relative aspect-[16/9] bg-gradient-to-br from-ox-navy via-ox-royal to-ox-blue">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL, owner-only page
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span aria-hidden="true" className="absolute inset-0 grid place-items-center text-white/60"><BedDouble size={40} strokeWidth={1.5} /></span>
        )}
        <span className="absolute left-3 top-3"><Badge tone={status.tone}>{status.label}</Badge></span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h2 className="text-lg font-bold leading-tight text-gray-900 dark:text-white">{hotel.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <MapPin size={14} aria-hidden="true" className="shrink-0" />
            {[hotel.city, hotel.country].filter(Boolean).join(", ")}
          </p>
        </div>

        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
          {hotel.stars ? (
            <span className="inline-flex items-center gap-1"><Star size={14} aria-hidden="true" className="fill-amber-400 text-amber-400" />{hotel.stars}-star</span>
          ) : null}
          {rate ? <span>from {rate} / night</span> : null}
          <span>{hotel.photos?.length || 0} photo{hotel.photos?.length === 1 ? "" : "s"}</span>
        </p>

        {hotel.status === "pending" ? (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">
            <Clock3 size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
            The OneXhib team is reviewing this hotel. It is not public yet; you will get an email when it goes live.
          </p>
        ) : hotel.status === "rejected" ? (
          <div className="rounded-xl bg-rose-50 px-3 py-2.5 text-[13px] text-rose-800 dark:bg-rose-400/10 dark:text-rose-200">
            <p className="flex items-start gap-2 font-semibold">
              <AlertTriangle size={15} aria-hidden="true" className="mt-0.5 shrink-0" /> Not approved yet
            </p>
            {hotel.review_note ? <p className="mt-1 pl-6">{hotel.review_note}</p> : null}
            <p className="mt-1 pl-6 text-rose-700/80 dark:text-rose-200/70">Edit the hotel and save to send it for review again.</p>
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <button type="button" className={btnRow} onClick={onEdit}><Pencil size={14} aria-hidden="true" /> Edit</button>
          {hotel.status === "approved" ? (
            <Link href={hotelPath(hotel.slug)} className={btnRow} target="_blank">
              <ExternalLink size={14} aria-hidden="true" /> View page
            </Link>
          ) : null}
          <button type="button" className={btnRowDanger} onClick={onDelete}><Trash2 size={14} aria-hidden="true" /> Delete</button>
        </div>
      </div>
    </li>
  );
}
