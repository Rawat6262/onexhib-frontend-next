import HotelClient from "./hotel-client";
import { NOINDEX_NOFOLLOW } from "@/lib/seo";

export const metadata = {
  title: "My hotels",
  robots: NOINDEX_NOFOLLOW,
};

export default function HotelPage() {
  return <HotelClient />;
}
