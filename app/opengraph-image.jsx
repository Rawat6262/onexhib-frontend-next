import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/seo";

export const alt = `${SITE_NAME} — exhibitions, exhibitors and products`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Generated rather than shipped as a static file so it stays in sync with the
// brand colours and needs no design asset. Deliberately plain: a real cover
// image can replace this file later without touching any page.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #131C55 0%, #0E1B6B 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: "-0.03em" }}>
          {SITE_NAME}
        </div>
        <div style={{ fontSize: 38, marginTop: 24, opacity: 0.85, maxWidth: 900, lineHeight: 1.35 }}>
          Exhibitions, exhibitors and products — managed in one place.
        </div>
      </div>
    ),
    size
  );
}
