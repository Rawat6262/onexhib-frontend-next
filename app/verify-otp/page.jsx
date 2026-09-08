import VerifyOtpForm from "./verify-otp-form";
import { NOINDEX_FOLLOW, pageMetadata } from "@/lib/seo";

// Next 15 hands `searchParams` to Server Components as a Promise. Reading it
// here rather than with useSearchParams() keeps the page server-rendered.
// Through pageMetadata() so the page gets a self-referencing canonical.
// noindex without a canonical leaves Search Console reporting the URL as
// "duplicate, Google chose a different canonical" — noise on a page that
// simply should not be indexed.
export const metadata = pageMetadata({
  title: "Verify OTP",
  description: "Confirm the 6-digit code sent to your email address.",
  path: "/verify-otp",
  robots: NOINDEX_FOLLOW,
});

export default async function VerifyOtpPage({ searchParams }) {
  const { email = "" } = await searchParams;
  return <VerifyOtpForm initialEmail={email} />;
}
