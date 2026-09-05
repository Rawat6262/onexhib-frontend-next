/**
 * SEO slugs for the public detail routes.
 *
 * The backend has no slug field. `exhibtion_url`, `company_url` and
 * `product_url` are Cloudinary image URLs despite their names, so the only
 * stable identifier on any record is the Mongo `_id`. A public URL therefore
 * carries a readable, keyword-bearing slug with the 24-hex id appended:
 *
 *   /exhibition/india-international-mega-trade-fair-68f1a2b3c4d5e6f7a8b9c0d1
 *
 * The id is parsed back off the end, so renaming a record never 404s an older
 * link: the slug half is decorative, the id half is authoritative. Pages
 * compare the incoming slug against `toSlug()` and redirect to the canonical
 * form when they differ, so a stale slug doesn't become a duplicate URL.
 */

const OBJECT_ID = /^[a-f0-9]{24}$/i;

/** Readable half of a slug. Never returns a value ending in "-". */
export function slugifyName(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 80)
    .replace(/-+$/, ""); // slice() can leave a trailing dash behind
}

/** Build the canonical slug for a record. Falls back to a bare id. */
export function toSlug(name, id) {
  const base = slugifyName(name);
  return base ? `${base}-${id}` : String(id ?? "");
}

/** Pull the Mongo id back out of a slug, or null if there isn't a valid one. */
export function idFromSlug(slug) {
  const tail = String(slug || "").split("-").pop();
  return OBJECT_ID.test(tail) ? tail : null;
}

/** True when `slug` is already the canonical form for this record. */
export function isCanonicalSlug(slug, name, id) {
  return slug === toSlug(name, id);
}
