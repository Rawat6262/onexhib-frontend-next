import { ImageResponse } from "next/og";

// Home-screen icon for iOS. Same mark as app/icon.jsx at the size Apple asks
// for, with padding so the glyph survives the rounded-corner mask.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#131C55",
          color: "white",
          fontSize: 110,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        X
      </div>
    ),
    size
  );
}
