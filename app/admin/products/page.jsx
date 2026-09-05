import AdminProductsClient from "./admin-products-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

export const metadata = {
  title: "Admin Products",
  robots: NOINDEX_NOFOLLOW,
};

export default function Page() {
  return <AdminProductsClient />;
}
