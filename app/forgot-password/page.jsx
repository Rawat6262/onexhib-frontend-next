import ForgotPasswordForm from "./forgot-password-form";
import { NOINDEX_FOLLOW } from "@/lib/seo";

export const metadata = {
  title: "Forgot password",
  description: "Request a one-time code to reset your OneXhib password.",
  robots: NOINDEX_FOLLOW,
};

export default async function ForgotPasswordPage({ searchParams }) {
  const { email = "" } = await searchParams;
  return <ForgotPasswordForm initialEmail={email} />;
}
