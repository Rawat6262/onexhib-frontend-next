/**
 * Tests for lib/social/notification-copy.js.
 *
 * Two invariants matter most here.
 *
 * THE SIX TYPES MATCH THE BACKEND EXACTLY. Phase 10 shipped four and withheld the
 * two tag types; Phase 12G added them to the backend once block and mute existed to
 * give a tagged recipient recourse, and Phase 12H.1 added the copy here. The lists
 * must agree, because the badge counts every unread row the server has while an
 * unknown type renders nothing — so a type the backend sends and this module omits
 * becomes an unread count the reader can see but never open or clear. An UNKNOWN
 * type still produces nothing, deliberately: a sentence nobody can act on is worse
 * than a gap, and the gap keeps a real mismatch visible.
 *
 * UNREAD IS `readAt == null` AND NOTHING ELSE. The backend works hard to keep a
 * reaction switch from touching readAt/createdAt/updatedAt and a refollow from
 * touching anything at all, so churn cannot resurface a read notification.
 * Inferring unread from a timestamp would reopen that hole client-side.
 *
 * Run: npm run test:social
 */
import {
  NOTIFICATION_TYPES,
  actorName,
  notificationCopy,
  notificationHref,
  isUnread,
  ABSENT_ACTOR,
} from "../lib/social/notification-copy.js";

let failed = 0;
function check(name, ok, detail = "") {
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

const actor = { _id: "64f000000000000000000001", first_name: "Asha", last_name: "Rao" };

console.log("notification: the type set");

/*
 * PHASE 12H.1 widened this from four to six. The property is unchanged — the list
 * is exact and ordered — so a seventh type, a removed one or a reordering all still
 * fail. The order mirrors the backend's own enum, with the tag types appended.
 */
check("exactly six active types", NOTIFICATION_TYPES.length === 6, NOTIFICATION_TYPES.join(","));
check(
  "they are FOLLOW, POST_LIKE, POST_DISLIKE, POST_COMMENT, POST_TAG, COMMENT_TAG",
  NOTIFICATION_TYPES.join(",") === "FOLLOW,POST_LIKE,POST_DISLIKE,POST_COMMENT,POST_TAG,COMMENT_TAG",
  NOTIFICATION_TYPES.join(",")
);
check("POST_TAG IS a type", NOTIFICATION_TYPES.includes("POST_TAG"));
check("COMMENT_TAG IS a type", NOTIFICATION_TYPES.includes("COMMENT_TAG"));
check("the four Phase 10 types all survive",
  ["FOLLOW", "POST_LIKE", "POST_DISLIKE", "POST_COMMENT"].every((t) => NOTIFICATION_TYPES.includes(t)));

console.log("");
console.log("notification: copy for each active type");

const EXPECTED = {
  FOLLOW: "Asha Rao started following you",
  POST_LIKE: "Asha Rao liked your post",
  POST_DISLIKE: "Asha Rao disliked your post",
  POST_COMMENT: "Asha Rao commented on your post",
  POST_TAG: "Asha Rao tagged you in a post",
  COMMENT_TAG: "Asha Rao tagged you in a comment",
};
for (const type of NOTIFICATION_TYPES) {
  const c = notificationCopy({ type, actor });
  check(`${type} -> "${EXPECTED[type]}"`, c && c.text === EXPECTED[type], c ? c.text : "null");
  check(`${type} splits name from action so the name can be a link`, c.name === "Asha Rao" && c.action.length > 0);
  check(`${type} reports hasActor true`, c.hasActor === true);
}

console.log("");
console.log("notification: tag types render, and navigate to the parent post");

/*
 * PHASE 12H.1 INVERTED THIS SECTION. The tag types now produce copy and an href.
 * What replaces the old absence checks is the stronger property: the copy is EXACT,
 * and the destination is the PARENT POST for both — there is no comment deep-link
 * infrastructure in this app and 12H.1 deliberately invents none.
 */
check("POST_TAG copy is exactly \"tagged you in a post\"",
  notificationCopy({ type: "POST_TAG", actor }).action === "tagged you in a post",
  notificationCopy({ type: "POST_TAG", actor }).action);
check("COMMENT_TAG copy is exactly \"tagged you in a comment\"",
  notificationCopy({ type: "COMMENT_TAG", actor }).action === "tagged you in a comment",
  notificationCopy({ type: "COMMENT_TAG", actor }).action);

check("POST_TAG navigates to the parent post",
  notificationHref({ type: "POST_TAG", actor, postId: "p1" }) === "/social/posts/p1");
check("COMMENT_TAG navigates to the parent post too",
  notificationHref({ type: "COMMENT_TAG", actor, postId: "p1", commentId: "c1" }) === "/social/posts/p1",
  notificationHref({ type: "COMMENT_TAG", actor, postId: "p1", commentId: "c1" }));
check("COMMENT_TAG does NOT fabricate a comment deep link",
  !/c1|#|comments\//.test(
    notificationHref({ type: "COMMENT_TAG", actor, postId: "p1", commentId: "c1" }) || ""));
check("COMMENT_TAG does not require commentId to navigate",
  notificationHref({ type: "COMMENT_TAG", actor, postId: "p1" }) === "/social/posts/p1");
check("a tag row with no postId stays non-navigable, per the existing contract",
  notificationHref({ type: "POST_TAG", actor, postId: null }) === null
  && notificationHref({ type: "COMMENT_TAG", actor, postId: null, commentId: "c1" }) === null);

/*
 * UNKNOWN TYPES STILL PRODUCE NOTHING. The policy did not change in 12H.1 - only
 * the list of known types did - so a seventh type the backend might one day send
 * still renders and navigates nowhere.
 */
check("an unknown seventh type still has no copy",
  notificationCopy({ type: "POST_SHARE", actor }) === null);
check("an unknown seventh type still has no href",
  notificationHref({ type: "POST_SHARE", actor, postId: "p1" }) === null);

const src = await import("node:fs").then((fs) =>
  fs.readFileSync(new URL("../lib/social/notification-copy.js", import.meta.url), "utf8")
);
/* CRLF-safe, matching the 12H.0/12H.0b helpers: an anchored // pattern silently
   strips nothing on a Windows checkout. */
const live = src
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .map((l) => l.replace(/\/\/.*/, "").replace(/\r$/, ""))
  .join("\n");
check("the tag copy lives in live code, not a comment",
  /POST_TAG/.test(live) && /COMMENT_TAG/.test(live));
check("no comment-anchor or comment route is constructed anywhere",
  !/#comment|\/comments\/|scrollIntoView|getElementById/.test(live));
check("no dangerous HTML sink in the copy module",
  !/dangerouslySetInnerHTML|innerHTML|DOMPurify|marked|html-react-parser/i.test(src));
check("no secondary actor lookup is performed",
  !/fetch\(|axios|getSocialProfile|findUser/.test(live));

console.log("");
console.log("notification: deleted actor");

for (const type of NOTIFICATION_TYPES) {
  const c = notificationCopy({ type, actor: null });
  check(`${type} with actor null still renders a sentence`, c !== null && c.text.startsWith(ABSENT_ACTOR), c ? c.text : "null");
  check(`${type} with actor null reports hasActor false`, c.hasActor === false);
}
check("the fallback name is neutral", ABSENT_ACTOR === "Someone");
check("it does not say the account was deleted", !/delet|removed|unavailable/i.test(ABSENT_ACTOR));
check("a missing actor key behaves like null", notificationCopy({ type: "FOLLOW" }).hasActor === false);

console.log("");
console.log("notification: actor names");

check("first + last", actorName({ first_name: "Asha", last_name: "Rao" }) === "Asha Rao");
check("first only", actorName({ first_name: "Asha" }) === "Asha");
check("company falls back when no personal name", actorName({ company_name: "Acme Ltd" }) === "Acme Ltd");
check("personal name wins over company", actorName({ first_name: "Asha", company_name: "Acme" }) === "Asha");
check("blank names fall through to the neutral label", actorName({ first_name: "  ", last_name: "" }) === ABSENT_ACTOR);
check("null actor", actorName(null) === ABSENT_ACTOR);
check("non-object actor", actorName("Asha") === ABSENT_ACTOR);

console.log("");
console.log("notification: no internal field is ever rendered");

for (const type of NOTIFICATION_TYPES) {
  const c = notificationCopy({
    type,
    actor,
    postId: "64f000000000000000000002",
    commentId: "64f000000000000000000003",
    recipient: "64f000000000000000000004",
    dedupeKey: "follow:64f000000000000000000001",
  });
  check(`${type} text contains no actor id`, !c.text.includes("64f0"), c.text);
  check(`${type} text contains no dedupeKey`, !/follow:|reaction:|comment:/.test(c.text));
  check(
    `${type} returns no recipient or dedupeKey`,
    !("recipient" in c) && !("dedupeKey" in c),
    Object.keys(c).join(",")
  );
}

console.log("");
console.log("notification: navigation targets");

check(
  "FOLLOW -> the actor's profile",
  notificationHref({ type: "FOLLOW", actor }) === "/social/profile/64f000000000000000000001"
);
check("FOLLOW with no actor -> null (no dead link)", notificationHref({ type: "FOLLOW", actor: null }) === null);
for (const type of ["POST_LIKE", "POST_DISLIKE", "POST_COMMENT"]) {
  check(
    `${type} -> the post detail`,
    notificationHref({ type, actor, postId: "64f000000000000000000002" }) ===
      "/social/posts/64f000000000000000000002"
  );
  check(`${type} with postId null -> null`, notificationHref({ type, actor, postId: null }) === null);
}
check("an id in a path is encoded", notificationHref({ type: "FOLLOW", actor: { _id: "a/b?c" } }) === "/social/profile/a%2Fb%3Fc");
check("unknown type -> null", notificationHref({ type: "WHATEVER", postId: "p" }) === null);

console.log("");
console.log("notification: unknown types are skipped, never crashed on");

for (const [label, value] of [
  ["unknown string type", { type: "SOMETHING_NEW", actor }],
  ["lowercase type", { type: "follow", actor }],
  ["empty type", { type: "", actor }],
  ["numeric type", { type: 1, actor }],
  ["missing type", { actor }],
  ["null notification", null],
  ["undefined notification", undefined],
  ["empty object", {}],
]) {
  let result;
  let threw = false;
  try {
    result = notificationCopy(value);
  } catch {
    threw = true;
  }
  check(`${label} -> null, no throw`, !threw && result === null, threw ? "THREW" : String(result));
}
check(
  "notificationHref never throws either",
  (() => {
    for (const v of [null, undefined, {}, { type: "FOLLOW" }, { type: 1 }, { type: "POST_LIKE" }]) {
      try {
        notificationHref(v);
      } catch {
        return false;
      }
    }
    return true;
  })()
);

console.log("");
console.log("notification: unread is readAt == null, and nothing else");

check("readAt null -> unread", isUnread({ readAt: null }) === true);
check("readAt missing -> unread", isUnread({}) === true);
check("readAt a timestamp -> read", isUnread({ readAt: "2026-09-26T00:00:00.000Z" }) === false);
check("readAt a Date -> read", isUnread({ readAt: new Date() }) === false);
check(
  "a fresh updatedAt does NOT make a read notification unread again",
  isUnread({ readAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-26T00:00:00.000Z" }) === false
);
check("updatedAt is never consulted in live code", !/updatedAt/.test(live));
check("null notification is not unread", isUnread(null) === false);

console.log("");
console.log(failed ? `=== ${failed} FAILED ===` : "=== all passed ===");
process.exit(failed ? 1 : 0);
