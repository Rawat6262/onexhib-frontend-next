"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CircleCheck,
  Package,
  Plus,
  ShieldCheck,
  Star,
  TriangleAlert,
  UserPlus,
  Users,
} from "lucide-react";

import { getOrganisers } from "@/models/organiser.model";
import { getAdminAccessRequests, getFeaturedExhibitionsPage } from "@/models/exhibition.model";
import { getAdminServicesPage } from "@/models/service.model";
import TablePagination from "@/components/dashboard/TablePagination";
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
  StatCard,
  StatGrid,
  adminSelect,
  btnPrimary,
  btnSecondary,
  fmtDate,
  tbody,
  td,
  th,
  thead,
  timeAgo,
  tr,
} from "@/components/admin/AdminUI";

// Modals are only needed once opened, so their code (and for the location
// forms, country-state-city's ~2.3 MB dataset) is split out of this page's
// first-load bundle.
const NewOrganiserPopup = dynamic(() => import("@/components/popups/NewOrganiserPopup"), { ssr: false });
const ExhibitionPopupForm = dynamic(() => import("@/components/popups/ExhibitionPopupForm"), { ssr: false });

/**
 * Admin overview: the whole platform at a glance, what needs attention, and
 * every account.
 *
 * It used to be a table of accounts under four bare numbers. The numbers now
 * link to the page that holds them, "Needs attention" surfaces the jobs that
 * would otherwise wait for someone to go looking, and the account table can be
 * filtered by type - it is every signup, not only organisers.
 */

const ROLES = [
  { key: "ORGANISER", label: "Organisers", one: "Organiser", tone: "brand" },
  { key: "Exhibitor", label: "Exhibitors", one: "Exhibitor", tone: "violet" },
  { key: "EXHIBITION_SERVICE", label: "Service providers", one: "Service provider", tone: "sky" },
  { key: "VISITOR", label: "Visitors", one: "Visitor", tone: "emerald" },
  { key: "ADMIN", label: "Admins", one: "Admin", tone: "amber" },
];
const ROLE_BY_KEY = Object.fromEntries(ROLES.map((r) => [r.key, r]));
const DAY = 86400000;
const today = () => new Date().toISOString().slice(0, 10);
const fullName = (u) => `${u.first_name || ""} ${u.last_name || ""}`.trim();

export default function AdminDashboardClient() {
  const [users, setUsers] = useState(null);
  const [counts, setCounts] = useState({});
  const [featured, setFeatured] = useState(undefined);
  const [services, setServices] = useState(undefined);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [unverifiedOnly, setUnverifiedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showOrganiser, setShowOrganiser] = useState(false);
  const [showExhibition, setShowExhibition] = useState(false);

  const load = useCallback(async () => {
    setError("");
    // Three independent sources; one failing must not blank the others.
    const [u, f, s, r] = await Promise.allSettled([
      getOrganisers(),
      getFeaturedExhibitionsPage({ page: 1, limit: 100 }),
      getAdminServicesPage({ page: 1, limit: 1 }),
      getAdminAccessRequests("pending"),
    ]);
    setPendingRequests(r.status === "fulfilled" ? r.value.data?.counts?.pending || 0 : 0);
    if (u.status === "fulfilled") {
      const body = u.value.data ?? {};
      setUsers(body.data || []);
      setCounts({ exhibitions: body.exhibitions ?? null, companies: body.companies ?? null, products: body.products ?? null });
    } else {
      setUsers([]);
      setCounts({ exhibitions: null, companies: null, products: null });
      setError("Could not load accounts.");
    }
    if (f.status === "fulfilled") {
      const rows = f.value.data?.data || [];
      const now = today();
      const ended = rows.filter((e) => String(e.ending_date || e.starting_date || "").slice(0, 10) < now).length;
      setFeatured({ total: f.value.data?.total ?? rows.length, ended });
    } else setFeatured(null);
    setServices(s.status === "fulfilled" ? s.value.data?.stats ?? null : null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const insights = useMemo(() => {
    if (!users) return null;
    const now = Date.now();
    const byRole = Object.fromEntries(ROLES.map((r) => [r.key, 0]));
    let week = 0;
    let month = 0;
    let unverified = 0;
    for (const u of users) {
      if (u.designation in byRole) byRole[u.designation] += 1;
      const t = new Date(u.createdAt).getTime();
      if (now - t < 7 * DAY) week += 1;
      if (now - t < 30 * DAY) month += 1;
      if (u.isapproved === false) unverified += 1;
    }
    return { byRole, week, month, unverified };
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users || [])
      .filter((u) => role === "all" || u.designation === role)
      .filter((u) => !unverifiedOnly || u.isapproved === false)
      .filter(
        (u) =>
          !q ||
          [u.first_name, u.last_name, u.email, u.mobile_number, u.company_name, u.city, u.country].some((f) =>
            String(f ?? "").toLowerCase().includes(q)
          )
      );
  }, [users, search, role, unverifiedOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const attention = [];
  if (pendingRequests) {
    attention.push({
      text: `${pendingRequests} access ${pendingRequests === 1 ? "request is" : "requests are"} waiting`,
      sub: "Organisers asking to edit an exhibition. Approve or reject them.",
      href: "/admin/requests",
      cta: "Review",
    });
  }
  if (featured?.ended) {
    attention.push({
      text: `${featured.ended} featured ${featured.ended === 1 ? "exhibition has" : "exhibitions have"} ended`,
      sub: "They no longer show in the home page slider. Remove them to keep the list tidy.",
      href: "/admin/featured",
      cta: "Review",
    });
  }
  if (insights?.unverified) {
    attention.push({
      text: `${insights.unverified} ${insights.unverified === 1 ? "account has" : "accounts have"} not verified their email`,
      sub: "They signed up but never entered the code, so they cannot sign in yet.",
      onClick: () => {
        setRole("all");
        setSearch("");
        setUnverifiedOnly(true);
        setPage(1);
        document.getElementById("accounts")?.scrollIntoView({ behavior: "smooth" });
      },
      cta: "Show them",
    });
  }
  if (services?.last7) {
    attention.push({
      text: `${services.last7} new service ${services.last7 === 1 ? "listing" : "listings"} this week`,
      sub: "Worth a quick look for spam or duplicates.",
      href: "/admin/services",
      cta: "Open",
    });
  }

  const maxRole = Math.max(1, ...ROLES.map((r) => insights?.byRole[r.key] || 0));

  return (
    <AdminPage>
      <AdminHeader
        title="Dashboard"
        description="Everything on OneXhib at a glance: what is listed, what needs attention, and who has signed up."
        actions={
          <>
            <button type="button" onClick={() => setShowExhibition(true)} className={btnSecondary}>
              <Plus size={16} aria-hidden="true" />
              Add exhibition
            </button>
            <button type="button" onClick={() => setShowOrganiser(true)} className={btnPrimary}>
              <UserPlus size={16} aria-hidden="true" />
              New organiser
            </button>
          </>
        }
      />

      <StatGrid cols={5}>
        <StatCard href="/admin/organisers" icon={<CalendarDays size={16} />} label="Exhibitions" value={users ? counts.exhibitions : undefined} />
        <StatCard
          href="/admin/featured"
          icon={<Star size={16} />}
          tone="amber"
          label="Featured"
          value={featured === undefined ? undefined : featured?.total ?? null}
          hint={featured?.ended ? `${featured.ended} already ended` : featured ? "all live or upcoming" : ""}
          warn={Boolean(featured?.ended)}
        />
        <StatCard href="/admin/companies" icon={<Building2 size={16} />} tone="violet" label="Companies" value={users ? counts.companies : undefined} />
        <StatCard href="/admin/products" icon={<Package size={16} />} tone="sky" label="Products" value={users ? counts.products : undefined} />
        <StatCard
          href="/admin/services"
          icon={<BriefcaseBusiness size={16} />}
          tone="emerald"
          label="Services"
          value={services === undefined ? undefined : services?.total ?? null}
          hint={services ? `${services.contactViews.toLocaleString("en-US")} contact requests` : ""}
        />
      </StatGrid>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 lg:col-span-3 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <TriangleAlert size={15} aria-hidden="true" className="text-amber-500" />
            Needs attention
          </h2>
          {users === null ? (
            <div className="mt-4 space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : attention.length === 0 ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-4 text-sm text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200">
              <CircleCheck size={18} aria-hidden="true" className="shrink-0" />
              All clear. Nothing is waiting on you.
            </div>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {attention.map((a) => {
                const cta = (
                  <>
                    {a.cta}
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </>
                );
                const ctaCls = "inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[#2B3FB8] hover:underline dark:text-blue-300";
                return (
                  <li
                    key={a.text}
                    className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-white/[0.02]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{a.text}</p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{a.sub}</p>
                    </div>
                    {a.href ? (
                      <Link href={a.href} className={ctaCls}>
                        {cta}
                      </Link>
                    ) : (
                      <button type="button" onClick={a.onClick} className={ctaCls}>
                        {cta}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 lg:col-span-2 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              <Users size={15} aria-hidden="true" className="text-[#2B3FB8] dark:text-blue-300" />
              Accounts
            </h2>
            <span className="text-2xl font-extrabold tabular-nums text-gray-900 dark:text-white">
              {users ? users.length.toLocaleString("en-US") : "…"}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {insights ? (
              <>
                <strong className="font-semibold text-gray-700 dark:text-gray-300">+{insights.week}</strong> this week ·{" "}
                <strong className="font-semibold text-gray-700 dark:text-gray-300">+{insights.month}</strong> in the last 30 days
              </>
            ) : (
              "Loading…"
            )}
          </p>
          <ul className="mt-4 space-y-1.5">
            {ROLES.map((r) => {
              const n = insights?.byRole[r.key] || 0;
              const active = role === r.key;
              return (
                <li key={r.key}>
                  <button
                    type="button"
                    onClick={() => {
                      setRole(active ? "all" : r.key);
                      setPage(1);
                    }}
                    aria-pressed={active}
                    className={`grid w-full grid-cols-[8.5rem_1fr_auto] items-center gap-3 rounded-lg px-1.5 py-1 text-left text-[13px] transition ${
                      active ? "bg-[#2B3FB8]/10 dark:bg-blue-400/15" : "hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                    }`}
                  >
                    <span className={`truncate ${active ? "font-semibold text-[#2B3FB8] dark:text-blue-300" : "text-gray-700 dark:text-gray-300"}`}>{r.label}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-[#131C55] to-[#2B3FB8] dark:from-blue-500 dark:to-indigo-400"
                        style={{ width: `${insights ? Math.max(n ? 4 : 0, (n / maxRole) * 100) : 0}%` }}
                      />
                    </span>
                    <span className="w-10 text-right font-semibold tabular-nums text-gray-900 dark:text-gray-100">{n}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div id="accounts" className="scroll-mt-28">
        <Panel
          title="All accounts"
          count={users ? filtered.length : undefined}
          description="Everyone who has signed up. Filter by type or search."
          toolbar={
            <>
              {unverifiedOnly ? (
                <button
                  type="button"
                  onClick={() => setUnverifiedOnly(false)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-amber-50 px-3 text-sm font-medium text-amber-800 ring-1 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-200"
                >
                  Unverified only ✕
                </button>
              ) : null}
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setPage(1);
                }}
                aria-label="Account type"
                className={`${adminSelect} sm:w-48`}
              >
                <option value="all">All types</option>
                {ROLES.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
              <SearchField
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  setPage(1);
                }}
                placeholder="Search name, email, phone, company"
                className="sm:w-72"
              />
            </>
          }
          footer={
            users && filtered.length ? (
              <TablePagination
                page={page}
                pageSize={pageSize}
                total={filtered.length}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
                pageSizeOptions={[10, 25, 50]}
                itemLabel="accounts"
              />
            ) : null
          }
        >
          {error ? (
            <ErrorState message={error} onRetry={load} />
          ) : users === null ? (
            <LoadingRows />
          ) : pageRows.length === 0 ? (
            <EmptyState icon={<Users size={22} aria-hidden="true" />} title="No accounts match">
              Try another search or account type.
            </EmptyState>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={thead}>
                      <th scope="col" className={th}>Name</th>
                      <th scope="col" className={th}>Contact</th>
                      <th scope="col" className={th}>Type</th>
                      <th scope="col" className={th}>Location</th>
                      <th scope="col" className={th}>Joined</th>
                    </tr>
                  </thead>
                  <tbody className={tbody}>
                    {pageRows.map((u) => (
                      <tr key={u._id} className={tr}>
                        <td className={td}>
                          <div className="flex min-w-0 items-center gap-3">
                            <Monogram name={fullName(u)} size="h-9 w-9" />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-gray-900 dark:text-gray-100">{fullName(u) || "—"}</p>
                              {u.company_name ? <p className="truncate text-xs text-gray-500 dark:text-gray-400">{u.company_name}</p> : null}
                            </div>
                          </div>
                        </td>
                        <td className={`${td} text-[13px]`}>
                          <p className="max-w-[16rem] truncate text-gray-800 dark:text-gray-200">{u.email}</p>
                          {u.mobile_number ? <p className="text-xs tabular-nums text-gray-500 dark:text-gray-400">{u.mobile_number}</p> : null}
                        </td>
                        <td className={td}>
                          <div className="flex flex-wrap gap-1.5">
                            <RoleBadge role={u.designation} />
                            {u.isapproved === false ? <Badge tone="amber">Unverified</Badge> : null}
                          </div>
                        </td>
                        <td className={`${td} text-[13px] text-gray-600 dark:text-gray-400`}>
                          {[u.city, u.country].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className={`${td} whitespace-nowrap text-[13px] text-gray-700 dark:text-gray-300`}>
                          {fmtDate(u.createdAt)}
                          <p className="text-xs text-gray-400">{timeAgo(u.createdAt)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className={`md:hidden ${tbody}`}>
                {pageRows.map((u) => (
                  <li key={u._id} className="flex items-start gap-3 px-4 py-4">
                    <Monogram name={fullName(u)} size="h-9 w-9" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate font-semibold text-gray-900 dark:text-gray-100">{fullName(u) || "—"}</p>
                        <RoleBadge role={u.designation} />
                        {u.isapproved === false ? <Badge tone="amber">Unverified</Badge> : null}
                      </div>
                      <p className="truncate text-[13px] text-gray-600 dark:text-gray-400">{u.email}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {[u.company_name, [u.city, u.country].filter(Boolean).join(", "), `joined ${timeAgo(u.createdAt)}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </div>

      {showOrganiser && (
        <NewOrganiserPopup
          onClose={() => {
            setShowOrganiser(false);
            load();
          }}
        />
      )}
      {showExhibition && (
        <ExhibitionPopupForm
          onClose={() => {
            setShowExhibition(false);
            load();
          }}
        />
      )}
    </AdminPage>
  );
}

function RoleBadge({ role }) {
  const r = ROLE_BY_KEY[role];
  if (!r) return <Badge>{role || "No type"}</Badge>;
  return (
    <Badge tone={r.tone}>
      {role === "ADMIN" ? <ShieldCheck size={11} aria-hidden="true" /> : null}
      {r.one}
    </Badge>
  );
}
