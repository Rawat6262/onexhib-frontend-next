import WelcomeClient from "./welcome-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

/**
 * /welcome — home for accounts without a workspace, and the place any account
 * changes its own type. Private: noindex, no canonical, not in the sitemap.
 */
export const metadata = {
  title: "Your account",
  robots: NOINDEX_NOFOLLOW,
};

export default function WelcomePage() {
  return <WelcomeClient />;
}
