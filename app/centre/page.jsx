import CentreClient from "./centre-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

export const metadata = {
  title: "My venues",
  robots: NOINDEX_NOFOLLOW,
};

export default function CentrePage() {
  return <CentreClient />;
}
