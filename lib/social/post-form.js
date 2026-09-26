/*
 * RELATIVE IMPORTS, NOT THE `@/` ALIAS — webpack resolves the alias, Node does
 * not, and this module has to be loadable by the plain-Node test runner.
 */
import { displayCount } from "./post.js";

/**
 * Pure logic for creating, editing and attaching media to posts.
 *
 * Every limit here is MIRRORED from the deployed backend for immediate feedback,
 * never invented and never stricter. The server remains the authority; this only
 * avoids a round trip to learn something the client already knows, and stops a
 * 50 MB video being uploaded just to be refused.
 */

// ---- limits, verified against the deployed backend --------------------------

/** Model/SocialPost.model.js: TITLE_MAX, DESCRIPTION_MAX, MEDIA_MAX. */
export const TITLE_MAX = 150;
export const DESCRIPTION_MAX = 5000;
export const MEDIA_MAX = 10;

/** The only two values VISIBILITIES accepts. PUBLIC is the schema default. */
export const VISIBILITIES = Object.freeze(["PUBLIC", "FOLLOWERS"]);
export const DEFAULT_VISIBILITY = "PUBLIC";

/** Service/socialMedia.js allow-lists, not `image/*`. */
export const IMAGE_MIME_TYPES = Object.freeze(["image/jpeg", "image/png", "image/webp"]);
export const VIDEO_MIME_TYPES = Object.freeze(["video/mp4", "video/webm", "video/quicktime"]);
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

/** The multipart field name multer listens on: .array("media", 10). */
export const MEDIA_FIELD = "media";

/** For the file input's accept attribute. A hint to the picker, never a check. */
export const ACCEPT_ATTRIBUTE = [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES].join(",");

const mb = (bytes) => Math.round(bytes / (1024 * 1024));

/**
 * IMAGE, VIDEO, or null for anything the backend will not accept.
 *
 * Decided by File.type, NEVER by the filename extension. A renamed .exe carries
 * whatever MIME the OS reports, and the backend checks the MIME too — matching
 * its rule here is what makes the client-side refusal honest rather than
 * cosmetic. A browser that reports no type at all yields null and is refused.
 */
export function mediaKind(file) {
  const type = typeof file?.type === "string" ? file.type.split(";")[0].trim().toLowerCase() : "";
  if (IMAGE_MIME_TYPES.includes(type)) return "IMAGE";
  if (VIDEO_MIME_TYPES.includes(type)) return "VIDEO";
  return null;
}

/** The size ceiling for a kind, mirroring maxBytesFor on the server. */
export const maxBytesFor = (kind) => (kind === "VIDEO" ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES);

/**
 * Is this one file acceptable?
 *
 * Empty files are refused because the backend refuses them too ("One of the
 * uploaded files is empty") — a 0-byte file is usually a failed drag or a
 * directory, and letting it through would spend an upload to be told so.
 *
 * @returns {{ok: true, kind: string}|{ok: false, error: string}}
 */
export function validateFile(file) {
  const kind = mediaKind(file);
  if (!kind) {
    return { ok: false, error: "Only JPEG, PNG, WebP images and MP4, WebM, MOV videos can be added." };
  }

  const size = Number(file?.size);
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, error: "That file appears to be empty." };
  }

  const max = maxBytesFor(kind);
  if (size > max) {
    return {
      ok: false,
      error: `${kind === "VIDEO" ? "Videos" : "Images"} cannot be larger than ${mb(max)} MB.`,
    };
  }

  return { ok: true, kind };
}

/**
 * How many more files may be attached.
 *
 * Counts EXISTING media as well as what is already selected, because
 * validateFiles on the server does the same: `existingCount + files.length >
 * MEDIA_MAX`. Eight stored items leaves room for two, not ten.
 *
 * Clamped at zero so a post that somehow holds more than the maximum reports no
 * room rather than a negative allowance.
 */
export function remainingMediaSlots(existingCount, selectedCount = 0) {
  const used = displayCount(existingCount) + displayCount(selectedCount);
  return Math.max(0, MEDIA_MAX - used);
}

/**
 * Split a chosen FileList into what may be attached and what may not.
 *
 * Returns accepted files AND a reason per rejection, so the picker can say which
 * file was refused and why rather than failing the whole selection silently.
 * Files beyond the remaining slots are rejected individually for the same reason.
 *
 * @returns {{accepted: File[], rejected: {name: string, error: string}[]}}
 */
export function validateSelection(files, existingCount = 0, alreadySelected = 0) {
  const list = Array.from(files || []);
  const accepted = [];
  const rejected = [];
  let room = remainingMediaSlots(existingCount, alreadySelected);

  for (const file of list) {
    const result = validateFile(file);
    if (!result.ok) {
      rejected.push({ name: file?.name || "File", error: result.error });
      continue;
    }
    if (room <= 0) {
      rejected.push({ name: file?.name || "File", error: `A post can have at most ${MEDIA_MAX} media items.` });
      continue;
    }
    accepted.push(file);
    room -= 1;
  }

  return { accepted, rejected };
}

// ---- payloads ---------------------------------------------------------------

const trimString = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * Normalise the form's text and visibility. Shared by create and edit so the two
 * cannot disagree about trimming or defaults.
 */
function normaliseFields(form) {
  const source = form && typeof form === "object" ? form : {};
  const visibility = VISIBILITIES.includes(source.visibility) ? source.visibility : DEFAULT_VISIBILITY;
  return {
    title: trimString(source.title),
    description: trimString(source.description),
    visibility,
  };
}

/**
 * The create body — a WHITELIST of the three fields this phase sets.
 *
 * Never a spread of form state: `media`, `author`, the counters, `_id`,
 * `createdAt` and `updatedAt` are all PROTECTED_FIELDS, and the backend does not
 * ignore them — buildPostInput answers 400 naming the field. So a stray key is a
 * failed request, not a harmless extra.
 *
 * `taggedUsers` is absent because Phase 11E has no tag picker. On create that
 * means an empty tag list, which is correct for a post nobody tagged anyone in.
 */
export function buildCreatePayload(form) {
  const { title, description, visibility } = normaliseFields(form);
  return { title, description, visibility };
}

/**
 * The edit body.
 *
 * `taggedUsers` IS DELIBERATELY OMITTED, and that omission is load-bearing.
 * buildPostInput only writes the key when the request carries it, so:
 *
 *   absent  -> the stored tags are preserved
 *   []      -> the stored tags are CLEARED
 *
 * Phase 11E edits no tags, so sending `taggedUsers: []` would silently erase
 * every tag on a post whose author only wanted to fix a typo. Omitting the key is
 * the only correct behaviour until a tag picker exists.
 */
export function buildEditPayload(form) {
  const { title, description, visibility } = normaliseFields(form);
  return { title, description, visibility };
}

/**
 * Mirror the backend's validation for immediate feedback.
 *
 * The content rule comes from hasContent: a post needs a title OR a description
 * OR at least one media item — so a picture with no caption is valid, and an
 * empty form is not. `mediaCount` must therefore include both existing and newly
 * selected media.
 *
 * @returns {{valid: boolean, errors: {title?: string, description?: string, form?: string}}}
 */
export function validatePostForm(form, mediaCount = 0) {
  const { title, description } = normaliseFields(form);
  const errors = {};

  if (title.length > TITLE_MAX) errors.title = `Title cannot exceed ${TITLE_MAX} characters.`;
  if (description.length > DESCRIPTION_MAX) {
    errors.description = `Description cannot exceed ${DESCRIPTION_MAX} characters.`;
  }
  if (!title.length && !description.length && displayCount(mediaCount) === 0) {
    errors.form = "Add a title, a description or media.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// ---- responses --------------------------------------------------------------

/**
 * Make a freshly created post safe to place in the feed.
 *
 * POST /posts returns the CANONICAL shape, which has no `viewerReaction` — that
 * field is attached only by the feed endpoint's decorator. Without this the new
 * card would read `undefined`, and the reaction machine treats an unrecognised
 * current value as not-actionable, so the author's own like would silently do
 * nothing on their newest post.
 *
 * Only that one feed-only field is normalised. Nothing else is invented.
 */
export function normaliseCreatedPost(post) {
  if (!post || typeof post !== "object") return null;
  return { ...post, viewerReaction: post.viewerReaction ?? null };
}

/**
 * Adopt an authoritative post from an edit or a media change.
 *
 * `viewerReaction` is carried over from the copy already on screen, because these
 * endpoints return the canonical shape and would otherwise blank it — the
 * viewer's own like is unrelated to editing a title, and losing it would make the
 * button look un-pressed until the feed was refetched.
 */
export function mergeAuthoritativePost(previous, next) {
  if (!next || typeof next !== "object") return previous;
  return {
    ...next,
    viewerReaction:
      next.viewerReaction !== undefined
        ? next.viewerReaction
        : (previous && previous.viewerReaction) ?? null,
  };
}

/**
 * Map a mutation failure to something worth showing.
 *
 * 409 is specific to this phase and carries real information the user needs: it
 * means either "the post is already at ten media items" (a concurrent add) or
 * "removing this would leave the post with nothing". The server's wording says
 * which, so it is used when present.
 *
 * There is NO 413. multer's size error is mapped to 400 by socialMediaUpload, so
 * a too-large file arrives as a validation message.
 */
export function describeMutationError(error, fallback = "Something went wrong.") {
  const status = error && error.response && error.response.status;
  const data = error && error.response && error.response.data;
  // Only a string `message` is ever displayed — never the response object, which
  // could carry structure this UI has no contract for.
  const serverMessage = data && typeof data.message === "string" ? data.message : null;

  if (status === 404) return "This post isn't available.";
  if (status === 400 && serverMessage) return serverMessage;
  if (status === 409) return serverMessage || "That change conflicts with the current post.";
  if (status === 429) return serverMessage || "Too many requests. Please try again shortly.";
  return fallback;
}
