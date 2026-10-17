"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Package, Tag } from "lucide-react";

import { getAdminProductsPage } from "@/models/product.model";
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
 * Admin: every product exhibitors have listed. Paged on the server, newest
 * first (the endpoint used to return them in no particular order). Like
 * Companies, the box filters the loaded page and is labelled that way.
 */

function price(p) {
  if (p.price === undefined || p.price === null || p.price === "") return null;
  const n = Number(p.price);
  const amount = Number.isFinite(n) ? n.toLocaleString("en-IN") : String(p.price);
  return p.unit ? `${amount} / ${p.unit}` : amount;
}

export default function AdminProductsClient() {
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(undefined);
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
      const { data } = await getAdminProductsPage({ page, limit: pageSize });
      if (id !== reqRef.current) return;
      setRows(Array.isArray(data?.data) ? data.data : []);
      setTotal(data?.total || 0);
      setTotalPages(data?.totalPages || 1);
    } catch {
      if (id !== reqRef.current) return;
      setRows([]);
      setTotal(null);
      setError("Could not load products.");
    }
  }, [page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!rows || !q) return rows;
    return rows.filter((p) =>
      [p.product_name, p.category, p.details, p.price].some((f) => String(f ?? "").toLowerCase().includes(q))
    );
  }, [rows, filter]);

  // Category spread on the loaded page - a quick sense of what is being listed.
  const topCategories = useMemo(() => {
    const m = new Map();
    for (const p of rows || []) if (p.category) m.set(p.category, (m.get(p.category) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [rows]);

  return (
    <AdminPage>
      <AdminHeader title="Products" description="Every product exhibitors have added to their company pages." />

      <StatGrid cols={2}>
        <StatCard icon={<Package size={16} />} tone="sky" label="Products" value={total} />
        <StatCard
          icon={<Tag size={16} />}
          tone="violet"
          label="Top category on this page"
          value={rows === null ? undefined : topCategories[0]?.[0] ? <span className="block truncate text-lg sm:text-xl">{topCategories[0][0]}</span> : null}
          hint={topCategories[0] ? `${topCategories[0][1]} of ${rows.length} products shown` : ""}
        />
      </StatGrid>

      <Panel
        title="All products"
        count={total ?? undefined}
        description="Newest first."
        toolbar={
          <SearchField
            value={filter}
            onChange={setFilter}
            placeholder="Filter this page"
            title="Filters the products on this page only"
            className="sm:w-72"
          />
        }
        footer={
          rows && rows.length ? (
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={total || 0}
              totalPages={totalPages}
              shownCount={shown.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              pageSizeOptions={[25, 50, 100]}
              itemLabel="products"
            />
          ) : null
        }
      >
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : rows === null ? (
          <LoadingRows rows={5} />
        ) : shown.length === 0 ? (
          <EmptyState icon={<Package size={22} aria-hidden="true" />} title={rows.length ? "Nothing on this page matches" : "No products yet"}>
            {rows.length ? "The filter only looks at this page. Try the next page or clear it." : null}
          </EmptyState>
        ) : (
          <>
            <div className="hidden max-h-[70vh] overflow-auto overscroll-contain md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className={thead}>
                    <th scope="col" className={th}>Product</th>
                    <th scope="col" className={th}>Category</th>
                    <th scope="col" className={`${th} text-right`}>Price</th>
                    <th scope="col" className={th}>Added</th>
                    <th scope="col" className={th}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className={tbody}>
                  {shown.map((p) => (
                    <tr key={p._id} className={tr}>
                      <td className={`${td} max-w-[24rem]`}>
                        <ProductCell p={p} />
                      </td>
                      <td className={td}>{p.category ? <Badge tone="sky">{p.category}</Badge> : <span className="text-gray-400">—</span>}</td>
                      <td className={`${td} whitespace-nowrap text-right text-[13px] font-semibold tabular-nums text-gray-900 dark:text-gray-100`}>
                        {price(p) ?? <span className="font-normal text-gray-400">—</span>}
                      </td>
                      <td className={`${td} whitespace-nowrap text-[13px] text-gray-700 dark:text-gray-300`}>
                        {fmtDate(p.createdAt)}
                        <p className="text-xs text-gray-400">{timeAgo(p.createdAt)}</p>
                      </td>
                      <td className={`${td} text-right`}>
                        <Link href={`/products/${p._id}`} target="_blank" rel="noopener" className={btnRow}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className={`md:hidden ${tbody}`}>
              {shown.map((p) => (
                <li key={p._id} className="space-y-2 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <ProductCell p={p} />
                    <Link href={`/products/${p._id}`} target="_blank" rel="noopener" className={btnRow}>
                      View
                    </Link>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[13px]">
                    {p.category ? <Badge tone="sky">{p.category}</Badge> : null}
                    {price(p) ? <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{price(p)}</span> : null}
                    <span className="text-xs text-gray-400">added {timeAgo(p.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </AdminPage>
  );
}

function ProductCell({ p }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="flex min-w-0 items-center gap-3">
      {p.product_url && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- uploaded images; failures fall back
        <img
          src={p.product_url}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-11 w-11 shrink-0 rounded-xl bg-white object-cover ring-1 ring-gray-200 dark:ring-gray-800"
        />
      ) : (
        <Monogram name={p.product_name} size="h-11 w-11" />
      )}
      <div className="min-w-0">
        <p className="truncate font-semibold text-gray-900 dark:text-gray-100" title={p.product_name}>
          {p.product_name || "Unnamed product"}
        </p>
        {p.details ? <p className="line-clamp-1 text-xs text-gray-500 dark:text-gray-400">{p.details}</p> : null}
      </div>
    </div>
  );
}
