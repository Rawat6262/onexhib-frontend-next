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
        // `previous` runs newest-ending first: once a show ended before the
        // window opened, every later record ended earlier still, so stop.
        if (scope === "previous") {
          const endsAt = parseDate(item.endDate);
          if (endsAt && endsAt < start) {
            pastWindow = true;
            break;
          }
        }
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

/**
 * One calendar month. A month that has started also walks `previous`: shows
 * that already closed still belong to it. Without that, a month's page emptied
 * itself as its shows ended and turned into a 404 - including months Google had
 * already indexed while they were upcoming (seen in Search Console).
 */
export async function getMonthExhibitions(year, month, now = new Date()) {
  const range = monthRange(year, month);
  const scopes = range.start <= now ? ["previous", "ongoing", "upcoming"] : ["ongoing", "upcoming"];
  return getExhibitionsInWindow({ ...range, scopes });
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

/**
 * Compact events for the interactive calendar on /exhibitions/monthly - the same
 * window and the same cached walk as getMonthlyIndex, so it costs no extra
 * request. Four short values per exhibition keep the payload small:
 *
 *   countries / cities / industries: string[]
 *   events: [startDate "YYYY-MM-DD", countryIdx, cityIdx | -1, industryIdx | -1][]
 *
 * Industry is the canonical one the backend assigned (categoryNormalized), so
 * chips read "Food & Beverage" rather than every organiser's own wording.
 */
export async function getCalendarEvents(now = new Date()) {
  const today = utcDay(now);
  const horizon = new Date(today);
  horizon.setUTCMonth(horizon.getUTCMonth() + MONTHS_AHEAD);

  const items = await getExhibitionsInWindow({
    start: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)),
    end: horizon,
  });

  const lists = { country: [], city: [], industry: [] };
  const index = { country: new Map(), city: new Map(), industry: new Map() };
  const intern = (kind, value) => {
    const label = typeof value === "string" ? value.trim() : "";
    if (!label) return -1;
    const key = label.toLowerCase();
    if (!index[kind].has(key)) {
      index[kind].set(key, lists[kind].length);
      lists[kind].push(label);
    }
    return index[kind].get(key);
  };

  const events = [];
  for (const item of items) {
    const d = parseDate(item.startDate);
    if (!d) continue;
    const ci = intern("country", item.country);
    if (ci < 0) continue;
    events.push([d.toISOString().slice(0, 10), ci, intern("city", item.city), intern("industry", item.categoryNormalized)]);
  }

  return { countries: lists.country, cities: lists.city, industries: lists.industry, events };
}
