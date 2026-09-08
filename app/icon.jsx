import { ImageResponse } from "next/og";

// Generated rather than shipped as a file, for the same reason as
// opengraph-image.jsx: it stays in sync with the brand colour and needs no
// design asset. public/Dark.png is a 200x45 wordmark, so there is no square
// logo to crop — the X is the distinctive letter and stays legible at 16px.
//
// Dropping a real app/icon.png into this folder later overrides this file.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 22,
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
