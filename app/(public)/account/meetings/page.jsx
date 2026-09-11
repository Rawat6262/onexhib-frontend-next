import Link from "next/link";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import MeetingsClient from "./meetings-client";

import { pageMetadata } from "@/lib/seo";

/**
 * /account/meetings — the signed-in user's meeting requests.
 *
 * PRIVATE, on the same terms as /account/saved: noindex,nofollow, no canonical,
 * no structured data, absent from the sitemap and from public navigation. The
 * payload contains the other party's name and email, so it must never reach a
 * shared cache or a crawler.
 *
 * It sits in the (public) route group for the site chrome only. Authorisation
 * is Express's: getMyMeetings returns 403 for anyone asking about a user other
 * than themselves.
 */

export const metadata = pageMetadata({
  title: "My meetings",
  description: "Meeting requests you have sent through OneXhib.",
  robots: { index: false, follow: false },
});

export default function MeetingsPage() {
  const trail = [
    { name: "Home", path: "/" },
    { name: "My meetings", path: "/account/meetings" },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Breadcrumbs trail={trail} />

      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          My meetings
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          Meeting requests you have sent to organisers, and where each one stands. Only you can see
          this list.
        </p>
      </header>

      <div className="mt-8">
        <MeetingsClient />
      </div>

      <p className="mt-10 border-t border-gray-200 pt-6 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-500">
        Looking for exhibitions you bookmarked?{" "}
        <Link
          href="/account/saved"
          className="font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300"
        >
          Saved exhibitions
        </Link>
      </p>
    </div>
  );
}
