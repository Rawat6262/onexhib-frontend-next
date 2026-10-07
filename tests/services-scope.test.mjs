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

check("6. the public page reads the unscoped endpoint",
  /getServices/.test(publicSrc) && /getJson\("\/api\/getexhibitionservice"\)/.test(apiSrc));
check("7. it does NOT read the scoped one",
  !/myexhibitionservices/.test(publicSrc) && !/getMyExhibitionServices/.test(publicSrc));
check("8. provider listings are switched on",
  /const SHOW_PROVIDER_LISTINGS = true;/.test(publicSrc));
check("9. the listing section still renders nothing when the list is empty",
  /if \(!items\.length\) return null;/.test(publicSrc),
  "an empty directory would render a bare heading");
check("10. providers are grouped by the schema enum, not an invented taxonomy",
  /SERVICE_CATEGORIES\.map/.test(publicSrc));
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
  /\{p\.name \|\| "Service provider"\}/.test(publicSrc)
  && !/dangerouslySetInnerHTML/.test(publicSrc));
check("21. a nameless legacy row still renders something",
  /\|\| "Service provider"/.test(publicSrc));

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
console.log("=== " + passed + " passed, " + failed + " failed ===");
if (failed) process.exit(1);
console.log("=== all passed ===");
