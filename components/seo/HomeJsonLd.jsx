import JsonLd from "@/components/seo/JsonLd";
import { FAQ } from "@/lib/faq";
import { faqNode, graph, organizationNode, webSiteNode } from "@/lib/jsonld";

/**
 * Structured data for the homepage: who publishes the site, what the site is,
 * how to search it, and the FAQ that is rendered as visible text further down
 * the page. Nothing here is a claim the page does not make.
 *
 * `upcomingCount` is accepted but deliberately not emitted — there is no
 * truthful schema.org property for "how many events this site lists", and
 * inventing one would be noise.
 */
export default function HomeJsonLd() {
  return <JsonLd graph={graph(organizationNode(), webSiteNode(), faqNode(FAQ))} />;
}
