/**
 * The site-wide ambient backdrop behind the top of every public page: two soft
 * brand glows and a fine grid that fades out downwards. It is the same
 * treatment as the home hero, applied once in the (public) layout, so every
 * listing, landing and detail page shares one visual language without each
 * page carrying its own decoration.
 *
 * Purely decorative: aria-hidden, pointer-events-none, behind content (-z-10
 * inside the layout's isolated <main>), CSS only — no image request and no
 * JavaScript. Pages with their own full-bleed hero (the home page) paint an
 * opaque background over it.
 */
export default function PageBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] overflow-hidden">
      <div className="absolute -top-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-ox-blue)_14%,transparent),transparent_65%)] dark:bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-ox-glow)_26%,transparent),transparent_65%)]" />
      <div className="absolute -top-24 -left-40 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-violet-600)_8%,transparent),transparent_65%)] dark:bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-ox-violet)_14%,transparent),transparent_65%)]" />
      <div
        className="absolute inset-0 text-ox-navy opacity-[0.05] [mask-image:linear-gradient(to_bottom,black,transparent)] dark:text-white dark:opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
    </div>
  );
}
