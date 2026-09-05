import AdminCompaniesClient from "./admin-companies-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

export const metadata = {
  title: "Admin Companies",
  robots: NOINDEX_NOFOLLOW,
};

export default function Page() {
  return <AdminCompaniesClient />;
}
