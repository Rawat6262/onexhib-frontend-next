import AdminHotelsClient from "./admin-hotels-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

export const metadata = {
  title: "Hotels",
  robots: NOINDEX_NOFOLLOW,
};

export default function Page() {
  return <AdminHotelsClient />;
}
