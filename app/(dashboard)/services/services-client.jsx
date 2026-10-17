"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  Eye,
  Layers,
  Loader2,
  MapPin,
  Pencil,
  PhoneCall,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

import ServiceExcelUploadModal from "@/components/popups/ServiceExcelUploadModal";
import TablePagination from "@/components/dashboard/TablePagination";
import { getMyExhibitionServices, deleteExhibitionService } from "@/models/service.model";
import { SERVICE_CATEGORIES, canonicalServiceCategory } from "@/lib/service-taxonomy";
import { useAuth } from "@/components/auth/AuthProvider";
import { PageHeader, Panel, StatCard, btnPrimary, btnSecondary, pill } from "@/components/dashboard/ui";
import { LoadingRows, Monogram, SearchField, btnRow, btnRowDanger, tbody, td, th, thead, timeAgo, tr } from "@/components/admin/AdminUI";
import { servicePath } from "@/lib/routes";

// Modals are only needed once opened, so their code (and for the location
// forms, country-state-city's ~2.3 MB dataset) is split out of this page's
// first-load bundle.
const ExhibitionServicePopupForm = dynamic(() => import("@/components/popups/ExhibitionServicePopupForm"), { ssr: false });
const ServiceEditPopup = dynamic(() => import("@/components/popups/ExhibitionServiceEditForm"), { ssr: false });

/**
 * A service provider's home: their own listings, how each is performing, and
 * where to add more.
 *
 * "Contacts" is the number of times a signed-in exhibitor opened that listing's
 * phone and address (counted by the backend; the provider viewing their own
 * listing does not count). It is the closest thing the platform has to a lead,
 * and the one number that tells a provider the listing is working.
 */
export default function ServicesClient() {
  const { user } = useAuth();
  const [services, setServices] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  /*
   * ONE PAGE AT A TIME, filtered on the server. One account owns 1,323
   * listings; loading them all to count and filter here took ~8s. The server
   * answers the current page, and with withStats=1 the totals the cards show.
   * Still /api/myexhibitionservices: the owner's own listings, no id in the URL.
   */
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState("");
  const reqRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchServices = useCallback(async () => {
    const id = ++reqRef.current;
    setServices(null);
    try {
      const { data } = await getMyExhibitionServices({
        page: currentPage,
        limit: itemsPerPage,
        withStats: "1",
        ...(query ? { search: query } : {}),
        ...(category ? { category } : {}),
      });
      if (id !== reqRef.current) return;
      setServices(data.success ? data.data : []);
      setTotal(data.total ?? data.count ?? 0);
      setTotalPages(data.totalPages || 1);
      if (data.stats) setStats(data.stats);
    } catch (error) {
      if (id !== reqRef.current) return;
      console.error("Error fetching services:", error.message);
      setServices([]);
    }
  }, [currentPage, itemsPerPage, query, category]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteExhibitionService(id);
      fetchServices();
    } catch (error) {
      console.error("Delete failed:", error.message);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  // Rows carry their CANONICAL category, so a pre-migration name still reads right.
  const paginatedData = (services || []).map((s) => {
    const resolved = canonicalServiceCategory(s.service_name, s.service_subcategory);
    return { ...s, category: resolved ? resolved.category : s.service_name };
  });

  // Category chips: the provider's own categories, in taxonomy order so they
  // do not reshuffle when a count changes.
  const categoryCounts = (() => {
    const acc = {};
    for (const c of stats?.categories || []) {
      const resolved = canonicalServiceCategory(c.name, null);
      const name = resolved ? resolved.category : c.name;
      acc[name] = (acc[name] || 0) + c.count;
    }
    return SERVICE_CATEGORIES.filter((n) => acc[n]).map((n) => ({ name: n, count: acc[n] }));
  })();

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  const firstName = user?.first_name || "";
  // Brand new: no listings at all (not merely none matching a filter).
  const isNew = stats !== null && stats.total === 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHeader
        eyebrow="Service provider dashboard"
        title={firstName ? `Welcome back, ${firstName}` : "My services"}
        intro={`Your listings in the exhibition services directory, across the ${SERVICE_CATEGORIES.length} categories exhibitors browse. List each category you offer separately so you show up on every page that fits.`}
        actions={
          <>
            <button type="button" className={btnSecondary} onClick={() => setShowUpload(true)}>
              <Upload size={16} aria-hidden="true" />
              Import Excel
            </button>
            <button type="button" className={btnPrimary} onClick={() => setShowModal(true)}>
              <Plus size={16} aria-hidden="true" />
              Add service
            </button>
          </>
        }
      />

      {showUpload && (
        <ServiceExcelUploadModal
          isOpen={showUpload}
          onClose={() => setShowUpload(false)}
          /* Refetch rather than splice the response in: a partial import inserts some rows
             and rejects others, so the server's list is the only accurate picture. */
          onSuccess={() => {
            setShowUpload(false);
            fetchServices();
          }}
        />
      )}

      {showModal && (
        <ExhibitionServicePopupForm
          onClose={() => {
            setShowModal(false);
            fetchServices();
          }}
        />
      )}

      {isNew ? (
        <Onboarding onAdd={() => setShowModal(true)} onImport={() => setShowUpload(true)} />
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard accent icon={<BriefcaseBusiness size={16} />} label="Listings" value={stats ? stats.total : undefined} />
            <StatCard
              icon={<PhoneCall size={16} />}
              tone="emerald"
              label="Contact requests"
              value={stats ? stats.contacts : undefined}
              hint={stats?.lastContactAt ? `last ${timeAgo(stats.lastContactAt)}` : "exhibitors who opened your details"}
            />
            <StatCard icon={<Layers size={16} />} tone="violet" label="Categories" value={stats ? categoryCounts.length : undefined} />
            <StatCard icon={<MapPin size={16} />} tone="sky" label="Locations" value={stats ? stats.places : undefined} />
          </div>

          {categoryCounts.length > 1 ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">By category:</span>
              {categoryCounts.map((c) => {
                const active = category === c.name;
                return (
                  <button
                    key={c.name}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setCategory(active ? "" : c.name);
                      setCurrentPage(1);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium transition ${
                      active
                        ? "border-[#2B3FB8] bg-[#2B3FB8] text-white dark:border-blue-400 dark:bg-blue-500"
                        : "border-gray-200 bg-white text-gray-700 hover:border-[#2B3FB8]/50 hover:text-[#2B3FB8] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-blue-300"
                    }`}
                  >
                    {c.name}
                    <span className={`text-[11px] tabular-nums ${active ? "text-white/80" : "text-gray-400"}`}>{c.count}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <Panel
            title="My listings"
            count={services ? total : undefined}
            toolbar={
              <SearchField
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  setCurrentPage(1);
                }}
                placeholder="Search name, speciality, city"
                className="sm:w-72"
              />
            }
            footer={
              services && total ? (
                <TablePagination
                  page={currentPage}
                  pageSize={itemsPerPage}
                  total={total}
                  totalPages={totalPages}
                  shownCount={paginatedData.length}
                  onPageChange={handlePageChange}
                  onPageSizeChange={(size) => {
                    setItemsPerPage(size);
                    setCurrentPage(1);
                  }}
                  itemLabel="listings"
                />
              ) : null
            }
          >
            {services === null ? (
              <LoadingRows rows={4} />
            ) : paginatedData.length === 0 ? (
              <div className="px-5 py-12 text-center text-[15px] text-gray-500 dark:text-gray-400">
                {search ? `No listings match “${search}”.` : "No listings in this category."}
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={thead}>
                        <th scope="col" className={th}>Listing</th>
                        <th scope="col" className={th}>Category</th>
                        <th scope="col" className={th}>Location</th>
                        <th scope="col" className={`${th} text-right`}>Contacts</th>
                        <th scope="col" className={th}><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className={tbody}>
                      {paginatedData.map((item) => (
                        <tr key={item._id} className={tr}>
                          <td className={`${td} min-w-[14rem]`}>
                            <ListingCell item={item} />
                          </td>
                          <td className={`${td} max-w-[14rem]`}>
                            <span className={`${pill} max-w-full truncate`}>{item.category}</span>
                            {item.service_subcategory && item.service_subcategory !== "General" ? (
                              <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{item.service_subcategory}</span>
                            ) : null}
                          </td>
                          <td className={`${td} text-[13px] text-gray-600 dark:text-gray-400`}>
                            {[item.city, item.state, item.country].filter(Boolean).join(", ") || "—"}
                          </td>
                          <td className={`${td} text-right`}>
                            <Contacts item={item} />
                          </td>
                          <td className={td}>
                            <RowActions
                              item={item}
                              confirming={confirmId === item._id}
                              deleting={deletingId === item._id}
                              onEdit={() => setEditingId(item._id)}
                              onAsk={() => setConfirmId(item._id)}
                              onCancel={() => setConfirmId(null)}
                              onDelete={() => handleDelete(item._id)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className={`md:hidden ${tbody}`}>
                  {paginatedData.map((item) => (
                    <li key={item._id} className="space-y-3 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <ListingCell item={item} />
                        <Contacts item={item} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={pill}>{item.category}</span>
                        {item.service_subcategory && item.service_subcategory !== "General" ? (
                          <span className="text-xs text-gray-500 dark:text-gray-400">{item.service_subcategory}</span>
                        ) : null}
                      </div>
                      <RowActions
                        item={item}
                        wrap
                        confirming={confirmId === item._id}
                        deleting={deletingId === item._id}
                        onEdit={() => setEditingId(item._id)}
                        onAsk={() => setConfirmId(item._id)}
                        onCancel={() => setConfirmId(null)}
                        onDelete={() => handleDelete(item._id)}
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>
        </>
      )}

      {/* Mounted only while editing: the popup fetches on mount, so it must not
          render with a null id. */}
      {editingId && (
        <ServiceEditPopup
          serviceId={editingId}
          onClose={() => {
            setEditingId(null);
            fetchServices();
          }}
        />
      )}
    </div>
  );
}

function ListingCell({ item }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="flex min-w-0 items-center gap-3">
      {item.image?.url && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- provider images are arbitrary remote URLs
        <img
          src={item.image.url}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-gray-200 dark:ring-gray-800"
        />
      ) : (
        <Monogram name={item.full_name} />
      )}
      <div className="min-w-0">
        <p className="truncate font-semibold text-gray-900 dark:text-gray-100">{item.full_name}</p>
        {item.mobile_number ? <p className="text-xs tabular-nums text-gray-500 dark:text-gray-400">{item.mobile_number}</p> : null}
      </div>
    </div>
  );
}

function Contacts({ item }) {
  const n = item.contact_views || 0;
  return (
    <div className="shrink-0 text-right" title={n ? "Exhibitors who opened your contact details" : "Nobody has opened your contact details yet"}>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums ${
          n ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25" : "text-gray-400"
        }`}
      >
        <PhoneCall size={11} aria-hidden="true" />
        {n}
      </span>
      {item.last_contacted_at ? <p className="mt-0.5 text-[11px] text-gray-400">{timeAgo(item.last_contacted_at)}</p> : null}
    </div>
  );
}

function RowActions({ item, wrap = false, confirming, deleting, onEdit, onAsk, onCancel, onDelete }) {
  return (
    <div className={`flex items-center gap-1.5 ${wrap ? "flex-wrap" : "justify-end"}`}>
      <Link href={servicePath(item.full_name, item._id)} target="_blank" rel="noopener" className={btnRow} title="See your listing as exhibitors do">
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
            disabled={deleting}
            className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {deleting ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : null}
            Delete
          </button>
          <button type="button" onClick={onCancel} className={btnRow}>
            Keep
          </button>
        </>
      ) : (
        <button type="button" className={btnRowDanger} onClick={onAsk} aria-label={`Delete ${item.full_name}`}>
          <Trash2 size={13} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function Onboarding({ onAdd, onImport }) {
  const steps = [
    { n: 1, title: "Add a listing", text: "Your business name, the category you serve and your city. Add a photo of your work." },
    { n: 2, title: "One per category", text: "Do stalls and printing? List each separately so you appear on both directory pages." },
    { n: 3, title: "Get contacted", text: "Exhibitors find you by category and city, and open your details to call you." },
  ];
  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br from-white to-[#2B3FB8]/[0.04] p-6 sm:p-8 dark:border-gray-800 dark:from-gray-900 dark:to-blue-400/[0.05]">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Get your services in front of exhibitors</h2>
      <p className="mt-1 text-[15px] text-gray-600 dark:text-gray-400">It takes a couple of minutes.</p>
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
          Add your first service
        </button>
        <button type="button" className={btnSecondary} onClick={onImport}>
          <Upload size={16} aria-hidden="true" />
          Import from Excel
        </button>
      </div>
    </section>
  );
}
