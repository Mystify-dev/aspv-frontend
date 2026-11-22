# AGENTS.md

## What this is

Plain static client for the ASPV insurance-claims system: no framework, no bundler, no build step. Each `.html` page in the repo root pairs with a matching file in `js/`. Serve the repo root with any static server (Live Server, `npx serve`, WebStorm) and open `login.html`. The backend is a separate repo (`aspv-backend`, Node/Express) that must be running on port `3000`.

## Backend URL is hardcoded everywhere

Every `fetch(...)` and `io(...)` call in `js/*.js` and inline in `login.html` points at the literal `http://localhost:3000`. There is no central config or env file. To point at another host/port, do a global find-and-replace across `js/` and `login.html`.

## Login logic lives inline in `login.html`, not `js/login.js`

`js/login.js` is orphaned/stale — no page references it. The real authentication + Terms & Conditions (v1.0) acceptance flow is a `<script>` block inside `login.html`. Edits to `js/login.js` have no effect.

## Auth / session state

- After login, the app stores identity in `localStorage`: `aspv_id`, `aspv_nombre`, `aspv_rol`.
- Role-gated routing (all pages redirect to `login.html` if `aspv_rol` is absent):
  - `Admin` → `admin.html`
  - `Ajustador` → `index.html`
  - `Analista` → `resumen.html`
  - `Analista de Pagos` → `pagos.html`
- UI theme/text-size prefs persist as `aspv_tema` (`dark`/`light`) and `aspv_texto`.
- Role checks are client-side only; the backend enforces nothing here.

## `npm install` is effectively a no-op for the browser

`package.json` lists only `socket.io-client`, but the pages load Socket.io (and FullCalendar, jsPDF, jsPDF-AutoTable) from CDNs, so the npm dependency is unused at runtime and the app needs internet for those CDN scripts. There is no build, test, lint, or typecheck — `npm test` is a placeholder that always fails.

## Page → JS map

| Page | Script |
|------|--------|
| `login.html` | inline script only (see above) |
| `index.html` | `js/app.js` |
| `resumen.html` | `js/resumen.js` |
| `pagos.html` | `js/pagos.js` |
| `admin.html` | `js/admin.js` |
| `calendario.html` | `js/calendario.js` |
| `chat.html` | `js/chat.js` |
| `muro.html` | `js/muro.js` |

Load order matters: pages include the Socket.io CDN `<script>` before their own `js/*.js`, which relies on the global `io()`.
