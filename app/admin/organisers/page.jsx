import AdminOrganisersClient from "./admin-organisers-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

export const metadata = {
  title: "Admin Organisers",
  robots: NOINDEX_NOFOLLOW,
};

export default function Page() {
  return <AdminOrganisersClient />;
}
