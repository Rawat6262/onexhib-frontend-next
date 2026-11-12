import AdminFeaturedServicesClient from "./admin-featured-services-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

export const metadata = {
  title: "Featured services",
  robots: NOINDEX_NOFOLLOW,
};

export default function Page() {
  return <AdminFeaturedServicesClient />;
}
