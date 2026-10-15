import ExhibitorClient from "./exhibitor-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

/** Private workspace: noindex, no canonical, not in the sitemap. */
export const metadata = {
  title: "Exhibitor workspace",
  robots: NOINDEX_NOFOLLOW,
};

export default function ExhibitorPage() {
  return <ExhibitorClient />;
}
