/**
 * Display formatting for public pages.
 *
 * Deliberately does NOT use Intl/toLocaleDateString: those resolve against the
 * runtime's locale and timezone, which differ between the server that renders
 * the HTML and the browser that hydrates it, producing hydration mismatches.
 * Fixed tables below render identically everywhere.
 *
 * Dates arrive from Mongo as ISO strings ("2026-03-14T00:00:00.000Z"). They are
 * read in UTC throughout — an exhibition's start date is a calendar date, not a
 * moment in time, so shifting it into a local timezone would be wrong.
 */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

function parse(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "14 March 2026", or "" when the date is missing/unparseable. */
export function formatDate(value, { short = false } = {}) {
  const d = parse(value);
  if (!d) return "";
  const names = short ? MONTHS_SHORT : MONTHS;
  return `${d.getUTCDate()} ${names[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Collapses a range to the shortest unambiguous form:
 *   same day    → "14 March 2026"
 *   same month  → "14 – 18 March 2026"
 *   same year   → "28 March – 2 April 2026"
 *   otherwise   → "28 December 2026 – 2 January 2027"
 */
export function formatDateRange(start, end, { short = false } = {}) {
  const a = parse(start);
  const b = parse(end);
  if (!a && !b) return "";
  if (!a) return formatDate(end, { short });
  if (!b) return formatDate(start, { short });

  const names = short ? MONTHS_SHORT : MONTHS;
  const sameYear = a.getUTCFullYear() === b.getUTCFullYear();
  const sameMonth = sameYear && a.getUTCMonth() === b.getUTCMonth();

  if (sameMonth && a.getUTCDate() === b.getUTCDate()) return formatDate(start, { short });
  if (sameMonth) {
    return `${a.getUTCDate()} – ${b.getUTCDate()} ${names[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
  }
  if (sameYear) {
    return `${a.getUTCDate()} ${names[a.getUTCMonth()]} – ${b.getUTCDate()} ${names[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
  }
  return `${formatDate(start, { short })} – ${formatDate(end, { short })}`;
}

/** "2026-03-14" — for <time dateTime> and schema.org startDate/endDate. */
export function toIsoDate(value) {
  const d = parse(value);
  return d ? d.toISOString().slice(0, 10) : "";
}

/** Joins whatever location parts exist: "Pragati Maidan, New Delhi, India". */
export function formatLocation({ venue, city, state, country } = {}, { includeVenue = true } = {}) {
  return [includeVenue ? venue : null, city, state, country]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean)
    .filter((p, i, all) => all.indexOf(p) === i) // drop "Delhi, Delhi"
    .join(", ");
}

/** Trims prose to a clean sentence-ish length for meta descriptions and cards. */
export function truncate(text, max = 160) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const at = cut.lastIndexOf(" ");
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[,;:.\s]+$/, "")}…`;
}

/** Prices are optional on products and often absent; never invent a currency. */
export function formatPrice(price, unit) {
  if (price === null || price === undefined || price === "") return "";
  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) return "";
  const formatted = `₹${n.toLocaleString("en-IN")}`;
  return unit ? `${formatted} / ${unit}` : formatted;
}
