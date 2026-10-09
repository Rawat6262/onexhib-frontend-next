import ResetPasswordForm from "./reset-password-form";
import { NOINDEX_FOLLOW, pageMetadata } from "@/lib/seo";

// Through pageMetadata() so the page gets a self-referencing canonical.
// noindex without a canonical leaves Search Console reporting the URL as
// "duplicate, Google chose a different canonical" — noise on a page that
// simply should not be indexed.
export const metadata = pageMetadata({
  title: "Reset password",
  description: "Confirm the one-time code to finish resetting your password.",
  path: "/reset-password",
  robots: NOINDEX_FOLLOW,
});

export default async function ResetPasswordPage({ searchParams }) {
  // `sms` is the already-masked destination the forgot-password step carried
  // over (see lib/otp.js); the form validates its shape before rendering it.
  const { email = "", sms = "" } = await searchParams;
  return <ResetPasswordForm initialEmail={email} initialSmsTo={sms} />;
}
