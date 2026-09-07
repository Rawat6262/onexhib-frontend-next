import SignupForm from "./signup-form";
import { NOINDEX_FOLLOW, pageMetadata } from "@/lib/seo";

// Through pageMetadata() so the page gets a self-referencing canonical.
// noindex without a canonical leaves Search Console reporting the URL as
// "duplicate, Google chose a different canonical" — noise on a page that
// simply should not be indexed.
export const metadata = pageMetadata({
  title: "Signup",
  description: "Create a OneXhib account as an exhibition organiser or service provider.",
  path: "/signup",
  robots: NOINDEX_FOLLOW,
});

export default function SignupPage() {
  return <SignupForm />;
}
