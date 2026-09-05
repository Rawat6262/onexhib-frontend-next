import SignupForm from "./signup-form";
import { NOINDEX_FOLLOW } from "@/lib/seo";

export const metadata = {
  title: "Signup",
  description: "Create a OneXhib account as an exhibition organiser or service provider.",
  robots: NOINDEX_FOLLOW,
};

export default function SignupPage() {
  return <SignupForm />;
}
