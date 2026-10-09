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
  /getMyExhibitionServices = \(\) => axios\.get\("\/api\/myexhibitionservices"\)/.test(modelSrc));
check("2. the dashboard calls it", /await getMyExhibitionServices\(\)/.test(dashSrc));
check("3. and no longer calls the public one",
  !/getAdminExhibitionServices\(\)/.test(dashSrc),
  "the dashboard still reads the unscoped endpoint");
check("4. the dashboard does not import the public fetcher at all",
  !/getAdminExhibitionServices/.test(dashSrc));
check("5. the scoped path carries no user id for a caller to change",
  !/myexhibitionservices\/\$\{|myexhibitionservices\?/.test(modelSrc));

console.log("");
console.log("services — the public page shows EVERY provider's listings");

check("6. the directory reads the unscoped endpoint",
  /getServices/.test(libSrc) && /getJson\("\/api\/getexhibitionservice"\)/.test(apiSrc));
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
check("11. and that enum is the backend's seven, in order",
  JSON.stringify([...SERVICE_CATEGORIES]) === JSON.stringify([
    "Printing", "Furniture Rental", "LED / TV Rental", "Fabrication",
    "Protocol Staff", "Catalog Printing", "Corporate Gifting",
  ]),
  JSON.stringify(SERVICE_CATEGORIES));

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
    shaped.service === "Corporate Gifting" && shaped.city === "Khanna"
    && shaped.state === "Punjab" && shaped.country === "India");
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
  check("18. the shape is exactly these six keys",
    JSON.stringify(Object.keys(shaped).sort())
      === '["city","country","id","image","name","service","state"]',
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
  new Set(Object.values(SERVICE_CATEGORY_SLUGS)).size === SERVICE_CATEGORIES.length);
check("33. the slug map has no entry that is not in the enum",
  Object.keys(SERVICE_CATEGORY_SLUGS).every((k) => SERVICE_CATEGORIES.includes(k)),
  "a stale key here silently drops a category from the directory");
check("34. slugs are URL-safe lowercase",
  Object.values(SERVICE_CATEGORY_SLUGS).every((s2) => /^[a-z0-9-]+$/.test(s2)),
  JSON.stringify(Object.values(SERVICE_CATEGORY_SLUGS)));
check("35. the awkward enum value resolves to a stable slug",
  serviceCategorySlug("LED / TV Rental") === "led-tv-rental",
  String(serviceCategorySlug("LED / TV Rental")));
check("36. an unknown category has no slug rather than a guessed one",
  serviceCategorySlug("Catering") === null);

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
check("28. the note tells people the exact enum values",
  SERVICE_CATEGORIES.every((c) => modalSrc.includes(c)));
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
