"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import PostFormFields from "@/components/social/PostFormFields";
import MediaPicker from "@/components/social/MediaPicker";
import { updatePost, addPostMedia, deletePostMedia } from "@/models/social.model";
import {
  DEFAULT_VISIBILITY,
  MEDIA_FIELD,
  buildEditPayload,
  validatePostForm,
  mergeAuthoritativePost,
  describeMutationError,
} from "@/lib/social/post-form";
import { renderableMedia } from "@/lib/social/post";

/**
 * Edit one of your own posts.
 *
 * THREE SEPARATE BACKEND OPERATIONS, DELIBERATELY NOT ONE
 *   PUT    /posts/:id                    title, description, visibility
 *   POST   /posts/:id/media              add files
 *   DELETE /posts/:id/media/:mediaId     remove one item
 *
 * `media` is a PROTECTED_FIELD on PUT — buildPostInput answers 400 naming it — so
 * existing media objects are never sent back through the metadata update. Media is
 * changed only through its own endpoints, and each of those returns the full
 * authoritative post.
 *
 * TAGS ARE PRESERVED BY OMISSION, AND THAT IS THE SUBTLEST THING HERE
 * buildPostInput writes taggedUsers only when the request carries the key: absent
 * preserves the stored tags, `[]` CLEARS them. Phase 11E has no tag picker, so
 * buildEditPayload omits the key entirely. Sending `taggedUsers: []` would quietly
 * erase every tag on a post whose author only wanted to fix a typo.
 *
 * MEDIA REMOVAL IS CONFIRMED, NEVER OPTIMISTIC. The server can legitimately refuse
 * with 409 — removing the last media item from a post that has no title and no
 * description would leave it with nothing, which hasContent forbids. An optimistic
 * removal would have to un-remove the item on that very ordinary path.
 */
export default function PostEditSheet({ open, onOpenChange, post, onPostChange }) {
  const [form, setForm] = useState({
    title: post.title || "",
    description: post.description || "",
    visibility: post.visibility || DEFAULT_VISIBILITY,
  });
  const [newFiles, setNewFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const existing = renderableMedia(post.media);
  // Any in-flight mutation freezes the whole form, which is what stops a metadata
  // save racing a media change on the same post without needing a queue.
  const busy = saving || uploading || Boolean(removingId);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] || prev.form ? { ...prev, [field]: undefined, form: undefined } : prev));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (busy) return;

    // Existing media counts toward the content rule: a picture with no caption is
    // a valid post, so clearing the text of a media post must stay allowed.
    const { valid, errors: found } = validatePostForm(form, existing.length + newFiles.length);
    if (!valid) {
      setErrors(found);
      return;
    }

    setSaving(true);
    try {
      const { data } = await updatePost(post._id, buildEditPayload(form));
      // Authoritative, with viewerReaction carried over — the canonical shape has
      // none, and editing a title has nothing to do with the viewer's own like.
      if (data && data.post) onPostChange(mergeAuthoritativePost(post, data.post));
      toast.success("Post updated.");
      onOpenChange(false);
    } catch (error) {
      // The sheet stays open with the text intact.
      setErrors((prev) => ({ ...prev, form: describeMutationError(error, "Your post could not be updated.") }));
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async () => {
    if (busy || !newFiles.length) return;

    setUploading(true);
    try {
      const data = new FormData();
      newFiles.forEach((file) => data.append(MEDIA_FIELD, file));
      // No Content-Type is set: the browser must add the multipart boundary, and
      // writing the header by hand omits it so multer cannot parse the body.
      const { data: body } = await addPostMedia(post._id, data);
      if (body && body.post) onPostChange(mergeAuthoritativePost(post, body.post));
      // Clearing the list is what revokes the preview URLs, via MediaPicker's
      // effect cleanup.
      setNewFiles([]);
      toast.success(newFiles.length === 1 ? "Media added." : "Media added.");
    } catch (error) {
      // A whole-request failure: the backend validates every file before
      // uploading any, and destroys the batch if the document update fails. There
      // is no partial success to represent, so the files stay selected for a retry.
      toast.error(describeMutationError(error, "Your media could not be added."));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveMedia = async (mediaId) => {
    if (busy) return;

    setRemovingId(mediaId);
    try {
      const { data } = await deletePostMedia(post._id, mediaId);
      // The response carries the post as it now stands, so nothing is guessed.
      if (data && data.post) onPostChange(mergeAuthoritativePost(post, data.post));
    } catch (error) {
      // 409 here means "a post must have a title, a description or media" — the
      // server's own wording explains it better than anything invented.
      toast.error(describeMutationError(error, "That media could not be removed."));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <form onSubmit={handleSave} aria-busy={busy || undefined} className="flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>Edit post</SheetTitle>
            <SheetDescription>
              Change the text or visibility, and add or remove media. Anyone tagged in
              this post stays tagged.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-4">
            <PostFormFields
              form={form}
              errors={errors}
              onChange={setField}
              disabled={busy}
              idPrefix={`edit-${post._id}`}
            />

            {existing.length ? (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current media
                </h3>
                <ul className="mt-2 grid list-none grid-cols-3 gap-2">
                  {existing.map((item) => (
                    <li key={item.id} className="relative">
                      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800">
                        {item.type === "IMAGE" ? (
                          // A plain <img> at thumbnail size: this is a small
                          // management grid, not the rendered post, and it avoids
                          // paying for an optimiser request per item in a sheet.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.url} alt="" aria-hidden="true" className="h-full w-full object-cover" />
                        ) : (
                          <video
                            src={item.url}
                            poster={item.thumbnailUrl || undefined}
                            preload="metadata"
                            className="h-full w-full bg-black object-contain"
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(item.id)}
                        disabled={busy}
                        aria-label="Remove this media item"
                        className="absolute right-1.5 top-1.5 rounded-full bg-gray-900/80 p-1 text-white transition hover:bg-gray-900 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
                      >
                        {removingId === item.id ? (
                          <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <Trash2 size={14} aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Add media</h3>
              <div className="mt-2">
                <MediaPicker
                  files={newFiles}
                  onFilesChange={setNewFiles}
                  // Existing media counts against the maximum, exactly as
                  // validateFiles does server-side: eight stored items leaves two.
                  existingCount={existing.length}
                  disabled={busy}
                  onRejected={(rejected) => rejected.forEach((r) => toast.error(`${r.name}: ${r.error}`))}
                />
              </div>
              {newFiles.length ? (
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={busy}
                  className="mt-3 inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:text-gray-200"
                >
                  {uploading ? "Uploading…" : `Upload ${newFiles.length} file${newFiles.length === 1 ? "" : "s"}`}
                </button>
              ) : null}
            </div>

            {errors.form ? (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {errors.form}
              </p>
            ) : null}
          </div>

          <SheetFooter>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center rounded-xl bg-[#131C55] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0E1B6B] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:bg-blue-500 dark:text-gray-950 dark:hover:bg-blue-400"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:text-gray-200"
            >
              Cancel
            </button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
