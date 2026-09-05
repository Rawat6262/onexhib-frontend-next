import ResetPasswordForm from "./reset-password-form";
import { NOINDEX_FOLLOW } from "@/lib/seo";

export const metadata = {
  title: "Reset password",
  description: "Confirm the one-time code to finish resetting your password.",
  robots: NOINDEX_FOLLOW,
};

export default async function ResetPasswordPage({ searchParams }) {
  const { email = "" } = await searchParams;
  return <ResetPasswordForm initialEmail={email} />;
}
