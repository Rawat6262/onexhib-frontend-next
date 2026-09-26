/**
 * Tests for lib/social/notification-copy.js.
 *
 * Two invariants matter most here.
 *
 * POST_TAG AND COMMENT_TAG DO NOT EXIST. Phase 10 deliberately ships no tag
 * notifications, so there must be no copy for them — not even unused. A ready
 * string is an invitation for someone to wire it up and assume the notification
 * arrives.
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

check("exactly four active types", NOTIFICATION_TYPES.length === 4, NOTIFICATION_TYPES.join(","));
check(
  "they are FOLLOW, POST_LIKE, POST_DISLIKE, POST_COMMENT",
  NOTIFICATION_TYPES.join(",") === "FOLLOW,POST_LIKE,POST_DISLIKE,POST_COMMENT"
);
check("POST_TAG is NOT a type", !NOTIFICATION_TYPES.includes("POST_TAG"));
check("COMMENT_TAG is NOT a type", !NOTIFICATION_TYPES.includes("COMMENT_TAG"));

console.log("");
console.log("notification: copy for each active type");

const EXPECTED = {
  FOLLOW: "Asha Rao started following you",
  POST_LIKE: "Asha Rao liked your post",
  POST_DISLIKE: "Asha Rao disliked your post",
  POST_COMMENT: "Asha Rao commented on your post",
};
for (const type of NOTIFICATION_TYPES) {
  const c = notificationCopy({ type, actor });
  check(`${type} -> "${EXPECTED[type]}"`, c && c.text === EXPECTED[type], c ? c.text : "null");
  check(`${type} splits name from action so the name can be a link`, c.name === "Asha Rao" && c.action.length > 0);
  check(`${type} reports hasActor true`, c.hasActor === true);
}

console.log("");
console.log("notification: deferred tag types produce NOTHING");

check("POST_TAG -> null", notificationCopy({ type: "POST_TAG", actor }) === null);
check("COMMENT_TAG -> null", notificationCopy({ type: "COMMENT_TAG", actor }) === null);
check("POST_TAG has no href", notificationHref({ type: "POST_TAG", actor, postId: "p1" }) === null);
check("COMMENT_TAG has no href", notificationHref({ type: "COMMENT_TAG", actor, postId: "p1" }) === null);

const src = await import("node:fs").then((fs) =>
  fs.readFileSync(new URL("../lib/social/notification-copy.js", import.meta.url), "utf8")
);
const live = src.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((l) => l.replace(/\/\/.*$/, "")).join("\n");
check("no POST_TAG string exists in live code", !/POST_TAG/.test(live));
check("no COMMENT_TAG string exists in live code", !/COMMENT_TAG/.test(live));
check("no 'tagged you' copy exists anywhere", !/tagged/i.test(src));
check("nothing promises a tagged user is notified", !/will be notified|they will be|notified/i.test(src));

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
