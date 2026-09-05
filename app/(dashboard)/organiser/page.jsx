import OrganiserClient from "./organiser-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

export const metadata = {
  title: "Organiser",
  robots: NOINDEX_NOFOLLOW,
};

export default function OrganiserPage() {
  return <OrganiserClient />;
}
