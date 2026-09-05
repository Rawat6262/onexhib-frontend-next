import ProductDetailClient from "./product-detail-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

export const metadata = {
  title: "Product Detail",
  robots: NOINDEX_NOFOLLOW,
};

export default async function ProductDetailPage({ params }) {
  const { id } = await params;
  return <ProductDetailClient id={id} />;
}
