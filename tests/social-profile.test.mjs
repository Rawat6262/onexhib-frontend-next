/**
 * Tests for lib/social/profile.js and the Phase 11C contracts around it.
 *
 * WHAT THIS COVERS: the pure logic — self-detection, the edit whitelist,
 * validation, the follow reducer, the count clamp, name/role/location rendering
 * and error mapping — plus source-level assertions about the components that
 * consume them.
 *
 * WHAT IT DOES NOT COVER, AND CANNOT: this repository has no DOM test framework,
 * so nothing here verifies rendering, focus behaviour, keyboard navigation or
 * screen-reader output. The accessibility work in the components (real buttons,
 * aria-pressed, tablist semantics, label/description association, Sheet focus
 * trap) is reviewed by reading, not proven by these tests. Adding Vitest +
 * Testing Library would be the only way to prove it, and that is a separate
 * dependency decision.
 *
 * Run: npm run test:social
 */
import {
  BIO_MAX,
  HEADLINE_MAX,
  EDITABLE_PROFILE_FIELDS,
  isSelfProfile,
  buildProfileEditPayload,
  validateProfileEdit,
  planFollow,
  applyFollowerDelta,
  displayCount,
  displayName,
  initialsOf,
  roleLine,
  locationLine,
  describeRequestError,
} from "../lib/social/profile.js";
import { mergePage, canLoadMore, emptyList } from "../lib/social/cursor-list.js";
import { safeExternalUrl } from "../lib/safe-url.js";

let failed = 0;
function check(name, ok, detail = "") {
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

const read = (rel) =>
  import("node:fs").then((fs) => fs.readFileSync(new URL(rel, import.meta.url), "utf8"));
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((l) => l.replace(/\/\/.*$/, "")).join("\n");

/**
 * Also remove className strings, for STRUCTURAL greps only.
 *
 * Tailwind utility names collide with the vocabulary these assertions use:
 * `focus-visible:outline-offset-2` contains "offset", which made a check for
 * offset-based pagination fail on a CSS class. Long class lists also pushed real
 * JSX apart far enough to break proximity checks. Both were caught by this suite
 * failing on correct code.
 */
const stripClasses = (s) => s.replace(/className="[^"]*"/g, 'className=""');

console.log("profile: backend limits mirrored");

check("BIO_MAX is 500", BIO_MAX === 500);
check("HEADLINE_MAX is 120", HEADLINE_MAX === 120);

console.log("");
console.log("profile: self detection");

check("same id is self", isSelfProfile("abc", "abc") === true);
check("different id is not self", isSelfProfile("abc", "xyz") === false);
check("string vs ObjectId-like compares by value", isSelfProfile("abc", { toString: () => "abc" }) === true);
check("missing cached id is never self", isSelfProfile(null, "abc") === false);
check("missing profile id is never self", isSelfProfile("abc", null) === false);
check("both missing is not self", isSelfProfile(undefined, undefined) === false);
check("empty strings are not self", isSelfProfile("", "") === false);

console.log("");
console.log("profile: edit payload is a WHITELIST");

check("editable fields are exactly bio and headline", EDITABLE_PROFILE_FIELDS.join(",") === "bio,headline");
let payload = buildProfileEditPayload({ bio: "b", headline: "h" });
check("both fields are sent", payload.bio === "b" && payload.headline === "h");
check("exactly two keys", Object.keys(payload).sort().join(",") === "bio,headline");

// The form state is spread from a loaded profile, so without a whitelist these
// would all be posted.
payload = buildProfileEditPayload({
  bio: "b",
  headline: "h",
  avatarUrl: "x",
  coverUrl: "x",
  followerCount: 9,
  followingCount: 9,
  postCount: 9,
  following: true,
  user: { _id: "1", email: "a@b.com" },
  website: "https://evil.example",
  designation: "ADMIN",
  _id: "1",
});
check("no non-editable key survives", Object.keys(payload).sort().join(",") === "bio,headline", Object.keys(payload).join(","));
for (const forbidden of ["avatarUrl", "coverUrl", "followerCount", "postCount", "following", "user", "website", "designation", "_id", "email"]) {
  check(`${forbidden} is not in the body`, !(forbidden in payload));
}
check("values are trimmed", buildProfileEditPayload({ bio: "  b  ", headline: " h " }).bio === "b");
check(
  "a cleared field is sent as empty string, not omitted",
  (() => {
    const p = buildProfileEditPayload({ bio: "", headline: "h" });
    return "bio" in p && p.bio === "";
  })()
);
check("non-string values become empty strings", buildProfileEditPayload({ bio: 42, headline: null }).bio === "");
check("a null form does not throw", Object.keys(buildProfileEditPayload(null)).length === 2);

console.log("");
console.log("profile: edit validation mirrors the backend");

check("empty is valid — a new profile has neither field", validateProfileEdit({ bio: "", headline: "" }).valid === true);
check("at the bio limit is valid", validateProfileEdit({ bio: "x".repeat(BIO_MAX), headline: "" }).valid === true);
check("one over the bio limit is invalid", validateProfileEdit({ bio: "x".repeat(BIO_MAX + 1), headline: "" }).valid === false);
check("the bio error names the limit", validateProfileEdit({ bio: "x".repeat(BIO_MAX + 1) }).errors.bio.includes(String(BIO_MAX)));
check("at the headline limit is valid", validateProfileEdit({ headline: "x".repeat(HEADLINE_MAX) }).valid === true);
check("one over the headline limit is invalid", validateProfileEdit({ headline: "x".repeat(HEADLINE_MAX + 1) }).valid === false);
check(
  "both over reports both",
  (() => {
    const r = validateProfileEdit({ bio: "x".repeat(BIO_MAX + 1), headline: "x".repeat(HEADLINE_MAX + 1) });
    return !r.valid && r.errors.bio && r.errors.headline;
  })()
);
check(
  "trailing whitespace does not push a field over the limit",
  validateProfileEdit({ bio: "x".repeat(BIO_MAX) + "   " }).valid === true
);

console.log("");
console.log("profile: follow state machine");

let plan = planFollow(false);
check("not following -> follow, +1", plan.action === "follow" && plan.nextFollowing === true && plan.followerDelta === 1, JSON.stringify(plan));
plan = planFollow(true);
check("following -> unfollow, -1", plan.action === "unfollow" && plan.nextFollowing === false && plan.followerDelta === -1, JSON.stringify(plan));
check("only two actions exist", ["follow", "unfollow"].includes(planFollow(true).action) && ["follow", "unfollow"].includes(planFollow(false).action));
check("the delta always matches the direction", planFollow(false).followerDelta === 1 && planFollow(true).followerDelta === -1);

console.log("");
console.log("profile: follower count — optimism and rollback");

check("following increments", applyFollowerDelta(5, 1) === 6);
check("unfollowing decrements", applyFollowerDelta(5, -1) === 4);
check(
  "rollback restores the original",
  (() => {
    const start = 5;
    const p = planFollow(false);
    const optimistic = applyFollowerDelta(start, p.followerDelta);
    const rolledBack = applyFollowerDelta(optimistic, -p.followerDelta);
    return rolledBack === start;
  })()
);
check(
  "rollback restores for unfollow too",
  (() => {
    const start = 5;
    const p = planFollow(true);
    return applyFollowerDelta(applyFollowerDelta(start, p.followerDelta), -p.followerDelta) === start;
  })()
);

console.log("");
console.log("profile: the count can NEVER go negative");

// Reachable without a bug: the profile's counts are a snapshot, so unfollowing
// after someone else's unfollow landed can subtract from a displayed 0.
check("decrementing from 0 clamps at 0", applyFollowerDelta(0, -1) === 0);
check("repeated decrements stay at 0", applyFollowerDelta(applyFollowerDelta(0, -1), -1) === 0);
check("a negative stored count is floored", applyFollowerDelta(-5, -1) === 0);
check("undefined is treated as 0", applyFollowerDelta(undefined, -1) === 0);
check("NaN is treated as 0", applyFollowerDelta(NaN, 1) === 1);
check("a numeric string works", applyFollowerDelta("7", 1) === 8);
check("displayCount never returns negative", displayCount(-3) === 0);
check("displayCount floors fractions", displayCount(4.9) === 4);
check("displayCount handles nonsense", displayCount(undefined) === 0 && displayCount("x") === 0 && displayCount(null) === 0);
check(
  "no delta sequence from 0 produces a negative",
  [-1, 1].every((d) => applyFollowerDelta(0, d) >= 0)
);

console.log("");
console.log("profile: identity rendering");

check("first + last", displayName({ first_name: "Asha", last_name: "Rao" }) === "Asha Rao");
check("company falls back", displayName({ company_name: "Acme Ltd" }) === "Acme Ltd");
check("personal name wins", displayName({ first_name: "Asha", company_name: "Acme" }) === "Asha");
check("neutral label when nothing", displayName({}) === "OneXhib user");
check("null user", displayName(null) === "OneXhib user");
check("initials", initialsOf("Asha Rao") === "AR");
check("initials of one word", initialsOf("Asha") === "A");
check("initials cap at two", initialsOf("A B C D") === "AB");
check("initials fall back", initialsOf("") === "OX" && initialsOf(null) === "OX");

check("role at company", roleLine({ designation: "Director", company_name: "Acme" }) === "Director at Acme");
check("designation alone", roleLine({ designation: "Director" }) === "Director");
check("company alone", roleLine({ company_name: "Acme" }) === "Acme");
check("nothing -> null, so no blank line renders", roleLine({}) === null);
check("blank strings -> null", roleLine({ designation: "  ", company_name: "" }) === null);
check("location both", locationLine({ city: "Delhi", country: "IN" }) === "Delhi, IN");
check("location one", locationLine({ city: "Delhi" }) === "Delhi");
check("location none -> null", locationLine({}) === null);
check("null user -> null", roleLine(null) === null && locationLine(null) === null);

console.log("");
console.log("profile: website is never rendered raw");

check("a valid https website passes", safeExternalUrl("https://acme.example") !== null);
check("javascript: is refused", safeExternalUrl("javascript:alert(1)") === null);
check("a bare domain is refused", safeExternalUrl("acme.example") === null);
check("an empty website is refused", safeExternalUrl("") === null);

const headerSrc = await read("../components/social/ProfileHeader.jsx");
const headerLive = stripComments(headerSrc);
check("ProfileHeader routes the website through safeExternalUrl", /safeExternalUrl\(\s*user\.website\s*\)/.test(headerLive));
check(
  "ProfileHeader never uses the raw value in an href",
  !/href=\{\s*(user|profile)\.(user\.)?website/.test(headerLive),
  "raw website href found"
);
check("the link carries noopener noreferrer nofollow", /noopener noreferrer nofollow/.test(headerLive));
check("the link opens in a new tab", /target="_blank"/.test(headerLive));

console.log("");
console.log("profile: error mapping and 404 concealment");

const err = (status, message) => ({ response: { status, data: message ? { message } : {} } });
check("404 -> neutral copy", describeRequestError(err(404)) === "User not found.");
check(
  "404 does NOT distinguish missing from not-visible",
  describeRequestError(err(404, "Post not found.")) === "User not found.",
  describeRequestError(err(404, "Post not found."))
);
check("429 uses the server's wording", describeRequestError(err(429, "Too many follow requests.")) === "Too many follow requests.");
check("429 without a message still explains", /wait/i.test(describeRequestError(err(429))));
check("400 shows the validation message", describeRequestError(err(400, "Bio too long.")) === "Bio too long.");
check("500 uses the caller's fallback", describeRequestError(err(500), "Could not load.") === "Could not load.");
check("a network error (no response) uses the fallback", describeRequestError(new Error("Network Error"), "Could not load.") === "Could not load.");
check("no axios internals leak", !/axios|stack|Error:/i.test(describeRequestError(err(500))));
check("a null error does not throw", typeof describeRequestError(null) === "string");

console.log("");
console.log("profile: followers/following pagination reuses cursor-list");

const CURSOR = "b3BhcXVlLWN1cnNvcg";
let list = mergePage(emptyList(), { items: [{ _id: "u1" }, { _id: "u2" }], nextCursor: CURSOR, hasMore: true }, "replace");
check("first page replaces", list.items.length === 2);
list = mergePage(list, { items: [{ _id: "u3" }], nextCursor: null, hasMore: false });
check("second page appends", list.items.map((u) => u._id).join(",") === "u1,u2,u3");
list = mergePage(
  mergePage(emptyList(), { items: [{ _id: "u1" }], nextCursor: CURSOR, hasMore: true }, "replace"),
  { items: [{ _id: "u1" }, { _id: "u2" }], hasMore: false }
);
check("a repeated user appears once", list.items.length === 2);

console.log("");
console.log("profile: THE SHORT-PAGE RULE");

/*
 * The backend drives hasMore/nextCursor from the FOLLOW EDGES, then drops any
 * edge whose user has been deleted during identity hydration. So a page can
 * return fewer visible users than the limit while more pages remain. Inferring
 * the end from items.length would truncate the list at the first deleted account.
 */
const shortButMore = mergePage(
  emptyList(),
  { items: [{ _id: "u1" }, { _id: "u2" }], nextCursor: CURSOR, hasMore: true },
  "replace"
);
check("a short page with hasMore true can still load more", canLoadMore(shortButMore) === true);
check("2 items with a limit of 20 is NOT the end", shortButMore.items.length < 20 && canLoadMore(shortButMore) === true);
const fullButDone = mergePage(
  emptyList(),
  { items: Array.from({ length: 20 }, (_, i) => ({ _id: "u" + i })), nextCursor: null, hasMore: false },
  "replace"
);
check("a full page with hasMore false IS the end", canLoadMore(fullButDone) === false);
check("an empty page with hasMore true but no cursor cannot loop", canLoadMore({ items: [], nextCursor: null, hasMore: true }) === false);

const listSrc = stripComments(await read("../components/social/UserList.jsx"));
check("UserList decides continuation with canLoadMore", /canLoadMore\(/.test(listSrc));
check(
  "UserList never compares items.length to a limit",
  !/items\.length\s*[<>=]=?\s*\d|length\s*<\s*limit/.test(listSrc),
  "a length comparison was found"
);
check("UserList reads hasMore and nextCursor from the response", /hasMore/.test(listSrc) && /nextCursor/.test(listSrc));
check("UserList does not reimplement pagination", /cursor-list/.test(listSrc));
check(
  "UserList uses no page/skip/offset pagination",
  !/\bskip\b|offset[:=]|[?&](page|offset)=|pageNumber/.test(stripClasses(listSrc)),
  "a pagination offset was found"
);

console.log("");
console.log("profile: N+1 prevention in lists");

const rowSrc = stripComments(await read("../components/social/UserRow.jsx"));
check("UserRow issues no request at all", !/axios|getSocialProfile|getFollow|fetch\(/.test(rowSrc));
check("UserRow imports no model", !/models\//.test(rowSrc));
check("UserRow has no per-row follow control", !/FollowButton/.test(rowSrc));
check("UserRow links to the encoded profile path", /encodeURIComponent/.test(rowSrc));

console.log("");
console.log("profile: no redundant follow-status request");

const clientSrc = stripComments(await read("../app/(social)/social/profile/[userId]/profile-client.jsx"));
const followSrc = stripComments(await read("../components/social/FollowButton.jsx"));
check(
  "nothing calls getFollowStatus — profile.following already carries it",
  !/getFollowStatus/.test(clientSrc + followSrc + headerLive),
  "a follow-status call was found"
);
check("FollowButton reads its initial state from a prop", /following/.test(followSrc));
check("FollowButton disables itself while pending", /disabled=\{pending\}/.test(followSrc));
check("FollowButton is a real button with aria-pressed", /<button/.test(followSrc) && /aria-pressed/.test(followSrc));

console.log("");
console.log("profile: request-race handling");

check("the profile client aborts in-flight requests", /AbortController/.test(clientSrc) && /abort\(\)/.test(clientSrc));
check("UserList aborts too", /AbortController/.test(listSrc) && /abort\(\)/.test(listSrc));
check("both ignore canceled errors rather than showing them", /CanceledError|ERR_CANCELED/.test(clientSrc) && /CanceledError|ERR_CANCELED/.test(listSrc));
check("load-more is disabled while loading", /disabled=\{loadingMore\}/.test(listSrc));

console.log("");
console.log("profile: self-profile suppresses the follow control");

/*
 * The branches are compared SEPARATELY, and that matters.
 *
 * A regex of the form /isSelf\s*\?[\s\S]*?:\s*\([\s\S]*?FollowButton/ looks like
 * it proves this, and does not: `!isSelf ?` also contains `isSelf ?`, so swapping
 * the branches — which would put Follow on your own profile, the exact bug this
 * guards — still matched. A mutation test caught that. So the ternary is split and
 * each half is checked for what it must and must not contain.
 */
const selfTernary = (() => {
  const body = stripClasses(headerLive);
  const start = body.indexOf("{isSelf ? (");
  if (start === -1) return null;
  const rest = body.slice(start);
  const split = rest.indexOf(") : (");
  if (split === -1) return null;
  return { whenSelf: rest.slice(0, split), whenOther: rest.slice(split) };
})();

check("the control ternary is keyed on `isSelf` un-negated", selfTernary !== null, "no `{isSelf ? (` found");
check(
  "the SELF branch contains no follow control",
  selfTernary && !/FollowButton|Follow<|Unfollow/.test(selfTernary.whenSelf),
  "a follow control appears on your own profile"
);
check("the SELF branch offers Edit profile", selfTernary && /Edit profile/.test(selfTernary.whenSelf));
check(
  "the OTHER branch contains FollowButton",
  selfTernary && /<FollowButton/.test(selfTernary.whenOther),
  "FollowButton is not in the non-self branch"
);
check(
  "the OTHER branch offers no Edit profile",
  selfTernary && !/Edit profile/.test(selfTernary.whenOther)
);
check(
  "there is exactly one FollowButton usage",
  (stripClasses(headerLive).match(/<FollowButton/g) || []).length === 1
);
check("the edit control is gated on isSelf", /isSelf/.test(headerLive));
check("the edit sheet is gated on self", /self\s*&&\s*editing/.test(clientSrc));

console.log("");
console.log("profile: forbidden endpoints and private fields");

const allNew = [
  stripComments(await read("../lib/social/profile.js")),
  headerLive,
  listSrc,
  rowSrc,
  followSrc,
  clientSrc,
  stripComments(await read("../components/social/ProfileEditSheet.jsx")),
  stripComments(await read("../components/social/InitialsAvatar.jsx")),
  stripComments(await read("../app/(social)/social/profile/[userId]/page.jsx")),
].join("\n");

check("the unsafe /api/find/signup/:id endpoint is never used", !/find\/signup/.test(allNew));
check("/app/finduser is never used", !/finduser/.test(allNew));
check("no private Signup field is referenced", !/\bpassword\b|\botp\b|pendingPassword|mobile_number|isapproved|qrCode/i.test(allNew));
check("no email is rendered on a social profile", !/\.email\b/.test(allNew));
check("no Authorization or Bearer handling", !/Authorization|Bearer/i.test(allNew));
check("no JWT decoding", !/\bjwt\b|decodeToken|atob\(/i.test(allNew));
check("no cookie reading", !/document\.cookie/.test(allNew));
check("no dangerouslySetInnerHTML", !/dangerouslySetInnerHTML/.test(allNew));
check("no markdown or HTML parser", !/marked|markdown|html-react-parser|DOMPurify/i.test(allNew));
check("no tag notification types", !/POST_TAG|COMMENT_TAG/.test(allNew));
check("no avatar or cover upload", !/upload/i.test(allNew));
check("no user search", !/\/api\/search|userSearch|searchUsers/.test(allNew));
check("no feed or post implementation", !/getFeed\(|PostCard|createPost\(/.test(allNew));
check("no notification polling", !/getUnreadCount|setInterval/.test(allNew));

console.log("");
console.log("profile: the route is private");

/*
 * Asserted from source rather than from built HTML: the profile route is dynamic
 * (ƒ), so there is no prerendered file to grep — unlike /social, whose static
 * output the 11B work checked directly.
 */
const pageSrc = stripComments(await read("../app/(social)/social/profile/[userId]/page.jsx"));
check("the page exports metadata", /export const metadata/.test(pageSrc));
check("robots uses the shared NOINDEX_NOFOLLOW constant", /robots:\s*NOINDEX_NOFOLLOW/.test(pageSrc));
check("NOINDEX_NOFOLLOW is imported from lib/seo", /NOINDEX_NOFOLLOW.*from "@\/lib\/seo"/.test(pageSrc));
check(
  "the title is generic, not the person's name — that would need a server-side fetch",
  /title:\s*"Community profile"/.test(pageSrc)
);
check("the page fetches no protected data itself", !/axios|getSocialProfile|models\//.test(pageSrc));
check("the page delegates to a client component", /ProfileClient/.test(pageSrc));

console.log("");
console.log("profile: the cached auth user is only used for self-detection");

check(
  "the profile client reads the cached user solely to compare ids",
  /isSelfProfile\(\s*cachedUser\?\._id/.test(clientSrc),
  "cached user used elsewhere"
);
check(
  "identity fields are read from the API profile, not the cache",
  /profile\.user/.test(headerLive) && !/cachedUser\.(first_name|last_name|company_name|city|country|website)/.test(clientSrc)
);

console.log("");
console.log(failed ? `=== ${failed} FAILED ===` : "=== all passed ===");
process.exit(failed ? 1 : 0);
