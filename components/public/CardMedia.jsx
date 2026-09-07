import Image from "next/image";

/**
 * Image slot for every public card, with the branded placeholder fallback.
 *
 * `image` is null whenever the record has no usable image URL at all (see
 * toPublicImage in lib/public-api.js). Rather than leaving a hole, the fallback
 * is a deliberate brand mark: a navy field, a subtle grid, and the record's
 * initials.
 * It is drawn in CSS/SVG, costs no request, and cannot 404.
 *
 * The initials make placeholders distinguishable from each other in a grid,
 * which a single repeated logo would not.
 *
 * `aspect` is a Tailwind aspect-ratio class; the wrapper is always ratio-fixed
 * so a card reserves its space before the image loads and contributes no CLS.
 */
export default function CardMedia({
  image,
  alt,
  label,
  sizes = "(min-width: 1024px) 320px, (min-width: 640px) 45vw, 85vw",
  aspect = "aspect-[16/10]",
  priority = false,
  className = "",
  // Cards crop to fill; small slots (a 56px logo tile) letterbox instead, since
  // cropping a wordmark to a square cuts half the name off. `fit` picks which,
  // and `bg` is the field the letterboxing shows — navy is right behind a photo,
  // wrong behind a logo drawn for a white page.
  fit = "cover",
  bg = "bg-[#131C55]",
}) {
  return (
    <div
      className={`relative ${aspect} w-full overflow-hidden ${image ? bg : "bg-[#131C55]"} ${className}`}
    >
      {image ? (
        <Image
          src={image.url}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          // Most record images are hotlinked from hosts we do not control, so
          // they are not in remotePatterns and cannot go through the optimiser.
          // See toPublicImage in lib/public-api.js.
          unoptimized={!image.optimized}
          className={fit === "contain" ? "object-contain p-1.5" : "object-cover"}
        />
      ) : (
        <Placeholder label={label} />
      )}
    </div>
  );
}

/** Initials from a record name: "India Textile Expo" -> "IT". */
function initials(label) {
  const words = String(label || "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "OX";
  return words
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/**
 * Decorative only — deliberately no alt text and aria-hidden. The card's
 * heading already names the record, so announcing a placeholder graphic would
 * be noise to a screen reader.
 */
function Placeholder({ label }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#131C55] via-[#182270] to-[#0E1B6B]"
    >
      {/* Faint grid, drawn once as an inline SVG data URI - no network request. */}
      <div
        className="absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Cpath d='M28 0H0v28' fill='none' stroke='%23ffffff' stroke-width='1'/%3E%3C/svg%3E\")",
        }}
      />
      <span className="relative text-3xl font-bold tracking-tight text-white/70 select-none">
        {initials(label)}
      </span>
    </div>
  );
}
