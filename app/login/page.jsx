import LoginForm from "./login-form";
import { NOINDEX_FOLLOW } from "@/lib/seo";

export const metadata = {
  title: "Login",
  description: "Sign in to your OneXhib account.",
  robots: NOINDEX_FOLLOW,
};

export default function LoginPage() {
  return <LoginForm />;
}
