import ProfileClient from "./profile-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

/**
 * /social/profile/[userId] — a Community profile.
 *
 * PRIVATE. Every social read requires the uid cookie, so this carries
 * noindex/nofollow like the rest of the signed-in area, is absent from the
 * sitemap, and emits no canonical and no JSON-LD.
 *
 * The title is deliberately generic rather than the person's name: generating it
 * would mean fetching the profile during rendering, which would either need the
 * viewer's cookie on the server or leak one person's identity into a shared cache.
 * The name is rendered by the client component against the viewer's own session.
 *
 * No protected data is fetched here — the page is a frame, and ProfileClient does
 * the authenticated work in the browser. That matches how /account/saved and the
 * dashboard already work.
 */

export const metadata = {
  title: "Community profile",
  robots: NOINDEX_NOFOLLOW,
};

export default async function SocialProfilePage({ params }) {
  // Next 15 passes params as a promise.
  const { userId } = await params;
  return <ProfileClient userId={userId} />;
}
