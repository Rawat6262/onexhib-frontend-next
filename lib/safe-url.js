/**
 * Scheme validation for user-supplied URLs.
 *
 * WHY THIS EXISTS
 * The social public user shape includes `website`, which is free text a user
 * typed at signup. The existing company page renders its equivalent straight
 * into an href:
 *
 *   <a href={company.website} target="_blank" rel="noopener noreferrer nofollow">
 *
 * `rel` does nothing about the scheme. A stored `javascript:...` value becomes a
 * link that runs script in the page's own origin when clicked, and `noreferrer`
 * cannot help with that. Social UI renders the same kind of value on every
 * profile, so it validates first rather than inheriting the pattern.
 *
 * The existing company page is deliberately NOT changed here — that is a
 * separately tracked pre-existing issue, and widening this phase to fix it would
 * mean touching a public SEO page for reasons unrelated to social.
 *
 * ALLOW-LIST, NOT SANITISATION
 * There is no attempt to repair a bad value. Trying to make `javascript:` safe,
 * or to guess that `example.com` meant `https://example.com`, is how a check like
 * this gets bypassed: every rewrite rule is a new thing an attacker can aim at.
 * A value either parses as an absolute http(s) URL or it is refused.
 *
 * A relative or protocol-relative value is refused too, even though neither can
 * execute script. `website` is an external address by definition, so `/admin` or
 * `//evil.example` in that field is not a link this app should render - the first
 * would point at OneXhib itself and the second at an origin chosen by whoever
 * filled in the form.
 */

/** Only these two schemes may ever reach an href. */
const ALLOWED_PROTOCOLS = Object.freeze(["http:", "https:"]);

/**
 * @param {unknown} value anything at all - a string, null, undefined, an object
 * @returns {string|null} the parsed absolute URL, or null when it is not safe
 *
 * The returned string is `URL`'s normalised serialisation rather than the input,
 * so what gets rendered is what the parser actually understood. That closes the
 * gap where a value parses one way here and is read another way by the browser.
 */
export function safeExternalUrl(value) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  let parsed;
  try {
    // No base argument, deliberately: with one, "/admin" and "example.com" would
    // both resolve against it and be accepted as same-origin links.
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  // `protocol` is already lower-cased by the parser, so "JavaScript:" and
  // "HTTPS:" both arrive here normalised and neither needs special handling.
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) return null;

  // A URL can carry an http: scheme and still have no host - "http:" alone
  // parses. Without a host there is nothing to navigate to.
  if (!parsed.hostname) return null;

  return parsed.toString();
}

export { ALLOWED_PROTOCOLS };
