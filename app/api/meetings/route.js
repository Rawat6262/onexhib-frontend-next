import { NextResponse } from "next/server";

/**
 * Bridge to the meeting endpoints, which the browser cannot otherwise reach.
 *
 * WHY THIS EXISTS
 * next.config.mjs proxies /api/:path* to Express, but the meeting routes are
 * mounted at /app/my/:userId and /app/status/:meetingId — outside that
 * namespace. A fetch to /app/my/... from the browser hits Next's own router and
 * 404s. Same situation, and same fix, as app/api/exhibitions/search/route.js.
 *
 * WHAT IT DOES NOT DO
 * It adds no authorisation of its own and grants no access: the caller's own
 * cookie is forwarded unchanged, and Express decides. `getMyMeetings` already
 * refuses to return one user's meetings to another (403), so this cannot be
 * used to read someone else's correspondence by passing a different id.
 *
 * It also does not project the response. The meeting payload contains the
 * recipient's name and email by design — that is the point of the feature, the
 * user is corresponding with them — and it only ever reaches the one user whose
 * cookie authorised the request.
 *
 * Contract: GET /api/meetings?userId=<id>
 */

export const dynamic = "force-dynamic";

const BACKEND_URL = (process.env.BACKEND_URL || "").replace(/\/+$/, "");

export async function GET(request) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId || !/^[a-f0-9]{24}$/i.test(userId)) {
    return NextResponse.json({ success: false, message: "A valid userId is required." }, { status: 400 });
  }
  if (!BACKEND_URL) {
    return NextResponse.json({ success: false, message: "Unavailable." }, { status: 503 });
  }

  const cookie = request.headers.get("cookie") || "";

  try {
    const res = await fetch(`${BACKEND_URL}/app/my/${encodeURIComponent(userId)}`, {
      headers: { cookie, accept: "application/json" },
      cache: "no-store",
    });

    // An empty list arrives as 404 from this controller; the client treats that
    // as "none", so the status is passed through rather than reinterpreted.
    const body = await res.json().catch(() => null);
    return NextResponse.json(body ?? { success: false }, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, message: "Unavailable." }, { status: 502 });
  }
}
