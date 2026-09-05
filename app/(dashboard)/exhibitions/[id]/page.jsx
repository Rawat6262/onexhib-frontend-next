import ExhibitionManageClient from "./exhibition-manage-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

// Next 15 hands `params` to Server Components as a Promise; the id is passed
// down as a prop instead of being read with useParams().
export const metadata = {
  title: "Manage Exhibition",
  robots: NOINDEX_NOFOLLOW,
};

export default async function ExhibitionManagePage({ params }) {
  const { id } = await params;
  return <ExhibitionManageClient id={id} />;
}
