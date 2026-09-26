import axios from "axios";

/**
 * The social API surface — all 27 deployed endpoints, one thin function each.
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

/** `{ limit, cursor }` with absent values omitted, so no empty query params. */
function pageParams({ limit, cursor } = {}) {
  const params = {};
  if (limit !== undefined && limit !== null && limit !== "") params.limit = limit;
  if (cursor) params.cursor = cursor;
  return Object.keys(params).length ? { params } : undefined;
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

export const getSocialProfile = (userId) => axios.get(`/api/social/profile/${id(userId)}`);

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

export const getPost = (postId) => axios.get(`/api/social/posts/${id(postId)}`);

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

/** The viewer's own reaction plus live counts. The feed already embeds this. */
export const getPostReaction = (postId) =>
  axios.get(`/api/social/posts/${id(postId)}/reaction`);

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

export const getUnreadCount = () => axios.get("/api/social/notifications/unread-count");

/** Literal path — registered before /:notificationId/read so it is not shadowed. */
export const markAllNotificationsRead = () =>
  axios.put("/api/social/notifications/read-all");

export const markNotificationRead = (notificationId) =>
  axios.put(`/api/social/notifications/${id(notificationId)}/read`);
