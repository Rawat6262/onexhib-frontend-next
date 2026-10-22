/**
 * Pure tests for lib/csc-match.js: Google's place names -> the exhibition
 * form's country / state ISO codes and city.
 *
 * Run: npm run test:csc-match
 */
import { matchLocation } from "../lib/csc-match.js";

let failed = 0;
function check(name, ok, detail = "") {
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}
const m = (c) => matchLocation(c);

console.log("csc-match");
let r = m({ country: "India", state: "Delhi", city: "New Delhi" });
check("Delhi: IN / DL / New Delhi (known)", r.countryIso === "IN" && r.stateIso === "DL" && r.city === "New Delhi" && r.cityKnown, JSON.stringify(r));
r = m({ country: "India", state: "National Capital Territory of Delhi", city: "New Delhi" });
check("NCT of Delhi still maps to DL", r.stateIso === "DL", JSON.stringify(r));
r = m({ country: "India", state: "Punjab", city: "Sahnewal" });
check("an unlisted town is kept, marked unknown", r.countryIso === "IN" && r.stateIso === "PB" && r.city === "Sahnewal" && !r.cityKnown, JSON.stringify(r));
r = m({ country: "Türkiye", state: "Istanbul", city: "Istanbul" });
check("Türkiye -> TR", r.countryIso === "TR", JSON.stringify(r));
r = m({ country: "Czechia", state: "", city: "Brno" });
check("Czechia -> CZ, no state -> city kept", r.countryIso === "CZ" && r.stateIso === "" && r.city === "Brno", JSON.stringify(r));
r = m({ country: "United Arab Emirates", state: "Dubai", city: "Dubai" });
check("UAE / Dubai", r.countryIso === "AE" && r.stateIso !== "", JSON.stringify(r));
r = m({ country: "Nowhere", state: "X", city: "Y" });
check("an unknown country gives empty codes", r.countryIso === "" && r.stateIso === "" && r.city === "Y", JSON.stringify(r));

console.log(failed ? `=== ${failed} failed ===` : "=== all passed ===");
process.exit(failed ? 1 : 0);
