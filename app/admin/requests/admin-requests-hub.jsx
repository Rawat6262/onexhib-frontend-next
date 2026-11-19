"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Landmark, ShieldCheck } from "lucide-react";

import AdminRequestsClient from "./admin-requests-client";
import ListingRequestsClient from "./listing-requests-client";
import PendingVenuesClient from "./pending-venues-client";
import { useAdminPending } from "@/lib/admin-pending";

/**
 * Admin: everything waiting for a decision, in three sections.
 *
 *   access   organisers asking to edit an exhibition (AccessRequest)
 *   claims   venue, service and hotel accounts claiming a listing, and venues
 *            asking to link a show (ListingRequest)
 *   venues   centres a venue account added, hidden until approved
 *
 * The section is in the URL (?section=claims) so emails can link straight to it.
 * Each section renders its own header and puts this switcher under it.
 */

const SECTIONS = [
  { key: "access", label: "Organiser access", icon: KeyRound },
  { key: "claims", label: "Listing claims", icon: ShieldCheck },
  { key: "venues", label: "New venues", icon: Landmark },
];

export default function AdminRequestsHub() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const section = SECTIONS.some((s) => s.key === params.get("section")) ? params.get("section") : "access";
  // How many wait in each section, for the badges. Shared with the sidebar and
  // refreshed after every decision, so a badge never outlives its request.
  const waiting = useAdminPending();

  const go = (key) => router.replace(key === "access" ? pathname : `${pathname}?section=${key}`, { scroll: false });

  const nav = (
    <nav aria-label="Request types" className="mt-6 flex flex-wrap gap-2">
      {SECTIONS.map(({ key, label, icon: Icon }) => {
        const active = key === section;
        const n = waiting[key];
        return (
          <button
            key={key}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => go(key)}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold ring-1 transition motion-reduce:transition-none ${
              active
                ? "bg-ox-navy text-white ring-ox-navy dark:bg-blue-500 dark:text-gray-950 dark:ring-blue-500"
                : "bg-white text-gray-700 ring-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-800 dark:hover:bg-gray-800"
            }`}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
            {n ? (
              <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${active ? "bg-white/20" : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"}`}>
                {n}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );

  if (section === "claims") return <ListingRequestsClient nav={nav} />;
  if (section === "venues") return <PendingVenuesClient nav={nav} />;
  return <AdminRequestsClient nav={nav} />;
}
