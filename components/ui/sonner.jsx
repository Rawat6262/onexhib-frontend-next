"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
import { CircleCheck, CircleX, Info, Loader2, TriangleAlert } from "lucide-react";

/**
 * Every toast in the app (toast.success / error / info / warning / loading /
 * promise) renders through this one Toaster, mounted once in app/providers.jsx.
 *
 * Sonner runs UNSTYLED here: it keeps doing the hard parts (stacking, swipe to
 * dismiss, pause on hover, screen-reader announcements) and the look is ours -
 * a frosted card with a coloured accent strip and a tinted icon badge per type,
 * matching the brand navy in light and dark mode. Call sites do not change.
 *
 * The accent colour is a CSS variable set by the type's class, so the strip,
 * the badge and the glow all follow it from one value.
 */

const badge = (Icon, extra = "") => (
  <span className="grid h-8 w-8 place-items-center rounded-full bg-[color-mix(in_oklab,var(--ox-accent)_14%,transparent)] text-[var(--ox-accent)] ring-1 ring-[color-mix(in_oklab,var(--ox-accent)_28%,transparent)]">
    <Icon size={17} strokeWidth={2.4} aria-hidden="true" className={extra} />
  </span>
);

const ICONS = {
  success: badge(CircleCheck),
  error: badge(CircleX),
  warning: badge(TriangleAlert),
  info: badge(Info),
  loading: badge(Loader2, "animate-spin"),
};

const Toaster = (props) => {
  const { resolvedTheme = "light" } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-right"
      closeButton
      duration={4500}
      visibleToasts={4}
      gap={10}
      offset={20}
      mobileOffset={12}
      icons={ICONS}
      className="toaster group"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: [
            // Default accent: brand indigo (plain toast() and toast.message()).
            "[--ox-accent:#4f46e5] dark:[--ox-accent:#818cf8]",
            "group/toast pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden",
            "rounded-2xl border border-gray-200/80 bg-white/95 py-3.5 pl-5 pr-10 font-sans",
            "shadow-[0_18px_40px_-14px_rgba(19,28,85,0.35)] backdrop-blur-xl",
            "dark:border-white/10 dark:bg-gray-900/90 dark:shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)]",
            // Accent strip on the left edge, and a soft glow of the same colour.
            "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[var(--ox-accent)]",
            "after:pointer-events-none after:absolute after:-left-10 after:-top-10 after:h-24 after:w-24 after:rounded-full",
            "after:bg-[var(--ox-accent)] after:opacity-[0.08] after:blur-2xl dark:after:opacity-[0.16]",
          ].join(" "),
          success: "[--ox-accent:#059669] dark:[--ox-accent:#34d399]",
          error: "[--ox-accent:#dc2626] dark:[--ox-accent:#f87171]",
          warning: "[--ox-accent:#d97706] dark:[--ox-accent:#fbbf24]",
          info: "[--ox-accent:#2563eb] dark:[--ox-accent:#60a5fa]",
          loading: "[--ox-accent:#4f46e5] dark:[--ox-accent:#818cf8]",
          icon: "mt-px flex shrink-0",
          content: "flex min-w-0 flex-1 flex-col gap-0.5 pt-1",
          title: "text-sm font-semibold leading-snug text-gray-900 dark:text-white",
          description: "text-[13px] leading-relaxed text-gray-600 dark:text-gray-400",
          closeButton: [
            "absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full",
            "text-gray-400 opacity-60 transition hover:bg-gray-100 hover:text-gray-700 hover:opacity-100",
            "group-hover/toast:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--ox-accent)]",
            "dark:hover:bg-white/10 dark:hover:text-white [&>svg]:h-3.5 [&>svg]:w-3.5",
          ].join(" "),
          actionButton: [
            "mt-1 shrink-0 self-center rounded-lg bg-gradient-to-r from-[#131C55] to-[#2B3FB8] px-3 py-1.5",
            "text-xs font-semibold text-white shadow-sm transition hover:brightness-110 dark:from-blue-600 dark:to-indigo-500",
          ].join(" "),
          cancelButton: [
            "mt-1 shrink-0 self-center rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700",
            "transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5",
          ].join(" "),
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
