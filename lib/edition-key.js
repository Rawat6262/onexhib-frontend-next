// Pure: no data access, so tests and any caller can use it. See lib/editions.js.

/**
 * A show's name without what changes between editions.
 *
 *   "KISAN Agri Show 2026 (34th Edition)"    -> "kisan agri show"
 *   "140th China Import and Export Fair ..." -> "china import and export fair ..."
 *   "India Art Festival - Mumbai 2026"       -> "india art festival mumbai"
 */
export function seriesKey(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFKD")
    // Accents off, so "Tüyap" and "Tuyap" are one show.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(/['’]\d{2}\b/g, " ")
    .replace(/\b\d{1,3}(st|nd|rd|th)\b/g, " ")
    .replace(/\b(edition|editions|annual)\b/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
