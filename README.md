# OneXhib — Next.js frontend

The OneXhib web frontend, migrated from React 19 + Vite to Next.js 15 (App Router).

```
Browser ──▶ Next.js (this app) ──▶ Express API ──▶ MongoDB
Flutter ──────────────────────────▶ Express API ──▶ MongoDB
```

Next.js owns the web UI, routing and rendering. **Express owns authentication,
business logic and all database access, and is unchanged by this migration.**
The Flutter app talks to Express directly and is unaffected.

---

## Requirements

- Node.js 18.18+ (developed and verified on 22.20)
- A reachable OneXhib Express API

## Environment variables

Copy `.env.example` to `.env.local` and fill it in:

| Variable | Required | Scope | Purpose |
|---|---|---|---|
| `BACKEND_URL` | yes | **server only** | Base URL of the Express API. `next.config.mjs` proxies `/api/*` to it. |
| `NEXT_PUBLIC_SITE_URL` | no | public | Canonical origin for SEO metadata. Defaults to `https://onexhib.com`. |

> **`BACKEND_URL` is read at build time**, not at server start — it is baked into
> `.next/routes-manifest.json` by `next build`. Changing it requires a rebuild,
> not just a restart. It is never sent to the browser: every API call in the app
> is a relative `/api/...` path.

> Set `NEXT_PUBLIC_SITE_URL` on staging, or preview builds will emit canonical
> URLs and sitemap entries pointing at production.

Never put secrets in `NEXT_PUBLIC_*` — those are inlined into client JavaScript.
No secret is needed by this app at all; JWT signing, Cloudinary and mail
credentials all live with the Express backend.

## Local development

```bash
npm install
npm run dev          # http://localhost:3000
```

## Production

```bash
npm ci
npm run build
npm run start        # defaults to port 3000; PORT=8080 npm run start to change
```

`npm run build` must be run on the deploy target (or in CI with the same
`BACKEND_URL`), for the build-time reason above.

### PM2

```bash
npm ci && npm run build
pm2 start npm --name onexhib-web -- run start
pm2 save
```

To change `BACKEND_URL`, edit `.env.local`, **rebuild**, then `pm2 restart onexhib-web`.

### Reverse proxy

Terminate TLS in front of the app and forward to it. `Strict-Transport-Security`
is already sent by `next.config.mjs` and takes effect once traffic is HTTPS.

Because the browser only ever calls same-origin `/api/*` paths that Next proxies
to Express, the `uid` session cookie stays same-origin — **no CORS changes and no
cookie changes are needed on the backend.**

---

## Architecture notes

### Routing

`/api/*` is reserved for the backend proxy, so the frontend page routes that were
previously prefixed `/api/` were renamed:

| Old (Vite) | New |
|---|---|
| `/` | `/login` |
| `/api/Signup` | `/signup` |
| `/api/verify-otp` | `/verify-otp` |
| `/api/forgot-password` | `/forgot-password` |
| `/api/verify-forgot-password` | `/reset-password` |
| `/api/organiser` | `/organiser` |
| `/organiser/:id` | `/exhibitions/[id]` |
| `/company/:id` | `/companies/[id]` |
| `/product/detail/:id` | `/products/[id]` |
| `/api/Exhibitionservice` | `/services` |
| `/api/admin/dashboard` | `/admin/dashboard` |
| `/api/admin/organiser` | `/admin/organisers` |
| `/api/Admin/Company` | `/admin/companies` |
| `/api/Admin/Products` | `/admin/products` |

`/` is now the public homepage (currently a minimal placeholder).

If the old URLs are live and linked anywhere, add redirects in `next.config.mjs`
before cutting over.

### Authentication

Unchanged from the Vite app and from the backend's point of view. Express issues
an httpOnly `uid` cookie; the client caches only the non-sensitive profile.

- `components/auth/AuthProvider.jsx` holds the cached profile and installs a
  global axios interceptor: any `401`/`403` from the API clears the cache and
  redirects to `/login`. **Express remains the authority on authorisation.**
- `components/auth/RequireAuth.jsx` gates route subtrees by role. This prevents
  UI exposure; it is not the security boundary.

Route guards run on the client, so a page's server-rendered children are still
serialised into the RSC payload. That is safe here because every page fetches its
data client-side through the 401-protected API. Sealing SSR too would need
middleware that reads the cookie.

### Layout

`app/(dashboard)/layout.jsx` and `app/admin/layout.jsx` render the sidebar once
for their subtree — pages no longer mount it individually.

### Performance

Modals are loaded with `next/dynamic`, and `country-state-city` (a ~2.3 MB world
dataset) is imported after mount rather than at module scope. Every route's
first-load JS is under 175 kB. Opening a location form still downloads that
dataset once, on demand.

---

## Known issues (pre-existing, not introduced by the migration)

These are broken identically in the original Vite app — verified by calling
Express directly, bypassing this frontend.

| Feature | Cause |
|---|---|
| **"Resend OTP"** on `/verify-otp` | `POST /api/resend-otp` is not defined in the backend |
| **"Delete All"** on the three admin lists | `/api/admin/deleteall{exhibition,company,product}` are commented out in `Route/Route.js` |
| `getServices` / `addService` in `models/service.model.js` | `/api/get/service` and `/api/add/service` do not exist; nothing calls these wrappers |

Not carried over from the Vite app, all unreachable there:
`views/dashboard/DashboardView.jsx`, `views/service/ServiceDashboardView.jsx`,
`components/popups/ServiceAddPopup.jsx` (only used by the above), and
`views/company/CompanyView.jsx` (routed at `/api/Company`, which has no `:id`
segment, so its `useParams()` lookup could never resolve).

## Follow-ups

- Content-Security-Policy (needs nonces + browser testing)
- Public exhibition/company/product pages — the actual SEO opportunity
- Redirects from the old `/api/*` page URLs, if any are live
- ~2.2 MB of unreferenced images in `public/` (`bg.png` and friends) can be
  deleted once it's confirmed they aren't wanted for the homepage design
