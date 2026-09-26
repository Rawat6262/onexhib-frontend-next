/**
 * Tests for lib/safe-url.js.
 *
 * WHY THESE MATTER
 * The social public user shape carries `website`, typed by the user at signup.
 * The existing company page renders its equivalent straight into an href with no
 * scheme check, so a stored `javascript:` value would become a link that runs
 * script in the page's own origin. Social profiles render the same field on every
 * profile, so it is validated instead.
 *
 * Run: npm run test:social
 */
import { safeExternalUrl, ALLOWED_PROTOCOLS } from "../lib/safe-url.js";

let failed = 0;
function check(name, ok, detail = "") {
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

console.log("safe-url: accepted");

check("https is accepted", safeExternalUrl("https://example.com") !== null);
check("http is accepted", safeExternalUrl("http://example.com") !== null);
check("a path and query survive", safeExternalUrl("https://example.com/a/b?c=1#d") !== null);
check("surrounding whitespace is trimmed", safeExternalUrl("  https://example.com  ") !== null);
check(
  "the return value is the parser's normalised form, not the raw input",
  safeExternalUrl("https://example.com") === "https://example.com/",
  String(safeExternalUrl("https://example.com"))
);
check(
  "an uppercase scheme is normalised and accepted",
  safeExternalUrl("HTTPS://example.com") === "https://example.com/",
  String(safeExternalUrl("HTTPS://example.com"))
);
check("a mixed-case scheme is accepted", safeExternalUrl("HtTp://example.com") !== null);
check("only http and https are allowed", ALLOWED_PROTOCOLS.join(",") === "http:,https:");

console.log("");
console.log("safe-url: script-bearing schemes refused");

for (const hostile of [
  "javascript:alert(1)",
  "JavaScript:alert(1)",
  "  javascript:alert(1)  ",
  "java\tscript:alert(1)",
  "vbscript:msgbox(1)",
  "data:text/html,<script>alert(1)</script>",
  "data:text/plain,hello",
]) {
  check(`refused: ${JSON.stringify(hostile)}`, safeExternalUrl(hostile) === null, String(safeExternalUrl(hostile)));
}

console.log("");
console.log("safe-url: other schemes refused");

for (const other of ["file:///etc/passwd", "mailto:a@b.com", "tel:+123456", "ftp://example.com", "blob:https://example.com/x"]) {
  check(`refused: ${other}`, safeExternalUrl(other) === null, String(safeExternalUrl(other)));
}

console.log("");
console.log("safe-url: non-absolute refused");

// A relative or protocol-relative value cannot run script, but `website` is an
// external address by definition: "/admin" would point back at OneXhib and
// "//evil.example" at an origin chosen by whoever filled in the form.
for (const rel of ["//example.com", "/example", "example.com", "www.example.com", "./a", "../a", "?q=1", "#frag"]) {
  check(`refused: ${JSON.stringify(rel)}`, safeExternalUrl(rel) === null, String(safeExternalUrl(rel)));
}

console.log("");
console.log("safe-url: malformed and non-strings refused");

for (const bad of ["", "   ", "http://", "https://", "http:", "not a url", "://example.com"]) {
  check(`refused: ${JSON.stringify(bad)}`, safeExternalUrl(bad) === null, String(safeExternalUrl(bad)));
}
for (const [label, value] of [
  ["null", null],
  ["undefined", undefined],
  ["number", 42],
  ["object", { href: "https://example.com" }],
  ["array", ["https://example.com"]],
  ["boolean", true],
  ["a URL instance", new URL("https://example.com")],
]) {
  check(`refused: ${label}`, safeExternalUrl(value) === null, String(safeExternalUrl(value)));
}

check("it never throws on hostile input", (() => {
  for (const v of [null, undefined, {}, [], 0, NaN, "javascript:", "\u0000", "http://[", "https://%"]) {
    try {
      safeExternalUrl(v);
    } catch {
      return false;
    }
  }
  return true;
})());

console.log("");
console.log(failed ? `=== ${failed} FAILED ===` : "=== all passed ===");
process.exit(failed ? 1 : 0);
