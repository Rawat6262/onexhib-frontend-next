/**
 * Browser push notifications: the website's version of the app's phone alerts.
 *
 * HOW IT FITS TOGETHER
 *   - The backend already pushes through Firebase Cloud Messaging (meetings,
 *     enquiries, follows/likes/comments/tags, the gate welcome, the 11:00 "shows
 *     on today"). A browser is just one more FCM token, stored with
 *     platform "web" (POST /api/social/device-tokens).
 *   - This file gets the token: it asks permission, registers public/push-sw.js
 *     and calls Firebase's getToken with our VAPID key.
 *   - public/push-sw.js shows each push and opens the right page on click.
 *
 * OPT-IN, NEVER ON PAGE LOAD. The permission prompt only appears from a click on
 * the "Turn on" button (WebPushCard). Browsers bury sites that prompt unasked,
 * and a refusal can never be asked again.
 *
 * WHO GETS PUSHES ON A SHARED BROWSER. Each account that turned pushes on is
 * remembered here (ENROLLED_KEY). After sign-in, syncWebPush re-registers the
 * token only for an enrolled account; for anyone else it deletes the token at
 * Firebase, so a previous account's alerts cannot reach the next person. Signing
 * out removes the server row first, while the session still works.
 *
 * Firebase is imported on demand, so pages that never use push never download it.
 *
 * NOT CONFIGURED = INVISIBLE. Without the NEXT_PUBLIC_FIREBASE_* values every
 * function here is a no-op and the card renders nothing.
 */

import { registerPushDevice, removePushDevice } from "@/models/social.model";

const CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

const SW_URL = "/push-sw.js";
// Narrower than the worker's folder on purpose: it controls no page.
const SW_SCOPE = "/push/";

const ENROLLED_KEY = "ox_push_users"; // account ids that turned pushes on here
const RECORD_KEY = "ox_push_token"; // { token, userId, at } of the last registration
const RESYNC_MS = 24 * 3600e3; // re-register at most once a day per account

export function webPushConfigured() {
  return Boolean(CONFIG.apiKey && CONFIG.projectId && CONFIG.messagingSenderId && CONFIG.appId && VAPID_KEY);
}

export function webPushSupported() {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * An iPhone or iPad not running the site from the Home Screen. iOS only offers
 * web push to a site added to the Home Screen, so the card explains that instead.
 */
export function needsIosHomeScreen() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
  return ios && !standalone;
}

/** "default" | "granted" | "denied" | "unsupported" */
export function pushPermission() {
  if (!webPushSupported()) return "unsupported";
  return Notification.permission;
}

// ---- small storage helpers (storage can throw in private modes) -----------------

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* a private window: pushes still work, they just re-register next visit */
  }
}

const idOf = (user) => String(user?._id || user?.id || "");

function enrolledIds() {
  const list = readJson(ENROLLED_KEY, []);
  return Array.isArray(list) ? list.map(String) : [];
}

function setEnrolled(userId, on) {
  const rest = enrolledIds().filter((id) => id !== userId);
  writeJson(ENROLLED_KEY, on ? [...rest, userId] : rest);
}

/** True when this account turned pushes on in this browser. */
export function isEnrolled(user) {
  const id = idOf(user);
  return Boolean(id) && enrolledIds().includes(id);
}

// ---- Firebase -------------------------------------------------------------------

let messagingPromise = null;

async function getMessagingClient() {
  if (!messagingPromise) {
    messagingPromise = (async () => {
      const [{ initializeApp, getApps }, messaging] = await Promise.all([
        import("firebase/app"),
        import("firebase/messaging"),
      ]);
      if (!(await messaging.isSupported())) return null;
      const app = getApps().find((a) => a.name === "onexhib-push") || initializeApp(CONFIG, "onexhib-push");
      return { client: messaging.getMessaging(app), messaging };
    })().catch((err) => {
      messagingPromise = null;
      throw err;
    });
  }
  return messagingPromise;
}

async function getRegistration() {
  const existing = await navigator.serviceWorker.getRegistration(SW_SCOPE);
  const registration = existing || (await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE }));
  // getToken needs an active worker; a fresh registration is still installing.
  if (!registration.active) {
    await new Promise((resolve) => {
      const worker = registration.installing || registration.waiting;
      if (!worker) return resolve();
      worker.addEventListener("statechange", () => worker.state === "activated" && resolve());
    });
  }
  return registration;
}

async function currentToken() {
  const fb = await getMessagingClient();
  if (!fb) return null;
  const serviceWorkerRegistration = await getRegistration();
  return fb.messaging.getToken(fb.client, { vapidKey: VAPID_KEY, serviceWorkerRegistration });
}

/** Invalidate this browser's token at Firebase, so nothing reaches it any more. */
async function dropToken() {
  writeJson(RECORD_KEY, null);
  try {
    const fb = await getMessagingClient();
    if (fb) await fb.messaging.deleteToken(fb.client);
  } catch {
    /* already gone, or Firebase unreachable: the server prunes dead tokens */
  }
}

async function register(user) {
  const token = await currentToken();
  if (!token) throw new Error("This browser did not give a push token.");
  await registerPushDevice(token);
  writeJson(RECORD_KEY, { token, userId: idOf(user), at: Date.now() });
  return token;
}

// ---- the four things the UI does ------------------------------------------------

/**
 * Turn pushes on. Call ONLY from a click: it may show the browser's prompt.
 * Resolves to the permission afterwards ("granted" means it worked).
 */
export async function enableWebPush(user) {
  if (!webPushConfigured() || !webPushSupported() || !idOf(user)) return pushPermission();
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission;
  await register(user);
  setEnrolled(idOf(user), true);
  return "granted";
}

/** Turn pushes off for this account in this browser. */
export async function disableWebPush(user) {
  setEnrolled(idOf(user), false);
  const record = readJson(RECORD_KEY, null);
  if (record?.token) {
    try {
      await removePushDevice(record.token);
    } catch {
      /* dropToken below still stops delivery */
    }
  }
  await dropToken();
}

/**
 * After sign-in, on each signed-in visit. Never prompts. Keeps the server's copy
 * of this browser's token current (tokens rotate) for an enrolled account, and
 * makes sure a token left by another account delivers nothing.
 */
export async function syncWebPush(user) {
  if (!webPushConfigured() || !webPushSupported()) return;
  const userId = idOf(user);
  if (!userId) return;
  const record = readJson(RECORD_KEY, null);

  if (!isEnrolled(user) || Notification.permission !== "granted") {
    if (record?.token && record.userId !== userId) await dropToken();
    return;
  }

  // Registered recently: nothing to do, and Firebase is not even downloaded.
  if (record?.userId === userId && Date.now() - (record.at || 0) < RESYNC_MS) return;
  await register(user);
}

/**
 * Before the sign-out request, while the session cookie still works: the server
 * stops pushing to this browser. The account stays enrolled, so signing back in
 * turns pushes on again without another prompt.
 */
export async function signOutWebPush() {
  const record = readJson(RECORD_KEY, null);
  if (!record?.token) return;
  try {
    await removePushDevice(record.token);
  } catch {
    /* the token is dropped below either way */
  }
  await dropToken();
}
