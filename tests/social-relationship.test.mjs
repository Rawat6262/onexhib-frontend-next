/**
 * Block, mute and report on the frontend (Phase 12 completion).
 *
 * WHAT THIS COVERS: the pure rules in lib/social/relationship.js — the reason enum, the
 * strict request body, the OTHER conditional, the details cap, the confirmation
 * asymmetry, server-authoritative state, the self exclusion and the neutral error copy —
 * plus source-level assertions about the components and API wrappers that consume them.
 *
 * WHAT IT DOES NOT COVER, AND CANNOT: this repository has no DOM test framework, so
 * nothing here renders anything. Focus trapping, keyboard navigation and screen-reader
 * output in ReportDialog and RelationshipMenu are reviewed by reading, not proven here.
 * Adding Vitest + Testing Library would be the only way to prove them, and that is a
 * separate dependency decision.
 *
 * THE SOURCE ASSERTIONS ARE THE POINT, not a consolation. The ways these three features
 * go wrong are invisible to a rendering test: reporting a post through the user route,
 * spreading a form object into a strict-allow-list body, remembering a block in
 * localStorage, or branching on a 404 to tell the viewer they have been blocked. Each of
 * those is a source-level fact, and each has an assertion below.
 *
 * Run: npm run test:social
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  REPORT_DETAILS_MAX,
  REPORT_BODY_FIELDS,
  buildReportPayload,
  validateReport,
  reportDetailsRemaining,
  planBlock,
  planMute,
  confirmedFlag,
  canActOn,
  describeRelationshipError,
  REPORT_SUCCESS_MESSAGE,
  REPORT_FORBIDDEN_CLAIMS,
} from "../lib/social/relationship.js";

let failed = 0;
let passed = 0;
function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log("  PASS  " + name);
  } else {
    failed++;
    console.log("  FAIL  " + name + (detail ? "  — " + detail : ""));
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => fs.readFileSync(path.join(here, "..", rel), "utf8");

/**
 * CRLF-SAFE, and that is not incidental. A `//.*$` with /m is a silent no-op on CRLF
 * sources — `.` stops before the \r and the anchor never matches — which made five of
 * this repo's suites strip nothing at all until Phase 12H.0. `\r` is removed first here
 * so the line comments actually go.
 */
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((l) => l.replace(/\r$/, "").replace(/\/\/.*/, ""))
    .join("\n");

/** Tailwind writes `outline-offset-2`, which matches an /offset/ grep. */
const stripClasses = (s) => s.replace(/className=(\{`[^`]*`\}|\{[^}]*\}|"[^"]*")/g, 'className=""');

const apiSrc = stripComments(read("models/social.model.js"));
const menuSrc = stripComments(read("components/social/RelationshipMenu.jsx"));
const dialogSrc = stripComments(read("components/social/ReportDialog.jsx"));
const listSrc = stripComments(read("components/social/BlockedUserList.jsx"));
const relSrc = stripComments(read("lib/social/relationship.js"));
const privacyPageSrc = read("app/(social)/social/privacy/page.jsx");
const privacyClientSrc = stripComments(read("app/(social)/social/privacy/privacy-client.jsx"));
const layoutSrc = stripComments(read("app/(social)/layout.jsx"));
const profileClientSrc = stripComments(
  read("app/(social)/social/profile/[userId]/profile-client.jsx")
);
const headerSrc = stripComments(read("components/social/ProfileHeader.jsx"));

// ═══════════════════════════════════════════════════════ the report contract
console.log("report — the contract the backend actually enforces");

check(
  "1. the reason enum is exactly the backend's seven values, in order",
  JSON.stringify(REPORT_REASONS)
    === JSON.stringify([
      "SPAM", "HARASSMENT", "HATE_SPEECH", "SEXUAL_CONTENT",
      "VIOLENCE", "IMPERSONATION", "OTHER",
    ]),
  JSON.stringify(REPORT_REASONS)
);
check("2. every reason has a human label", REPORT_REASONS.every((r) => typeof REPORT_REASON_LABELS[r] === "string" && REPORT_REASON_LABELS[r].length > 0));
check(
  "3. no label is sent as a value — the enum member is",
  Object.values(REPORT_REASON_LABELS).every((l) => !REPORT_REASONS.includes(l))
);
check("4. the details cap matches SocialReport.DETAILS_MAX", REPORT_DETAILS_MAX === 1000, String(REPORT_DETAILS_MAX));
check(
  "5. the body allow-list is exactly reason and details",
  JSON.stringify([...REPORT_BODY_FIELDS].sort()) === JSON.stringify(["details", "reason"]),
  JSON.stringify(REPORT_BODY_FIELDS)
);

// The body is a STRICT allow-list server-side: an unknown key is REFUSED, not ignored.
{
  const built = buildReportPayload({
    reason: "SPAM",
    details: "  hello  ",
    // Everything below is derived server-side from the session and the path. A client
    // that sends any of them gets a 400.
    targetType: "POST",
    reporter: "abc",
    reportedUser: "def",
    reportedPost: "ghi",
    reportedComment: "jkl",
    actor: "mno",
    recipient: "pqr",
    dedupeKey: "stu",
  });
  check(
    "6. buildReportPayload emits ONLY reason and details",
    JSON.stringify(Object.keys(built).sort()) === JSON.stringify(["details", "reason"]),
    JSON.stringify(Object.keys(built))
  );
  check("7. and it trims details", built.details === "hello", JSON.stringify(built.details));
  for (const forbidden of ["targetType", "reporter", "reportedUser", "reportedPost",
    "reportedComment", "actor", "recipient", "dedupeKey"]) {
    check("8. " + forbidden + " never reaches the body", !(forbidden in built));
  }
}
{
  const built = buildReportPayload({ reason: "SPAM", details: "   " });
  check("9. whitespace-only details are omitted entirely, not sent as \"\"", !("details" in built), JSON.stringify(built));
  const bare = buildReportPayload({ reason: "SPAM" });
  check("10. absent details are omitted", JSON.stringify(bare) === JSON.stringify({ reason: "SPAM" }));
}

console.log("");
console.log("report — validation mirrors the server, not something softer");

check("11. an empty reason is refused", validateReport({ reason: "", details: "x" }).ok === false);
check("12. a reason outside the enum is refused", validateReport({ reason: "NOT_A_REASON", details: "x" }).ok === false);
check("13. a lowercase reason is refused — the enum is case-sensitive", validateReport({ reason: "spam" }).ok === false);
check("14. OTHER with no details is refused", validateReport({ reason: "OTHER", details: "" }).ok === false);
check("15. OTHER with whitespace-only details is refused", validateReport({ reason: "OTHER", details: "   " }).ok === false);
check("16. and the error points at the details field", validateReport({ reason: "OTHER" }).field === "details");
check("17. OTHER with details is accepted", validateReport({ reason: "OTHER", details: "it was bad" }).ok === true);
check("18. every non-OTHER reason is accepted with no details", REPORT_REASONS.filter((r) => r !== "OTHER").every((r) => validateReport({ reason: r }).ok === true));
check("19. details exactly at the cap are accepted", validateReport({ reason: "SPAM", details: "a".repeat(1000) }).ok === true);
check("20. details one over the cap are refused", validateReport({ reason: "SPAM", details: "a".repeat(1001) }).ok === false);
check("21. the cap is measured AFTER trimming, as the server does", validateReport({ reason: "SPAM", details: " " + "a".repeat(1000) + " " }).ok === true);
check("22. a non-string reason does not throw", validateReport({ reason: 42 }).ok === false);
check("23. a null form does not throw", validateReport(null).ok === false);
check("24. undefined does not throw", validateReport(undefined).ok === false);
check("25. the remaining counter never goes negative", reportDetailsRemaining("a".repeat(2000)) === 0);
check("26. and counts trimmed length", reportDetailsRemaining("  ab  ") === REPORT_DETAILS_MAX - 2);

console.log("");
console.log("report — what success may and may not claim");

check("27. the confirmation says it was received", /report/i.test(REPORT_SUCCESS_MESSAGE) && /review/i.test(REPORT_SUCCESS_MESSAGE));
for (const claim of REPORT_FORBIDDEN_CLAIMS) {
  check(
    "28. the confirmation never claims \"" + claim + "\"",
    !REPORT_SUCCESS_MESSAGE.toLowerCase().includes(claim)
  );
}

// ══════════════════════════════════════════════════════════ block and mute
console.log("");
console.log("block and mute — different things, treated differently");

check("29. blocking confirms", planBlock(false).confirm === true);
check("30. unblocking does not", planBlock(true).confirm === false);
check("31. muting does NOT confirm — it is reversible and invisible", planMute(false).confirm === false);
check("32. unmuting does not either", planMute(true).confirm === false);
check("33. block uses POST, unblock DELETE", planBlock(false).method === "POST" && planBlock(true).method === "DELETE");
check("34. mute uses POST, unmute DELETE", planMute(false).method === "POST" && planMute(true).method === "DELETE");

console.log("");
console.log("state is the server's, never the client's guess");

check("35. a confirmed blocked:true is adopted", confirmedFlag({ success: true, blocked: true }, "blocked") === true);
check("36. a confirmed blocked:false is adopted", confirmedFlag({ success: true, blocked: false }, "blocked") === false);
check("37. success:false yields null, so the caller refetches", confirmedFlag({ success: false, blocked: true }, "blocked") === null);
check("38. a missing flag yields null", confirmedFlag({ success: true }, "blocked") === null);
check("39. a non-boolean flag yields null, never a truthy coercion", confirmedFlag({ success: true, blocked: "yes" }, "blocked") === null);
check("40. a null body yields null", confirmedFlag(null, "muted") === null);
check("41. muted is read from its own key", confirmedFlag({ success: true, muted: true }, "muted") === true);

console.log("");
console.log("self actions are never offered");

check("42. the same id cannot be acted on", canActOn("a", "a") === false);
check("43. including across string/ObjectId shapes", canActOn("507f1f77bcf86cd799439011", { toString: () => "507f1f77bcf86cd799439011" }) === false);
check("44. a different id can", canActOn("a", "b") === true);
check("45. a missing viewer id cannot act", canActOn(null, "b") === false);
check("46. a missing target cannot be acted on", canActOn("a", null) === false);

// ═════════════════════════════════════════════════ the 404 is not an oracle
console.log("");
console.log("error copy — a 404 must not become a reverse-block oracle");

const err = (status, message) => ({ response: { status, data: { message } } });

check(
  "47. a 404 says only that the user is unavailable",
  describeRelationshipError(err(404, "User not found.")) === "This user is unavailable."
);
check(
  "48. and never says the viewer was blocked",
  !/block/i.test(describeRelationshipError(err(404, "User not found.")))
);
check(
  "49. the server's own message is never echoed back",
  !describeRelationshipError(err(404, "UNIQUE-SERVER-STRING")).includes("UNIQUE-SERVER-STRING")
);
check(
  "50. nor on a 400",
  !describeRelationshipError(err(400, "UNIQUE-SERVER-STRING")).includes("UNIQUE-SERVER-STRING")
);
check(
  "51. nor on a 500",
  !describeRelationshipError(err(500, "UNIQUE-SERVER-STRING")).includes("UNIQUE-SERVER-STRING")
);
check("52. a 429 asks the viewer to wait", /wait|try again/i.test(describeRelationshipError(err(429))));
check("53. and does not suggest an automatic retry", !/retry|retrying/i.test(describeRelationshipError(err(429))));
check("54. a thrown non-axios error still returns the fallback", describeRelationshipError(new Error("boom"), "fallback") === "fallback");
check("55. no status at all returns the fallback", describeRelationshipError(undefined, "fallback") === "fallback");
check(
  "56. no branch inspects the response message text at all",
  !/response\.data|\.message/.test(relSrc.slice(relSrc.indexOf("export function describeRelationshipError"))),
  "the error mapper reads the server's message"
);

// ══════════════════════════════════════════════════════════ the API wrappers
console.log("");
console.log("API wrappers — exact routes, exact methods, no second client");

const pairs = [
  ["blockUser", "axios.post(`/api/social/block/${id(userId)}`)"],
  ["unblockUser", "axios.delete(`/api/social/block/${id(userId)}`)"],
  ["muteUser", "axios.post(`/api/social/mute/${id(userId)}`)"],
  ["unmuteUser", "axios.delete(`/api/social/mute/${id(userId)}`)"],
  ["reportUser", "axios.post(`/api/social/report/user/${id(userId)}`, payload)"],
  ["reportPost", "axios.post(`/api/social/report/post/${id(postId)}`, payload)"],
  ["reportComment", "axios.post(`/api/social/report/comment/${id(commentId)}`, payload)"],
];
for (const [name, call] of pairs) {
  check("57. " + name + " calls exactly " + call, apiSrc.includes(call), "not found in models/social.model.js");
}
check(
  "58. getBlockedUsers takes NO userId — the endpoint is self-scoped",
  /export const getBlockedUsers = \(page\) =>\s*\n?\s*axios\.get\("\/api\/social\/blocked", pageParams\(page\)\);/.test(apiSrc),
  "signature or path differs"
);
check("59. there is no blocked-list route carrying a user id", !/\/api\/social\/blocked\/\$\{/.test(apiSrc));
check(
  "60. block and unblock send NO body — the server refuses one outright",
  !/axios\.post\(`\/api\/social\/block\/\$\{id\(userId\)\}`,/.test(apiSrc)
  && !/axios\.delete\(`\/api\/social\/block\/\$\{id\(userId\)\}`,\s*\{/.test(apiSrc)
);
check(
  "61. mute and unmute send no body either",
  !/axios\.post\(`\/api\/social\/mute\/\$\{id\(userId\)\}`,/.test(apiSrc)
);
check("62. no second axios client was created", !/axios\.create\(/.test(apiSrc));
check("63. no baseURL, no extra interceptor", !/baseURL|interceptors/.test(apiSrc));
check("64. no Authorization header is hand-rolled", !/Authorization/i.test(apiSrc));
check("65. every id reaching a path goes through the encode helper", !/\/api\/social\/(block|mute|report)\/[^$`]*\$\{(?!id\()/.test(apiSrc));
check(
  "66. no generic report(type, id) helper exists — the route is the target type",
  !/export const report = /.test(apiSrc) && !/targetType/.test(apiSrc)
);

// ═══════════════════════════════════════════════════ the menu's behaviour
console.log("");
console.log("RelationshipMenu — confirmation, pending, and no local authority");

check("67. it renders nothing for self", /if \(!canActOn\(viewerId, targetId\)\) return null;/.test(menuSrc));
check("68. block goes through ConfirmDialog", /<ConfirmDialog/.test(menuSrc) && /onConfirm=\{doBlock\}/.test(menuSrc));
check("69. mute has no confirmation step", !/ConfirmDialog[\s\S]*onConfirm=\{doMute\}/.test(menuSrc));
check("70. a second click while pending is refused, for both actions", (menuSrc.match(/if \(busy\) return;/g) || []).length === 2);
check("71. the trigger is disabled while a mutation runs", /disabled=\{Boolean\(busy\)\}/.test(menuSrc));
check("72. state is adopted from the server's own boolean", /confirmedFlag\(data, "blocked"\)/.test(menuSrc) && /confirmedFlag\(data, "muted"\)/.test(menuSrc));
check("73. nothing is written to localStorage or sessionStorage", !/localStorage|sessionStorage/.test(menuSrc));
check("74. no client-side list of blocked users is kept", !/blockedIds|blockedList|setBlocked\(/.test(menuSrc));
check("75. errors go through the neutral mapper", /describeRelationshipError/.test(menuSrc));
check("76. no raw server message is rendered", !/err\.response|error\.response/.test(menuSrc));
check("77. no HTML sink", !/dangerouslySetInnerHTML|innerHTML/.test(menuSrc));
check("78. the block copy names where the undo lives", /Blocked users/.test(menuSrc));
check("79. the mute copy does NOT claim content is blocked or hidden", !/\b(blocked|hidden|removed)\b/i.test((menuSrc.match(/is muted\.[^`]*/) || [""])[0]));
check("80. and it says the muted person stays reachable", /still available|still reachable/i.test(menuSrc));
check("81. the menu exposes menu semantics", /role="menu"/.test(menuSrc) && /role="menuitem"/.test(menuSrc));
check("82. the trigger declares its popup and expanded state", /aria-haspopup="menu"/.test(menuSrc) && /aria-expanded=\{open\}/.test(menuSrc));
check("83. Escape closes it", /e\.key === "Escape"/.test(menuSrc));
check("84. report submission is supplied by the caller, already bound to its route", /submitReport/.test(menuSrc) && !/reportPost|reportComment/.test(menuSrc));

console.log("");
console.log("ReportDialog — strict body, conditional OTHER, no HTML sink");

check("85. the payload is built by buildReportPayload, never spread from form state", /submit\(buildReportPayload\(\{ reason, details \}\)\)/.test(dialogSrc));
check("86. no form object is spread into the request", !/\.\.\.form|\.\.\.state/.test(dialogSrc));
check("87. validation runs before submitting", /validateReport\(\{ reason, details \}\)/.test(dialogSrc));
check("88. submit is disabled while invalid or pending", /disabled=\{pending \|\| !verdict\.ok\}/.test(dialogSrc));
check("89. a second submit while pending returns early", /if \(pending\) return;/.test(dialogSrc));
check("90. the textarea caps input at the backend maximum", /maxLength=\{REPORT_DETAILS_MAX\}/.test(dialogSrc));
check("91. details are required only for OTHER", /const detailsRequired = reason === "OTHER";/.test(dialogSrc));
check("92. every open resets the form, so no reason carries over to another target", /setReason\(""\);/.test(dialogSrc));
check("93. no HTML sink anywhere", !/dangerouslySetInnerHTML|innerHTML/.test(dialogSrc));
check("94. the success message is the shared neutral one", /REPORT_SUCCESS_MESSAGE/.test(dialogSrc));
check("95. the dialog announces itself as an alertdialog", /role="alertdialog"/.test(dialogSrc));
check("96. errors are announced", /role="alert"/.test(dialogSrc));
check("97. the details field is labelled and described", /htmlFor=\{detailsId\}/.test(dialogSrc) && /aria-describedby/.test(dialogSrc));
check("98. the character counter is polite, not assertive", /aria-live="polite"/.test(dialogSrc));
check("99. cancel is available and disabled while pending", /Cancel/.test(dialogSrc) && /onClick=\{\(\) => onOpenChange\(false\)\}/.test(dialogSrc));
check("100. the dialog cannot be dismissed mid-request", /open=\{open\} onOpenChange=\{pending \? undefined : onOpenChange\}/.test(dialogSrc));

console.log("");
console.log("BlockedUserList — the short-page rule and server-confirmed removal");

check("101. continuation uses canLoadMore, never items.length", /canLoadMore\(list, loadingMore\)/.test(listSrc) && !/items\.length < /.test(listSrc));
check("102. a row is removed only after the server confirms blocked:false", /if \(flag === false\) \{/.test(listSrc) && /removeItem\(prev, user\._id\)/.test(listSrc));
check("103. an unconfirmed response reloads instead of assuming", /await load\(null\)/.test(listSrc));
check("104. one unblock at a time — no double submit", /if \(pendingId\) return;/.test(listSrc));
check("105. every row's button is disabled while any unblock runs", /disabled=\{Boolean\(pendingId\)\}/.test(listSrc));
check("106. the row is NOT a link to a concealed profile", !/<Link/.test(listSrc) && !/social\/profile\//.test(listSrc));
check("107. nothing is persisted locally", !/localStorage|sessionStorage/.test(listSrc));
check("108. errors are neutral", /describeRelationshipError/.test(listSrc) && !/\.response\.data/.test(listSrc));
check("109. the unblock button names the person for screen readers", /aria-label=\{`Unblock \$\{name\}`\}/.test(listSrc));
check("110. the loading state is announced", /aria-busy="true"/.test(listSrc));
check("111. the empty state does not suggest an action nothing supports", /haven&apos;t blocked anyone/.test(listSrc) && !/find people|discover/i.test(listSrc));
check("112. paging state comes from the shared cursor-list module", /from "@\/lib\/social\/cursor-list"/.test(listSrc));
check("113. no cursor is parsed, compared or constructed here", !/base64|atob|btoa|split\("\|"\)/.test(listSrc));

console.log("");
console.log("the Privacy surface");

check("114. the page is noindex and nofollow", /NOINDEX_NOFOLLOW/.test(privacyPageSrc));
check("115. it fetches nothing on the server", !/await |fetch\(|axios/.test(stripComments(privacyPageSrc)));
check("116. it renders the blocked list", /BlockedUserList/.test(privacyClientSrc));
check("117. it explains that unblocking does not restore a follow", /follow again/i.test(privacyClientSrc));
check("118. the section is labelled for assistive technology", /aria-labelledby="blocked-heading"/.test(privacyClientSrc));
check("119. Privacy is reachable from the social sub-nav", /href: "\/social\/privacy"/.test(layoutSrc));
check("120. and the nav item is not gated on anything optional", /items\.push\(\{ label: "Privacy"/.test(layoutSrc));

console.log("");
console.log("the profile surface");

check("121. mute state is read from the server's viewerMuted field", /muted=\{Boolean\(profile\.viewerMuted\)\}/.test(profileClientSrc));
check("122. and never from local storage", !/localStorage|sessionStorage/.test(profileClientSrc));
check("123. no mute-status endpoint is invented", !/mute-status|muteStatus|getMuteStatus/.test(profileClientSrc + apiSrc));
check("124. a confirmed block navigates away from the now-concealed profile", /router\.push\("\/social"\)/.test(profileClientSrc));
check("125. an unconfirmed mute response reloads the profile", /if \(muted === null\) \{ load\(\); return; \}/.test(profileClientSrc));
check("126. report on a profile targets the USER route", /reportUser\(profile\.user\._id, payload\)/.test(profileClientSrc));
check("127. the menu is given the viewer id so self is excluded", /viewerId=\{cachedUser\?\._id\}/.test(profileClientSrc));
check("128. ProfileHeader takes actions as a slot, not block logic", /actions/.test(headerSrc) && !/blockUser|muteUser/.test(headerSrc));
check("129. the header shows the menu only for other people", /isSelf \?/.test(headerSrc) && /\{actions\}/.test(headerSrc));

console.log("");
console.log("nothing unsafe was introduced");

for (const [label, src] of [
  ["RelationshipMenu", menuSrc], ["ReportDialog", dialogSrc],
  ["BlockedUserList", listSrc], ["privacy-client", privacyClientSrc],
]) {
  const clean = stripClasses(src);
  check("130. " + label + " has no HTML sink", !/dangerouslySetInnerHTML|innerHTML|outerHTML|document\.write/.test(clean));
  check("131. " + label + " builds no URL by concatenation", !/href=\{"\/social\/[^"]*" \+/.test(clean));
  check("132. " + label + " performs no secondary actor lookup", !/getSocialProfile|getFollowStatus/.test(clean));
}
check("133. the five protected dark-mode files are not imported by any new surface",
  ![menuSrc, dialogSrc, listSrc, privacyClientSrc].some((s) =>
    /ThemeToggle|LegalPageLayout|NewOrganiserPopup|PublicFooter/.test(s)));

console.log("");
console.log("=== " + passed + " passed, " + failed + " failed ===");
if (failed) process.exit(1);
console.log("=== all passed ===");
