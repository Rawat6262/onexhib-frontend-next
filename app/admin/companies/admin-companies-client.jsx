"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Building2, CalendarDays, Mail, MapPin, Package, Phone } from "lucide-react";

import { getAdminCompaniesPage } from "@/models/company.model";
import { getAdminExhibitionsPage } from "@/models/exhibition.model";
import TablePagination from "@/components/dashboard/TablePagination";
import { companyPath } from "@/lib/routes";
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
  btnRow,
  fmtDate,
  tbody,
  td,
  th,
  thead,
  timeAgo,
  tr,
} from "@/components/admin/AdminUI";

/**
 * Admin: every company (exhibitors and their businesses). Labelled "User" in
 * the old tab bar; the URL stays /admin/companies.
 *
 * Paged on the server, newest first. The backend has no company search, so the
 * box filters the page that is loaded - and says so, instead of looking like a
 * search of everything.
 */
export default function AdminCompaniesClient() {
  const [rows, setRows] = useState(null);
  const [counts, setCounts] = useState({});
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const reqRef = useRef(0);

  const load = useCallback(async () => {
    const id = ++reqRef.current;
    setRows(null);
    setError("");
    try {
      const { data } = await getAdminCompaniesPage({ page, limit: pageSize });
      if (id !== reqRef.current) return;
      setRows(data?.data ?? []);
      setTotalPages(data?.totalPages || 1);
      setCounts((c) => ({ ...c, companies: data?.companies ?? data?.total ?? 0, products: data?.products ?? 0 }));
    } catch {
      if (id !== reqRef.current) return;
      setRows([]);
      setError("Could not load companies.");
    }
  }, [page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getAdminExhibitionsPage({ page: 1, limit: 1 })
      .then(({ data }) => setCounts((c) => ({ ...c, exhibitions: data?.total ?? 0 })))
      .catch(() => setCounts((c) => ({ ...c, exhibitions: null })));
  }, []);

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!rows || !q) return rows;
    return rows.filter((c) =>
      [c.company_name, c.company_address, c.company_phone_number, c.company_email, c.company_nature, c.company_country].some((f) =>
        String(f ?? "").toLowerCase().includes(q)
      )
    );
  }, [rows, filter]);

  return (
    <AdminPage>
      <AdminHeader
        title="Companies"
        description="Every company listed on OneXhib: the businesses exhibiting at shows and the products they bring."
      />

      <StatGrid cols={3}>
        <StatCard icon={<Building2 size={16} />} tone="violet" label="Companies" value={counts.companies} />
        <StatCard href="/admin/products" icon={<Package size={16} />} tone="sky" label="Products" value={counts.products} />
        <StatCard href="/admin/organisers" icon={<CalendarDays size={16} />} label="Exhibitions" value={counts.exhibitions} />
      </StatGrid>

      <Panel
        title="All companies"
        count={counts.companies}
        description="Newest first."
        toolbar={
          <SearchField
            value={filter}
            onChange={setFilter}
            placeholder="Filter this page"
            title="Filters the companies on this page only"
            className="sm:w-72"
          />
        }
        footer={
          rows && rows.length ? (
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={counts.companies || 0}
              totalPages={totalPages}
              shownCount={shown.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              pageSizeOptions={[25, 50, 100]}
              itemLabel="companies"
            />
          ) : null
        }
      >
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : rows === null ? (
          <LoadingRows rows={5} />
        ) : shown.length === 0 ? (
          <EmptyState icon={<Building2 size={22} aria-hidden="true" />} title={rows.length ? "Nothing on this page matches" : "No companies yet"}>
            {rows.length ? "The filter only looks at this page. Try the next page or clear it." : null}
          </EmptyState>
        ) : (
          <>
            <div className="hidden max-h-[70vh] overflow-auto overscroll-contain lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className={thead}>
                    <th scope="col" className={th}>Company</th>
                    <th scope="col" className={th}>Contact</th>
                    <th scope="col" className={th}>Address</th>
                    <th scope="col" className={th}>Added</th>
                    <th scope="col" className={th}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className={tbody}>
                  {shown.map((c) => (
                    <tr key={c._id} className={tr}>
                      <td className={`${td} max-w-[18rem]`}>
                        <CompanyCell c={c} />
                      </td>
                      <td className={`${td} text-[13px]`}>
                        <ContactLines c={c} />
                      </td>
                      <td className={`${td} max-w-[18rem] text-[13px] text-gray-600 dark:text-gray-400`}>
                        <span className="line-clamp-2">{c.company_address || "—"}</span>
                      </td>
                      <td className={`${td} whitespace-nowrap text-[13px] text-gray-700 dark:text-gray-300`}>
                        {fmtDate(c.createdAt)}
                        <p className="text-xs text-gray-400">{timeAgo(c.createdAt)}</p>
                      </td>
                      <td className={`${td} text-right`}>
                        <div className="flex justify-end gap-1.5">
                          <Link href={companyPath(c.company_name, c._id)} target="_blank" rel="noopener" className={btnRow}>
                            View
                          </Link>
                          <Link href={`/companies/${c._id}`} className={btnRow}>
                            Manage
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className={`lg:hidden ${tbody}`}>
              {shown.map((c) => (
                <li key={c._id} className="space-y-2.5 px-4 py-4 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <CompanyCell c={c} />
                    <Link href={companyPath(c.company_name, c._id)} target="_blank" rel="noopener" className={btnRow}>
                      View
                    </Link>
                  </div>
                  <div className="text-[13px]">
                    <ContactLines c={c} />
                  </div>
                  {c.company_address ? (
                    <p className="flex items-start gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <MapPin size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{c.company_address}</span>
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </AdminPage>
  );
}

function CompanyCell({ c }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="flex min-w-0 items-center gap-3">
      {c.company_image_url && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- uploaded or hotlinked logos; failures fall back
        <img
          src={c.company_image_url}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-10 w-10 shrink-0 rounded-xl bg-white object-contain p-0.5 ring-1 ring-gray-200 dark:ring-gray-800"
        />
      ) : (
        <Monogram name={c.company_name} />
      )}
      <div className="min-w-0">
        <p className="truncate font-semibold text-gray-900 dark:text-gray-100" title={c.company_name}>
          {c.company_name || "Unnamed company"}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {c.company_nature ? <Badge tone="violet">{c.company_nature}</Badge> : null}
          {c.company_country ? <span className="text-xs text-gray-500 dark:text-gray-400">{c.company_country}</span> : null}
        </div>
      </div>
    </div>
  );
}

function ContactLines({ c }) {
  if (!c.company_email && !c.company_phone_number) return <span className="text-gray-400">—</span>;
  return (
    <div className="min-w-0 space-y-0.5">
      {c.company_email ? (
        <p className="flex items-center gap-1.5 truncate text-gray-800 dark:text-gray-200">
          <Mail size={12} aria-hidden="true" className="shrink-0 text-gray-400" />
          <span className="truncate">{c.company_email}</span>
        </p>
      ) : null}
      {c.company_phone_number ? (
        <p className="flex items-center gap-1.5 tabular-nums text-gray-600 dark:text-gray-400">
          <Phone size={12} aria-hidden="true" className="shrink-0 text-gray-400" />
          {c.company_phone_number}
        </p>
      ) : null}
    </div>
  );
}
