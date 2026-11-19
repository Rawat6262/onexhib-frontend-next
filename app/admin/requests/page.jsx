import { Suspense } from "react";
import AdminRequestsHub from "./admin-requests-hub";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

export const metadata = {
  title: "Requests",
  robots: NOINDEX_NOFOLLOW,
};

// The hub reads ?section= with useSearchParams, which needs a Suspense boundary.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminRequestsHub />
    </Suspense>
  );
}
