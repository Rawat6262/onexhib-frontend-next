import Link from "next/link";
import LegalPageLayout, { Section } from "@/components/legal/LegalPageLayout";
import { pageMetadata } from "@/lib/seo";

const LAST_UPDATED = "August 10, 2026";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How OneXhib collects, uses, stores and protects information from exhibition organisers, exhibitors and service providers.",
  path: "/privacy-policy",
  // One of the few pages with real, public, unique content — index it.
  robots: { index: true, follow: true },
});

// Server Component: the page has no state and no browser APIs. The only
// interactive parts were navigation buttons, which are now <Link>s.
export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      subtitle={`Last updated: ${LAST_UPDATED}`}
      footer={
        <Link
          href="/login"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition"
        >
          ← Back to Login
        </Link>
      }
    >
      <Section title="1. Introduction">
        <p>
          OneXhib (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates a platform that helps exhibition organisers,
          exhibitors, and service providers manage exhibitions, companies, products, and
          related services. This Privacy Policy explains what information we collect, how we
          use it, and the choices you have.
        </p>
        <p>
          By creating an account or otherwise using OneXhib, you agree to the collection and
          use of information as described in this policy.
        </p>
      </Section>

      <Section title="2. Information We Collect">
        <p><span className="font-semibold text-gray-900 dark:text-gray-100">Account information:</span> name, email address, mobile number, password (stored encrypted), designation, and company details you provide when signing up.</p>
        <p><span className="font-semibold text-gray-900 dark:text-gray-100">Exhibition, company &amp; product data:</span> details you or your organisation submit through the platform, such as exhibition listings, company profiles, product catalogs, brochures, and images.</p>
        <p><span className="font-semibold text-gray-900 dark:text-gray-100">Usage data:</span> basic technical information such as IP address and browser type, collected automatically to keep the platform secure and functioning correctly.</p>
      </Section>

      <Section title="3. How We Use Your Information">
        <ul className="list-disc pl-5 space-y-1">
          <li>To create and manage your account</li>
          <li>To operate core features — listing exhibitions, companies, products, and services</li>
          <li>To send OTP verification codes and account-related emails</li>
          <li>To maintain the security of your session and detect misuse</li>
          <li>To respond to support requests</li>
        </ul>
        <p>We do not sell your personal information to third parties.</p>
      </Section>

      <Section title="4. Cookies &amp; Authentication">
        <p>
          We use a single essential cookie to keep you signed in securely. It is httpOnly
          (not readable by page scripts) and is only used for authentication — we don&apos;t use
          it for advertising or cross-site tracking. If you check &quot;Remember me&quot; at login, this
          cookie persists for 30 days; otherwise it clears when you close your browser.
        </p>
      </Section>

      <Section title="5. Sharing &amp; Third-Party Services">
        <p>
          We use trusted third-party services to operate the platform, including cloud storage
          for images/media you upload (brochures, product images, exhibition photos) and an
          email provider for OTPs and notifications. These providers only receive the data
          necessary to perform their function and are not permitted to use it for their own
          purposes.
        </p>
        <p>We may also disclose information if required by law or to protect the rights, safety, or property of OneXhib or our users.</p>
      </Section>

      <Section title="6. Data Security">
        <p>
          Passwords are stored using industry-standard hashing (bcrypt) and never stored in
          plain text. Access to administrative functions is restricted by role, and we take
          reasonable technical measures to protect your data against unauthorized access.
          No method of transmission or storage is 100% secure, so we cannot guarantee absolute
          security.
        </p>
      </Section>

      <Section title="7. Data Retention">
        <p>
          We retain your account and content data for as long as your account is active, or as
          needed to provide the service. You may request deletion of your account and
          associated data at any time — see our{" "}
          <Link href="/delete-account" className="text-blue-600 dark:text-blue-400 hover:underline">
            Delete Your Account
          </Link>{" "}
          page for details.
        </p>
      </Section>

      <Section title="8. Your Rights">
        <p>Depending on your location, you may have the right to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Access the personal information we hold about you</li>
          <li>Correct inaccurate information</li>
          <li>Request deletion of your account and data</li>
          <li>Withdraw consent where processing is based on consent</li>
        </ul>
      </Section>

      <Section title="9. Children&apos;s Privacy">
        <p>
          OneXhib is intended for business use and is not directed at individuals under 18.
          We do not knowingly collect personal information from children.
        </p>
      </Section>

      <Section title="10. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes will be
          reflected by updating the &quot;Last updated&quot; date above.
        </p>
      </Section>

      <Section title="11. Contact Us">
        <p>
          If you have questions about this Privacy Policy or wish to exercise any of the
          rights above, contact us at{" "}
          <a href="mailto:onexhib@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">
            onexhib@gmail.com
          </a>.
        </p>
      </Section>
    </LegalPageLayout>
  );
}
