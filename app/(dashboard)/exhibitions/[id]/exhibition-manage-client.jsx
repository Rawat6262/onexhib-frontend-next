"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CalendarDays,
  Eye,
  FileSpreadsheet,
  FileText,
  MapPin,
  Newspaper,
  Package,
  Pencil,
  Plus,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteExhibition as deleteExhibitionRequest,
  adminDeleteExhibition,
  findExhibitionByOrganiser,
} from "@/models/exhibition.model";
import { getCompaniesForExhibition } from "@/models/company.model";
import { useAuth } from "@/components/auth/AuthProvider";
import { ROLES } from "@/lib/auth";
import TablePagination from "@/components/dashboard/TablePagination";
import { NoResults, PageHeader, Panel, StatCard, btnPrimary, btnSecondary } from "@/components/dashboard/ui";
import { Badge, Monogram, SearchField, btnRow, fmtDate, tbody, td, th, thead, tr } from "@/components/admin/AdminUI";
import { exhibitionPath } from "@/lib/routes";
import { confirmAction } from "@/lib/confirm";

// Modals are only needed once opened, so their code (and for the location
// forms, country-state-city's ~2.3 MB dataset) is split out of this page's
// first-load bundle.
const CompanyPopupForm = dynamic(() => import("@/components/popups/CompanyPopupForm"), { ssr: false });
const ExhibitionPopup = dynamic(() => import("@/components/popups/ExhibitionPopup"), { ssr: false });
const CompanyEditPopup = dynamic(() => import("@/components/popups/CompanyEditPopup"), { ssr: false });
const CompanyExcelUploadModal = dynamic(() => import("@/components/popups/CompanyExcelUploadModal"), { ssr: false });
const AddNewsModal = dynamic(() => import("@/components/news/AddNewsModal"), { ssr: false });

/**
 * Migrated from views/organiser/ExhibitionManageView.jsx.
 *
 * Unchanged: fetching, search, pagination, delete flow, every popup and class.
 *
 * Changed:
 *  - the sidebar is rendered by app/(dashboard)/layout.jsx, not here;
 *  - `id` arrives as a prop from the Server Component page, not useParams();
 *  - admin mode is derived from the signed-in user's role. The Vite version read
 *    it from React Router's location.state, which has no App Router equivalent —
 *    and which any user could set by navigating with their own state object.
 *    Reading the role instead is both portable and harder to spoof (Express
 *    still authorises the delete either way).
 */
export default function ExhibitionManageClient({ id }) {
  const router = useRouter();
  const { role } = useAuth();
  const isAdmin = role === ROLES.ADMIN;

  const [exhibition, setExhibition] = useState({});
  const [companies, setCompanies] = useState([]);
  const [showdetail, setDetails] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showFormnew, setShowFormnew] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState(null);

  const [itemsPerPage, setItemsPerPage] = useState(10);

  const deleteExhibition = async () => {
    try {
      const ok = await confirmAction({
        title: "Delete this exhibition?",
        description: `“${exhibition.exhibition_name || "This exhibition"}” and the companies listed at it will be removed from OneXhib. This cannot be undone.`,
        confirmLabel: "Delete exhibition",
      });
      if (!ok) return;

      if (isAdmin) {
        await adminDeleteExhibition(id);
      } else {
        await deleteExhibitionRequest(id);
      }
      toast.success("Exhibition deleted successfully!");
      router.push(isAdmin ? "/admin/organisers" : "/organiser");
    } catch (err) {
      console.error("Error deleting exhibition:", err);
      toast.error("Failed to delete exhibition");
    }
  };

  const fetchExhibitionData = useCallback(async () => {
    try {
      const { data } = await findExhibitionByOrganiser(id);
      setExhibition(data);
    } catch (err) {
      console.error("Error fetching exhibition:", err);
    }
  }, [id]);

  const fetchCompany = useCallback(async () => {
    try {
      const { data } = await getCompaniesForExhibition(id);
      setCompanies(Array.isArray(data) ? data : [data]);
    } catch (error) {
      console.error("Error fetching company:", error.response?.data?.message || error.message);
    }
  }, [id]);

  const filteredCompanies = useMemo(() => {
    const query = (search || "").trim().toLowerCase();
    if (!query) return companies;

    return companies.filter((c, index) => {
      const rowNumber = String(index + 1);
      return (
        rowNumber.includes(query) ||
        String(c?.company_name || "").toLowerCase().includes(query) ||
        String(c?.company_email || "").toLowerCase().includes(query) ||
        String(c?.company_phone_number || "").toLowerCase().includes(query)
      );
    });
  }, [companies, search]);

  useEffect(() => {
    fetchExhibitionData();
    fetchCompany();
  }, [fetchExhibitionData, fetchCompany]);

  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage) || 1;
  // A delete or a bigger page size can leave the current page past the end.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCompanies = filteredCompanies.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  const status = statusOf(exhibition.starting_date, exhibition.ending_date);
  const where = [exhibition.venue, exhibition.city, exhibition.country].filter(Boolean).join(", ") || exhibition.exhibition_address;
  const backHref = isAdmin ? "/admin/organisers" : "/organiser";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href={backHref}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition hover:text-[#2B3FB8] dark:text-gray-400 dark:hover:text-blue-300"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        {isAdmin ? "All exhibitions" : "My exhibitions"}
      </Link>

      <PageHeader
        eyebrow="Manage exhibition"
        title={exhibition.exhibition_name || "Exhibition"}
        intro={
          exhibition._id ? (
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={15} aria-hidden="true" className="text-gray-400" />
                {dateRange(exhibition.starting_date, exhibition.ending_date)}
              </span>
              {where ? (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <MapPin size={15} aria-hidden="true" className="shrink-0 text-gray-400" />
                  <span className="line-clamp-1">{where}</span>
                </span>
              ) : null}
              {status ? <Badge tone={status.tone}>{status.label}</Badge> : null}
            </span>
          ) : null
        }
        actions={
          <>
            {exhibition._id ? (
              <Link
                href={exhibitionPath(exhibition.exhibition_name, exhibition._id)}
                target="_blank"
                rel="noopener"
                className={btnSecondary}
              >
                <Eye size={16} aria-hidden="true" />
                View public page
              </Link>
            ) : null}
            <button type="button" className={btnSecondary} onClick={() => setDetails(true)}>
              <FileText size={16} aria-hidden="true" />
              Details
            </button>
            <button
              type="button"
              onClick={deleteExhibition}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/40 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <Trash2 size={16} aria-hidden="true" />
              Delete
            </button>
          </>
        }
      />
      {showdetail && <ExhibitionPopup onClose={() => setDetails(false)} exhibitionId={id} />}

      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard accent icon={<Building2 size={16} />} label="Companies exhibiting" value={companies.length} />
        <StatCard
          icon={<CalendarClock size={16} />}
          tone={status?.tone === "emerald" ? "emerald" : "sky"}
          label="Status"
          value={status ? <span className="text-xl sm:text-2xl">{status.label}</span> : null}
          hint={countdown(exhibition.starting_date, exhibition.ending_date)}
        />
        <StatCard
          icon={<Tag size={16} />}
          tone="violet"
          label="Category"
          value={exhibition.category ? <span className="block truncate text-lg sm:text-xl">{exhibition.category}</span> : null}
        />
      </div>

      <Panel
        title="Companies exhibiting"
        count={filteredCompanies.length}
        description="Add the companies at this show. Open one to manage its products."
        toolbar={
          <>
            <SearchField
              value={search}
              onChange={(v) => {
                setSearch(v);
                setCurrentPage(1);
              }}
              placeholder="Search name, email, phone"
              className="sm:w-60"
            />
            <button type="button" onClick={() => setShowFormnew(true)} className={btnSecondary}>
              <Newspaper size={16} aria-hidden="true" />
              Add news
            </button>
            <button type="button" onClick={() => setShowUploadModal(true)} className={btnSecondary}>
              <FileSpreadsheet size={16} aria-hidden="true" />
              Import Excel
            </button>
            <button type="button" onClick={() => setShowForm(true)} className={btnPrimary}>
              <Plus size={16} aria-hidden="true" />
              Add company
            </button>
          </>
        }
        footer={
          filteredCompanies.length ? (
            <TablePagination
              page={currentPage}
              pageSize={itemsPerPage}
              total={filteredCompanies.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
              itemLabel="companies"
            />
          ) : null
        }
      >
        {paginatedCompanies.length === 0 ? (
          <NoResults title={search ? "No companies match" : "No companies yet"} icon={<Building2 size={22} aria-hidden="true" />}>
            {search ? "Try another search." : "Add the companies exhibiting at this show, one at a time or from a spreadsheet."}
          </NoResults>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className={thead}>
                    <th scope="col" className={th}>Company</th>
                    <th scope="col" className={th}>Contact</th>
                    <th scope="col" className={th}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className={tbody}>
                  {paginatedCompanies.map((c, index) => (
                    <tr key={c._id || index} className={tr}>
                      <td className={td}>
                        <div className="flex min-w-0 items-center gap-3">
                          <Monogram name={c.company_name} />
                          <p className="truncate font-semibold text-gray-900 dark:text-gray-100">{c.company_name}</p>
                        </div>
                      </td>
                      <td className={`${td} text-[13px]`}>
                        <p className="truncate text-gray-800 dark:text-gray-200">{c.company_email || "—"}</p>
                        {c.company_phone_number ? <p className="text-xs tabular-nums text-gray-500 dark:text-gray-400">{c.company_phone_number}</p> : null}
                      </td>
                      <td className={td}>
                        <CompanyActions c={c} onEdit={() => setEditingId(c._id)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className={`md:hidden ${tbody}`}>
              {paginatedCompanies.map((c, index) => (
                <li key={c._id || index} className="space-y-3 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Monogram name={c.company_name} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900 dark:text-gray-100">{c.company_name}</p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {[c.company_email, c.company_phone_number].filter(Boolean).join(" · ") || "No contact details"}
                      </p>
                    </div>
                  </div>
                  <CompanyActions c={c} onEdit={() => setEditingId(c._id)} wrap />
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      {showFormnew && <AddNewsModal onClose={() => setShowFormnew(false)} />}
      {showForm && <CompanyPopupForm Close={() => setShowForm(false)} data={id} onCompanyAdded={fetchCompany} />}
      <CompanyExcelUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={fetchCompany}
        exhibitionId={id}
      />
      <CompanyEditPopup open={Boolean(editingId)} companyId={editingId} onClose={() => setEditingId(null)} />
    </div>
  );
}

function CompanyActions({ c, onEdit, wrap = false }) {
  return (
    <div className={`flex gap-1.5 ${wrap ? "flex-wrap" : "justify-end"}`}>
      <Link href={`/companies/${c._id}`} className={btnRow} title="Products and details">
        <Package size={13} aria-hidden="true" />
        Products
      </Link>
      <button type="button" onClick={onEdit} className={btnRow}>
        <Pencil size={13} aria-hidden="true" />
        Edit
      </button>
    </div>
  );
}

const day = (v) => (v ? String(v).slice(0, 10) : "");

function statusOf(start, end) {
  const now = new Date().toISOString().slice(0, 10);
  const s = day(start);
  const e = day(end) || s;
  if (!s) return null;
  if (e < now) return { label: "Ended", tone: "gray" };
  if (s > now) return { label: "Upcoming", tone: "sky" };
  return { label: "Live now", tone: "emerald" };
}

function dateRange(a, b) {
  if (!a) return "Dates not set";
  const from = fmtDate(a);
  const to = b ? fmtDate(b) : "";
  return to && to !== from ? `${from} – ${to}` : from;
}

/** "Opens in 12 days" / "Ends in 2 days" / "Ended 3 days ago". */
function countdown(start, end) {
  const s = day(start);
  if (!s) return "";
  const today = Date.parse(new Date().toISOString().slice(0, 10));
  const d = (iso) => Math.round((Date.parse(iso) - today) / 86400000);
  const toStart = d(s);
  const toEnd = d(day(end) || s);
  if (toStart > 0) return toStart === 1 ? "Opens tomorrow" : `Opens in ${toStart} days`;
  if (toEnd >= 0) return toEnd === 0 ? "Last day today" : `Ends in ${toEnd} day${toEnd === 1 ? "" : "s"}`;
  return `Ended ${-toEnd} day${toEnd === -1 ? "" : "s"} ago`;
}
