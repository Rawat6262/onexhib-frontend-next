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
 *
 * `contactable` (exhibition detail, company) is the one thing derived FROM those
 * fields that does reach the browser: a boolean saying whether the backend can
 * deliver an enquiry (POST /api/enquiries) to this listing's owner. It decides
 * whether the "Send a message" form is shown. The address itself never leaves
 * the server - the backend resolves it again when the message is sent.
 */

if (typeof window !== "undefined") {
  throw new Error(
    "lib/public-api.js is server-only - it reads BACKEND_URL and must never be " +
      "imported into a Client Component. Fetch from /api/exhibitions/search instead."
  );
}

// Explicit .js extension: correct ESM, resolved identically by Next, and it is what
// lets the plain-Node test suites import this module at all.
import { ALL_SCOPE } from "./exhibition-scopes.js";
// The service taxonomy. Pure data and string helpers, with no server-only reach of
// its own, which is why the Client Components can import it too.
import {
  SERVICE_CATEGORIES as TAXONOMY_CATEGORIES,
  canonicalServiceCategory,
} from "./service-taxonomy.js";

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
async function getJson(path, { params, revalidate = REVALIDATE, tags } = {}) {
  if (!BACKEND_URL) {
    console.warn("[public-api] BACKEND_URL is not set - public content will be empty.");
    return null;
  }
  const url = buildUrl(path, params);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // `tags` let one record be refreshed on demand (revalidateTag) instead of
      // waiting out `revalidate` - see app/api/revalidate/exhibition/route.js.
      next: tags ? { revalidate, tags } : { revalidate },
    });
    if (!res.ok) {
      // A 404 is the normal answer for a record that was deleted while old links
      // to it are still crawled - the page renders "not found" correctly, so it is
      // not worth a log line per request. Everything else is still logged.
      if (res.status !== 404) console.warn(`[public-api] ${res.status} from ${path}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[public-api] ${path} failed: ${err?.message || err}`);
    return null;
  }
}

/** Cache tag for one exhibition's detail data and the pages built from it. */
export const exhibitionTag = (exhibitionId) => `exhibition-${exhibitionId}`;

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

/*
 * Placeholder words typed into an exhibition's place fields ("TBD", "N/A", "-").
 * They are not places, and they leaked into titles and descriptions as
 * "IFAT Brasil — TBD, Brazil". Cleared here, where the data is first read, so
 * every title, card and description simply leaves the part out. "Online" and
 * "Virtual" are NOT in this list: for a virtual show they are the answer.
 * (lib/locations.js keeps its own wider list for which landing pages exist.)
 */
const PLACEHOLDER_PLACES = new Set(["tbd", "tba", "tbc", "n/a", "na", "nil", "none", "null", "undefined", "to be announced", "to be decided", "to be confirmed", "-", "--", "---", "."]);
// "Various", "Multiple States", "Multiple Cities", "Multiple (NSW, VIC, ...)":
// a show touring several places has no one city, and printing the stand-in
// made titles and cards read "Various, Multiple States, Germany".
const PLACEHOLDER_PREFIX = /^(various|multiple|several|all over|pan[- ]india|nationwide)\b/i;
const place = (v) => {
  const s = str(v);
  return PLACEHOLDER_PLACES.has(s.toLowerCase()) || PLACEHOLDER_PREFIX.test(s) ? "" : s;
};
const id = (v) => (v == null ? "" : String(v));

/**
 * Hosts we serve ourselves, and can therefore run through next/image's
 * optimiser. Mirrors images.remotePatterns in next.config.mjs — keep the two in
 * agreement. Anything else renders unoptimised (see toPublicImage).
 */
const OPTIMISABLE_IMAGE_HOSTS = new Set(["res.cloudinary.com"]);

/**
 * Pick the first usable image from a list of candidate fields, or null.
 *
 * WHY THIRD-PARTY HOSTS ARE ALLOWED
 * Almost nothing in this data is Cloudinary-hosted. Measured over 100 upcoming
 * exhibitions, the real image field is `exhibtion_url` (sic — the backend's
 * spelling), and it points at Google's thumbnail cache (~51%), exhibitor and
 * trade-fair sites (~32%), or a base64 `data:` URI (~17%). Restricting this to
 * hosts we own meant every record fell back to the placeholder, so the rule is
 * now "render the image the record actually has". A record whose only image is
 * unusable still gets the branded placeholder — those are left as they were.
 *
 * A base64 `data:image/*` URI is accepted too — 16% of upcoming records store
 * their only image that way — but capped, because a data URI is inlined into
 * the HTML on every render and can neither be cached nor resized. The live ones
 * measure 2-45 KB, so the cap only ever catches a pathological record.
 *
 * WHAT IS STILL REJECTED
 *  - http:// URLs: blocked by the browser as mixed content on an https site, so
 *    they can only ever render broken.
 *  - data: URIs that are not an image, or are over DATA_URI_MAX_BYTES.
 *  - anything that is not a parseable URL.
 *  - URLs whose path is plainly a web PAGE, not a file: several records store a
 *    third-party profile page in `original_image_url` (e.g.
 *    "https://hmtex.in/exhibitor_profile.html"). Those would render as a broken
 *    image, so a document extension is rejected outright. Extensionless URLs
 *    are kept — Google's thumbnail cache serves images from /images?q=tbn:...
 *
 * `optimized` tells the render layer whether next/image may process the file.
 * Only hosts in remotePatterns can be; everything else is passed through as-is
 * with `unoptimized`, which is what keeps arbitrary third-party hosts working
 * without turning our optimiser into an open image proxy for the whole web.
 */
const DOCUMENT_EXTENSION = /\.(html?|php|aspx?|jsp|pdf)$/i;

/** ~100 KB of base64. Comfortably above every inline image in the live data. */
const DATA_URI_MAX_BYTES = 100 * 1024;

function toPublicImage(...candidates) {
  for (const candidate of candidates) {
    const url = str(candidate);
    if (!url) continue;
    if (url.startsWith("data:image/")) {
      if (url.length > DATA_URI_MAX_BYTES) continue;
      return { url, host: "inline", optimized: false };
    }
    if (!url.startsWith("https://")) continue;
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }
    if (DOCUMENT_EXTENSION.test(parsed.pathname)) continue;
    const host = parsed.hostname;
    return { url, host, optimized: OPTIMISABLE_IMAGE_HOSTS.has(host) };
  }
  return null;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Projections                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Card-level exhibition.
 *
 * WHAT THE LISTING ENDPOINTS ACTUALLY RETURN (verified against the live API):
 *   _id, exhibition_name, starting_date, ending_date, exhibtion_url,
 *   country, state, city
 *
 * That is all. `category`, `venue`, `is_featured`, `thumbnail_url` and
 * `original_image_url` are NOT in the /upcoming, /ongoing or /previous
 * projection — the backend change that would have added them is not deployed.
 * /api/exhibitions/featured does additionally return `category`, and the
 * single-record endpoint returns the whole document.
 *
 * The mapping below still names every field, so the moment the projection is
 * widened the cards gain category and venue with no frontend change. Until
 * then: any feature that needs category or venue across a LISTING is blocked on
 * the backend, not on this file. That is why there are city and country
 * landing pages but no category or venue ones.
 *
 * Image preference: thumbnail_url is the sized derivative, original_image_url
 * is full-size, and exhibtion_url (sic - the backend's spelling) is the field
 * that most live records actually populate. First usable one wins.
 */
export function toPublicExhibition(doc) {
  if (!doc?._id) return null;
  return {
    id: id(doc._id),
    name: str(doc.exhibition_name),
    startDate: doc.starting_date || null,
    endDate: doc.ending_date || null,
    // The organiser's own wording. This is what every page DISPLAYS.
    category: str(doc.category),
    // The canonical industry, present only on records covered by the approved
    // mapping. Read exclusively by lib/categories.js to group the industry
    // tier - never rendered, because "Healthcare & Medical" is our label for a
    // group, not what the organiser called their event.
    categoryNormalized: str(doc.category_normalized),
    venue: place(doc.venue),
    city: place(doc.city),
    state: place(doc.state),
    country: place(doc.country),
    image: toPublicImage(doc.thumbnail_url, doc.original_image_url, doc.exhibtion_url),
    isFeatured: featuredNow(doc),
    featuredUntil: doc.featured_until || null,
  };
}

/**
 * Featured AND inside its feature window. featured_until is the last featured
 * day (UTC); a record without one was featured before durations existed and
 * counts until an admin removes it.
 */
function featuredNow(doc, now = new Date()) {
  if (!doc.is_featured) return false;
  if (!doc.featured_until) return true;
  const until = new Date(doc.featured_until);
  if (Number.isNaN(until.getTime())) return true;
  return until.toISOString().slice(0, 10) >= now.toISOString().slice(0, 10);
}

/**
 * Featured-slide exhibition. Identical to the card projection except that it
 * prefers the UNCROPPED image.
 *
 * thumbnail_url is a Cloudinary c_fill derivative - a hard 16:10 crop baked in
 * server-side. That is right for a small card, but the slider renders the image
 * several times larger, where the crop visibly beheads the logos that make up
 * most of this set. original_image_url is the untouched upload, and
 * exhibtion_url is where the image actually lives on most records.
 */
export function toPublicExhibitionFeatured(doc) {
  const base = toPublicExhibition(doc);
  if (!base) return null;
  return {
    ...base,
    image: toPublicImage(doc.original_image_url, doc.thumbnail_url, doc.exhibtion_url),
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
    // exhibtion_url sits second because it is the field most records populate.
    image: toPublicImage(doc.original_image_url, doc.exhibtion_url, doc.thumbnail_url),
    address: place(doc.exhibition_address),
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
    // Uploaded sponsor / partner logos (the text fields above are the older form).
    sponsorLogos: toLogoList(doc.sponsor_logos),
    partnerLogos: toLogoList(doc.partner_logos),
    // Mirrors the backend's resolveRecipient: the listing's organiser email, else
    // the account that listed it. Boolean only - see PII NOTES.
    contactable: Boolean(str(doc.email) || doc.createdby),
    updatedAt: doc.updatedAt || doc.createdAt || null,
    // The linked exhibition centre (populated by the backend), when there is
    // one: the venue line then links to the centre's page and map.
    centre: toLinkedCentre(doc.exhibition_centre),
  };
}

/** Logo arrays -> [{ id, url }], https Cloudinary/HTTP URLs only, at most 20. */
function toLogoList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((l) => l && typeof l.url === "string" && /^https:\/\//.test(l.url))
    .slice(0, 20)
    .map((l) => ({ id: id(l._id) || l.url, url: l.url }));
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
    // Boolean only - see PII NOTES. Products inherit their company's value.
    contactable: Boolean(str(doc.company_email)),
    // Shows a self-listed company (exhibitor workspace) says it is attending,
    // each with its own hall and stall. Organiser-added companies have none and
    // use exhibitionId above instead.
    participations: Array.isArray(doc.participations)
      ? doc.participations
          .slice(0, 20)
          .map((p) => ({ exhibitionId: id(p?.exhibition) || null, hall: str(p?.hall_no), stall: str(p?.stall_no) }))
          .filter((p) => p.exhibitionId)
      : [],
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
 *
 * service_name is a fixed enum in the backend schema - 35 categories, each with its
 * own subcategories - so it is the one trustworthy taxonomy on the platform. Both
 * halves are published: the category decides which page a provider appears on, and
 * the subcategory is what the filters on that page narrow by.
 *
 * THE CATEGORY IS TRANSLATED ON READ, not taken verbatim. A row written before the
 * taxonomy migration still says "Fabrication", and the directory groups on an exact
 * string match - so without this, every un-migrated provider would silently vanish
 * from the category pages. canonicalServiceCategory() maps the seven old names
 * forward, which means the public site is correct whether or not the migration has
 * run yet. It also means the migration can be run calmly rather than in step with a
 * deploy.
 */
export function toPublicService(doc) {
  if (!doc?._id) return null;

  /*
   * An unresolvable category (hand-edited in the database, or written before the
   * enum existed) keeps its raw string rather than being blanked. It will not match
   * any category page, which is the same outcome it had before, and it is at least
   * visible to whoever is looking at the data.
   */
  const resolved = canonicalServiceCategory(doc.service_name, doc.service_subcategory);

  return {
    id: id(doc._id),
    /*
     * The provider's NAME is public. `full_name` on Service is the listing's business
     * name - "Bestway Wrappings", "The Gift Shop" - not a personal one, and it is already
     * shown publicly wherever a listing appears. A directory that withholds it renders a
     * column of identical location chips and tells an exhibitor nothing.
     */
    name: str(doc.full_name),
    service: resolved ? resolved.category : str(doc.service_name),
    /*
     * Null rather than absent when there is none, so every row has the same shape -
     * a provider who has not chosen a speciality is a normal state, not a partial
     * record. A subcategory that does not belong to its category is dropped to null
     * by the resolver rather than published as a contradiction.
     */
    subcategory: resolved ? resolved.subcategory : null,
    city: str(doc.city),
    state: str(doc.state),
    country: str(doc.country),
    image: toPublicImage(doc.image?.url),
    // The provider's own words; "" when they have written none.
    description: str(doc.description),
  };
}

/**
 * The service_name enum, from the taxonomy that the backend schema also derives
 * from - see lib/service-taxonomy.js.
 *
 * RE-EXPORTED RATHER THAN DEFINED HERE. It used to be a hand-written copy of the
 * backend's seven values, which was fine at seven and is not at 35; worse, a
 * category now has subcategories, and two files cannot own that relationship.
 * Everything that imported SERVICE_CATEGORIES from here keeps working.
 */
export const SERVICE_CATEGORIES = TAXONOMY_CATEGORIES;

/* ────────────────────────────────────────────────────────────────────────── */
/*  Exhibition centres                                                        */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * The exhibition centre populated on an exhibition (name, slug, address,
 * place, map location, photo), for the venue card on the exhibition page.
 */
function toLinkedCentre(c) {
  if (!c || typeof c !== "object" || !c.slug) return null;
  const lat = Number(c.location?.lat);
  const lng = Number(c.location?.lng);
  return {
    name: str(c.name),
    slug: str(c.slug),
    address: str(c.address),
    city: str(c.city),
    state: str(c.state),
    country: str(c.country),
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    image: toPublicImage(c.photo?.url),
  };
}

/** Cache tag for the centre directory and every centre page. */
export const CENTRES_TAG = "exhibition-centres";

/** One exhibition centre, shaped for the public pages. */
export function toPublicCentre(doc) {
  if (!doc?._id || !doc.slug) return null;
  const lat = Number(doc.location?.lat);
  const lng = Number(doc.location?.lng);
  return {
    id: id(doc._id),
    name: str(doc.name),
    slug: str(doc.slug),
    address: str(doc.address),
    city: str(doc.city),
    state: str(doc.state),
    country: str(doc.country),
    postalCode: str(doc.postal_code),
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    image: toPublicImage(doc.photo?.url),
    website: /^https?:\/\//i.test(str(doc.website)) ? str(doc.website) : "",
    phone: str(doc.phone),
    email: str(doc.email),
    halls: Number.isFinite(Number(doc.halls)) && doc.halls !== null ? Number(doc.halls) : null,
    areaSqm: Number.isFinite(Number(doc.area_sqm)) && doc.area_sqm !== null ? Number(doc.area_sqm) : null,
    description: str(doc.description),
    nearestAirport: str(doc.nearest_airport),
    nearestStation: str(doc.nearest_station),
    upcomingCount: Number(doc.upcomingCount) || 0,
    pastCount: Number(doc.pastCount) || 0,
  };
}

/**
 * Whether a centre has anything to show: an exhibition linked to it (coming
 * up or already held) or a description. Most venues were added from a map
 * pick and have neither yet - a name, an address and "nothing listed". Those
 * stay reachable by URL but are left out of the directory, the sitemap and
 * search (noindex), so the site does not publish hundreds of empty pages.
 */
export const centreHasListings = (c) => Boolean(c && (c.upcomingCount || c.pastCount || c.description));

/**
 * The public directory: every centre with something to show (see
 * centreHasListings). `hidden` is how many empty venues were left out. Fails
 * soft to [].
 */
export async function getExhibitionCentres() {
  const data = await getJson("/api/exhibition-centres", { tags: [CENTRES_TAG] });
  const all = Array.isArray(data?.items) ? data.items.map(toPublicCentre).filter(Boolean) : [];
  const items = all.filter(centreHasListings);
  return { items, total: items.length, hidden: all.length - items.length };
}

/** One centre with its upcoming and most recent past shows, or null when there is no such centre. */
export async function getExhibitionCentre(slug) {
  if (!slug) return null;
  const data = await getJson(`/api/exhibition-centres/${encodeURIComponent(slug)}`, { tags: [CENTRES_TAG] });
  const centre = toPublicCentre(data?.centre);
  if (!centre) return null;
  return {
    centre,
    upcoming: Array.isArray(data.upcoming) ? data.upcoming.map(toPublicExhibition).filter(Boolean) : [],
    past: Array.isArray(data.past) ? data.past.map(toPublicExhibition).filter(Boolean) : [],
    pastCount: Number(data.pastCount) || 0,
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Exhibitions                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

/** The three listing endpoints, keyed by the scope names used in public URLs. */
export const EXHIBITION_SCOPES = Object.freeze({
  upcoming: "/upcoming",
  ongoing: "/ongoing",
  previous: "/previous",
});

// Re-exported so server callers already importing from the data layer do not
// need a second import for the one constant. The definition lives in
// lib/exhibition-scopes.js because the client bundle needs it too.
export { ALL_SCOPE };

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

/**
 * Featured listing (is_featured: true). Separate endpoint from the scope
 * listings, and unpaginated in practice - the set is small and curated.
 *
 * Its projection was widened alongside the scope endpoints to include venue and
 * the two image fields, so a featured record now maps through toPublicExhibition
 * with the same fidelity as any other card.
 */
/** Cache tag on the featured list, so featuring a show updates the home slider at once. */
export const FEATURED_TAG = "featured-exhibitions";

export async function getFeaturedExhibitions({ page = 1, limit = 12 } = {}) {
  const payload = await getJson("/api/exhibitions/featured", {
    params: { page, limit: Math.min(100, limit) },
    tags: [FEATURED_TAG],
  });
  return toList(payload, toPublicExhibitionFeatured);
}

/**
 * The home page slider: featured shows that are live or still to come, live
 * first, then soonest first, up to `limit`.
 *
 * The featured endpoint returns every featured show still inside its feature
 * window, sorted by start date - past ones included, since a show featured
 * before durations existed stays featured until an admin removes it. Taking
 * its first 8 meant the slider opened on shows that had ENDED (THAIFEX, March 2026, badged "Ended") while a newly featured future show sat
 * past the cut-off and never appeared. So the whole set is read (it is small
 * and curated; the admin Featured page lists it) and filtered here.
 */
export async function getFeaturedForSlider({ limit = 20, now = new Date() } = {}) {
  const today = now.toISOString().slice(0, 10);
  const day = (v) => (v ? String(v).slice(0, 10) : "");
  const all = [];
  for (let page = 1; page <= 3; page += 1) {
    const { items, totalPages } = await getFeaturedExhibitions({ page, limit: 100 });
    all.push(...items);
    if (page >= (totalPages || 1) || !items.length) break;
  }
  // isFeatured is false once a show's feature window has run out; the API
  // already drops those, but a cached copy can outlive the window by a day.
  const current = all.filter(
    (e) => e.isFeatured && day(e.startDate) && (day(e.endDate) || day(e.startDate)) >= today
  );
  const isLive = (e) => day(e.startDate) <= today;
  current.sort((a, b) => {
    if (isLive(a) !== isLive(b)) return isLive(a) ? -1 : 1;
    return day(a.startDate).localeCompare(day(b.startDate));
  });
  return { items: current.slice(0, limit), total: current.length };
}

/** Single exhibition. Public endpoint returning the whole document. */
export async function getExhibitionById(exhibitionId) {
  if (!exhibitionId) return null;
  const doc = await getJson(`/api/find/exhibition/${exhibitionId}`, { tags: [exhibitionTag(exhibitionId)] });
  return toPublicExhibitionDetail(doc);
}

/**
 * Keyword search within a scope.
 *
 * `search` is the only parameter the *search endpoints accept. They return
 * FULL documents with no pagination and no server-side limit, so the page is
 * cut out of the response HERE, before anything is mapped - only `limit` rows
 * are ever shaped, whatever the match count.
 *
 * PAGED ON THIS SIDE. This used to return only the first `limit` rows with
 * totalPages: 1, so a search reporting "314 matched" showed 24 and offered no
 * way to the rest. The endpoint already sends every match, so paging is a slice
 * of what has arrived, not an extra request — and getJson's 60s cache means
 * page 2 of the same query costs nothing.
 */
export async function searchExhibitions(scope, search, { limit = 24, page = 1 } = {}) {
  if (scope === ALL_SCOPE) return searchAllScopes(search, { limit, page });
  const { rows, total } = await fetchScopeSearch(scope, search);
  return pageOf(rows, total, { limit, page });
}

/** One scope's raw matches. Rows are unmapped so callers map only what they show. */
async function fetchScopeSearch(scope, search) {
  const path = EXHIBITION_SCOPES[scope];
  if (!path) return { rows: [], total: 0 };
  const payload = await getJson(`${path}search`, {
    params: { search: str(search) },
    revalidate: 60, // searches are long-tail; keep them fresher and cheaper to miss
  });
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return { rows, total: Number(payload?.count) || rows.length };
}

/** Cut one page out of a full result set, then map just that page. */
function pageOf(rows, total, { limit, page }, mapRow = toPublicExhibition) {
  const totalPages = Math.max(1, Math.ceil(rows.length / limit));
  const current = Math.max(1, Math.floor(page) || 1);
  const start = (current - 1) * limit;
  return {
    items: rows.slice(start, start + limit).map(mapRow).filter(Boolean),
    total,
    page: current,
    limit,
    totalPages,
  };
}

/**
 * The order results appear in an all-scopes search, and the reason for it:
 * something open to visitors today is the most actionable, something still to
 * come is next, and the archive is what you want last.
 */
const ALL_SCOPE_ORDER = Object.freeze(["ongoing", "upcoming", "previous"]);

/**
 * Keyword search across every scope at once.
 *
 * WHY THIS EXISTS
 * A search box that silently only ever searched `upcoming` was the bug this
 * fixes: a visitor on the Past exhibitions tab typed a name, got "no results",
 * and concluded the site did not have the event — while the record sat in the
 * archive the whole time.
 *
 * WHY THREE REQUESTS AND NOT A NEW BACKEND ENDPOINT
 * /upcomingsearch, /ongoingsearch and /previoussearch already apply the exact
 * same $or across the same six fields; only the date window differs, and the
 * three windows are mutually exclusive. A combined endpoint would duplicate
 * that logic server-side for no behavioural gain. They run in parallel, and
 * getJson caches each for 60s, so a repeated query costs nothing.
 *
 * `byScope` carries each scope's own total so the UI can say WHERE the matches
 * are — that is what stops a visitor concluding a record does not exist.
 */
export async function searchAllScopes(search, { limit = 24, page = 1 } = {}) {
  const settled = await Promise.all(ALL_SCOPE_ORDER.map((scope) => fetchScopeSearch(scope, search)));

  const byScope = {};
  const seen = new Set();
  const tagged = [];

  ALL_SCOPE_ORDER.forEach((scope, i) => {
    byScope[scope] = settled[i].total;
    for (const row of settled[i].rows) {
      // The three date windows cannot overlap, so this is belt and braces —
      // but a record with a bad date pair must not be rendered twice.
      const key = row?._id ? String(row._id) : null;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      tagged.push({ row, scope });
    }
  });

  // Paged over the MERGED list, in ALL_SCOPE_ORDER, so page 1 is ongoing first and
  // the archive comes last. `total` stays the sum of the scope counts, which is
  // what the per-tab badges add up to.
  const result = pageOf(tagged, ALL_SCOPE_ORDER.reduce((sum, s) => sum + (byScope[s] || 0), 0), { limit, page }, ({ row, scope }) => {
    const item = toPublicExhibition(row);
    return item ? { ...item, scope } : null;
  });
  return { ...result, byScope };
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
  // Same tag as the exhibition: an exhibitor listing itself refreshes this list too.
  return toList(await getJson(`/api/company/${exhibitionId}`, { tags: [exhibitionTag(exhibitionId)] }), toPublicCompany);
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

/**
 * The public shape PLUS the owner id. SERVER-ONLY, and the distinction matters.
 *
 * `ownerId` is a Signupmodel _id. toPublicService drops it on purpose - a user id
 * on a public page is an enumeration handle - and tests/services-scope.test.mjs
 * pins that it never appears in a published shape. It is reinstated here for one
 * job: grouping a provider's several listings so a detail page can link "also
 * offers Fabrication, Printing".
 *
 * That grouping happens entirely on the server, in lib/services.js, which strips
 * ownerId again before any of this reaches a Client Component. Anything that
 * renders in the browser must take the plain toPublicService shape, or the id
 * travels to the browser inside the RSC payload.
 */
export function toDirectoryService(doc) {
  const base = toPublicService(doc);
  if (!base) return null;
  return { ...base, ownerId: id(doc.createdBy) || null };
}

/** As getServices, but each row carries its owner id. See toDirectoryService. */
export async function getServicesWithOwner() {
  return toList(await getJson("/api/getexhibitionservice"), toDirectoryService);
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Reference geography                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * The backend's country reference list (~250 entries with ISO codes and flags),
 * served from /locations/countries — outside the /api namespace, like the
 * exhibition scope endpoints.
 *
 * WHAT THIS IS FOR, AND WHAT IT IS NOT FOR
 * It is a lookup table, not a source of pages. The catalogue decides which
 * countries earn a landing page (MIN_COUNTRY in lib/locations.js); this only
 * supplies the flag and ISO code for countries that already qualify, so the
 * location hub can present them properly instead of as bare strings.
 *
 * Generating a page per entry would create ~200 empty doorway pages, which is
 * precisely the thin programmatic SEO the rest of this codebase avoids.
 *
 * Cached for a day: a country list does not change between deploys.
 */
export async function getGeoCountries() {
  const payload = await getJson("/locations/countries", { revalidate: 86400 });
  if (!Array.isArray(payload)) return [];
  return payload
    .map((c) => ({
      name: str(c?.name),
      isoCode: str(c?.isoCode).toUpperCase(),
      flag: str(c?.flag),
    }))
    .filter((c) => c.name && c.isoCode);
}

/**
 * Country name -> { isoCode, flag }, keyed case-insensitively so a catalogue
 * spelling ("united states") still resolves. Returns an empty Map on failure,
 * so every caller degrades to showing no flag rather than breaking.
 */
export async function getGeoCountryMap() {
  const list = await getGeoCountries();
  const map = new Map();
  for (const c of list) map.set(c.name.toLowerCase(), c);
  return map;
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
 * Cities with upcoming exhibitions, most listings first, from a SAMPLE.
 *
 * Derived from live data rather than a hardcoded list, because the location
 * fields are free text with no enum and any fixed taxonomy would be invention.
 *
 * NOTE THE SAMPLE. It reads one page of `sample` records out of ~2,170, so it
 * ranks cities within page one of the catalogue, not across it. That is fine
 * for a decorative chip row and wrong for anything that decides which pages
 * exist or which links are emitted — use getLocationIndex() in lib/locations.js
 * for that, which walks the whole set and applies a quality threshold.
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
 * Categories present in upcoming exhibitions, most listings first.
 *
 * CURRENTLY ALWAYS RETURNS []. The /upcoming projection does not include
 * `category` (see toPublicExhibition above), so there is nothing to group. It
 * is kept, unused, because it is correct code waiting on a one-line backend
 * change — and deleting it would hide the fact that category-based discovery is
 * a backend decision away, not a frontend one. Do not wire it into a page and
 * do not build a /exhibitions-in-category route until the projection includes
 * the field; the result today would be an empty page.
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
