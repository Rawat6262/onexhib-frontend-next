"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Palette } from "lucide-react";
import { PALETTES, PALETTE_STORAGE_KEY } from "@/lib/palettes";

/**
 * Colour palette picker for the header, next to the light/dark ThemeToggle.
 *
 * The chosen palette is a data-palette attribute on <html> (globals.css does
 * the rest) and is remembered in localStorage; app/layout.jsx re-applies it
 * before first paint. It is a separate axis from next-themes' light/dark, so
 * this does not replace ThemeToggle - picking a palette only moves to the
 * mode that palette is designed around, once.
 */
export default function ThemePicker({ className = "" }) {
  const { setTheme } = useTheme();
  const [palette, setPalette] = useState("default");
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    setPalette(document.documentElement.dataset.palette || "default");
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (p) => {
    const root = document.documentElement;
    if (p.id === "default") root.removeAttribute("data-palette");
    else root.setAttribute("data-palette", p.id);
    try {
      if (p.id === "default") localStorage.removeItem(PALETTE_STORAGE_KEY);
      else localStorage.setItem(PALETTE_STORAGE_KEY, p.id);
    } catch {
      // Storage blocked (private mode): the palette still applies to this page.
    }
    if (p.mode) setTheme(p.mode);
    setPalette(p.id);
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    // Static below sm, so the menu anchors to the (sticky, so positioned)
    // header's right edge rather than this button, which sits too far left on
    // a phone for a menu this wide to open under it without being clipped.
    <div ref={rootRef} className="relative max-sm:static">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Choose colour theme"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${className}`}
      >
        <Palette size={18} aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Colour theme"
          className="ox-menu-in absolute right-0 top-full z-50 mt-2 w-64 max-sm:right-4 rtl:left-0 rtl:right-auto max-sm:rtl:left-4 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-gray-800 dark:bg-gray-900"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Theme
          </p>
          {PALETTES.map((p) => {
            const active = p.id === palette;
            return (
              <button
                key={p.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => choose(p)}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {/* Literal hexes, not utilities: each row shows its own palette
                    whatever palette is currently applied. */}
                <span className="flex shrink-0 -space-x-1.5" aria-hidden="true">
                  {p.swatches.map((c) => (
                    <span
                      key={c}
                      className="size-5 rounded-full ring-2 ring-white dark:ring-gray-900"
                      style={{ backgroundColor: c, boxShadow: "inset 0 0 0 1px rgb(0 0 0 / 0.12)" }}
                    />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block leading-tight ${p.font ? "text-[15px] font-semibold" : ""}`}
                    style={p.font ? { fontFamily: p.font } : undefined}
                  >
                    {p.name}
                  </span>
                  <span className="block truncate text-xs font-normal text-gray-500 dark:text-gray-400">{p.tagline}</span>
                </span>
                {active ? <Check size={16} aria-hidden="true" className="shrink-0 text-ox-blue dark:text-blue-300" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
