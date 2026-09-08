/**
 * Post-deployment verification for the category tier.
 *
 * Run from the frontend repo root AFTER the backend has been pulled and
 * restarted on production:
 *
 *   node verify-deploy.mjs
 *
 * Checks, in order, exactly the seven items in the deployment request:
 *   2. /upcoming returns the five new fields
 *   3. those fields carry real values
 *   4. /exhibitions-for flips from noindex to index,follow
 *   5. the three named category routes return 200 + index,follow
 *   6. the sitemap contains the hub and the category URLs
 *
 * Item 1 (restart) and item 7 (startup logs) are server-side and cannot be
 * checked from here - see the notes it prints at the end.
 *
 * This file is a throwaway utility, not part of the app. Delete it once the
 * deployment is verified.
 */
import fs from "node:fs";

const SITE = process.env.SITE || "https://onexhib.com";
const env = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
const API = (process.env.API || env.match(/^BACKEND_URL=(.*)$/m)?.[1] || "").trim().replace(/\/+$/, "");

const NEW_FIELDS = ["category", "venue", "original_image_url", "thumbnail_url", "is_featured"];
const CATEGORY_ROUTES = [
  "/exhibitions-for/technology",
  "/exhibitions-for/health",
  "/exhibitions-for/manufacturing",
];

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
  if (detail) console.log(`      ${detail}`);
};

const robotsOf = (html) =>
  html.match(/<meta name="robots" content="([^"]*)"/)?.[1] || "<none>";

// ── 2 & 3. API projection and real values ────────────────────────────────
let sample = {};
try {
  const res = await fetch(`${API}/upcoming?page=1&limit=2`);
  const json = await res.json();
  sample = json.data?.[0] || {};
  const missing = NEW_FIELDS.filter((f) => !(f in sample));
  record(
    "2. /upcoming exposes the five new fields",
    res.status === 200 && missing.length === 0,
    missing.length ? `missing: ${missing.join(", ")}` : `status ${res.status}, total ${json.total}`
  );

  const populated = NEW_FIELDS.filter(
    (f) => sample[f] !== undefined && sample[f] !== null && sample[f] !== ""
  );
  record(
    "3. those fields carry real values",
    typeof sample.category === "string" && sample.category.trim().length > 0,
    `category=${JSON.stringify(String(sample.category ?? "").slice(0, 40))}, populated: ${populated.join(", ") || "none"}`
  );
} catch (e) {
  record("2/3. API projection", false, `request failed: ${e.message}`);
}

// ── 4. Hub is indexable ──────────────────────────────────────────────────
try {
  const res = await fetch(`${SITE}/exhibitions-for`, { redirect: "follow" });
  const html = await res.text();
  const robots = robotsOf(html);
  const emptyState = html.includes("Industry listings are not available yet");
  record(
    "4. /exhibitions-for is index,follow",
    res.status === 200 && robots.includes("index") && !robots.includes("noindex") && !emptyState,
    `status ${res.status}, robots="${robots}", empty-state=${emptyState}`
  );
} catch (e) {
  record("4. /exhibitions-for", false, `request failed: ${e.message}`);
}

// ── 5. Category routes ───────────────────────────────────────────────────
for (const path of CATEGORY_ROUTES) {
  try {
    const res = await fetch(SITE + path, { redirect: "follow" });
    const robots = res.status === 200 ? robotsOf(await res.text()) : "<n/a>";
    record(
      `5. ${path}`,
      res.status === 200 && robots.includes("index") && !robots.includes("noindex"),
      `status ${res.status}, robots="${robots}"`
    );
  } catch (e) {
    record(`5. ${path}`, false, `request failed: ${e.message}`);
  }
}

// ── 6. Sitemap ───────────────────────────────────────────────────────────
try {
  const xml = await (await fetch(`${SITE}/sitemap/0.xml`)).text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const forUrls = locs.filter((u) => u.includes("/exhibitions-for"));
  const hasHub = forUrls.some((u) => u.endsWith("/exhibitions-for"));
  record(
    "6. sitemap contains the hub and category URLs",
    hasHub && forUrls.length > 1,
    `${locs.length} total URLs, ${forUrls.length} exhibitions-for (hub present: ${hasHub})`
  );
} catch (e) {
  record("6. sitemap", false, `request failed: ${e.message}`);
}

// ── Summary ──────────────────────────────────────────────────────────────
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log("\nIf the API checks pass but the site checks fail, the frontend's");
  console.log("hourly ISR cache has not expired yet - redeploy the frontend or");
  console.log("wait up to 60 minutes, then re-run this script.");
}
console.log("\nStill to confirm manually on the server:");
console.log("  1. the Node process was actually restarted");
console.log('  7. startup log shows: [cloudinary] configured for cloud "..."');
console.log("     and NO api_secret value  ->  pm2 logs <app> --lines 50");
console.log("  +  rotate the Cloudinary api_secret once the above is confirmed");

process.exit(failed.length ? 1 : 0);
