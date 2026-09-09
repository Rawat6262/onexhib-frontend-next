import Script from "next/script";

/**
 * Google Consent Mode v2 defaults, set BEFORE Google Analytics loads.
 *
 * WHY THIS RUNS beforeInteractive: consent mode only works if the defaults are
 * on the dataLayer before gtag.js executes. If GA loads first it has already
 * decided it may write `_ga` cookies, and a later `consent update` cannot undo
 * that. So this is an inline, render-blocking script rather than a component
 * effect — a useEffect would run after hydration, which is far too late.
 *
 * Everything defaults to DENIED. The banner flips `analytics_storage` to
 * granted only when the visitor accepts, and a previous choice is restored
 * synchronously here so returning visitors are not asked twice and do not lose
 * a page view to the 500ms wait.
 *
 * `wait_for_update: 500` tells gtag to hold measurement briefly rather than
 * firing as denied the instant the page loads, which would drop the first
 * pageview of anyone who accepts.
 *
 * The ad_* signals stay denied permanently: the privacy policy commits to not
 * using cookies for advertising, and nothing here should quietly change that.
 */
export const CONSENT_KEY = "ox-analytics-consent";

const script = `
(function () {
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  var stored = null;
  try { stored = window.localStorage.getItem(${JSON.stringify(CONSENT_KEY)}); } catch (e) {}

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500
  });

  if (stored === 'granted') {
    gtag('consent', 'update', { analytics_storage: 'granted' });
  }
})();
`;

export default function ConsentGate() {
  return (
    <Script
      id="ga-consent-default"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
