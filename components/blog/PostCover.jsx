import DataBars from "@/components/blog/DataBars";
import SeasonCurve from "@/components/blog/SeasonCurve";

/**
 * Cover art for a post, built from the data the post is actually about.
 *
 * WHY NOT A PHOTOGRAPH
 * A stock shot of a conference hall would be decoration that says nothing, and
 * on a page whose whole argument is "these articles are written from the
 * catalogue" it would quietly contradict the copy. Every post here analyses the
 * live data, so its cover shows that data: the geography piece gets the country
 * distribution, the calendar piece gets the season curve. The cover is the
 * article's thesis at a glance, and it is always current because it is rendered
 * from the same source the prose was written from.
 *
 * Real exhibition photography does appear on this page - in the hero, drawn from
 * actual listings that carry their own images. It illustrates the catalogue,
 * which is a claim the images can honestly support.
 *
 * `kind` comes from the post's own meta, so adding a post means choosing a cover
 * rather than editing this file.
 */
export default function PostCover({ kind, data, compact = false }) {
  const frame =
    "relative flex h-full w-full flex-col justify-center overflow-hidden bg-gradient-to-br from-[#F5F6FB] via-white to-[#EEF0FA] p-5 sm:p-6 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900";

  if (kind === "season" && data?.monthly) {
    return (
      <div className={frame}>
        <Grid />
        <p className="relative text-[11px] font-semibold uppercase tracking-wide text-[#131C55] dark:text-blue-300">
          Listings by month
        </p>
        <div className="relative mt-3">
          <SeasonCurve monthly={data.monthly} />
        </div>
      </div>
    );
  }

  if (kind === "geography" && data?.topCountries?.length) {
    return (
      <div className={frame}>
        <Grid />
        <p className="relative text-[11px] font-semibold uppercase tracking-wide text-[#131C55] dark:text-blue-300">
          Listings by country
        </p>
        <div className="relative mt-3">
          <DataBars rows={data.topCountries.slice(0, compact ? 3 : 5)} unitLabel="listings" />
        </div>
      </div>
    );
  }

  // No matching data: a branded field rather than a broken slot. Mirrors the
  // fallback contract in CardMedia.
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#131C55]">
      <Grid light />
      <span className="relative text-[13px] font-semibold uppercase tracking-[0.2em] text-white/70">
        OneXhib
      </span>
    </div>
  );
}

/** Decorative grid, drawn in CSS - no request, no CLS. */
function Grid({ light = false }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${light ? "opacity-[0.18]" : "opacity-[0.5] dark:opacity-[0.25]"}`}
      style={{
        backgroundImage: light
          ? "linear-gradient(to right, rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.5) 1px, transparent 1px)"
          : "linear-gradient(to right, rgba(19,28,85,.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(19,28,85,.07) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    />
  );
}
