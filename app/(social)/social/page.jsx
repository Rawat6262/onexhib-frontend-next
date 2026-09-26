import SocialClient from "./social-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

/**
 * /social — the Community entry route.
 *
 * PRIVATE. Social reads all require the `uid` cookie, so this is authenticated
 * content and carries robots index:false, follow:false like the rest of the
 * signed-in area. It is absent from the sitemap and from the public footer, and
 * emits no canonical and no JSON-LD: a canonical is a hint for indexable content,
 * and publishing one for a private page is a way to get it discovered.
 *
 * This route IS the feed — there is no separate /social/feed. A second route
 * would leave /social as either a redirect or an invented landing page, and the
 * feed is the only thing the Community area is for.
 *
 * In 11B the feed itself is not implemented. This page is the shell: it must not
 * call GET /api/social/feed, and it must not show placeholder posts, suggested
 * people or trending content. Phase 11D fills it in.
 */

export const metadata = {
  title: "Community",
  robots: NOINDEX_NOFOLLOW,
};

export default function SocialPage() {
  return <SocialClient />;
}
