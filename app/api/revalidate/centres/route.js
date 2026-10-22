import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { CENTRES_TAG } from "@/lib/public-api";

/**
 * POST /api/revalidate/centres
 *
 * Drops the cached exhibition-centre data - the /exhibition-centres directory,
 * every /exhibition-centres/<slug> page and the sitemap entries built from it -
 * so an admin's add, edit, delete, link or unlink shows on the next visit
 * instead of up to an hour later. Called by the admin Exhibition centres page,
 * the exhibition forms' "Add new venue", and exhibition saves that change a
 * show's centre (which changes that centre's "upcoming" list).
 *
 * Changes no data and reveals none; like /api/revalidate/exhibition it is
 * limited to signed-in browsers so it is not an open cache-busting endpoint.
 */
export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!request.cookies.get("uid")?.value) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  revalidateTag(CENTRES_TAG);
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
