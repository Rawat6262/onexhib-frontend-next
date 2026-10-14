import PeopleClient from "./people-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

/**
 * /social/people — the directory of people you could follow.
 *
 * PRIVATE, like the rest of the signed-in area: noindex/nofollow, absent from the
 * sitemap, no canonical, no JSON-LD. `nofollow` matters here specifically — the links out
 * are member profiles, and following them would let a crawler walk the member list.
 *
 * No protected data is fetched here. The page is a frame; PeopleClient does the
 * authenticated work in the browser against the viewer's own session, which is also what
 * lets the server build the list relative to THEM — their blocks excluded, their follow
 * state attached.
 */

export const metadata = {
  title: "People",
  robots: NOINDEX_NOFOLLOW,
};

export default function SocialPeoplePage() {
  return <PeopleClient />;
}
