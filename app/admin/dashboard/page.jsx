import AdminDashboardClient from "./admin-dashboard-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

export const metadata = {
  title: "Admin Dashboard",
  robots: NOINDEX_NOFOLLOW,
};

export default function Page() {
  return <AdminDashboardClient />;
}
