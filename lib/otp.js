/**
 * Reading the `channels` block that every OTP-issuing endpoint returns.
 *
 * Shape, from Service/otpDelivery.js on the backend:
 *
 *   { email: true, sms: true, smsTo: "••••••3214" }   delivered to both
 *   { email: true, sms: false }                       email only
 *
 * WHY THE UI ASKS INSTEAD OF ASSUMING. The SMS is best effort on the server: no
 * API key configured, a non-Indian mobile number, or a gateway that refuses all
 * leave the code in the inbox and nowhere else, and none of those fail the
 * request. A screen hardcoded to "sent to your email and phone" would then send
 * the user to wait for a text that was never sent — so the copy is derived from
 * what actually happened.
 *
 * It is also forward-compatible on purpose: an endpoint that has not been
 * updated returns no `channels` at all, and that reads as email-only rather than
 * throwing or claiming an SMS.
 *
 * THIS IS SMS, NOT WHATSAPP. The provider endpoint is a DLT SMS route and cannot
 * deliver a WhatsApp message, so nothing here says WhatsApp. If a WhatsApp
 * channel is added later it arrives as its own flag in this block, and the copy
 * below is the one place that has to learn about it.
 */

/**
 * The masked destination to show, or "" when no SMS was sent.
 *
 * Only ever the masked form the server produced (last four digits). The full
 * number is deliberately not part of this response, so it cannot reach a URL,
 * an analytics payload or a screenshot from here.
 */
export function smsDestination(channels) {
  if (!channels || channels.sms !== true) return "";
  return typeof channels.smsTo === "string" ? channels.smsTo : "";
}

/** True when the code went to the user's phone as well as their inbox. */
export function sentBySms(channels) {
  return smsDestination(channels) !== "";
}

/**
 * The toast shown the moment a code is issued.
 *
 * `fallback` keeps each caller's own wording for the email-only case, which the
 * backend sometimes supplies in `data.message`.
 */
export function otpSentMessage(channels, fallback = "OTP sent to your email!") {
  return sentBySms(channels) ? "OTP sent to your email and phone (SMS)!" : fallback;
}

/**
 * Carries the masked destination to the next screen through the query string.
 *
 * The verify step is a separate navigation with no shared client state (the
 * App Router has no equivalent of React Router's `navigate` state — the same
 * reason `email` travels this way), and the value is already masked, so there is
 * nothing here worth hiding. Returns "" when there is nothing to carry, so a
 * caller can append it unconditionally.
 */
export function smsQueryParam(channels) {
  const masked = smsDestination(channels);
  return masked ? `&sms=${encodeURIComponent(masked)}` : "";
}

/**
 * Guards what comes back out of the query string.
 *
 * A query parameter is user-controlled, and this one is rendered. Anything that
 * is not the mask shape the server emits — bullets or dots followed by four
 * digits — is dropped rather than displayed, so the screen cannot be made to
 * show arbitrary text (a fake "call this number" line, say) by handing someone
 * a crafted link.
 */
export function parseSmsParam(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return /^[•.*•]{2,10}\d{4}$/.test(trimmed) ? trimmed : "";
}
