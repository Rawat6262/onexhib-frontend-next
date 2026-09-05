import { NextResponse } from "next/server";
import {
  EXHIBITION_SCOPES,
  getExhibitions,
  searchExhibitions,
} from "@/lib/public-api";

/**
 * JSON endpoint behind the public exhibition search box.
 *
 * WHY A ROUTE HANDLER AND NOT A DIRECT CALL
 * Express mounts its router at "/", so the search endpoints live at
 * /upcomingsearch, /ongoingsearch and /previoussearch — outside the /api/*
 * namespace that next.config.mjs proxies. The browser therefore cannot reach
 * them at all. This handler bridges that gap without touching the rewrite.
 *
 * It also does two things a raw proxy could not:
 *   - Caps the response. The *search endpoints have no pagination and no
 *     server-side limit, so they return every matching document in full. That
 *     never reaches a browser through here.
 *   - Projects the fields. Those endpoints return whole Mongo documents,
 *     including the organiser's email in `addedBy`. toPublicExhibition() drops
 *     it, so the search box cannot leak contact data.
 *
 * ROUTE PRECEDENCE
 * Living at /api/exhibitions/search inside the proxied namespace is deliberate
 * and safe. next.config.mjs returns rewrites as a plain array, which Next
 * treats as `afterFiles` — filesystem routes are matched first, so this handler
 * wins for this exact path while every other /api/* request still proxies to
 * Express untouched. Express has no /api/exhibitions/search route of its own
 * (only /monthly, /thisweek and /featured), so nothing is shadowed.
 *
 * Contract: GET /api/exhibitions/search?scope=upcoming&search=textile&limit=12
 */

// Exhibition data changes independently of deploys; never prerender this.
export const dynamic = "force-dynamic";

const DEFAULT_SCOPE = "upcoming";
const MAX_LIMIT = 24;
const MAX_SEARCH_LENGTH = 100;

export async function GET(request) {
  const params = request.nextUrl.searchParams;

  // Unknown scopes fall back rather than erroring — this feeds a search box,
  // and an empty-handed 400 is a worse experience than sensible defaults.
  const requested = params.get("scope");
  const scope = requested && requested in EXHIBITION_SCOPES ? requested : DEFAULT_SCOPE;

  // The backend interpolates `search` straight into a RegExp with no escaping,
  // so a long or pathological pattern is a real cost. Trim hard before sending.
  const search = (params.get("search") || "").trim().slice(0, MAX_SEARCH_LENGTH);

  const parsedLimit = Number(params.get("limit"));
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(MAX_LIMIT, Math.max(1, Math.trunc(parsedLimit)))
    : 12;

  // With no keyword there is nothing to search for, and the paginated listing
  // endpoint answers the same question far more cheaply than the unbounded
  // *search one. `search=` only reaches the backend when it has a value.
  const result = search
    ? await searchExhibitions(scope, search, { limit })
    : await getExhibitions(scope, { page: 1, limit });

  return NextResponse.json(
    { scope, search, total: result.total, items: result.items },
    {
      headers: {
        // A JSON payload carries no meta tag, so the crawl directive has to be
        // a header. robots.txt already disallows /api/, this is belt and braces.
        "X-Robots-Tag": "noindex",
        // Short shared cache; the data layer behind this is ISR-cached too.
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
