/**
 * Date-window discovery: "what is on this week", "what is on in March 2027".
 *
 * WHY THIS DOES NOT USE THE BACKEND'S OWN DATE ENDPOINTS
 * Express has /api/exhibitions/thisweek and /api/exhibitions/monthly, which
 * compute exactly these windows. They are deliberately not used here, for three
 * reasons found by reading the controllers:
 *
 *   1. Both sit behind restrictToLoginUser. These pages are public, so a signed
 *      -out visitor — and every crawler — would get a 401 and an empty page.
 *   2. Their projection omits city, state, country and venue. An exhibition
 *      card without a location is not worth rendering, and Event schema
 *      without a place is invalid.
 *   3. Both project `addedBy`, which is the organiser's EMAIL address despite
 *      the name (see the PII NOTES in lib/public-api.js). Rendering that would
 *      publish contact details the rest of the public layer is careful to drop.
 *
 * The public scope endpoints have none of those problems: no auth, full
 * location fields, and everything already flows through toPublicExhibition's
 * allow-list. So the window is applied here, over data that is already safe.
 *
 * COST
 * A window read walks the upcoming/ongoing scopes in pages of 100 and stops as
 * soon as the window closes, because those endpoints return records in date
 * order. A near-term window therefore costs one or two requests, not a full
 * scan, and every request is ISR-cached by the layer underneath.
 */

import { getExhibitions } from "@/lib/public-api";
import {
  MIN_MONTH_EXHIBITIONS,
  currentWeekRange,
  monthLabel,
  monthName,
  monthRange,
  monthSlug,
  utcDay,
} from "@/lib/date-windows";

// Re-exported so callers have one import for the whole discovery surface.
export { MIN_MONTH_EXHIBITIONS, currentWeekRange, monthLabel, monthName, monthRange, monthSlug, utcDay };

/** The backend caps `limit` at 100. */
const PAGE_SIZE = 100;

/**
 * Stop walking rather than following a runaway cursor.
 *
 * 30 pages is ~3,000 records, comfortably past the whole upcoming catalogue
 * (~2,000). It was 12, which silently truncated the calendar: the walk ran out
 * before reaching December, so only the next three months ever qualified for a
 * page. The `pastWindow` early exit means a near-term window still costs one or
 * two requests — this cap only bites on the far end, and every request
 * underneath is ISR-cached and shared across pages in a build.
 */
const MAX_PAGES = 30;


const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Every exhibition whose start date falls inside [start, end).
 *
 * Both `upcoming` and `ongoing` are walked: an event that began yesterday and
 * runs through the weekend is "ongoing", not "upcoming", and would otherwise be
 * missing from this week's page — which is the one week it matters most.
 * Results are de-duplicated by id, because an event can legitimately appear in
 * both scopes on the day it opens.
 */
export async function getExhibitionsInWindow({ start, end, scopes = ["ongoing", "upcoming"] } = {}) {
  if (!(start instanceof Date) || !(end instanceof Date)) return [];
  const found = new Map();

  for (const scope of scopes) {
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const { items } = await getExhibitions(scope, { page, limit: PAGE_SIZE });
      if (!items.length) break;

      let pastWindow = false;
      for (const item of items) {
        const startsAt = parseDate(item.startDate);
        if (!startsAt) continue;
        if (startsAt >= end) {
          // Scope endpoints are date-ordered, so everything after this is later
          // still. Only `upcoming` can be trusted to run forwards, though.
          if (scope === "upcoming") pastWindow = true;
          continue;
        }
        if (startsAt >= start) found.set(item.id, item);
      }

      if (pastWindow || items.length < PAGE_SIZE) break;
    }
  }

  return [...found.values()].sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
}

/** Convenience wrapper for the current week. */
export async function getThisWeekExhibitions(now = new Date()) {
  return getExhibitionsInWindow(currentWeekRange(now));
}

/** Convenience wrapper for one calendar month. */
export async function getMonthExhibitions(year, month) {
  return getExhibitionsInWindow({ ...monthRange(year, month), scopes: ["ongoing", "upcoming"] });
}



/** How far ahead to consider. Beyond a year, listings thin out to noise. */
const MONTHS_AHEAD = 14;

/**
 * Counts per upcoming month, newest-first, computed from one walk of the
 * catalogue rather than a request per month.
 */
export async function getMonthlyIndex(now = new Date()) {
  const today = utcDay(now);
  const horizon = new Date(today);
  horizon.setUTCMonth(horizon.getUTCMonth() + MONTHS_AHEAD);

  const items = await getExhibitionsInWindow({
    start: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)),
    end: horizon,
  });

  const buckets = new Map();
  for (const item of items) {
    const d = parseDate(item.startDate);
    if (!d) continue;
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const key = `${year}-${month}`;
    const entry = buckets.get(key) || { year, month, count: 0, label: monthLabel(year, month) };
    entry.count += 1;
    buckets.set(key, entry);
  }

  return [...buckets.values()].sort((a, b) => a.year - b.year || a.month - b.month);
}

/** Only the months substantial enough to index. */
export async function getIndexableMonths(now = new Date()) {
  const all = await getMonthlyIndex(now);
  return all.filter((m) => m.count >= MIN_MONTH_EXHIBITIONS);
}
