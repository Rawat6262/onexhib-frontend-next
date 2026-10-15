"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CalendarDays,
  Check,
  ExternalLink,
  ImagePlus,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel, btnPrimary, btnSecondary, btnRow, btnRowDanger, inputBase } from "@/components/dashboard/ui";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ConfirmDialog from "@/components/social/ConfirmDialog";
import {
  getWorkspace,
  saveCompany,
  addProduct,
  updateProduct,
  deleteProduct,
  saveParticipation,
  removeParticipation,
} from "@/models/exhibitor.model";
import { companyPath, exhibitionPath } from "@/lib/routes";
import { refreshExhibitionPage } from "@/models/exhibition.model";
import { formatDateRange, formatPrice } from "@/lib/format";

/**
 * The exhibitor workspace: your company profile, your products, and the shows
 * you are exhibiting at. Backed by /api/exhibitor/* - every call is scoped to the
 * signed-in user's own company on the server, so this page never sends a company
 * id. Each write answers with the whole workspace, which replaces local state.
 *
 * Three tabs, in the order an exhibitor sets things up. Products and Exhibitions
 * stay locked until a company exists, because both hang off it.
 */

const TABS = [
  { key: "company", label: "Company profile", icon: Building2 },
  { key: "products", label: "Products", icon: Package },
  { key: "shows", label: "Exhibitions", icon: CalendarDays },
];

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_IMAGE = 8 * 1024 * 1024;

const message = (err, fallback) => err?.response?.data?.message || fallback;

export default function ExhibitorClient() {
  const [ws, setWs] = useState(null);
  const [phase, setPhase] = useState("loading");
  const [tab, setTab] = useState("company");

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      const { data } = await getWorkspace();
      setWs(data);
      setPhase("ready");
    } catch {
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const company = ws?.company || null;
  const products = ws?.products || [];
  const shows = ws?.participations || [];

  const steps = [
    { label: "Company profile", done: Boolean(company), tab: "company" },
    { label: "Add products", done: products.length > 0, tab: "products" },
    { label: "Exhibitions you attend", done: shows.length > 0, tab: "shows" },
  ];

  if (phase === "loading") {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12" aria-busy="true">
        <div className="h-10 w-72 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        <div className="mt-8 h-96 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }
  if (phase === "error") {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6">
        <p className="text-gray-700 dark:text-gray-300">Your workspace could not be loaded.</p>
        <button type="button" onClick={load} className={`${btnSecondary} mt-4`}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHeader
        eyebrow="Exhibitor workspace"
        title={company ? company.company_name : "Set up your company"}
        intro={
          company
            ? "Keep your company profile and products up to date, and list the exhibitions where visitors can meet you."
            : "Create your company profile to appear on OneXhib, add your products, and show visitors where to find your stand."
        }
        actions={
          company ? (
            <Link href={companyPath(company.company_name, company._id)} className={btnSecondary} target="_blank">
              <ExternalLink size={15} aria-hidden="true" />
              View public page
            </Link>
          ) : null
        }
      />

      {/* Setup checklist */}
      <ol className="mt-8 grid list-none gap-3 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.label}>
            <button
              type="button"
              onClick={() => (company || s.tab === "company" ? setTab(s.tab) : null)}
              className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition motion-reduce:transition-none ${
                s.done
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                  : "border-gray-200 bg-white hover:border-[#2B3FB8]/40 dark:border-gray-800 dark:bg-gray-900"
              }`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                  s.done ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {s.done ? <Check size={16} aria-hidden="true" /> : i + 1}
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{s.label}</span>
            </button>
          </li>
        ))}
      </ol>

      {/* Tabs */}
      <div role="tablist" aria-label="Workspace sections" className="ox-rail mt-8 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-gray-200 dark:border-gray-800">
        {TABS.map((t) => {
          const locked = !company && t.key !== "company";
          const on = tab === t.key;
          const count = t.key === "products" ? products.length : t.key === "shows" ? shows.length : null;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              disabled={locked}
              title={locked ? "Create your company profile first" : undefined}
              onClick={() => setTab(t.key)}
              className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none ${
                on
                  ? "border-[#2B3FB8] text-[#2B3FB8] dark:border-blue-300 dark:text-blue-300"
                  : "border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              <t.icon size={16} aria-hidden="true" />
              {t.label}
              {count !== null && company ? (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">{count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === "company" ? (
          <CompanyForm
            company={company}
            onSaved={(data, created) => {
              setWs(data);
              toast.success(created ? "Your company profile is live." : "Company profile saved.");
              if (created) setTab("products");
            }}
          />
        ) : null}
        {tab === "products" && company ? <Products products={products} onChange={setWs} /> : null}
        {tab === "shows" && company ? <Shows shows={shows} onChange={setWs} /> : null}
      </div>
    </div>
  );
}

/* ── Company profile ──────────────────────────────────────────────────── */

const COMPANY_FIELDS = [
  { name: "company_name", label: "Company name", required: true, max: 120 },
  { name: "company_nature", label: "What you do", required: true, max: 120, placeholder: "e.g. Home textiles manufacturer" },
  { name: "company_email", label: "Contact email", type: "email", max: 200, hint: "Visitors' messages are sent here. It is never shown on your page." },
  { name: "company_phone_number", label: "Phone", required: true, kind: "phone" },
  { name: "company_website", label: "Website", max: 300, placeholder: "https://" },
  { name: "pincode", label: "PIN code", required: true, kind: "pin" },
  { name: "company_address", label: "Address", required: true, max: 300, wide: true },
  { name: "about_company", label: "About your company", required: true, max: 3000, wide: true, textarea: true },
];

/*
 * Phone and postcode follow the business's country - the same rules the backend
 * enforces (exhibitorWorkspace.controller.js checkPhoneAndPin):
 *   India (default): 10-digit phone (+91 shown as a fixed prefix), 6-digit PIN
 *                    not starting with 0.
 *   Outside India:   7-15 digits with an optional +, and a 3-10 character
 *                    postcode of letters, digits, spaces or hyphens.
 * The inputs refuse characters that can never be valid, so the limits are felt
 * while typing rather than only on Save.
 */
const isIndia = (c) => !c || /^(india|in|bharat)$/i.test(String(c).trim());

/** Stored "+91 98765 43210" -> "9876543210" for the India input. */
function indianDigits(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
}

function phonePinErrors(form, india) {
  const e = {};
  if (india) {
    if (form.company_phone_number && !/^\d{10}$/.test(form.company_phone_number)) e.company_phone_number = "Enter a 10-digit phone number.";
    if (form.pincode && !/^[1-9]\d{5}$/.test(form.pincode)) e.pincode = "Enter a 6-digit PIN code.";
  } else {
    const digits = String(form.company_phone_number || "").replace(/\D/g, "");
    if (form.company_phone_number && (digits.length < 7 || digits.length > 15)) e.company_phone_number = "Enter a phone number of 7 to 15 digits.";
    if (form.pincode && !/^[A-Za-z0-9][A-Za-z0-9 -]{1,8}[A-Za-z0-9]$/.test(form.pincode)) e.pincode = "Enter a postcode of 3 to 10 letters or digits.";
  }
  return e;
}

function CompanyForm({ company, onSaved }) {
  const startIndia = isIndia(company?.company_country);
  const [country, setCountry] = useState(startIndia ? "" : company?.company_country || "");
  const [abroad, setAbroad] = useState(!startIndia);
  const [form, setForm] = useState(() => {
    const base = Object.fromEntries(COMPANY_FIELDS.map((f) => [f.name, company?.[f.name] || ""]));
    if (startIndia) base.company_phone_number = indianDigits(base.company_phone_number);
    return base;
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [logo, setLogo] = useState(null);
  const preview = useMemo(() => (logo ? URL.createObjectURL(logo) : null), [logo]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);
  const fileRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const found = phonePinErrors(form, !abroad);
    for (const f of COMPANY_FIELDS) if (f.required && !String(form[f.name]).trim()) found[f.name] = "This field is required.";
    if (abroad && !country.trim()) found.company_country = "Enter the country.";
    setErrors(found);
    if (Object.keys(found).length) return;

    const data = new FormData();
    for (const f of COMPANY_FIELDS) data.append(f.name, form[f.name]);
    data.append("company_country", abroad ? country.trim() : "India");
    if (logo) data.append("image", logo);
    setSaving(true);
    try {
      const res = await saveCompany(data);
      setLogo(null);
      onSaved(res.data, !company);
    } catch (err) {
      setErrors(err?.response?.data?.errors || {});
      toast.error(message(err, "Your company profile could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  const pickLogo = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) return toast.error("Please choose a JPG, PNG or WebP image.");
    if (file.size > MAX_IMAGE) return toast.error("That image is too large. The limit is 8 MB.");
    setLogo(file);
  };

  const shownLogo = preview || company?.company_image_url || null;

  return (
    <form onSubmit={submit} noValidate aria-busy={saving || undefined}>
      <Panel title="Company profile" count="Shown on your public company page and in exhibitor lists.">
        <div className="grid gap-6 p-5 lg:grid-cols-[220px_1fr]">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Logo</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative grid aspect-square w-full max-w-[220px] place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 transition hover:border-[#2B3FB8] dark:border-gray-700 dark:bg-gray-800/50"
            >
              {shownLogo ? (
                <img src={shownLogo} alt="" className="h-full w-full object-contain p-3" />
              ) : (
                <span className="flex flex-col items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <ImagePlus size={28} aria-hidden="true" />
                  Upload logo
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1.5 text-center text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
                {shownLogo ? "Change logo" : "Choose image"}
              </span>
            </button>
            <input ref={fileRef} type="file" accept={ACCEPT} onChange={pickLogo} className="sr-only" tabIndex={-1} aria-hidden="true" />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">JPG, PNG or WebP, up to 8 MB.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Business location</p>
              <div className="flex flex-wrap items-center gap-3">
                <div role="radiogroup" aria-label="Business location" className="inline-flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800/80">
                  {[
                    { key: false, label: "India" },
                    { key: true, label: "Outside India" },
                  ].map((o) => (
                    <button
                      key={String(o.key)}
                      type="button"
                      role="radio"
                      aria-checked={abroad === o.key}
                      onClick={() => {
                        setAbroad(o.key);
                        // Re-shape the numbers for the other rule set rather than keep
                        // characters the new one would refuse.
                        setForm((x) => ({
                          ...x,
                          company_phone_number: o.key ? x.company_phone_number : indianDigits(x.company_phone_number),
                          pincode: o.key ? x.pincode : String(x.pincode).replace(/\D/g, "").slice(0, 6),
                        }));
                        setErrors((e) => ({ ...e, company_phone_number: undefined, pincode: undefined }));
                      }}
                      className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition motion-reduce:transition-none ${
                        abroad === o.key
                          ? "bg-white text-[#131C55] shadow-sm dark:bg-gray-950 dark:text-white"
                          : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                {abroad ? (
                  <div className="min-w-[200px] flex-1">
                    <label htmlFor="co-country" className="sr-only">Country</label>
                    <input
                      id="co-country"
                      type="text"
                      maxLength={60}
                      placeholder="Country, e.g. Germany"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      aria-invalid={Boolean(errors.company_country)}
                      className={inputBase}
                    />
                  </div>
                ) : null}
              </div>
              {errors.company_country ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.company_country}</p> : null}
            </div>
            {COMPANY_FIELDS.map((f) => (
              <div key={f.name} className={f.wide ? "sm:col-span-2" : ""}>
                <label htmlFor={`co-${f.name}`} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {f.kind === "pin" ? (abroad ? "Postcode" : "PIN code") : f.label} {f.required ? <span className="text-red-500">*</span> : null}
                </label>
                {f.kind === "phone" ? (
                  <div className="flex">
                    {!abroad ? (
                      <span className="inline-flex items-center rounded-l-xl border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        +91
                      </span>
                    ) : null}
                    <input
                      id={`co-${f.name}`}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      maxLength={abroad ? 20 : 10}
                      placeholder={abroad ? "+44 20 7946 0958" : "98765 43210"}
                      value={form[f.name]}
                      onChange={(e) => {
                        const v = abroad ? e.target.value.replace(/[^+\d\s()-]/g, "") : e.target.value.replace(/\D/g, "").slice(0, 10);
                        setForm((x) => ({ ...x, [f.name]: v }));
                      }}
                      aria-invalid={Boolean(errors[f.name])}
                      className={`${inputBase} ${abroad ? "" : "rounded-l-none"}`}
                    />
                  </div>
                ) : f.kind === "pin" ? (
                  <input
                    id={`co-${f.name}`}
                    type="text"
                    inputMode={abroad ? "text" : "numeric"}
                    autoComplete="postal-code"
                    maxLength={abroad ? 10 : 6}
                    placeholder={abroad ? "e.g. SW1A 1AA" : "e.g. 141001"}
                    value={form[f.name]}
                    onChange={(e) => {
                      const v = abroad ? e.target.value.replace(/[^A-Za-z0-9 -]/g, "").toUpperCase() : e.target.value.replace(/\D/g, "").slice(0, 6);
                      setForm((x) => ({ ...x, [f.name]: v }));
                    }}
                    aria-invalid={Boolean(errors[f.name])}
                    className={inputBase}
                  />
                ) : f.textarea ? (
                  <textarea
                    id={`co-${f.name}`}
                    rows={5}
                    maxLength={f.max}
                    value={form[f.name]}
                    onChange={(e) => setForm((x) => ({ ...x, [f.name]: e.target.value }))}
                    aria-invalid={Boolean(errors[f.name])}
                    className={`${inputBase} h-auto py-2.5 leading-relaxed`}
                  />
                ) : (
                  <input
                    id={`co-${f.name}`}
                    type={f.type || "text"}
                    maxLength={f.max}
                    placeholder={f.placeholder}
                    value={form[f.name]}
                    onChange={(e) => setForm((x) => ({ ...x, [f.name]: e.target.value }))}
                    aria-invalid={Boolean(errors[f.name])}
                    className={inputBase}
                  />
                )}
                {errors[f.name] ? (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[f.name]}</p>
                ) : f.kind === "phone" ? (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {abroad ? "7–15 digits, with country code." : `${form[f.name].length}/10 digits.`} For OneXhib only - not shown publicly.
                  </p>
                ) : f.kind === "pin" ? (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {abroad ? "3–10 letters or digits." : `${form[f.name].length}/6 digits.`}
                  </p>
                ) : f.hint ? (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{f.hint}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end border-t border-gray-200 px-5 py-4 dark:border-gray-800">
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <Check size={16} aria-hidden="true" />}
            {saving ? "Saving…" : company ? "Save changes" : "Create company profile"}
          </button>
        </div>
      </Panel>
    </form>
  );
}

/* ── Products ─────────────────────────────────────────────────────────── */

function Products({ products, onChange }) {
  const [editing, setEditing] = useState(null); // null | "new" | product
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const confirmDelete = async () => {
    if (!deleting || busy) return;
    setBusy(true);
    try {
      const { data } = await deleteProduct(deleting._id);
      onChange(data);
      toast.success("Product deleted.");
      setDeleting(null);
    } catch (err) {
      toast.error(message(err, "The product could not be deleted."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Products appear on your company page and in the Products directory.
        </p>
        <button type="button" onClick={() => setEditing("new")} className={btnPrimary}>
          <Plus size={16} aria-hidden="true" />
          Add product
        </button>
      </div>

      {products.length ? (
        <ul className="mt-5 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p._id} className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="grid aspect-[4/3] place-items-center bg-gray-50 dark:bg-gray-800/50">
                {p.product_url ? (
                  <img src={p.product_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Package size={32} aria-hidden="true" className="text-gray-300 dark:text-gray-600" />
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="text-[11px] font-bold tracking-wide text-[#2B3FB8] uppercase dark:text-blue-300">{p.category}</p>
                <p className="mt-1 font-semibold text-gray-900 dark:text-gray-50">{p.product_name}</p>
                {formatPrice(p.price, p.unit) ? (
                  <p className="mt-1 text-sm font-semibold text-gray-700 dark:text-gray-300">{formatPrice(p.price, p.unit)}</p>
                ) : null}
                <div className="mt-auto flex gap-2 pt-4">
                  <button type="button" onClick={() => setEditing(p)} className={`${btnRow} flex-1`}>
                    <Pencil size={14} aria-hidden="true" />
                    Edit
                  </button>
                  <button type="button" onClick={() => setDeleting(p)} className={`${btnRowDanger} flex-1`}>
                    <Trash2 size={14} aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-14 text-center dark:border-gray-700 dark:bg-gray-900/50">
          <Package size={28} aria-hidden="true" className="mx-auto text-gray-400" />
          <p className="mt-3 font-semibold text-gray-900 dark:text-white">No products yet</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Add what you will be showcasing so buyers can find it before the show.</p>
        </div>
      )}

      {editing ? (
        <ProductSheet
          key={editing === "new" ? "new" : editing._id}
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(data, created) => {
            onChange(data);
            setEditing(null);
            toast.success(created ? "Product added." : "Product saved.");
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Delete this product?"
        description="It will be removed from your company page and the Products directory. This cannot be undone."
        confirmLabel="Delete product"
        pendingLabel="Deleting…"
        pending={busy}
        onConfirm={confirmDelete}
      />
    </>
  );
}

const PRODUCT_FIELDS = [
  { name: "product_name", label: "Product name", required: true, max: 150 },
  { name: "category", label: "Category", required: true, max: 120, placeholder: "e.g. Textile" },
  { name: "price", label: "Price", type: "number", placeholder: "Optional" },
  { name: "unit", label: "Unit", max: 30, placeholder: "e.g. per piece" },
  { name: "details", label: "Details", required: true, max: 3000, textarea: true },
];

function ProductSheet({ product, onClose, onSaved }) {
  const [form, setForm] = useState(() =>
    Object.fromEntries(PRODUCT_FIELDS.map((f) => [f.name, product?.[f.name] ?? ""]))
  );
  const [errors, setErrors] = useState({});
  const [image, setImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const preview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);
  const fileRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const found = {};
    for (const f of PRODUCT_FIELDS) if (f.required && !String(form[f.name]).trim()) found[f.name] = "This field is required.";
    setErrors(found);
    if (Object.keys(found).length) return;

    const data = new FormData();
    for (const f of PRODUCT_FIELDS) data.append(f.name, String(form[f.name] ?? ""));
    if (image) data.append("image", image);
    setSaving(true);
    try {
      const res = product ? await updateProduct(product._id, data) : await addProduct(data);
      onSaved(res.data, !product);
    } catch (err) {
      setErrors(err?.response?.data?.errors || {});
      toast.error(message(err, "The product could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) return toast.error("Please choose a JPG, PNG or WebP image.");
    if (file.size > MAX_IMAGE) return toast.error("That image is too large. The limit is 8 MB.");
    setImage(file);
  };

  const shown = preview || product?.product_url || null;

  return (
    <Sheet open onOpenChange={(v) => !v && !saving && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <form onSubmit={submit} noValidate aria-busy={saving || undefined} className="flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>{product ? "Edit product" : "Add a product"}</SheetTitle>
            <SheetDescription>Shown on your company page and in the Products directory.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 transition hover:border-[#2B3FB8] dark:border-gray-700 dark:bg-gray-800/50"
            >
              {shown ? (
                <img src={shown} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <ImagePlus size={28} aria-hidden="true" />
                  Add a photo
                </span>
              )}
            </button>
            <input ref={fileRef} type="file" accept={ACCEPT} onChange={pick} className="sr-only" tabIndex={-1} aria-hidden="true" />

            {PRODUCT_FIELDS.map((f) => (
              <div key={f.name}>
                <label htmlFor={`pr-${f.name}`} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {f.label} {f.required ? <span className="text-red-500">*</span> : null}
                </label>
                {f.textarea ? (
                  <textarea
                    id={`pr-${f.name}`}
                    rows={5}
                    maxLength={f.max}
                    value={form[f.name]}
                    onChange={(e) => setForm((x) => ({ ...x, [f.name]: e.target.value }))}
                    aria-invalid={Boolean(errors[f.name])}
                    className={`${inputBase} h-auto py-2.5 leading-relaxed`}
                  />
                ) : (
                  <input
                    id={`pr-${f.name}`}
                    type={f.type || "text"}
                    min={f.type === "number" ? 0 : undefined}
                    step={f.type === "number" ? "any" : undefined}
                    maxLength={f.max}
                    placeholder={f.placeholder}
                    value={form[f.name]}
                    onChange={(e) => setForm((x) => ({ ...x, [f.name]: e.target.value }))}
                    aria-invalid={Boolean(errors[f.name])}
                    className={inputBase}
                  />
                )}
                {errors[f.name] ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[f.name]}</p> : null}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-800">
            <button type="button" onClick={onClose} disabled={saving} className={btnSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <Check size={16} aria-hidden="true" />}
              {saving ? "Saving…" : product ? "Save product" : "Add product"}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/* ── Exhibitions you attend ───────────────────────────────────────────── */

function Shows({ shows, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(null); // exhibition being added
  const [stand, setStand] = useState({ hall_no: "", stall_no: "" });
  const [busy, setBusy] = useState(false);
  const listed = useMemo(() => new Set(shows.map((s) => s.exhibitionId)), [shows]);

  /*
   * Upcoming exhibitions through the public search route. With nothing typed it
   * lists the soonest upcoming shows (the route falls back to the listing for an
   * empty search), so there is always something to pick from; typing searches
   * all of them. One character is too broad to be useful, so 1 counts as empty.
   */
  const [total, setTotal] = useState(null);
  useEffect(() => {
    const q = query.trim();
    const term = q.length >= 2 ? q : "";
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/exhibitions/search?scope=upcoming&limit=12&search=${encodeURIComponent(term)}`, { signal: controller.signal });
        const data = r.ok ? await r.json() : { items: [] };
        setResults(Array.isArray(data.items) ? data.items : []);
        setTotal(typeof data.total === "number" ? data.total : null);
      } catch (err) {
        if (err?.name !== "AbortError") setResults([]);
      } finally {
        setSearching(false);
      }
    }, term ? 300 : 0);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);
  const typed = query.trim().length >= 2;

  const save = async (exhibitionId, values, done) => {
    setBusy(true);
    try {
      const { data } = await saveParticipation(exhibitionId, values);
      onChange(data);
      refreshExhibitionPage(exhibitionId); // the show's exhibitor list includes you now
      done?.();
    } catch (err) {
      toast.error(message(err, "That exhibition could not be saved."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (exhibitionId) => {
    setBusy(true);
    try {
      const { data } = await removeParticipation(exhibitionId);
      onChange(data);
      refreshExhibitionPage(exhibitionId);
      toast.success("Removed from your exhibitions.");
    } catch (err) {
      toast.error(message(err, "That exhibition could not be removed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* Listed shows */}
      <Panel title="Where you are exhibiting" count={`${shows.length} ${shows.length === 1 ? "exhibition" : "exhibitions"}`}>
        {shows.length ? (
          <ul className="list-none divide-y divide-gray-100 dark:divide-gray-800">
            {shows.map((s) => (
              <ShowRow key={s.exhibitionId} show={s} busy={busy} onSave={(v) => save(s.exhibitionId, v, () => toast.success("Stand details saved."))} onRemove={() => remove(s.exhibitionId)} />
            ))}
          </ul>
        ) : (
          <div className="px-5 py-12 text-center">
            <CalendarDays size={28} aria-hidden="true" className="mx-auto text-gray-400" />
            <p className="mt-3 font-semibold text-gray-900 dark:text-white">No exhibitions listed yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-400">
              Search for the shows you are attending. Your company then appears in that exhibition&rsquo;s exhibitor list, with your stand.
            </p>
          </div>
        )}
      </Panel>

      {/* Add a show */}
      <Panel title="Add an exhibition" count="Upcoming shows only.">
        <div className="p-5">
          <div className="relative">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
            <label htmlFor="show-search" className="sr-only">Search exhibitions</label>
            <input
              id="show-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all upcoming shows — name, city or category"
              className={`${inputBase} pl-9`}
              autoComplete="off"
            />
          </div>

          <p className="mt-3 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
            {typed
              ? total != null
                ? `${total.toLocaleString("en-US")} matching`
                : "Results"
              : "Coming up soonest"}
          </p>
          <ul className="mt-2 max-h-[34rem] list-none space-y-2 overflow-y-auto pr-1" aria-live="polite">
            {searching && !results.length ? (
              <li className="flex items-center gap-2 py-3 text-sm text-gray-500"><Loader2 size={15} className="animate-spin" aria-hidden="true" /> Searching…</li>
            ) : null}
            {!searching && typed && !results.length ? (
              <li className="py-3 text-sm text-gray-500 dark:text-gray-400">No upcoming exhibitions match.</li>
            ) : null}
            {results.map((ex) => {
              const isListed = listed.has(ex.id);
              const open = adding?.id === ex.id;
              return (
                <li key={ex.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{ex.name}</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {[formatDateRange(ex.startDate, ex.endDate), [ex.city, ex.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
                  </p>
                  {isListed ? (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <Check size={13} aria-hidden="true" /> Already listed
                    </p>
                  ) : open ? (
                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input aria-label="Hall" placeholder="Hall (optional)" maxLength={40} value={stand.hall_no} onChange={(e) => setStand((s) => ({ ...s, hall_no: e.target.value }))} className={inputBase} />
                        <input aria-label="Stall / stand" placeholder="Stall (optional)" maxLength={40} value={stand.stall_no} onChange={(e) => setStand((s) => ({ ...s, stall_no: e.target.value }))} className={inputBase} />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            save(ex.id, stand, () => {
                              toast.success(`Added ${ex.name}.`);
                              setAdding(null);
                              setStand({ hall_no: "", stall_no: "" });
                            })
                          }
                          className={`${btnPrimary} flex-1`}
                        >
                          {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                          Save
                        </button>
                        <button type="button" onClick={() => setAdding(null)} className={btnSecondary} aria-label="Cancel">
                          <X size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => { setAdding(ex); setStand({ hall_no: "", stall_no: "" }); }} className={`${btnRow} mt-2`}>
                      <Plus size={14} aria-hidden="true" />
                      I&rsquo;m exhibiting here
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </Panel>
    </div>
  );
}

function ShowRow({ show, busy, onSave, onRemove }) {
  const [hall, setHall] = useState(show.hall_no || "");
  const [stall, setStall] = useState(show.stall_no || "");
  const dirty = hall !== (show.hall_no || "") || stall !== (show.stall_no || "");
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <Link href={exhibitionPath(show.name, show.exhibitionId)} target="_blank" className="font-semibold text-gray-900 hover:text-[#2B3FB8] dark:text-gray-100 dark:hover:text-blue-300">
          {show.name}
        </Link>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <MapPin size={12} aria-hidden="true" />
          {[formatDateRange(show.startDate, show.endDate), [show.city, show.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <input aria-label={`Hall at ${show.name}`} placeholder="Hall" maxLength={40} value={hall} onChange={(e) => setHall(e.target.value)} className={`${inputBase} w-24`} />
        <input aria-label={`Stall at ${show.name}`} placeholder="Stall" maxLength={40} value={stall} onChange={(e) => setStall(e.target.value)} className={`${inputBase} w-24`} />
        {dirty ? (
          <button type="button" disabled={busy} onClick={() => onSave({ hall_no: hall, stall_no: stall })} className={btnRow} aria-label="Save stand">
            <Check size={14} aria-hidden="true" />
          </button>
        ) : null}
        <button type="button" disabled={busy} onClick={onRemove} className={btnRowDanger} aria-label={`Remove ${show.name}`}>
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}
