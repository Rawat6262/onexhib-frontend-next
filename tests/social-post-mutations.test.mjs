/**
 * Tests for Phase 11E — post create/edit/delete and media management.
 *
 * WHAT THIS COVERS: the pure logic in lib/social/post-form.js (payload
 * whitelists, validation mirrors, MIME and size rules, slot arithmetic, response
 * normalisation, error mapping), the prepend helper, and source-level contracts
 * about the components — especially tag preservation, the absence of a manual
 * multipart Content-Type, and the absence of any client-side cascade.
 *
 * WHAT IT DOES NOT COVER: there is no DOM test framework here, so nothing proves
 * rendering, focus management, the Radix focus trap, keyboard behaviour or
 * screen-reader output. Object-URL revocation is asserted structurally (the effect
 * exists and is keyed correctly), not observed at runtime. Proving either would
 * need Vitest + Testing Library, a separate dependency decision.
 *
 * Run: npm run test:social
 */
import {
  TITLE_MAX,
  DESCRIPTION_MAX,
  MEDIA_MAX,
  VISIBILITIES,
  DEFAULT_VISIBILITY,
  IMAGE_MIME_TYPES,
  VIDEO_MIME_TYPES,
  IMAGE_MAX_BYTES,
  VIDEO_MAX_BYTES,
  MEDIA_FIELD,
  ACCEPT_ATTRIBUTE,
  mediaKind,
  maxBytesFor,
  validateFile,
  remainingMediaSlots,
  validateSelection,
  buildCreatePayload,
  buildEditPayload,
  validatePostForm,
  normaliseCreatedPost,
  mergeAuthoritativePost,
  describeMutationError,
} from "../lib/social/post-form.js";
import { emptyList, mergePage, prependItem, removeItem, replaceItem } from "../lib/social/cursor-list.js";

let failed = 0;
function check(name, ok, detail = "") {
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

const read = (rel) =>
  import("node:fs").then((fs) => fs.readFileSync(new URL(rel, import.meta.url), "utf8"));
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((l) => l.replace(/\/\/.*$/, "")).join("\n");
const stripClasses = (s) => s.replace(/className=(\{`[^`]*`\}|\{[^}]*\}|"[^"]*")/g, 'className=""');

/** A stand-in for a browser File: only `type`, `size` and `name` are read. */
const file = (type, size, name = "f") => ({ type, size, name });

console.log("post-form: limits mirrored from the backend");

check("TITLE_MAX is 150", TITLE_MAX === 150);
check("DESCRIPTION_MAX is 5000", DESCRIPTION_MAX === 5000);
check("MEDIA_MAX is 10", MEDIA_MAX === 10);
check("image limit is 5 MB", IMAGE_MAX_BYTES === 5 * 1024 * 1024);
check("video limit is 50 MB", VIDEO_MAX_BYTES === 50 * 1024 * 1024);
check("the multipart field is 'media'", MEDIA_FIELD === "media");

console.log("");
console.log("post-form: visibility is backend-only");

check("exactly two values", VISIBILITIES.join(",") === "PUBLIC,FOLLOWERS");
check("the default matches the schema default", DEFAULT_VISIBILITY === "PUBLIC");
check("no invented values", !VISIBILITIES.some((v) => /PRIVATE|FRIENDS|CONNECTIONS/i.test(v)));
check("an unknown value falls back to the default, never sent through",
  buildCreatePayload({ visibility: "PRIVATE" }).visibility === "PUBLIC");
check("a valid non-default value survives",
  buildCreatePayload({ visibility: "FOLLOWERS" }).visibility === "FOLLOWERS");

console.log("");
console.log("post-form: MIME allow-list — never the file extension");

check("jpeg/png/webp are the images", IMAGE_MIME_TYPES.join(",") === "image/jpeg,image/png,image/webp");
check("mp4/webm/quicktime are the videos", VIDEO_MIME_TYPES.join(",") === "video/mp4,video/webm,video/quicktime");
for (const t of IMAGE_MIME_TYPES) check(`${t} -> IMAGE`, mediaKind(file(t, 100)) === "IMAGE");
for (const t of VIDEO_MIME_TYPES) check(`${t} -> VIDEO`, mediaKind(file(t, 100)) === "VIDEO");
for (const t of ["image/gif", "image/svg+xml", "image/bmp", "application/pdf", "text/html", "video/avi", ""]) {
  check(`${t || "(empty type)"} is refused`, mediaKind(file(t, 100)) === null);
}
check("a codec parameter is tolerated", mediaKind(file("video/mp4; codecs=avc1", 100)) === "VIDEO");
check("an uppercase type is normalised", mediaKind(file("IMAGE/PNG", 100)) === "IMAGE");
check(
  "a .png NAME with an executable type is refused — the extension is never trusted",
  mediaKind(file("application/x-msdownload", 100, "cat.png")) === null
);
check("a missing type is refused", mediaKind({ size: 100, name: "x.png" }) === null);
check("accept lists all six types", ACCEPT_ATTRIBUTE.split(",").length === 6);

console.log("");
console.log("post-form: size limits per kind");

check("maxBytesFor IMAGE", maxBytesFor("IMAGE") === IMAGE_MAX_BYTES);
check("maxBytesFor VIDEO", maxBytesFor("VIDEO") === VIDEO_MAX_BYTES);
check("an image at the limit is accepted", validateFile(file("image/png", IMAGE_MAX_BYTES)).ok === true);
check("an image one byte over is refused", validateFile(file("image/png", IMAGE_MAX_BYTES + 1)).ok === false);
check("the image error names 5 MB", validateFile(file("image/png", IMAGE_MAX_BYTES + 1)).error.includes("5 MB"));
check("a video at the limit is accepted", validateFile(file("video/mp4", VIDEO_MAX_BYTES)).ok === true);
check("a video one byte over is refused", validateFile(file("video/mp4", VIDEO_MAX_BYTES + 1)).ok === false);
check(
  "a 40 MB IMAGE is refused even though it is under the video ceiling",
  validateFile(file("image/jpeg", 40 * 1024 * 1024)).ok === false
);
/*
 * ABSOLUTE sizes, not expressed through the constants. The checks above compare
 * against IMAGE_MAX_BYTES, so they move with it and would still pass if the limit
 * were raised past what the backend accepts — a mutation test showed only the
 * constant assertion catching that. These pin the behaviour to the deployed
 * numbers independently.
 */
check("a 10 MB image is refused (backend allows 5)", validateFile(file("image/png", 10 * 1024 * 1024)).ok === false);
check("a 6 MB image is refused", validateFile(file("image/png", 6 * 1024 * 1024)).ok === false);
check("a 4 MB image is accepted", validateFile(file("image/png", 4 * 1024 * 1024)).ok === true);
check("a 60 MB video is refused (backend allows 50)", validateFile(file("video/mp4", 60 * 1024 * 1024)).ok === false);
check("a 45 MB video is accepted", validateFile(file("video/mp4", 45 * 1024 * 1024)).ok === true);
check("a 0-byte file is refused", validateFile(file("image/png", 0)).ok === false);
check("...with an 'empty' message", /empty/i.test(validateFile(file("image/png", 0)).error));
check("a missing size is refused", validateFile({ type: "image/png" }).ok === false);
check("an unsupported type is refused before size", validateFile(file("image/gif", 10)).ok === false);

console.log("");
console.log("post-form: MAX MEDIA counts existing items too");

check("nothing used leaves the full allowance", remainingMediaSlots(0, 0) === MEDIA_MAX);
check("8 existing leaves 2", remainingMediaSlots(8, 0) === 2);
check("8 existing + 1 selected leaves 1", remainingMediaSlots(8, 1) === 1);
check("8 existing + 2 selected leaves 0", remainingMediaSlots(8, 2) === 0);
check("10 existing leaves 0", remainingMediaSlots(10, 0) === 0);
check("an over-full post reports 0, never negative", remainingMediaSlots(12, 0) === 0);
check("nonsense counts are treated as 0", remainingMediaSlots(undefined, null) === MEDIA_MAX);

let sel = validateSelection([file("image/png", 10), file("image/png", 10), file("image/png", 10)], 8, 0);
check("with 8 existing, only 2 of 3 files are accepted", sel.accepted.length === 2 && sel.rejected.length === 1);
check("the rejection explains the maximum", sel.rejected[0].error.includes(String(MEDIA_MAX)));
sel = validateSelection([file("image/png", 10)], 10, 0);
check("a full post accepts nothing", sel.accepted.length === 0 && sel.rejected.length === 1);
sel = validateSelection([file("image/png", 10), file("image/gif", 10), file("video/mp4", 10)], 0, 0);
check("a mixed batch accepts only the valid files", sel.accepted.length === 2, String(sel.accepted.length));
check("...and names the refused one", sel.rejected.length === 1 && /JPEG|PNG|WebP/i.test(sel.rejected[0].error));
// 9 already selected leaves room for exactly one more, since 10 is the maximum.
sel = validateSelection([file("image/png", 10), file("image/png", 10)], 0, 9);
check(
  "already-selected files count against the allowance",
  sel.accepted.length === 1 && sel.rejected.length === 1,
  `accepted=${sel.accepted.length} rejected=${sel.rejected.length}`
);
check("...and 10 already selected accepts nothing", validateSelection([file("image/png", 10)], 0, 10).accepted.length === 0);
check(
  "existing and selected are summed, not considered separately",
  validateSelection([file("image/png", 10)], 6, 4).accepted.length === 0
);
check("a null selection is handled", validateSelection(null, 0, 0).accepted.length === 0);

console.log("");
console.log("post-form: CREATE payload is a whitelist");

let payload = buildCreatePayload({ title: " t ", description: " d ", visibility: "FOLLOWERS" });
check("exactly three keys", Object.keys(payload).sort().join(",") === "description,title,visibility");
check("values are trimmed", payload.title === "t" && payload.description === "d");

payload = buildCreatePayload({
  title: "t", description: "d", visibility: "PUBLIC",
  media: [{ id: "m" }], author: "a", _id: "x", likeCount: 9, dislikeCount: 9,
  commentCount: 9, createdAt: "z", updatedAt: "z", taggedUsers: ["u1"], viewerReaction: "like",
});
check("no PROTECTED_FIELD survives", Object.keys(payload).sort().join(",") === "description,title,visibility",
  Object.keys(payload).join(","));
for (const f of ["media", "author", "_id", "likeCount", "dislikeCount", "commentCount", "createdAt", "updatedAt", "viewerReaction"]) {
  check(`${f} is not in the create body`, !(f in payload));
}
check("taggedUsers is not in the create body either (no tag picker in 11E)", !("taggedUsers" in payload));

console.log("");
console.log("post-form: EDIT payload and TAG PRESERVATION");

/*
 * The critical one. buildPostInput writes taggedUsers only when the key is
 * present: absent preserves the stored tags, [] CLEARS them. With no tag picker in
 * this phase, sending [] would erase every tag on a post whose author only fixed a
 * typo.
 */
const edit = buildEditPayload({ title: "t", description: "d", visibility: "PUBLIC" });
check("taggedUsers is ABSENT from the edit body", !("taggedUsers" in edit), Object.keys(edit).join(","));
check("it is not merely undefined — the key does not exist",
  Object.prototype.hasOwnProperty.call(edit, "taggedUsers") === false);
check("it is not an empty array", JSON.stringify(edit).includes("taggedUsers") === false);
check("exactly three keys", Object.keys(edit).sort().join(",") === "description,title,visibility");
const editWithTags = buildEditPayload({ title: "t", description: "d", visibility: "PUBLIC", taggedUsers: ["u1", "u2"] });
check(
  "even a form carrying tags does not send them — omission is unconditional",
  !("taggedUsers" in editWithTags)
);
for (const f of ["media", "author", "_id", "likeCount", "commentCount", "createdAt", "updatedAt"]) {
  check(`${f} is not in the edit body`, !(f in buildEditPayload({ [f]: "x", title: "t" })));
}

console.log("");
console.log("post-form: validation mirrors hasContent");

check("title only is valid", validatePostForm({ title: "t", description: "" }, 0).valid === true);
check("description only is valid", validatePostForm({ title: "", description: "d" }, 0).valid === true);
check("media only is valid — a picture needs no caption", validatePostForm({ title: "", description: "" }, 1).valid === true);
check("nothing at all is invalid", validatePostForm({ title: "", description: "" }, 0).valid === false);
check("...and says what to add", /title, a description or media/i.test(validatePostForm({}, 0).errors.form));
check("whitespace-only text does not count as content", validatePostForm({ title: "   ", description: "  " }, 0).valid === false);
check("title at the limit is valid", validatePostForm({ title: "x".repeat(TITLE_MAX) }, 0).valid === true);
check("title one over is invalid", validatePostForm({ title: "x".repeat(TITLE_MAX + 1) }, 0).valid === false);
check("description at the limit is valid", validatePostForm({ description: "x".repeat(DESCRIPTION_MAX) }, 0).valid === true);
check("description one over is invalid", validatePostForm({ description: "x".repeat(DESCRIPTION_MAX + 1) }, 0).valid === false);
check("trailing whitespace does not push over the limit", validatePostForm({ title: "x".repeat(TITLE_MAX) + "   " }, 0).valid === true);
check("no stricter limit is invented", validatePostForm({ title: "x".repeat(TITLE_MAX) }, 0).errors.title === undefined);

console.log("");
console.log("post-form: response normalisation");

const created = normaliseCreatedPost({ _id: "p1", title: "t", likeCount: 0, dislikeCount: 0 });
check("a created post gains viewerReaction: null", created.viewerReaction === null);
check("nothing else is invented", Object.keys(created).sort().join(",") === "_id,dislikeCount,likeCount,title,viewerReaction");
check("an existing viewerReaction is respected", normaliseCreatedPost({ _id: "p", viewerReaction: "like" }).viewerReaction === "like");
check("a null response yields null", normaliseCreatedPost(null) === null);
check("a non-object yields null", normaliseCreatedPost("x") === null);

const prev = { _id: "p1", title: "old", viewerReaction: "like", likeCount: 4 };
const merged = mergeAuthoritativePost(prev, { _id: "p1", title: "new", likeCount: 4 });
check("an authoritative post replaces the fields it carries", merged.title === "new");
check(
  "viewerReaction is carried over — editing a title is unrelated to the viewer's like",
  merged.viewerReaction === "like"
);
check("a server-supplied viewerReaction wins",
  mergeAuthoritativePost(prev, { _id: "p1", viewerReaction: null }).viewerReaction === null);
check("no previous reaction becomes null, not undefined",
  mergeAuthoritativePost({ _id: "p" }, { _id: "p" }).viewerReaction === null);
check("a null next leaves the previous post", mergeAuthoritativePost(prev, null) === prev);

console.log("");
console.log("post-form: error mapping");

const err = (status, message) => ({ response: { status, data: message ? { message } : {} } });
check("404 -> post unavailable", describeMutationError(err(404)) === "This post isn't available.");
check("400 shows the server's validation wording",
  describeMutationError(err(400, "visibility must be one of: PUBLIC, FOLLOWERS.")).includes("PUBLIC"));
check("409 uses the server's wording — it explains which conflict",
  describeMutationError(err(409, "A post must have a title, a description or media.")).includes("must have"));
check("409 without a message still explains", /conflict/i.test(describeMutationError(err(409))));
check("429 uses the server's wording", describeMutationError(err(429, "Too many post changes.")).includes("Too many"));
check("429 without a message still explains", /shortly/i.test(describeMutationError(err(429))));
check("500 uses the caller's fallback", describeMutationError(err(500), "Create failed.") === "Create failed.");
check("a network error uses the fallback", describeMutationError(new Error("Network"), "Create failed.") === "Create failed.");
check(
  "a non-string server message is ignored rather than rendered",
  describeMutationError({ response: { status: 400, data: { message: { nested: true } } } }, "fallback") === "fallback"
);
check("no axios internals leak", !/axios|stack|config|headers/i.test(describeMutationError(err(500))));
check("a null error does not throw", typeof describeMutationError(null) === "string");

console.log("");
console.log("feed list: create inserts at the top and dedupes");

let feed = mergePage(emptyList(), { items: [{ _id: "p2" }, { _id: "p3" }], nextCursor: "c", hasMore: true }, "replace");
let after = prependItem(feed, { _id: "p1" });
check("a new post goes first", after.items.map((p) => p._id).join(",") === "p1,p2,p3");
check("existing server order is preserved", after.items.slice(1).map((p) => p._id).join(",") === "p2,p3");
check("the cursor is untouched", after.nextCursor === "c" && after.hasMore === true);
after = prependItem(feed, { _id: "p2", title: "again" });
check("a duplicate id appears exactly once", after.items.filter((p) => p._id === "p2").length === 1);
check("...at the top, as the newer copy", after.items[0].title === "again");
check("the list does not grow on a duplicate", after.items.length === feed.items.length);
check("a null item changes nothing", prependItem(feed, null).items.length === 2);
check("an item without _id changes nothing", prependItem(feed, { title: "x" }).items.length === 2);
check("prependItem does not mutate its input", feed.items.map((p) => p._id).join(",") === "p2,p3");

console.log("");
console.log("feed list: delete removes exactly one post");

const three = mergePage(emptyList(), { items: [{ _id: "a" }, { _id: "b" }, { _id: "c" }], nextCursor: "x", hasMore: true }, "replace");
check("removeItem drops only the target", removeItem(three, "b").items.map((p) => p._id).join(",") === "a,c");
check("the cursor is untouched by a delete", removeItem(three, "b").nextCursor === "x");
check("removing an absent id changes nothing", removeItem(three, "zzz").items.length === 3);
check("replaceItem swaps one post", replaceItem(three, "b", { _id: "b", title: "edited" }).items[1].title === "edited");

// ---- source contracts -------------------------------------------------------

const composer = stripComments(await read("../components/social/PostComposer.jsx"));
const editSheet = stripComments(await read("../components/social/PostEditSheet.jsx"));
const picker = stripComments(await read("../components/social/MediaPicker.jsx"));
const card = stripComments(await read("../components/social/PostCard.jsx"));
const feedSrc = stripComments(await read("../app/(social)/social/social-client.jsx"));
const confirm = stripComments(await read("../components/social/ConfirmDialog.jsx"));
const fields = stripComments(await read("../components/social/PostFormFields.jsx"));
const formLib = stripComments(await read("../lib/social/post-form.js"));
const allNew = [composer, editSheet, picker, card, feedSrc, confirm, fields, formLib].join("\n");

console.log("");
console.log("multipart: the browser must set the boundary");

check("no manual multipart Content-Type anywhere", !/multipart\/form-data/.test(allNew));
check("no Content-Type header is set at all", !/Content-Type|content-type/i.test(allNew));
check("no headers object is passed to a mutation", !/headers:\s*\{/.test(allNew));
check("the composer appends to FormData", /new FormData\(\)/.test(composer) && /data\.append\(/.test(composer));
check("the composer uses the MEDIA_FIELD constant, not a literal", /append\(MEDIA_FIELD,/.test(composer));
check("the edit sheet does the same", /new FormData\(\)/.test(editSheet) && /append\(MEDIA_FIELD,/.test(editSheet));
check("a text-only post sends JSON, not FormData", /if \(files\.length\) \{/.test(composer));
check("the model still sets no Content-Type", !/Content-Type/i.test(stripComments(await read("../models/social.model.js"))));

console.log("");
console.log("object URLs: created, revoked, never sent");

check("previews come from createObjectURL", /URL\.createObjectURL/.test(picker));
check("they are revoked", /URL\.revokeObjectURL/.test(picker));
check(
  "revocation is an effect keyed on the derived previews, so it fires on change AND unmount",
  /useEffect\(\s*\(\)\s*=>\s*\(\)\s*=>\s*\{[\s\S]*?revokeObjectURL[\s\S]*?\},\s*\[previews\]\s*\)/.test(picker),
  "no previews-keyed cleanup effect found"
);
check("previews are derived with useMemo from files", /useMemo\(/.test(picker) && /\[files\]/.test(picker));
check("no blob URL is ever appended to FormData", !/append\([^)]*preview|append\([^)]*objectUrl/i.test(allNew));
check("the composer appends File objects, not URLs", /files\.forEach\(\(file\) => data\.append\(MEDIA_FIELD, file\)\)/.test(composer));
check("blob URLs only reach src or poster", !/href=\{[^}]*preview\.url|backgroundImage/.test(picker));
check("no local filesystem path is shown", !/webkitRelativePath|\.path\b/.test(picker));

console.log("");
console.log("owner actions: owner only, no dead controls");

check("the menu renders only when isOwnPost", /isOwnPost && onEditRequest && onDeleteRequest/.test(card));
check("both callbacks are required before rendering it", /onEditRequest && onDeleteRequest/.test(card));
check("the menu is a real button with aria-haspopup", /aria-haspopup="menu"/.test(card));
check("its items are real buttons in a role=menu", /role="menu"/.test(card) && /role="menuitem"/.test(card));
check("it closes on Escape", /Escape/.test(card));
check("it is disabled while a reaction is pending", /disabled=\{pending\}/.test(card));
check("the feed passes the owner callbacks", /onEditRequest=\{setEditing\}/.test(feedSrc) && /onDeleteRequest=\{setDeleting\}/.test(feedSrc));

console.log("");
console.log("delete: confirmed, one request, no client cascade");

check("a confirmation dialog is used", /ConfirmDialog/.test(feedSrc));
check("window.confirm is NOT used", !/window\.confirm|confirm\(/.test(allNew.replace(/ConfirmDialog/g, "")));
check("the dialog is role=alertdialog", /role="alertdialog"/.test(confirm));
check("it has a title and description", /DialogTitle/.test(confirm) && /DialogDescription/.test(confirm));
check("the post is removed only after the request resolves",
  /await deletePost\([\s\S]{0,200}?removeItem/.test(feedSrc),
  "removal is not after the await");
check("removal uses the shared list helper", /removeItem\(prev, deleting\._id\)/.test(feedSrc));
check("exactly one deletePost call site", (feedSrc.match(/deletePost\(/g) || []).length === 1);
check("NO child cascade: no comment delete", !/deleteComment\(/.test(allNew));
check("NO child cascade: no reaction delete during post delete",
  !/clearPostReaction\([\s\S]{0,200}?deletePost\(|deletePost\([\s\S]{0,200}?clearPostReaction\(/.test(feedSrc));
check("NO child cascade: no notification delete", !/markNotificationRead\(|deleteNotification/.test(allNew));
check("NO child cascade: no per-media delete during post delete",
  !/deletePost\([\s\S]{0,300}?deletePostMedia\(/.test(feedSrc));
check("delete is guarded against a double confirm", /if \(!deleting \|\| deletePending\) return;/.test(feedSrc));

console.log("");
console.log("media management: confirmed removal, whole-request add");

check("existing media is removed via the media endpoint", /deletePostMedia\(post\._id, mediaId\)/.test(editSheet));
check("the authoritative post is adopted afterwards", /deletePostMedia[\s\S]{0,300}?mergeAuthoritativePost/.test(editSheet));
check("removal is not optimistic — no pre-emptive local filter", !/setPost|filter\(\(m\) => m\.id !== mediaId\)/.test(editSheet));
check("the item action disables while pending", /disabled=\{busy\}/.test(editSheet));
check("add-media adopts the authoritative post", /addPostMedia[\s\S]{0,400}?mergeAuthoritativePost/.test(editSheet));
check("existing media counts toward the maximum in the picker", /existingCount=\{existing\.length\}/.test(editSheet));
check("media is never sent through the metadata update", !/updatePost\([^)]*media/.test(editSheet));
check("any in-flight mutation freezes the form", /const busy = saving \|\| uploading \|\| Boolean\(removingId\)/.test(editSheet));

console.log("");
console.log("forms: reset on success only");

check("the composer resets the form after a successful create",
  /setForm\(emptyForm\(\)\)[\s\S]{0,120}setFiles\(\[\]\)/.test(composer));
check(
  "the reset is inside the try, after the request — not in finally",
  !/finally \{[\s\S]{0,200}setFiles\(\[\]\)/.test(composer),
  "the form is reset in finally, so it would clear on failure too"
);
check("the catch does not clear the form", !/catch[\s\S]{0,300}setForm\(emptyForm/.test(composer));
check("the catch does not clear the files", !/catch[\s\S]{0,300}setFiles\(\[\]\)/.test(composer));
check("the composer guards double submit", /if \(submitting\) return;/.test(composer));
check("the edit sheet guards double save", /if \(busy\) return;/.test(editSheet));
check("the edit sheet stays open on failure", !/catch[\s\S]{0,200}onOpenChange\(false\)/.test(editSheet));
check("the edit sheet closes only on success", /toast\.success\("Post updated\."\);\s*onOpenChange\(false\)/.test(editSheet));

console.log("");
console.log("scope: no tagging, comments, notifications or search");

check("no tag picker or autocomplete", !/TagPicker|tagPicker|autocomplete|mention/i.test(allNew));
check("no @mention parsing", !/@\[|parseMention|@mention/i.test(allNew));
check("no raw ObjectId input field", !/taggedUsers/.test(stripClasses(composer + editSheet + fields)));
check("no POST_TAG or COMMENT_TAG", !/POST_TAG|COMMENT_TAG/.test(allNew));
check("no tag notification promise", !/notified|will be notified/i.test(allNew));
check("no comment calls", !/getComments\(|createComment\(|updateComment\(|deleteComment\(/.test(allNew));
check("no notification calls", !/getNotifications\(|getUnreadCount\(|markAllNotificationsRead\(|markNotificationRead\(/.test(allNew));
check("no user search", !/searchUsers|\/api\/search/.test(allNew));
check("no follow mutation", !/followUser\(|unfollowUser\(/.test(allNew));
check("no avatar or cover upload", !/avatarUrl.*upload|coverUrl.*upload|uploadAvatar/i.test(allNew));
/*
 * NARROWED IN 11F, NOT RELAXED. 11E banned "/social/posts/" because the detail
 * route did not exist, so a link to it would have been a 404 with a signpost. 11F
 * built the route and the comment count now links to it.
 *
 * The property this was really protecting is that the post MUTATION components own
 * no navigation: the composer, the edit sheet, the picker and the shared fields must
 * not move the user somewhere, because a create or an edit keeps them where they
 * are. PostCard is excluded from this set precisely because its comment count is a
 * link, which 11F made correct.
 */
const mutationOnly = [composer, editSheet, picker, fields].join("\n");
check("the post mutation components navigate nowhere",
  !/\/social\/posts\/|useRouter|router\.push|<Link/.test(mutationOnly));

console.log("");
console.log("security: nothing private, nothing unsafe");

check("no legacy signup endpoint", !/find\/signup|finduser/.test(allNew));
check("no Authorization or Bearer", !/Authorization|Bearer/i.test(allNew));
check("no jwt decoding", !/\bjwt\b|decodeToken|atob\(/i.test(allNew));
check("no cookie reading", !/document\.cookie/.test(allNew));
check("no localStorage use", !/localStorage|sessionStorage/.test(allNew));
check("no private Signup fields", !/\bpassword\b|\botp\b|pendingPassword|mobile_number|isapproved|qrCode/i.test(allNew));
check("no dangerouslySetInnerHTML", !/dangerouslySetInnerHTML/.test(allNew));
check("no HTML or markdown parser", !/marked|markdown|html-react-parser|DOMPurify/i.test(allNew));
check("no user text reaches style", !/style=\{\{[^}]*(title|description|name)/.test(allNew));
check("remotePatterns is not widened", !/remotePatterns/.test(allNew));

console.log("");
console.log("no N+1: mutation UI fetches no identities");

check("the composer fetches only createPost", (composer.match(/from "@\/models\/social\.model"/g) || []).length === 1 && /import \{ createPost \}/.test(composer));
check("the edit sheet imports only its three mutations",
  /import \{ updatePost, addPostMedia, deletePostMedia \}/.test(editSheet));
check("no profile fetch in mutation UI", !/getSocialProfile\(/.test(allNew));
check("no reaction read in mutation UI", !/getPostReaction\(/.test(allNew));
check("no follower/following fetch", !/getFollowers\(|getFollowing\(/.test(allNew));
check("PostCard still makes no read request", !/getPostReaction|getSocialProfile|getFeed/.test(card));
check("the picker fetches nothing", !/axios|models\//.test(picker));
check("the form fields fetch nothing", !/axios|models\//.test(fields));

console.log("");
console.log("reaction behaviour from 11D is intact");

check("PostCard still delegates to planPostReaction", /planPostReaction\(/.test(card));
check("PostCard still applies the authoritative result", /applyReactionResult\(/.test(card));
check("PostCard still reverts from a snapshot", /revertReaction\(/.test(card));
check("PostCard still has no local transition decision", !/viewerReaction\s*===\s*clicked/.test(card));
check("reaction controls still disable while pending", (card.match(/pending=\{pending\}/g) || []).length === 2);

console.log("");
console.log(failed ? `=== ${failed} FAILED ===` : "=== all passed ===");
process.exit(failed ? 1 : 0);
