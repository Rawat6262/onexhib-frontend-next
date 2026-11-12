"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Globe, Search } from "lucide-react";
import { LANG_CHANGE_EVENT, SOURCE_LANG, readLanguage, switchLanguage } from "@/lib/translate";

/**
 * Shown above the full A-Z list while the search box is empty: the most
 * widely spoken languages, plus the ones OneXhib's exhibition markets use.
 */
const POPULAR = ["hi", "zh-CN", "es", "ar", "fr", "de", "pt", "ru", "ja", "ko", "it", "tr", "id", "vi", "bn", "ur"];

/**
 * Language picker for the header, next to the colour theme picker. Translates
 * the whole site with the Google Website Translator - see lib/translate.js for
 * why that approach and what it means for SEO.
 *
 * Two looks, one behaviour:
 * - "icon": a globe button in the header row, with the chosen language's code
 *   beside it once it is not English.
 * - "row": a full-width row for the phone menu, showing the language's name.
 *   Its panel is fixed to the viewport, because the phone menu scrolls and
 *   would clip a panel positioned inside it.
 *
 * The ~240-row language list is imported when the panel first opens, so it is
 * not in every page's JavaScript.
 *
 * translate="no" on the language names: they are each language's name for
 * itself, which is what a visitor scans for, and translating the list would
 * also break typing a name into the search box.
 */
export default function LanguagePicker({ variant = "icon", className = "" }) {
  const [current, setCurrent] = useState(SOURCE_LANG);
  const [open, setOpen] = useState(false);
  const [languages, setLanguages] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setCurrent(readLanguage());
    const sync = (e) => setCurrent(e.detail);
    window.addEventListener(LANG_CHANGE_EVENT, sync);
    return () => window.removeEventListener(LANG_CHANGE_EVENT, sync);
  }, []);

  // The current language's name for the row variant needs the list too.
  useEffect(() => {
    if ((open || (variant === "row" && current !== SOURCE_LANG)) && !languages) {
      import("@/lib/languages").then((m) => setLanguages(m.LANGUAGES));
    }
  }, [open, variant, current, languages]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setError(false);
    // After the panel renders. Not on touch screens: the keyboard popping up
    // over the list is worse than one tap into the search box.
    if (window.matchMedia("(hover: hover)").matches) requestAnimationFrame(() => inputRef.current?.focus());
    const onPointer = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const results = useMemo(() => {
    if (!languages) return [];
    const q = fold(query.trim());
    const list = languages.filter(([code]) => code !== current);
    if (!q) return list;
    return list.filter(([code, en, native = ""]) => fold(en).includes(q) || fold(native).includes(q) || code.toLowerCase() === q);
  }, [languages, query, current]);

  const popular = useMemo(
    () => (languages && !query.trim() ? POPULAR.filter((c) => c !== current).map((c) => languages.find(([code]) => code === c)).filter(Boolean) : []),
    [languages, query, current],
  );

  const choose = async (code) => {
    setOpen(false);
    if (code === current) return;
    setCurrent(code);
    try {
      await switchLanguage(code);
    } catch {
      setError(true);
      setOpen(true);
    }
  };

  const currentRow = languages?.find(([code]) => code === current);
  const currentName = current === SOURCE_LANG ? "English" : currentRow ? currentRow[2] || currentRow[1] : current;
  const showEnglish = current !== SOURCE_LANG && (!query || "english".includes(fold(query.trim())));

  const panel = open ? (
    <div
      role="dialog"
      aria-label="Choose language"
      className={`ox-menu-in z-[60] flex max-h-[min(28rem,calc(100dvh-6rem))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900 ${
        variant === "row"
          ? "fixed inset-x-4 top-16 sm:left-auto sm:w-80 rtl:sm:left-4 rtl:sm:right-auto"
          : "absolute right-0 top-full mt-2 w-80 rtl:left-0 rtl:right-auto max-sm:fixed max-sm:inset-x-4 max-sm:top-16 max-sm:mt-0 max-sm:w-auto"
      }`}
    >
      <div className="border-b border-gray-100 p-2 dark:border-gray-800">
        <p className="px-1.5 pb-1.5 pt-0.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Language
        </p>
        <label className="relative block">
          <span className="sr-only">Search languages</span>
          <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-3" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) {
                e.preventDefault();
                choose(results[0][0]);
              }
            }}
            placeholder="Search 240+ languages"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-ox-blue focus:bg-white rtl:pl-3 rtl:pr-9 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:bg-gray-900"
          />
        </label>
        {error ? (
          <p role="alert" className="px-1.5 pt-2 text-xs text-red-600 dark:text-red-400">
            The translator could not load. Check your connection or ad blocker and try again.
          </p>
        ) : null}
      </div>

      <ul className="min-h-0 flex-1 list-none overflow-y-auto overscroll-contain p-1.5" translate="no">
        {current !== SOURCE_LANG ? (
          <Row code={current} en={currentRow?.[1]} native={currentName} active onChoose={choose} />
        ) : (
          <Row code={SOURCE_LANG} en="Original" native="English" active onChoose={choose} />
        )}
        {showEnglish ? <Row code={SOURCE_LANG} en="Original" native="English" onChoose={choose} /> : null}
        {!languages ? (
          <li className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">Loading…</li>
        ) : results.length ? (
          <>
            {popular.length ? (
              <>
                <GroupLabel>Popular</GroupLabel>
                {popular.map(([code, en, native]) => <Row key={`p-${code}`} code={code} en={en} native={native} onChoose={choose} />)}
                <GroupLabel>All languages</GroupLabel>
              </>
            ) : null}
            {results.map(([code, en, native]) => <Row key={code} code={code} en={en} native={native} onChoose={choose} />)}
          </>
        ) : (
          <li className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">No language matches “{query}”.</li>
        )}
      </ul>
      <p className="border-t border-gray-100 px-3.5 py-2 text-[11px] leading-snug text-gray-500 dark:border-gray-800 dark:text-gray-400">
        Machine translation by Google. Some wording may be inexact.
      </p>
    </div>
  ) : null;

  if (variant === "row") {
    return (
      <li ref={rootRef} className={className}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 rtl:text-right dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <Globe size={15} aria-hidden="true" className="shrink-0 text-ox-blue dark:text-blue-300" />
          <span className="flex-1">Language</span>
          <span translate="no" className="max-w-[9rem] truncate text-xs font-normal text-gray-500 dark:text-gray-400">
            {currentName}
          </span>
        </button>
        {panel}
      </li>
    );
  }

  return (
    // Static below sm, so the panel's fixed position is not offset by a
    // transformed ancestor and it spans the phone's width.
    <div ref={rootRef} className="relative max-sm:static">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Change language (current: ${currentName})`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`inline-flex items-center justify-center gap-1 rounded-lg p-2 transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${className}`}
      >
        <Globe size={18} aria-hidden="true" />
        {current !== SOURCE_LANG ? (
          <span translate="no" className="text-[11px] font-semibold uppercase leading-none">
            {current.split("-")[0]}
          </span>
        ) : null}
      </button>
      {panel}
    </div>
  );
}

function GroupLabel({ children }) {
  return (
    // translate="yes" undoes the list's translate="no": these two are UI text.
    <li translate="yes" className="px-2.5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
      {children}
    </li>
  );
}

function Row({ code, en, native, active = false, onChoose }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onChoose(code)}
        aria-current={active ? "true" : undefined}
        lang={code === SOURCE_LANG ? "en" : undefined}
        className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition-colors rtl:text-right ${
          active
            ? "bg-blue-50 font-semibold text-ox-navy dark:bg-blue-500/10 dark:text-blue-200"
            : "font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
        }`}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate">{native || en}</span>
          {native && en && native !== en ? (
            <span className="block truncate text-xs font-normal text-gray-500 dark:text-gray-400">{en}</span>
          ) : null}
        </span>
        {active ? <Check size={16} aria-hidden="true" className="shrink-0 text-ox-blue dark:text-blue-300" /> : null}
      </button>
    </li>
  );
}

/** Lower-case and strip accents, so "espanol" finds Español. */
function fold(s) {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}
