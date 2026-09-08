import ForgotPasswordForm from "./forgot-password-form";
import { NOINDEX_FOLLOW, pageMetadata } from "@/lib/seo";

// Through pageMetadata() so the page gets a self-referencing canonical.
// noindex without a canonical leaves Search Console reporting the URL as
// "duplicate, Google chose a different canonical" — noise on a page that
// simply should not be indexed.
export const metadata = pageMetadata({
  title: "Forgot password",
  description: "Request a one-time code to reset your OneXhib password.",
  path: "/forgot-password",
  robots: NOINDEX_FOLLOW,
});

export default async function ForgotPasswordPage({ searchParams }) {
  const { email = "" } = await searchParams;
  return <ForgotPasswordForm initialEmail={email} />;
}
