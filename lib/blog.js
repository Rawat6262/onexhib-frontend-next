import * as hotspots from "@/content/blog/where-trade-shows-happen-2026-27.mdx";
import * as season from "@/content/blog/trade-show-season-calendar-2026-27.mdx";

/**
 * The blog post registry.
 *
 * EXPLICIT IMPORTS, NOT A DIRECTORY SCAN. Reading content/blog/ from disk at
 * request time works in development and then fails in a traced production
 * build, because the .mdx files are not bundled unless something imports them.
 * Listing them here means the bundler sees every post, and adding one is a
 * single obvious line rather than a filesystem convention to remember.
 *
 * Each post exports `meta` from its own .mdx file, so a post's title, date and
 * description live beside its prose and cannot drift out of sync with it. (No
 * frontmatter plugin: see the note in next.config.mjs.)
 */
const MODULES = [hotspots, season];

/** A post is publishable only once it has the fields the page and schema need. */
function isValid(m) {
  const p = m?.meta;
  return Boolean(p?.slug && p?.title && p?.description && p?.published && m?.default);
}

const POSTS = MODULES.filter(isValid)
  .map((m) => ({ ...m.meta, Body: m.default }))
  // Newest first. A post dated in the future is still listed: scheduling would
  // need a build at publish time, and a manual deploy cannot guarantee that,
  // so a misleading "scheduled" feature is deliberately absent.
  .sort((a, b) => String(b.published).localeCompare(String(a.published)));

export function getAllPosts() {
  return POSTS;
}

export function getPost(slug) {
  return POSTS.find((p) => p.slug === slug) || null;
}

/** True when the blog has nothing to show, which is what makes the hub noindex. */
export function isBlogEmpty() {
  return POSTS.length === 0;
}

/** "9 September 2026" — matches the date style used on the prose pages. */
export function formatPostDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
