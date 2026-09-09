import Link from "next/link";

import ProsePage, { ProseSection } from "@/components/public/ProsePage";
import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";
import { BRAND_NAME, CONTACT_EMAIL } from "@/lib/business";

/**
 * /privacy-policy - moved into the (public) route group.
 *
 * WHY IT MOVED
 * It previously rendered its own standalone chrome (components/legal/
 * LegalPageLayout.jsx) because it predated the public site, and so it was the
 * ONE indexable page on the site that emitted no JSON-LD at all - a real gap,
 * since ProsePage is what attaches the BreadcrumbList. It also sat outside the
 * shared header and footer, so a visitor reading it saw different chrome from
 * every other public page, which is the opposite of what a trust page needs.
 *
 * Using ProsePage puts it in the same shell as About, Contact and Terms:
 * shared header and footer, breadcrumbs, and the matching structured data.
 *
 * Wording is carried over unchanged apart from the cookie section, which now
 * describes the consent-gated analytics added alongside this move. Nothing
 * about the business, its practices or its retention rules was invented here.
 */

const LAST_UPDATED_ISO = "2026-09-09";
const LAST_UPDATED_LABEL = "9 September 2026";

export const metadata = publicPageMetadata({
  title: "Privacy Policy",
  description:
    "How OneXhib collects, uses, stores and protects information from exhibition organisers, exhibitors and service providers.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  const trail = [
    { name: "Home", path: "/" },
    { name: "Privacy Policy", path: "/privacy-policy" },
  ];

  return (
    <ProsePage
      title="Privacy Policy"
      intro={`What ${BRAND_NAME} collects, how it is used, and the choices you have.`}
      trail={trail}
      aside={
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
          Last updated: <time dateTime={LAST_UPDATED_ISO}>{LAST_UPDATED_LABEL}</time>
        </p>
      }
    >
      <ProseSection id="introduction" title="1. Introduction">
        <p>
          {BRAND_NAME} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates a platform that
          helps exhibition organisers, exhibitors, and service providers manage exhibitions,
          companies, products, and related services. This Privacy Policy explains what
          information we collect, how we use it, and the choices you have.
        </p>
        <p>
          By creating an account or otherwise using {BRAND_NAME}, you agree to the collection and
          use of information as described in this policy.
        </p>
      </ProseSection>

      <ProseSection id="what-we-collect" title="2. Information We Collect">
        <p>
          <span className="font-semibold text-gray-900 dark:text-gray-100">Account information:</span>{" "}
          name, email address, mobile number, password (stored encrypted), designation, and
          company details you provide when signing up.
        </p>
        <p>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            Exhibition, company &amp; product data:
          </span>{" "}
          details you or your organisation submit through the platform, such as exhibition
          listings, company profiles, product catalogs, brochures, and images.
        </p>
        <p>
          <span className="font-semibold text-gray-900 dark:text-gray-100">Usage data:</span> basic
          technical information such as IP address and browser type, collected automatically to
          keep the platform secure and functioning correctly.
        </p>
      </ProseSection>

      <ProseSection id="how-we-use" title="3. How We Use Your Information">
        <ul className="list-disc space-y-1 pl-5">
          <li>To create and manage your account</li>
          <li>To operate core features — listing exhibitions, companies, products, and services</li>
          <li>To send OTP verification codes and account-related emails</li>
          <li>To maintain the security of your session and detect misuse</li>
          <li>To respond to support requests</li>
        </ul>
        <p>We do not sell your personal information to third parties.</p>
      </ProseSection>

      <ProseSection id="cookies" title="4. Cookies &amp; Authentication">
        <p>
          <span className="font-semibold text-gray-900 dark:text-gray-100">Essential cookie:</span>{" "}
          we use a single essential cookie to keep you signed in securely. It is httpOnly (not
          readable by page scripts) and is only used for authentication — we don&apos;t use it for
          advertising or cross-site tracking. If you check &quot;Remember me&quot; at login, this
          cookie persists for 30 days; otherwise it clears when you close your browser.
        </p>
        <p>
          <span className="font-semibold text-gray-900 dark:text-gray-100">Analytics cookies:</span>{" "}
          we use Google Analytics to understand how the site is used so we can improve it — for
          example, which pages are visited and how visitors arrive. These cookies are set{" "}
          <span className="font-semibold">only if you accept them</span> when asked. Until you
          accept, no analytics cookie is written. You can decline and the site works exactly the
          same. We do not use these cookies for advertising or ad personalisation, and those
          settings remain switched off at all times.
        </p>
        <p>
          To change your choice later, clear this site&apos;s data in your browser settings and the
          consent prompt will appear again on your next visit.
        </p>
      </ProseSection>

      <ProseSection id="sharing" title="5. Sharing &amp; Third-Party Services">
        <p>
          We use trusted third-party services to operate the platform, including cloud storage
          for images/media you upload (brochures, product images, exhibition photos), an email
          provider for OTPs and notifications, and — only with your consent — Google Analytics
          for usage measurement. These providers only receive the data necessary to perform
          their function and are not permitted to use it for their own purposes.
        </p>
        <p>
          We may also disclose information if required by law or to protect the rights, safety,
          or property of {BRAND_NAME} or our users.
        </p>
      </ProseSection>

      <ProseSection id="security" title="6. Data Security">
        <p>
          Passwords are stored using industry-standard hashing (bcrypt) and never stored in plain
          text. Access to administrative functions is restricted by role, and we take reasonable
          technical measures to protect your data against unauthorized access. No method of
          transmission or storage is 100% secure, so we cannot guarantee absolute security.
        </p>
      </ProseSection>

      <ProseSection id="retention" title="7. Data Retention">
        <p>
          We retain your account and content data for as long as your account is active, or as
          needed to provide the service. You may request deletion of your account and associated
          data at any time — see our{" "}
          <Link href="/delete-account" className={link}>
            Delete Your Account
          </Link>{" "}
          page for details.
        </p>
      </ProseSection>

      <ProseSection id="your-rights" title="8. Your Rights">
        <p>Depending on your location, you may have the right to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Access the personal information we hold about you</li>
          <li>Correct inaccurate information</li>
          <li>Request deletion of your account and data</li>
          <li>Withdraw consent where processing is based on consent</li>
        </ul>
      </ProseSection>

      <ProseSection id="childrens-privacy" title="9. Children&apos;s Privacy">
        <p>
          {BRAND_NAME} is intended for business use and is not directed at individuals under 18.
          We do not knowingly collect personal information from children.
        </p>
      </ProseSection>

      <ProseSection id="changes" title="10. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes will be reflected
          by updating the &quot;Last updated&quot; date above.
        </p>
      </ProseSection>

      <ProseSection id="contact" title="11. Contact Us">
        <p>
          If you have questions about this Privacy Policy or wish to exercise any of the rights
          above, contact us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
            {CONTACT_EMAIL}
          </a>
          . You can also read more{" "}
          <Link href="/about" className={link}>
            about {BRAND_NAME}
          </Link>{" "}
          or browse{" "}
          <Link href={PUBLIC_ROUTES.exhibitions} className={link}>
            upcoming exhibitions
          </Link>
          .
        </p>
      </ProseSection>
    </ProsePage>
  );
}

const link =
  "font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300";
