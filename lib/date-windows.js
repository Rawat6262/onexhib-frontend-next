/**
 * Pure date-window arithmetic for the discovery pages.
 *
 * Deliberately free of imports. lib/discovery.js, which does the fetching, uses
 * the "@/..." alias — which Next resolves and plain node does not — so keeping
 * these functions here lets tests/discovery.test.mjs run them directly with no
 * bundler, loader or alias configuration. They are also the part most worth
 * testing: off-by-one week boundaries and month rollovers are invisible in a
 * build and wrong only on particular days.
 *
 * Everything is UTC. A visitor in Auckland and a visitor in Los Angeles must
 * see the same "this week", and an ISR-cached page can only have one answer.
 */

/** Midnight UTC on the given date. */
export function utcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * The Monday-to-Sunday week containing `now`, as a half-open [start, end).
 *
 * Matches getExhibitionsThisWeek in the backend controller, so the two never
 * disagree about which week it is. The Sunday case is the one that bites:
 * getUTCDay() returns 0 for Sunday, and a plain `day - 1` would move the window
 * a week forward instead of six days back.
 */
export function currentWeekRange(now = new Date()) {
  const today = utcDay(now);
  const dayOfWeek = today.getUTCDay(); // 0 = Sunday … 6 = Saturday
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - diffToMonday);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  return { start, end };
}

/**
 * One calendar month as a half-open [first, first-of-next).
 *
 * Half-open rather than a $gte/$lte pair on the last day, which needs the
 * month's length and gets February wrong in leap years. Date.UTC also rolls
 * month 13 into the next January on its own, so December needs no special case.
 */
export function monthRange(year, month /* 1-12 */) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const monthName = (month) => MONTH_NAMES[month - 1] || "";

/** "March 2027" */
export const monthLabel = (year, month) => `${monthName(month)} ${year}`;

/** The URL segment pair, zero-padded so /monthly/2026/09 sorts and reads right. */
export const monthSlug = (year, month) => ({
  year: String(year),
  month: String(month).padStart(2, "0"),
});

/**
 * How many exhibitions a month needs before it earns its own page.
 *
 * Without a floor, every month the catalogue touches becomes a URL — including
 * ones holding two events. That is a thin page, and at scale it is doorway
 * generation. Mirrors MIN_CITY / MIN_COUNTRY / MIN_CATEGORY elsewhere.
 */
export const MIN_MONTH_EXHIBITIONS = 12;
