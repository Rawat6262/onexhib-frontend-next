import MyPostsClient from "./my-posts-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

/**
 * /social/my-posts — where the signed-in user writes posts and manages their own.
 *
 * NOT /social/posts. That segment already holds /social/posts/[postId], the detail
 * page for ANY post, and the sub-nav highlights by path prefix — so a nav item at
 * /social/posts would light up "My posts" while reading somebody else's post.
 *
 * Private for the same reasons as /social: every read needs the uid cookie, so
 * it is noindex/nofollow, absent from the sitemap, and emits no canonical.
 */

export const metadata = {
  title: "My posts",
  robots: NOINDEX_NOFOLLOW,
};

export default function MyPostsPage() {
  return <MyPostsClient />;
}
