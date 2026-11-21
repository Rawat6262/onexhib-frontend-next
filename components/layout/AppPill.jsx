import Link from "next/link";
import { ChevronRight, Smartphone } from "lucide-react";

import { APP_LINK } from "@/components/layout/nav-config";

/**
 * "Get the app" call to action in the site header, linking to /get-app.
 *
 * Deliberately louder than the rest of the bar: a spinning gradient ring
 * (CSS-only, .ox-app-pill in globals.css, still under reduced motion) and a
 * phone icon that gives an occasional wiggle. No JavaScript, so it is safe in
 * both the server-rendered header and the MegaNav client island.
 *
 *   variant="pill"  the desktop bar (MegaNav, xl and up)
 *   variant="icon"  a round icon button for the bar between sm and xl, where
 *                   there is room for 36px but not for the label
 *   variant="row"   the top row of the phone menu
 */
export default function AppPill({ variant = "pill", className = "" }) {
  if (variant === "row") {
    return (
      <Link
        href={APP_LINK.href}
        className={`group mb-1 flex items-center gap-3 rounded-xl bg-gradient-to-r from-ox-navy via-ox-blue to-ox-iris p-3 text-white shadow-md shadow-ox-navy/20 ${className}`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
          <Smartphone size={18} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">Get the OneXhib app</span>
          <span className="block text-[12px] text-white/80">For iPhone and Android</span>
        </span>
        <ChevronRight size={16} aria-hidden="true" className="opacity-80 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </Link>
    );
  }

  if (variant === "icon") {
    return (
      <Link
        href={APP_LINK.href}
        aria-label={APP_LINK.label}
        title={APP_LINK.label}
        className={`ox-app-pill flex h-9 w-9 items-center justify-center rounded-full text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ox-navy dark:text-gray-900 ${className}`}
      >
        <Smartphone size={16} aria-hidden="true" className="ox-app-icon" />
      </Link>
    );
  }

  return (
    <Link
      href={APP_LINK.href}
      className={`ox-app-pill inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ox-navy motion-reduce:transition-none motion-reduce:hover:scale-100 dark:text-gray-900 ${className}`}
    >
      <Smartphone size={15} aria-hidden="true" className="ox-app-icon shrink-0" />
      {APP_LINK.label}
    </Link>
  );
}
