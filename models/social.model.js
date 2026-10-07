import axios from "axios";

/**
 * The social API surface — all 35 deployed endpoints, one thin function each.
 *
 * TRANSPORT IS ALREADY SOLVED, AND IS NOT RE-SOLVED HERE
 * Every path is relative. next.config.mjs rewrites /api/:path* to the server-only
 * BACKEND_URL, so requests stay same-origin and the httpOnly `uid` cookie rides
 * along by itself. AuthProvider sets axios.defaults.withCredentials once and
 * installs the 401/403 interceptor that evicts a dead session.
 *
 * So there is deliberately NO axios.create(), no baseURL, no second interceptor,
 * no retry wrapper and no Authorization header. A social-specific client would be
 * a second HTTP architecture next to models/*.model.js, and the first thing it
 * would have to reimplement is the session handling that already works.
 *
 * IDS ARE ALWAYS ENCODED
 * Every id reaching a path segment goes through encodeURIComponent. These are
 * ObjectIds and so are hex in practice, but this layer must not depend on a
 * caller having validated that: a value arriving from a route param or a
 * notification row must not be able to add path segments or a query string.
 *
 * CURSORS ARE OPAQUE AND GO THROUGH `params`
 * A cursor is base64url, which contains `-` and `_` and can contain `=`. Passing
 * it via axios `params` gets it encoded correctly and keeps the cursor a value
 * rather than something spliced into a URL. Nothing here parses, compares or
 * builds one.
 *
 * THIN ON PURPOSE
 * No response unwrapping, no error translation, no defaults, no UI state. Each
 * function returns the axios promise exactly as the other models do, so callers
 * get the same `{ data }` shape and the same errors they already handle.
 */

const id = (value) => encodeURIComponent(String(value));

/**
 * `{ limit, cursor }` as query params, with absent values omitted so no empty
 * params are sent.
 *
 * `signal` rides in the same object and becomes axios config rather than a query
 * param. It is here because cancellation is a per-request concern the caller must
 * be able to express — a profile list has to abandon its in-flight page when the
 * viewer navigates to a different person, or the previous person's response lands
 * in the new list. Putting it in the page object keeps every function a one-liner
 * instead of growing a third argument.
 */
function pageParams({ limit, cursor, signal } = {}) {
  const params = {};
  if (limit !== undefined && limit !== null && limit !== "") params.limit = limit;
  if (cursor) params.cursor = cursor;

  const config = {};
  if (Object.keys(params).length) config.params = params;
  if (signal) config.signal = signal;

  return Object.keys(config).length ? config : undefined;
}

// --- FOLLOW (5) --------------------------------------------------------------

export const followUser = (userId) => axios.post(`/api/social/follow/${id(userId)}`);

export const unfollowUser = (userId) => axios.delete(`/api/social/follow/${id(userId)}`);

export const getFollowStatus = (userId) => axios.get(`/api/social/follow-status/${id(userId)}`);

export const getFollowers = (userId, page) =>
  axios.get(`/api/social/followers/${id(userId)}`, pageParams(page));

export const getFollowing = (userId, page) =>
  axios.get(`/api/social/following/${id(userId)}`, pageParams(page));

// --- PROFILE (2) -------------------------------------------------------------

/**
 * `config` is passed straight to axios, matching auth.model.js's
 * `signup(payload, config)`. It exists so a caller can supply a `signal`: a
 * profile page must abandon its in-flight request when the viewer navigates to a
 * different person, or the previous person's response paints the new page.
 */
export const getSocialProfile = (userId, config) =>
  axios.get(`/api/social/profile/${id(userId)}`, config);

/** Only `bio` and `headline` are editable — the backend ignores anything else. */
export const updateSocialProfile = (payload) => axios.put("/api/social/profile", payload);

// --- POSTS (7) ---------------------------------------------------------------

/**
 * Create a post.
 *
 * Accepts a plain object for a text-only post, or FormData when media is
 * attached — the route mounts multer's .array("media", 10), so one multipart
 * request creates the post and uploads its files together.
 *
 * NO Content-Type IS SET. When handed FormData, the browser must set
 * `multipart/form-data` itself so it can append the boundary token; writing the
 * header by hand omits the boundary and the server cannot parse the body.
 */
export const createPost = (payload) => axios.post("/api/social/posts", payload);

export const getFeed = (page) => axios.get("/api/social/feed", pageParams(page));

export const getMyPosts = (page) => axios.get("/api/social/posts/me", pageParams(page));

export const getUserPosts = (userId, page) =>
  axios.get(`/api/social/posts/user/${id(userId)}`, pageParams(page));

/**
 * One post, canonical shape. Carries NO `viewerReaction` — only the feed attaches
 * that. A caller needing it reads getPostReaction once; see lib/social/comment.js.
 *
 * `config` is axios config, for the `signal` a detail page needs to abandon this
 * request when the viewer navigates to a different post.
 */
export const getPost = (postId, config) => axios.get(`/api/social/posts/${id(postId)}`, config);

/** Editable: title, description, visibility, taggedUsers. Media is separate. */
export const updatePost = (postId, payload) =>
  axios.put(`/api/social/posts/${id(postId)}`, payload);

export const deletePost = (postId) => axios.delete(`/api/social/posts/${id(postId)}`);

// --- MEDIA (2) ---------------------------------------------------------------

/** FormData with the `media` field. Content-Type is left to the browser. */
export const addPostMedia = (postId, formData) =>
  axios.post(`/api/social/posts/${id(postId)}/media`, formData);

export const deletePostMedia = (postId, mediaId) =>
  axios.delete(`/api/social/posts/${id(postId)}/media/${id(mediaId)}`);

// --- REACTIONS (3) -----------------------------------------------------------

/**
 * Set or switch a reaction. `reaction` is the WIRE value, "like" or "dislike".
 *
 * Posting the reaction the viewer already holds is a NO-OP server-side, not a
 * toggle. Clearing one is clearPostReaction below. Callers should route clicks
 * through lib/social/reaction-machine.js rather than deciding here.
 */
export const setPostReaction = (postId, reaction) =>
  axios.post(`/api/social/posts/${id(postId)}/reaction`, { reaction });

export const clearPostReaction = (postId) =>
  axios.delete(`/api/social/posts/${id(postId)}/reaction`);

/**
 * The viewer's own reaction plus live counts. The feed already embeds this, so a
 * feed card must never call it — that would be one request per card.
 *
 * `config` is axios config, for a `signal`.
 */
export const getPostReaction = (postId, config) =>
  axios.get(`/api/social/posts/${id(postId)}/reaction`, config);

// --- COMMENTS (4) ------------------------------------------------------------

export const createComment = (postId, payload) =>
  axios.post(`/api/social/posts/${id(postId)}/comments`, payload);

export const getComments = (postId, page) =>
  axios.get(`/api/social/posts/${id(postId)}/comments`, pageParams(page));

export const updateComment = (commentId, payload) =>
  axios.put(`/api/social/comments/${id(commentId)}`, payload);

export const deleteComment = (commentId) =>
  axios.delete(`/api/social/comments/${id(commentId)}`);

// --- NOTIFICATIONS (4) -------------------------------------------------------

export const getNotifications = (page) =>
  axios.get("/api/social/notifications", pageParams(page));

/**
 * The viewer's unread total: `{ success, unreadCount }`. Index-only server-side.
 *
 * `config` is axios config, for the `signal` the badge provider needs so a poll in
 * flight when the shell unmounts cannot resolve into a dead component.
 */
export const getUnreadCount = (config) =>
  axios.get("/api/social/notifications/unread-count", config);

/** Literal path — registered before /:notificationId/read so it is not shadowed. */
export const markAllNotificationsRead = () =>
  axios.put("/api/social/notifications/read-all");

export const markNotificationRead = (notificationId) =>
  axios.put(`/api/social/notifications/${id(notificationId)}/read`);

// --- BLOCK (3) ---------------------------------------------------------------

/*
 * NO BODY ON BLOCK OR UNBLOCK, and that is not an oversight to be tidied up later.
 * The backend's two mutation endpoints REFUSE any body outright rather than ignoring
 * one, because a request naming a `blocker` is either a client bug or an attempt to
 * act as another user. axios sends no body when none is passed, so these must stay
 * one-argument calls.
 *
 * Both answer `{ success, blocked }` - a boolean saying which way the switch now sits,
 * never the row, the pair or the timestamps.
 */
export const blockUser = (userId) => axios.post(`/api/social/block/${id(userId)}`);

/**
 * DIRECTIONAL. This removes only the caller's own block row. If both parties blocked
 * each other the other row survives and the pair stays mutually invisible, so a 200
 * here must never be read as "we can see each other again".
 */
export const unblockUser = (userId) => axios.delete(`/api/social/block/${id(userId)}`);

/**
 * The accounts the SIGNED-IN VIEWER has blocked: `{ success, users, nextCursor, hasMore }`.
 *
 * NO userId ARGUMENT, deliberately - the endpoint takes none. The caller is the session,
 * so there is no parameter through which one user could read another's list. Adding one
 * here would be inventing a contract the server does not have.
 *
 * This list is the ONLY reliable way back to a blocked user's id: blocking conceals the
 * profile with the same 404 as a nonexistent account, and every feed, list and comment
 * path strips blocked users before hydration. An unblock UI therefore has to start here
 * rather than from a profile page.
 *
 * Paged like the follower lists - same opaque cursor, same `hasMore`.
 */
export const getBlockedUsers = (page) =>
  axios.get("/api/social/blocked", pageParams(page));

// --- MUTE (2) ----------------------------------------------------------------

/*
 * Mute is DIRECTIONAL and invisible to the muted user, and it is NOT block: a muted
 * user's profile, posts and comments all stay directly reachable. It suppresses only
 * the muter's own feed and notifications.
 *
 * There is no mute-status GET, on purpose - "who muted me" is the fact mute exists to
 * withhold, so the model carries no reverse index. The viewer's own outgoing state
 * arrives as `viewerMuted` on GET /api/social/profile/:userId instead, which is why no
 * client ever needs to remember it locally.
 *
 * Both take no body and answer `{ success, muted }`.
 */
export const muteUser = (userId) => axios.post(`/api/social/mute/${id(userId)}`);

export const unmuteUser = (userId) => axios.delete(`/api/social/mute/${id(userId)}`);

// --- REPORT (3) --------------------------------------------------------------

/*
 * THREE SEPARATE FUNCTIONS, NOT ONE GENERIC HELPER TAKING A TYPE.
 *
 * The backend has three distinct routes and deliberately stores no `targetType`; the
 * route itself is what says what was reported. A helper like
 * `report(type, id, body)` would put the target kind into a variable, and a wrong
 * variable would file a report against the wrong collection while still answering 201.
 * Three one-line functions make the route a compile-time fact instead.
 *
 * THE BODY IS A STRICT ALLOW-LIST: exactly `reason` and `details`, nothing else. The
 * server REFUSES any other key rather than dropping it, so callers must not spread a
 * form object in here - no reporter, actor, recipient, dedupeKey, targetType or
 * reportedUser/Post/Comment. Those are all derived server-side from the session and
 * the path.
 *
 * Success is `201 { success: true }` and nothing more. It means "stored", not
 * "actioned": nothing is removed, nobody is banned, the target is not notified, and no
 * block or mute is applied. A caller must not imply otherwise.
 */
export const reportUser = (userId, payload) =>
  axios.post(`/api/social/report/user/${id(userId)}`, payload);

export const reportPost = (postId, payload) =>
  axios.post(`/api/social/report/post/${id(postId)}`, payload);

export const reportComment = (commentId, payload) =>
  axios.post(`/api/social/report/comment/${id(commentId)}`, payload);
