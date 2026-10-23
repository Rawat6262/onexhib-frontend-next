"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarSync,
  CheckCircle2,
  Copy,
  FilePenLine,
  KeyRound,
  MailCheck,
  Search,
  SearchCheck,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

import { getMyAccessRequests, getSharedExhibitions } from "@/models/exhibition.model";
import { PageHeader, btnPrimary, btnSecondary } from "@/components/dashboard/ui";
import MyAccessRequests from "@/components/organiser/MyAccessRequests";

const RequestAccessDialog = dynamic(() => import("@/components/organiser/RequestAccessDialog"), { ssr: false });

/**
 * Organiser: Request access, its own page (it used to be a button and a list
 * at the bottom of My exhibitions).
 *
 * Explains the feature first - what it is, why, how it works, the rules - then
 * the organiser's own requests. Every rule stated here is enforced by the
 * backend (Controller/accessRequest.controller.js and addEditor in
 * exhibitionAccess.controller.js); change them together.
 */

const BENEFITS = [
  {
    icon: FilePenLine,
    title: "Keep your listing right",
    text: "Update dates, venue, description, images, brochure and sponsor logos yourself, without emailing the team.",
  },
  {
    icon: Copy,
    title: "No duplicate listing",
    text: "Edit the page that already exists instead of adding a second one, so visitors, exhibitors and search engines find one show.",
  },
  {
    icon: SearchCheck,
    title: "Keep what it has built",
    text: "The listing keeps its exhibitors, news and its place in search, the calendar and its city and industry pages.",
  },
  {
    icon: CalendarSync,
    title: "One dashboard",
    text: "Approved shows appear under Shared with you on My exhibitions, next to the ones you listed yourself.",
  },
];

const STEPS = [
  { icon: Search, title: "Find the exhibition", text: "Search by name, city or category. Upcoming, live and past shows are all included." },
  { icon: UserRoundCheck, title: "Say who you are", text: "Your role at the show and how the team can confirm it, such as a work email or phone number." },
  { icon: ShieldCheck, title: "The team reviews it", text: "An admin checks that you represent the show, then approves or declines it with a note." },
  { icon: MailCheck, title: "Start editing", text: "You get an email, and the show appears under Shared with you on My exhibitions." },
];

const RULES = [
  "Requests are for Organiser accounts with a verified email. If your account is another type, switch it to Organiser (Account type, in your account menu) first.",
  "Ask only for exhibitions you organise or officially represent. Tell the team your role so they can confirm it.",
  "You cannot request a show you already own or can already edit.",
  "One request per exhibition while it is waiting, and up to 10 requests waiting at a time.",
  "Each exhibition can have up to 10 people with edit access.",
  "With access you can edit the show's details and logos. You cannot delete the show or give access to anyone else.",
  "The team may decline a request it cannot verify, with a note saying why. You can cancel a request while it is still waiting.",
];

export default function RequestAccessClient() {
  const [requests, setRequests] = useState(null);
  const [shared, setShared] = useState([]);
  const [open, setOpen] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      const { data } = await getMyAccessRequests();
      setRequests(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setRequests([]);
    }
  }, []);

  useEffect(() => {
    loadRequests();
    getSharedExhibitions()
      .then(({ data }) => setShared(Array.isArray(data?.data) ? data.data : []))
      .catch(() => setShared([]));
  }, [loadRequests]);

  const pending = (requests || []).filter((r) => r.status === "pending").length;
  const approved = (requests || []).filter((r) => r.status === "approved").length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHeader
        eyebrow="Request access"
        title="Is your exhibition already on OneXhib?"
        intro="Ask to edit it instead of listing it again. Once the OneXhib team confirms you represent the show, you manage it from your dashboard like your own."
        actions={
          <button type="button" className={btnPrimary} onClick={() => setOpen(true)}>
            <KeyRound size={16} aria-hidden="true" />
            Start a request
          </button>
        }
      />

      {/* What it is */}
      <section className="relative mt-8 overflow-hidden rounded-3xl bg-gradient-to-br from-[#131C55] via-[#1B2A7A] to-[#2B3FB8] p-6 text-white shadow-lg shadow-indigo-900/20 sm:p-8">
        <span aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-400/25 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-100/80">What is it</p>
            <h2 className="mt-2 text-2xl font-bold leading-tight sm:text-[1.7rem]">Edit access to a show someone else listed</h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-blue-50/90">
              The OneXhib team lists many exhibitions from public sources, so your show may already have a page. Request
              access gives you, the real organiser, the right to keep that page up to date. Nothing about the show
              changes until you edit it.
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Waiting", value: requests ? pending : "…" },
              { label: "Approved", value: requests ? approved : "…" },
              { label: "You can edit", value: shared.length },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/10 px-3 py-4 ring-1 ring-white/15">
                <dd className="text-2xl font-extrabold tabular-nums">{s.value}</dd>
                <dt className="mt-1 text-[12px] font-medium text-blue-100/80">{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Benefits */}
      <section aria-labelledby="benefits-title" className="mt-12">
        <h2 id="benefits-title" className="text-xl font-bold text-gray-900 dark:text-white">Why request access</h2>
        <ul className="mt-5 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-[#2B3FB8]/10 text-[#2B3FB8] dark:bg-blue-400/15 dark:text-blue-300">
                <Icon size={19} />
              </span>
              <p className="mt-4 font-semibold text-gray-900 dark:text-gray-100">{title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section aria-labelledby="how-title" className="mt-12">
        <h2 id="how-title" className="text-xl font-bold text-gray-900 dark:text-white">How it works</h2>
        <ol className="mt-5 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="relative rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-gray-50 p-5 dark:border-gray-800 dark:from-gray-900 dark:to-gray-900/60">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#131C55] text-sm font-bold text-white dark:bg-blue-500">{i + 1}</span>
                <Icon size={18} aria-hidden="true" className="text-gray-400" />
              </div>
              <p className="mt-4 font-semibold text-gray-900 dark:text-gray-100">{title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Rules */}
      <section aria-labelledby="rules-title" className="mt-12 grid gap-6 rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] dark:border-gray-800 dark:bg-gray-900">
        <div>
          <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30">
            <BadgeCheck size={20} />
          </span>
          <h2 id="rules-title" className="mt-4 text-xl font-bold text-gray-900 dark:text-white">The rules</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            They protect every organiser&rsquo;s listing: only the people who run a show can change it.
          </p>
        </div>
        <ul className="list-none space-y-3">
          {RULES.map((rule) => (
            <li key={rule} className="flex items-start gap-3 text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
              <CheckCircle2 size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* My requests */}
      {requests === null ? null : requests.length ? (
        <MyAccessRequests items={requests} onChange={loadRequests} onNew={() => setOpen(true)} />
      ) : (
        <section className="mt-10 flex flex-col items-start gap-4 rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8 dark:border-gray-700 dark:bg-gray-900/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">No requests yet</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Find your exhibition and send your first request. Not on OneXhib at all?{" "}
              <Link href="/organiser" className="font-semibold text-[#2B3FB8] underline-offset-4 hover:underline dark:text-blue-300">
                Add it from My exhibitions
              </Link>
              .
            </p>
          </div>
          <button type="button" className={btnSecondary} onClick={() => setOpen(true)}>
            Start a request
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </section>
      )}

      {open ? (
        <RequestAccessDialog
          onClose={() => setOpen(false)}
          onSent={loadRequests}
          pendingIds={new Set((requests || []).filter((r) => r.status === "pending").map((r) => r.exhibition?._id))}
          sharedIds={new Set(shared.map((s) => s._id))}
        />
      ) : null}
    </div>
  );
}
