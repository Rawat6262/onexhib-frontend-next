import Link from "next/link";

import ProsePage, { ProseSection } from "@/components/public/ProsePage";
import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";
import {
  BRAND_NAME,
  CONTACT_EMAIL,
  JURISDICTION,
  LEGAL_NAME,
  LOCATION_LINE,
} from "@/lib/business";

/**
 * /terms - the terms of use for the platform.
 *
 * WHAT THIS IS AND IS NOT
 * These terms are written from what the product verifiably does - the roles it
 * supports, the content users submit, the way listings are moderated, how
 * accounts are removed - plus the entity name and governing country supplied by
 * the business. They have NOT been reviewed by a lawyer, and the page says so
 * rather than implying otherwise.
 *
 * FACTS DELIBERATELY NOT STATED, because they were not provided:
 *   - a named court or city of jurisdiction (only the country, India)
 *   - a registered office address (the locality is described as "based in")
 *   - company registration, CIN, GST or VAT numbers
 *   - any limitation-of-liability cap expressed as a monetary figure
 *
 * Wording about data handling is deliberately NOT duplicated here; it points at
 * the existing privacy policy instead, so the two documents cannot drift into
 * contradicting each other.
 */

const LAST_UPDATED_ISO = "2026-09-08";
const LAST_UPDATED_LABEL = "8 September 2026";

export const metadata = publicPageMetadata({
  title: "Terms of Use",
  description:
    "The terms that apply when you browse OneXhib or list exhibitions, companies, products or services on it, including acceptable use and governing law.",
  path: "/terms",
});

export default function TermsPage() {
  const trail = [
    { name: "Home", path: "/" },
    { name: "Terms of Use", path: "/terms" },
  ];

  return (
    <ProsePage
      title="Terms of Use"
      intro={`These terms apply when you browse ${BRAND_NAME} or list content on it. Please read them before creating an account.`}
      trail={trail}
      aside={
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
          Last updated: <time dateTime={LAST_UPDATED_ISO}>{LAST_UPDATED_LABEL}</time>
        </p>
      }
    >
      <ProseSection id="who-we-are" title="1. Who these terms are with">
        <p>
          {BRAND_NAME} is operated by {LEGAL_NAME}, based in {LOCATION_LINE}. In these terms,
          &quot;we&quot;, &quot;us&quot; and &quot;our&quot; mean {LEGAL_NAME}, and
          &quot;you&quot; means anyone using the platform, whether or not you have an account.
        </p>
      </ProseSection>

      <ProseSection id="what-we-provide" title="2. What the platform provides">
        <p>
          {BRAND_NAME} is a discovery platform for exhibitions and trade shows. It lists
          exhibitions with their dates, venues and categories, the companies exhibiting at them,
          the products those companies showcase, and providers of exhibition services.
        </p>
        <p>
          Browsing is open to everyone and does not require an account. An account is needed only
          to add or manage your own listings.
        </p>
      </ProseSection>

      <ProseSection id="accounts" title="3. Accounts">
        <p>
          You must provide accurate information when creating an account and keep it up to date.
          You are responsible for activity that happens under your account and for keeping your
          password confidential. Tell us promptly at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
            {CONTACT_EMAIL}
          </a>{" "}
          if you believe your account has been used without your permission.
        </p>
        <p>
          You can remove your account at any time — see{" "}
          <Link href="/delete-account" className={link}>
            deleting your account
          </Link>
          .
        </p>
      </ProseSection>

      <ProseSection id="your-content" title="4. Content you submit">
        <p>
          You keep ownership of the exhibitions, company profiles, products, images and other
          material you submit. By submitting it you give us permission to host, display and
          distribute it on the platform so that it can be found by other users and by search
          engines.
        </p>
        <p>
          You are responsible for what you submit. You confirm that you have the right to submit
          it, that it is accurate, and that it does not infringe anyone else&apos;s rights —
          including copyright in any image you upload.
        </p>
      </ProseSection>

      <ProseSection id="acceptable-use" title="5. Acceptable use">
        <p>You agree not to use {BRAND_NAME} to:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>submit false, misleading or deliberately duplicated listings</li>
          <li>upload material you do not have the right to use</li>
          <li>impersonate another person, business or organiser</li>
          <li>attempt to gain access to accounts, data or systems that are not yours</li>
          <li>disrupt the platform, or extract its content at a scale that degrades it for others</li>
          <li>use the platform for anything unlawful</li>
        </ul>
      </ProseSection>

      <ProseSection id="moderation" title="6. Listings and moderation">
        <p>
          We may edit, hide or remove any listing that appears inaccurate, duplicated, unlawful or
          in breach of these terms, and we may suspend or close accounts that repeatedly submit
          such content.
        </p>
        <p>
          If you believe a listing about your exhibition or business is wrong, contact us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
            {CONTACT_EMAIL}
          </a>{" "}
          and we will review it.
        </p>
      </ProseSection>

      <ProseSection id="accuracy" title="7. Accuracy of listings">
        <p>
          Much of the information on {BRAND_NAME} is supplied by organisers and exhibitors, or
          gathered from public sources. Dates, venues and other details can change at short
          notice.
        </p>
        <p>
          <strong className="font-semibold text-gray-900 dark:text-gray-100">
            Always confirm details with the organiser before travelling to or booking an
            exhibition.
          </strong>{" "}
          We do not guarantee that any listing is complete, current or accurate, and the platform
          is provided on an &quot;as is&quot; basis.
        </p>
      </ProseSection>

      <ProseSection id="third-party" title="8. Third-party links and content">
        <p>
          Listings may link to organiser websites, brochures, images and other material we do not
          control. We are not responsible for that content, and a link is not an endorsement.
        </p>
      </ProseSection>

      <ProseSection id="our-content" title="9. Our own material">
        <p>
          The {BRAND_NAME} name, logo, site design and software belong to us. You may link to any
          public page freely. You may not copy the platform&apos;s design or software, or
          systematically reproduce the catalogue as a competing listing, without our permission.
        </p>
      </ProseSection>

      <ProseSection id="availability" title="10. Availability">
        <p>
          We aim to keep the platform available, but we do not promise uninterrupted service. We
          may change, suspend or withdraw features, and we may carry out maintenance without
          notice.
        </p>
      </ProseSection>

      <ProseSection id="liability" title="11. Liability">
        <p>
          To the extent permitted by law, we are not liable for losses arising from your use of
          the platform, from reliance on a listing, or from any exhibition, company or service you
          find through it. Nothing in these terms limits liability that cannot be limited by law.
        </p>
      </ProseSection>

      <ProseSection id="privacy-link" title="12. Privacy">
        <p>
          How we collect, use and store information is set out in our{" "}
          <Link href="/privacy-policy" className={link}>
            privacy policy
          </Link>
          , which forms part of these terms.
        </p>
      </ProseSection>

      <ProseSection id="changes" title="13. Changes to these terms">
        <p>
          We may update these terms as the platform develops. The date at the top of this page
          shows when they were last changed, and continuing to use {BRAND_NAME} after a change
          means you accept the updated terms.
        </p>
      </ProseSection>

      <ProseSection id="law" title="14. Governing law">
        <p>
          These terms are governed by the laws of {JURISDICTION}, and any dispute relating to them
          or to your use of {BRAND_NAME} will be subject to the courts of {JURISDICTION}.
        </p>
      </ProseSection>

      <ProseSection id="contact" title="15. Contact">
        <p>
          Questions about these terms can be sent to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
            {CONTACT_EMAIL}
          </a>
          , or see the{" "}
          <Link href="/contact" className={link}>
            contact page
          </Link>{" "}
          for our other details. You can also read more{" "}
          <Link href="/about" className={link}>
            about {BRAND_NAME}
          </Link>{" "}
          or browse{" "}
          <Link href={PUBLIC_ROUTES.exhibitions} className={link}>
            upcoming exhibitions
          </Link>
          .
        </p>
        <p className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-[13px] text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          These terms are provided for transparency about how {BRAND_NAME} may be used. They are
          not legal advice and have not been reviewed by a lawyer.
        </p>
      </ProseSection>
    </ProsePage>
  );
}

const link =
  "font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300";
