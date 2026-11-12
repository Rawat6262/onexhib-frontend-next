/**
 * Whole-site machine translation through the Google Website Translator.
 *
 * WHY THIS APPROACH
 * The ask was "any language in the world", which rules out hand-written
 * message files (next-intl and friends) for anything but a handful of
 * languages. The widget covers ~240 languages for free with no API key, and
 * it translates whatever is rendered, including data from the backend
 * (exhibition names, descriptions, news), which message files never would.
 *
 * THE SEO TRADE-OFF, ON PURPOSE
 * It is client-side only. The server always renders English with
 * <html lang="en">, crawlers never carry the cookie, so the widget is never
 * loaded for them, and no translated URL exists anywhere. Search engines see
 * exactly what they saw before (metadata, canonicals and JSON-LD untouched),
 * and translated text is not indexed. Indexable per-language URLs would need
 * real i18n routing (/hi/..., hreflang) and is a separate decision.
 *
 * HOW IT FITS TOGETHER
 * - The chosen language lives in localStorage (LANG_STORAGE_KEY). The widget
 *   itself reads a "googtrans" cookie ("/en/<code>"), which it also rewrites as
 *   a session cookie whenever the language changes, so the cookie alone would
 *   not survive closing the browser. localStorage is the record; the cookie is
 *   re-derived from it before the widget loads.
 * - LANGUAGE_SCRIPT runs in <head> before first paint and sets <html dir/lang>,
 *   so an Arabic or Urdu visitor does not see the layout flip after load.
 * - TranslateRuntime (root layout) loads the widget after hydration when a
 *   language is chosen. English visitors never download it.
 * - LanguagePicker (header) calls switchLanguage().
 */

export const SOURCE_LANG = "en";
export const LANG_STORAGE_KEY = "ox-lang";
export const LANG_CHANGE_EVENT = "ox-language-change";
const COOKIE = "googtrans";
const HOST_ID = "ox-translate-host";
const SCRIPT_SRC = "https://translate.google.com/translate_a/element.js?cb=__oxTranslateInit";

/** Right-to-left languages among lib/languages.js (by Intl.Locale direction). */
export const RTL_LANGS = ["ar", "bal", "fa-AF", "dv", "iw", "ckb", "ms-Arab", "bm-Nkoo", "ps", "fa", "pa-Arab", "sd", "ur", "ug", "yi"];

/** Google widget codes whose BCP 47 tag is different, for <html lang>. */
export const LANG_ATTR = { "zh-CN": "zh-Hans", "zh-TW": "zh-Hant", iw: "he", jw: "jv", "bm-Nkoo": "nqo", "ndc-ZW": "ndc", "ber-Latn": "zgh-Latn", ber: "zgh" };

const CODE_RE = /^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$/;

/**
 * Pre-paint: read the saved language, put the widget's cookie back if the
 * browser dropped it, and set <html dir/lang>. Only well-formed codes pass.
 */
export const LANGUAGE_SCRIPT = `try{var c=localStorage.getItem(${JSON.stringify(LANG_STORAGE_KEY)});if(c&&c!=="en"&&${CODE_RE}.test(c)){if(document.cookie.indexOf("${COOKIE}=/en/"+c)<0)document.cookie="${COOKIE}=/en/"+c+";path=/;max-age=31536000;samesite=lax";var h=document.documentElement,a=${JSON.stringify(LANG_ATTR)};h.setAttribute("dir",${JSON.stringify(RTL_LANGS)}.indexOf(c)>-1?"rtl":"ltr");h.setAttribute("lang",a[c]||c)}}catch(e){}`;

export function isRtl(code) {
  return RTL_LANGS.includes(code);
}

/** The language the visitor picked, or "en". Client only. */
export function readLanguage() {
  try {
    const c = localStorage.getItem(LANG_STORAGE_KEY);
    if (c && CODE_RE.test(c)) return c;
  } catch {
    // Storage blocked: fall through to the cookie, which still works per session.
  }
  const m = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/);
  const code = m ? decodeURIComponent(m[1]).split("/")[2] : "";
  return code && CODE_RE.test(code) ? code : SOURCE_LANG;
}

/**
 * Every domain the widget may have written its cookie on: host-only, the
 * host, and each parent domain (it uses ".example.com"). All have to go for
 * "back to English" to stick.
 */
function cookieDomains() {
  const host = location.hostname;
  const domains = [null];
  if (host.includes(".") && !/^[\d.]+$/.test(host)) {
    const parts = host.split(".");
    for (let i = 0; i < parts.length - 1; i++) {
      const d = parts.slice(i).join(".");
      domains.push(d, `.${d}`);
    }
  }
  return domains;
}

function clearCookie() {
  for (const d of cookieDomains()) {
    document.cookie = `${COOKIE}=; path=/; max-age=0${d ? `; domain=${d}` : ""}`;
  }
}

function setDocumentLanguage(code) {
  const html = document.documentElement;
  if (code === SOURCE_LANG) {
    html.removeAttribute("dir");
    html.setAttribute("lang", SOURCE_LANG);
  } else {
    html.setAttribute("dir", isRtl(code) ? "rtl" : "ltr");
    html.setAttribute("lang", LANG_ATTR[code] || code);
  }
}

/**
 * The widget swaps React's text nodes for its own <font> wrappers. When React
 * later removes or inserts next to a node that is no longer where it left it,
 * the DOM throws (NotFoundError) and the whole route crashes - the long-known
 * React + Google Translate conflict (facebook/react#11538). These two guards
 * turn that into a no-op. Installed only once a translation is active, so
 * English pages run on the untouched DOM.
 */
let guarded = false;
function installDomGuard() {
  if (guarded || typeof Node !== "function") return;
  guarded = true;
  const { removeChild, insertBefore } = Node.prototype;
  Node.prototype.removeChild = function guardedRemoveChild(child) {
    if (child.parentNode !== this) return child;
    return removeChild.call(this, child);
  };
  Node.prototype.insertBefore = function guardedInsertBefore(node, ref) {
    if (ref && ref.parentNode !== this) return insertBefore.call(this, node, null);
    return insertBefore.call(this, node, ref);
  };
}

let loading = null;

/** Loads the widget once; resolves when its (hidden) <select> exists. */
export function loadTranslator() {
  if (loading) return loading;
  installDomGuard();
  loading = new Promise((resolve, reject) => {
    let host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = HOST_ID;
      host.className = "notranslate";
      host.setAttribute("aria-hidden", "true");
      document.body.appendChild(host);
    }
    window.__oxTranslateInit = () => {
      new window.google.translate.TranslateElement({ pageLanguage: SOURCE_LANG, autoDisplay: false }, HOST_ID);
      waitForCombo().then(resolve, reject);
    };
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error("Translator failed to load"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

function waitForCombo(timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      const combo = document.querySelector(`#${HOST_ID} select.goog-te-combo`);
      if (combo && combo.options.length > 1) resolve(combo);
      else if (Date.now() - start > timeout) reject(new Error("Translator did not start"));
      else setTimeout(tick, 100);
    };
    tick();
  });
}

/**
 * Switch the site to `code`. From English this happens in place: the widget
 * loads and translates the page. Every other switch reloads - back to English
 * because the widget's "show original" is unreliable after React has
 * re-rendered translated nodes and a reload is the one way back that always
 * gives the exact server HTML; between two languages for the reason below.
 */
export async function switchLanguage(code) {
  if (code === SOURCE_LANG) {
    try {
      localStorage.removeItem(LANG_STORAGE_KEY);
    } catch {
      // Nothing saved to remove.
    }
    clearCookie();
    location.reload();
    return;
  }
  try {
    localStorage.setItem(LANG_STORAGE_KEY, code);
  } catch {
    // Storage blocked: the cookie below still carries it for this session.
  }
  clearCookie();
  document.cookie = `${COOKIE}=/en/${code}; path=/; max-age=31536000; samesite=lax`;

  // Already translated into another language: reload rather than drive the
  // widget. Switching in place makes it "restore" the page first, and what it
  // restores is the text it saw at load - after a client-side navigation that
  // is the previous page's <title>, which then gets translated onto this one.
  if (loading) {
    location.reload();
    return;
  }

  setDocumentLanguage(code);
  window.dispatchEvent(new CustomEvent(LANG_CHANGE_EVENT, { detail: code }));

  const combo = await loadTranslator();
  if (combo.value !== code) {
    combo.value = code;
    combo.dispatchEvent(new Event("change"));
  }
}

/** On page load: apply a saved language (TranslateRuntime). */
export function restoreLanguage() {
  const code = readLanguage();
  if (code === SOURCE_LANG) return;
  setDocumentLanguage(code);
  loadTranslator().catch(() => {
    // Offline or blocked by an extension: the page stays readable in English.
  });
}
