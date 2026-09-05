/**
 * Server-only data layer for the public, unauthenticated pages.
 *
 * WHY THIS EXISTS SEPARATELY FROM models/*
 * The helpers in models/ call relative URLs with axios ("/api/..."), which only
 * resolve inside a browser. Server Components have no origin to resolve them
 * against, so the public pages need their own fetchers that talk to the Express
 * API absolutely. Nothing in models/ is touched or re-used here.
 *
 * WHY IT TALKS TO BACKEND_URL DIRECTLY
 * The /api/* rewrite in next.config.mjs is a browser-facing convenience. On the
 * server we already have BACKEND_URL, so going straight there skips a pointless
 * hop back through our own origin. It also reaches the exhibition listing
 * endpoints, which the rewrite cannot: Express mounts its router at "/", so
 * /upcoming, /ongoing and /previous sit at the API root with no /api prefix.
 *
 * THREE RULES EVERY FETCHER FOLLOWS
 *  1. Fail soft. A backend that is down, slow or returning garbage yields null
 *     or an empty list, never a thrown error. A public marketing page must not
 *     500 because one section's data is unavailable.
 *  2. Cache. Every read is ISR-cached for REVALIDATE seconds so traffic spikes
 *     hit Next's data cache, not Mongo.
 *  3. Project explicitly. Several public Express endpoints return whole Mongo
 *     documents including contact PII (see PII NOTES below). Every fetcher here
 *     maps through an allow-list, so a field can only reach the browser if it
 *     was named on purpose. Allow-lists, never delete-lists: a field added to
 *     the backend later cannot leak by default.
 *
 * PII NOTES - fields deliberately dropped, do not "restore" these:
 *  - exhibition.addedBy      the creator's EMAIL address, despite the name
 *                            (exhibition.controller.js sets `addedBy: email`)
 *  - exhibition.email        organiser contact email
 *  - company.company_email / company_phone_number / pincode
 *  - service.full_name       a person's name, not a business name
 *  - service.mobile_number   a personal mobile number
 *  - service.address         often a home address; city/state/country is enough
 *  - *.createdby / createdBy internal ownership references
 */

if (typeof window !== "undefined") {
  throw new Error(
    "lib/public-api.js is server-only - it reads BACKEND_URL and must never be " +
      "imported into a Client Component. Fetch from /api/exhibitions/search instead."
  );
}

const BACKEND_URL = (process.env.BACKEND_URL || "").replace(/\/+$/, "");

/** 5 minutes: fresh enough for exhibition listings, cheap enough under load. */
export const REVALIDATE = 300;

/** A hung upstream must not hang the render. */
const TIMEOUT_MS = 8000;

/* ────────────────────────────────────────────────────────────────────────── */
/*  Transport                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

function buildUrl(path, params) {
  const url = new URL(`${BACKEND_URL}${path}`);
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * GET JSON from the API. Returns null on any failure: unset BACKEND_URL,
 * network error, timeout, non-2xx, or a body that isn't JSON.
 */
async function getJson(path, { params, revalidate = REVALIDATE } = {}) {
  if (!BACKEND_URL) {
    console.warn("[public-api] BACKEND_URL is not set - public content will be empty.");
    return null;
  }
  const url = buildUrl(path, params);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate },
    });
    if (!res.ok) {
      console.warn(`[public-api] ${res.status} from ${path}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[public-api] ${path} failed: ${err?.message || err}`);
    return null;
  }
}

/** POST JSON. Same fail-soft contract as getJson. */
async function postJson(path, body, { revalidate = REVALIDATE } = {}) {
  if (!BACKEND_URL) return null;
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`[public-api] POST ${path} failed: ${err?.message || err}`);
    return null;
  }
}

const EMPTY_LIST = Object.freeze({ items: [], total: 0, page: 1, limit: 0, totalPages: 0 });

/**
 * The API has three list envelopes:
 *   { success, total, page, limit, totalPages, data }  exhibitions
 *   { data, total, page, limit, totalPages }           companies, products
 *   { success, count, data }                           services, *search
 * Normalise all of them to one shape so pages don't care which they hit.
 */
function toList(payload, map) {
  const rows = Array.isArray(payload) ? payload : payload?.data;
  if (!Array.isArray(rows)) return EMPTY_LIST;
  const items = rows.map(map).filter(Boolean);
  const total = Number(payload?.total ?? payload?.count ?? items.length) || items.length;
  const limit = Number(payload?.limit) || items.length;
  return {
    items,
    total,
    page: Number(payload?.page) || 1,
    limit,
    totalPages: Number(payload?.totalPages) || (limit ? Math.ceil(total / limit) : 1),
  };
}

const str = (v) => (typeof v === "string" ? v.trim() : "");
const id = (v) => (v == null ? "" : String(v));

/**
 * Image hosts allowed on public pages. Mirrors images.remotePatterns in
 * next.config.mjs and img-src in the CSP — keep the three in agreement.
 */
const ALLOWED_IMAGE_HOSTS = new Set(["res.cloudinary.com"]);

/**
 * Pick the first usable image from a list of candidate fields, or null.
 *
 * This is a deliberate allow-list, not a cleanup pass, because the live data is
 * far messier than the schema suggests. Measured over 100 upcoming exhibitions:
 *
 *   17%  base64 `data:` URIs stored directly in Mongo. Rejected — they cannot
 *        be optimised, they inline hundreds of KB into the HTML, and they were
 *        most of a 266 KB response for a single page of 100 records.
 *   51%  encrypted-tbn0.gstatic.com — Google's thumbnail cache. Rejected: not
 *        ours to hotlink, unstable URLs, and far too small to render well.
 *   32%  other third-party hotlinks (exhibitor and trade-fair sites). Rejected:
 *        allow-listing arbitrary domains would mean a wildcard in
 *        remotePatterns and the CSP, unoptimisable images, and a layout that
 *        breaks whenever a source rotates its URLs.
 *    0%  Cloudinary, i.e. images this platform actually owns and serves.
 *
 * Anything rejected here renders the branded placeholder instead, which is a
 * better result than a broken or hotlinked image. `original_image_url` and
 * `thumbnail_url` — populated by handleExhibition for records created through
 * the app — are Cloudinary URLs and will start flowing through automatically
 * once the backend projection change is deployed. No frontend change needed
 * for that to happen.
 */
function toPublicImage(...candidates) {
  for (const candidate of candidates) {
    const url = str(candidate);
    // https only: the site is served over HTTPS, so an http:// image is blocked
    // as mixed content and can only ever be broken. Also excludes data: URIs.
    if (!url || !url.startsWith("https://")) continue;
    let host;
    try {
      host = new URL(url).hostname;
    } catch {
      continue;
    }
    if (!ALLOWED_IMAGE_HOSTS.has(host)) continue;
    return { url, host };
  }
  return null;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Projections                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Card-level exhibition. Every field here is now returned by /upcoming,
 * /ongoing and /previous: category, venue and the two image fields were added
 * to those projections specifically so cards need no second request.
 *
 * Image preference: thumbnail_url is the sized derivative, original_image_url
 * is full-size, and exhibtion_url (sic - the backend's spelling) is the legacy
 * single-image field on older records. First one present wins.
 */
export function toPublicExhibition(doc) {
  if (!doc?._id) return null;
  return {
    id: id(doc._id),
    name: str(doc.exhibition_name),
    startDate: doc.starting_date || null,
    endDate: doc.ending_date || null,
    category: str(doc.category),
    venue: str(doc.venue),
    city: str(doc.city),
    state: str(doc.state),
    country: str(doc.country),
    image: toPublicImage(doc.thumbnail_url, doc.original_image_url, doc.exhibtion_url),
    isFeatured: Boolean(doc.is_featured),
  };
}

/**
 * Detail-level exhibition: the card fields plus the long-form prose the
 * organiser wrote for public display. Contact fields (addedBy/email) and
 * internal fields (createdby, layout_url) are excluded - see PII NOTES.
 */
export function toPublicExhibitionDetail(doc) {
  const base = toPublicExhibition(doc);
  if (!base) return null;
  return {
    ...base,
    // Prefer the full-size image on a detail page; thumbnail is a fallback.
    image: toPublicImage(doc.original_image_url, doc.exhibtion_url, doc.thumbnail_url),
    address: str(doc.exhibition_address),
    about: str(doc.about_exhibition),
    aboutOrganiser: str(doc.about_organiser),
    whyExhibit: str(doc.why_Exhibit),
    whyVisit: str(doc.why_visit),
    exhibitorProfile: str(doc.exhibitor_profile),
    visitorProfile: str(doc.vistor), // backend spelling
    speakers: str(doc.speakers),
    session: str(doc.session),
    sponsor: str(doc.sponsor),
    partners: str(doc.partners),
    layoutPreview: str(doc.layout_preview_url) || null,
    brochure: str(doc.exhibition_brochure_url) || null,
    updatedAt: doc.updatedAt || doc.createdAt || null,
  };
}

/** Company card/detail. Email, phone and pincode are dropped - see PII NOTES. */
export function toPublicCompany(doc) {
  if (!doc?._id) return null;
  return {
    id: id(doc._id),
    name: str(doc.company_name),
    nature: str(doc.company_nature),
    about: str(doc.about_company),
    // A business address submitted for a public exhibition directory. Drop this
    // line if company addresses should stay private - nothing else depends on it.
    address: str(doc.company_address),
    website: str(doc.company_website) || null,
    image: toPublicImage(doc.company_image_url),
    stallNo: str(doc.stall_no),
    hallNo: str(doc.hall_no),
    exhibitionId: id(doc.createdBy) || null, // company.createdBy references an exhibition
    updatedAt: doc.updatedAt || doc.createdAt || null,
  };
}

/** Product card/detail. product_url is an image URL, not a link. */
export function toPublicProduct(doc) {
  if (!doc?._id) return null;
  return {
    id: id(doc._id),
    name: str(doc.product_name),
    category: str(doc.category),
    details: str(doc.details),
    price: doc.price ?? null,
    unit: str(doc.unit),
    image: toPublicImage(doc.product_url),
    video: str(doc.product_video_url) || null,
    companyId: id(doc.createdBy) || null, // product.createdBy references a company
    exhibitionId: id(doc.exhibitionid) || null,
  };
}

/**
 * Service provider. full_name, mobile_number and address are all dropped - the
 * public value is "which services exist, and where", not who to phone.
 * service_name is a fixed 7-value enum in the backend schema, so it is the one
 * trustworthy category taxonomy on the platform.
 */
export function toPublicService(doc) {
  if (!doc?._id) return null;
  return {
    id: id(doc._id),
    service: str(doc.service_name),
    city: str(doc.city),
    state: str(doc.state),
    country: str(doc.country),
    image: toPublicImage(doc.image?.url),
  };
}

/** The service_name enum, verbatim from Model/Service.model.js. */
export const SERVICE_CATEGORIES = Object.freeze([
  "Printing",
  "Furniture Rental",
  "LED / TV Rental",
  "Fabrication",
  "Protocol Staff",
  "Catalog Printing",
  "Corporate Gifting",
]);

/* ────────────────────────────────────────────────────────────────────────── */
/*  Exhibitions                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

/** The three listing endpoints, keyed by the scope names used in public URLs. */
export const EXHIBITION_SCOPES = Object.freeze({
  upcoming: "/upcoming",
  ongoing: "/ongoing",
  previous: "/previous",
});

/**
 * Paginated exhibition listing.
 *
 * `country`/`state`/`city` are the ONLY filters these endpoints accept
 * (buildLocationFilter in exhibition.controller.js) and are matched as
 * case-insensitive regexes, each independent of the others. There is no
 * category or date parameter - do not add one here without a backend change.
 *
 * limit is capped at 100 server-side; asking for more silently yields 100.
 */
export async function getExhibitions(scope, { page = 1, limit = 12, country, state, city } = {}) {
  const path = EXHIBITION_SCOPES[scope];
  if (!path) return EMPTY_LIST;
  const payload = await getJson(path, {
    params: { page, limit: Math.min(100, limit), country, state, city },
  });
  return toList(payload, toPublicExhibition);
}

export const getUpcomingExhibitions = (opts) => getExhibitions("upcoming", opts);
export const getOngoingExhibitions = (opts) => getExhibitions("ongoing", opts);
export const getPreviousExhibitions = (opts) => getExhibitions("previous", opts);

/** Featured listing. Separate endpoint; returns category but no image fields. */
export async function getFeaturedExhibitions({ page = 1, limit = 12 } = {}) {
  const payload = await getJson("/api/exhibitions/featured", {
    params: { page, limit: Math.min(100, limit) },
  });
  return toList(payload, toPublicExhibition);
}

/** Single exhibition. Public endpoint returning the whole document. */
export async function getExhibitionById(exhibitionId) {
  if (!exhibitionId) return null;
  const doc = await getJson(`/api/find/exhibition/${exhibitionId}`);
  return toPublicExhibitionDetail(doc);
}

/**
 * Keyword search within a scope.
 *
 * `search` is the only parameter the *search endpoints accept. They return
 * FULL documents with no pagination and no server-side limit, so the response
 * is capped here before anything is mapped - an empty search term against a
 * large collection would otherwise pull the entire table.
 */
export async function searchExhibitions(scope, search, { limit = 24 } = {}) {
  const path = EXHIBITION_SCOPES[scope];
  if (!path) return EMPTY_LIST;
  const payload = await getJson(`${path}search`, {
    params: { search: str(search) },
    revalidate: 60, // searches are long-tail; keep them fresher and cheaper to miss
  });
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return {
    items: rows.slice(0, limit).map(toPublicExhibition).filter(Boolean),
    total: Number(payload?.count) || rows.length,
    page: 1,
    limit,
    totalPages: 1,
  };
}

/** Location-filtered listing with an optional status. POST, paginated. */
export async function getExhibitionsByLocation({
  country,
  state,
  city,
  status,
  page = 1,
  limit = 12,
} = {}) {
  const payload = await postJson("/api/exhibitions/by-location", {
    country,
    state,
    city,
    status,
    page,
    limit: Math.min(100, limit),
  });
  return toList(payload, toPublicExhibition);
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Companies, products, services                                             */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * NOTE: /api/allcompanies and /api/allproducts return EVERY record when no
 * page/limit is supplied. Both wrappers always send them for that reason.
 */
export async function getCompanies({ page = 1, limit = 12 } = {}) {
  const payload = await getJson("/api/allcompanies", { params: { page, limit } });
  return toList(payload, toPublicCompany);
}

export async function getCompanyById(companyId) {
  if (!companyId) return null;
  return toPublicCompany(await getJson(`/api/companydetail/${companyId}`));
}

/** Companies exhibiting at one exhibition (company.createdBy === exhibitionId). */
export async function getCompaniesForExhibition(exhibitionId) {
  if (!exhibitionId) return EMPTY_LIST;
  return toList(await getJson(`/api/company/${exhibitionId}`), toPublicCompany);
}

export async function getProducts({ page = 1, limit = 12 } = {}) {
  const payload = await getJson("/api/allproducts", { params: { page, limit } });
  return toList(payload, toPublicProduct);
}

export async function getProductById(productId) {
  if (!productId) return null;
  return toPublicProduct(await getJson(`/api/product/detail/${productId}`));
}

/** Products belonging to one company (product.createdBy === companyId). */
export async function getProductsForCompany(companyId) {
  if (!companyId) return EMPTY_LIST;
  return toList(await getJson(`/api/product/${companyId}`), toPublicProduct);
}

/** All service providers. This endpoint has no pagination server-side. */
export async function getServices() {
  return toList(await getJson("/api/getexhibitionservice"), toPublicService);
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Platform stats and derived taxonomies                                     */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Real collection counts from /api/counts. Returns null when unavailable so
 * callers render nothing rather than a zero - a fabricated or wrong statistic
 * is worse than an absent one.
 */
export async function getCounts() {
  const payload = await getJson("/api/counts", { revalidate: 3600 });
  if (!payload?.success) return null;
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
  const counts = {
    exhibitions: n(payload.exhibitions),
    companies: n(payload.companies),
    products: n(payload.products),
  };
  return Object.values(counts).every((v) => v === null) ? null : counts;
}

/**
 * Cities with upcoming exhibitions, most listings first.
 *
 * Derived from live data rather than a hardcoded list: exhibition.category and
 * the location fields are free text with no enum, so any fixed taxonomy would
 * be invention. Cities absent from the data simply don't appear.
 */
export async function getUpcomingCities({ sample = 100, max = 12 } = {}) {
  const { items } = await getExhibitions("upcoming", { page: 1, limit: sample });
  const byCity = new Map();
  for (const ex of items) {
    if (!ex.city) continue;
    const key = ex.city.toLowerCase();
    const entry = byCity.get(key) || { city: ex.city, state: ex.state, count: 0 };
    entry.count += 1;
    byCity.set(key, entry);
  }
  return [...byCity.values()].sort((a, b) => b.count - a.count).slice(0, max);
}

/**
 * Categories present in upcoming exhibitions, most listings first. Same
 * reasoning as getUpcomingCities: derived, never invented.
 */
export async function getUpcomingCategories({ sample = 100, max = 12 } = {}) {
  const { items } = await getExhibitions("upcoming", { page: 1, limit: sample });
  const byCategory = new Map();
  for (const ex of items) {
    if (!ex.category) continue;
    const key = ex.category.toLowerCase();
    const entry = byCategory.get(key) || { category: ex.category, count: 0 };
    entry.count += 1;
    byCategory.set(key, entry);
  }
  return [...byCategory.values()].sort((a, b) => b.count - a.count).slice(0, max);
}
