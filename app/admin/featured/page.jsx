import AdminFeaturedClient from "./admin-featured-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

export const metadata = {
  title: "Featured exhibitions",
  robots: NOINDEX_NOFOLLOW,
};

export default function Page() {
  return <AdminFeaturedClient />;
}
