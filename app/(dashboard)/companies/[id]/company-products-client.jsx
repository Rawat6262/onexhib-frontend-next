"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Eye,
  FileSpreadsheet,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  Plus,
  Tag,
  Trash2,
} from "lucide-react";

import { getProductsForCompany, deleteProduct } from "@/models/product.model";
import { getCompanyById, deleteCompany } from "@/models/company.model";
import TablePagination from "@/components/dashboard/TablePagination";
import { NoResults, PageHeader, Panel, StatCard, btnPrimary, btnSecondary } from "@/components/dashboard/ui";
import { Badge, LoadingRows, Monogram, SearchField, btnRow, btnRowDanger, tbody, td, th, thead, tr } from "@/components/admin/AdminUI";
import { companyPath, productPath } from "@/lib/routes";
import { confirmAction } from "@/lib/confirm";

// Modals are only needed once opened, so their code is split out of this
// page's first-load bundle.
const ProductPopupForm = dynamic(() => import("@/components/popups/ProductPopupForm"), { ssr: false });
const ProductEditPopup = dynamic(() => import("@/components/popups/ProductEditPopup"), { ssr: false });
const ProductExcelUploadModal = dynamic(() => import("@/components/popups/ProductExcelUploadModal"), { ssr: false });

/**
 * One company at an exhibition, and its products.
 *
 * `company.createdBy` is the EXHIBITION this company was added to (not a
 * user), which is where "back" and the post-delete redirect go.
 */

function price(p) {
  if (p.price === undefined || p.price === null || p.price === "") return null;
  const n = Number(p.price);
  const amount = Number.isFinite(n) ? `₹${n.toLocaleString("en-IN")}` : String(p.price);
  return p.unit ? `${amount} / ${p.unit}` : amount;
}

export default function CompanyProductsClient({ id }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [company, setCompany] = useState(null);
  const [products, setProducts] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editingId, setEditingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await getProductsForCompany(id);
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching products:", error.message);
      setProducts([]);
    }
  }, [id]);

  const fetchCompany = useCallback(async () => {
    try {
      const { data } = await getCompanyById(id);
      setCompany(data || {});
    } catch (error) {
      console.error("Error fetching company:", error.message);
      setCompany({});
    }
  }, [id]);

  useEffect(() => {
    fetchCompany();
    fetchProducts();
  }, [fetchCompany, fetchProducts]);

  const removeCompany = async () => {
    const ok = await confirmAction({
      title: "Delete this company?",
      description: `“${company?.company_name || "This company"}” and all its products will be removed. This cannot be undone.`,
      confirmLabel: "Delete company",
    });
    if (!ok) return;
    try {
      await deleteCompany(company._id);
      toast.success("Company deleted.");
      router.push(company.createdBy ? `/exhibitions/${company.createdBy}` : "/organiser");
    } catch (err) {
      console.error("Error deleting company:", err);
      toast.error("Could not delete the company.");
    }
  };

  const removeProduct = async (productId) => {
    setBusyId(productId);
    try {
      await deleteProduct(productId);
      toast.success("Product deleted.");
      fetchProducts();
    } catch (err) {
      console.error("Error deleting product:", err);
      toast.error("Could not delete the product.");
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  const filteredData = useMemo(() => {
    const q = search.toLowerCase();
    return (products || []).filter((item) =>
      [item.product_name, item.category, item.price].some((f) => f?.toString().toLowerCase().includes(q))
    );
  }, [products, search]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const categories = useMemo(() => new Set((products || []).map((p) => p.category).filter(Boolean)).size, [products]);
  const c = company || {};

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {c.createdBy ? (
        <Link
          href={`/exhibitions/${c.createdBy}`}
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition hover:text-[#2B3FB8] dark:text-gray-400 dark:hover:text-blue-300"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Back to the exhibition
        </Link>
      ) : null}

      <PageHeader
        eyebrow="Manage company"
        title={company === null ? "Loading…" : c.company_name || "Company"}
        intro={c.company_nature ? <Badge tone="violet">{c.company_nature}</Badge> : null}
        actions={
          <>
            {c._id ? (
              <Link href={companyPath(c.company_name, c._id)} target="_blank" rel="noopener" className={btnSecondary}>
                <Eye size={16} aria-hidden="true" />
                View public page
              </Link>
            ) : null}
            <button
              type="button"
              className={btnSecondary}
              onClick={() => c._id && window.open(`/api/brochure/${c._id}`, "_blank")}
              disabled={!c._id}
            >
              <Download size={16} aria-hidden="true" />
              Brochure
            </button>
            <button
              type="button"
              onClick={removeCompany}
              disabled={!c._id}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-500/40 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <Trash2 size={16} aria-hidden="true" />
              Delete
            </button>
          </>
        }
      />

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-1 lg:grid-cols-1">
          <StatCard accent icon={<Package size={16} />} label="Products" value={products ? products.length : undefined} />
          <StatCard icon={<Tag size={16} />} tone="violet" label="Categories" value={products ? categories : undefined} />
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 lg:col-span-2 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-start gap-4">
            {c.company_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- uploaded logo
              <img src={c.company_image_url} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-white object-contain p-1 ring-1 ring-gray-200 dark:ring-gray-800" />
            ) : (
              <Monogram name={c.company_name} size="h-14 w-14" />
            )}
            <dl className="grid min-w-0 flex-1 gap-2 text-sm sm:grid-cols-2">
              <Info icon={<Phone size={14} />} label="Phone" value={c.company_phone_number} />
              <Info icon={<Mail size={14} />} label="Email" value={c.company_email} />
              <Info icon={<Globe size={14} />} label="Website" value={c.company_website} />
              <Info icon={<MapPin size={14} />} label="Address" value={c.company_address} wide />
            </dl>
          </div>
          <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">About</p>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {c.about_company || <span className="italic text-gray-400">No description yet. Add one with Edit on the exhibition page.</span>}
            </p>
          </div>
        </section>
      </div>

      <Panel
        title="Products"
        count={products ? filteredData.length : undefined}
        toolbar={
          <>
            <SearchField
              value={search}
              onChange={(v) => {
                setSearch(v);
                setCurrentPage(1);
              }}
              placeholder="Search products"
              className="sm:w-60"
            />
            <button type="button" className={btnSecondary} onClick={() => setShowUploadModal(true)}>
              <FileSpreadsheet size={16} aria-hidden="true" />
              Import Excel
            </button>
            <button type="button" className={btnPrimary} onClick={() => setShowForm(true)}>
              <Plus size={16} aria-hidden="true" />
              Add product
            </button>
          </>
        }
        footer={
          filteredData.length ? (
            <TablePagination
              page={currentPage}
              pageSize={itemsPerPage}
              total={filteredData.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
              itemLabel="products"
            />
          ) : null
        }
      >
        {products === null ? (
          <LoadingRows rows={3} />
        ) : paginatedData.length === 0 ? (
          <NoResults title={search ? "No products match" : "No products yet"} icon={<Package size={22} aria-hidden="true" />}>
            {search ? "Try another search." : "Add what this company is showing, one at a time or from a spreadsheet."}
          </NoResults>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className={thead}>
                    <th scope="col" className={th}>Product</th>
                    <th scope="col" className={th}>Category</th>
                    <th scope="col" className={`${th} text-right`}>Price</th>
                    <th scope="col" className={th}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className={tbody}>
                  {paginatedData.map((p) => (
                    <tr key={p._id} className={tr}>
                      <td className={td}>
                        <ProductCell p={p} />
                      </td>
                      <td className={td}>{p.category ? <Badge tone="sky">{p.category}</Badge> : <span className="text-gray-400">—</span>}</td>
                      <td className={`${td} whitespace-nowrap text-right font-semibold tabular-nums text-gray-900 dark:text-gray-100`}>
                        {price(p) ?? <span className="font-normal text-gray-400">—</span>}
                      </td>
                      <td className={td}>
                        <ProductActions
                          p={p}
                          confirming={confirmId === p._id}
                          busy={busyId === p._id}
                          onEdit={() => setEditingId(p._id)}
                          onAsk={() => setConfirmId(p._id)}
                          onCancel={() => setConfirmId(null)}
                          onDelete={() => removeProduct(p._id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className={`md:hidden ${tbody}`}>
              {paginatedData.map((p) => (
                <li key={p._id} className="space-y-3 px-4 py-4">
                  <ProductCell p={p} />
                  <div className="flex flex-wrap items-center gap-2 text-[13px]">
                    {p.category ? <Badge tone="sky">{p.category}</Badge> : null}
                    {price(p) ? <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{price(p)}</span> : null}
                  </div>
                  <ProductActions
                    p={p}
                    wrap
                    confirming={confirmId === p._id}
                    busy={busyId === p._id}
                    onEdit={() => setEditingId(p._id)}
                    onAsk={() => setConfirmId(p._id)}
                    onCancel={() => setConfirmId(null)}
                    onDelete={() => removeProduct(p._id)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      {showForm && (
        <ProductPopupForm Close={() => setShowForm(false)} data={id} refreshProducts={fetchProducts} exid={c.createdBy} />
      )}
      <ProductExcelUploadModal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} onSuccess={fetchProducts} companyId={id} />
      <ProductEditPopup
        open={Boolean(editingId)}
        productId={editingId}
        onClose={() => {
          setEditingId(null);
          fetchProducts();
        }}
      />
    </div>
  );
}

function Info({ icon, label, value, wide = false }) {
  return (
    <div className={`min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <span aria-hidden="true">{icon}</span>
        {label}
      </dt>
      <dd className={`mt-0.5 ${wide ? "" : "truncate"} text-gray-900 dark:text-gray-100`}>{value || <span className="text-gray-400">—</span>}</dd>
    </div>
  );
}

function ProductCell({ p }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="flex min-w-0 items-center gap-3">
      {p.product_url && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- uploaded images; failures fall back
        <img src={p.product_url} alt="" loading="lazy" onError={() => setBroken(true)} className="h-11 w-11 shrink-0 rounded-xl bg-white object-cover ring-1 ring-gray-200 dark:ring-gray-800" />
      ) : (
        <Monogram name={p.product_name} size="h-11 w-11" />
      )}
      <div className="min-w-0">
        <p className="truncate font-semibold text-gray-900 dark:text-gray-100">{p.product_name}</p>
        {p.details ? <p className="line-clamp-1 text-xs text-gray-500 dark:text-gray-400">{p.details}</p> : null}
      </div>
    </div>
  );
}

function ProductActions({ p, wrap = false, confirming, busy, onEdit, onAsk, onCancel, onDelete }) {
  return (
    <div className={`flex items-center gap-1.5 ${wrap ? "flex-wrap" : "justify-end"}`}>
      <Link href={productPath(p.product_name, p._id)} target="_blank" rel="noopener" className={btnRow}>
        <Eye size={13} aria-hidden="true" />
        View
      </Link>
      <button type="button" className={btnRow} onClick={onEdit}>
        <Pencil size={13} aria-hidden="true" />
        Edit
      </button>
      {confirming ? (
        <>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : null}
            Delete
          </button>
          <button type="button" onClick={onCancel} className={btnRow}>
            Keep
          </button>
        </>
      ) : (
        <button type="button" className={btnRowDanger} onClick={onAsk} aria-label={`Delete ${p.product_name}`}>
          <Trash2 size={13} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
