import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { FEATURED_SERVICES_TAG } from "@/lib/public-api";

/**
 * POST /api/revalidate/featured-services
 *
 * Drops the cached featured-services list - the "Featured services" section on
 * the home page - so an admin featuring or unfeaturing a listing on the admin
 * Services page sees it on the next visit instead of after the cache expires.
 *
 * Changes no data and reveals none; like the other revalidate routes it is
 * limited to signed-in browsers so it is not an open cache-busting endpoint.
 */
export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!request.cookies.get("uid")?.value) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  revalidateTag(FEATURED_SERVICES_TAG);
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
