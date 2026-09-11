import Breadcrumbs from "@/components/public/Breadcrumbs";
import SavedClient from "./saved-client";

import { pageMetadata } from "@/lib/seo";

/**
 * /account/saved — the signed-in user's saved exhibitions.
 *
 * PRIVATE. This is personal data, and it is treated as such:
 *
 *  - robots is index:false, follow:false. Unlike the site's other non-indexed
 *    pages, `nofollow` is deliberate here: the links out are to exhibitions
 *    this particular person saved, and following them would let a crawler infer
 *    a personal collection from whatever it could reach.
 *  - It is absent from app/sitemap.js, from the public header and from the
 *    footer, so nothing advertises it to a crawler.
 *  - No canonical is emitted. A canonical is a hint for indexable content, and
 *    publishing one for a private page is a way to get it discovered.
 *  - The list itself is fetched in the browser against the user's own session
 *    (see saved-client.jsx). The server renders only this frame, so a personal
 *    list never enters an ISR cache shared between visitors.
 *
 * It lives in the (public) group for its chrome — the site header and footer,
 * so it looks like OneXhib rather than a dashboard — not for its access rules.
 * Authorisation is enforced by Express on every call, and the backend refuses
 * to return one user's saved records to another.
 */

export const metadata = pageMetadata({
  title: "Saved exhibitions",
  description: "Exhibitions you have saved to your OneXhib account.",
  robots: { index: false, follow: false },
});

export default function SavedPage() {
  const trail = [
    { name: "Home", path: "/" },
    { name: "Saved exhibitions", path: "/account/saved" },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* No JSON-LD: a private page should emit no structured data. */}
      <Breadcrumbs trail={trail} />

      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          Saved exhibitions
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          Exhibitions you have saved to your account. Only you can see this list.
        </p>
      </header>

      <div className="mt-8">
        <SavedClient />
      </div>
    </div>
  );
}
