import Link from "next/link";
import {
  Armchair,
  Camera,
  ClipboardList,
  Cpu,
  FireExtinguisher,
  Flower2,
  Forklift,
  Gift,
  Hammer,
  HardHat,
  IdCard,
  Languages,
  Laptop,
  Layers,
  Lightbulb,
  Luggage,
  Megaphone,
  Monitor,
  Package,
  Palette,
  Plug,
  Printer,
  Shield,
  Signpost,
  Sparkles,
  SquareStack,
  Tent,
  Trash2,
  Truck,
  Umbrella,
  UserCheck,
  Utensils,
  Warehouse,
  Wifi,
} from "lucide-react";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";
import { breadcrumbNode, graph } from "@/lib/jsonld";
import { serviceCategoryPath } from "@/lib/routes";
import { getServiceDirectory } from "@/lib/services";
import { GENERAL_SUBCATEGORY, serviceSubcategories } from "@/lib/service-taxonomy";

/**
 * Exhibition services: /exhibition-services
 *
 * The path is NOT /services — that belongs to the authenticated service-provider
 * area. "exhibition-services" is also the better URL for search: it matches the
 * query people actually type.
 *
 * WHY THIS PAGE IS A HUB AND NOT A LISTING
 * It used to render every provider on the platform inline — 498 names and towns
 * under seven headings, in one unbroken run. That made the single most common
 * task on the page (find a print shop near a show) a scroll past 370 providers
 * of unrelated services, with nothing to narrow by. The providers now live on a
 * page each, under /exhibition-services/[category], where there is a small
 * enough set for filters to be worth having.
 *
 * So this page is the doorway: the 35 categories the platform supports, taken from
 * the taxonomy the backend's service_name enum is also derived from
 * (lib/service-taxonomy.js, and data/taxonomy/SERVICE-TAXONOMY.json on the API side)
 * — the one fixed, trustworthy taxonomy on the platform — each with its real
 * provider count and a link through.
 *
 * Nothing here is fabricated: every count is the length of the list the linked
 * page renders, so a visitor can check it by following the link. A category nobody
 * has listed under yet shows no count and is not a link.
 *
 * ORDERED BY INVENTORY, NOT BY THE TAXONOMY. At seven categories the fixed order was
 * fine because all seven had providers. With 35 — 29 of which start empty — taxonomy
 * order would scatter the six categories a visitor can actually use among two dozen
 * dead cards. So the ones with providers come first, most first, and the rest follow
 * alphabetically as a statement of what the platform covers. Both groups are visible
 * on one page; only the order changes.
 *
 * SEO value: these categories are the highest-confidence long-tail on the site
 * precisely because the taxonomy is fixed — "exhibition stall fabrication",
 * "furniture rental for exhibitions", "LED screen rental for trade shows" and so
 * on each map to a real, permanent page with real inventory behind it.
 */

export const revalidate = 300;

const TITLE = "Exhibition services — stall fabrication, printing, staffing, logistics";
const DESCRIPTION =
  "The services exhibitors need before a trade show: stall design and fabrication, furniture and AV rental, printing and branding, protocol staff, logistics, catering and more.";

/**
 * Descriptions of what each service category covers. These describe the
 * category itself, not any particular provider, so they make no claim about
 * inventory. Keys must match SERVICE_CATEGORIES exactly.
 */
const CATEGORY_DETAIL = {
  "Stall Design & Fabrication": {
    icon: Hammer,
    body: "Custom, modular and octanorm stall design and build — structure, flooring and installation on site.",
  },
  "Furniture Rental": {
    icon: Armchair,
    body: "Chairs, tables, counters, display units and lounge seating hired for the duration of an exhibition.",
  },
  "Audio Visual Services": {
    icon: Monitor,
    body: "LED walls, screens, projectors and sound systems rented for demonstrations and stand branding.",
  },
  "Lighting Services": {
    icon: Lightbulb,
    body: "Stall, stage and truss lighting designed and rigged for the run of a show.",
  },
  "Printing & Branding": {
    icon: Printer,
    body: "Flex, vinyl and fabric printing for banners, backdrops, signage and stall graphics.",
  },
  "Graphic & Creative Design": {
    icon: Palette,
    body: "Stand concepts, 3D visuals, branding and presentation design prepared before the build.",
  },
  "Protocol & Event Staff": {
    icon: UserCheck,
    body: "Hosts, anchors, promoters and registration staff to greet visitors and run a stand during show hours.",
  },
  "Photography & Videography": {
    icon: Camera,
    body: "Stall and event photography, corporate video, live streaming and social edits from the floor.",
  },
  "Event Management": {
    icon: ClipboardList,
    body: "End-to-end exhibition management — vendor coordination, on-site supervision and show calling.",
  },
  "Logistics & Freight": {
    icon: Truck,
    body: "Exhibition cargo moved in and out, domestic or international, with customs clearance.",
  },
  "Material Handling": {
    icon: Forklift,
    body: "Forklifts, cranes and crews for loading, unloading and moving heavy equipment on site.",
  },
  "Catering & Hospitality": {
    icon: Utensils,
    body: "Tea, coffee, snacks and corporate catering for a stand, plus pantry and VIP hospitality staff.",
  },
  "Security Services": {
    icon: Shield,
    body: "Guards, access control, CCTV monitoring and crowd management for a stand or a venue.",
  },
  "Housekeeping & Cleaning": {
    icon: Sparkles,
    body: "Stall and venue cleaning, waste removal and housekeeping staff through the show days.",
  },
  "Corporate Gifting & Merchandise": {
    icon: Gift,
    body: "Branded merchandise and giveaways prepared for visitors and prospects at an exhibition.",
  },
  /*
   * ONE CARD, from what used to be "Flower & Decoration" and "Floral & Green
   * Decor". The body covers both halves deliberately: a visitor who came for plant
   * rental has to recognise this card as theirs, now that it is the only one.
   */
  "Flower & Plant Decoration": {
    icon: Flower2,
    body: "Floral decor, entrance and stage decoration, themed dressing, and plant rental or green walls for a stand.",
  },
  "Stage, Truss & Rigging": {
    icon: Layers,
    body: "Stages, truss structures, backdrops, podiums and hanging rigs built to a stand's drawings.",
  },
  "Power & Electrical Services": {
    icon: Plug,
    body: "Generators, UPS, cabling and temporary power distribution for a stand or a hall.",
  },
  "Internet & Networking": {
    icon: Wifi,
    body: "Temporary Wi-Fi, dedicated lines, routers and on-stand network setup for the show period.",
  },
  "Technology & Interactive Solutions": {
    icon: Cpu,
    body: "AR and VR experiences, touchscreen kiosks, interactive displays and lead-capture systems.",
  },
  "Registration & Badge Solutions": {
    icon: IdCard,
    body: "Visitor registration, badge and RFID printing, QR entry and access management at the door.",
  },
  "Tent & Temporary Structures": {
    icon: Tent,
    body: "German hangers, pagoda tents, canopies and outdoor pavilions erected for an event.",
  },
  "Rental Equipment": {
    icon: Laptop,
    body: "Laptops, tablets, refrigerators, coffee machines and water dispensers hired by the day.",
  },
  "Marketing & Promotion": {
    icon: Megaphone,
    body: "Pre-show and on-show promotion — social, email, PR, influencers and lead generation.",
  },
  "Travel & Accommodation": {
    icon: Luggage,
    body: "Hotels, flights, airport transfers, local transport and visa assistance for a travelling team.",
  },
  "Signage & Display Systems": {
    icon: Signpost,
    body: "Directional signage, standees, pop-up displays and digital signage for a stand and its approach.",
  },
  "Flooring & Carpet": {
    icon: SquareStack,
    body: "Exhibition carpet, wooden, vinyl and raised flooring laid and lifted around the show dates.",
  },
  "Display & Product Fixtures": {
    icon: Package,
    body: "Shelves, racks, glass display units, podiums and counters to present products on a stand.",
  },
  "Manpower & Labour": {
    icon: HardHat,
    body: "General and skilled labour — carpenters, electricians, packers and loading crews.",
  },
  "Fire & Safety Services": {
    icon: FireExtinguisher,
    body: "Extinguishers, fire marshals, safety equipment and compliance support for a venue's rules.",
  },
  "Storage & Warehousing": {
    icon: Warehouse,
    body: "Temporary storage before, during and after a show, near the venue or at an exhibition warehouse.",
  },
  "Interpretation & Translation": {
    icon: Languages,
    body: "Interpreters, translators and multilingual hosts for international visitors and negotiations.",
  },
  "Waste Management": {
    icon: Trash2,
    body: "Garbage collection, recycling and exhibition waste removal, including sustainable disposal.",
  },
  "Exhibition Insurance": {
    icon: Umbrella,
    body: "Stall, equipment and public liability cover arranged for the duration of an exhibition.",
  },
};

/**
 * INDEXABLE. This reverses the noindex that used to sit here, following the
 * instruction the previous note left behind: it was noindexed because
 * /api/getexhibitionservice returned zero records, which made this "category
 * explainers and nothing else — the thinnest indexable URL on the site".
 *
 * That condition no longer holds. The endpoint returns ~500 providers, every
 * category holding any has its own page, and this page is the hub that links them. The old note's own reversal
 * instructions were: flip the listings on, swap NOINDEX_FOLLOW back to
 * publicPageMetadata, and restore the sitemap entry. All three are done.
 *
 * TO REVERSE AGAIN, if the inventory ever disappears: swap this back to
 * pageMetadata with NOINDEX_FOLLOW and drop the services block from
 * app/sitemap.js, so the sitemap and the robots directive keep agreeing.
 */
export const metadata = publicPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PUBLIC_ROUTES.services,
});

export default async function ExhibitionServicesPage() {
  const { categories, total } = await getServiceDirectory();

  /*
   * Categories with providers first, most first; everything else alphabetically.
   *
   * See the note at the top of the file: taxonomy order would bury the handful of
   * usable categories among the two dozen that are still empty. Sorted on a COPY,
   * because `categories` is the shared, cached directory object - sorting it in
   * place would reorder it for every other page reading the same memoised result.
   */
  const ordered = [...categories].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name)
  );

  const trail = [
    { name: "Home", path: "/" },
    { name: "Exhibition services", path: PUBLIC_ROUTES.services },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd graph={graph(breadcrumbNode(trail))} />

      <Breadcrumbs trail={trail} />

      <header className="max-w-3xl">
        <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-[2.6rem] dark:text-white">
          Exhibition services
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          Preparing for an exhibition takes more than a stand.{" "}
          {total ? (
            <>
              OneXhib lists{" "}
              <strong className="font-semibold text-gray-900 dark:text-gray-100">
                {total} service providers
              </strong>{" "}
              across {categories.length} service categories, so exhibitors can find the support they
              need for a show — and providers can be found by the exhibitors already planning one.
            </>
          ) : (
            <>
              OneXhib lists providers across {categories.length} service categories, so exhibitors
              can find the support they need for a show — and providers can be found by the exhibitors already
              planning one.
            </>
          )}
        </p>
      </header>

      <section aria-labelledby="categories-heading" className="mt-10">
        <h2 id="categories-heading" className="sr-only">
          Service categories
        </h2>
        <ul className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((category) => {
            const detail = CATEGORY_DETAIL[category.name];
            const Icon = detail?.icon;
            const specialities = subcategoryPreview(category.name);

            /*
             * A category with no providers is NOT a link. Its page 404s by
             * design (see getServiceCategory), so linking it would put a
             * guaranteed dead end on the busiest page in this tier. It still
             * appears, because the categories describe what the platform
             * supports whether or not anyone has listed under one yet.
             */
            const card = (
              <>
                {Icon ? (
                  <span className="inline-flex rounded-xl bg-[#131C55]/10 p-2.5 text-[#131C55] dark:bg-blue-400/10 dark:text-blue-300">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                ) : null}
                <h3 className="mt-3.5 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-50">
                  {category.name}
                  {category.count ? (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      {category.count}
                    </span>
                  ) : null}
                </h3>
                {detail?.body ? (
                  <p className="mt-1.5 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
                    {detail.body}
                  </p>
                ) : null}

                {/*
                  THE SUBCATEGORIES THIS CATEGORY COVERS, from the taxonomy rather
                  than from the data.

                  WHY THE TAXONOMY AND NOT THE PROVIDER COUNTS. On a category that
                  has providers, the counted facet would be the more honest number -
                  but 28 of these 34 cards have no providers at all, and those are
                  precisely the cards where a visitor (and a provider deciding where
                  to list) most needs to know what the category is FOR. "Tent &
                  Temporary Structures" means little; "German Hanger, Pagoda Tent,
                  Canopy..." is unambiguous. So every card answers the same question
                  the same way.

                  It is also the most specific crawlable text on this page: these are
                  the words people actually search ("pagoda tent rental", "octanorm
                  stall"), and the hub is the page that ranks for the category terms.

                  Truncated at six with a count of the rest, so a ten-subcategory
                  card does not become a wall of text next to a four.
                */}
                {specialities.shown.length ? (
                  <p className="mt-2.5 text-[13px] leading-relaxed text-gray-500 dark:text-gray-500">
                    {specialities.shown.join(" · ")}
                    {specialities.rest > 0 ? (
                      <span className="text-gray-400 dark:text-gray-600">
                        {" "}
                        +{specialities.rest} more
                      </span>
                    ) : null}
                  </p>
                ) : null}

                {category.count ? (
                  <p className="mt-3 text-sm font-semibold text-[#131C55] dark:text-blue-300">
                    View {category.count} {category.count === 1 ? "provider" : "providers"} →
                  </p>
                ) : null}
              </>
            );

            return (
              <li key={category.name}>
                {category.count ? (
                  <Link
                    href={serviceCategoryPath(category.slug)}
                    className="ox-card flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-[#131C55]/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-600"
                  >
                    {card}
                  </Link>
                ) : (
                  <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                    {card}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Connects the services tier to the exhibitions tier, which is the
          relationship a visitor here actually has: they are preparing for a
          specific show. */}
      <section aria-labelledby="planning-heading" className="mt-14">
        <h2
          id="planning-heading"
          className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white"
        >
          Preparing for a specific exhibition?
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          Most of these services are booked against one show and one stand. Find the exhibition
          first — each listing carries its dates, venue and the companies already taking part.
        </p>
        <ul className="mt-5 flex list-none flex-wrap gap-2.5">
          <li>
            <Link href={PUBLIC_ROUTES.exhibitions} className={planningLink}>
              Upcoming exhibitions worldwide
            </Link>
          </li>
          <li>
            <Link href={PUBLIC_ROUTES.locations} className={planningLink}>
              Exhibitions by city and country
            </Link>
          </li>
          <li>
            <Link href={PUBLIC_ROUTES.categories} className={planningLink}>
              Exhibitions by industry
            </Link>
          </li>
        </ul>
      </section>

      <section className="mt-14 overflow-hidden rounded-3xl bg-gradient-to-br from-[#131C55] to-[#0E1B6B] px-6 py-12 sm:px-10">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Offer services to exhibitors?
        </h2>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-blue-100/90">
          Create an account and list the services you provide and the locations you cover, so
          exhibitors preparing for a show can find you.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-[15px] font-semibold text-[#131C55] transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
          >
            List your services
          </Link>
          <Link
            href={PUBLIC_ROUTES.exhibitions}
            className="inline-flex items-center justify-center rounded-xl border border-white/30 px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
          >
            Browse exhibitions
          </Link>
        </div>
      </section>
    </div>
  );
}

const planningLink =
  "ox-card inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 hover:border-[#131C55]/40 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-600";

/** How many subcategories a card names before it summarises the rest. */
const SUBCATEGORY_PREVIEW = 6;

/**
 * The first few subcategories of a category, plus how many were not shown.
 *
 * Reads the TAXONOMY, so a category with no providers still describes itself - see
 * the note at the call site. Order is the taxonomy's, which is meaningful (bespoke
 * to standard), not alphabetical and not by count.
 */
function subcategoryPreview(categoryName) {
  /*
   * "General" is filtered out. It is a real, selectable subcategory - the neutral
   * one every category carries - but this line exists to tell a visitor what the
   * category COVERS, and "General" covers nothing. Listing it first on all 34 cards
   * would push a genuinely informative name off the end of every one of them.
   */
  const all = serviceSubcategories(categoryName).filter((s) => s !== GENERAL_SUBCATEGORY);
  return {
    shown: all.slice(0, SUBCATEGORY_PREVIEW),
    rest: Math.max(0, all.length - SUBCATEGORY_PREVIEW),
  };
}
