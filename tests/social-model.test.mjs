/**
 * Tests for models/social.model.js — all 27 deployed social endpoints.
 *
 * NO NETWORK. axios.defaults.adapter is replaced with a recorder, so every call
 * is intercepted at the transport layer and resolved locally. Nothing reaches a
 * backend, nothing needs one running, and production is never touched.
 *
 * WHAT THIS PINS
 * Method and path for all 27 contracts, id encoding on every path segment,
 * cursors passed as params rather than concatenated, bodies forwarded untouched,
 * FormData preserved, and — by reading the source — the absence of a second HTTP
 * architecture, a manual multipart boundary, or any auth header.
 *
 * Run: npm run test:social
 */
import axios from "axios";
import * as social from "../models/social.model.js";

let failed = 0;
function check(name, ok, detail = "") {
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

// ---- the module source, for the contract greps -------------------------------

const src = await import("node:fs").then((fs) =>
  fs.readFileSync(new URL("../models/social.model.js", import.meta.url), "utf8")
);
/** Comments stripped: this file documents what it deliberately does not do. */
const live = src.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((l) => l.replace(/\/\/.*$/, "")).join("\n");

// ---- transport recorder -----------------------------------------------------

let calls = [];
axios.defaults.adapter = (config) => {
  calls.push(config);
  return Promise.resolve({ data: { success: true }, status: 200, statusText: "OK", headers: {}, config });
};

/** Run one model function and return the intercepted request config. */
async function capture(fn) {
  calls = [];
  await fn();
  if (calls.length !== 1) throw new Error(`expected exactly 1 request, got ${calls.length}`);
  return calls[0];
}

/** The full URL axios would build, params included — what actually goes on the wire. */
function fullUrl(config) {
  const qs = config.params ? new URLSearchParams(config.params).toString() : "";
  return qs ? `${config.url}?${qs}` : config.url;
}

const ID = "64f000000000000000000001";
const ID2 = "64f000000000000000000002";
const CURSOR = "MjAyNi0wOS0yNlQwMDowMDowMC4wMDBafDY0ZjAwMA==";

// ---- the contract table -----------------------------------------------------

/** [group, label, method, expected url, invoke] */
const CONTRACTS = [
  ["follow", "followUser", "post", `/api/social/follow/${ID}`, () => social.followUser(ID)],
  ["follow", "unfollowUser", "delete", `/api/social/follow/${ID}`, () => social.unfollowUser(ID)],
  ["follow", "getFollowStatus", "get", `/api/social/follow-status/${ID}`, () => social.getFollowStatus(ID)],
  ["follow", "getFollowers", "get", `/api/social/followers/${ID}`, () => social.getFollowers(ID)],
  ["follow", "getFollowing", "get", `/api/social/following/${ID}`, () => social.getFollowing(ID)],

  ["profile", "getSocialProfile", "get", `/api/social/profile/${ID}`, () => social.getSocialProfile(ID)],
  ["profile", "updateSocialProfile", "put", "/api/social/profile", () => social.updateSocialProfile({ bio: "b" })],

  ["posts", "createPost", "post", "/api/social/posts", () => social.createPost({ title: "t" })],
  ["posts", "getFeed", "get", "/api/social/feed", () => social.getFeed()],
  ["posts", "getMyPosts", "get", "/api/social/posts/me", () => social.getMyPosts()],
  ["posts", "getUserPosts", "get", `/api/social/posts/user/${ID}`, () => social.getUserPosts(ID)],
  ["posts", "getPost", "get", `/api/social/posts/${ID}`, () => social.getPost(ID)],
  ["posts", "updatePost", "put", `/api/social/posts/${ID}`, () => social.updatePost(ID, { title: "t" })],
  ["posts", "deletePost", "delete", `/api/social/posts/${ID}`, () => social.deletePost(ID)],

  ["media", "addPostMedia", "post", `/api/social/posts/${ID}/media`, () => social.addPostMedia(ID, new FormData())],
  ["media", "deletePostMedia", "delete", `/api/social/posts/${ID}/media/${ID2}`, () => social.deletePostMedia(ID, ID2)],

  ["reactions", "setPostReaction", "post", `/api/social/posts/${ID}/reaction`, () => social.setPostReaction(ID, "like")],
  ["reactions", "clearPostReaction", "delete", `/api/social/posts/${ID}/reaction`, () => social.clearPostReaction(ID)],
  ["reactions", "getPostReaction", "get", `/api/social/posts/${ID}/reaction`, () => social.getPostReaction(ID)],

  ["comments", "createComment", "post", `/api/social/posts/${ID}/comments`, () => social.createComment(ID, { content: "c" })],
  ["comments", "getComments", "get", `/api/social/posts/${ID}/comments`, () => social.getComments(ID)],
  ["comments", "updateComment", "put", `/api/social/comments/${ID}`, () => social.updateComment(ID, { content: "c" })],
  ["comments", "deleteComment", "delete", `/api/social/comments/${ID}`, () => social.deleteComment(ID)],

  ["notifications", "getNotifications", "get", "/api/social/notifications", () => social.getNotifications()],
  ["notifications", "getUnreadCount", "get", "/api/social/notifications/unread-count", () => social.getUnreadCount()],
  ["notifications", "markAllNotificationsRead", "put", "/api/social/notifications/read-all", () => social.markAllNotificationsRead()],
  ["notifications", "markNotificationRead", "put", `/api/social/notifications/${ID}/read`, () => social.markNotificationRead(ID)],
];

console.log("social model: all 27 endpoint contracts");

check("exactly 27 contracts are asserted", CONTRACTS.length === 27, String(CONTRACTS.length));

let group = "";
for (const [g, label, method, url, invoke] of CONTRACTS) {
  if (g !== group) {
    group = g;
    console.log(`  -- ${g}`);
  }
  const cfg = await capture(invoke);
  check(
    `${method.toUpperCase().padEnd(6)} ${url}`,
    cfg.method === method && cfg.url === url,
    `${cfg.method} ${cfg.url}`
  );
}

console.log("");
console.log("social model: the exported surface is exactly those 27");

const exported = Object.keys(social).filter((k) => typeof social[k] === "function").sort();
check("27 functions exported", exported.length === 27, `${exported.length}: ${exported.join(",")}`);
check(
  "every contract name is exported",
  CONTRACTS.every(([, label]) => exported.includes(label)),
  CONTRACTS.filter(([, l]) => !exported.includes(l)).map(([, l]) => l).join(",")
);
check("no extra function slipped in", exported.every((name) => CONTRACTS.some(([, l]) => l === name)));

console.log("");
console.log("social model: id encoding on every path segment");

let cfg = await capture(() => social.getSocialProfile("a/b"));
check("a slash in an id cannot add a path segment", cfg.url === "/api/social/profile/a%2Fb", cfg.url);
cfg = await capture(() => social.getPost("a?b=c"));
check("a query char in an id cannot start a query string", cfg.url === "/api/social/posts/a%3Fb%3Dc", cfg.url);
cfg = await capture(() => social.getPost("../../admin"));
check("a traversal attempt is encoded, not resolved", cfg.url === "/api/social/posts/..%2F..%2Fadmin", cfg.url);
cfg = await capture(() => social.deletePostMedia("p/1", "m/2"));
check("BOTH segments are encoded", cfg.url === "/api/social/posts/p%2F1/media/m%2F2", cfg.url);
cfg = await capture(() => social.markNotificationRead("n#1"));
check("a fragment char is encoded", cfg.url === "/api/social/notifications/n%231/read", cfg.url);
cfg = await capture(() => social.getUserPosts("a b"));
check("a space is encoded", cfg.url === "/api/social/posts/user/a%20b", cfg.url);
/*
 * Every single-id function, driven with a hostile id: the raw value must never
 * survive into the URL. Enumerated rather than spot-checked, so a new endpoint
 * added without encodeURIComponent fails here instead of shipping.
 */
const HOSTILE = "a/b?c#d e";
const SINGLE_ID_FNS = [
  social.followUser, social.unfollowUser, social.getFollowStatus,
  social.getFollowers, social.getFollowing, social.getSocialProfile,
  social.getUserPosts, social.getPost, social.deletePost,
  social.clearPostReaction, social.getPostReaction, social.getComments,
  social.deleteComment, social.markNotificationRead,
];
check("14 single-id functions enumerated", SINGLE_ID_FNS.length === 14, String(SINGLE_ID_FNS.length));
for (const fn of SINGLE_ID_FNS) {
  const c = await capture(() => fn(HOSTILE));
  check(
    `${fn.name} encodes a hostile id`,
    !c.url.includes(HOSTILE) && c.url.includes(encodeURIComponent(HOSTILE)),
    c.url
  );
}
// Two-id and body-taking functions need their own invocations.
for (const [label, invoke] of [
  ["deletePostMedia", () => social.deletePostMedia(HOSTILE, HOSTILE)],
  ["updatePost", () => social.updatePost(HOSTILE, {})],
  ["setPostReaction", () => social.setPostReaction(HOSTILE, "like")],
  ["createComment", () => social.createComment(HOSTILE, {})],
  ["updateComment", () => social.updateComment(HOSTILE, {})],
  ["addPostMedia", () => social.addPostMedia(HOSTILE, new FormData())],
]) {
  const c = await capture(invoke);
  check(`${label} encodes a hostile id`, !c.url.includes(HOSTILE), c.url);
}

console.log("");
console.log("social model: cursors are params, never concatenated");

cfg = await capture(() => social.getFeed({ cursor: CURSOR }));
check("the cursor does not appear in the path", cfg.url === "/api/social/feed", cfg.url);
check("the cursor is a param", cfg.params && cfg.params.cursor === CURSOR);
check(
  "base64 padding and symbols survive encoding",
  fullUrl(cfg).includes(encodeURIComponent(CURSOR)),
  fullUrl(cfg)
);
cfg = await capture(() => social.getFeed({ limit: 20, cursor: CURSOR }));
check("limit and cursor travel together", cfg.params.limit === 20 && cfg.params.cursor === CURSOR);
cfg = await capture(() => social.getFeed());
check("no params at all when none are given", cfg.params === undefined, JSON.stringify(cfg.params));
cfg = await capture(() => social.getFeed({}));
check("an empty page object sends no params", cfg.params === undefined);
cfg = await capture(() => social.getFeed({ cursor: null }));
check("a null cursor is omitted rather than sent as 'null'", cfg.params === undefined);
cfg = await capture(() => social.getComments(ID, { cursor: CURSOR }));
check("comments paginate the same way", cfg.url === `/api/social/posts/${ID}/comments` && cfg.params.cursor === CURSOR);
cfg = await capture(() => social.getNotifications({ cursor: CURSOR }));
check("notifications paginate the same way", cfg.url === "/api/social/notifications" && cfg.params.cursor === CURSOR);
for (const fn of [social.getFollowers, social.getFollowing, social.getUserPosts]) {
  cfg = await capture(() => fn(ID, { cursor: CURSOR }));
  check(`a cursor reaches params for ${fn.name}`, cfg.params.cursor === CURSOR);
}
cfg = await capture(() => social.getMyPosts({ cursor: CURSOR }));
check("getMyPosts takes a page object", cfg.params.cursor === CURSOR);

console.log("");
console.log("social model: bodies are forwarded untouched");

cfg = await capture(() => social.setPostReaction(ID, "like"));
check("reaction body is { reaction: 'like' }", JSON.parse(cfg.data).reaction === "like", String(cfg.data));
cfg = await capture(() => social.setPostReaction(ID, "dislike"));
check("...and 'dislike'", JSON.parse(cfg.data).reaction === "dislike");
cfg = await capture(() => social.updateSocialProfile({ bio: "b", headline: "h" }));
check("profile body passes through", JSON.parse(cfg.data).headline === "h");
cfg = await capture(() => social.updatePost(ID, { title: "t", visibility: "FOLLOWERS" }));
check("post update body passes through", JSON.parse(cfg.data).visibility === "FOLLOWERS");
cfg = await capture(() => social.createComment(ID, { content: "hello" }));
check("comment body passes through", JSON.parse(cfg.data).content === "hello");
cfg = await capture(() => social.followUser(ID));
check("follow sends no body", cfg.data === undefined || cfg.data === null || cfg.data === "", String(cfg.data));
cfg = await capture(() => social.markAllNotificationsRead());
check("mark-all sends no body", cfg.data === undefined || cfg.data === null || cfg.data === "");

console.log("");
console.log("social model: multipart");

const fd = new FormData();
fd.append("title", "t");
fd.append("media", new Blob(["x"], { type: "image/png" }), "a.png");
cfg = await capture(() => social.createPost(fd));
check("createPost forwards the FormData instance itself", cfg.data === fd);
check("createPost does not JSON-stringify FormData", typeof cfg.data !== "string");
/*
 * THE CONTENT-TYPE ASSERTION IS ABOUT OUR MODULE, NOT ABOUT AXIOS.
 *
 * What matters is that this module never writes a multipart Content-Type by
 * hand: doing so omits the boundary token and the server cannot parse the body.
 * That is asserted two ways — the FormData instance arrives untouched (above),
 * and the source contains no `multipart/form-data` string (below).
 *
 * The FINAL header value is decided by axios's environment-specific adapter, and
 * this test replaces that adapter. Traced here: a request interceptor sees
 * Content-Type `undefined` (nothing in our code sets it), and the value only
 * appears during transformRequest on the non-browser path — axios reports
 * hasStandardBrowserEnv false under Node. transformRequest's FormData branch
 * returns the data untouched without setting a content type, so in a browser the
 * header is left unset and the browser supplies `multipart/form-data` with its
 * own boundary.
 *
 * Asserting the header value here would therefore pin axios's Node behaviour
 * rather than our contract. Phase 11E should confirm the real header in a browser
 * when the upload UI is built.
 */
// `live`, not `src`: the module's own comments explain that no Content-Type is
// set, so grepping the raw text matches the very sentence promising the property.
check(
  "our module sets no Content-Type of its own",
  !/Content-Type|content-type/i.test(live),
  "live code mentions a content type"
);
const fd2 = new FormData();
cfg = await capture(() => social.addPostMedia(ID, fd2));
check("addPostMedia forwards FormData too", cfg.data === fd2);
cfg = await capture(() => social.createPost({ title: "text only" }));
check("a text-only post still sends JSON", typeof cfg.data === "string" && JSON.parse(cfg.data).title === "text only");

console.log("");
console.log("social model: no second HTTP architecture, no auth handling");

check("no axios.create()", !/axios\.create/.test(live));
check("no baseURL", !/baseURL/.test(live));
check("no extra interceptor", !/interceptors/.test(live));
check("no withCredentials override — AuthProvider owns that", !/withCredentials/.test(live));
check("no Authorization header", !/Authorization/i.test(live));
check("no Bearer token", !/Bearer/i.test(live));
check("no JWT handling", !/jwt|decode/i.test(live));
check("no cookie reading", !/document\.cookie|cookies?\(/i.test(live));
check("no localStorage", !/localStorage|sessionStorage/.test(live));
check("no manual multipart Content-Type", !/multipart\/form-data/.test(live));
check("no absolute URL or hostname", !/https?:\/\//.test(live));
check("no BACKEND_URL or NEXT_PUBLIC", !/BACKEND_URL|NEXT_PUBLIC/.test(live));
check("no timeout or retry machinery", !/timeout|retry|axios-retry/.test(live));
check("every path is relative and under /api/social", (live.match(/["'`]\/api\/[^"'`]*/g) || []).every((p) => p.includes("/api/social/")));

console.log("");
console.log("social model: forbidden endpoints and deferred features");

check(
  "the unsafe /api/find/signup/:id endpoint is NEVER used",
  !/find\/signup/.test(live)
);
check("no /app/finduser either", !/finduser/.test(live));
check("no admin endpoint", !/\/api\/admin/.test(live));
check("no user-search call (no such endpoint exists)", !/\/api\/search|globalSearch/.test(live));
check("no POST_TAG", !/POST_TAG/.test(live));
check("no COMMENT_TAG", !/COMMENT_TAG/.test(live));
check("no cursor parsing or construction", !/atob|btoa|Buffer|base64/.test(live));

console.log("");
console.log(failed ? `=== ${failed} FAILED ===` : "=== all passed ===");
process.exit(failed ? 1 : 0);
