/**
 * Tests for Phase 11G — the notification inbox, the unread badge and its polling.
 *
 * WHAT THIS COVERS: the pure logic in lib/social/notification-state.js (count
 * normalisation, badge rules, the clamped decrement, the mark-read precondition, the
 * stale-poll guard, error mapping), the already-shipped copy and destination helpers
 * as this phase uses them, and source-level contracts about the provider, the bell,
 * the row and the page — especially that only the count is polled, that a hidden tab
 * does not poll, that there is exactly one polling owner, and that a mark-read
 * failure cannot block navigation.
 *
 * WHAT IT DOES NOT COVER: there is no DOM test framework here, so nothing executes
 * the polling lifecycle, fires a real visibilitychange, or observes React state. The
 * interval, the listener and their cleanup are asserted STRUCTURALLY — the code that
 * creates and removes them exists and is shaped correctly — not observed at runtime.
 * Proving them would need Vitest plus fake timers, a separate dependency decision.
 *
 * Run: npm run test:social
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  NOTIFICATIONS_PAGE_SIZE,
  POLL_INTERVAL_MS,
  BADGE_MAX,
  normaliseUnreadCount,
  badgeLabel,
  badgeAnnouncement,
  decrementUnread,
  shouldMarkRead,
  applyReadAt,
  isFreshPoll,
  describeNotificationError,
} from "../lib/social/notification-state.js";
import {
  NOTIFICATION_TYPES,
  actorName,
  notificationCopy,
  notificationHref,
  isUnread,
  ABSENT_ACTOR,
} from "../lib/social/notification-copy.js";
import { emptyList, mergePage, canLoadMore, replaceItem } from "../lib/social/cursor-list.js";

let failed = 0;
function check(name, ok, detail = "") {
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

const here = path.dirname(fileURLToPath(import.meta.url));
/** path.join, not new URL: the route folders hold "(social)" and "[postId]". */
const read = (rel) => fs.readFileSync(path.join(here, "..", rel), "utf8");
/**
 * Source with comments removed, so a grep matches CODE rather than the prose that
 * describes it.
 *
 * THE `$` ANCHOR USED TO BE HERE, AND IT SILENTLY BROKE THIS HELPER ON WINDOWS.
 * Git checks these files out CRLF under core.autocrlf, so after split("\n") every
 * line still ends with "\r". In JavaScript `.` does not match a carriage return and
 * `$` without /m means end of STRING, so `/\/\/.*$/` could never reach the end of a
 * "\r"-terminated line - the replace matched nothing and EVERY line comment
 * survived. The stripper quietly became a no-op, and four source-text adjacency
 * assertions below then inspected the comments they were written to ignore.
 *
 * Nothing was wrong with the code those assertions describe. The anchor is simply
 * unnecessary: `.` already stops at the line terminator, so an unanchored pattern
 * strips to the end of the line on LF and CRLF alike. The trailing "\r" is dropped
 * too, which keeps the output identical on both platforms.
 *
 * Verified in both directions by the LF/CRLF regression assertions at the end of
 * this file; restoring the anchor fails them.
 */
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((l) => l.replace(/\/\/.*/, "").replace(/\r$/, ""))
    .join("\n");
/** Tailwind writes `outline-offset-2`, which matches an /offset/ grep. */
const stripClasses = (s) => s.replace(/className=(\{`[^`]*`\}|\{[^}]*\}|"[^"]*")/g, 'className=""');

const provSrc = stripComments(read("components/social/NotificationProvider.jsx"));
const bellSrc = stripComments(read("components/social/NotificationBell.jsx"));
const rowSrc = stripComments(read("components/social/NotificationRow.jsx"));
const clientSrc = stripComments(read("app/(social)/social/notifications/notifications-client.jsx"));
const pageSrc = stripComments(read("app/(social)/social/notifications/page.jsx"));
const shellSrc = stripComments(read("components/layout/AppShell.jsx"));
const navSrc = stripComments(read("app/(social)/layout.jsx"));
const modelSrc = stripComments(read("models/social.model.js"));
const stateSrc = stripComments(read("lib/social/notification-state.js"));
const copySrc = stripComments(read("lib/social/notification-copy.js"));

/** Every file Phase 11G added or touched, for the sweeps. */
const allNew = [provSrc, bellSrc, rowSrc, clientSrc, pageSrc, stateSrc].join("\n");
const allNewNoClasses = stripClasses(allNew);

// ---------------------------------------------------------------------------
console.log("types: exactly the six the backend enum can send");

/*
 * PHASE 12H.1. The absence assertions that lived here are inverted, not deleted.
 *
 * WHY THIS LIST HAS TO BE EXACT, AND WHY A TEST SAYS SO. The unread badge counts
 * every unread row the server has - getUnreadCount carries no type predicate - while
 * an unknown type renders nothing at all. A type the backend sends and this list
 * omits is therefore an unread count the reader can SEE but can never open, click or
 * clear: a phantom badge. That was release blocker 2, and keeping the two lists
 * agreed is what closes it.
 *
 * THE SKEW GUARD, AND ITS HONEST LIMIT. This asserts the frontend's six against a
 * literal written here, NOT against the backend's enum read live. Reaching into the
 * sibling backend repository would make this suite fail wherever that checkout does
 * not exist - CI, a fresh clone, any contributor with only the frontend - so the
 * guard is deliberately repository-local. The limitation is real: it catches a
 * frontend change that drifts from the agreed contract, not a backend change made
 * without updating this file. Closing that second gap needs a shared contract
 * artifact, which is not in this phase's scope.
 */
const EXPECTED_TYPES = "FOLLOW,POST_LIKE,POST_DISLIKE,POST_COMMENT,POST_TAG,COMMENT_TAG";
check("there are exactly six", NOTIFICATION_TYPES.length === 6, NOTIFICATION_TYPES.join(","));
check("and they are exactly these six, in the backend's order",
  NOTIFICATION_TYPES.join(",") === EXPECTED_TYPES, NOTIFICATION_TYPES.join(","));
check("POST_TAG IS an active type", NOTIFICATION_TYPES.includes("POST_TAG"));
check("COMMENT_TAG IS an active type", NOTIFICATION_TYPES.includes("COMMENT_TAG"));
check("the four Phase 10 types are untouched",
  ["FOLLOW", "POST_LIKE", "POST_DISLIKE", "POST_COMMENT"].every((t) => NOTIFICATION_TYPES.includes(t)));
check("every known type has copy - none is listed but unrenderable",
  NOTIFICATION_TYPES.every((type) => {
    const c = notificationCopy({ type, actor: { _id: "a1", first_name: "A", last_name: "B" } });
    return c && typeof c.action === "string" && c.action.length > 0;
  }));

/*
 * The EXACT fragments, not merely "is non-null". A wrong-but-present string reads
 * as a working notification while telling the reader the wrong thing - the kind of
 * defect only an exact assertion catches. The copy suite owns these too; they are
 * duplicated here because this is the suite that proves the row renders at all.
 */
check("POST_TAG copy is exactly \"tagged you in a post\"",
  notificationCopy({ type: "POST_TAG" }).action === "tagged you in a post",
  notificationCopy({ type: "POST_TAG" }).action);
check("COMMENT_TAG copy is exactly \"tagged you in a comment\"",
  notificationCopy({ type: "COMMENT_TAG" }).action === "tagged you in a comment",
  notificationCopy({ type: "COMMENT_TAG" }).action);
check("the two tag fragments are distinct from each other and from POST_COMMENT",
  new Set(["POST_TAG", "COMMENT_TAG", "POST_COMMENT"]
    .map((t) => notificationCopy({ type: t }).action)).size === 3);
check("POST_TAG has a destination",
  notificationHref({ type: "POST_TAG", postId: "p1" }) === "/social/posts/p1");
check("COMMENT_TAG has a destination - the PARENT POST",
  notificationHref({ type: "COMMENT_TAG", postId: "p1", commentId: "c1" }) === "/social/posts/p1");

/*
 * UNKNOWN-TYPE POLICY IS UNCHANGED by 12H.1: only the known list grew. A future
 * seventh type still renders and navigates nowhere, which is what keeps a genuine
 * skew visible rather than papered over by a generic line.
 */
check("an unknown seventh type still has no copy",
  notificationCopy({ type: "POST_SHARE" }) === null);
check("an unknown seventh type still has no destination",
  notificationHref({ type: "POST_SHARE", postId: "p1" }) === null);
check("there is still no generic fallback line",
  !/New notification|Unknown notification/i.test(allNewNoClasses));

// The tag wording lives in the copy module, never hard-coded into these components.
check("no component hard-codes tag wording",
  !/tagged you/i.test(allNewNoClasses));
check("nothing claims a tagged user was notified in a component",
  !/notified/i.test(allNewNoClasses));
check("no component builds a comment anchor or comment route",
  !/#comment|\/comments\/|scrollIntoView/.test(allNewNoClasses));

// ---------------------------------------------------------------------------
console.log("");
console.log("copy: one sentence per active type, and a neutral one without an actor");

const actor = { _id: "u1", first_name: "Asha", last_name: "Rao" };
for (const [type, expected] of [
  ["FOLLOW", "Asha Rao started following you"],
  ["POST_LIKE", "Asha Rao liked your post"],
  ["POST_DISLIKE", "Asha Rao disliked your post"],
  ["POST_COMMENT", "Asha Rao commented on your post"],
]) {
  check(`${type} reads correctly`, notificationCopy({ type, actor }).text === expected);
}
for (const [type, expected] of [
  ["FOLLOW", "Someone started following you"],
  ["POST_LIKE", "Someone liked your post"],
  ["POST_DISLIKE", "Someone disliked your post"],
  ["POST_COMMENT", "Someone commented on your post"],
]) {
  check(`${type} with a deleted actor reads "${expected}"`,
    notificationCopy({ type, actor: null }).text === expected);
}
check("a deleted actor is not linkable", notificationCopy({ type: "FOLLOW", actor: null }).hasActor === false);
check("a present actor is linkable", notificationCopy({ type: "FOLLOW", actor }).hasActor === true);
check("the neutral name is 'Someone'", ABSENT_ACTOR === "Someone");
check("a company account keeps its name",
  actorName({ _id: "u2", company_name: "Acme Expo" }) === "Acme Expo");
check("no id ever becomes a name", actorName({ _id: "64f0abc" }) === ABSENT_ACTOR);
check("an unknown type does not throw", notificationCopy({ type: "WAT" }) === null);
check("a missing type does not throw", notificationCopy({}) === null);
check("the row renders nothing for an unknown type", /if \(!copy\) return null;/.test(rowSrc));
check("the wording is not duplicated in the component",
  !/started following you|liked your post|disliked your post|commented on your post/.test(rowSrc));
check("the row imports the shared copy helper",
  /from "@\/lib\/social\/notification-copy"/.test(rowSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("destinations: derived from type and the ids the backend actually sends");

check("FOLLOW opens the actor's profile",
  notificationHref({ type: "FOLLOW", actor }) === "/social/profile/u1");
check("FOLLOW with a deleted actor has NO destination",
  notificationHref({ type: "FOLLOW", actor: null }) === null);
check("POST_LIKE opens the post",
  notificationHref({ type: "POST_LIKE", postId: "p1" }) === "/social/posts/p1");
check("POST_DISLIKE opens the post",
  notificationHref({ type: "POST_DISLIKE", postId: "p1" }) === "/social/posts/p1");
check("POST_COMMENT opens the POST, not a comment route",
  notificationHref({ type: "POST_COMMENT", postId: "p1", commentId: "c1" }) === "/social/posts/p1");
check("no /comments/:id route is invented", !/\/comments\//.test(copySrc + rowSrc + clientSrc));
check("commentId is never used as a destination",
  notificationHref({ type: "POST_COMMENT", postId: null, commentId: "c1" }) === null);
check("a missing postId yields no destination, not a broken link",
  notificationHref({ type: "POST_LIKE", postId: null }) === null);
check("an absent postId key yields no destination",
  notificationHref({ type: "POST_LIKE" }) === null);
check("ids in destinations are encoded",
  notificationHref({ type: "POST_LIKE", postId: "a/b?c" }) === "/social/posts/a%2Fb%3Fc");
check("actor ids in destinations are encoded",
  notificationHref({ type: "FOLLOW", actor: { _id: "a/b" } }) === "/social/profile/a%2Fb");
check("the row renders a Link only when there is a destination",
  /href \? \(/.test(rowSrc) && /<Link/.test(rowSrc));
check("a row with no destination is still rendered, as a div",
  /\) : \(\s*<div className="">\{body\}<\/div>\s*\)/.test(stripClasses(rowSrc)));
check("the row builds no href itself", !/\/social\/posts\/|\/social\/profile\//.test(rowSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("unread count: type-first validation, never coercion");

check("a real number is accepted", normaliseUnreadCount(3) === 3);
check("zero is a real answer", normaliseUnreadCount(0) === 0);
// Number(null), Number(""), Number(false) and Number([]) are ALL 0. A coercing
// version would read a missing field as "nothing unread" and clear the badge.
check("null is UNKNOWN, not zero", normaliseUnreadCount(null) === null);
check("undefined is unknown", normaliseUnreadCount(undefined) === null);
check("an empty string is unknown", normaliseUnreadCount("") === null);
check("false is unknown", normaliseUnreadCount(false) === null);
check("an empty array is unknown", normaliseUnreadCount([]) === null);
check("a numeric string is not trusted", normaliseUnreadCount("7") === null);
check("NaN is unknown", normaliseUnreadCount(NaN) === null);
check("Infinity is unknown", normaliseUnreadCount(Infinity) === null);
check("a negative count is refused", normaliseUnreadCount(-1) === null);
check("a fractional count is floored", normaliseUnreadCount(3.7) === 3);
check("the helper never coerces with Number()", !/Number\(/.test(stateSrc));
check("the provider never coerces either", !/Number\(/.test(provSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("badge: nothing at zero, exact to 99, then 99+");

check("the cap is 99", BADGE_MAX === 99);
check("zero shows NO badge", badgeLabel(0) === null);
check("an unknown count shows no badge", badgeLabel(null) === null);
check("one shows '1'", badgeLabel(1) === "1");
check("ninety-nine shows '99'", badgeLabel(99) === "99");
check("one hundred shows '99+'", badgeLabel(100) === "99+");
check("a thousand shows '99+'", badgeLabel(1000) === "99+");
check("a negative count shows no badge", badgeLabel(-5) === null);
check("NaN shows no badge", badgeLabel(NaN) === null);
check("no badge ever renders NaN", !/NaN/.test(String(badgeLabel(NaN))) || badgeLabel(NaN) === null);
check("the badge label is aria-hidden so it is not read twice",
  /aria-hidden="true"[\s\S]{0,80}\{label\}/.test(stripClasses(bellSrc)));
check("the bell's accessible name states the count",
  /aria-label=\{badgeAnnouncement\(unreadCount\)\}/.test(bellSrc));
check("the announcement names the count", badgeAnnouncement(3) === "Notifications, 3 unread");
check("the announcement handles zero", badgeAnnouncement(0) === "Notifications, none unread");
check("the announcement handles unknown", badgeAnnouncement(null) === "Notifications");

// ---------------------------------------------------------------------------
console.log("");
console.log("mark one: decrement by exactly one, clamped, and only on confirmation");

check("three becomes two", decrementUnread(3) === 2);
check("one becomes zero", decrementUnread(1) === 0);
check("zero STAYS zero — never negative", decrementUnread(0) === 0);
check("an unknown count stays unknown rather than becoming -1", decrementUnread(null) === null);
check("a negative input cannot produce a negative output", decrementUnread(-4) === null);
check("the count is never negative for any input",
  [0, 1, 5, -1, null, undefined, NaN, "x"].every((v) => {
    const out = decrementUnread(v);
    return out === null || (typeof out === "number" && out >= 0);
  }));
check("the provider decrements exactly once per mark-one",
  /setUnreadCount\(\(prev\) => decrementUnread\(prev\)\)/.test(provSrc));
check("the provider has exactly one decrement site",
  (provSrc.match(/decrementUnread\(/g) || []).length === 1);
check("mark-one returns no authoritative count, so none is read",
  !/applyMarkOneRead\([^)]+\)/.test(clientSrc));

// PUT /notifications/:id/read answers { success, readAt } — no notification object.
check("the row is updated from the returned readAt",
  /applyReadAt\(notification, readAt\)/.test(clientSrc));
check("a response without readAt leaves the row unchanged",
  applyReadAt({ _id: "n1", readAt: null }, null).readAt === null);
check("an empty readAt is not accepted",
  applyReadAt({ _id: "n1", readAt: null }, "").readAt === null);
check("a real readAt is adopted",
  applyReadAt({ _id: "n1", readAt: null }, "2026-01-01T00:00:00.000Z").readAt === "2026-01-01T00:00:00.000Z");
check("the row is not mutated in place", (() => {
  const n = { _id: "n1", readAt: null };
  applyReadAt(n, "2026-01-01T00:00:00.000Z");
  return n.readAt === null;
})());
check("no decrement happens without a readAt", /if \(!readAt\) return;/.test(clientSrc));
check("the decrement comes after that guard",
  clientSrc.indexOf("if (!readAt) return;") < clientSrc.indexOf("applyMarkOneRead()"));

// ---------------------------------------------------------------------------
console.log("");
console.log("already-read rows send NOTHING — readAt would be overwritten for nothing");

check("an unread row should be marked", shouldMarkRead({ readAt: null }) === true);
check("a row with no readAt key should be marked", shouldMarkRead({}) === true);
check("an ALREADY-READ row must not be marked",
  shouldMarkRead({ readAt: "2026-01-01T00:00:00.000Z" }) === false);
check("unread is readAt-only, never a timestamp inference",
  isUnread({ readAt: null, updatedAt: "2026-01-01" }) === true
  && isUnread({ readAt: "2026-01-01", updatedAt: "2026-02-01" }) === false);
check("the client guards on it before requesting",
  /if \(!shouldMarkRead\(notification\)\) return;/.test(clientSrc));
check("that guard is the first thing the handler does",
  clientSrc.indexOf("shouldMarkRead(notification)") < clientSrc.indexOf("markNotificationRead("));
check("there is exactly one shouldMarkRead call site",
  (clientSrc.match(/shouldMarkRead\(/g) || []).length === 1);
check("one mark-read request per row at most", /inFlightRef\.current\.has\(id\)/.test(clientSrc));
check("the in-flight id is released afterwards",
  /finally \{[\s\S]{0,120}inFlightRef\.current\.delete\(id\)/.test(clientSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("navigation is never coupled to the mutation succeeding");

check("the row navigates with a real Link", /<Link\s/.test(rowSrc));
check("the click does not preventDefault", !/preventDefault/.test(rowSrc));
check("the click does not await anything", !/onClick=\{async/.test(rowSrc));
check("onActivate is fired alongside navigation, not before it",
  /onClick=\{\(\) => onActivate && onActivate\(notification\)\}/.test(rowSrc));
check("the row does not route programmatically", !/useRouter|router\.push/.test(rowSrc));
check("the page does not route on mark-read either", !/router\.push/.test(clientSrc));
check("a failed mark-read shows no toast — the user got where they asked to go",
  !/catch[\s\S]{0,200}toast\./.test(clientSrc.slice(clientSrc.indexOf("handleActivate"), clientSrc.indexOf("handleMarkAll"))));
check("the page still guards state after unmount",
  /if \(mountedRef\.current\) \{\s*setList/.test(clientSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("mark all: ONE request, authoritative count, no per-row mutation");

check("it calls the read-all endpoint", /await markAllNotificationsRead\(\)/.test(clientSrc));
check("exactly one read-all call site",
  (clientSrc.match(/markAllNotificationsRead\(/g) || []).length === 1);
check("mark-one is called from exactly one place, and it is not mark-all",
  (clientSrc.match(/markNotificationRead\(/g) || []).length === 1);
check("no loop of per-row mutations", !/Promise\.all|\.forEach\([^)]*mark|for \([^)]*of [^)]*items/.test(clientSrc));
check("the authoritative count from the response is used",
  /applyMarkAllRead\(data\.unreadCount\)/.test(clientSrc));
check("the provider adopts it rather than assuming zero",
  /const next = normaliseUnreadCount\(authoritative\)/.test(provSrc));
check("the provider does not hardcode zero", !/setUnreadCount\(0\)/.test(provSrc));
check("nothing is zeroed before the server confirms",
  clientSrc.indexOf("await markAllNotificationsRead()") < clientSrc.indexOf("applyMarkAllRead("));
check("an unconfirmed response is treated as a failure",
  /if \(!data \|\| data\.success !== true\) throw new Error/.test(clientSrc));
check("a double submit is guarded", /if \(markingAll\) return;/.test(clientSrc));
check("the button is disabled while pending", /disabled=\{markingAll\}/.test(clientSrc));
check("the control appears only when something is unread",
  /unreadCount > 0 \?/.test(clientSrc));

// read-all returns no rows and no timestamp, so the loaded page is re-read once
// rather than stamped with a timestamp this client invented.
check("the loaded rows are refreshed from the server, not locally stamped",
  /applyMarkAllRead\(data\.unreadCount\);\s*if \(mountedRef\.current\) await load\(null\)/.test(clientSrc));
check("no readAt is fabricated", !/new Date\(\)/.test(clientSrc) && !/Date\.now\(\)/.test(clientSrc));
check("no readAt is fabricated in the provider either",
  !/new Date\(\)/.test(provSrc) && !/Date\.now\(\)/.test(provSrc));
check("a failed mark-all keeps the count and the rows",
  /catch[\s\S]{0,200}toast\.error\(describeNotificationError/.test(clientSrc));
check("a failed mark-all rolls nothing back, because nothing was optimistic",
  !/rollback|previousCount|snapshot/.test(clientSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("polling: the COUNT only, once a minute, and only while visible");

check("the interval is 60 seconds", POLL_INTERVAL_MS === 60000);
check("it is not faster than 60 seconds", POLL_INTERVAL_MS >= 60000);
check("the provider polls on that constant", /setInterval\(refresh, POLL_INTERVAL_MS\)/.test(provSrc));
check("no literal millisecond interval is used",
  !/setInterval\([^,]+,\s*\d+\)/.test(provSrc));
check("the provider imports ONLY the unread-count endpoint",
  /import \{ getUnreadCount \} from "@\/models\/social\.model"/.test(provSrc));
check("the provider never fetches the list", !/getNotifications\(/.test(provSrc));
check("the provider fetches nothing else at all",
  (provSrc.match(/from "@\/models\/social\.model"/g) || []).length === 1);
check("there is exactly one setInterval in the whole phase",
  (allNew.match(/setInterval/g) || []).length === 1);
check("the list page has no timer at all",
  !/setInterval|setTimeout/.test(clientSrc));
check("the bell has no timer and no request",
  !/setInterval|setTimeout|axios|models\/social\.model/.test(bellSrc));
check("the row has no timer and no request",
  !/setInterval|setTimeout|axios|models\/social\.model/.test(rowSrc));

console.log("");
console.log("polling: visibility lifecycle");

check("visibility is read from document.visibilityState",
  /document\.visibilityState === "visible"/.test(provSrc));
check("a hidden tab stops the interval", /else \{\s*stop\(\);/.test(provSrc));
check("stop() is used both on hide and on cleanup",
  (provSrc.match(/stop\(\);/g) || []).length >= 2);
check("the interval is cleared, not merely dropped", /clearInterval\(timer\)/.test(provSrc));
check("a duplicate interval is impossible", /if \(timer === null\) timer = setInterval/.test(provSrc));
check("becoming visible refreshes once and then resumes",
  /if \(document\.visibilityState === "visible"\) \{\s*refresh\(\);\s*start\(\);/.test(provSrc));
check("the listener is registered",
  /addEventListener\("visibilitychange", onVisibilityChange\)/.test(provSrc));
check("the listener is removed on unmount",
  /removeEventListener\("visibilitychange", onVisibilityChange\)/.test(provSrc));
check("cleanup clears BOTH the interval and the listener",
  /return \(\) => \{\s*stop\(\);\s*document\.removeEventListener/.test(provSrc));
check("the initial read happens exactly once, outside the interval",
  /refresh\(\);\s*\n\s*if \(document\.visibilityState === "visible"\) start\(\);/.test(provSrc));
// Exactly TWO direct calls — the initial read and the visibility catch-up — plus
// one as the interval's callback. A third bare call would be an extra request.
check("there are exactly two direct refresh calls",
  (provSrc.match(/^[ \t]*refresh\(\);[ \t]*$/gm) || []).length === 2);
check("and one more only as the interval callback",
  (provSrc.match(/setInterval\(refresh,/g) || []).length === 1);

// No focus listener: visibilitychange already fires on returning to a background
// tab, and adding focus would send two identical reads for the same return.
check("there is no focus listener to duplicate the visibility read",
  !/addEventListener\("focus"|window\.onfocus|onFocus=/.test(provSrc));
check("there is no blur listener either", !/addEventListener\("blur"/.test(provSrc));

console.log("");
console.log("polling: failure is silent, and cannot log anyone out");

check("the poll's catch body is empty after comments are stripped",
  /\} catch \{\s*\}/.test(provSrc));
check("a failed poll raises no toast", !/toast/.test(provSrc));
check("a failed poll never zeroes the badge", !/setUnreadCount\(0\)/.test(provSrc));
check("there is no retry or backoff", !/retry|backoff|attempt/i.test(provSrc));
check("there is no sign-out from the provider",
  !/signOut|logout|clearCachedUser|router\.push/.test(provSrc));
check("an unusable response leaves the last known count",
  /if \(next !== null\) setUnreadCount\(next\)/.test(provSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("polling vs mutation: a stale poll cannot restore an old count");

check("a poll from the same generation applies", isFreshPoll(4, 4) === true);
check("a poll from an older generation is discarded", isFreshPoll(3, 4) === false);
check("the guard is used in the provider",
  /if \(!isFreshPoll\(startedAt, genRef\.current\)\) return;/.test(provSrc));
check("the generation is captured BEFORE the request",
  provSrc.indexOf("const startedAt = genRef.current") < provSrc.indexOf("await getUnreadCount("));
check("the guard is checked AFTER the response",
  provSrc.indexOf("await getUnreadCount(") < provSrc.indexOf("isFreshPoll(startedAt"));
check("every mutation bumps the generation",
  (provSrc.match(/genRef\.current \+= 1/g) || []).length === 2);
check("mark-one bumps it",
  /applyMarkOneRead = useCallback\(\(\) => \{\s*genRef\.current \+= 1/.test(provSrc));
check("mark-all bumps it",
  /applyMarkAllRead = useCallback\(\(authoritative\) => \{\s*genRef\.current \+= 1/.test(provSrc));
check("no global request framework was built",
  !/interceptor|middleware|requestQueue|dispatcher/i.test(provSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("exactly one polling owner per authenticated shell");

check("AppShell renders the provider",
  /<NotificationProvider>/.test(shellSrc));
check("it renders it exactly once",
  (shellSrc.match(/<NotificationProvider>/g) || []).length === 1);
check("and closes it exactly once",
  (shellSrc.match(/<\/NotificationProvider>/g) || []).length === 1);
check("the provider wraps the whole shell, header included",
  shellSrc.indexOf("<NotificationProvider>") < shellSrc.indexOf("<AppHeader"));
check("no route layout mounts a second provider",
  !/NotificationProvider/.test(navSrc));
check("the notifications page mounts no provider of its own",
  !/NotificationProvider/.test(pageSrc) && !/<NotificationProvider/.test(clientSrc));
check("the bell consumes the context rather than owning it",
  /useNotifications\(\)/.test(bellSrc) && !/setInterval/.test(bellSrc));
check("the page consumes the same context",
  /const \{ unreadCount, applyMarkOneRead, applyMarkAllRead \} = useNotifications\(\)/.test(clientSrc));
check("the page keeps no unread count of its own",
  !/useState\([^)]*unread/i.test(clientSrc));
check("the page never derives the count from its loaded rows",
  !/unreadCount[^\n]*items\.length|items\.length[^\n]*unread/i.test(clientSrc));
check("nothing outside the provider calls the unread endpoint",
  !/getUnreadCount/.test(clientSrc + bellSrc + rowSrc + pageSrc));
check("the sub-nav adds no unread request",
  !/getUnreadCount|useNotifications/.test(navSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("provider scope: narrow, and not around public pages");

check("it holds only the unread count",
  (provSrc.match(/useState\(/g) || []).length === 1);
check("no notifications list in the provider",
  !/setList|setNotifications|notifications:/.test(provSrc));
check("the provider holds no array state", !/useState\(\[\]\)/.test(provSrc));
check("no posts, feed or comments in the provider",
  !/getFeed|getPost|getComments|createPost|posts:/.test(provSrc));
check("no state library was introduced",
  !/redux|zustand|react-query|@tanstack|swr|jotai|recoil/i.test(allNew));
check("the context value is exactly four members",
  /value=\{\{ unreadCount, refresh, applyMarkOneRead, applyMarkAllRead \}\}/.test(provSrc));
check("a consumer outside the provider gets a safe empty value",
  /useContext\(NotificationContext\) \?\? EMPTY/.test(provSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("list: cursor pagination through the shared helper");

check("the list endpoint is used", /getNotifications\(/.test(clientSrc));
check("the page size is 20", NOTIFICATIONS_PAGE_SIZE === 20);
check("that is within the backend's MAX_LIMIT of 50", NOTIFICATIONS_PAGE_SIZE <= 50);
check("the shared cursor helper is imported, not reimplemented",
  /from "@\/lib\/social\/cursor-list"/.test(clientSrc));
check("no page parameter", !/\bpage\s*[:=]\s*\d/.test(stripClasses(clientSrc)));
check("no skip", !/\bskip\b/.test(stripClasses(clientSrc)));
check("no offset", !/\boffset\b/.test(stripClasses(clientSrc)));
check("the cursor is never parsed",
  !/atob|Buffer\.from|base64|decodeCursor/.test(stripClasses(clientSrc)));
check("the cursor comes from the list state", /list\.nextCursor/.test(clientSrc));
check("the cursor is never built from a row's fields",
  !/cursor[^\n]*createdAt/.test(clientSrc));
check("server order is preserved — no client sort",
  !/\.sort\(/.test(clientSrc) && !/\.reverse\(/.test(clientSrc));
check("the row does not sort either", !/\.sort\(|\.reverse\(/.test(rowSrc));

console.log("");
console.log("list: hasMore + nextCursor is the ONLY continuation signal");

const shortPage = mergePage(emptyList(),
  { items: [{ _id: "n1" }, { _id: "n2" }], nextCursor: "CUR", hasMore: true }, "replace");
check("a SHORT page with hasMore still offers more", canLoadMore(shortPage, false) === true);
check("a full page without hasMore does not",
  canLoadMore(mergePage(emptyList(), {
    items: Array.from({ length: 20 }, (_, i) => ({ _id: `n${i}` })), nextCursor: null, hasMore: false,
  }, "replace"), false) === false);
check("hasMore without a cursor is not enough",
  canLoadMore(mergePage(emptyList(), { items: [{ _id: "n1" }], nextCursor: null, hasMore: true }, "replace"), false) === false);
check("an in-flight page blocks a duplicate request", canLoadMore(shortPage, true) === false);
check("the page uses canLoadMore", /canLoadMore\(list, loadingMore\)/.test(clientSrc));
check("the page never compares a loaded length against the limit",
  !/items\.length\s*[<>]/.test(clientSrc)
  && !/length\s*<\s*(limit|NOTIFICATIONS_PAGE_SIZE|20)/.test(clientSrc));
check("the page never infers the end from notifications.length",
  !/notifications\.length\s*[<>]/.test(clientSrc));
check("load-more cannot fire twice at once", /disabled=\{loadingMore\}/.test(clientSrc));

console.log("");
console.log("list: a retried page cannot duplicate rows");

const withDupe = mergePage(shortPage,
  { items: [{ _id: "n2" }, { _id: "n3" }], nextCursor: null, hasMore: false }, "append");
check("mergePage dedupes by _id",
  withDupe.items.map((n) => n._id).join(",") === "n1,n2,n3");
check("order is preserved through the merge",
  withDupe.items[0]._id === "n1");
check("replaceItem swaps exactly one row",
  replaceItem(shortPage, "n2", { _id: "n2", readAt: "x" }).items[1].readAt === "x");
check("replaceItem leaves its neighbour alone",
  replaceItem(shortPage, "n2", { _id: "n2", readAt: "x" }).items[0].readAt === undefined);
check("replaceItem does not reorder",
  replaceItem(shortPage, "n1", { _id: "n1" }).items.map((n) => n._id).join(",") === "n1,n2");

// ---------------------------------------------------------------------------
console.log("");
console.log("list states");

for (const [label, re] of [
  ["initial loading", /phase === "loading"/],
  ["initial error", /phase === "error"/],
  ["ready", /phase === "ready"/],
  ["empty", /!list\.items\.length/],
  ["loading more", /loadingMore \?/],
  ["load-more error", /loadMoreError \?/],
  ["end of list", /canLoadMore\(list, loadingMore\)/],
]) {
  check(`there is an ${label} state`, re.test(clientSrc));
}
check("a failed page two sets only loadMoreError",
  /setLoadMoreError\(describeNotificationError/.test(clientSrc));
check("a failed page two does not clear the list",
  !/setLoadMoreError[\s\S]{0,160}setList\(emptyList/.test(clientSrc));
check("the initial error offers a retry", /onClick=\{\(\) => load\(null\)\}/.test(clientSrc));
check("an explicit Load more button, not infinite scroll",
  /Load more/.test(read("app/(social)/social/notifications/notifications-client.jsx")));
check("no IntersectionObserver", !/IntersectionObserver/.test(allNew));
check("no scroll listener", !/addEventListener\("scroll"|onScroll/.test(allNew));
check("the empty state is honest about what exists",
  /No notifications yet\./.test(read("app/(social)/social/notifications/notifications-client.jsx")));
check("the empty state offers no push or email switch",
  !/push notification|email preference|enable notifications/i.test(allNewNoClasses));

// ---------------------------------------------------------------------------
console.log("");
console.log("abort and cleanup");

check("the list read is abortable", /new AbortController\(\)/.test(clientSrc));
check("a new list read aborts the previous one", /abortRef\.current\?\.abort\(\)/.test(clientSrc));
check("the list aborts on unmount",
  /return \(\) => abortRef\.current\?\.abort\(\)/.test(clientSrc));
check("a cancelled list read renders no error", /if \(isCanceled\(error\)\) return;/.test(clientSrc));
check("the provider's read is abortable too", /new AbortController\(\)/.test(provSrc));
check("the provider passes a signal", /getUnreadCount\(\{ signal: controller\.signal \}\)/.test(provSrc));
check("the provider aborts on unmount",
  /mountedRef\.current = false;\s*abortRef\.current\?\.abort\(\);/.test(provSrc));
check("the provider does not set state after unmount",
  /if \(!mountedRef\.current\) return;/.test(provSrc));
check("the model accepts a config for the unread read",
  /getUnreadCount = \(config\) =>/.test(modelSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("no N+1: a row reads nothing");

check("the row imports no model", !/models\/social\.model/.test(rowSrc));
check("the row imports no axios", !/axios/.test(rowSrc));
check("no profile fetch per row", !/getSocialProfile\(/.test(allNew));
check("no post fetch per row", !/getPost\(|getPostReaction\(/.test(allNew));
check("no comment fetch per row", !/getComments\(/.test(allNew));
check("no re-read of a single notification", !/getNotification\(/.test(allNew));
check("the row uses notification.actor, the hydrated object", /notification\.actor/.test(copySrc));
check("the row reads ids only for navigation",
  /notificationHref\(notification\)/.test(rowSrc));
check("exactly three notification endpoints are imported by the page",
  /import \{ getNotifications, markNotificationRead, markAllNotificationsRead \} from "@\/models\/social\.model"/.test(clientSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("read/unread is not signalled by colour alone");

check("unread rows carry the word 'Unread'", /Unread/.test(rowSrc));
check("unread also carries a dot", /rounded-full/.test(read("components/social/NotificationRow.jsx")));
check("the dot itself is aria-hidden, since the word is the label",
  /<span aria-hidden="true" className="inline-block h-1\.5/.test(read("components/social/NotificationRow.jsx")));
check("unread is decided by isUnread, not by a style", /const unread = isUnread\(notification\)/.test(rowSrc));
check("a present actor's name is emphasised structurally, with <strong>",
  /<strong/.test(rowSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("timestamps reuse the existing safe helper");

check("the row uses postTimestamp", /postTimestamp\(notification\.createdAt\)/.test(rowSrc));
check("no date library", !/dayjs|date-fns|moment|luxon/.test(allNew));
check("no relative-time formatter", !/RelativeTimeFormat|timeAgo|fromNow/.test(allNew));
check("a malformed date renders no element", /stamp \? \(/.test(rowSrc));
check("no Invalid Date can reach the page", !/Invalid Date/.test(allNew));
check("dateTime is only emitted when it parsed", /dateTime=\{stamp\.iso \|\| undefined\}/.test(rowSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("error mapping");

const err = (status, message) => ({ response: { status, data: message === undefined ? {} : { message } } });

check("404 names the notification",
  describeNotificationError(err(404, "Notification not found.")) === "This notification isn't available.");
check("400 is neutral, not the backend's wording",
  describeNotificationError(err(400, "Invalid notification id."), "nope") === "nope");
check("400 does not echo 'Invalid notification id.'",
  !/Invalid notification id/.test(describeNotificationError(err(400, "Invalid notification id."), "nope")));
check("400 does not echo an invalid-cursor message",
  !/cursor/i.test(describeNotificationError(err(400, "Invalid pagination cursor."), "nope")));
check("429 uses the server's wording",
  describeNotificationError(err(429, "Too many notification updates. Please wait a moment and try again."))
    === "Too many notification updates. Please wait a moment and try again.");
check("429 without wording has a default",
  /Too many requests/.test(describeNotificationError(err(429))));
check("500 uses the caller's fallback",
  describeNotificationError(err(500, "Something went wrong."), "nope") === "nope");
check("a network failure uses the caller's fallback",
  describeNotificationError(new Error("Network Error"), "nope") === "nope");
check("a structured message object is not rendered",
  describeNotificationError({ response: { status: 429, data: { message: { code: 1 } } } }, "nope")
    .startsWith("Too many requests"));
check("no raw axios internals are rendered",
  !/error\.config|error\.request|JSON\.stringify\(error/.test(allNew));
check("errors are announced", (clientSrc.match(/role="alert"/g) || []).length >= 2);

// ---------------------------------------------------------------------------
console.log("");
console.log("the route is private");

check("noindex/nofollow", /robots: NOINDEX_NOFOLLOW/.test(pageSrc));
check("no canonical", !/canonical/.test(pageSrc));
check("no JSON-LD", !/application\/ld\+json|jsonLd/.test(pageSrc));
check("no generateStaticParams", !/generateStaticParams/.test(pageSrc));
check("the page fetches no protected data",
  !/axios|models\/social\.model|getNotifications/.test(pageSrc));
check("no social route is in the sitemap", !/social/.test(read("app/sitemap.js")));
check("the sub-nav points at the route that now exists",
  /href: "\/social\/notifications"/.test(navSrc));
check("the bell points at the same route",
  /href="\/social\/notifications"/.test(bellSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("accessibility contracts checkable in source");

check("the bell is a real Link", /<Link/.test(bellSrc));
check("the bell has an accessible name", /aria-label=/.test(bellSrc));
check("mark-all is a real button", /type="button"/.test(clientSrc));
check("load more is a real button", (clientSrc.match(/type="button"/g) || []).length >= 3);
check("the list is a semantic list", /<ul/.test(clientSrc) && /<li>/.test(rowSrc));
check("loading is marked busy", /aria-busy="true"/.test(clientSrc));
check("no clickable div in the page", !/<div[^>]*onClick/.test(clientSrc));
check("no clickable div in the row", !/<div[^>]*onClick/.test(rowSrc));
check("no clickable div in the bell", !/<div[^>]*onClick/.test(bellSrc));
check("icons are hidden from assistive technology",
  (rowSrc.match(/aria-hidden="true"/g) || []).length >= 1
  && /aria-hidden="true"/.test(bellSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("security sweep — zero live hits across every 11G file");

for (const [label, re] of [
  ["/api/find/signup", /find\/signup/],
  ["/api/finduser", /finduser/i],
  ["an Authorization header", /Authorization/],
  ["a Bearer token", /Bearer/],
  ["a JWT", /jwt|decodeToken|atob\(/i],
  ["document.cookie", /document\.cookie/],
  ["dangerouslySetInnerHTML", /dangerouslyset/i],
  ["innerHTML", /innerhtml/i],
  ["a password field", /password/i],
  ["OTP", /\botp\b/i],
  ["mobile_number", /mobile_number/],
  ["pendingPassword", /pendingPassword/],
  ["localStorage", /localStorage/],
  ["sessionStorage", /sessionStorage/],
  ["a raw ObjectId construction", /ObjectId|new mongoose/],
  ["recipient — not even on the wire", /recipient/],
  ["dedupeKey — internal", /dedupeKey/],
]) {
  check(`no ${label}`, !re.test(allNewNoClasses));
}

// ---------------------------------------------------------------------------
console.log("");
console.log("scope sweep — 11G implements nothing outside its phase");

for (const [label, re] of [
  ["a WebSocket", /WebSocket|new WS\(/],
  ["server-sent events", /EventSource|text\/event-stream/],
  ["socket.io", /socket\.io|io\(/],
  ["a service worker", /serviceWorker|navigator\.serviceWorker/],
  ["the browser Notification API", /new Notification\(|Notification\.requestPermission|window\.Notification/],
  ["push subscriptions", /pushManager|PushSubscription|webpush/i],
  ["email notifications", /sendMail|nodemailer|emailNotification/i],
  ["notification preferences", /notificationPreference|notificationSettings|preferences/i],
  ["a notification delete", /deleteNotification\(|clearNotifications\(|clearAll\(/],
  ["notification retention controls", /retention|purgeNotifications/i],
  ["a tagging editor", /TagPicker|TagEditor|setTaggedUsers|onTagsChange/],
  ["a user search", /searchUsers\(|\/api\/search/],
  ["mute", /muteUser\(|isMuted/],
  ["block", /blockUser\(|isBlocked/],
  ["report", /reportPost\(|reportComment\(|reportUser\(/],
  ["moderation", /moderate|moderation/i],
]) {
  check(`no ${label}`, !re.test(allNewNoClasses));
}
check("the model exposes no notification delete endpoint",
  !/deleteNotification|notifications\/[^`]*\/delete/.test(modelSrc));
check("exactly four notification endpoints exist in the model",
  (modelSrc.match(/\/api\/social\/notifications/g) || []).length === 4);

// ---------------------------------------------------------------------------
console.log("");
console.log("dependencies: nothing new");

const pkg = JSON.parse(read("package.json"));
const deps = Object.keys(pkg.dependencies || {});
for (const banned of ["socket.io-client", "pusher-js", "ably", "web-push", "@tanstack/react-query",
  "swr", "zustand", "redux", "jotai", "recoil", "dayjs", "date-fns", "react-toastify"]) {
  check(`${banned} is not a dependency`, !deps.includes(banned));
}
check("the state helper imports only a relative sibling",
  /^import \{ isUnread \} from "\.\/notification-copy\.js";$/m.test(stateSrc));
check("it uses no alias, so plain Node can load it", !/from "@\//.test(stateSrc));
check("11G components import only react, next, lucide, sonner and local modules",
  !/from "(?!react|next|lucide-react|sonner|@\/)/.test(provSrc + bellSrc + rowSrc + clientSrc));

// ---------------------------------------------------------------------------
console.log("");
console.log("earlier phases are untouched by this one");

const cardSrc = stripComments(read("components/social/PostCard.jsx"));
const feedSrc = stripComments(read("app/(social)/social/social-client.jsx"));
check("PostCard still makes no read request",
  !/getPostReaction|getSocialProfile|getComments|getFeed/.test(cardSrc));
check("PostCard has no notification code", !/Notification|unreadCount/.test(cardSrc));
check("the feed has no notification code", !/getNotifications|unreadCount|NotificationProvider/.test(feedSrc));
check("the feed still reads no reaction per card", !/getPostReaction\(/.test(feedSrc));
check("AppShell still renders the public nav",
  /\[\.\.\.PUBLIC_NAV, \.\.\.COMMUNITY_NAV\]/.test(shellSrc));
check("AppHeader was not turned into a client component",
  !/"use client"/.test(read("components/layout/AppHeader.jsx")));
check("AppHeader gained no notification code",
  !/Notification|unreadCount/.test(read("components/layout/AppHeader.jsx")));
check("the bell sits in AppShell's existing right slot, beside AccountMenu",
  /<NotificationBell \/>\s*<AccountMenu \/>/.test(shellSrc));

// ─────────────────────────────────────────────────────────────────────────────
console.log("");
console.log("harness: stripComments is line-ending agnostic");

/*
 * THE HELPER ITSELF IS NOW TESTED, because when it broke it broke SILENTLY. A
 * no-op stripper does not throw and does not fail on its own; it just hands every
 * assertion the prose it was supposed to remove, and four of them started
 * inspecting comments instead of code. A helper that the whole file's source-text
 * assertions depend on needs its own proof.
 *
 * Both line endings are asserted explicitly rather than relying on whatever git
 * happened to check out: on a LF checkout a CRLF-broken stripper would pass by
 * luck, which is exactly how this survived until Phase 12H-A.
 */
const LF_SRC = 'const a = 1; // trailing comment\nconst b = 2;\n// whole-line comment\nconst c = 3;\n';
const CRLF_SRC = LF_SRC.replace(/\n/g, "\r\n");

check("LF: a trailing line comment is stripped",
  !stripComments(LF_SRC).includes("trailing comment"));
check("LF: a whole-line comment is stripped",
  !stripComments(LF_SRC).includes("whole-line comment"));
check("LF: the code either side survives",
  /const a = 1;/.test(stripComments(LF_SRC)) && /const c = 3;/.test(stripComments(LF_SRC)));

check("CRLF: a trailing line comment is stripped",
  !stripComments(CRLF_SRC).includes("trailing comment"),
  JSON.stringify(stripComments(CRLF_SRC)));
check("CRLF: a whole-line comment is stripped",
  !stripComments(CRLF_SRC).includes("whole-line comment"));
check("CRLF: the code either side survives",
  /const a = 1;/.test(stripComments(CRLF_SRC)) && /const c = 3;/.test(stripComments(CRLF_SRC)));
check("CRLF and LF strip to byte-identical output",
  stripComments(CRLF_SRC) === stripComments(LF_SRC),
  JSON.stringify(stripComments(CRLF_SRC)) + " vs " + JSON.stringify(stripComments(LF_SRC)));

/*
 * The adjacency property the four provider assertions rely on, stated directly:
 * once a comment sits between two statements, only a working stripper can make
 * them adjacent again. This is what the `$`-anchored version could not do on CRLF.
 */
const ADJACENT = "} else {\r\n        // Hidden: nothing is requested.\r\n        stop();\r\n";
check("CRLF: a comment between two statements no longer blocks an adjacency match",
  /else \{\s*stop\(\);/.test(stripComments(ADJACENT)),
  JSON.stringify(stripComments(ADJACENT)));

/* Block comments were never affected - asserted so a future edit cannot regress
   them while fixing line comments. */
check("block comments are still stripped on both line endings",
  !stripComments("/* gone */\r\nconst d = 4;\r\n").includes("gone")
  && !stripComments("/* gone */\nconst d = 4;\n").includes("gone"));

// ─────────────────────────────────────────────────────────────────────────────
console.log("");
console.log("12H.1: a tag notification is renderable, clickable and clearable");

/*
 * THE PHANTOM-UNREAD REGRESSION. This is the assertion release blocker 2 existed
 * for, so it is written as the full round trip rather than a type-list check.
 *
 * The badge counts every unread row the server has. Before 12H.1 a POST_TAG row
 * was counted, stored by the list state, and then rendered as nothing - so the
 * reader saw a number with no row behind it and no way to clear it except
 * mark-all-read. The fix is NOT to exclude tag rows from the badge; it is to make
 * them render, and that is what this proves end to end:
 *
 *   it survives into list state  ->  it produces copy  ->  it has a destination
 *   ->  it counts as unread      ->  shouldMarkRead says to mark it
 *   ->  applyReadAt clears it    ->  decrementUnread lowers the badge
 */
const TAG_ROWS = [
  { _id: "t1", type: "POST_TAG", actor: { _id: "a1", first_name: "Asha", last_name: "Rao" },
    postId: "p1", commentId: null, readAt: null, createdAt: "2026-02-01T00:00:00.000Z" },
  { _id: "t2", type: "COMMENT_TAG", actor: { _id: "a1", first_name: "Asha", last_name: "Rao" },
    postId: "p1", commentId: "c1", readAt: null, createdAt: "2026-02-02T00:00:00.000Z" },
];

for (const row of TAG_ROWS) {
  const list = mergePage(emptyList(), { items: [row], nextCursor: null, hasMore: false }, "replace");
  check(`${row.type}: survives into list state`,
    list.items.length === 1 && list.items[0]._id === row._id);
  check(`${row.type}: produces visible copy, so the row is not dropped`,
    (() => { const c = notificationCopy(row); return !!c && c.text.includes("Asha Rao") && c.action.length > 0; })(),
    JSON.stringify(notificationCopy(row)));
  check(`${row.type}: has a destination the reader can open`,
    notificationHref(row) === "/social/posts/p1", String(notificationHref(row)));
  check(`${row.type}: counts as unread, exactly as the badge counts it`,
    isUnread(row) === true);
  check(`${row.type}: CAN REACH mark-one-read`, shouldMarkRead(row) === true);
  check(`${row.type}: clears when marked, so the phantom cannot persist`,
    applyReadAt(row, "2026-03-01T00:00:00.000Z").readAt === "2026-03-01T00:00:00.000Z"
    && isUnread(applyReadAt(row, "2026-03-01T00:00:00.000Z")) === false);
  check(`${row.type}: and the badge goes down with it`, decrementUnread(2) === 1);
}

check("the badge is NOT filtered by type - no workaround was used",
  !/POST_TAG|COMMENT_TAG|type\s*===|\btype\b\s*!==/.test(stateSrc)
  && !/POST_TAG|COMMENT_TAG/.test(provSrc),
  "a type check reached the badge or state layer");

/*
 * THE ROW MUST NOT DECIDE BY TYPE. The round trip above is proved at the pure
 * function level, so a component that quietly dropped tag rows on its own would
 * still pass it - the badge would count them and nothing would render, which is the
 * phantom bug again one layer up. NotificationRow's only gate is `if (!copy)`.
 */
check("NotificationRow drops a row ONLY when there is no copy",
  (rowSrc.match(/return null;/g) || []).length === 1
  && /if \(!copy\) return null;/.test(rowSrc),
  "the row gained a second early return");
check("NotificationRow names no notification type at all",
  !/POST_TAG|COMMENT_TAG|POST_COMMENT|FOLLOW|TAG\$|notification\.type\s*===/.test(rowSrc));

/*
 * THE APPROVED OVERLAP. A post owner tagged in a comment on their own post gets
 * BOTH rows. They are two facts, so both must survive and both must render; the
 * frontend must not dedupe on actor, post, comment, time or adjacency.
 */
const OVERLAP = [
  { _id: "o1", type: "POST_COMMENT", actor: { _id: "a1", first_name: "Asha", last_name: "Rao" },
    postId: "p9", commentId: "c9", readAt: null, createdAt: "2026-02-03T00:00:01.000Z" },
  { _id: "o2", type: "COMMENT_TAG", actor: { _id: "a1", first_name: "Asha", last_name: "Rao" },
    postId: "p9", commentId: "c9", readAt: null, createdAt: "2026-02-03T00:00:00.000Z" },
];
const overlapList = mergePage(emptyList(), { items: OVERLAP, nextCursor: null, hasMore: false }, "replace");
check("overlap: BOTH rows survive list state - identical actor, post and comment",
  overlapList.items.length === 2, String(overlapList.items.length));
check("overlap: both render, and say DIFFERENT things",
  (() => {
    const a = notificationCopy(OVERLAP[0]);
    const b = notificationCopy(OVERLAP[1]);
    return !!a && !!b && a.action !== b.action
      && a.action === "commented on your post" && b.action === "tagged you in a comment";
  })());
check("overlap: both are independently markable",
  shouldMarkRead(OVERLAP[0]) === true && shouldMarkRead(OVERLAP[1]) === true);
check("overlap: nothing in the client dedupes by actor, post or comment",
  !/dedupe|distinct|uniqueBy|seenActors|byPostId/i.test(clientSrc));

/*
 * FRONTEND-FIRST COMPATIBILITY, which the approved release order depends on. The
 * new six-type frontend must work unchanged against a backend that still returns
 * only the original four - nothing may REQUIRE a tag type to exist.
 */
const LEGACY_FOUR = ["FOLLOW", "POST_LIKE", "POST_DISLIKE", "POST_COMMENT"];
check("frontend-first: every legacy type still renders exactly as before",
  LEGACY_FOUR.every((type) => {
    const c = notificationCopy({ type, actor: { _id: "a1", first_name: "Asha", last_name: "Rao" } });
    return !!c && c.action.length > 0;
  }));
check("frontend-first: a legacy-only page is fully functional",
  (() => {
    const legacy = LEGACY_FOUR.map((type, i) => ({
      _id: "l" + i, type, actor: { _id: "a1", first_name: "Asha", last_name: "Rao" },
      postId: "p1", commentId: null, readAt: null, createdAt: "2026-01-0" + (i + 1) + "T00:00:00.000Z",
    }));
    const l = mergePage(emptyList(), { items: legacy, nextCursor: null, hasMore: false }, "replace");
    return l.items.length === 4
      && legacy.every((r) => notificationCopy(r) && shouldMarkRead(r) === true);
  })());
check("frontend-first: nothing imports or asserts a tag type at module load",
  !/POST_TAG|COMMENT_TAG/.test(provSrc + bellSrc + rowSrc + clientSrc + stateSrc),
  "a component now depends on a tag type existing");

/* MARK-ALL-READ stays type-agnostic: it sends no type and reads the server's count. */
check("mark-all-read sends no type and needs no tag handling",
  !/POST_TAG|COMMENT_TAG/.test(clientSrc)
  && /applyMarkAllRead\(data\.unreadCount\)/.test(clientSrc));

/* POLLING AND VISIBILITY ARE UNTOUCHED BY 12H.1 - asserted, not assumed. */
check("polling is still a 60s interval on the count alone",
  POLL_INTERVAL_MS === 60000 && /setInterval\(refresh, POLL_INTERVAL_MS\)/.test(provSrc));
check("visibility logic is unchanged",
  /document\.visibilityState === "visible"/.test(provSrc)
  && /removeEventListener\("visibilitychange", onVisibilityChange\)/.test(provSrc));
check("the provider gained no tag awareness at all",
  !/tag/i.test(provSrc));

/* SECURITY: the copy is rendered as React text, never injected. */
check("no HTML sink anywhere in the notification path",
  !/dangerouslySetInnerHTML|innerHTML|DOMPurify|marked|html-react-parser/i.test(allNew));
/*
 * The COPY MODULE is included here explicitly. `allNew` is the components and the
 * state helpers; a lookup added to the copy module itself would otherwise slip
 * past, and that module is exactly where a tempting "fetch the missing actor"
 * would go. The backend omits an absent actor deliberately - "Someone" is the
 * answer, not a second request.
 */
const copyModuleSrc = stripComments(read("lib/social/notification-copy.js"));
check("no secondary actor lookup was introduced",
  !/getSocialProfile|findUser|\/api\/find|fetch\(|axios/.test(allNew + copyModuleSrc));
check("the copy module stays pure - no network, no imports of the API model",
  !/^import/m.test(copyModuleSrc) && !/models\/social/.test(copyModuleSrc));
check("hrefs are still built with encodeURIComponent",
  /encodeURIComponent/.test(copyModuleSrc));

/*
 * THE SKEW GUARD MUST BE A LITERAL. Replacing the expected list with
 * NOTIFICATION_TYPES.join(",") would make it compare the value to itself and pass
 * for any list at all - a tautology that looks like a guard. This asserts the
 * guard is written as a hard-coded string in this file.
 */
const selfSrc = read("tests/social-notifications.test.mjs");
/*
 * Written as two narrow checks rather than one regex containing the expected
 * string: a pattern that spells the literal out would also MATCH ITSELF in this
 * file's own source, so it would pass no matter what the declaration said. The
 * first check requires the declaration to open with a quote; the second forbids
 * deriving it from the value under test.
 */
check("the six-type guard is declared as a quoted literal",
  /^const EXPECTED_TYPES = "/m.test(selfSrc),
  "EXPECTED_TYPES is no longer a plain string literal");
// Built by concatenation on purpose: spelled out as one literal, the pattern would
// appear in this very line and the negative check would match itself and always
// fail - the same self-reference trap, inverted.
const SELF_REF = new RegExp("EXPECTED_TYPES = " + "NOTIFICATION_TYPES");
check("the guard is not derived from the value it checks",
  !SELF_REF.test(selfSrc),
  "EXPECTED_TYPES was made self-referential and now proves nothing");

console.log("");
console.log(failed ? `=== ${failed} FAILED ===` : "=== all passed ===");
process.exit(failed ? 1 : 0);
