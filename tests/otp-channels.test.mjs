/**
 * Tests for lib/otp.js.
 *
 * WHY THESE MATTER
 * The OTP now goes to the account's mobile number as well as its email, but the
 * SMS is best effort on the server: no gateway key configured, a non-Indian
 * number, or a gateway that refuses all leave the code in the inbox and nowhere
 * else, and none of those fail the request. So the three OTP screens must derive
 * their copy from what the response says happened. A screen that hardcoded "sent
 * to your email and phone" would send users to wait for a text that was never
 * sent — which is the exact failure this module exists to prevent.
 *
 * The parse guard matters for a second reason: the masked destination travels
 * between screens in the query string, so it is user-controlled input that gets
 * rendered.
 *
 * Run: npm run test:otp
 */
import {
  smsDestination,
  sentBySms,
  otpSentMessage,
  smsQueryParam,
  parseSmsParam,
} from "../lib/otp.js";

let failed = 0;
function check(name, ok, detail = "") {
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

const BOTH = { email: true, sms: true, smsTo: "••••••3214" };
const EMAIL_ONLY = { email: true, sms: false };

console.log("otp channels: reading the server's channels block");

check("a delivered SMS yields its masked destination", smsDestination(BOTH) === BOTH.smsTo);
check("an email-only send yields no destination", smsDestination(EMAIL_ONLY) === "");
check("sentBySms agrees with the destination", sentBySms(BOTH) && !sentBySms(EMAIL_ONLY));

console.log("");
console.log("otp channels: absent or malformed blocks never claim an SMS");

// An endpoint that predates the feature returns no channels at all. That has to
// read as email-only rather than throwing or over-promising.
check("a missing block is email-only", smsDestination(undefined) === "" && smsDestination(null) === "");
check("an empty block is email-only", smsDestination({}) === "");
check(
  "sms:true without a destination still claims nothing",
  smsDestination({ email: true, sms: true }) === "",
  "a flag with no number is nothing to show the user"
);
check(
  "a non-string destination is ignored",
  smsDestination({ email: true, sms: true, smsTo: 6280943214 }) === ""
);
check(
  "a truthy-but-not-true sms flag does not count",
  smsDestination({ email: true, sms: "yes", smsTo: "••••••3214" }) === "",
  "only an explicit true means delivered"
);

console.log("");
console.log("otp channels: the copy follows the delivery");

check(
  "both channels are named when both fired",
  otpSentMessage(BOTH).includes("email") && otpSentMessage(BOTH).includes("phone")
);
check(
  "the caller's own wording survives for email-only",
  otpSentMessage(EMAIL_ONLY, "Custom message") === "Custom message"
);
check(
  "email-only copy never mentions the phone",
  !otpSentMessage(EMAIL_ONLY).toLowerCase().includes("phone")
);
check(
  "the copy never says WhatsApp",
  // The gateway is a DLT SMS route and cannot deliver a WhatsApp message. If
  // this ever fails, users are being pointed at the wrong app.
  !otpSentMessage(BOTH).toLowerCase().includes("whatsapp"),
  otpSentMessage(BOTH)
);

console.log("");
console.log("otp channels: carrying the destination between screens");

check("a delivered SMS produces an appendable param", smsQueryParam(BOTH).startsWith("&sms="));
check("the param is URL-encoded", smsQueryParam(BOTH).includes("%E2%80%A2"));
check("email-only produces nothing to append", smsQueryParam(EMAIL_ONLY) === "");
check(
  "a round trip through the query string survives",
  parseSmsParam(decodeURIComponent(smsQueryParam(BOTH).replace("&sms=", ""))) === BOTH.smsTo
);

console.log("");
console.log("otp channels: the rendered param is guarded");

check("the server's mask shape is accepted", parseSmsParam(BOTH.smsTo) === BOTH.smsTo);
check("surrounding whitespace is trimmed", parseSmsParam(`  ${BOTH.smsTo}  `) === BOTH.smsTo);
check("a dotted mask is accepted", parseSmsParam("......3214") === "......3214");

// A crafted link must not be able to put arbitrary text on the verify screen —
// "call 1800-xxx to verify" next to the real address would read as ours.
check("free text is rejected", parseSmsParam("call 1800-555-0100 now") === "");
check("a bare full number is rejected", parseSmsParam("6280943214") === "");
check("markup is rejected", parseSmsParam("<img src=x onerror=alert(1)>") === "");
check("a mask with too few digits is rejected", parseSmsParam("••••••321") === "");
check("a mask with too many digits is rejected", parseSmsParam("••••••32145") === "");
check("an over-long mask is rejected", parseSmsParam(`${"•".repeat(40)}3214`) === "");
check("a non-string is rejected", parseSmsParam(undefined) === "" && parseSmsParam(42) === "");
check("an empty string is rejected", parseSmsParam("") === "");

console.log("");
console.log(failed ? `=== ${failed} FAILED ===` : "=== all passed ===");
process.exit(failed ? 1 : 0);
