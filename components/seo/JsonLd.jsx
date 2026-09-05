import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

/**
 * Structured data for the public homepage.
 *
 * Kept deliberately minimal: only facts already stated on the site or in the
 * codebase (name, URL, logo, support email). No invented founding dates,
 * addresses, ratings or social profiles — fabricated structured data is a real
 * risk of a manual action, not a shortcut.
 */
export default function JsonLd() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/Dark.png`,
        contactPoint: {
          "@type": "ContactPoint",
          email: "onexhib@gmail.com",
          contactType: "customer support",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // Fixed object built above, never user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
