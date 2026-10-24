import Breadcrumbs from "@/components/public/Breadcrumbs";
import ProfileClient from "./profile-client";

import { pageMetadata } from "@/lib/seo";

/**
 * /account/profile - "Your profile": one place to edit who you are on
 * OneXhib. The account details (name, company, location) and the Community
 * profile (photo, cover, headline, bio) are saved together, and the Community
 * profile shows the same data, so there is nothing to keep in sync.
 *
 * Private, like /account/saved: not indexed, not in the sitemap, and the data
 * is fetched in the browser against the user's own session (profile-client).
 */
export const metadata = pageMetadata({
  title: "Your profile",
  description: "Edit your OneXhib profile.",
  robots: { index: false, follow: false },
});

export default function ProfilePage() {
  const trail = [
    { name: "Home", path: "/" },
    { name: "Your profile", path: "/account/profile" },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Breadcrumbs trail={trail} />
      <ProfileClient />
    </div>
  );
}
