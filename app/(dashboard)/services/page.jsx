import ServicesClient from "./services-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

export const metadata = {
  title: "Services",
  robots: NOINDEX_NOFOLLOW,
};

export default function ServicesPage() {
  return <ServicesClient />;
}
