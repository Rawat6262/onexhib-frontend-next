// Pure: no data access, so tests and any caller can use it.
// Used by app/(public)/exhibition/[slug]/page.jsx. Tests: tests/seo-title.test.mjs

/**
 * An exhibition's name cut down to fit a search-result title, keeping what
 * someone would search for.
 *
 * About one name in ten runs past 60 characters, and some past 190, because
 * organisers append marketing lines: "D-arc BUILD 2026 Bengaluru - India's
 * Leading Design, Architecture, Building & Construction Exhibition - ...".
 * Bing flags those titles as too long; both engines cut them mid-phrase.
 *
 * Steps, each tried only if the name still does not fit:
 *
 *   1. Drop edition counters ("140th", "(19th Edition)", "- 9th Edition").
 *      They change every year and nobody searches for them; dropping one is
 *      what lets "China Import and Export Fair (Canton Fair) - Phase 3, 2026"
 *      keep both "Canton Fair" and the phase.
 *   2. Keep the name before the first " - " and as many of the following
 *      parts as fit whole. The first part is nearly always the distinctive
 *      name with its year and city; what follows is description.
 *   3. If that dropped the year, put it back: the year is half of most
 *      searches for a show ("Canton Fair 2026").
 *   4. Still too long (one long part, often a parenthetical spelling out an
 *      acronym): cut at a word, never inside one, and mark the cut with "…",
 *      keeping the year when the cut would have taken it.
 *
 * A name that fits is returned untouched: parentheses, editions and all.
 */
const SEPARATOR = /\s+[-–—|:]\s+/;
const YEAR = /\b(19|20)\d{2}\b/;
// Words a cut must not end on: "Trade Fair for…" reads as broken, "Trade Fair…" does not.
const DANGLING = /(?:\s+(?:&|and|of|for|the|in|on|at|to|with|a|an|by|from))+$/i;

const tidy = (s) =>
  s
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,)])/g, "$1")
    .replace(/[\s,–—-]+$/, "")
    .trim();

function dropEditions(name) {
  return tidy(
    name
      // "(19th Edition)", "(Edition 4)", "- 9th Edition", "4th edition"
      .replace(/\(\s*(?:\d{1,3}(?:st|nd|rd|th)\s+edition|edition\s+\d{1,3})\s*\)/gi, "")
      .replace(/(?:\s+[-–—]\s+)?\b\d{1,3}(?:st|nd|rd|th)\s+edition\b/gi, "")
      // A leading counter: "140th China Import..." -> "China Import..."
      .replace(/^\d{1,3}(?:st|nd|rd|th)\s+/i, "")
  );
}

function cutAtWord(text, max) {
  if (text.length <= max) return text;
  const room = text.slice(0, max - 1); // one character for the ellipsis
  const space = room.lastIndexOf(" ");
  const cut = (space > max * 0.5 ? room.slice(0, space) : room).replace(DANGLING, "");
  return `${tidy(cut.replace(/[(,;:]+$/, ""))}…`;
}

export function shortTitle(name, max = 60) {
  const full = String(name || "").replace(/\s+/g, " ").trim();
  if (full.length <= max) return full;

  // 1
  const lean = dropEditions(full);
  if (lean.length <= max) return lean;

  // 2
  const parts = lean.split(SEPARATOR).filter(Boolean);
  let title = parts[0];
  let used = 1;
  for (; used < parts.length; used++) {
    const next = `${title} – ${parts[used]}`;
    if (next.length > max) break;
    title = next;
  }

  // 3
  const year = lean.match(YEAR)?.[0];
  if (year && !YEAR.test(title)) {
    title = `${title} ${year}`.length <= max ? `${title} ${year}` : `${cutAtWord(title, max - year.length - 1)} ${year}`;
  }

  // A bare acronym says nothing on its own, so a very short name takes the
  // start of what follows: "ETPP 2026 – Emerging Trends in…". Anything longer
  // stops at the name, leaving the room for the city the page title appends.
  if (title.length < 20 && used < parts.length) {
    const more = cutAtWord(`${title} – ${parts.slice(used).join(" – ")}`, max);
    if (more.length > title.length + 6) title = more;
  }

  // 4 - a cut that would take the year with it keeps the year instead:
  // "China International Smart Healthcare & Digital… 2026".
  if (title.length <= max) return title;
  const cut = cutAtWord(title, max);
  return year && !YEAR.test(cut) ? `${cutAtWord(title.replace(YEAR, "").trim(), max - year.length - 1)} ${year}` : cut;
}
