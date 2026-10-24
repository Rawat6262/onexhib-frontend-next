import { NextResponse } from "next/server";
import {
  getCounts,
  getExhibitionCentres,
  getOngoingExhibitions,
  getPreviousExhibitions,
  getUpcomingExhibitions,
} from "@/lib/public-api";
import { getThisWeekExhibitions } from "@/lib/discovery";
import { getLocationIndex } from "@/lib/locations";
import { getCategoryIndex } from "@/lib/categories";
import { countryLandingPath, categoryLandingPath, exhibitionPath, serviceCategoryPath } from "@/lib/routes";
import { SERVICE_CATEGORIES, serviceCategorySlug } from "@/lib/service-taxonomy";

// The service categories the Directory menu names (the most asked-for ones).
const MENU_SERVICES = ["Stall Design & Fabrication", "Printing & Branding", "Logistics & Freight"];

/**
 * GET /api/nav-summary - the live numbers and "happening next" shows in the
 * header's dropdown menus (components/layout/MegaNav.jsx).
 *
 * The header itself stays static and ships no data: the menu asks for this the
 * first time someone points at it. Every fetcher here is the cached one the
 * home page already uses, and the answer is cached for 10 minutes, so a menu
 * open costs the backend nothing most of the time.
 *
 * Fails soft field by field: a missing number is null and the menu simply
 * leaves that badge off. A wrong number is worse than none.
 */
export const revalidate = 600;

const total = (list) => (list && Number.isFinite(list.total) && list.total > 0 ? list.total : null);

export async function GET() {
  const settle = (p) => p.catch(() => null);
  const [upcoming, ongoing, previous, thisWeek, counts, centres, locations, categories] = await Promise.all([
    settle(getUpcomingExhibitions({ limit: 3 })),
    settle(getOngoingExhibitions({ limit: 1 })),
    settle(getPreviousExhibitions({ limit: 1 })),
    settle(getThisWeekExhibitions()),
    settle(getCounts()),
    settle(getExhibitionCentres()),
    settle(getLocationIndex()),
    settle(getCategoryIndex()),
  ]);

  const next = (upcoming?.items || []).slice(0, 3).map((e) => ({
    id: e.id,
    name: e.name,
    href: exhibitionPath(e.name, e.id),
    startDate: e.startDate,
    place: [e.city, e.country].filter(Boolean).join(", "),
  }));

  // "Popular" chips: the busiest countries and industries that have their own
  // landing page (the indexes only list places and industries above the
  // quality threshold, so every chip is a real page).
  const popular = [
    ...(locations?.countries || [])
      .slice()
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((c) => ({ label: c.country, href: countryLandingPath(c.slug) })),
    ...(categories?.categories || []).slice(0, 2).map((c) => ({ label: c.label, href: categoryLandingPath(c.slug) })),
  ];

  return NextResponse.json({
    upcoming: total(upcoming),
    live: total(ongoing),
    past: total(previous),
    thisWeek: Array.isArray(thisWeek) && thisWeek.length ? thisWeek.length : null,
    countries: locations?.countries?.length || null,
    centres: centres?.total || null,
    companies: counts?.companies ?? null,
    products: counts?.products ?? null,
    serviceCategories: SERVICE_CATEGORIES.length,
    services: MENU_SERVICES.filter((n) => SERVICE_CATEGORIES.includes(n)).map((name) => ({
      label: name,
      href: serviceCategoryPath(serviceCategorySlug(name)),
    })),
    next,
    popular,
  });
}
