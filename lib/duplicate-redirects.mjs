/**
 * 301 redirects for exhibition records removed as duplicates.
 *
 * WHY THESE EXIST
 * 78 duplicate exhibition records were deleted across six reviewed batches.
 * Each had a surviving keeper describing the SAME event, but under a different
 * Mongo id and therefore a different URL. Search engines had already indexed the
 * removed URLs, so without these they return 404 and the accumulated ranking
 * signals are discarded even though the content still exists. A 301 consolidates
 * them onto the surviving page, which is the standard treatment for duplicates.
 *
 * WHY THE SOURCE MATCHES ON ID, NOT ON A FIXED SLUG
 * Public detail URLs are <slug>-<id>, and lib/slug.js treats the slug half as
 * decorative - the id is authoritative, and a LIVE record reached by a stale slug
 * is redirected to its canonical form by the page itself. A removed record has no
 * page left to do that, so matching any slug ending in the removed id catches
 * every historical variant of the URL rather than only the single form that
 * happened to be in the sitemap. [^/]* keeps the match inside one path segment so
 * nothing deeper can be swallowed.
 *
 * PROVENANCE
 * Every pair below came from the deletion backups plus the audit CSV that recorded
 * the keep/remove decision - never inferred. Destination slugs were resolved from
 * the LIVE keeper records, so none can point at a stale name. Verified when this
 * file was generated: no source record still exists, no destination is also a
 * source (no chains), and no entry points at itself (no loops).
 *
 * Batch 1: 36 upcoming/ongoing    Batch 2: 9 past
 * Group C: 6 content-merged       Group A: 7 location-corrected
 * CIOE 2026: 3 same-event records under four different names
 * Confirmed batch: 17 across 16 groups (name + dates + city + venue)
 * PTAK Warsaw Expo: 21 records from one catalogue imported twice
 * Officially verified: 3 checked against the organisers' own sites
 * Repaired first: 2 keepers corrected before consolidation
 * Catalogue sweep 2026-11-03: 243 across 209 groups (name + dates)
 */

export const DUPLICATE_EXHIBITION_REDIRECTS = [
  // ----- Batch 1 -----
  // 54th CCBE Chengdu China Beauty Expo 2026
  { oldId: "6a2a7f890d85e7f7fa017187", to: "/exhibition/54th-ccbe-chengdu-china-beauty-expo-2026-6a2a7c480d85e7f7fa01714e" },
  // ACETECH Bengaluru 2026
  { oldId: "6a43a50876c9ac00c8b83a44", to: "/exhibition/acetech-bengaluru-2026-6a38e9af84b70fbb7aa0df94" },
  // art3f Lyon (International Contemporary Art Fair)
  { oldId: "6a44dc7476c9ac00c8b83ba9", to: "/exhibition/art3f-lyon-international-contemporary-art-fair-6a44c7a676c9ac00c8b83b55" },
  // Artibat (Salon de la Construction et des Travaux Publics)
  { oldId: "6a44dc7476c9ac00c8b83bb0", to: "/exhibition/artibat-salon-de-la-construction-et-des-travaux-publics-6a44c7a676c9ac00c8b83b5c" },
  // Auf in die Welt - Köln
  { oldId: "6a46167d76c9ac00c8b83c92", to: "/exhibition/auf-in-die-welt-koln-6a460da376c9ac00c8b83c5a" },
  // Auf in die Welt - Münster
  { oldId: "6a46167d76c9ac00c8b83c93", to: "/exhibition/auf-in-die-welt-munster-6a460da376c9ac00c8b83c5b" },
  // Beauty & Personal Care China (BAUCHINA) 2026
  { oldId: "6a42566b76c9ac00c8b83825", to: "/exhibition/beauty-personal-care-china-bauchina-2026-6a424ac976c9ac00c8b83804" },
  // CCE China Clean Expo 2026 – International Cleaning Technology & Services Exhibition
  { oldId: "6a2a7f890d85e7f7fa017184", to: "/exhibition/cce-china-clean-expo-2026-international-cleaning-technology-services-exhibition-6a2a7c480d85e7f7fa01714b" },
  // CELO (Supply Chain Trade Show)
  { oldId: "6a44dc7476c9ac00c8b83ba7", to: "/exhibition/celo-supply-chain-trade-show-6a44c7a676c9ac00c8b83b53" },
  // China Brew China Beverage 2026 – International Brewing & Drinks Technology Expo
  { oldId: "6a2a7f890d85e7f7fa017182", to: "/exhibition/china-brew-china-beverage-2026-international-brewing-drinks-technology-expo-6a2a7c480d85e7f7fa017149" },
  // China Xiamen International Vegetarian Food Fair 2026 (CXIVFF)
  { oldId: "6a2a7f890d85e7f7fa017188", to: "/exhibition/china-xiamen-international-vegetarian-food-fair-2026-cxivff-6a2a7c480d85e7f7fa01714f" },
  // CIAIE – China International Aromatic Industry Exhibition 2026
  { oldId: "6a2a7c480d85e7f7fa017150", to: "/exhibition/ciaie-china-international-aromatic-industry-exhibition-2026-6a2a7f890d85e7f7fa017189" },
  // CIOE – China International Optoelectronic Exposition 2026
  { oldId: "6a2a62560d85e7f7fa017068", to: "/exhibition/cioe-china-international-optoelectronic-exposition-2026-6a2a5eff0d85e7f7fa017025" },
  // Didac India 2026 (16th Edition)
  { oldId: "6a43a50876c9ac00c8b83a46", to: "/exhibition/didac-india-2026-16th-edition-6a38e9af84b70fbb7aa0df96" },
  // EQUIP AUTO Paris
  { oldId: "6a44dc7476c9ac00c8b83bae", to: "/exhibition/equip-auto-paris-6a44c7a676c9ac00c8b83b5a" },
  // Eurocoat (Exhibition & Congress for Paints and Coatings Professionals)
  { oldId: "6a44dc7476c9ac00c8b83bb5", to: "/exhibition/eurocoat-exhibition-congress-for-paints-and-coatings-professionals-6a44c7a676c9ac00c8b83b61" },
  // Expobiogaz
  { oldId: "6a44dc7476c9ac00c8b83bab", to: "/exhibition/expobiogaz-6a44c7a676c9ac00c8b83b57" },
  // Funeraire Paris (Salon Funeraire)
  { oldId: "6a44dc7476c9ac00c8b83bb3", to: "/exhibition/funeraire-paris-salon-funeraire-6a44c7a676c9ac00c8b83b5f" },
  // HBLF Show 2026 (13th Edition)
  { oldId: "6a43a50876c9ac00c8b83a43", to: "/exhibition/hblf-show-2026-13th-edition-6a38e9af84b70fbb7aa0df93" },
  // HIFF 2026 – Hindustan International Furniture Fair
  { oldId: "6a43a50876c9ac00c8b83a45", to: "/exhibition/hiff-2026-hindustan-international-furniture-fair-6a38e9af84b70fbb7aa0df95" },
  // INDEX Plus Mumbai 2026
  { oldId: "6a3cd18476c9ac00c8b82f0e", to: "/exhibition/index-plus-mumbai-2026-6a3ccfb676c9ac00c8b82e34" },
  // Indusfood Bengaluru 2026
  { oldId: "6a43a50876c9ac00c8b83a47", to: "/exhibition/indusfood-bengaluru-2026-6a38e9af84b70fbb7aa0df97" },
  // INTERGEO 2026
  { oldId: "6a99049e33410d907f7dc777", to: "/exhibition/intergeo-2026-6a4627b076c9ac00c8b83cc4" },
  // INTERMAT (incorporating World of Concrete Europe)
  { oldId: "6a44dc7476c9ac00c8b83baa", to: "/exhibition/intermat-incorporating-world-of-concrete-europe-6a44c7a676c9ac00c8b83b56" },
  // KFARM 2026 - Korea Agri Week
  { oldId: "6a2bfa9e0d85e7f7fa0174a9", to: "/exhibition/kfarm-2026-korea-agri-week-6a2bf4680d85e7f7fa01745d" },
  // LebensArt Altjeßnitz 2026
  { oldId: "6a46310c76c9ac00c8b83d10", to: "/exhibition/lebensart-altje-nitz-2026-6a46055676c9ac00c8b83c3a" },
  // Milipol Paris
  { oldId: "6a44dc7476c9ac00c8b83bb1", to: "/exhibition/milipol-paris-6a44c7a676c9ac00c8b83b5d" },
  // Pollutec
  { oldId: "6a44dc7476c9ac00c8b83baf", to: "/exhibition/pollutec-6a44c7a676c9ac00c8b83b5b" },
  // SHOP! Le Salon (incorporating C!Brand)
  { oldId: "6a44dc7476c9ac00c8b83ba6", to: "/exhibition/shop-le-salon-incorporating-c-brand-6a44c7a676c9ac00c8b83b52" },
  // SIAE (International Paris Air Show / Salon International de l'Aeronautique et de l'E
  { oldId: "6a44dc7476c9ac00c8b83bac", to: "/exhibition/siae-international-paris-air-show-salon-international-de-l-aeronautique-et-de-l-6a44c7a676c9ac00c8b83b58" },
  // SIFER (Salon International du Ferroviaire)
  { oldId: "6a44dc7476c9ac00c8b83bad", to: "/exhibition/sifer-salon-international-du-ferroviaire-6a44c7a676c9ac00c8b83b59" },
  // SITEM (International Exhibition of Museums, Monuments & Cultural Tourism)
  { oldId: "6a44dc7476c9ac00c8b83ba8", to: "/exhibition/sitem-international-exhibition-of-museums-monuments-cultural-tourism-6a44c7a676c9ac00c8b83b54" },
  // SITL (Salon International du Transport et de la Logistique)
  { oldId: "6a44dc7476c9ac00c8b83ba4", to: "/exhibition/sitl-salon-international-du-transport-et-de-la-logistique-6a44c7a676c9ac00c8b83b50" },
  // Snack Show
  { oldId: "6a44dc7476c9ac00c8b83ba5", to: "/exhibition/snack-show-6a44c7a676c9ac00c8b83b51" },
  // vocatium Jena 2026
  { oldId: "6a4627b076c9ac00c8b83cc9", to: "/exhibition/vocatium-jena-2026-6a46167d76c9ac00c8b83c9a" },
  // World Nuclear Exhibition (WNE)
  { oldId: "6a44dc7476c9ac00c8b83bb4", to: "/exhibition/world-nuclear-exhibition-wne-6a44c7a676c9ac00c8b83b60" },

  // ----- Batch 2 -----
  // Arabian Travel Market 2025
  { oldId: "6a27d017a6bbd827c125305d", to: "/exhibition/arabian-travel-market-2025-6a27d2b2a6bbd827c12530ab" },
  // CPhI Korea 2026 - Pharmaceutical Raw Materials & Ingredients Exhibition
  { oldId: "6a34f0cf0d85e7f7fa0189a1", to: "/exhibition/cphi-korea-2026-pharmaceutical-raw-materials-ingredients-exhibition-6a34f3ea0d85e7f7fa0189c8" },
  // GFT - Garment & Textile Industry 2026
  { oldId: "6a2d08d80d85e7f7fa0175f8", to: "/exhibition/gft-garment-textile-industry-2026-6a2d08b10d85e7f7fa0175f4" },
  // InterPlas Thailand 2026
  { oldId: "6a2cfdba0d85e7f7fa017596", to: "/exhibition/interplas-thailand-2026-6a2a5caa0d85e7f7fa017002" },
  // Light + Building Frankfurt
  { oldId: "6a27bbb6a6bbd827c1252e7d", to: "/exhibition/light-building-frankfurt-6a27c497a6bbd827c1252f89" },
  // Materials Testing 2026
  { oldId: "6a99049e33410d907f7dc770", to: "/exhibition/materials-testing-2026-6a980b6033410d907f7dc765" },
  // Naval & Defense Philippines 2026
  { oldId: "6a2d3b180d85e7f7fa01774b", to: "/exhibition/naval-defense-philippines-2026-6a2d3bcf0d85e7f7fa017763" },
  // Philippines Marine (PHILMARINE) 2026
  { oldId: "6a2d3b180d85e7f7fa017749", to: "/exhibition/philippines-marine-philmarine-2026-6a2d3bcf0d85e7f7fa017762" },
  // SMART SENSOR KOREA 2026 - The 11th International Smart Sensor Technology Exhibition
  { oldId: "6a34eee90d85e7f7fa018986", to: "/exhibition/smart-sensor-korea-2026-the-11th-international-smart-sensor-technology-exhibitio-6a34f0e40d85e7f7fa0189a7" },

  // ----- Group C -----
  // Forum BHP 2026
  { oldId: "6a97d09c33410d907f7dc6a4", to: "/exhibition/forum-bhp-2026-6a97c83133410d907f7dc671" },
  // Laser World of Photonics India 2026
  { oldId: "6a43a50876c9ac00c8b83a42", to: "/exhibition/laser-world-of-photonics-india-2026-6a38e9af84b70fbb7aa0df92" },
  // Poland Coatings Expo 2026
  { oldId: "6a97d09c33410d907f7dc6a7", to: "/exhibition/poland-coatings-expo-2026-6a97c83133410d907f7dc674" },
  // Warsaw Dental Medica Show 2026
  { oldId: "6a97d09c33410d907f7dc6a9", to: "/exhibition/warsaw-dental-medica-show-6a50b89a5006b171b5c78ae7" },
  // Warsaw Medical Expo 2026
  { oldId: "6a97d09c33410d907f7dc6a6", to: "/exhibition/warsaw-medical-expo-6a50a7208b71904beb2fbc6b" },
  // Weld Tech 2026
  { oldId: "6a97d09c33410d907f7dc6a5", to: "/exhibition/weld-tech-2026-6a97c83133410d907f7dc672" },

  // ----- Group A -----
  // Automotive Testing Expo China 2026
  { oldId: "6a2be7960d85e7f7fa0173d2", to: "/exhibition/automotive-testing-expo-china-2026-6a2a56fb0d85e7f7fa016f25" },
  // Automotive Testing Expo China 2026
  { oldId: "6a42218376c9ac00c8b83703", to: "/exhibition/automotive-testing-expo-china-2026-6a2a56fb0d85e7f7fa016f25" },
  // Bakery China Autumn 2026 - China Home Baking Show
  { oldId: "6a4240c076c9ac00c8b837ab", to: "/exhibition/bakery-china-autumn-2026-china-home-baking-show-6a2a7f890d85e7f7fa01718a" },
  // Calgary Fall Home Show
  { oldId: "6a3fa67076c9ac00c8b835e9", to: "/exhibition/calgary-fall-home-show-6a2cef020d85e7f7fa0174f0" },
  // ISEE 2026
  { oldId: "6a2666fca6bbd827c1252a39", to: "/exhibition/isee-2026-6a3bbc7d76c9ac00c8b82cb0" },
  // Korea Ocean Expo 2026
  { oldId: "6a2bf4680d85e7f7fa01745c", to: "/exhibition/korea-ocean-expo-2026-6a34e9080d85e7f7fa018949" },
  // MEDICA 2026
  { oldId: "6a48bff05464844ef9e7a545", to: "/exhibition/medica-2026-6a27ad7da6bbd827c1252d37" },

  // ----- CIOE 2026 -----
  // Four records described the 27th China International Optoelectronic
  // Exposition, all dated 9-11 September 2026 in Shenzhen, under four different
  // names - which is why the earlier name-plus-date dedupe never grouped them.
  // cioe.cn confirms one event: "The 27th China International Optoelectronic
  // Exposition (CIOE 2026) will take place from September 9-11, 2026, at the
  // Shenzhen World Exhibition & Convention Center." The keeper's venue was
  // corrected to that before these three were removed.
  //
  // The 29-31 October record (6a2beb570d85e7f7fa017401) is deliberately NOT
  // here: its dates contradict the official ones, so it was left in place for
  // review rather than folded into this event.
  { oldId: "6a4230b176c9ac00c8b8372a", to: "/exhibition/cioe-china-international-optoelectronic-exposition-2026-6a2a5eff0d85e7f7fa017025" },
  // "Infrared Spectrum" is one of the eight thematic expos INSIDE CIOE, not a
  // standalone event, so it was listed as an exhibition in its own right in error.
  { oldId: "6a42367f76c9ac00c8b83751", to: "/exhibition/cioe-china-international-optoelectronic-exposition-2026-6a2a5eff0d85e7f7fa017025" },
  { oldId: "6a99049e33410d907f7dc771", to: "/exhibition/cioe-china-international-optoelectronic-exposition-2026-6a2a5eff0d85e7f7fa017025" },

  // ----- Confirmed duplicate batch (audit 2026-09-11) -----
  // 16 groups where two or more records shared a normalised name AND the same
  // start date, end date, city and venue. Venue agreement is what separates
  // these from the 17 reviewed-but-unconfirmed groups, where the venue text
  // differed and the records were left in place pending external checks - the
  // CIOE case above is why that distinction is drawn rather than assumed.
  // Destination slugs were derived from the LIVE keeper names after deletion.
  //
  // A note on the audit that produced these: an earlier pass treated any field
  // mismatch as evidence of a different event and found ZERO duplicates. That
  // was a measurement bug - every record carries its own Cloudinary URL keyed
  // to its own ObjectId, so `image` can never match and conflicted in 51/51
  // groups. image, description, address and category are corroboration only;
  // just country, city and venue can prove two events are distinct.
  // EuroShop Düsseldorf
  { oldId: "6a27bbb6a6bbd827c1252e7b", to: "/exhibition/euroshop-dusseldorf-6a27bb19a6bbd827c1252e60" },
  // LogiMAT Stuttgart 2026
  { oldId: "6a27bbb6a6bbd827c1252e7e", to: "/exhibition/logimat-stuttgart-2026-6a27ad7da6bbd827c1252d3c" },
  // Hannover Messe 2026 (three records described one event)
  { oldId: "6a27bb19a6bbd827c1252e5d", to: "/exhibition/hannover-messe-2026-6a27ad7da6bbd827c1252d35" },
  { oldId: "6a27bbb6a6bbd827c1252e7f", to: "/exhibition/hannover-messe-2026-6a27ad7da6bbd827c1252d35" },
  // Techtextil Frankfurt Technical Textiles
  { oldId: "6a27c497a6bbd827c1252f8c", to: "/exhibition/techtextil-frankfurt-technical-textiles-6a27bccca6bbd827c1252e9f" },
  // India Warehousing Show 2026
  { oldId: "6a3bb99276c9ac00c8b82c86", to: "/exhibition/india-warehousing-show-2026-6a23fb2da6bbd827c125292f" },
  // IFA Berlin Consumer Electronics
  { oldId: "6a27c497a6bbd827c1252f8f", to: "/exhibition/ifa-berlin-consumer-electronics-6a27bccca6bbd827c1252e9c" },
  // MEDTEC China 2026
  { oldId: "6a4230b176c9ac00c8b8371c", to: "/exhibition/medtec-china-2026-6a2be7960d85e7f7fa0173d5" },
  // Philconstruct Mindanao 2026
  { oldId: "6a2d400c0d85e7f7fa017786", to: "/exhibition/philconstruct-mindanao-2026-6a2d3bcf0d85e7f7fa017765" },
  // Marca China Fair 2026
  { oldId: "6a4230b176c9ac00c8b83727", to: "/exhibition/marca-china-fair-2026-6a2beb570d85e7f7fa0173fe" },
  // LDC Gas Forums 2026
  { oldId: "6a2bd4e70d85e7f7fa01735f", to: "/exhibition/ldc-gas-forums-2026-6a2baba40d85e7f7fa0172ab" },
  // AMB Exhibition Stuttgart
  { oldId: "6a46167d76c9ac00c8b83c9c", to: "/exhibition/amb-exhibition-stuttgart-6a27b9cfa6bbd827c1252e35" },
  // Beauty Expo Malaysia
  { oldId: "6a3a226376c9ac00c8b8297c", to: "/exhibition/beauty-expo-malaysia-6a4e13aa8b71904beb2fbb63" },
  // Manila FAME 2026
  { oldId: "6a509bd98b71904beb2fbc62", to: "/exhibition/manila-fame-2026-6a2d3b180d85e7f7fa01774d" },
  // Medica Düsseldorf
  { oldId: "6a27c497a6bbd827c1252f87", to: "/exhibition/medica-dusseldorf-6a27bccca6bbd827c1252e99" },
  // Data Center Asia 2026 Kuala Lumpur
  { oldId: "6a4e13aa8b71904beb2fbb66", to: "/exhibition/data-center-asia-2026-kuala-lumpur-6a2f98b20d85e7f7fa0178bf" },
  // Water Philippines Expo 2027
  { oldId: "6a509bd98b71904beb2fbc64", to: "/exhibition/water-philippines-expo-2027-6a2d3bcf0d85e7f7fa01775b" },

  // ----- PTAK Warsaw Expo double-import (audit 2026-09-18) -----
  // One organiser catalogue was imported twice. Each pair matched on name, both
  // dates, city and venue; the keeper is the second import, which carries the
  // event's own domain where the first import carried a Google image thumbnail,
  // a third-party asset path, or a base64 data URI. Checked field by field: the
  // removed record held nothing the keeper lacked in any of the 21 pairs.
  // Destinations were read from the live sitemap, so every slug is the exact
  // form the app generates rather than a reconstruction.
  { oldId: "6a50e5c65006b171b5c78b51", to: "/exhibition/fast-textile-6aaa435829358b0252a04c4c" },
  { oldId: "6a50e5c65006b171b5c78b52", to: "/exhibition/food-tech-expo-6aaa435829358b0252a04c4d" },
  { oldId: "6a50e5c65006b171b5c78b53", to: "/exhibition/retail-show-poland-6aaa435829358b0252a04c4e" },
  { oldId: "6a50e5c65006b171b5c78b54", to: "/exhibition/fire-protection-expo-poland-6aaa435829358b0252a04c4f" },
  { oldId: "6a50e5c65006b171b5c78b55", to: "/exhibition/facade-expo-poland-6aaa435829358b0252a04c50" },
  { oldId: "6a50e5c65006b171b5c78b56", to: "/exhibition/bio-agro-polska-6aaa435829358b0252a04c51" },
  { oldId: "6a50e5c65006b171b5c78b57", to: "/exhibition/fruit-poland-expo-6aaa435829358b0252a04c52" },
  { oldId: "6a50e5c65006b171b5c78b58", to: "/exhibition/poland-build-machine-expo-6aaa435829358b0252a04c53" },
  { oldId: "6a50e5c65006b171b5c78b5a", to: "/exhibition/poultry-poland-6aaa435829358b0252a04c55" },
  { oldId: "6a50e5c65006b171b5c78b5b", to: "/exhibition/roof-expo-poland-6aaa435829358b0252a04c56" },
  { oldId: "6a50e5c65006b171b5c78b5c", to: "/exhibition/sakralia-expo-6aaa435829358b0252a04c57" },
  { oldId: "6a50e5c65006b171b5c78b5d", to: "/exhibition/wire-tech-poland-6aaa435829358b0252a04c58" },
  { oldId: "6a50e5c65006b171b5c78b5e", to: "/exhibition/car-wash-tech-expo-6aaa435829358b0252a04c59" },
  { oldId: "6a50e5c65006b171b5c78b5f", to: "/exhibition/fuel-mobility-hub-expo-6aaa435829358b0252a04c5a" },
  { oldId: "6a50e5c65006b171b5c78b60", to: "/exhibition/electro-instal-expo-6aaa435829358b0252a04c5b" },
  { oldId: "6a50e5c65006b171b5c78b61", to: "/exhibition/emobility-expo-poland-6aaa435829358b0252a04c5c" },
  { oldId: "6a50e5c65006b171b5c78b62", to: "/exhibition/the-world-of-cables-6aaa435829358b0252a04c5d" },
  { oldId: "6a50e5c65006b171b5c78b63", to: "/exhibition/warsaw-security-expo-6aaa435829358b0252a04c5e" },
  { oldId: "6a50e5c65006b171b5c78b65", to: "/exhibition/real-estate-poland-expo-6aaa435829358b0252a04c60" },
  { oldId: "6a50e5c65006b171b5c78b66", to: "/exhibition/hunting-expo-poland-6aaa435829358b0252a04c61" },
  { oldId: "6a50e5c65006b171b5c78b67", to: "/exhibition/warsaw-fishing-days-6aaa435829358b0252a04c62" },

  // ----- Officially verified duplicates (audit 2026-09-18) -----
  // Three groups checked against the organiser's own site rather than inferred:
  // hardwarefair-india.com (23-25 Oct 2026, Bharat Mandapam), ildex-indonesia.com
  // (16-18 Sep 2026, ICE) and pitex.in (3-7 Dec 2026, Ranjit Avenue). In each the
  // keeper's venue, address and organiser match the official wording and the
  // retired record's did not. The ILDEX record retired here carried the right
  // name and dates but a body describing an interior-design fair, so only its
  // verified floorplan PDF was preserved.
  { oldId: "6a266553a6bbd827c1252a14", to: "/exhibition/international-hardware-fair-india-2026-6aabc92629358b0252a0ae8b" },
  { oldId: "6a2d362e0d85e7f7fa017706", to: "/exhibition/ildex-indonesia-2026-6a4ca3688b71904beb2fba15" },
  { oldId: "6aa4f5952d160e37864eaad3", to: "/exhibition/punjab-international-trade-expo-pitex-2026-6aa9398d29358b0252a01380" },

  // ----- Repaired before consolidation (audit 2026-09-18) -----
  // Two groups where the keeper had to be corrected first, because both records
  // carried unverifiable content and the keeper's contact chain pointed at
  // automechanika-frankfurt.de, a domain that does not resolve at all. Checked
  // against messefrankfurt.com (8-12 Sep 2026, 112,000+ trade visitors) and
  // dwtc.com/en/events/gitex-global-2025 (13-17 Oct 2025, DWTC). Named speakers
  // on both keepers were fabricated - none of the five on the GITEX record appear
  // on the official 2025 speaker list - so those fields were cleared rather than
  // merged. The GITEX keeper also had organiser prose sitting in `country`.
  { oldId: "6a27b9cfa6bbd827c1252e33", to: "/exhibition/automechanika-frankfurt-2026-6a460da376c9ac00c8b83c4d" },
  { oldId: "6a27d815a6bbd827c1253102", to: "/exhibition/gitex-global-2025-6a27d017a6bbd827c125305b" },

  // ----- Catalogue-wide sweep (2026-11-03) -----
  // 243 records across 209 groups, found by scanning the whole catalogue: same
  // name ignoring case and punctuation with the same start date (151), or the
  // same distinctive words - year, "Expo", "India" and edition numbers ignored -
  // with the same start AND end date (92). The keeper in each group is the one
  // with references, then the most complete (centre link, image, longest
  // description), then the oldest; blank keeper fields were filled from the
  // removed copies first. Three earlier destinations (Warsaw Dental Medica Show,
  // Warsaw Medical Expo, Automechanika Frankfurt) were removed in this sweep, so
  // those entries above now point at this sweep's keeper to avoid a chain.
  { oldId: "6a22b939a6bbd827c1252811", to: "/exhibition/62nd-ihgf-delhi-fair-autumn-2026-6aa935fc29358b0252a012a2" },
  { oldId: "6a2662f0a6bbd827c12529fd", to: "/exhibition/tools-equipment-expo-2026-6abcf8863b48e63eeaaebfd2" },
  { oldId: "6abcec883b48e63eeaaebb2a", to: "/exhibition/delhi-jewellery-gem-fair-2026-6a2662f0a6bbd827c1252a00" },
  { oldId: "6aad20fcc4bd3c7c2f001a2b", to: "/exhibition/ifsec-india-2026-6a2666fca6bbd827c1252a34" },
  { oldId: "6abcd4003b48e63eeaaeb088", to: "/exhibition/ifsec-india-2026-6a2666fca6bbd827c1252a34" },
  { oldId: "6aace77ec4bd3c7c2f0003e6", to: "/exhibition/india-med-expo-hyderabad-2026-6a266887a6bbd827c1252a50" },
  { oldId: "6abcdffa3b48e63eeaaeb4fd", to: "/exhibition/india-med-expo-hyderabad-2026-6a266887a6bbd827c1252a50" },
  { oldId: "6a463a905464844ef9e7a361", to: "/exhibition/windenergy-hamburg-2026-6a27ad7da6bbd827c1252d38" },
  { oldId: "6a2a56fb0d85e7f7fa016f21", to: "/exhibition/yarn-expo-autumn-shanghai-2026-6a2be7960d85e7f7fa0173cb" },
  { oldId: "6a2beb520d85e7f7fa0173f6", to: "/exhibition/semicon-west-2026-6ab367ee0334cd03008bf762" },
  { oldId: "6ae87d326d00e6ba1ec23545", to: "/exhibition/world-travel-market-london-2026-6a2cef070d85e7f7fa0174fc" },
  { oldId: "6a99049e33410d907f7dc779", to: "/exhibition/laser-world-of-photonics-india-2026-6a38e9af84b70fbb7aa0df92" },
  { oldId: "6abcf8863b48e63eeaaebfd6", to: "/exhibition/acetech-bengaluru-2026-6a38e9af84b70fbb7aa0df94" },
  { oldId: "6aad2223c4bd3c7c2f001acb", to: "/exhibition/chemexpo-india-2027-6a3b990676c9ac00c8b82bba" },
  { oldId: "6a3b990676c9ac00c8b82bbd", to: "/exhibition/wire-india-2026-6a3cd17776c9ac00c8b82f07" },
  { oldId: "6a3b9d4676c9ac00c8b82bd0", to: "/exhibition/tube-india-2026-6a3cd18476c9ac00c8b82f16" },
  { oldId: "6a3b990676c9ac00c8b82bbe", to: "/exhibition/tube-india-2026-6a3cd18476c9ac00c8b82f16" },
  { oldId: "6a3b990676c9ac00c8b82bbf", to: "/exhibition/india-essen-welding-cutting-2026-6a3cd18476c9ac00c8b82f17" },
  { oldId: "6a3b990676c9ac00c8b82bc0", to: "/exhibition/metec-india-2026-6ab233c10334cd03008b8e28" },
  { oldId: "6a3bb99276c9ac00c8b82c8b", to: "/exhibition/powergen-india-indian-utility-week-2026-6abcec883b48e63eeaaebb2c" },
  { oldId: "6abcec883b48e63eeaaebb25", to: "/exhibition/fire-india-2026-6a3bbc7d76c9ac00c8b82cad" },
  { oldId: "6a3bc37476c9ac00c8b82ced", to: "/exhibition/bes-expo-2027-6aba07cf9d4e9d06e1112723" },
  { oldId: "6a3bc77276c9ac00c8b82d24", to: "/exhibition/plastasia-2027-6aad20fcc4bd3c7c2f001a49" },
  { oldId: "6ab3acee6eadb7709f54f1fb", to: "/exhibition/india-paper-expo-2026-6a3cd18476c9ac00c8b82f18" },
  { oldId: "6aad2223c4bd3c7c2f001aa8", to: "/exhibition/acetech-mumbai-2026-6a3cd18476c9ac00c8b82f14" },
  { oldId: "6a9aad8a33410d907f7dc97f", to: "/exhibition/metal-expo-bangladesh-2026-6a3e668b76c9ac00c8b833bf" },
  { oldId: "6a48f70a46ec44fa748a4bef", to: "/exhibition/agri-intex-2026-6abdfb9e3b48e63eeaaf1cff" },
  { oldId: "6ab0f4fb5768198bf35b7aa9", to: "/exhibition/intext-expo-2026-6a7c5ab87807201faf842496" },
  { oldId: "6aa0f48a7ec0ad254292ab60", to: "/exhibition/20th-engiexpo-industrial-exhibition-ahmedabad-2026-6ae04180cee657796b9ed508" },
  { oldId: "6aa4f9db2d160e37864ead4d", to: "/exhibition/meditech-healthcare-asia-2026-6abdffcb3b48e63eeaaf1f15" },
  { oldId: "6aa79cb029358b02529fba07", to: "/exhibition/brews-spirits-expo-2026-6abcd7753b48e63eeaaeb22b" },
  { oldId: "6abdffcb3b48e63eeaaf1f1a", to: "/exhibition/the-battery-show-india-2026-6aa918c929358b0252a00c1f" },
  { oldId: "6aa9233929358b0252a00ebd", to: "/exhibition/pmec-india-2026-6abe1609699423f330e66fd5" },
  { oldId: "6aad2223c4bd3c7c2f001aa5", to: "/exhibition/packmach-asia-expo-2026-6aa924b829358b0252a00f01" },
  { oldId: "6abdffcb3b48e63eeaaf1f16", to: "/exhibition/packmach-asia-expo-2026-6aa924b829358b0252a00f01" },
  { oldId: "6aabc92629358b0252a0ae8a", to: "/exhibition/india-mobile-congress-2026-6aa9306829358b0252a01184" },
  { oldId: "6aaa4d4029358b0252a04ea1", to: "/exhibition/odisha-plast-international-expo-2026-6abe0aa83b48e63eeaaf250f" },
  { oldId: "6aabc92629358b0252a0ae8e", to: "/exhibition/cphi-india-2026-6abe0aa83b48e63eeaaf2508" },
  { oldId: "6aabc92629358b0252a0ae92", to: "/exhibition/new-delhi-world-book-fair-2027-6ab798d29d4e9d06e1101bfb" },
  { oldId: "6aad20fcc4bd3c7c2f001a36", to: "/exhibition/bharat-battery-show-2027-6ab7ae759d4e9d06e1102680" },
  { oldId: "6aabc92629358b0252a0ae96", to: "/exhibition/bharat-battery-show-2027-6ab7ae759d4e9d06e1102680" },
  { oldId: "6aabc92629358b0252a0ae94", to: "/exhibition/bharat-mobility-global-expo-2027-6ab7a5389d4e9d06e11020e6" },
  { oldId: "6aad20fcc4bd3c7c2f001a34", to: "/exhibition/auto-expo-the-motor-show-2027-6ab7a7fd9d4e9d06e1102170" },
  { oldId: "6aabc92629358b0252a0ae95", to: "/exhibition/auto-expo-the-motor-show-2027-6ab7a7fd9d4e9d06e1102170" },
  { oldId: "6ab7b2069d4e9d06e1102be6", to: "/exhibition/india-cycle-show-2027-6aabc92629358b0252a0ae97" },
  { oldId: "6aabc92629358b0252a0ae93", to: "/exhibition/satte-2027-6aad20fcc4bd3c7c2f001a30" },
  { oldId: "6aabd57e29358b0252a0b11e", to: "/exhibition/cii-agrotech-india-2026-the-premier-agri-food-technology-fair-6ab770ae779ad90df80ed37c" },
  { oldId: "6aabd57e29358b0252a0b120", to: "/exhibition/india-international-surveillance-cctv-expo-6ab770ae779ad90df80ed37e" },
  { oldId: "6aabd57e29358b0252a0b126", to: "/exhibition/electric-vehicle-technology-expo-6ab770ae779ad90df80ed380" },
  { oldId: "6aabd57e29358b0252a0b12a", to: "/exhibition/india-international-hospital-equipment-expo-6ab770ae779ad90df80ed382" },
  { oldId: "6aabd57e29358b0252a0b12b", to: "/exhibition/cloud-and-cyber-security-expo-6ab770ae779ad90df80ed381" },
  { oldId: "6aabd57e29358b0252a0b11f", to: "/exhibition/india-international-steel-technology-expo-6ab770ae779ad90df80ed37d" },
  { oldId: "6aabd57e29358b0252a0b127", to: "/exhibition/india-international-commercial-vehicle-expo-6ab770ae779ad90df80ed37f" },
  { oldId: "6aae5c2b61a2d6cc816ebbce", to: "/exhibition/india-diagnostic-expo-2026-6aace77ec4bd3c7c2f0003e5" },
  { oldId: "6aae5c2b61a2d6cc816ebbc9", to: "/exhibition/poultry-india-expo-2026-6abe1609699423f330e66fd6" },
  { oldId: "6aace77ec4bd3c7c2f0003de", to: "/exhibition/poultry-india-expo-2026-6abe1609699423f330e66fd6" },
  { oldId: "6aae5c2b61a2d6cc816ebbcc", to: "/exhibition/india-die-mould-show-2026-6aace77ec4bd3c7c2f0003e3" },
  { oldId: "6aae5c2b61a2d6cc816ebbc6", to: "/exhibition/pap-expo-2026-6aace77ec4bd3c7c2f0003da" },
  { oldId: "6aae5c2b61a2d6cc816ebbcd", to: "/exhibition/india-fastener-show-2026-6aace77ec4bd3c7c2f0003e4" },
  { oldId: "6ab245b60334cd03008b9367", to: "/exhibition/india-fastener-show-2026-6aace77ec4bd3c7c2f0003e4" },
  { oldId: "6aace77ec4bd3c7c2f0003db", to: "/exhibition/waremat-hyderabad-2026-6aae5c2b61a2d6cc816ebbc7" },
  { oldId: "6aae5c2b61a2d6cc816ebbcb", to: "/exhibition/sign-india-hyderabad-2026-6aace77ec4bd3c7c2f0003e2" },
  { oldId: "6aad20fcc4bd3c7c2f001a28", to: "/exhibition/et-tech-x-2026-6abcd7753b48e63eeaaeb230" },
  { oldId: "6ab7ac359d4e9d06e1102376", to: "/exhibition/india-international-tyre-show-2027-6aad20fcc4bd3c7c2f001a35" },
  { oldId: "6ab79c109d4e9d06e1101cc7", to: "/exhibition/plastivision-india-2027-6aad2223c4bd3c7c2f001aad" },
  { oldId: "6aad2223c4bd3c7c2f001ab5", to: "/exhibition/clean-india-show-2027-6aba58499d4e9d06e11158c3" },
  { oldId: "6ac094e9699423f330e76245", to: "/exhibition/mewa-india-2027-6aad2223c4bd3c7c2f001ab0" },
  { oldId: "6aae5a4261a2d6cc816ebaff", to: "/exhibition/prowave-expo-2026-6ac0b0c8699423f330e7732a" },
  { oldId: "6aba19919d4e9d06e111341e", to: "/exhibition/india-pharma-expo-2027-6aae5c2b61a2d6cc816ebbd2" },
  { oldId: "6aae7be61891ffd9b55e501f", to: "/exhibition/india-agri-expo-2027-6ab770ae779ad90df80ed387" },
  { oldId: "6ab0ebd53373ada65fd6e367", to: "/exhibition/asia-jewels-show-2026-6ab65a6dd5d9f0a5162c7816" },
  { oldId: "6abdf3053b48e63eeaaf19c5", to: "/exhibition/drinktec-india-2026-6ab265850334cd03008ba427" },
  { oldId: "6ab255010334cd03008b991d", to: "/exhibition/drinktec-india-2026-6ab265850334cd03008ba427" },
  { oldId: "6ab26bb20334cd03008ba650", to: "/exhibition/wofx-world-furniture-expo-2026-6abce9203b48e63eeaaeb9cd" },
  { oldId: "6ab26ff60334cd03008babf3", to: "/exhibition/hygienex-asia-2026-6abcd07c3b48e63eeaaeae88" },
  { oldId: "6abe4163699423f330e688f9", to: "/exhibition/cosmoprof-india-2026-6abe1a38699423f330e672e5" },
  { oldId: "6ab271b30334cd03008bac70", to: "/exhibition/cosmoprof-india-2026-6abe1a38699423f330e672e5" },
  { oldId: "6ab50f89d5d9f0a5162bfa3d", to: "/exhibition/raw-mat-india-2026-6abce9b73b48e63eeaaeba19" },
  { oldId: "6ab62574d5d9f0a5162c6120", to: "/exhibition/india-international-ev-show-2026-6abdf3053b48e63eeaaf19c9" },
  { oldId: "6abdffcb3b48e63eeaaf1f18", to: "/exhibition/scat-marketplace-2026-6ab65607d5d9f0a5162c756a" },
  { oldId: "6ab7860a779ad90df80edaaa", to: "/exhibition/indplas-27-11th-international-exhibition-on-plastics-6abba5989d4e9d06e111f6a4" },
  { oldId: "6ab78665779ad90df80edae0", to: "/exhibition/packplus-south-2026-6abe1609699423f330e66fd4" },
  { oldId: "6ac35a29699423f330e8805e", to: "/exhibition/bni-rajkot-business-expo-2027-6ab7b36a9d4e9d06e1102d95" },
  { oldId: "6ac35a29699423f330e88067", to: "/exhibition/india-machine-tools-show-2027-6ab7b36a9d4e9d06e1102d9e" },
  { oldId: "6ab9fe2e9d4e9d06e1112025", to: "/exhibition/automotive-testing-expo-india-2027-6ab7b36a9d4e9d06e1102d96" },
  { oldId: "6ac35a29699423f330e8805f", to: "/exhibition/automotive-testing-expo-india-2027-6ab7b36a9d4e9d06e1102d96" },
  { oldId: "6ab7b36a9d4e9d06e1102d9d", to: "/exhibition/denim-show-mumbai-2027-6aba14169d4e9d06e1112f9d" },
  { oldId: "6ac35a29699423f330e88066", to: "/exhibition/denim-show-mumbai-2027-6aba14169d4e9d06e1112f9d" },
  { oldId: "6aba2b929d4e9d06e1113e4f", to: "/exhibition/pipes-and-tubes-expo-2027-6ab7b36a9d4e9d06e1102da2" },
  { oldId: "6ac35a29699423f330e8806b", to: "/exhibition/pipes-and-tubes-expo-2027-6ab7b36a9d4e9d06e1102da2" },
  { oldId: "6aba30209d4e9d06e1114148", to: "/exhibition/av-icn-expo-2027-6ab7b36a9d4e9d06e1102da4" },
  { oldId: "6ac35a29699423f330e8806d", to: "/exhibition/av-icn-expo-2027-6ab7b36a9d4e9d06e1102da4" },
  { oldId: "6ac35a29699423f330e8806f", to: "/exhibition/indusfood-ahmedabad-2027-6ab7b36a9d4e9d06e1102da6" },
  { oldId: "6ab7b7fe9d4e9d06e110336d", to: "/exhibition/international-gem-jewellery-show-igjs-jaipur-2027-6ab7b36a9d4e9d06e1102d93" },
  { oldId: "6ac35a29699423f330e8805c", to: "/exhibition/international-gem-jewellery-show-igjs-jaipur-2027-6ab7b36a9d4e9d06e1102d93" },
  { oldId: "6ab7b36a9d4e9d06e1102d99", to: "/exhibition/texindia-kolkata-2027-6aba0f5c9d4e9d06e1112c04" },
  { oldId: "6ac35a29699423f330e88062", to: "/exhibition/texindia-kolkata-2027-6aba0f5c9d4e9d06e1112c04" },
  { oldId: "6ab9ff9f9d4e9d06e1112098", to: "/exhibition/renewx-2027-6ab7b36a9d4e9d06e1102d97" },
  { oldId: "6aba00af9d4e9d06e111214c", to: "/exhibition/renewx-2027-6ab7b36a9d4e9d06e1102d97" },
  { oldId: "6ac35a29699423f330e88060", to: "/exhibition/renewx-2027-6ab7b36a9d4e9d06e1102d97" },
  { oldId: "6ab7b36a9d4e9d06e1102d9b", to: "/exhibition/dychem-texprocess-kolkata-2027-6aba116c9d4e9d06e1112dce" },
  { oldId: "6ac35a29699423f330e88064", to: "/exhibition/dychem-texprocess-kolkata-2027-6aba116c9d4e9d06e1112dce" },
  { oldId: "6ab7b9349d4e9d06e1103507", to: "/exhibition/secure-nation-expo-2027-6ab7b36a9d4e9d06e1102d94" },
  { oldId: "6ac35a29699423f330e8805d", to: "/exhibition/secure-nation-expo-2027-6ab7b36a9d4e9d06e1102d94" },
  { oldId: "6ac35a29699423f330e8806a", to: "/exhibition/eaw-global-aqua-expo-new-delhi-2027-6ab7b36a9d4e9d06e1102da1" },
  { oldId: "6aba21279d4e9d06e11139b6", to: "/exhibition/eaw-global-aqua-expo-new-delhi-2027-6ab7b36a9d4e9d06e1102da1" },
  { oldId: "6aba0e019d4e9d06e1112ade", to: "/exhibition/yarnex-kolkata-2027-6aba0d729d4e9d06e1112aa6" },
  { oldId: "6ab7b36a9d4e9d06e1102d98", to: "/exhibition/yarnex-kolkata-2027-6aba0d729d4e9d06e1112aa6" },
  { oldId: "6ac35a29699423f330e88061", to: "/exhibition/yarnex-kolkata-2027-6aba0d729d4e9d06e1112aa6" },
  { oldId: "6ac35a29699423f330e88065", to: "/exhibition/india-electronics-week-2027-6ab7b36a9d4e9d06e1102d9c" },
  { oldId: "6aba3b3f9d4e9d06e11146c0", to: "/exhibition/plexpoindia-2027-6ab7b36a9d4e9d06e1102daa" },
  { oldId: "6ac35a29699423f330e88073", to: "/exhibition/plexpoindia-2027-6ab7b36a9d4e9d06e1102daa" },
  { oldId: "6ab7b36a9d4e9d06e1102d9a", to: "/exhibition/indigo-kolkata-2027-6aba103d9d4e9d06e1112c88" },
  { oldId: "6ac35a29699423f330e88063", to: "/exhibition/indigo-kolkata-2027-6aba103d9d4e9d06e1112c88" },
  { oldId: "6aba2e049d4e9d06e1113f47", to: "/exhibition/palm-expo-mumbai-2027-6ab7b36a9d4e9d06e1102da3" },
  { oldId: "6ac35a29699423f330e8806c", to: "/exhibition/palm-expo-mumbai-2027-6ab7b36a9d4e9d06e1102da3" },
  { oldId: "6ab7b36a9d4e9d06e1102da5", to: "/exhibition/surface-coating-expo-2027-6ac35a29699423f330e8806e" },
  { oldId: "6aba31be9d4e9d06e1114257", to: "/exhibition/surface-coating-expo-2027-6ac35a29699423f330e8806e" },
  { oldId: "6ac35a29699423f330e88070", to: "/exhibition/vibrant-india-stainless-steel-kitchen-appliances-expo-2027-6ab7b36a9d4e9d06e1102da7" },
  { oldId: "6ab7b36a9d4e9d06e1102da0", to: "/exhibition/cyber-raksha-bharat-6aba1a219d4e9d06e11134de" },
  { oldId: "6ac35a29699423f330e88069", to: "/exhibition/cyber-raksha-bharat-6aba1a219d4e9d06e11134de" },
  { oldId: "6aba0fb99d4e9d06e1112c56", to: "/exhibition/paperworld-mumbai-2027-6aba0eb59d4e9d06e1112bc4" },
  { oldId: "6aba15eb9d4e9d06e11130b5", to: "/exhibition/imtex-2027-international-machine-tool-and-manufacturing-technolo-6aba15549d4e9d06e1113024" },
  { oldId: "6aba17019d4e9d06e1113193", to: "/exhibition/automation-manufacturing-technology-show-2027-6ac35a29699423f330e88068" },
  { oldId: "6ac35a29699423f330e88044", to: "/exhibition/indusfood-2027-6aba33719d4e9d06e1114379" },
  { oldId: "6ac35a29699423f330e88072", to: "/exhibition/bharat-silver-show-2027-6aba3a029d4e9d06e1114624" },
  { oldId: "6aba52c79d4e9d06e11155cd", to: "/exhibition/cctv-expo-2027-6abb65489d4e9d06e111cb03" },
  { oldId: "6ac34007699423f330e86d36", to: "/exhibition/india-pharma-global-expo-2027-6abb681c9d4e9d06e111cd7e" },
  { oldId: "6abe124c699423f330e66dc4", to: "/exhibition/famdent-show-hyderabad-2027-6abb68ab9d4e9d06e111ce27" },
  { oldId: "6abb68ab9d4e9d06e111ce35", to: "/exhibition/fenestrationpro-india-2027-6abb984f9d4e9d06e111f07a" },
  { oldId: "6abb901a9d4e9d06e111e81f", to: "/exhibition/green-vehicle-expo-2027-6abb80dc9d4e9d06e111de9d" },
  { oldId: "6abb918d9d4e9d06e111e9ba", to: "/exhibition/tube-pipe-fair-2027-6abb80dc9d4e9d06e111de9f" },
  { oldId: "6abb931e9d4e9d06e111eb75", to: "/exhibition/big-cine-expo-2027-6abb80dc9d4e9d06e111de9e" },
  { oldId: "6abb8da09d4e9d06e111e5de", to: "/exhibition/sport-india-2027-14th-india-international-sporting-goods-show-6abba1899d4e9d06e111f490" },
  { oldId: "6abb8da09d4e9d06e111e5dc", to: "/exhibition/autotechnika-2027-6abb99879d4e9d06e111f111" },
  { oldId: "6abb984f9d4e9d06e111f078", to: "/exhibition/ev-india-expo-2027-6abba9c09d4e9d06e111f89a" },
  { oldId: "6abb984f9d4e9d06e111f075", to: "/exhibition/kolkatawood-2027-6abba8c09d4e9d06e111f7f8" },
  { oldId: "6ac35a29699423f330e88043", to: "/exhibition/indusfood-manufacturing-2027-6abcd3fd3b48e63eeaaeb084" },
  { oldId: "6ac0b3b7699423f330e77461", to: "/exhibition/india-fashion-forum-2027-6abce6ff3b48e63eeaaeb8d1" },
  { oldId: "6ac35a29699423f330e88050", to: "/exhibition/logimat-india-2027-6abcf9173b48e63eeaaec01d" },
  { oldId: "6ac35a29699423f330e88058", to: "/exhibition/iaapi-amusement-expo-2027-6abcfcc53b48e63eeaaec226" },
  { oldId: "6abe4163699423f330e688f7", to: "/exhibition/amptech-india-pharma-machinery-lab-equipment-chemical-expo-2026-6abe1a38699423f330e672e3" },
  { oldId: "6abe4163699423f330e688f8", to: "/exhibition/4th-castings-foundries-expo-india-2026-6abe1a38699423f330e672e4" },
  { oldId: "6ab262f20334cd03008ba364", to: "/exhibition/4th-castings-foundries-expo-india-2026-6abe1a38699423f330e672e4" },
  { oldId: "6ac346db699423f330e87163", to: "/exhibition/adhesives-sealants-summit-expo-2027-6abe3853699423f330e6848f" },
  { oldId: "6ac38d47699423f330e8b05c", to: "/exhibition/iaa-mobility-2027-6ac38641699423f330e8ac0e" },
  { oldId: "6ac48fe4699423f330e92081", to: "/exhibition/niederrhein-kreativ-messe-6ac48393699423f330e9189e" },
  { oldId: "6ae487c1c50f56c70643c673", to: "/exhibition/salon-des-antiquaires-et-des-gastronomes-la-rochelle-chatelaillon-plage-6ae48789c50f56c70643c642" },
  { oldId: "6ae82084c50f56c706467851", to: "/exhibition/salon-des-antiquaires-et-des-gastronomes-la-rochelle-chatelaillon-plage-6ae48789c50f56c70643c642" },
  { oldId: "6ae82084c50f56c706467850", to: "/exhibition/china-yiwu-international-forest-products-fair-19th-edition-6ae487c1c50f56c70643c672" },
  { oldId: "6ae82084c50f56c706467852", to: "/exhibition/stoffen-spektakel-houten-6ae487c1c50f56c70643c674" },
  { oldId: "6ae487c1c50f56c70643c675", to: "/exhibition/saudi-clean-show-2026-6ae82084c50f56c706467853" },
  { oldId: "6ae487c1c50f56c70643c677", to: "/exhibition/equiphotel-paris-2026-6ae82084c50f56c706467855" },
  { oldId: "6ae82084c50f56c706467856", to: "/exhibition/project-oman-2026-oman-construction-infrastructure-exhibition-6ae487c1c50f56c70643c678" },
  { oldId: "6ae87d326d00e6ba1ec23552", to: "/exhibition/cemat-asia-2026-6ae82ebbc50f56c706468bbb" },
  { oldId: "6ae87d326d00e6ba1ec23548", to: "/exhibition/comvac-asia-2026-6ae83db16d00e6ba1ec2051c" },
  { oldId: "6ae87d326d00e6ba1ec23549", to: "/exhibition/ptc-asia-2026-6ae83db16d00e6ba1ec2051d" },
  { oldId: "6ae87d326d00e6ba1ec2354a", to: "/exhibition/petit-1-clermont-ferrand-2026-6ae83db16d00e6ba1ec2051e" },
  { oldId: "6ae87d326d00e6ba1ec2354b", to: "/exhibition/dionysud-2026-6ae83db16d00e6ba1ec2051f" },
  { oldId: "6ae87d326d00e6ba1ec2354c", to: "/exhibition/euronaval-2026-6ae83db16d00e6ba1ec20520" },
  { oldId: "6ae87d326d00e6ba1ec2354d", to: "/exhibition/jtic-76emes-journees-techniques-des-industries-cerealieres-6ae83db16d00e6ba1ec20521" },
  { oldId: "6ae87d326d00e6ba1ec2354f", to: "/exhibition/solutionscse-parc-asterix-2026-6ae83db16d00e6ba1ec20523" },
  { oldId: "6ae87d326d00e6ba1ec23551", to: "/exhibition/fmb-mechanical-engineering-show-2026-6ae83db16d00e6ba1ec20525" },
  { oldId: "6aabc92629358b0252a0ae91", to: "/exhibition/18th-ipca-electronics-expo-india-2026-6a23d35fa6bbd827c12528d7" },
  { oldId: "6ac4dbc21b9fc93bcf74597b", to: "/exhibition/international-health-wellness-expo-2026-6a23ea8da6bbd827c12528f6" },
  { oldId: "6abce3723b48e63eeaaeb6cc", to: "/exhibition/municipalika-expo-2026-6a2666fca6bbd827c1252a30" },
  { oldId: "6a27bccca6bbd827c1252e98", to: "/exhibition/automechanika-frankfurt-2026-6a460da376c9ac00c8b83c4d" },
  { oldId: "6a2950b10d85e7f7fa016e68", to: "/exhibition/ceramics-expo-china-2026-6a2bbfd40d85e7f7fa017314" },
  { oldId: "6a42218376c9ac00c8b836fa", to: "/exhibition/shanghai-intertextile-home-textiles-autumn-fair-2026-6a2a4be50d85e7f7fa016eb3" },
  { oldId: "6a2bdb3a0d85e7f7fa017391", to: "/exhibition/shanghai-intertextile-home-textiles-autumn-fair-2026-6a2a4be50d85e7f7fa016eb3" },
  { oldId: "6a2a56fb0d85e7f7fa016f24", to: "/exhibition/intertextile-shanghai-apparel-fabrics-autumn-6a2be7960d85e7f7fa0173cc" },
  { oldId: "6a2a5eff0d85e7f7fa017023", to: "/exhibition/cieme-china-international-equipment-manufacturing-exposition-6a2be7960d85e7f7fa0173d9" },
  { oldId: "6a2a5eff0d85e7f7fa01701f", to: "/exhibition/shanghai-international-catering-ingredients-exhibition-6a2be7960d85e7f7fa0173d3" },
  { oldId: "6a42218376c9ac00c8b83705", to: "/exhibition/shanghai-international-catering-ingredients-exhibition-6a2be7960d85e7f7fa0173d3" },
  { oldId: "6a2a5eff0d85e7f7fa01701c", to: "/exhibition/sifce-shanghai-international-frozen-chilled-food-expo-6a2be7960d85e7f7fa0173d0" },
  { oldId: "6a9a5b6f33410d907f7dc846", to: "/exhibition/ciif-china-international-industry-fair-2026-6a2a66db0d85e7f7fa0170b2" },
  { oldId: "6a34eee90d85e7f7fa018989", to: "/exhibition/laser-korea-international-laser-technology-exhibition-2026-6a2bf88d0d85e7f7fa01747c" },
  { oldId: "6a34f4040d85e7f7fa0189ce", to: "/exhibition/k-mtech-korea-materials-composites-equipment-show-2026-6a2bf88d0d85e7f7fa017489" },
  { oldId: "6a34f0cf0d85e7f7fa01899f", to: "/exhibition/keet-korea-environment-energy-trade-fair-2026-6a2bf88d0d85e7f7fa017482" },
  { oldId: "6a3fa67076c9ac00c8b835e5", to: "/exhibition/the-national-women-show-vancouver-6a2cef020d85e7f7fa0174ed" },
  { oldId: "6a2d1aa70d85e7f7fa017646", to: "/exhibition/bangkok-international-jewelry-gems-fair-2026-6a2d08d80d85e7f7fa017602" },
  { oldId: "6a4e0d668b71904beb2fbb2d", to: "/exhibition/asean-ports-logistics-2026-6a2f930e0d85e7f7fa017846" },
  { oldId: "6a4e18b78b71904beb2fbb6e", to: "/exhibition/mijf-malaysia-international-jewellery-fair-2027-6a2f98b20d85e7f7fa0178c3" },
  { oldId: "6a2f9e3d0d85e7f7fa017920", to: "/exhibition/home-show-brazil-6a3f68fb76c9ac00c8b8347d" },
  { oldId: "6a2f9e3d0d85e7f7fa017922", to: "/exhibition/fenasucro-agrocana-6a3f68fb76c9ac00c8b8347e" },
  { oldId: "6a2fa0fa0d85e7f7fa017965", to: "/exhibition/glass-south-america-6a3f7e4f76c9ac00c8b8350d" },
  { oldId: "6a2fa0fa0d85e7f7fa017961", to: "/exhibition/anuga-select-brazil-6a3f854d76c9ac00c8b8352c" },
  { oldId: "6aabc92629358b0252a0ae8c", to: "/exhibition/birc-2026-bharat-international-rice-conference-6a39207b76c9ac00c8b828ba" },
  { oldId: "6a4e0d668b71904beb2fbb39", to: "/exhibition/oil-and-gas-asia-exhibition-6a3a1f3e76c9ac00c8b8296f" },
  { oldId: "6a3a2dd176c9ac00c8b829b3", to: "/exhibition/inti-asia-electronics-expo-6a4c993a8b71904beb2fb92e" },
  { oldId: "6a3a2dd176c9ac00c8b829b4", to: "/exhibition/inti-asia-healthcare-expo-6a4c993a8b71904beb2fb937" },
  { oldId: "6a3a2dd176c9ac00c8b829b5", to: "/exhibition/inti-asia-mobility-expo-6a4c993a8b71904beb2fb92d" },
  { oldId: "6a3a321676c9ac00c8b829be", to: "/exhibition/water-indonesia-2026-5th-edition-6a4ca3688b71904beb2fba0c" },
  { oldId: "6abcd7753b48e63eeaaeb228", to: "/exhibition/agri-asia-2026-6a3b884c76c9ac00c8b82b18" },
  { oldId: "6abe0aa83b48e63eeaaf250d", to: "/exhibition/indiairport-2026-6a3b90cd76c9ac00c8b82ba7" },
  { oldId: "6a3bb6f376c9ac00c8b82c6e", to: "/exhibition/ipec-5th-edition-6aae5c2b61a2d6cc816ebbc1" },
  { oldId: "6a3bb6f376c9ac00c8b82c71", to: "/exhibition/gfloor-2nd-edition-6aae5c2b61a2d6cc816ebbc8" },
  { oldId: "6a3bbdb576c9ac00c8b82cbc", to: "/exhibition/zak-glass-technology-expo-2027-6abdf5c93b48e63eeaaf1ac6" },
  { oldId: "6a3bbdb576c9ac00c8b82cbe", to: "/exhibition/world-mithai-namkeen-convention-expo-2026-6aad20fcc4bd3c7c2f001a2e" },
  { oldId: "6a3bc37476c9ac00c8b82cec", to: "/exhibition/consumer-electronics-world-expo-2027-6aad20fcc4bd3c7c2f001a31" },
  { oldId: "6aba2a419d4e9d06e1113d5a", to: "/exhibition/34th-convergence-india-expo-2027-6aad20fcc4bd3c7c2f001a3a" },
  { oldId: "6a3bc77276c9ac00c8b82d1f", to: "/exhibition/34th-convergence-india-expo-2027-6aad20fcc4bd3c7c2f001a3a" },
  { oldId: "6a3bcd8076c9ac00c8b82d58", to: "/exhibition/india-food-forum-2026-6abcec883b48e63eeaaebb28" },
  { oldId: "6a99417c33410d907f7dc7a6", to: "/exhibition/machtech-innotech-expo-6a3f9f8a76c9ac00c8b835a7" },
  { oldId: "6a43adfa76c9ac00c8b83a80", to: "/exhibition/satis-2026-6ae9adba6d00e6ba1ec357ca" },
  { oldId: "6a48f70a46ec44fa748a4bfb", to: "/exhibition/iioo-expo-2026-6aaa809529358b0252a06b85" },
  { oldId: "6a48f70a46ec44fa748a4bff", to: "/exhibition/refcold-india-2026-6abe1609699423f330e66fd8" },
  { oldId: "6a48f70a46ec44fa748a4c00", to: "/exhibition/nonwoven-tech-asia-2026-6abce7fe3b48e63eeaaeb964" },
  { oldId: "6a50a7208b71904beb2fbc6a", to: "/exhibition/poland-coatings-expo-2026-6a97c83133410d907f7dc674" },
  { oldId: "6a97c83133410d907f7dc673", to: "/exhibition/warsaw-medical-expo-6a50a7208b71904beb2fbc6b" },
  { oldId: "6a97d8d833410d907f7dc6b7", to: "/exhibition/coffee-europe-expo-6a50a7208b71904beb2fbc76" },
  { oldId: "6a97c83133410d907f7dc675", to: "/exhibition/warsaw-dental-medica-show-6a50b89a5006b171b5c78ae7" },
  { oldId: "6a97d8d833410d907f7dc6bc", to: "/exhibition/warsaw-tech-week-6a50b89a5006b171b5c78ae9" },
  { oldId: "6a97d8d833410d907f7dc6bd", to: "/exhibition/world-of-ai-big-data-expo-6a50b89a5006b171b5c78aea" },
  { oldId: "6a97d8d833410d907f7dc6ba", to: "/exhibition/cyber-security-expo-poland-6a50b89a5006b171b5c78af0" },
  { oldId: "6a50b89a5006b171b5c78aed", to: "/exhibition/warsaw-print-tech-expo-2026-6a97fea633410d907f7dc74c" },
  { oldId: "6a50dcfe5006b171b5c78b30", to: "/exhibition/international-book-fair-in-krakow-29th-edition-6a55d62127575c79468f4714" },
  { oldId: "6a7d90747807201faf8425d7", to: "/exhibition/machauto-expo-2027-16th-edition-6ab770ae779ad90df80ed388" },
  { oldId: "6a9ff53d7ec0ad2542924fb2", to: "/exhibition/12th-aakar-beauty-salon-expo-ahmedabad-2026-6aa4f0c12d160e37864ea87a" },
  { oldId: "6abcd7753b48e63eeaaeb22e", to: "/exhibition/dairy-livestock-and-poultry-expo-asia-2026-6aa4ec3e2d160e37864ea388" },
  { oldId: "6aba2bb69d4e9d06e1113e54", to: "/exhibition/12th-smart-future-cities-india-expo-2027-6aad20fcc4bd3c7c2f001a3b" },
  { oldId: "6aba24fb9d4e9d06e1113b2e", to: "/exhibition/laundrex-india-expo-2027-6aad2223c4bd3c7c2f001ab2" },
  { oldId: "6aad2223c4bd3c7c2f001aa2", to: "/exhibition/india-folding-carton-expo-6abdf3053b48e63eeaaf19c8" },
  { oldId: "6ac4d4e51b9fc93bcf745485", to: "/exhibition/india-folding-carton-expo-6abdf3053b48e63eeaaf19c8" },
  { oldId: "6aae7be61891ffd9b55e5021", to: "/exhibition/rideindia-expo-2027-8th-edition-6ab770ae779ad90df80ed389" },
  { oldId: "6ab0edd95768198bf35b784d", to: "/exhibition/farm-to-fashion-6abdf3053b48e63eeaaf19c6" },
  { oldId: "6ab0fbb05768198bf35b7e4c", to: "/exhibition/broadcast-india-show-6abdf3053b48e63eeaaf19c1" },
  { oldId: "6ab22eea0334cd03008b8d0e", to: "/exhibition/chemlog-india-6abdf3053b48e63eeaaf19c2" },
  { oldId: "6ab7663d779ad90df80ecf41", to: "/exhibition/18th-international-mining-machinery-exhibition-imme-2026-6abe0aa83b48e63eeaaf250c" },
  { oldId: "6ab76b15779ad90df80ed161", to: "/exhibition/graintech-india-6ac35445699423f330e87da6" },
  { oldId: "6abe1609699423f330e66fd7", to: "/exhibition/rajkot-machine-tools-show-2026-6ab76e24779ad90df80ed2a8" },
  { oldId: "6abe0aa83b48e63eeaaf250e", to: "/exhibition/krishithon-2026-19th-edition-6ab78438779ad90df80eda15" },
  { oldId: "6ab7b6279d4e9d06e110312b", to: "/exhibition/zak-doors-windows-expo-2026-6abcf5613b48e63eeaaebe57" },
  { oldId: "6ab7b6e89d4e9d06e110323d", to: "/exhibition/snack-baketec-2027-6ac35a29699423f330e8805b" },
  { oldId: "6abb4c9b9d4e9d06e111b93f", to: "/exhibition/holiday-expo-coimbatore-2027-6abcd6973b48e63eeaaeb190" },
  { oldId: "6ac3308c699423f330e8619b", to: "/exhibition/expo-mart-flower-show-6abb5de49d4e9d06e111c503" },
  { oldId: "6abb614b9d4e9d06e111c793", to: "/exhibition/holiday-expo-varanasi-2027-6ac08c0a699423f330e75e4c" },
  { oldId: "6abb686c9d4e9d06e111cdfd", to: "/exhibition/food-bakery-expo-2027-6ac35022699423f330e879a4" },
  { oldId: "6abb6c789d4e9d06e111d129", to: "/exhibition/ace-reflect-coimbatore-2027-6abb8da09d4e9d06e111e5db" },
  { oldId: "6abb6f7f9d4e9d06e111d2bd", to: "/exhibition/the-architect-interior-expo-2027-coimbatore-6abb984f9d4e9d06e111f074" },
  { oldId: "6abb84889d4e9d06e111e097", to: "/exhibition/16th-strategic-electronics-summit-2027-6abb80dc9d4e9d06e111de97" },
  { oldId: "6abb80dc9d4e9d06e111de99", to: "/exhibition/india-international-hospitality-expo-2027-ihe-2027-6abb8cb79d4e9d06e111e4b3" },
  { oldId: "6abcd13e3b48e63eeaaeaede", to: "/exhibition/17th-international-railway-equipment-exhibition-iree-2027-6abdffcb3b48e63eeaaf1f14" },
];

/**
 * Shape the map into Next.js redirect entries.
 *
 * statusCode: 301 rather than permanent: true, and the difference matters.
 * `permanent: true` emits 308, NOT 301 - 308 additionally forbids changing the
 * method on replay. Google treats the two the same for consolidation, but 301
 * is what the wider tooling estate (log analysers, legacy crawlers, link
 * checkers, SEO audits) recognises without qualification, and it is what this
 * redirect set was specified to return. The two options are mutually exclusive
 * in Next.js, so `permanent` is deliberately absent.
 */
export function duplicateExhibitionRedirects() {
  return DUPLICATE_EXHIBITION_REDIRECTS.map(({ oldId, to }) => ({
    source: `/exhibition/:slug([^/]*-${oldId})`,
    destination: to,
    statusCode: 301,
  }));
}
