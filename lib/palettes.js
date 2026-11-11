/**
 * The colour palettes a visitor can pick from the header (ThemePicker). The
 * colours themselves live in app/globals.css under :root[data-palette="<id>"];
 * this list is what the picker shows and what the pre-hydration script in
 * app/layout.jsx accepts from localStorage.
 *
 * `mode` is the light/dark mode a palette is first shown in - Midnight and
 * Rosso are dark-surface palettes, Chalk & Ink a light one. Picking one
 * switches to that mode once; the light/dark toggle still works afterwards.
 * `swatches` are the colours drawn in the picker, surface first. `font` is
 * the palette's heading face, used for its name in the picker as a preview.
 */
export const PALETTES = [
  {
    id: "default",
    name: "OneXhib",
    tagline: "The original navy",
    mode: null,
    swatches: ["#ffffff", "#131c55", "#2b3fb8"],
  },
  {
    id: "midnight",
    name: "Midnight",
    tagline: "Navy night, dusk blue",
    mode: "dark",
    swatches: ["#0d1a33", "#8fb4e3"],
  },
  {
    id: "chalk",
    name: "Chalk & Ink",
    tagline: "Editorial black and white",
    mode: "light",
    swatches: ["#f3f2ee", "#0b0b0c"],
    font: "var(--font-fraunces), Georgia, serif",
  },
  {
    id: "rosso",
    name: "Rosso",
    tagline: "Carbon and racing red",
    mode: "dark",
    swatches: ["#141518", "#eeece6", "#d40000"],
    font: "var(--font-barlow-condensed), sans-serif",
  },
];

export const PALETTE_STORAGE_KEY = "ox-palette";

/**
 * Runs inline in <head> before first paint, so a saved palette is on <html>
 * before anything renders - otherwise every page load would flash the default
 * colours first. Only known ids are applied.
 */
export const PALETTE_SCRIPT = `try{var p=localStorage.getItem(${JSON.stringify(PALETTE_STORAGE_KEY)});if(${JSON.stringify(
  PALETTES.filter((p) => p.id !== "default").map((p) => p.id),
)}.indexOf(p)>-1)document.documentElement.setAttribute("data-palette",p)}catch(e){}`;
