import AdminRequestsClient from "./admin-requests-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

export const metadata = {
  title: "Access requests",
  robots: NOINDEX_NOFOLLOW,
};

export default function Page() {
  return <AdminRequestsClient />;
}
