"use client";

import { useState } from "react";
import { Send } from "lucide-react";

import { CONTENT_MAX, validateComment, commentLength } from "@/lib/social/comment";

/**
 * Write a comment.
 *
 * PRESENTATIONAL. It owns the draft and the validation message; the request
 * belongs to the parent, which owns the list the new comment joins. So there is no
 * axios and no model import here, and no way for this to fetch anything.
 *
 * VALIDATION MIRRORS buildCommentInput EXACTLY — trimmed, non-empty, at most 2000
 * characters — and invents no minimum of its own, because the backend has none. The
 * server stays authoritative; this only saves a round trip to be told something the
 * browser already knows.
 *
 * THE DRAFT SURVIVES A FAILURE. `onSubmit` resolves truthy only when the comment
 * was actually created, and only then is the field cleared. A rate limit or a
 * network blip must not cost the user the paragraph they wrote.
 */
export default function CommentComposer({ onSubmit, disabled = false, pending = false }) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(null);

  const used = commentLength(draft);
  const over = used > CONTENT_MAX;
  const busy = pending || disabled;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy) return; // the double-submit guard

    const { valid, error: found } = validateComment(draft);
    if (!valid) {
      setError(found);
      return;
    }

    setError(null);
    const created = await onSubmit(draft);
    // Cleared ONLY when the parent confirms the server created it.
    if (created) setDraft("");
  };

  return (
    <form onSubmit={handleSubmit} aria-busy={pending || undefined} className="mt-2">
      <label htmlFor="comment-composer" className="text-sm font-semibold text-gray-900 dark:text-gray-50">
        Add a comment
      </label>
      <textarea
        id="comment-composer"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          if (error) setError(null);
        }}
        disabled={busy}
        rows={3}
        placeholder="Share your thoughts"
        aria-describedby="comment-composer-hint"
        aria-invalid={over || Boolean(error) || undefined}
        className="mt-2 w-full resize-y rounded-xl border border-gray-300 bg-white px-3 py-2 text-[15px] text-gray-900 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
      />

      <div className="mt-1.5 flex items-center justify-between gap-3">
        {/* One id in aria-describedby: the counter doubles as the error slot, so a
            validation message is always announced and can never be orphaned. */}
        <p
          id="comment-composer-hint"
          role={error || over ? "alert" : undefined}
          className={`text-xs ${error || over ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-500"}`}
        >
          {error || (over ? `A comment cannot exceed ${CONTENT_MAX} characters.` : `${used} / ${CONTENT_MAX}`)}
        </p>

        <button
          type="submit"
          disabled={busy || over || used === 0}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#131C55] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0E1B6B] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:bg-blue-500 dark:text-gray-950 dark:hover:bg-blue-400"
        >
          <Send size={14} aria-hidden="true" />
          {pending ? "Posting…" : "Comment"}
        </button>
      </div>
    </form>
  );
}
