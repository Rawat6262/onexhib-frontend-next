import PrivacyClient from "./privacy-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

/**
 * /social/privacy — the viewer's own privacy controls.
 *
 * PRIVATE, and the most private page in the social area: it lists people this one person
 * has blocked, which is a record of their own decisions and nobody else's business. The
 * backend scopes every row to `blocker: req.user._id` and the endpoint takes no user
 * parameter, so this page has no shareable form at all.
 *
 * noindex/nofollow like the rest of the signed-in area, absent from the sitemap, no
 * canonical and no JSON-LD. `nofollow` matters here specifically: the links out would
 * otherwise describe one person's blocked list to a crawler.
 *
 * No protected data is fetched here — the page is a frame, and PrivacyClient does the
 * authenticated work in the browser against the viewer's own session. Same shape as the
 * notifications and profile routes.
 */

export const metadata = {
  title: "Privacy",
  robots: NOINDEX_NOFOLLOW,
};

export default function SocialPrivacyPage() {
  return <PrivacyClient />;
}
