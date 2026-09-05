import { Poppins } from "next/font/google";
import Providers from "./providers";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";
import "./globals.css";

// The Vite app loaded Poppins via two <link> tags in index.html; next/font
// self-hosts it instead, which removes the render-blocking request.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata = {
  // Makes every per-page `alternates.canonical` and openGraph.url absolute.
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    // Pages set a bare title; the site name is appended once, here.
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // Default posture: pages opt IN to indexing via their own robots field.
  // Only the routes in INDEXABLE_ROUTES override this.
  robots: { index: false, follow: true },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  // Matches the two palettes in globals.css so mobile browser chrome follows the theme.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#030712" },
  ],
};

export default function RootLayout({ children }) {
  return (
    // suppressHydrationWarning is required by next-themes: it writes the theme
    // class onto <html> before React hydrates, which would otherwise mismatch.
    // (The old index.html hardcoded class="dark" here — deliberately dropped.)
    <html lang="en" suppressHydrationWarning className={poppins.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
