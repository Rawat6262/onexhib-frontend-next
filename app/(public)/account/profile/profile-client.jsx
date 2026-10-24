"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  Briefcase,
  Building2,
  Camera,
  ExternalLink,
  Globe,
  ImagePlus,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import InitialsAvatar from "@/components/social/InitialsAvatar";
import { getMyProfile, updateMyProfile } from "@/models/account.model";
import { removeProfileAvatar, removeProfileCover, uploadProfileAvatar, uploadProfileCover } from "@/models/social.model";
import { ROLES } from "@/lib/auth";

/**
 * "Your profile": the account and the Community profile in ONE form.
 *
 * Before this there were two half-editors - the Community sheet (headline and
 * bio only, "your name and company come from your account") and nothing at
 * all for the account. Now every field a person can change about themselves
 * is here, saved with one button, and the Community profile shows the same
 * data. Email and phone are shown but locked (they are how you sign in and
 * recover the account); the account type has its own page.
 *
 * Photos save as soon as they are chosen (their own endpoints), like on the
 * Community profile; the text fields save together from the sticky bar, which
 * appears only when something changed. Only changed fields are sent.
 */

const HEADLINE_MAX = 120;
const BIO_MAX = 500;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const IMAGE_MAX = 8 * 1024 * 1024;

const ACCOUNT_KEYS = [
  "first_name",
  "last_name",
  "company_name",
  "website",
  "Your_industry",
  "products_your_looking_for",
  "country",
  "state",
  "city",
  "address",
  "pincode",
];
const SOCIAL_KEYS = ["headline", "bio"];

const ROLE_LABEL = {
  [ROLES.ORGANISER]: "Organiser",
  [ROLES.EXHIBITION_SERVICE]: "Service provider",
  [ROLES.ADMIN]: "Admin",
  [ROLES.EXHIBITOR]: "Exhibitor",
  [ROLES.VISITOR]: "Visitor",
};

const toForm = (data) => ({
  ...Object.fromEntries(ACCOUNT_KEYS.map((k) => [k, data.account?.[k] ?? ""])),
  headline: data.social?.headline ?? "",
  bio: data.social?.bio ?? "",
});

const errMsg = (err, fallback) => err?.response?.data?.message || fallback;

const input =
  "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#2B3FB8] focus:ring-4 focus:ring-[#2B3FB8]/15 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

export default function ProfileClient() {
  const { status, user, signIn } = useAuth();
  const [data, setData] = useState(null); // the saved state
  const [form, setForm] = useState(null); // what is on screen
  const [phase, setPhase] = useState("loading");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photoBusy, setPhotoBusy] = useState(null);
  const avatarInput = useRef(null);
  const coverInput = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data: body } = await getMyProfile();
      setData(body);
      setForm(toForm(body));
      setPhase("ready");
    } catch {
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authed") {
      setPhase("signed-out");
      return;
    }
    load();
  }, [status, load]);

  // Only what changed is sent, so a save never rewrites a field nobody touched.
  const changes = useMemo(() => {
    if (!data || !form) return { account: {}, social: {}, count: 0 };
    const saved = toForm(data);
    const account = Object.fromEntries(ACCOUNT_KEYS.filter((k) => form[k] !== saved[k]).map((k) => [k, form[k]]));
    const social = Object.fromEntries(SOCIAL_KEYS.filter((k) => form[k] !== saved[k]).map((k) => [k, form[k]]));
    return { account, social, count: Object.keys(account).length + Object.keys(social).length };
  }, [data, form]);

  // Leaving with unsaved text asks first.
  useEffect(() => {
    if (!changes.count) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changes.count]);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (error) setError("");
  };

  const adopt = (body) => {
    setData(body);
    setForm(toForm(body));
    // The header and menus read the cached account: show the new name there now.
    if (user && body.account) signIn({ ...user, ...body.account });
  };

  const save = async (e) => {
    e?.preventDefault();
    if (!changes.count || saving) return;
    for (const [key, label] of [["first_name", "First name"], ["last_name", "Last name"], ["country", "Country"], ["state", "State"], ["city", "City"], ["address", "Address"]]) {
      if (!String(form[key]).trim()) return setError(`${label} is required.`);
    }
    if (form.headline.trim().length > HEADLINE_MAX) return setError(`Headline cannot exceed ${HEADLINE_MAX} characters.`);
    if (form.bio.trim().length > BIO_MAX) return setError(`Bio cannot exceed ${BIO_MAX} characters.`);
    setSaving(true);
    setError("");
    try {
      const { data: body } = await updateMyProfile({ account: changes.account, social: changes.social });
      adopt(body);
      toast.success("Profile saved.");
    } catch (err) {
      setError(errMsg(err, "Could not save your profile. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const changePhoto = async (kind, file) => {
    if (file) {
      if (!IMAGE_TYPES.includes(file.type)) return toast.error("Please choose a JPG, PNG or WebP image.");
      if (file.size > IMAGE_MAX) return toast.error("That image is too large. The limit is 8 MB.");
    }
    setPhotoBusy(kind);
    try {
      let res;
      if (file) {
        const fd = new FormData();
        fd.append("image", file);
        res = await (kind === "avatar" ? uploadProfileAvatar(fd) : uploadProfileCover(fd));
      } else {
        res = await (kind === "avatar" ? removeProfileAvatar() : removeProfileCover());
      }
      const p = res?.data?.profile;
      setData((d) => ({
        ...d,
        social: {
          ...d.social,
          avatarUrl: p ? p.avatarUrl ?? null : d.social.avatarUrl,
          coverUrl: p ? p.coverUrl ?? null : d.social.coverUrl,
        },
      }));
      toast.success(`${kind === "avatar" ? "Profile photo" : "Cover"} ${file ? "updated" : "removed"}.`);
    } catch (err) {
      toast.error(errMsg(err, "Could not update the image."));
    } finally {
      setPhotoBusy(null);
    }
  };

  const pick = (kind) => (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) changePhoto(kind, file);
  };

  if (phase === "loading") {
    return (
      <div className="mt-6 space-y-5">
        <div className="h-64 animate-pulse rounded-3xl bg-gray-100 dark:bg-gray-800" />
        <div className="h-72 animate-pulse rounded-3xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }
  if (phase === "signed-out") {
    return (
      <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <UserRound size={22} aria-hidden="true" className="mx-auto text-[#131C55] dark:text-blue-300" />
        <h1 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">Sign in to edit your profile</h1>
        <Link href="/login" className="mt-4 inline-flex rounded-xl bg-[#131C55] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0E1B6B]">
          Log in
        </Link>
      </div>
    );
  }
  if (phase === "error") {
    return (
      <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-500/30 dark:bg-red-500/10">
        <p className="text-sm text-red-700 dark:text-red-300">Your profile could not be loaded.</p>
        <button type="button" onClick={load} className="mt-3 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 dark:text-red-300">
          Try again
        </button>
      </div>
    );
  }

  const account = data.account;
  const name = [form.first_name, form.last_name].filter(Boolean).join(" ") || "Your name";
  const place = [form.city, form.country].filter(Boolean).join(", ");

  return (
    <form onSubmit={save} aria-busy={saving || undefined} className="mt-6 pb-28" noValidate>
      {/* ── Identity: cover, photo, name - what people see ─────────────── */}
      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="relative h-40 bg-gradient-to-br from-[#131C55] via-[#1B2A7A] to-[#2B3FB8] sm:h-52">
          {data.social.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL from the upload endpoint
            <img src={data.social.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-400/30 blur-3xl" />
          )}
          <div className="absolute right-3 top-3 flex gap-2">
            <button
              type="button"
              disabled={Boolean(photoBusy)}
              onClick={() => coverInput.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-[13px] font-semibold text-gray-800 shadow hover:bg-white disabled:opacity-60"
            >
              {photoBusy === "cover" ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <ImagePlus size={14} aria-hidden="true" />}
              {data.social.coverUrl ? "Change cover" : "Add cover"}
            </button>
            {data.social.coverUrl ? (
              <button
                type="button"
                aria-label="Remove cover"
                disabled={Boolean(photoBusy)}
                onClick={() => changePhoto("cover", null)}
                className="rounded-lg bg-white/95 p-1.5 text-red-600 shadow hover:bg-white disabled:opacity-60"
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <input ref={coverInput} type="file" accept={IMAGE_TYPES.join(",")} onChange={pick("cover")} className="sr-only" tabIndex={-1} aria-hidden="true" />
        </div>

        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:px-7 sm:pb-6">
          <div className="relative -mt-14 w-fit shrink-0 sm:-mt-16">
            <span className="block rounded-full ring-4 ring-white dark:ring-gray-900">
              <InitialsAvatar name={name} src={data.social.avatarUrl} size="xl" />
            </span>
            <button
              type="button"
              aria-label={data.social.avatarUrl ? "Change profile photo" : "Add profile photo"}
              disabled={Boolean(photoBusy)}
              onClick={() => avatarInput.current?.click()}
              className="absolute bottom-1 right-1 grid h-9 w-9 place-items-center rounded-full bg-[#131C55] text-white shadow-lg ring-2 ring-white transition hover:bg-[#0E1B6B] disabled:opacity-60 dark:ring-gray-900"
            >
              {photoBusy === "avatar" ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Camera size={16} aria-hidden="true" />}
            </button>
            <input ref={avatarInput} type="file" accept={IMAGE_TYPES.join(",")} onChange={pick("avatar")} className="sr-only" tabIndex={-1} aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="break-words text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl dark:text-white">{name}</h1>
            <p className="mt-1 text-[15px] text-gray-600 dark:text-gray-400">{form.headline || "Add a headline below"}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#2B3FB8]/10 px-2.5 py-0.5 font-semibold text-[#2B3FB8] dark:bg-blue-400/15 dark:text-blue-300">
                <BadgeCheck size={13} aria-hidden="true" /> {ROLE_LABEL[account.designation] || "Member"}
              </span>
              {form.company_name ? (
                <span className="inline-flex items-center gap-1">
                  <Building2 size={13} aria-hidden="true" /> {form.company_name}
                </span>
              ) : null}
              {place ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} aria-hidden="true" /> {place}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            {data.social.avatarUrl ? (
              <button
                type="button"
                disabled={Boolean(photoBusy)}
                onClick={() => changePhoto("avatar", null)}
                className="rounded-xl border border-gray-300 px-3 py-2 text-[13px] font-semibold text-gray-700 hover:border-red-400 hover:text-red-600 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300"
              >
                Remove photo
              </button>
            ) : null}
            <Link
              href={`/social/profile/${encodeURIComponent(String(account._id))}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3.5 py-2 text-[13px] font-semibold text-gray-800 hover:border-[#131C55] dark:border-gray-700 dark:text-gray-200"
            >
              <ExternalLink size={14} aria-hidden="true" /> View Community profile
            </Link>
          </div>
        </div>
        <p className="border-t border-gray-100 bg-gray-50/70 px-5 py-2.5 text-[12.5px] text-gray-500 sm:px-7 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-400">
          One profile everywhere: your name, photo, company and location show the same on your account, your Community profile and your listings.
        </p>
      </section>

      {/* ── 1. About you ───────────────────────────────────────────────── */}
      <Card step="1" title="About you" subtitle="How people see you on OneXhib and in Community.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" required>
            <input value={form.first_name} onChange={set("first_name")} maxLength={60} autoComplete="given-name" className={input} />
          </Field>
          <Field label="Last name" required>
            <input value={form.last_name} onChange={set("last_name")} maxLength={60} autoComplete="family-name" className={input} />
          </Field>
          <Field label="Headline" className="sm:col-span-2" counter={`${form.headline.length} / ${HEADLINE_MAX}`} over={form.headline.length > HEADLINE_MAX}>
            <input value={form.headline} onChange={set("headline")} placeholder="e.g. Head of exhibitions at Expo Co" className={input} />
          </Field>
          <Field label="Bio" className="sm:col-span-2" counter={`${form.bio.length} / ${BIO_MAX}`} over={form.bio.length > BIO_MAX}>
            <textarea value={form.bio} onChange={set("bio")} rows={4} placeholder="What you do, the shows you run or visit, what you are looking for." className={`${input} h-auto`} />
          </Field>
        </div>
      </Card>

      {/* ── 2. Company ─────────────────────────────────────────────────── */}
      <Card step="2" title="Company" subtitle="Shown on your profile and used to suggest relevant shows.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company" icon={Building2}>
            <input value={form.company_name} onChange={set("company_name")} maxLength={160} autoComplete="organization" className={`${input} pl-10`} />
          </Field>
          <Field label="Website" icon={Globe}>
            <input value={form.website} onChange={set("website")} maxLength={300} inputMode="url" placeholder="example.com" className={`${input} pl-10`} />
          </Field>
          <Field label="Industry" icon={Briefcase}>
            <input value={form.Your_industry} onChange={set("Your_industry")} maxLength={160} placeholder="e.g. Furniture, Automotive" className={`${input} pl-10`} />
          </Field>
          <Field label="Looking for" icon={Search}>
            <input value={form.products_your_looking_for} onChange={set("products_your_looking_for")} maxLength={500} placeholder="Products, services or partners" className={`${input} pl-10`} />
          </Field>
        </div>
      </Card>

      {/* ── 3. Location ────────────────────────────────────────────────── */}
      <Card step="3" title="Location" subtitle="Used for exhibitions near you.">
        <LocationFields form={form} setForm={setForm} onEdit={() => error && setError("")} />
        <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <Field label="Address" required icon={MapPin}>
            <input value={form.address} onChange={set("address")} maxLength={400} autoComplete="street-address" className={`${input} pl-10`} />
          </Field>
          <Field label="PIN / postal code">
            <input value={form.pincode} onChange={set("pincode")} maxLength={20} autoComplete="postal-code" className={input} />
          </Field>
        </div>
      </Card>

      {/* ── 4. Sign-in details (read only) ─────────────────────────────── */}
      <Card step="4" title="Sign-in details" subtitle="These identify your account, so they cannot be changed here.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Locked icon={Mail} label="Email" value={account.email} />
          <Locked icon={Phone} label="Mobile" value={account.mobile_number} />
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Account type</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{ROLE_LABEL[account.designation] || "Member"}</p>
            <Link href="/welcome#account-type" className="mt-1 inline-block text-[12.5px] font-semibold text-[#2B3FB8] hover:underline dark:text-blue-300">
              Change account type
            </Link>
          </div>
        </div>
        <p className="mt-3 text-[12.5px] text-gray-500 dark:text-gray-400">
          To change your email or mobile number, contact the OneXhib team. Forgot your password?{" "}
          <Link href="/forgot-password" className="font-semibold text-[#2B3FB8] hover:underline dark:text-blue-300">
            Reset it
          </Link>
          .
        </p>
      </Card>

      {/* ── Save bar: appears when something changed ───────────────────── */}
      {changes.count || error ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
            <p role={error ? "alert" : "status"} className={`min-w-0 flex-1 text-sm ${error ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-300"}`}>
              {error || `${changes.count} unsaved change${changes.count === 1 ? "" : "s"}`}
            </p>
            <button
              type="button"
              disabled={saving || !changes.count}
              onClick={() => {
                setForm(toForm(data));
                setError("");
              }}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={saving || !changes.count}
              className="inline-flex items-center gap-2 rounded-xl bg-[#131C55] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0E1B6B] disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
            >
              {saving ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : null}
              Save profile
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}

/* ── Pieces ─────────────────────────────────────────────────────────────── */

function Card({ step, title, subtitle, children }) {
  return (
    <section className="mt-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5 flex items-start gap-3">
        <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#131C55] text-sm font-bold text-white dark:bg-blue-500">
          {step}
        </span>
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
          {subtitle ? <p className="text-[13px] text-gray-500 dark:text-gray-400">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, required, icon: Icon, counter, over, className = "", children }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-center justify-between text-[13px] font-semibold text-gray-700 dark:text-gray-300">
        <span>
          {label}
          {required ? <span className="text-red-600"> *</span> : null}
        </span>
        {counter ? <span className={`font-normal tabular-nums ${over ? "text-red-600" : "text-gray-400"}`}>{counter}</span> : null}
      </span>
      <span className="relative block">
        {Icon ? <Icon size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3 text-gray-400" /> : null}
        {children}
      </span>
    </label>
  );
}

function Locked({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
        <Lock size={12} aria-hidden="true" /> {label}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm font-semibold text-gray-900 dark:text-white">
        <Icon size={14} aria-hidden="true" className="shrink-0 text-gray-400" />
        <span className="truncate">{value || "—"}</span>
      </p>
    </div>
  );
}

/**
 * Country / state / city, as on the signup form: dropdowns from the
 * country-state-city dataset, loaded only once this page opens (it is large).
 * The account stores NAMES; older accounts stored codes ("IN", "PB"), and the
 * matcher understands both, so the right options are pre-selected either way.
 * A city that is not in the dataset stays as typed ("Other city").
 */
function LocationFields({ form, setForm, onEdit }) {
  const [csc, setCsc] = useState(null);
  const [iso, setIso] = useState({ country: "", state: "" });
  const [customCity, setCustomCity] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([import("country-state-city"), import("@/lib/csc-match")]).then(([mod, match]) => {
      if (!alive) return;
      const byCode = (v) => (/^[A-Za-z]{2}$/.test(v || "") ? mod.Country.getCountryByCode(v.toUpperCase()) : null);
      const countryName = byCode(form.country)?.name || form.country;
      const found = match.matchLocation({ country: countryName, state: form.state, city: form.city });
      // A short state code on an older account.
      let stateIso = found.stateIso;
      if (!stateIso && found.countryIso && form.state && form.state.length <= 3) {
        stateIso = mod.State.getStateByCodeAndCountry(form.state.toUpperCase(), found.countryIso)?.isoCode || "";
      }
      const cityKnown = stateIso ? match.matchCity(found.countryIso, stateIso, form.city).known : false;
      setCsc(mod);
      setIso({ country: found.countryIso, state: stateIso });
      // A city the dataset does not list stays a text box with what was saved.
      setCustomCity(Boolean(form.city) && Boolean(stateIso) && !cityKnown);
    });
    return () => {
      alive = false;
    };
    // Only on first load: afterwards the selects drive the codes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countries = useMemo(() => (csc ? csc.Country.getAllCountries() : []), [csc]);
  const states = useMemo(() => (csc && iso.country ? csc.State.getStatesOfCountry(iso.country) : []), [csc, iso.country]);
  const cities = useMemo(() => (csc && iso.country && iso.state ? csc.City.getCitiesOfState(iso.country, iso.state) : []), [csc, iso.country, iso.state]);

  const update = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    onEdit();
  };

  if (!csc) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[68px] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Country" required>
        <select
          value={iso.country}
          onChange={(e) => {
            const c = countries.find((x) => x.isoCode === e.target.value);
            setIso({ country: e.target.value, state: "" });
            setCustomCity(false);
            update({ country: c?.name || "", state: "", city: "" });
          }}
          className={input}
        >
          <option value="">{form.country && !iso.country ? `${form.country} (choose to update)` : "Select country"}</option>
          {countries.map((c) => (
            <option key={c.isoCode} value={c.isoCode}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="State / region" required>
        <select
          value={iso.state}
          disabled={!iso.country}
          onChange={(e) => {
            const s = states.find((x) => x.isoCode === e.target.value);
            setIso((v) => ({ ...v, state: e.target.value }));
            setCustomCity(false);
            update({ state: s?.name || "", city: "" });
          }}
          className={`${input} disabled:opacity-60`}
        >
          <option value="">{form.state && !iso.state ? `${form.state} (choose to update)` : "Select state"}</option>
          {states.map((s) => (
            <option key={s.isoCode} value={s.isoCode}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="City" required>
        {customCity || (iso.state && !cities.length) ? (
          <input value={form.city} onChange={(e) => update({ city: e.target.value })} maxLength={100} placeholder="Type your city" className={input} />
        ) : (
          <select
            value={cities.find((c) => c.name.toLowerCase() === String(form.city).trim().toLowerCase())?.name || ""}
            disabled={!iso.state}
            onChange={(e) => {
              if (e.target.value === "__other") {
                setCustomCity(true);
                update({ city: "" });
              } else update({ city: e.target.value });
            }}
            className={`${input} disabled:opacity-60`}
          >
            <option value="">{form.city && !iso.state ? `${form.city} (choose to update)` : "Select city"}</option>
            {cities.map((c) => (
              <option key={`${c.name}-${c.latitude}`} value={c.name}>
                {c.name}
              </option>
            ))}
            {iso.state ? <option value="__other">Other city…</option> : null}
          </select>
        )}
      </Field>
    </div>
  );
}
