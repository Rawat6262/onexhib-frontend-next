import LoginForm from "./login-form";
import { NOINDEX_FOLLOW, pageMetadata } from "@/lib/seo";
import { getCounts, getUpcomingExhibitions } from "@/lib/public-api";
import { safeNextPath } from "@/lib/auth";

// Through pageMetadata() so the page gets a self-referencing canonical.
// noindex without a canonical leaves Search Console reporting the URL as
// "duplicate, Google chose a different canonical" — noise on a page that
// simply should not be indexed.
export const revalidate = 300;

export const metadata = pageMetadata({
  title: "Login",
  description: "Sign in to your OneXhib account.",
  path: "/login",
  robots: NOINDEX_FOLLOW,
});

export default async function LoginPage({ searchParams }) {
  /*
   * Where to go after signing in, when the visitor was sent here from somewhere
   * specific — a provider's contact panel, for instance. Sanitised on arrival
   * rather than at the point of use, so an unsafe value never reaches the client
   * at all: `next` is attacker-controlled, and an unchecked one turns this page
   * into an open redirect. See safeNextPath.
   */
  const { next = "" } = await searchParams;
  return (
    <LoginForm
      stats={await platformStats()}
      nextPath={safeNextPath(Array.isArray(next) ? next[0] : next)}
    />
  );
}

/**
 * Real platform totals for the brand panel, fetched server-side.
 *
 * getCounts() and getUpcomingExhibitions() both fail soft, so a slow or
 * unreachable API degrades to a panel with no statistics rather than a broken
 * page. Nothing here is estimated - the same numbers back the homepage's
 * CountsStrip.
 */
async function platformStats() {
  const [counts, upcoming] = await Promise.all([getCounts(), getUpcomingExhibitions({ limit: 1 })]);
  const n = (v) => (typeof v === "number" && v > 0 ? v.toLocaleString("en-US") : null);

  return [
    upcoming?.total ? { label: "upcoming exhibitions", value: n(upcoming.total) } : null,
    counts?.exhibitions ? { label: "exhibitions listed", value: n(counts.exhibitions) } : null,
    counts?.companies ? { label: "companies", value: n(counts.companies) } : null,
  ].filter(Boolean);
}
