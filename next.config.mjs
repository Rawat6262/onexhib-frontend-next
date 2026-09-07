import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Server-only. The browser never sees this value — every API call in the app
// stays a relative "/api/..." path and is proxied here, exactly like the old
// Vite dev proxy did. Keeps the uid cookie same-origin, so no CORS or backend
// cookie changes are needed, and the Flutter app is unaffected.
const BACKEND_URL = (process.env.BACKEND_URL || "").replace(/\/+$/, "");


// Content-Security-Policy, shipped in REPORT-ONLY mode.
//
// Report-Only cannot break the page: the browser evaluates the policy, logs any
// violation to the console, and loads the resource anyway. This is a measurement
// pass — browse the app, collect the violations, then tighten and enforce.
//
// Each source below is here because something in the app actually needs it:
//   style-src  'unsafe-inline'  react-select injects <style> at runtime, and
//                               CompanyPopupForm/ExcelUploadModal embed raw CSS
//   style-src  fonts.googleapis CompanyPopupForm's CSS @imports Inter from Google
//   font-src   fonts.gstatic    the font files that @import then pulls
//              (Poppins itself is self-hosted by next/font and needs only 'self')
//   img-src    https:          record images are hotlinked from whatever host
//                               the organiser supplied (Google's thumbnail
//                               cache, exhibitor sites, ...). See toPublicImage
//                               in lib/public-api.js. Narrowing this to hosts we
//                               own would blank out nearly every listing.
//   img/media  res.cloudinary   uploaded images and video rendered as raw <img>/
//                               <video>, bypassing next/image
//   img/media  blob:            URL.createObjectURL previews in the upload forms
//   connect-src 'self'          every API call is a relative /api/* path that the
//                               rewrite proxies, so no external origin is needed
//
// script-src keeps 'unsafe-inline' because Next.js emits inline bootstrap and
// RSC-payload scripts. Removing it requires per-request nonces from middleware,
// which would opt every page out of static prerendering — a real cost to the
// three public pages. That trade-off is a separate decision, not a silent one.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https://res.cloudinary.com",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Other lockfiles exist above this directory; pin the trace root so builds
  // don't infer the user's home folder as the workspace.
  outputFileTracingRoot: __dirname,

  // The Express API sends helmet headers; the frontend sent none. These are the
  // equivalents that are safe to apply globally.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Ignored over plain HTTP; takes effect once served over HTTPS.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Report-only: logs violations, blocks nothing. See CSP_REPORT_ONLY above.
          { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
        ],
      },
    ];
  },

  async rewrites() {
    if (!BACKEND_URL) {
      console.warn("[next.config] BACKEND_URL is not set — /api/* will not be proxied.");
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },

  images: {
    // Only hosts we serve ourselves. Third-party record images are rendered
    // with `unoptimized`, which bypasses this list entirely — deliberately, so
    // /_next/image never becomes an open resize proxy for arbitrary URLs.
    // Mirrors OPTIMISABLE_IMAGE_HOSTS in lib/public-api.js.
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
    // Serve AVIF/WebP to browsers that accept them. bg.png alone is ~2 MB as
    // PNG; these formats typically cut that by an order of magnitude.
    formats: ["image/avif", "image/webp"],
  },

  // Tree-shake icon barrel imports so a page that uses five lucide icons does
  // not pull the whole set into its bundle.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
