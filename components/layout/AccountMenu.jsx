"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ChevronDown } from "lucide-react";

import { logout } from "@/models/auth.model";
import { useAuth } from "@/components/auth/AuthProvider";

/**
 * Signed-in account control in the header.
 *
 * Replaces the sidebar's profile block, which opened a full-screen "Profile"
 * modal (components/popups/MenuPopup.jsx) whose three inputs were not wired to
 * anything and could not be saved. Showing a dead form is worse than not
 * showing one, so this menu carries only what is real: who you are signed in
 * as, and the way out. A working profile editor is a separate piece of work.
 *
 * Keyboard and pointer behaviour a menu is expected to have: Escape closes it,
 * a click outside closes it, and focus is visible throughout.
 */
export default function AccountMenu() {
  const router = useRouter();
  const { user, signOutLocal } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef(null);

  const name =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.company_name || "Account";
  const email = user?.email || "";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "OX";

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onClick = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const handleLogout = async () => {
    setBusy(true);
    try {
      await logout();
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      // Express clears the httpOnly uid cookie; this only drops the cached
      // non-sensitive profile the app keeps for display.
      signOutLocal();
      router.push("/login");
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:text-gray-200 dark:hover:bg-gray-800"
      >
        <span
          aria-hidden="true"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-[#131C55] text-[11px] font-bold text-white"
        >
          {initials}
        </span>
        <span className="hidden max-w-[10rem] truncate sm:block">{name}</span>
        <ChevronDown size={15} aria-hidden="true" className="text-gray-400" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{name}</p>
            {email ? (
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">{email}</p>
            ) : null}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            disabled={busy}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 motion-reduce:transition-none dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <LogOut size={16} aria-hidden="true" className="text-gray-400" />
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
