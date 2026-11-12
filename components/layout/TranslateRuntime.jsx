"use client";

import { useEffect } from "react";
import { restoreLanguage } from "@/lib/translate";

/**
 * Re-applies a visitor's chosen language on every page load (lib/translate.js).
 * Mounted once in the root layout, so it covers pages without the site header
 * too. Runs after hydration on purpose: the widget rewrites text nodes, and
 * doing that before React has hydrated them would be a hydration mismatch.
 * Renders nothing; for English visitors it does nothing at all.
 */
export default function TranslateRuntime() {
  useEffect(() => {
    restoreLanguage();
  }, []);
  return null;
}
