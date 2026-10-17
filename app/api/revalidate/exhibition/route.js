import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { FEATURED_TAG, exhibitionTag } from "@/lib/public-api";

/**
 * POST /api/revalidate/exhibition  { id, featured? }
 *
 * `featured: true` also drops the cached featured list (the home page slider),
 * sent by the admin Featured page when a show is featured or unfeatured.
 *
 * Drops the cached detail data for one exhibition - and with it the cached
 * /exhibition/[slug] page built from that data - so a change shows on the next
 * visit instead of after the 5-minute revalidate window. Called by the add and
 * edit exhibition popups (including logo uploads and removals) and by the
 * exhibitor workspace when a company lists or unlists itself at a show.
 *
 * It changes no data and reveals none: the worst a caller can do is make the
 * next visit to one exhibition re-fetch it. Still, it is limited to signed-in
 * browsers (the httpOnly uid cookie must be present) and to a well-formed id, so
 * it cannot be used as an open cache-busting endpoint.
 */

export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!request.cookies.get("uid")?.value) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let id = "";
  let featured = false;
  try {
    ({ id = "", featured = false } = await request.json());
  } catch {
    /* fall through to the validation below */
  }
  if (typeof id !== "string" || !/^[a-f0-9]{24}$/i.test(id)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  revalidateTag(exhibitionTag(id));
  if (featured === true) revalidateTag(FEATURED_TAG);
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
