"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * A password <input> with a show/hide toggle. Drop-in: every prop (id, name,
 * value, onChange, autoComplete, className, aria-*) goes to the input itself, so
 * labels, validation and password managers work exactly as with a plain input.
 *
 * - The button is type="button", so it never submits the form it sits in.
 * - mousedown is cancelled so the click does not steal focus from the field;
 *   the caret stays where the user was typing.
 * - Edge draws its own reveal eye inside password inputs; it is hidden so the
 *   field never shows two.
 */
export default function PasswordInput({ className = "", id, ...props }) {
  const [visible, setVisible] = useState(false);
  const label = visible ? "Hide password" : "Show password";

  return (
    <div className="relative">
      <input
        {...props}
        id={id}
        type={visible ? "text" : "password"}
        // Room for the button, and no native Edge reveal icon next to ours.
        className={`${className} pr-11 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden`}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        onMouseDown={(e) => e.preventDefault()}
        aria-label={label}
        aria-pressed={visible}
        aria-controls={id}
        title={label}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-gray-400 transition-colors hover:text-[#131C55] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#131C55] dark:text-gray-500 dark:hover:text-blue-300 dark:focus-visible:outline-blue-400"
      >
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  );
}
