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
  { oldId: "6a97d09c33410d907f7dc6a9", to: "/exhibition/warsaw-dental-medica-show-2026-6a97c83133410d907f7dc675" },
  // Warsaw Medical Expo 2026
  { oldId: "6a97d09c33410d907f7dc6a6", to: "/exhibition/warsaw-medical-expo-2026-6a97c83133410d907f7dc673" },
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
