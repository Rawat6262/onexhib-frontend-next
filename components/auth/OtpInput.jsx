"use client";

import { useRef, useImperativeHandle, forwardRef } from "react";

/**
 * Six-box OTP entry with auto-advance, backspace-to-previous and paste support.
 *
 * VerifyOtpView.jsx and VerifyForgotPasswordView.jsx in the Vite app each
 * carried their own byte-identical copy of this logic and markup; it lives here
 * once. Behaviour and classes are unchanged.
 */
const OtpInput = forwardRef(function OtpInput({ value, onChange }, ref) {
  const inputRefs = useRef([]);

  useImperativeHandle(ref, () => ({
    focusFirst: () => inputRefs.current[0]?.focus(),
  }));

  const handleChange = (index, digit) => {
    if (!/^\d?$/.test(digit)) return; // only digits
    const next = [...value];
    next[index] = digit;
    onChange(next);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      onChange(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {value.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          aria-label={`Digit ${index + 1} of 6`}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className="w-9 h-9 sm:w-12 sm:h-12 text-center text-lg sm:text-xl font-bold rounded-xl border-2 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition outline-none"
        />
      ))}
    </div>
  );
});

export const EMPTY_OTP = ["", "", "", "", "", ""];

export default OtpInput;
