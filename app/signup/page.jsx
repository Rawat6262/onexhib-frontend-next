import SignupForm from "./signup-form";
import { NOINDEX_FOLLOW, pageMetadata } from "@/lib/seo";
import { getCounts, getUpcomingExhibitions } from "@/lib/public-api";

// Through pageMetadata() so the page gets a self-referencing canonical.
// noindex without a canonical leaves Search Console reporting the URL as
// "duplicate, Google chose a different canonical" — noise on a page that
// simply should not be indexed.
export const revalidate = 300;

export const metadata = pageMetadata({
  title: "Signup",
  description: "Create a OneXhib account as an exhibition organiser or service provider.",
  path: "/signup",
  robots: NOINDEX_FOLLOW,
});

export default async function SignupPage() {
  return <SignupForm stats={await platformStats()} />;
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
