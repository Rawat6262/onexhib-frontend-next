"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";

import InitialsAvatar from "@/components/social/InitialsAvatar";
import { displayName } from "@/lib/social/profile";
import { postTimestamp } from "@/lib/social/post";
import { CONTENT_MAX, AUTHOR_UNAVAILABLE, validateComment, commentLength } from "@/lib/social/comment";

/**
 * One comment.
 *
 * PRESENTATIONAL. It holds the draft text of its own inline edit and nothing else:
 * it imports no axios and no model, so it cannot fetch, cannot mutate and cannot
 * become an N+1. Every request belongs to the parent, which owns the list.
 *
 * NO PER-ROW LOOKUP OF ANY KIND. `author` and `taggedUsers` arrive already shaped
 * by the backend — shapeComments resolves every author AND every tagged identity
 * for the whole page in one query. A row that fetched its author would turn one
 * comment request into twenty-one.
 *
 * INLINE EDIT RATHER THAN A DIALOG. Editing a sentence in place keeps the
 * surrounding thread visible, which is what makes the edit make sense, and it
 * needs no focus trap to be correct. The textarea is labelled, its error is
 * associated with it, and focus moves into it when it opens.
 */
export default function CommentRow({
  comment,
  isOwn = false,
  disabled = false,
  editing = false,
  pending = false,
  error = null,
  onEditStart,
  onEditCancel,
  onEditSubmit,
  onDeleteRequest,
}) {
  const author = comment.author || null;
  const name = author ? displayName(author) : AUTHOR_UNAVAILABLE;
  const stamp = postTimestamp(comment.createdAt);
  const tagged = Array.isArray(comment.taggedUsers) ? comment.taggedUsers.filter((u) => u && u._id) : [];

  return (
    <li className="flex gap-3 py-4">
      {/* The avatar is decorative: the name is rendered as text beside it. */}
      <InitialsAvatar name={name} size="sm" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {/* A deleted author is NOT a link and shows no id — there is nothing to
              open, and an ObjectId is not an identity to a reader. */}
          {author ? (
            <Link
              href={`/social/profile/${encodeURIComponent(String(author._id))}`}
              className="truncate text-sm font-semibold text-gray-900 hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:text-gray-50 dark:hover:text-blue-400"
            >
              {name}
            </Link>
          ) : (
            <span className="truncate text-sm font-semibold text-gray-500 dark:text-gray-400">{name}</span>
          )}

          {stamp ? (
            <time
              dateTime={stamp.iso || undefined}
              className="text-xs text-gray-500 dark:text-gray-500"
            >
              {stamp.text}
            </time>
          ) : null}
        </div>

        {editing ? (
          <EditForm
            comment={comment}
            pending={pending}
            error={error}
            onCancel={onEditCancel}
            onSubmit={onEditSubmit}
          />
        ) : (
          <>
            {/* Plain React text. whitespace-pre-line keeps the author's line
                breaks; break-words stops a 2000-character word from widening the
                column on a phone. No dangerouslySetInnerHTML, no markdown, no HTML
                parser, and no automatic linkification — there is no safe text
                linkifier in this codebase and 11F is not the place to write one. */}
            <p className="mt-1 whitespace-pre-line break-words text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
              {comment.content}
            </p>

            {tagged.length ? (
              <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium">With</span>
                {tagged.map((u) => (
                  <Link
                    key={String(u._id)}
                    href={`/social/profile/${encodeURIComponent(String(u._id))}`}
                    className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700 hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:bg-gray-800 dark:text-gray-200"
                  >
                    {displayName(u)}
                  </Link>
                ))}
                {/* No "they were notified": COMMENT_TAG notifications deliberately
                    do not exist, and claiming otherwise would be a lie the reader
                    cannot check. */}
              </p>
            ) : null}

            {/* OWNER ONLY, and only when the parent supplied both handlers, so
                neither control can be dead. Two plain buttons rather than a
                disclosure menu: at this size a menu is an extra interaction to
                reach an action that fits beside the text. */}
            {isOwn && onEditStart && onDeleteRequest ? (
              <div className="mt-2 flex items-center gap-1">
                <RowAction
                  label={`Edit your comment`}
                  disabled={disabled || pending}
                  onClick={() => onEditStart(comment)}
                  icon={<Pencil size={13} aria-hidden="true" />}
                  text="Edit"
                />
                <RowAction
                  label={`Delete your comment`}
                  disabled={disabled || pending}
                  onClick={() => onDeleteRequest(comment)}
                  icon={<Trash2 size={13} aria-hidden="true" />}
                  text="Delete"
                  destructive
                />
              </div>
            ) : null}

            {/* A failed delete reports here, beside the comment it failed on,
                rather than only as a toast that has nothing to point at. */}
            {error && !editing ? (
              <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
                {error}
              </p>
            ) : null}
          </>
        )}
      </div>
    </li>
  );
}

/** A real button with an explicit accessible name — never a clickable div. */
function RowAction({ label, disabled, onClick, icon, text, destructive = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none ${
        destructive
          ? "text-red-600 hover:bg-red-50 focus-visible:outline-red-600 dark:text-red-400 dark:hover:bg-red-950/40"
          : "text-gray-600 hover:bg-gray-100 focus-visible:outline-[#131C55] dark:text-gray-400 dark:hover:bg-gray-800"
      }`}
    >
      {icon}
      {text}
    </button>
  );
}

/**
 * The inline edit form.
 *
 * Its initial value is the comment's CURRENT content, and it is mounted only while
 * editing, so a cancelled edit cannot leave stale text behind for the next one.
 * A failed save keeps the edited text — losing a correction to a network blip is
 * the one thing an edit form must not do.
 */
function EditForm({ comment, pending, error, onCancel, onSubmit }) {
  const [draft, setDraft] = useState(() => comment.content || "");
  const areaRef = useRef(null);

  const fieldId = `comment-edit-${String(comment._id)}`;
  const hintId = `${fieldId}-hint`;

  useEffect(() => {
    // Focus moves into the field when the form opens, so a keyboard user is not
    // left at the Edit button they just activated.
    areaRef.current?.focus();
  }, []);

  const used = commentLength(draft);
  const over = used > CONTENT_MAX;
  const { valid } = validateComment(draft);
  const unchanged = draft.trim() === (comment.content || "").trim();

  const submit = (event) => {
    event.preventDefault();
    if (pending || !valid || unchanged) return; // the duplicate-save guard
    onSubmit(comment, draft);
  };

  return (
    <form onSubmit={submit} aria-busy={pending || undefined} className="mt-2">
      <label htmlFor={fieldId} className="sr-only">
        Edit your comment
      </label>
      <textarea
        ref={areaRef}
        id={fieldId}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={pending}
        rows={3}
        aria-describedby={hintId}
        aria-invalid={over || undefined}
        className="w-full resize-y rounded-xl border border-gray-300 bg-white px-3 py-2 text-[15px] text-gray-900 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
      />

      {/* The counter doubles as the error slot, so there is ONE id in
          aria-describedby and a validation message cannot go unannounced. */}
      <p
        id={hintId}
        role={error || over ? "alert" : undefined}
        className={`mt-1 text-xs ${error || over ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-500"}`}
      >
        {error || (over ? `A comment cannot exceed ${CONTENT_MAX} characters.` : `${used} / ${CONTENT_MAX}`)}
      </p>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="submit"
          disabled={pending || !valid || unchanged}
          className="rounded-lg bg-[#131C55] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0E1B6B] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:bg-blue-500 dark:text-gray-950 dark:hover:bg-blue-400"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:text-gray-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
