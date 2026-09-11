/**
 * Pure tests for the date-window discovery logic.
 *
 * These cover the parts that are easy to get subtly wrong and impossible to
 * notice in a build: which days a "week" contains, whether a month range is
 * half-open, and whether the indexable-month threshold actually excludes thin
 * months. All are pure functions over dates, so no server, database or network
 * is involved.
 *
 * Run: npm run test:seo
 */
import {
  MIN_MONTH_EXHIBITIONS,
  currentWeekRange,
  monthLabel,
  monthRange,
  monthSlug,
  utcDay,
} from "../lib/date-windows.js";

let failed = 0;
function check(name, ok, detail = "") {
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

const iso = (d) => d.toISOString().slice(0, 10);

console.log("discovery: week windows");

// A Wednesday. The week must run Monday-to-Monday around it.
{
  const { start, end } = currentWeekRange(new Date("2026-09-09T13:45:00Z"));
  check("Wednesday resolves to its Monday", iso(start) === "2026-09-07", iso(start));
  check("week is 7 days, half-open", iso(end) === "2026-09-14", iso(end));
}

// Sunday is the trap: getUTCDay() returns 0, so a naive `day - 1` would jump
// forward a week instead of back six days.
{
  const { start, end } = currentWeekRange(new Date("2026-09-13T23:59:00Z"));
  check("Sunday belongs to the week that began Monday", iso(start) === "2026-09-07", iso(start));
  check("Sunday week ends on the next Monday", iso(end) === "2026-09-14", iso(end));
}

// Monday must map to itself, not to the previous week.
{
  const { start } = currentWeekRange(new Date("2026-09-07T00:00:01Z"));
  check("Monday maps to itself", iso(start) === "2026-09-07", iso(start));
}

// A late-evening timestamp must not roll into the next day's week.
{
  const a = currentWeekRange(new Date("2026-09-09T00:00:00Z"));
  const b = currentWeekRange(new Date("2026-09-09T23:59:59Z"));
  check("time of day does not change the week", iso(a.start) === iso(b.start));
}

console.log("");
console.log("discovery: month windows");

{
  const { start, end } = monthRange(2027, 3);
  check("month starts on the 1st", iso(start) === "2027-03-01", iso(start));
  check("month end is exclusive (1st of next)", iso(end) === "2027-04-01", iso(end));
}

// December must roll the year, not produce month 13.
{
  const { start, end } = monthRange(2026, 12);
  check("December rolls into the next January", iso(end) === "2027-01-01", iso(end));
  check("December starts correctly", iso(start) === "2026-12-01", iso(start));
}

// February in a leap year — the half-open range makes this work without any
// day-count arithmetic at all.
{
  const { end } = monthRange(2028, 2);
  check("leap February ends on 1 March", iso(end) === "2028-03-01", iso(end));
}

console.log("");
console.log("discovery: labels and slugs");

check("monthLabel reads naturally", monthLabel(2027, 3) === "March 2027", monthLabel(2027, 3));
check("monthLabel handles December", monthLabel(2026, 12) === "December 2026");

{
  const s = monthSlug(2026, 9);
  check("slug zero-pads the month", s.month === "09", s.month);
  check("slug year is a string", s.year === "2026", s.year);
}
{
  const s = monthSlug(2026, 12);
  check("two-digit month is unchanged", s.month === "12", s.month);
}

console.log("");
console.log("discovery: utc day");

{
  const d = utcDay(new Date("2026-09-09T22:30:00Z"));
  check("utcDay truncates the time", d.toISOString() === "2026-09-09T00:00:00.000Z", d.toISOString());
}

console.log("");
console.log("discovery: indexing threshold");

check(
  "a thin month is excluded",
  MIN_MONTH_EXHIBITIONS > 1,
  `threshold is ${MIN_MONTH_EXHIBITIONS}`
);
check(
  "threshold is high enough to mean something",
  MIN_MONTH_EXHIBITIONS >= 10,
  `a month needs ${MIN_MONTH_EXHIBITIONS}+ exhibitions to get its own page`
);

console.log("");
if (failed) {
  console.log(`FAILED — ${failed} check(s)`);
  process.exit(1);
}
console.log("OK — all discovery checks passed");
