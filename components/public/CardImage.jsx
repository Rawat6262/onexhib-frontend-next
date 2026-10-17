"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * next/image with a fallback for images that exist in the record but fail to
 * load - a hotlinked logo whose host now answers 401/404, or an organiser's
 * Cloudinary asset that was made private (seen in production as "upstream image
 * response failed ... 401"). Without this the card showed the browser's
 * broken-image icon; with it, it shows the same branded placeholder as a record
 * with no image at all.
 *
 * `fallback` is rendered by the server and passed in, so the placeholder markup
 * stays in one place (CardMedia).
 */
export default function CardImage({ fallback, ...imageProps }) {
  const [failed, setFailed] = useState(false);
  if (failed) return fallback;
  // eslint-disable-next-line jsx-a11y/alt-text -- alt is passed through imageProps
  return <Image {...imageProps} onError={() => setFailed(true)} />;
}
