import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import { getUpcomingCities } from "@/lib/public-api";

/**
 * Shell for every unauthenticated page.
 *
 * Note what this layout does NOT contain: RequireAuth, AuthProvider or
 * SidebarShell. That is the entire point of the (public) route group — these
 * pages must render for a visitor with no session and no cookie, and must stay
 * crawlable. The authenticated shells under (dashboard) and /admin are
 * untouched and unaffected.
 *
 * The route group adds no path segment, so /, /exhibitions, /companies and the
 * rest keep their URLs exactly as designed.
 *
 * A Server Component, so the header and footer ship no JavaScript beyond the
 * theme toggle.
 */
export default async function PublicLayout({ children }) {
  // Derived from live inventory, ISR-cached, and deduplicated by Next's fetch
  // cache with the identical call on the homepage — so this costs no extra
  // request. Fails soft to an empty array, which simply hides the column.
  const cities = await getUpcomingCities({ max: 6 });

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950">
      <PublicHeader />
      {/* Exactly one <main> per page, starting below the header. */}
      <main className="flex-1">{children}</main>
      <PublicFooter cities={cities} />
    </div>
  );
}
