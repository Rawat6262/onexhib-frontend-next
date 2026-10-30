// Search titles and place names: node tests/seo-title.test.mjs
import { shortTitle } from "../lib/seo-title.js";
import { distinctPlace, formatLocation } from "../lib/format.js";

let failed = 0;
const check = (name, cond, detail) => {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : `  -> ${detail}`}`);
  if (!cond) failed += 1;
};
const title = (name, want) => check(`"${name}"`, shortTitle(name) === want, shortTitle(name));

// A name that fits is left exactly as it is, parentheses and all.
title("Hong Kong Lighting Fair 2026 (Autumn Edition)", "Hong Kong Lighting Fair 2026 (Autumn Edition)");
title("KISAN Agri Show 2026 (34th Edition)", "KISAN Agri Show 2026 (34th Edition)");

// Edition counters go first, which keeps both "Canton Fair" and the phase.
title("140th China Import and Export Fair (Canton Fair) – Phase 3, 2026", "China Import and Export Fair (Canton Fair) – Phase 3, 2026");
// The marketing tail goes; the name, year and city stay.
title("Craft Fair Sydney 2026 - Australian Craft & Artisan Exhibition", "Craft Fair Sydney 2026");
title(
  "D-arc BUILD 2026 Bengaluru - India's Leading Design, Architecture, Building & Construction Exhibition - Distinctive Showcase of Design, Architecture, Building & Construction Related Technologies",
  "D-arc BUILD 2026 Bengaluru"
);
title("Asia Labex 2026 (19th Edition) - India's Biggest Laboratory and Analytical Instruments Expo for QC & R&D Labs - Shaping", "Asia Labex 2026 – India's Biggest Laboratory…");
// A bare acronym takes the start of its description.
title("ETPP 2026 – Emerging Trends in Photodynamics and Photochemistry", "ETPP 2026 – Emerging Trends in Photodynamics…");
// A year dropped with the tail comes back.
title("AHSE – Asia International Hotel Supplies & Catering Expo 2026", "AHSE 2026 – Asia International Hotel Supplies & Catering…");
// One long part is cut at a word, never ending on "&" or "for", and keeps its year.
title("China International Smart Healthcare & Digital Hospital Expo 2026", "China International Smart Healthcare & Digital… 2026");

const samples = [
  "RENEWABLE ASIA 2026 (4th Renewable Asia & Energy Expo) - International Exhibition on Solar, Wind, Bioenergy, Storage, EV & Renewable Technologies - Powering the Future with Renewable Innovation",
  "SAFETY & RESCUE Expo Poland – Technology Trade Fair for Rescue, Civil Defense and Emergency Prevention",
  "ChemTEC Poland (Trade Fair of Technology, Equipment and Components for the Chemical Industry)",
  "Bengaluru Space Expo (BSX) 2026 - India's Premier Space Sector Exhibition - 9th Edition - Harnessing Space for Global Progress: Innovation, Policy, and Growth",
];
for (const s of samples) {
  const t = shortTitle(s);
  check(`fits 60: "${t}"`, t.length <= 60, t.length);
  check(`no dangling word: "${t}"`, !/\s(&|and|of|for|the)…?$/i.test(t), t);
  if (/\b20\d\d\b/.test(s)) check(`keeps the year: "${t}"`, /\b20\d\d\b/.test(t), t);
}

// Places: a part repeated in another field, in any case or accent, prints once.
const loc = (parts, want) => check(`place ${JSON.stringify(parts)}`, formatLocation(parts) === want, formatLocation(parts));
loc({ city: "Shanghai", state: "Shanghai", country: "China" }, "Shanghai, China");
loc({ venue: "Tawang, Arunachal Pradesh", city: "Tawang", state: "Arunachal Pradesh", country: "India" }, "Tawang, Arunachal Pradesh, India");
loc({ city: "São Paulo", state: "Sao Paulo", country: "Brazil" }, "São Paulo, Brazil");
loc({ city: "Homberg (Ohm), Nieder-Ofleiden", state: "Hesse", country: "Germany" }, "Homberg (Ohm), Nieder-Ofleiden, Hesse, Germany");
const p = distinctPlace({ city: "Shanghai", state: "China", country: "China" });
check("schema region that restates the country is dropped", p.state === "" && p.city === "Shanghai", JSON.stringify(p));
check("schema region kept when it differs", distinctPlace({ city: "Pune", state: "Maharashtra", country: "India" }).state === "Maharashtra", "");

console.log(failed ? `=== ${failed} failed ===` : "=== all passed ===");
process.exit(failed ? 1 : 0);
