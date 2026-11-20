import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

/**
 * /manifest.webmanifest
 *
 * Needed for browser notifications on iPhone and iPad: iOS offers web push only
 * to a site added to the Home Screen that opens as a standalone web app. It also
 * gives Android's "Install app" a proper name and icon. Nothing else depends on it.
 */
export default function manifest() {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#131c55",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
