import RequestAccessClient from "./request-access-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

export const metadata = {
  title: "Request access",
  robots: NOINDEX_NOFOLLOW,
};

export default function RequestAccessPage() {
  return <RequestAccessClient />;
}
