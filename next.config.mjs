import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Server-only. The browser never sees this value — every API call in the app
// stays a relative "/api/..." path and is proxied here, exactly like the old
// Vite dev proxy did. Keeps the uid cookie same-origin, so no CORS or backend
// cookie changes are needed, and the Flutter app is unaffected.
const BACKEND_URL = (process.env.BACKEND_URL || "").replace(/\/+$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Other lockfiles exist above this directory; pin the trace root so builds
  // don't infer the user's home folder as the workspace.
  outputFileTracingRoot: __dirname,

  // The Express API sends helmet headers; the frontend sent none. These are the
  // equivalents that are safe to apply globally. A Content-Security-Policy is
  // deliberately NOT set here — Next needs per-request nonces for its inline
  // scripts, and a wrong CSP breaks the app silently, so it belongs in its own
  // change with real browser testing.
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
