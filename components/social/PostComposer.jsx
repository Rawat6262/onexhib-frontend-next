"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";

import PostFormFields from "@/components/social/PostFormFields";
import MediaPicker from "@/components/social/MediaPicker";
import { createPost } from "@/models/social.model";
import {
  DEFAULT_VISIBILITY,
  MEDIA_FIELD,
  buildCreatePayload,
  validatePostForm,
  normaliseCreatedPost,
  describeMutationError,
} from "@/lib/social/post-form";

const emptyForm = () => ({ title: "", description: "", visibility: DEFAULT_VISIBILITY });

/**
 * Write a new post, above the feed.
 *
 * ONE REQUEST, EVEN WITH MEDIA. POST /api/social/posts is mounted with multer's
 * .array("media", 10), and createPost validates every file, uploads them, and
 * creates the document in a single handler — with a catch that destroys the
 * uploads if the document fails. So creation is ATOMIC: either the post exists
 * with all its media or nothing exists at all.
 *
 * That is why there is no two-step create-then-upload flow and no partial-failure
 * recovery UI here. There is no state in which the post survives without its
 * media, so there would be nothing to recover.
 *
 * NOT OPTIMISTIC. The authoritative created post is waited for and inserted, for
 * two reasons: the server assigns `_id`, `createdAt` and all the media metadata,
 * and a media upload can take real time — a card that appeared instantly and then
 * vanished on a rejected file would be worse than a disabled button.
 *
 * FormData IS BUILT ONLY WHEN FILES ARE PRESENT. A text-only post sends JSON, so
 * the common case does not pay for multipart parsing. When files are present the
 * Content-Type is left entirely to the browser, because writing
 * `multipart/form-data` by hand omits the boundary token and multer cannot parse
 * the body.
 */
export default function PostComposer({ onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] || prev.form ? { ...prev, [field]: undefined, form: undefined } : prev));
  };

  const handleRejected = (rejected) => {
    // One toast per refused file, naming it — a single "some files were invalid"
    // leaves the user guessing which and why.
    rejected.forEach((r) => toast.error(`${r.name}: ${r.error}`));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return; // the double-submit guard

    const { valid, errors: found } = validatePostForm(form, files.length);
    if (!valid) {
      setErrors(found);
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildCreatePayload(form);

      let body = payload;
      if (files.length) {
        const data = new FormData();
        // Text fields ride along as ordinary multipart fields; buildPostInput
        // reads them from req.body exactly as it reads a JSON body.
        Object.entries(payload).forEach(([key, value]) => data.append(key, value));
        files.forEach((file) => data.append(MEDIA_FIELD, file));
        body = data;
      }

      const { data } = await createPost(body);

      // The canonical shape has no viewerReaction — that field is attached only by
      // the feed decorator — so it is normalised to null before the post joins the
      // feed. Without it the author's own like on their newest post would do
      // nothing, because the reaction machine refuses an unrecognised state.
      const created = normaliseCreatedPost(data && data.post);
      if (created) onCreated(created);

      toast.success("Post published.");
      // Reset ONLY on success. MediaPicker's effect revokes the preview URLs when
      // the file list changes, so clearing it here is what releases them.
      setForm(emptyForm());
      setFiles([]);
      setErrors({});
    } catch (error) {
      // The form keeps its text and its files: a rejected 40 MB video should not
      // cost the user the paragraph they wrote.
      const message = describeMutationError(error, "Your post could not be published.");
      setErrors((prev) => ({ ...prev, form: message }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={submitting || undefined}
      className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-900"
    >
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">Share an update</h2>

      <div className="mt-4">
        <PostFormFields
          form={form}
          errors={errors}
          onChange={setField}
          disabled={submitting}
          idPrefix="composer"
        />
      </div>

      <div className="mt-4">
        <MediaPicker
          files={files}
          onFilesChange={setFiles}
          existingCount={0}
          disabled={submitting}
          onRejected={handleRejected}
        />
      </div>

      {errors.form ? (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {errors.form}
        </p>
      ) : null}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-[#131C55] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0E1B6B] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:bg-blue-500 dark:text-gray-950 dark:hover:bg-blue-400"
        >
          <Send size={15} aria-hidden="true" />
          {submitting ? "Publishing…" : "Post"}
        </button>
      </div>
    </form>
  );
}
