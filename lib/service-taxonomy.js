/**
 * The service taxonomy: 35 categories, their frozen URL slugs, and the
 * subcategories under each.
 *
 * WHY THIS FILE IS SEPARATE FROM lib/services.js
 * That module reads the server-only data layer, which throws if it reaches the
 * browser. This one is pure data and pure string helpers, so the add/edit forms,
 * the dashboard and ServiceDirectory - all Client Components - can import the
 * taxonomy without dragging lib/public-api.js into the bundle. Same reason
 * lib/service-alphabet.js exists.
 *
 * WHY THE SLUGS ARE WRITTEN OUT, AND WHY SIX OF THEM LOOK WRONG
 *
 * Deriving a slug from a label would silently move a live URL the moment somebody
 * improved the wording of a category - and this change renamed six of the seven
 * original categories at once. Those six have indexed URLs with accumulated ranking
 * signal, so the slug stays frozen at whatever the URL already is and the LABEL is
 * free to improve:
 *
 *   /exhibition-services/fabrication      -> "Stall Design & Fabrication"
 *   /exhibition-services/printing         -> "Printing & Branding"
 *   /exhibition-services/led-tv-rental    -> "Audio Visual Services"
 *   /exhibition-services/protocol-staff   -> "Protocol & Event Staff"
 *   /exhibition-services/corporate-gifting-> "Corporate Gifting & Merchandise"
 *   /exhibition-services/furniture-rental -> "Furniture Rental"   (unchanged)
 *
 * `led-tv-rental` titled "Audio Visual Services" is the one that reads oddest, and
 * it is kept on purpose: "LED screen rental for trade shows" is the highest-value
 * query in this whole tier and that URL is what ranks for it. This is the same
 * lesson as lib/categories.js, where deriving slugs from improved labels would have
 * moved ten indexed pages (/exhibitions-for/health still serves "Healthcare &
 * Medical"). `existing: true` marks exactly the six, so nobody later "tidies" a slug
 * to match its label.
 *
 * THE SEVENTH OLD CATEGORY, "Catalog Printing", HAS NO SLUG HERE. It was folded into
 * Printing & Branding as a subcategory, so its URL is the only one in this tier that
 * dies - and it 301s to /exhibition-services/printing from next.config.mjs rather
 * than 404ing.
 *
 * THIS LIST IS DUPLICATED IN THE BACKEND, deliberately, exactly as the industry
 * taxonomy is. data/taxonomy/SERVICE-TAXONOMY.json owns category names, subcategory
 * membership and the legacy translations; this file owns slugs and display order.
 * Adding a category means editing both - there is no cross-repository check, because
 * the two deploy separately. See SERVICE-TAXONOMY.md there.
 */

/**
 * The neutral subcategory every category carries, and the ONE value allowed to
 * appear under more than one category.
 *
 * MUST MATCH GENERAL_SUBCATEGORY in the backend's Service/serviceTaxonomy.js, which
 * documents why it exists: the field is required, and 871 of the 1,003 listings that
 * existed when it became required had no speciality that could be honestly derived
 * (13% of business names gave any hint, 0 of 186 for Furniture Rental). "General"
 * means "no narrower speciality claimed", which is true of them, where a guess would
 * not be.
 *
 * It is excluded from the subcategory list on the hub cards: those exist to say what
 * a category COVERS, and "General" describes nothing.
 */
export const GENERAL_SUBCATEGORY = "General";

/**
 * The taxonomy, in display order.
 *
 * ORDER IS THE BACKEND'S ORDER, which groups related trades together (stall build,
 * then furniture, then AV, then lighting...). The hub re-sorts by inventory before
 * rendering, so this order only decides ties - but keeping the two files in the same
 * order makes them diffable against each other by eye.
 */
const CATEGORIES = [
  {
    name: "Stall Design & Fabrication",
    slug: "fabrication",
    existing: true,
    subcategories: [
      "General",
      "Custom Stall Design", "Modular Stall", "Octanorm Stall", "Wooden Stall",
      "Double-Decker Stall", "Pavilion Design", "Country/State Pavilion",
    ],
  },
  {
    name: "Furniture Rental",
    slug: "furniture-rental",
    existing: true,
    subcategories: [
      "General",
      "Chairs", "Tables", "Sofas", "Bar Stools", "Meeting Furniture",
      "Reception Counters", "Display Units",
    ],
  },
  {
    name: "Audio Visual Services",
    slug: "led-tv-rental",
    existing: true,
    /* "Interactive Screens" was removed: it named the same thing as
       "Interactive Displays" under Technology & Interactive Solutions. This
       category is screen RENTAL; that one owns interactivity. */
    subcategories: [
      "General",
      "LED Wall", "TV Rental", "Projector", "Video Wall", "Sound System",
      "Microphones",
    ],
  },
  {
    name: "Lighting Services",
    slug: "lighting-services",
    subcategories: [
      "General",
      "Exhibition Lighting", "Spotlights", "Decorative Lighting", "Stage Lighting",
      "Truss Lighting",
    ],
  },
  {
    name: "Printing & Branding",
    slug: "printing",
    existing: true,
    /* "Signage" became "Signage Printing": bare "Signage" named the same thing
       as the Signage & Display Systems CATEGORY. A print shop printing a
       signboard is real, so this is a rename rather than a removal.
       "Catalog Printing" is a retained legacy value - see LEGACY_SERVICE_CATEGORIES. */
    subcategories: [
      "General",
      "Flex Printing", "Vinyl Printing", "Fabric Printing", "Backlit Graphics",
      "Banners", "Signage Printing", "Foam Board Printing", "Catalog Printing",
    ],
  },
  {
    name: "Graphic & Creative Design",
    slug: "graphic-creative-design",
    subcategories: [
      "General",
      "Graphic Design", "3D Stall Design", "Branding Design", "Motion Graphics",
      "Presentation Design",
    ],
  },
  {
    name: "Protocol & Event Staff",
    slug: "protocol-staff",
    existing: true,
    /*
     * CUSTOMER-FACING STAFF ONLY, which is what this category's existing 27
     * providers actually are.
     *
     * "Security Staff" and "Labour / Helpers" were removed because each named a
     * CATEGORY - Security Services and Manpower & Labour. A guard agency is a
     * licensed trade (PSARA) and a different business from an event-staffing
     * agency; an exhibitor looking for guards looks at Security Services. An
     * agency doing both files two listings, which the platform already supports
     * (see getServiceSiblings in lib/services.js).
     */
    subcategories: [
      "General",
      "Anchor / Emcee", "Hostess / Host", "Registration Staff", "Ushers",
      "Brand Promoters",
    ],
  },
  {
    name: "Photography & Videography",
    slug: "photography-videography",
    subcategories: [
      "General",
      "Event Photography", "Stall Photography", "Corporate Video",
      "Reels / Social Video", "Live Streaming", "Drone Video",
    ],
  },
  {
    name: "Event Management",
    slug: "event-management",
    subcategories: [
      "General",
      "Exhibition Management", "Vendor Coordination", "On-Site Management",
      "Stage Management", "Show Calling",
    ],
  },
  {
    name: "Logistics & Freight",
    slug: "logistics-freight",
    /*
     * "Warehousing" was removed - it named the Storage & Warehousing CATEGORY.
     * Both categories are kept, because moving goods and holding goods are
     * different buying decisions and a local storage firm is not a freight
     * forwarder; only the duplicate subcategory went.
     *
     * "Local Transport" became "Local Cargo Transport" to distinguish it from the
     * identically-named subcategory under Travel & Accommodation, which is about
     * moving PEOPLE. Two chips reading "Local Transport" on different pages gave a
     * visitor no way to tell which was which.
     */
    subcategories: [
      "General",
      "Exhibition Cargo", "Domestic Freight", "International Freight",
      "Customs Clearance", "Local Cargo Transport",
    ],
  },
  {
    name: "Material Handling",
    slug: "material-handling",
    subcategories: [
      "General",
      "Forklift Rental", "Crane Rental", "Loading / Unloading", "Pallet Handling",
      "Heavy Equipment Movement",
    ],
  },
  {
    name: "Catering & Hospitality",
    slug: "catering-hospitality",
    subcategories: [
      "General",
      "Tea / Coffee Service", "Snacks", "Corporate Catering", "VIP Hospitality",
      "Pantry Staff", "Water Supply",
    ],
  },
  {
    name: "Security Services",
    slug: "security-services",
    subcategories: [
      "General",
      "Security Guards", "Bouncers", "CCTV Monitoring", "Access Control",
      "Crowd Management",
    ],
  },
  {
    name: "Housekeeping & Cleaning",
    slug: "housekeeping-cleaning",
    /* "Waste Disposal" was removed - the Waste Management category owns it. */
    subcategories: [
      "General",
      "Stall Cleaning", "Venue Cleaning", "Housekeeping Staff",
    ],
  },
  {
    name: "Corporate Gifting & Merchandise",
    slug: "corporate-gifting",
    existing: true,
    subcategories: [
      "General",
      "Customized Gifts", "Bags", "Bottles", "Pens", "T-Shirts", "Caps",
      "Promotional Merchandise",
    ],
  },
  {
    /*
     * MERGED, from "Flower & Decoration" and "Floral & Green Decor".
     *
     * Those were two cards describing one trade: a stand decorator does flowers
     * AND planters. Side by side on the hub they made a provider guess which to
     * list under, and a wrong guess splits the pool across two pages that are each
     * then incomplete.
     *
     * The merge is only safe because of the subcategory layer: a plantscaping firm
     * that never touches flowers is still expressible, precisely, as "Plant Rental"
     * and "Green Wall". The distinction moved from the category to the filter,
     * where it costs no page and no guess. "Plants" was dropped as redundant with
     * Indoor Plants and Outdoor Plants.
     *
     * No redirect was needed: both categories had zero providers, and an empty
     * category has no page (see getServiceCategory), so there was no URL to lose.
     */
    name: "Flower & Plant Decoration",
    slug: "flower-decoration",
    subcategories: [
      "General",
      "Fresh Flower Decor", "Artificial Flower Decor", "Stage Decor",
      "Entrance Decor", "Theme Decoration", "Indoor Plants", "Outdoor Plants",
      "Plant Rental", "Decorative Greenery", "Green Wall",
    ],
  },
  {
    name: "Stage, Truss & Rigging",
    slug: "stage-truss-rigging",
    subcategories: [
      "General",
      "Stage Setup", "Truss Structure", "Rigging", "Backdrop", "Podium",
      "Hanging Structures",
    ],
  },
  {
    name: "Power & Electrical Services",
    slug: "power-electrical",
    subcategories: [
      "General",
      "Generator Rental", "UPS", "Electrical Cabling", "Power Distribution",
      "Temporary Electrical Setup",
    ],
  },
  {
    name: "Internet & Networking",
    slug: "internet-networking",
    subcategories: [
      "General",
      "Wi-Fi Rental", "Dedicated Internet", "Routers", "Networking Setup",
      "Temporary Broadband",
    ],
  },
  {
    name: "Technology & Interactive Solutions",
    slug: "technology-interactive",
    subcategories: [
      "General",
      "AR / VR", "Touchscreen Kiosks", "Interactive Displays", "QR Engagement",
      "Lead Capture Systems",
    ],
  },
  {
    name: "Registration & Badge Solutions",
    slug: "registration-badge-solutions",
    subcategories: [
      "General",
      "Visitor Registration", "Badge Printing", "RFID Badges", "QR Entry",
      "Access Management",
    ],
  },
  {
    name: "Tent & Temporary Structures",
    slug: "tent-temporary-structures",
    subcategories: [
      "General",
      "German Hanger", "Pagoda Tent", "Canopy", "Exhibition Tent", "Outdoor Pavilion",
    ],
  },
  {
    name: "Rental Equipment",
    slug: "rental-equipment",
    subcategories: [
      "General",
      "Laptop Rental", "Tablet Rental", "Refrigerator Rental", "Coffee Machine Rental",
      "Water Dispenser Rental",
    ],
  },
  {
    name: "Marketing & Promotion",
    slug: "marketing-promotion",
    subcategories: [
      "General",
      "Social Media Marketing", "Email Marketing", "PR", "Influencer Marketing",
      "Exhibition Promotion", "Lead Generation",
    ],
  },
  {
    name: "Travel & Accommodation",
    slug: "travel-accommodation",
    subcategories: [
      "General",
      "Hotel Booking", "Flight Booking", "Airport Transfer", "Local Transport",
      "Visa Assistance",
    ],
  },
  {
    name: "Signage & Display Systems",
    slug: "signage-display-systems",
    subcategories: [
      "General",
      "Directional Signage", "Roll-Up Standee", "Pop-Up Display", "Display Stand",
      "Digital Signage",
    ],
  },
  {
    name: "Flooring & Carpet",
    slug: "flooring-carpet",
    subcategories: [
      "General",
      "Exhibition Carpet", "Wooden Flooring", "Vinyl Flooring", "Raised Flooring",
      "Artificial Grass",
    ],
  },
  {
    name: "Display & Product Fixtures",
    slug: "display-product-fixtures",
    subcategories: [
      "General",
      "Product Shelves", "Display Racks", "Glass Display Units", "Podiums",
      "Product Counters",
    ],
  },
  {
    name: "Manpower & Labour",
    slug: "manpower-labour",
    subcategories: [
      "General",
      "General Labour", "Skilled Labour", "Carpenters", "Electricians", "Packers",
      "Loading Staff",
    ],
  },
  {
    name: "Fire & Safety Services",
    slug: "fire-safety-services",
    subcategories: [
      "General",
      "Fire Extinguishers", "Fire Marshal", "Safety Equipment", "Emergency Signage",
      "Safety Compliance",
    ],
  },
  {
    name: "Storage & Warehousing",
    slug: "storage-warehousing",
    subcategories: [
      "General",
      "Temporary Storage", "Exhibition Warehouse", "Pre-Event Storage",
      "Post-Event Storage",
    ],
  },
  {
    name: "Interpretation & Translation",
    slug: "interpretation-translation",
    subcategories: [
      "General",
      "Translators", "Interpreters", "Multilingual Hosts", "Business Interpretation",
    ],
  },
  {
    name: "Waste Management",
    slug: "waste-management",
    subcategories: [
      "General",
      "Garbage Collection", "Recycling", "Exhibition Waste Removal",
      "Sustainable Disposal",
    ],
  },
  {
    name: "Exhibition Insurance",
    slug: "exhibition-insurance",
    subcategories: [
      "General",
      "Stall Insurance", "Equipment Insurance", "Public Liability Support",
      "Event Insurance Assistance",
    ],
  },
];

/** The taxonomy, frozen. */
export const SERVICE_TAXONOMY = Object.freeze(
  CATEGORIES.map((c) =>
    Object.freeze({ ...c, existing: Boolean(c.existing), subcategories: Object.freeze([...c.subcategories]) })
  )
);

/** The 35 category names, in display order. Mirrors the backend's enum. */
export const SERVICE_CATEGORIES = Object.freeze(SERVICE_TAXONOMY.map((c) => c.name));

/** Category label -> frozen URL slug. */
export const SERVICE_CATEGORY_SLUGS = Object.freeze(
  SERVICE_TAXONOMY.reduce((acc, c) => {
    acc[c.name] = c.slug;
    return acc;
  }, {})
);

/** Category label -> its subcategories. */
export const SERVICE_SUBCATEGORIES = Object.freeze(
  SERVICE_TAXONOMY.reduce((acc, c) => {
    acc[c.name] = c.subcategories;
    return acc;
  }, {})
);

/**
 * The seven pre-migration category names -> where each one now belongs.
 *
 * MUST MATCH the `legacy` block of data/taxonomy/SERVICE-TAXONOMY.json. It is here
 * for one reason: a listing read from the API before the migration has run - or from
 * a cached response afterwards - still carries an old name, and the public directory
 * groups on an exact string match. Without this, those providers would vanish from
 * every category page until the migration finished, which is a window of broken
 * pages in exchange for nothing.
 *
 * Once the migration is verified clean this map stops matching anything, and it can
 * go the way of the ALIASES block in lib/categories.js - kept until the data proves
 * it is dead weight, not before.
 */
export const LEGACY_SERVICE_CATEGORIES = Object.freeze({
  Printing: Object.freeze({ category: "Printing & Branding", subcategory: null }),
  "Catalog Printing": Object.freeze({
    category: "Printing & Branding",
    subcategory: "Catalog Printing",
  }),
  "Furniture Rental": Object.freeze({ category: "Furniture Rental", subcategory: null }),
  "LED / TV Rental": Object.freeze({ category: "Audio Visual Services", subcategory: null }),
  Fabrication: Object.freeze({ category: "Stall Design & Fabrication", subcategory: null }),
  "Protocol Staff": Object.freeze({ category: "Protocol & Event Staff", subcategory: null }),
  "Corporate Gifting": Object.freeze({
    category: "Corporate Gifting & Merchandise",
    subcategory: null,
  }),
});

/**
 * Retired category slugs -> the slug that replaced them.
 *
 * Only ONE entry, and that is the point of having frozen the other six slugs:
 * /exhibition-services/catalog-printing is the single URL this taxonomy change
 * removes. next.config.mjs turns this into a 301 so the page keeps its ranking
 * instead of 404ing.
 */
export const RETIRED_CATEGORY_SLUGS = Object.freeze({
  "catalog-printing": "printing",
});

/** "Printing & Branding" -> "printing". Null for anything not in the taxonomy. */
export function serviceCategorySlug(name) {
  return SERVICE_CATEGORY_SLUGS[name] || null;
}

/** The subcategories under one category, or [] for an unknown one. */
export function serviceSubcategories(category) {
  return SERVICE_SUBCATEGORIES[category] || [];
}

/**
 * Resolve whatever a record carries into { category, subcategory }, or null.
 *
 * Accepts a canonical category or one of the seven legacy names, which it maps
 * forward - the same translation canonicalise() applies on the backend, for the same
 * reason.
 *
 * THE SUBCATEGORY FALLS BACK TO "General" rather than to null, matching the
 * backend's required field. Two cases land here and both should read the same way on
 * the page: a row written before the field existed (no value at all), and a row
 * whose owner has not narrowed it (stored as "General"). Both mean "no narrower
 * speciality claimed", so both render as General.
 *
 * A subcategory that does not belong to the resolved category is DROPPED to the
 * neutral value rather than rejected: this runs on READ, where the alternative to
 * tolerating a bad pair is hiding the provider from the directory entirely.
 */
export function canonicalServiceCategory(name, subcategory = null) {
  const raw = String(name || "").trim();
  if (!raw) return null;

  const legacy = LEGACY_SERVICE_CATEGORIES[raw];
  const category = legacy ? legacy.category : raw;
  if (!SERVICE_CATEGORY_SLUGS[category]) return null;

  const requested = String(subcategory || "").trim();
  const candidate = requested || (legacy ? legacy.subcategory : null) || GENERAL_SUBCATEGORY;
  const valid = serviceSubcategories(category).includes(candidate);

  return { category, subcategory: valid ? candidate : GENERAL_SUBCATEGORY };
}
