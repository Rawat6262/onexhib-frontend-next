/**
 * Exhibition services: who sees whose listings, and the bulk import.
 *
 * THE ONE RULE THIS SUITE EXISTS FOR
 *
 *   /services            (dashboard, signed in) -> ONLY the viewer's own listings
 *   /exhibition-services (public)               -> EVERY provider's listings
 *
 * These two pages read the same collection through two different endpoints, and the
 * failure mode is silent: the dashboard once called the PUBLIC endpoint, so every
 * provider saw every other provider's rows with Edit and Delete buttons beside them. The
 * buttons never worked on a stranger's row - the backend pins ownership on both mutations
 * and answers 404 - but the rows should not have been there to click, and nothing in the
 * UI said so. A test is the only thing that notices that swap.
 *
 * Source assertions, like the rest of this repository's frontend suites: there is no DOM
 * test framework here, so nothing below renders anything.
 *
 * Run: npm run test:seo
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { toPublicService, SERVICE_CATEGORIES } from "../lib/public-api.js";
import { SERVICE_CATEGORY_SLUGS, serviceCategorySlug } from "../lib/services.js";
import { alphabetBucket } from "../lib/service-alphabet.js";
import {
  GENERAL_SUBCATEGORY,
  LEGACY_SERVICE_CATEGORIES,
  RETIRED_CATEGORY_SLUGS,
  SERVICE_TAXONOMY,
  canonicalServiceCategory,
  serviceSubcategories,
} from "../lib/service-taxonomy.js";

let passed = 0;
let failed = 0;
function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log("  PASS  " + name);
  } else {
    failed++;
    console.log("  FAIL  " + name + (detail ? "  — " + detail : ""));
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => fs.readFileSync(path.join(here, "..", rel), "utf8");

/** CRLF-safe: `//[^\r\n]*`, never `//.*$`. */
const strip = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((l) => l.replace(/\r$/, "").replace(/\/\/.*/, ""))
    .join("\n");

const modelSrc = strip(read("models/service.model.js"));
const dashSrc = strip(read("app/(dashboard)/services/services-client.jsx"));
const publicSrc = strip(read("app/(public)/exhibition-services/page.jsx"));
const apiSrc = strip(read("lib/public-api.js"));
const modalSrc = strip(read("components/popups/ServiceExcelUploadModal.jsx"));
const libSrc = strip(read("lib/services.js"));
const catSrc = strip(read("app/(public)/exhibition-services/[category]/page.jsx"));
const dirSrc = strip(read("components/public/ServiceDirectory.jsx"));
const cardSrc = strip(read("components/public/ServiceProviderCard.jsx"));
const detailSrc = strip(read("app/(public)/exhibition-service/[slug]/page.jsx"));
const panelSrc = strip(read("components/public/ServiceContactPanel.jsx"));
const svcModelSrc = strip(read("models/service.model.js"));

console.log("services — the dashboard shows the viewer their OWN listings");

check("1. the scoped endpoint exists in the model",
  // Optional paging params only - still no user id anywhere in the request.
  /getMyExhibitionServices = \(params\) => axios\.get\("\/api\/myexhibitionservices", \{ params \}\)/.test(modelSrc));
check("2. the dashboard calls it", /await getMyExhibitionServices\(/.test(dashSrc));
check("3. and no longer calls the public one",
  !/getAdminExhibitionServices\(\)/.test(dashSrc),
  "the dashboard still reads the unscoped endpoint");
check("4. the dashboard does not import the public fetcher at all",
  !/getAdminExhibitionServices/.test(dashSrc));
check("5. the scoped path carries no user id for a caller to change",
  !/myexhibitionservices\/\$\{|myexhibitionservices\?/.test(modelSrc));

console.log("");
console.log("services — the public page shows EVERY provider's listings");

{
  /*
   * SCOPED TO THE FUNCTION, not to the file. There are now two callers of the unscoped
   * endpoint - getServices and getServicesWithOwner - so a bare search of the module
   * passed even when getServices itself had been repointed at the OWNER-SCOPED endpoint.
   * That swap would silently cut the public directory down to one provider's listings
   * while this assertion stayed green, because the other caller still matched. Each
   * function is now read on its own body.
   */
  const fnBody = (name) => {
    const at = apiSrc.indexOf(`export async function ${name}()`);
    return at === -1 ? "" : apiSrc.slice(at, apiSrc.indexOf("\n}", at));
  };
  check("6. getServices reads the UNSCOPED endpoint",
    /getJson\("\/api\/getexhibitionservice"\)/.test(fnBody("getServices")),
    fnBody("getServices"));
  check("6b. and never the owner-scoped one",
    !/myexhibitionservices/.test(fnBody("getServices")), fnBody("getServices"));
  check("6c. getServicesWithOwner reads the unscoped endpoint too",
    /getJson\("\/api\/getexhibitionservice"\)/.test(fnBody("getServicesWithOwner"))
    && !/myexhibitionservices/.test(fnBody("getServicesWithOwner")),
    fnBody("getServicesWithOwner"));
  check("6d. the directory layer uses one of them",
    /getServices/.test(libSrc) || /getServicesWithOwner/.test(libSrc));
}
check("7. neither public page reads the scoped one",
  !/myexhibitionservices|getMyExhibitionServices/.test(publicSrc)
  && !/myexhibitionservices|getMyExhibitionServices/.test(catSrc)
  && !/myexhibitionservices|getMyExhibitionServices/.test(libSrc));
check("8. the hub links to the category pages instead of dumping every provider",
  /serviceCategoryPath\(/.test(publicSrc) && !/ServiceProviderCard/.test(publicSrc),
  "the hub is listing providers inline again");
check("9. the category page renders the providers",
  /ServiceDirectory/.test(catSrc) && /getServiceCategory/.test(catSrc));
check("10. providers are grouped by the schema enum, not an invented taxonomy",
  /SERVICE_CATEGORIES\.map/.test(libSrc));
check("11. and that taxonomy is the 34-category one, in taxonomy order",
  SERVICE_CATEGORIES.length === 34
  && SERVICE_CATEGORIES[0] === "Stall Design & Fabrication"
  && SERVICE_CATEGORIES.at(-1) === "Exhibition Insurance"
  && JSON.stringify([...SERVICE_CATEGORIES])
     === JSON.stringify(SERVICE_TAXONOMY.map((c) => c.name)),
  SERVICE_CATEGORIES.length + " categories");
check("11b. and public-api re-exports it rather than keeping its own copy",
  /export const SERVICE_CATEGORIES = TAXONOMY_CATEGORIES;/.test(apiSrc),
  "a second hand-written category list is back in the data layer");

console.log("");
console.log("services — what a public listing may and may not say");

{
  const shaped = toPublicService({
    _id: "507f1f77bcf86cd799439011",
    full_name: "Bestway Wrappings",
    service_name: "Corporate Gifting",
    city: "Khanna",
    state: "Punjab",
    country: "India",
    address: "12 Private Road",
    mobile_number: "+91 98031 27940",
    createdBy: "507f1f77bcf86cd799439099",
    image: { url: "https://res.cloudinary.com/demo/image/upload/x.jpg", public_id: "x" },
  });

  check("12. the business name IS published — a directory needs it",
    shaped.name === "Bestway Wrappings", JSON.stringify(shaped.name));
  check("13. the category and location are published",
    shaped.service === "Corporate Gifting & Merchandise" && shaped.city === "Khanna"
    && shaped.state === "Punjab" && shaped.country === "India",
    JSON.stringify(shaped.service));
  check("13b. and a PRE-MIGRATION category name is translated forward on read",
    shaped.service === "Corporate Gifting & Merchandise",
    "an un-migrated row would vanish from every category page: " + shaped.service);
  check("14. the mobile number is NOT published",
    !("mobile_number" in shaped) && !JSON.stringify(shaped).includes("98031"),
    JSON.stringify(shaped));
  check("15. the street address is NOT published",
    !("address" in shaped) && !JSON.stringify(shaped).includes("Private Road"),
    JSON.stringify(shaped));
  check("16. the owner's user id is NOT published",
    !("createdBy" in shaped) && !JSON.stringify(shaped).includes("439099"),
    JSON.stringify(shaped));
  check("17. the image public_id — a deletion handle — is NOT published",
    !JSON.stringify(shaped).includes("public_id"), JSON.stringify(shaped));
  check("18. the shape is exactly these seven keys",
    JSON.stringify(Object.keys(shaped).sort())
      === '["city","country","id","image","name","service","state","subcategory"]',
    JSON.stringify(Object.keys(shaped).sort()));
  check("19. a document with no _id yields null rather than a half row",
    toPublicService({ full_name: "x" }) === null);
}

check("20. the provider card renders the name as React text, not markup",
  /\{name\}/.test(cardSrc) && !/dangerouslySetInnerHTML/.test(cardSrc));
check("21. a nameless legacy row still renders something",
  /\|\| "Service provider"/.test(cardSrc));

console.log("");
console.log("services — the category tier");

check("31. every enum category has a frozen slug",
  SERVICE_CATEGORIES.every((c) => typeof SERVICE_CATEGORY_SLUGS[c] === "string"
    && SERVICE_CATEGORY_SLUGS[c].length > 0),
  JSON.stringify(SERVICE_CATEGORY_SLUGS));
check("32. and no two categories share one",
  new Set(Object.values(SERVICE_CATEGORY_SLUGS)).size === SERVICE_CATEGORIES.length,
  new Set(Object.values(SERVICE_CATEGORY_SLUGS)).size + " slugs for "
  + SERVICE_CATEGORIES.length + " categories");
check("33. the slug map has no entry that is not in the enum",
  Object.keys(SERVICE_CATEGORY_SLUGS).every((k) => SERVICE_CATEGORIES.includes(k)),
  "a stale key here silently drops a category from the directory");
check("34. slugs are URL-safe lowercase",
  Object.values(SERVICE_CATEGORY_SLUGS).every((s2) => /^[a-z0-9-]+$/.test(s2)),
  JSON.stringify(Object.values(SERVICE_CATEGORY_SLUGS)));
check("35. the renamed categories kept their INDEXED slugs",
  serviceCategorySlug("Audio Visual Services") === "led-tv-rental"
  && serviceCategorySlug("Printing & Branding") === "printing"
  && serviceCategorySlug("Stall Design & Fabrication") === "fabrication"
  && serviceCategorySlug("Protocol & Event Staff") === "protocol-staff"
  && serviceCategorySlug("Corporate Gifting & Merchandise") === "corporate-gifting"
  && serviceCategorySlug("Furniture Rental") === "furniture-rental",
  "a renamed label must never move a live URL");
check("36. an unknown category has no slug rather than a guessed one",
  serviceCategorySlug("Catering") === null
  && serviceCategorySlug("Printing") === null,
  "a LEGACY name must not resolve to a slug - it is translated first, then looked up");

check("37. the filters never mint crawlable URLs",
  !/searchParams|useRouter|router\.push/.test(dirSrc),
  "URL-driven filters would create ~26x40 near-duplicate pages per category");
check("38. the filter UI is a client component",
  /^"use client";/.test(dirSrc.trim()));
check("39. it does NOT import the server-only data layer",
  !/lib\/services|lib\/public-api/.test(dirSrc),
  "lib/public-api.js throws in the browser");
check("40. server and client bucket names with the SAME function",
  /service-alphabet/.test(dirSrc) && /service-alphabet/.test(libSrc),
  "two definitions of the alphabet would make a facet chip select nothing");

check("41. names with leading punctuation bucket under their first letter",
  alphabetBucket("'Raina Creation") === "R" && alphabetBucket("  print india") === "P",
  alphabetBucket("'Raina Creation"));
check("42. a name starting with a digit is reachable, not dropped",
  alphabetBucket("5 Star Signage") === "#");
check("43. an empty name still buckets rather than throwing",
  alphabetBucket("") === "#" && alphabetBucket(null) === "#");

check("44. the provider card shows the image",
  /CardMedia/.test(cardSrc) && /provider\.image/.test(cardSrc));
check("45. the card links to the provider page",
  /servicePath\(/.test(cardSrc) && /next\/link/.test(cardSrc));
check("46. the category page is indexable, and so is the hub",
  /publicPageMetadata/.test(catSrc) && /publicPageMetadata/.test(publicSrc)
  && !/NOINDEX_FOLLOW/.test(publicSrc),
  "these pages carry real inventory now");
check("47. a category with no providers 404s instead of rendering an empty grid",
  /category && category\.count \? category : null/.test(libSrc) && /notFound\(\)/.test(catSrc));

console.log("");
console.log("services — the subcategory tier");

/*
 * THE RULE THIS BLOCK EXISTS FOR
 *
 * A subcategory is valid only underneath its own category. "Chairs" is real, and
 * "Printing & Branding" is real, and the pair is nonsense - but both halves pass any
 * check that looks at them separately. Three places could get this wrong: the public
 * projection, the facet that builds the filter chips, and the two dashboard forms.
 * Each is covered below.
 */
check("60. every category carries subcategories",
  SERVICE_TAXONOMY.every((c) => c.subcategories.length > 0),
  SERVICE_TAXONOMY.filter((c) => !c.subcategories.length).map((c) => c.name).join(", "));
check("61. 34 categories and 218 subcategories (184 specialities + General x34)",
  SERVICE_TAXONOMY.length === 34
  && SERVICE_TAXONOMY.reduce((n, c) => n + c.subcategories.length, 0) === 218,
  SERVICE_TAXONOMY.length + " / "
  + SERVICE_TAXONOMY.reduce((n, c) => n + c.subcategories.length, 0));
check("61a. every category offers the neutral value, first in its list",
  SERVICE_TAXONOMY.every((c) => c.subcategories[0] === GENERAL_SUBCATEGORY),
  "it is the always-available answer that makes a required field fair");

/*
 * THE SAME TWO OVERLAP INVARIANTS THE BACKEND SUITE ASSERTS, checked here too
 * because this copy of the taxonomy is a separate file in a separate repository.
 * There is no cross-repository test - the two deploy independently - so the rule
 * has to be enforced on both sides or it is enforced on neither.
 */
check("61b. no subcategory name is shared between categories, bar \"General\"",
  (() => {
    const seen = new Map();
    for (const c of SERVICE_TAXONOMY) {
      for (const sub of c.subcategories) seen.set(sub, (seen.get(sub) || 0) + 1);
    }
    // "General" is the one designated exception - it means the same thing in every
    // category, so sharing the name is the point. Named explicitly, so a SECOND
    // shared name still fails.
    seen.delete(GENERAL_SUBCATEGORY);
    return [...seen.values()].every((n) => n === 1);
  })(),
  "two identical chips on different pages cannot be told apart");
check("61c. and no subcategory names something that is also a category",
  (() => {
    const cats = new Set(SERVICE_CATEGORIES);
    return SERVICE_TAXONOMY.every((c) => c.subcategories.every((sub) => !cats.has(sub)));
  })(),
  "the same vendor could be filed in two places, splitting the pool");
check("61d. the merged flower category is one card, not two",
  SERVICE_CATEGORIES.includes("Flower & Plant Decoration")
  && !SERVICE_CATEGORIES.includes("Floral & Green Decor")
  && !SERVICE_CATEGORIES.includes("Flower & Decoration")
  // 10 specialities + "General".
  && serviceSubcategories("Flower & Plant Decoration").length === 11,
  "the plant specialities must survive the merge as filter chips");
check("62. a subcategory from another category never reaches the page",
  canonicalServiceCategory("Printing & Branding", "Chairs").subcategory
    === GENERAL_SUBCATEGORY
  && canonicalServiceCategory("Furniture Rental", "Flex Printing").subcategory
    === GENERAL_SUBCATEGORY,
  "on READ a contradictory pair falls back to the neutral value rather than hiding "
  + "the provider; the WRITE path rejects it outright, which is the backend's job");
check("63. a subcategory from its OWN category survives",
  canonicalServiceCategory("Printing & Branding", "Banners").subcategory === "Banners"
  && canonicalServiceCategory("Furniture Rental", "Chairs").subcategory === "Chairs");
check("64. the public projection publishes the subcategory, neutral when absent",
  (() => {
    const base = {
      _id: "507f1f77bcf86cd799439011", full_name: "X", city: "Pune",
      state: "Maharashtra", country: "India",
    };
    const withSub = toPublicService({
      ...base, service_name: "Printing & Branding", service_subcategory: "Banners",
    });
    const without = toPublicService({ ...base, service_name: "Printing & Branding" });
    const mismatched = toPublicService({
      ...base, service_name: "Printing & Branding", service_subcategory: "Chairs",
    });
    /*
     * A row with no stored subcategory reads as "General", not null. Two different
     * rows land here - one written before the field existed, one whose owner never
     * narrowed it - and both mean "no narrower speciality claimed", so both must
     * render identically. A mismatched pair is also pulled back to the neutral
     * value: it is never published as the contradiction it is.
     */
    return withSub.subcategory === "Banners"
      && without.subcategory === GENERAL_SUBCATEGORY
      && mismatched.subcategory === GENERAL_SUBCATEGORY;
  })(),
  "the projection must never publish a pair the taxonomy disagrees with");
check("65. the directory counts subcategories per category",
  /facetSubcategories\(providers, name\)/.test(libSrc) && /subcategories:/.test(libSrc));
check("66. and offers only the ones that have providers",
  /\.filter\(\(sub\) => counts\.has\(sub\)\)/.test(libSrc),
  "an empty speciality chip is a guaranteed dead end");
check("66b. with \"General\" sorted LAST, though the taxonomy lists it first",
  /sub !== GENERAL_SUBCATEGORY/.test(libSrc) && /sub === GENERAL_SUBCATEGORY/.test(libSrc),
  "it is the catch-all and usually the largest group - first would bury the real "
  + "specialities under a heading that distinguishes nothing");
check("66c. and the hub's 'what this covers' line leaves it out entirely",
  /!== GENERAL_SUBCATEGORY/.test(publicSrc),
  '"General" describes nothing, and listing it first on all 34 cards would push a '
  + "genuinely informative name off the end of every one");
check("67. in taxonomy order, so the chips do not reshuffle as providers sign up",
  /serviceSubcategories\(categoryName\)/.test(libSrc)
  && !/subcategories[\s\S]{0,80}sort\(\(a, b\) => b\.count/.test(libSrc));
check("68. the category page passes the facet to the filter UI",
  /subcategories=\{category\.subcategories\}/.test(catSrc));
check("69. the filter UI narrows by it, first in the predicate",
  /provider\.subcategory \|\| ""\)\.trim\(\) !== subcategory/.test(dirSrc));
check("70. and still mints no crawlable URL for it",
  !/searchParams|useRouter|router\.push/.test(dirSrc),
  "speciality x letter x city would be ~8x the near-duplicate pages");
check("71. one chip alone is not rendered as a filter",
  /subcategories\.length > 1/.test(dirSrc),
  "a lone chip beside All is a control with nothing to choose");
check("71b. the hub names each category's subcategories, from the TAXONOMY",
  /subcategoryPreview\(category\.name\)/.test(publicSrc)
  && /serviceSubcategories\(categoryName\)/.test(publicSrc),
  "28 of the 34 cards have no providers, so a counted facet would leave them blank - "
  + "and those are the cards where 'what goes in here?' most needs answering");
check("71c. and truncates a long list rather than printing all ten",
  /SUBCATEGORY_PREVIEW/.test(publicSrc) && /\+\{specialities\.rest\} more/.test(publicSrc));
check("71d. the preview is computed once per card, not per use",
  /const specialities = subcategoryPreview\(category\.name\);/.test(publicSrc));
check("73a. the category page DIVIDES providers into a section per speciality",
  /grouped \?/.test(dirSrc) && /groups\.map\(\(group, groupIndex\)/.test(dirSrc),
  "a flat grid of 381 cards gives a visitor nothing to scroll to");
check("73b. providers with no speciality get a trailing section, not deletion",
  /Speciality not stated/.test(dirSrc) && /providers: unspecified,/.test(dirSrc),
  "hiding a third of a directory behind a division nobody opted into");
check("73c. it groups only when there is more than one section to draw",
  /const grouped = !subcategory && groups\.length > 1;/.test(dirSrc),
  "one section would repeat the page title as a heading");
check("73d. and falls back to the flat grid when a speciality is selected",
  /grouped \? \(/.test(dirSrc) && /\) : \(\n\s*<ul className="mt-5 grid/.test(dirSrc),
  "the selected chip already IS the division");
check("73e. groups are built from the FILTERED list, so letter/city still apply",
  /for \(const provider of filtered\)/.test(dirSrc));
check("73f. empty groups are dropped rather than rendered as bare headings",
  /\.filter\(\(\[, list\]\) => list\.length\)/.test(dirSrc));
/*
 * THE FILTER TOOLBAR. These pin the compactness, which is easy to lose one
 * well-meaning control at a time: the panel this replaced grew to ~300px of chrome
 * above the first provider, on a page whose entire purpose is the providers.
 */
check("73h. name search is a text input, not 27 buttons",
  /type="search"/.test(dirSrc) && /setQuery/.test(dirSrc),
  "the alphabet alone made 'find a supplier I already know' a 27-button question");
check("73i. it matches a substring, not just the first letter",
  /\.toLowerCase\(\)\.includes\(needle\)/.test(dirSrc),
  "people remember a distinctive word from the middle of a business name");
check("73j. and lowercases the needle once, not per provider",
  /const needle = query\.trim\(\)\.toLowerCase\(\);/.test(dirSrc),
  "this runs on every keystroke over several hundred providers");
check("73k. the A–Z strip is collapsed behind a disclosure",
  /aria-expanded=\{showLetters\}/.test(dirSrc) && /aria-controls="letter-strip"/.test(dirSrc),
  "a rarely-used control should not cost permanent vertical space");
check("73l. and an active letter still shows while it is collapsed",
  /\{letter \|\| "A–Z"\}/.test(dirSrc),
  "a filter hidden by the thing that collapses it is unexplainable");
check("73m. each select is sized to its content, not full width",
  /w-auto/.test(dirSrc) && !/SelectFilter/.test(dirSrc),
  "a city filter for three cities should not be as wide as one for forty");
check("73n. a select with nothing to choose is not rendered at all",
  /\{states\.length \?/.test(dirSrc) && /\{cityOptions\.length \?/.test(dirSrc)
  && /\{letters\.length > 1 \?/.test(dirSrc));
check("73o. active filters are removable one at a time",
  /activeFilters\.map/.test(dirSrc) && /clear: \(\) => setState\(""\)/.test(dirSrc),
  "with the controls collapsed, 'why am I seeing 12 of 381?' must be answerable "
  + "without reopening them - and one Clear-all button cannot drop a single filter");
check("73p. the active-filter row disappears entirely when nothing is set",
  /activeFilters\.length \?/.test(dirSrc),
  "it must cost no more than the count line did before");
check("73q. clearing resets the search too",
  /setQuery\(""\);/.test(dirSrc));
check("73g. a section's DOM id is slugged, never the raw subcategory text",
  /key: slugifyName\(value\)/.test(dirSrc) && !/key: value,/.test(dirSrc),
  'aria-labelledby is a space-separated ID LIST, so id="group-Catalog Printing" '
  + "resolves to two ids that do not exist and the section loses its accessible name");
check("72. the provider card shows the speciality, not the shared category",
  /provider\.subcategory/.test(cardSrc) && !/provider\.service/.test(cardSrc),
  "printing the category would be the same word on every card of the page");
check("72b. and only when the page is not already organised by it",
  /showSpeciality && provider\.subcategory/.test(cardSrc)
  && /const showSpeciality = !grouped && subcategories\.length > 1;/.test(dirSrc),
  '132 cards reading "Catalog Printing" under a heading reading CATALOG PRINTING');
check("72c. the name reserves two lines, so a row of cards shares one baseline",
  /line-clamp-2 min-h-9\.5/.test(cardSrc),
  "a wrapped name pushed its own location down and the row stopped agreeing");
check("72d. and the location is pinned to the card's floor",
  /mt-auto/.test(cardSrc) && /line-clamp-1/.test(cardSrc),
  "otherwise it sits under whatever precedes it, which differs per card");

console.log("");
console.log("services — the seven pre-migration categories");

check("73. all seven legacy names translate forward",
  Object.keys(LEGACY_SERVICE_CATEGORIES).length === 7
  && Object.keys(LEGACY_SERVICE_CATEGORIES).every(
    (name) => canonicalServiceCategory(name) !== null),
  JSON.stringify(Object.keys(LEGACY_SERVICE_CATEGORIES)));
check("74. every legacy target is a real category",
  Object.values(LEGACY_SERVICE_CATEGORIES).every(
    (t) => SERVICE_CATEGORIES.includes(t.category)));
check("75. and every legacy subcategory is valid under its target",
  Object.values(LEGACY_SERVICE_CATEGORIES).every(
    (t) => !t.subcategory || serviceSubcategories(t.category).includes(t.subcategory)));
check("76. Catalog Printing keeps its distinction as a subcategory",
  canonicalServiceCategory("Catalog Printing").category === "Printing & Branding"
  && canonicalServiceCategory("Catalog Printing").subcategory === "Catalog Printing");
check("77. the other six gain no invented subcategory",
  Object.entries(LEGACY_SERVICE_CATEGORIES)
    .filter(([name]) => name !== "Catalog Printing")
    .every(([, t]) => t.subcategory === null),
  "guessing a speciality asserts a fact about a business that nobody checked");
check("78. exactly one slug was retired, and it redirects rather than 404ing",
  Object.keys(RETIRED_CATEGORY_SLUGS).length === 1
  && RETIRED_CATEGORY_SLUGS["catalog-printing"] === "printing",
  JSON.stringify(RETIRED_CATEGORY_SLUGS));
check("79. a retired slug is never also a live one",
  Object.keys(RETIRED_CATEGORY_SLUGS).every(
    (slug) => !Object.values(SERVICE_CATEGORY_SLUGS).includes(slug)),
  "a redirect whose source is a real page makes that page unreachable");
check("80. every retired slug points at a live one",
  Object.values(RETIRED_CATEGORY_SLUGS).every(
    (slug) => Object.values(SERVICE_CATEGORY_SLUGS).includes(slug)),
  "a redirect into a 404 wastes the ranking it exists to keep");
check("81. next.config builds that redirect as a 301, not a 308",
  (() => {
    const cfg = strip(read("next.config.mjs"));
    return /RETIRED_CATEGORY_SLUGS/.test(cfg)
      && /statusCode: 301/.test(cfg)
      && !/permanent: true/.test(cfg);
  })(),
  "permanent: true emits 308 — see lib/duplicate-redirects.mjs");

console.log("");
console.log("services — the dashboard forms offer the real taxonomy");

{
  const addSrc = strip(read("components/popups/ExhibitionServicePopupForm.jsx"));
  const editSrc = strip(read("components/popups/ExhibitionServiceEditForm.jsx"));

  for (const [label, src] of [["the add form", addSrc], ["the edit form", editSrc]]) {
    check(`82. ${label} imports the taxonomy instead of listing categories`,
      /from "@\/lib\/service-taxonomy"/.test(src) && !/"Protocol Staff"/.test(src),
      "a hand-typed option the API rejects cannot be caught by the form");
    check(`83. ${label} derives the speciality options from the chosen category`,
      /serviceSubcategories\(service_name\)/.test(src));
    check(`84. ${label} clears the speciality when the category changes`,
      /setServiceSubcategory\(""\)/.test(src),
      "a speciality from the previous category would submit an invalid pair");
    check(`85. ${label} sends the field even when empty`,
      /formData\.append\("service_subcategory", service_subcategory\)/.test(src),
      "omitting it would make a cleared speciality unclearable");
    check(`86. ${label} does not import the server-only data layer`,
      !/lib\/services|lib\/public-api/.test(src));
  }

  check("87. the edit form translates a legacy category before the dropdown sees it",
    /canonicalServiceCategory\(s\.service_name, s\.service_subcategory\)/.test(editSrc),
    "an un-migrated listing would open with no category selected");
  check("88. the speciality is REQUIRED in both forms",
    /e\.service_subcategory = "Speciality is required\."/.test(addSrc)
    && /e\.service_subcategory = "Speciality is required\."/.test(editSrc)
    && !/Speciality \(optional\)/.test(addSrc) && !/Speciality \(optional\)/.test(editSrc));
  check("88b. but only once a category is chosen, since the options depend on it",
    /if \(service_name && !service_subcategory\)/.test(addSrc)
    && /if \(service_name && !service_subcategory\)/.test(editSrc),
    "flagging a field that is not on screen yet makes a form unsubmittable for no "
    + "visible reason");
  check("88c. and the error can actually render, because submit marks it touched",
    /service_subcategory: true/.test(addSrc) && /service_subcategory: true/.test(editSrc),
    "an untouched field shows no error, so the form would fail silently");
}

console.log("");
console.log("services — provider-supplied text never becomes markup");

/*
 * EVERY SURFACE THAT RENDERS A PROVIDER, swept together rather than one at a time.
 *
 * `name`, `city`, `state` and `country` are all strings a provider typed into a form or a
 * spreadsheet, and the directory pages are PUBLIC and crawlable. A single
 * dangerouslySetInnerHTML anywhere in this set turns a listing field into stored XSS
 * against every visitor - and a mutation that added one to the detail page survived this
 * suite until this sweep existed, because the pages were read for their data sources and
 * never for how they render.
 *
 * The list is the whole services surface on purpose: adding a page without adding it here
 * is the way this guard would quietly stop covering anything.
 */
for (const [label, src] of [
  ["the category index", publicSrc],
  ["a category page", catSrc],
  ["the provider detail page", detailSrc],
  ["the directory component", dirSrc],
  ["the provider card", cardSrc],
  ["the contact panel", panelSrc],
]) {
  check(`${label} has no HTML sink`,
    !/dangerouslySetInnerHTML|innerHTML|outerHTML|document\.write/.test(src),
    `${label} renders provider text as markup`);
}

console.log("");
console.log("services — the bulk import");

check("22. the upload posts to the service import route",
  /xhr\.open\("POST", "\/api\/exhibitionservice\/upload-excel"\)/.test(modelSrc));
check("23. it sends ONLY the file — the owner comes from the session",
  /formData\.append\("file", file\)/.test(modelSrc)
  && !/formData\.append\("createdBy"/.test(modelSrc),
  "an owner field is being sent");
check("24. a non-JSON error body is reported, not thrown",
  /catch \{[\s\S]{0,120}reject\(new Error\("Upload failed/.test(modelSrc));
check("25. the modal takes no owner argument",
  /ServiceExcelUploadModal = \(\{ isOpen, onClose, onSuccess \}\)/.test(modalSrc),
  "the modal accepts an owner it should not need");
check("26. it reuses the shared ExcelUploadModal",
  /from "@\/components\/popups\/ExcelUploadModal"/.test(modalSrc));
check("27. all seven schema fields are declared required to the uploader",
  ["full_name", "service_name", "country", "state", "city", "address", "mobile_number"]
    .every((c) => modalSrc.includes(`"${c}"`)));
/*
 * This used to assert that every category name appeared as LITERAL TEXT in the
 * modal, which was the right check for seven of them. At 35 it is the wrong one: a
 * hand-typed list of 35 categories in a UI note is exactly the copy that drifts out
 * of step with the enum, and the note is now BUILT from SERVICE_CATEGORIES, so it
 * cannot name a category the API rejects or omit one it accepts. The assertion
 * follows the guarantee rather than the old implementation of it.
 */
check("28. the note names the permitted categories, built from the taxonomy",
  /SERVICE_CATEGORIES\.join\(", "\)/.test(modalSrc)
  && /from "@\/lib\/service-taxonomy"/.test(modalSrc),
  "a retyped category list here is a list that will drift");
check("28b. and it says the pre-migration names still import",
  /mapped to their new categories/.test(modalSrc),
  "a provider with an older sheet would assume all of it is now invalid");
check("29. and that images cannot be imported",
  /Images cannot be imported/i.test(modalSrc));
check("30. the dashboard refetches after an import rather than splicing a response in",
  /onSuccess=\{\(\) => \{[\s\S]{0,120}fetchServices\(\);/.test(dashSrc),
  "a partial import would leave the table wrong");

console.log("");
console.log("services — the provider page gates contact details");

const publicShapeBody = (apiSrc.split("export function toPublicService")[1] || "").split("\n}")[0];
check("48. the public projection still withholds the address and phone",
  !/address/.test(publicShapeBody) && !/mobile_number/.test(publicShapeBody),
  publicShapeBody.slice(0, 120));
check("49. the detail page never renders the address or phone itself",
  !/mobile_number/.test(detailSrc) && !/provider\.address/.test(detailSrc),
  "the gated fields must not be in the server-rendered markup");
check("50. the contact panel is a client component that FETCHES them",
  /^"use client";/.test(panelSrc.trim()) && /getExhibitionServiceContact\(/.test(panelSrc),
  "rendering-then-hiding would leave them in the RSC payload");
check("51. it asks for them only once the session is confirmed",
  /status !== "authed" \|\| !serviceId/.test(panelSrc));
check("52. the signed-out prompt is the server-rendered default",
  /status !== "authed"/.test(panelSrc) && !/status === "loading"/.test(panelSrc),
  "the server HTML is always the loading state, so an empty shell there means "
  + "crawlers and pre-hydration visitors see a blank box with no explanation");
check("53. the contact call goes to the gated endpoint",
  /api\/exhibition-services\/.*\/contact/.test(svcModelSrc));

check("54. the owner id never reaches the client-side directory",
  /ownerId: _ownerId/.test(libSrc) && /\.map\(strip\)/.test(libSrc),
  "an ownerId in ServiceDirectory's props travels to every visitor in the RSC payload");
check("55. siblings are matched on owner id, never on business name",
  /byOwner/.test(libSrc) && /entry\.ownerId/.test(libSrc),
  "two unrelated shops can share a name");
check("56. unowned legacy rows are not grouped together as one provider",
  /if \(!entry\.ownerId\) continue;/.test(libSrc));
check("57. the detail page resolves from the directory, not a public single fetch",
  /getServiceById/.test(detailSrc) && !/getexhibitionservicebyid/.test(detailSrc));
check("58. a stale slug redirects to the canonical one rather than rendering twice",
  /isCanonicalSlug/.test(detailSrc) && /permanentRedirect/.test(detailSrc));
check("59. no LocalBusiness JSON-LD, which would need the gated fields",
  !/LocalBusiness/.test(detailSrc));

console.log("");
console.log("=== " + passed + " passed, " + failed + " failed ===");
if (failed) process.exit(1);
console.log("=== all passed ===");
