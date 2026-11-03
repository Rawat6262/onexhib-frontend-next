import ExhibitorRequestsClient from "./exhibitor-requests-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

export const metadata = {
  title: "Exhibitor requests",
  robots: NOINDEX_NOFOLLOW,
};

export default function ExhibitorRequestsPage() {
  return <ExhibitorRequestsClient />;
}
