import OrganiserCentresClient from "./organiser-centres-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

export const metadata = {
  title: "Exhibition centres",
  robots: NOINDEX_NOFOLLOW,
};

export default function OrganiserCentresPage() {
  return <OrganiserCentresClient />;
}
