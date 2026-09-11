import Link from "next/link";
import LegalPageLayout, { Section } from "@/components/legal/LegalPageLayout";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbNode, graph } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Delete Your Account",
  description:
    "How to request deletion of your OneXhib account, what data is removed, what is retained, and how long the process takes.",
  path: "/delete-account",
  // Required to be publicly reachable by app-store account-deletion policies.
  robots: { index: true, follow: true },
});

// Server Component: static content, navigation buttons replaced with <Link>s.
export default function DeleteAccountPage() {
  // This page keeps its standalone chrome rather than moving into (public):
  // app-store account-deletion policies require it to be reachable directly,
  // without navigating a site shell. But it IS indexable, so it still needs
  // structured data - emitted here since there is no ProsePage to attach it.
  const trail = [
    { name: "Home", path: "/" },
    { name: "Delete Your Account", path: "/delete-account" },
  ];

  return (
    <LegalPageLayout
      title="Delete Your Account"
      subtitle="Account Deletion Request"
      footer={
        <Link
          href="/login"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition"
        >
          ← Back to Login
        </Link>
      }
    >
      <JsonLd graph={graph(breadcrumbNode(trail))} />

      <Section title="Overview">
        <p>
          If you would like to delete your OneXhib account and associated personal account
          information, you can request account deletion using this page.
        </p>
      </Section>

      <Section title="How to Delete Your Account">
        <p>To delete your OneXhib account:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Log in to your OneXhib account.</li>
          <li>Enter your current account password when prompted.</li>
          <li>Confirm that you want to permanently delete your account.</li>
          <li>Your account will be deleted after successful verification.</li>
        </ol>
        <p>You can also delete your account directly from the OneXhib mobile application:</p>
        <p className="font-semibold text-gray-900 dark:text-gray-100">Dashboard → Side Drawer → Delete Account</p>
      </Section>

      <Section title="What Data Will Be Deleted?">
        <p>
          When your account is successfully deleted, the following account information
          associated with your OneXhib account will be deleted:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Full name</li>
          <li>Email address</li>
          <li>Phone number</li>
          <li>User account information</li>
          <li>Other information stored as part of your account record</li>
        </ul>
        <p>Account deletion is performed only after authentication and verification of your current password.</p>
      </Section>

      <Section title="What Data Is Not Deleted?">
        <p>
          Deleting your account does <span className="font-semibold text-gray-900 dark:text-gray-100">not</span>{" "}
          automatically delete exhibitions, companies, products, or other content that you may
          have created.
        </p>
        <p>
          These records are retained separately and are{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">not cascade-deleted</span> when your
          account is deleted.
        </p>
      </Section>

      <Section title="Important Information">
        <p>
          Account deletion is permanent. Once your account has been deleted, you may not be
          able to recover your account or the account information associated with it.
        </p>
        <p>
          For security purposes, you must be logged in and provide your{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">current password</span> before your
          account can be deleted.
        </p>
      </Section>

      <Section title="Request Account Deletion">
        <p>
          To request deletion of your account, please use the{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">Delete Account</span> option after
          logging into your OneXhib account.
        </p>
        <p>If you are unable to delete your account or need assistance, please contact us:</p>
        <p>
          <span className="font-semibold text-gray-900 dark:text-gray-100">Email:</span>{" "}
          <a href="mailto:onexhib@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">
            onexhib@gmail.com
          </a>
          <br />
          <span className="font-semibold text-gray-900 dark:text-gray-100">Company:</span> Sem Group
          <br />
          <span className="font-semibold text-gray-900 dark:text-gray-100">App:</span> OneXhib
        </p>
        <p>We will assist you with your account deletion request.</p>
      </Section>

      <Section title="Privacy">
        <p>
          For more information about how OneXhib collects, uses, stores, and protects your
          information, please review our{" "}
          <Link href="/privacy-policy" className="text-blue-600 dark:text-blue-400 hover:underline">
            Privacy Policy
          </Link>.
        </p>
      </Section>
    </LegalPageLayout>
  );
}
