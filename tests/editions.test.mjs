// Edition matching: node tests/editions.test.mjs
import { seriesKey } from "../lib/edition-key.js";

let failed = 0;
const check = (name, cond, detail) => {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : `  -> ${detail}`}`);
  if (!cond) failed += 1;
};
const same = (a, b) => check(`same show: "${a}" = "${b}"`, seriesKey(a) === seriesKey(b), `${seriesKey(a)} | ${seriesKey(b)}`);
const differ = (a, b) => check(`different: "${a}" != "${b}"`, seriesKey(a) !== seriesKey(b), seriesKey(a));

same("AI India Expo 2026", "AI India Expo 2027");
same("KISAN Agri Show 2026 (34th Edition)", "Kisan Agri Show 2024");
same("140th China Import and Export Fair (Canton Fair) – Phase 3, 2026", "139th China Import and Export Fair (Canton Fair) – Phase 3, 2026");
same("India Art Festival Mumbai 2027", "India Art Festival - Mumbai 2026");
same("Food & Bakery Expo 2027", "Food and Bakery Expo 2026 (4th Edition)");
same("37th CREDAI Kochi Property Expo 2026", "36th CREDAI Kochi Property Expo 2025");
same("Hyderabad kids fair 2026", "Hyderabad Kids’ Fair 2025");
differ("IITM – India International Travel Mart – Kochi 2027", "IITM – India International Travel Mart Pune 2026");
differ("Pune Expo 2026", "Pune Food Expo 2026");
check("a year and an ordinal alone leave nothing", seriesKey("2026 5th Edition") === "", seriesKey("2026 5th Edition"));

console.log(failed ? `=== ${failed} failed ===` : "=== all passed ===");
process.exit(failed ? 1 : 0);
