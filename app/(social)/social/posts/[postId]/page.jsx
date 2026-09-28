import PostDetailClient from "./post-detail-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

/**
 * /social/posts/[postId] — one post and its comments.
 *
 * PRIVATE. Every social read requires the uid cookie, so this carries
 * noindex/nofollow like the rest of the signed-in area, is absent from the sitemap,
 * and emits no canonical and no JSON-LD. A FOLLOWERS-only post must not become
 * crawlable because somebody linked to it.
 *
 * The title is deliberately generic rather than the post's own. Generating it would
 * mean fetching the post while rendering, which would either need the viewer's
 * cookie on the server or leak one person's post into a shared cache — and the
 * backend answers 404 for a post the viewer may not see, which is a decision only
 * the viewer's own session can make.
 *
 * No protected data is fetched here: the page is a frame, and PostDetailClient does
 * the authenticated work in the browser. Same shape as the profile route.
 *
 * `postId` is passed through UNVALIDATED and UNTRUSTED. models/social.model.js runs
 * every id through encodeURIComponent, so it cannot add a path segment or a query
 * string, and a malformed id is answered by the backend's own 400 — which the client
 * renders as "This post isn't available." rather than echoing validation wording
 * about a field the reader cannot see.
 */

export const metadata = {
  title: "Post",
  robots: NOINDEX_NOFOLLOW,
};

export default async function SocialPostPage({ params }) {
  // Next 15 passes params as a promise.
  const { postId } = await params;
  return <PostDetailClient postId={postId} />;
}
