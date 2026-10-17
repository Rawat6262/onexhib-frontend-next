import AdminServicesClient from "./admin-services-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

export const metadata = {
  title: "Exhibition services",
  robots: NOINDEX_NOFOLLOW,
};

export default function Page() {
  return <AdminServicesClient />;
}
