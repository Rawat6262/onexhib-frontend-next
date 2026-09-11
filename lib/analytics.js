/**
 * Thin wrapper over the GA4 gtag already loaded by app/layout.jsx.
 *
 * This is NOT a second analytics system. There is one tag, loaded once, behind
 * the consent gate in components/analytics/ConsentGate.jsx; this only gives the
 * rest of the app a safe way to reach it.
 *
 * WHY A WRAPPER AT ALL
 *  - `window.gtag` does not exist when NEXT_PUBLIC_GA_ID is unset, when consent
 *    has been declined, during SSR, or before the script has run. Every call
 *    site would otherwise need the same four guards.
 *  - It keeps the event vocabulary in one file instead of scattered string
 *    literals that drift apart.
 *
 * PRIVACY: never pass an email, a user id, a raw search query or anything else
 * that identifies a person. The parameters below are deliberately shapes and
 * counts — what kind of thing happened, not who did it or what they typed.
 */

/** Fire a GA4 event. Silently does nothing when analytics is unavailable. */
export function trackEvent(name, params = {}) {
  if (typeof window === "undefined") return;
  const gtag = window.gtag;
  if (typeof gtag !== "function") return;
  try {
    gtag("event", name, params);
  } catch {
    /* analytics must never break a user interaction */
  }
}

/**
 * AI search submitted. `query_length` rather than the query itself: the length
 * is enough to tell whether people write phrases or keywords, and the text
 * could contain anything.
 */
export const trackAiSearch = (queryLength, resultCount) =>
  trackEvent("ai_search_submitted", {
    query_length: Number(queryLength) || 0,
    result_count: Number(resultCount) || 0,
  });

/** A result opened from the AI search panel, with its position in the list. */
export const trackAiSearchResultClick = (position) =>
  trackEvent("ai_search_result_click", { position: Number(position) || 0 });

/** Exhibition saved or unsaved. No exhibition id — that is the user's business. */
export const trackSaveToggled = (saved) =>
  trackEvent(saved ? "exhibition_saved" : "exhibition_unsaved", {});

/** A brochure link followed from an exhibition page. */
export const trackBrochureDownload = () => trackEvent("brochure_downloaded", {});
