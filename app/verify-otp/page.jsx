import VerifyOtpForm from "./verify-otp-form";
import { NOINDEX_FOLLOW } from "@/lib/seo";

// Next 15 hands `searchParams` to Server Components as a Promise. Reading it
// here rather than with useSearchParams() keeps the page server-rendered.
export const metadata = {
  title: "Verify OTP",
  description: "Confirm the 6-digit code sent to your email address.",
  robots: NOINDEX_FOLLOW,
};

export default async function VerifyOtpPage({ searchParams }) {
  const { email = "" } = await searchParams;
  return <VerifyOtpForm initialEmail={email} />;
}
