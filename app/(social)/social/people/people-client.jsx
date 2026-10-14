"use client";

import PeopleList from "@/components/social/PeopleList";

/**
 * People — the social graph's entrance.
 *
 * Until this page existed, following somebody required already having their profile URL.
 * There was no directory, no search and no suggestions, so a new account had a feed with
 * nothing in it and no way to change that. components/social/UserList.jsx documented the
 * gap in its empty state and deliberately printed no "find people" prompt, because there
 * was nowhere to send anyone.
 */
export default function PeopleClient() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
      <header>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl dark:text-gray-50">People</h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          Find organisers, exhibitors and service providers on OneXhib, and follow them to
          see their posts in your feed.
        </p>
      </header>

      <div className="mt-6">
        <PeopleList />
      </div>
    </div>
  );
}
