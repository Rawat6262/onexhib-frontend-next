import Link from "next/link";
import { Mail, Phone, MapPin, Smartphone } from "lucide-react";

import ProsePage, { ProseSection } from "@/components/public/ProsePage";
import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE,
  LOCATION_LINE,
  PLAY_STORE_URL,
} from "@/lib/business";

/**
 * /contact - the real ways to reach OneXhib.
 *
 * Only the three channels the business actually supplied are listed. There are
 * deliberately NO office hours, no response-time commitment, no department
 * addresses (sales@, support@, press@) and no street address, because none of
 * those were provided and a contact page that promises a reply time nobody
 * agreed to is worse than one that stays quiet about it.
 *
 * Both the email and the phone are real actionable links (mailto:, tel:) rather
 * than plain text - a contact page that cannot be actioned from a phone is
 * failing at its one job.
 */

export const metadata = publicPageMetadata({
  title: "Contact OneXhib",
  description:
    "Get in touch with OneXhib by email or phone. We are based in Ludhiana, Punjab, India.",
  path: "/contact",
});

export default function ContactPage() {
  const trail = [
    { name: "Home", path: "/" },
    { name: "Contact", path: "/contact" },
  ];

  const channels = [
    {
      icon: Mail,
      label: "Email",
      value: CONTACT_EMAIL,
      href: `mailto:${CONTACT_EMAIL}`,
      note: "The best way to reach us about listings, corrections or your account.",
    },
    {
      icon: Phone,
      label: "Phone",
      value: CONTACT_PHONE,
      href: `tel:${CONTACT_PHONE}`,
      note: null,
    },
    {
      icon: MapPin,
      label: "Based in",
      value: LOCATION_LINE,
      href: null,
      note: null,
    },
  ];

  return (
    <ProsePage
      title="Contact us"
      intro="Questions about a listing, a correction to an exhibition, or your account — here is how to reach us."
      trail={trail}
      aside={
        <ul className="mt-8 grid list-none gap-4 sm:grid-cols-2">
          {channels.map(({ icon: Icon, label, value, href, note }) => (
            <li
              key={label}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <span className="inline-flex rounded-xl bg-[#131C55]/10 p-2.5 text-[#131C55] dark:bg-blue-400/10 dark:text-blue-300">
                <Icon size={18} aria-hidden="true" />
              </span>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {label}
              </p>
              {href ? (
                <a
                  href={href}
                  className="mt-1 block break-all text-[15px] font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300"
                >
                  {value}
                </a>
              ) : (
                <p className="mt-1 text-[15px] font-semibold text-gray-900 dark:text-gray-100">
                  {value}
                </p>
              )}
              {note ? (
                <p className="mt-2 text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
                  {note}
                </p>
              ) : null}
            </li>
          ))}

          <li className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <span className="inline-flex rounded-xl bg-[#131C55]/10 p-2.5 text-[#131C55] dark:bg-blue-400/10 dark:text-blue-300">
              <Smartphone size={18} aria-hidden="true" />
            </span>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Android app
            </p>
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block text-[15px] font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300"
            >
              OneXhib on Google Play
            </a>
          </li>
        </ul>
      }
    >
      <ProseSection id="listings" title="Corrections to an exhibition listing">
        <p>
          If an exhibition on OneXhib has the wrong dates, venue, city or category, email us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
            {CONTACT_EMAIL}
          </a>{" "}
          with a link to the listing and we will correct it. Organisers can also{" "}
          <Link href="/signup" className={link}>
            create an account
          </Link>{" "}
          and manage their own exhibitions directly.
        </p>
      </ProseSection>

      <ProseSection id="listing-with-us" title="Listing on OneXhib">
        <p>
          Organisers, exhibiting companies and service providers can all list on OneXhib.{" "}
          <Link href="/signup" className={link}>
            Create an account
          </Link>{" "}
          to get started, or read more about{" "}
          <Link href="/about" className={link}>
            what the platform does
          </Link>{" "}
          first.
        </p>
        <p>
          If you are looking for services for an upcoming show, the{" "}
          <Link href={PUBLIC_ROUTES.services} className={link}>
            exhibition services
          </Link>{" "}
          page lists the categories we cover.
        </p>
      </ProseSection>

      <ProseSection id="privacy" title="Privacy and your data">
        <p>
          For questions about the information we hold, or to exercise any of your rights over it,
          our{" "}
          <Link href="/privacy-policy" className={link}>
            privacy policy
          </Link>{" "}
          explains what we collect and how to contact us about it. To remove your account, see{" "}
          <Link href="/delete-account" className={link}>
            deleting your account
          </Link>
          .
        </p>
      </ProseSection>
    </ProsePage>
  );
}

const link =
  "font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300";
