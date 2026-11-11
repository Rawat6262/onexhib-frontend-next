import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { HOTELS_TAG } from "@/lib/public-api";

/**
 * POST /api/revalidate/hotels
 *
 * Drops the cached hotel data - every /hotels/<slug> page and the "Stay
 * nearby" lists on exhibition and centre pages - so an admin's approval, or an
 * owner's edit to a live hotel, shows on the next visit instead of after the
 * cache expires. Called by the hotel dashboard and the admin Hotels page.
 *
 * Changes no data and reveals none; like the other revalidate routes it is
 * limited to signed-in browsers so it is not an open cache-busting endpoint.
 */
export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!request.cookies.get("uid")?.value) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  revalidateTag(HOTELS_TAG);
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
