import NotificationsClient from "./notifications-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

/**
 * /social/notifications — the in-app inbox.
 *
 * PRIVATE, AND MORE OBVIOUSLY SO THAN THE REST. Every row is addressed to one
 * person: the backend pins `recipient: req.user._id` into every query here, so this
 * page has no shareable form at all. noindex/nofollow like the rest of the signed-in
 * area, absent from the sitemap, no canonical and no JSON-LD.
 *
 * No protected data is fetched here — the page is a frame, and NotificationsClient
 * does the authenticated work in the browser. Same shape as the profile and post
 * detail routes.
 */

export const metadata = {
  title: "Notifications",
  robots: NOINDEX_NOFOLLOW,
};

export default function SocialNotificationsPage() {
  return <NotificationsClient />;
}
