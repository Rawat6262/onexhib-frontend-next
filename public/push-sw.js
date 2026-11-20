/*
 * Browser push notifications for OneXhib (registered by lib/web-push.js).
 *
 * WHAT ARRIVES. The backend (Onexhib_backend/Service/pushNotification.js) sends
 * the same data-only Firebase message to phones and browsers:
 *
 *   { data: { title, message, channelId, body: '{"url":"/post/123"}' } }
 *
 * No `notification` block, so nothing is shown unless this worker shows it. A
 * push the worker does not show makes Chrome display its own generic "site
 * updated in the background" notice, so every push shows something.
 *
 * THE URL IS AN APP ROUTE. The app and the website name the same screens
 * differently, so appUrlToWebPath maps each url the backend sends to the page
 * that shows the same thing here. An unknown url opens the home page rather
 * than a 404.
 *
 * NO FIREBASE SDK HERE. The page uses the SDK only to get a token; delivery is a
 * standard Web Push `push` event, which this plain worker handles. Its scope is
 * /push/ so it controls no page and can never intercept a request.
 */

const ICON = "/apple-icon";

/** The website path for a url the backend put in a push. */
function appUrlToWebPath(url) {
  let path = "/";
  let query = "";
  try {
    const parsed = new URL(String(url || "/"), self.location.origin);
    if (parsed.origin !== self.location.origin) return "/";
    path = parsed.pathname;
    query = parsed.search;
  } catch (_) {
    return "/";
  }

  const id = "([A-Za-z0-9_-]{1,64})";
  let m;
  if ((m = path.match(new RegExp(`^/post/${id}/?$`)))) return `/social/posts/${m[1]}`;
  if ((m = path.match(new RegExp(`^/user/${id}/?$`)))) return `/social/profile/${m[1]}`;
  // The exhibition page accepts a bare id and redirects to its full slug.
  if ((m = path.match(new RegExp(`^/exhibition/${id}/?$`)))) return `/exhibition/${m[1]}`;
  if (path === "/business/meetings" || path === "/account/meetings") return "/account/meetings";
  if (path === "/pass" && /side=meetings/.test(query)) return "/account/meetings";
  if (path === "/shows/live") return "/exhibitions/this-week";
  // Enquiries are emailed to the owner; the website has no enquiries inbox.
  return "/";
}

function parsePayload(event) {
  if (!event.data) return null;
  let payload;
  try {
    payload = event.data.json();
  } catch (_) {
    return null;
  }
  const data = (payload && payload.data) || {};
  let url = "/";
  try {
    url = JSON.parse(data.body || "{}").url || "/";
  } catch (_) {
    url = "/";
  }
  return {
    title: String(data.title || "OneXhib").slice(0, 120),
    body: String(data.message || "").slice(0, 400),
    path: appUrlToWebPath(url),
  };
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  const note = parsePayload(event);
  if (!note) return;
  event.waitUntil(
    self.registration.showNotification(note.title, {
      body: note.body,
      icon: ICON,
      badge: ICON,
      // One notification per destination: a second like on the same post
      // replaces the first instead of stacking.
      tag: note.path,
      renotify: true,
      data: { path: note.path },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.path) || "/";
  const target = new URL(path, self.location.origin).href;

  event.waitUntil(
    (async () => {
      // A tab already showing that page is brought forward. Any other tab is left
      // alone: this worker controls no page (scope /push/), so it cannot navigate
      // one, and taking over a half-filled form would lose the user's work.
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((client) => client.url === target);
      if (open) {
        await open.focus();
        return;
      }
      await self.clients.openWindow(target);
    })()
  );
});
