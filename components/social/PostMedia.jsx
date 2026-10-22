import Image from "next/image";

import { renderableMedia, isOptimisableMedia, mediaAlt } from "@/lib/social/post";

/**
 * A post's attached media.
 *
 * next/image, NOT a raw <img>, and no config change was needed. Social uploads
 * land on res.cloudinary.com, which next.config.mjs already lists in
 * remotePatterns — so social images go through the optimiser exactly as
 * exhibition images do. Anything on another host renders with `unoptimized`,
 * mirroring CardMedia and OPTIMISABLE_IMAGE_HOSTS in lib/public-api.js. That
 * convention exists so /_next/image never becomes an open resize proxy for
 * arbitrary URLs, and remotePatterns is deliberately NOT widened for social.
 *
 * `fill` inside a fixed-ratio wrapper, because the wire contract carries no
 * dimensions — { id, type, url, thumbnailUrl } and nothing more. A ratio-fixed
 * box also reserves its space before the image loads, so a feed does not jump as
 * it fills in.
 *
 * VIDEO IS NEVER EAGER. `controls` with `preload="metadata"` fetches only enough
 * to show duration and a first frame; a feed of autoplaying videos would be both
 * a bandwidth problem and a hostile reading experience. thumbnailUrl becomes the
 * poster when present, so a video still shows something before it is touched.
 *
 * Not a client component: media has no state and no handlers.
 */
export default function PostMedia({ media }) {
  const items = renderableMedia(media);
  if (!items.length) return null;

  const count = items.length;
  // One item gets the full width; anything more goes two-up and wraps. Bounded on
  // purpose — the backend allows up to ten items, and ten full-width images would
  // make one post longer than a screen several times over.
  const grid = count === 1 ? "grid-cols-1" : "grid-cols-2";

  /*
   * NEVER CROPPED. Images used to fill a fixed 16:10 box with object-cover, which
   * cut the top and bottom off anything squarer - a poster lost its last row of
   * text. Now:
   *   - one image shows at its own shape, full width, capped at ~75% of the
   *     screen height for very tall ones;
   *   - in a grid each tile is square but the WHOLE picture is shown inside it.
   * Wherever the picture does not fill its box, the gap is a soft, dimmed copy
   * of the same image rather than flat grey bars.
   *
   * The backdrop asks for a TINY rendition (sizes="24px": a ~32px-wide file from
   * the optimiser). Stretched up it is already soft, so it needs only a light
   * blur - a heavy blur over a full-size image is expensive to paint and made
   * long feeds sluggish on modest phones.
   */
  const backdrop = (item) => (
    <Image
      src={item.url}
      alt=""
      aria-hidden="true"
      fill
      sizes="24px"
      quality={40}
      unoptimized={!isOptimisableMedia(item.url)}
      className="scale-110 object-cover opacity-60 blur-md dark:opacity-45"
    />
  );

  return (
    <ul className={`mt-3 grid list-none gap-2 ${grid}`}>
      {items.map((item, index) => (
        <li
          key={item.id || `${item.url}-${index}`}
          // An odd last item in a two-column grid spans both, so a three-image
          // post does not leave a hole.
          className={count > 1 && count % 2 === 1 && index === count - 1 ? "col-span-2" : ""}
        >
          {item.type === "IMAGE" && count === 1 ? (
            <div className="relative flex w-full justify-center overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
              {backdrop(item)}
              <Image
                src={item.url}
                alt={mediaAlt(index, count, "IMAGE")}
                width={0}
                height={0}
                sizes="(min-width: 768px) 640px, 100vw"
                unoptimized={!isOptimisableMedia(item.url)}
                className="relative h-auto max-h-[min(75vh,720px)] w-auto max-w-full object-contain"
                style={{ width: "auto", height: "auto" }}
              />
            </div>
          ) : (
          <div
            className={`relative ${
              count === 1
                ? "aspect-video"
                : // The odd last tile spans both columns, so it is wide, not a huge square.
                  count % 2 === 1 && index === count - 1
                  ? "aspect-[2/1]"
                  : "aspect-square"
            } w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800`}
          >
            {item.type === "IMAGE" ? (
              <>
                {backdrop(item)}
                <Image
                  src={item.url}
                  alt={mediaAlt(index, count, "IMAGE")}
                  fill
                  sizes="(min-width: 768px) 640px, 100vw"
                  unoptimized={!isOptimisableMedia(item.url)}
                  className="object-contain"
                />
              </>
            ) : (
              <video
                src={item.url}
                poster={item.thumbnailUrl || undefined}
                controls
                preload="metadata"
                // Without this the player has no accessible name: images carry alt
                // text and a <video> carries none of its own.
                aria-label={mediaAlt(index, count, "VIDEO")}
                className="absolute inset-0 h-full w-full bg-black object-contain"
              />
            )}
          </div>
          )}
        </li>
      ))}
    </ul>
  );
}
