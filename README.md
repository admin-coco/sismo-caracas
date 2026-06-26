# Sismo Venezuela — Mapa de daños colaborativo

Public, Spanish-language, mobile-first web tool for crowdsourcing earthquake impact
in Venezuela (Caracas, La Guaira, and beyond). Anyone can report a damaged building,
a missing person, or an aid collection point — and everyone sees the aggregate map in
real time. Built to be shared on WhatsApp.

Live at **[sismovenezuela.org](https://sismovenezuela.org)**.

---

## What it does

- **Damage map** (`/`) — full-screen MapLibre map of every report as a severity-colored
  pin (🟢 Leve · 🟡 Moderado · 🟠 Severo · 🔴 Colapsado). A **heatmap toggle** weights
  pins by severity, a live **"N edificios" counter** updates every 20 s, and a grid of
  recently reported buildings sits below the map.
- **Tap a pin** → an interactive popup with the photo, place, note, time, X/WhatsApp
  share buttons, and an inline form to **add more photos or comments** (community
  contributions).
- **Three pin types**, each its own Supabase table and color:
  - 🔴 **Edificios** — damaged buildings (severity + photo + note)
  - 🟢 **Centros de acopio** — aid collection/distribution points (`/acopio`)
  - 🟣 **Personas desaparecidas** — missing persons, optionally linked to a building (`/reporte`)
- **Report form** (`/reporte`) — geolocation + draggable pin + address autocomplete
  (OpenStreetMap Nominatim) + severity + client-compressed photo, with an expandable
  full-screen map picker. Toggles between "edificio" and "persona desaparecida" modes.
- **Ofertas de Ayuda** (`/ayuda`) — curated grid of partner services offering help to
  affected families.
- **Shareable building pages** (`/edificio/[id]`) — each building gets its own URL with a
  dynamically generated 1200×630 OG card (the building's own photo), so X/WhatsApp show a
  rich preview; visiting the page redirects to the map focused on that building.
- **Web push** — optional opt-in; a Supabase webhook pings `/api/notify` on each new
  report to notify subscribers.
- **PWA** — installable (`manifest.webmanifest`), plus `robots.txt` and `sitemap.xml` for SEO.
- **Reporter rewards** (`/mis-reportes`) — reporters earn **$1 per approved report**. Report
  submission stays anonymous; the success screen offers an optional **email-OTP** claim (no
  passwords) that attributes the report to a reporter. Balance accrues from approved, unpaid
  reports; at **$5** the reporter withdraws via a prefilled email to Coco Wallet (manual
  payout — an admin marks reports `paid` in Supabase). RLS keeps each reporter's rows private
  to them. Setup is **optional** — see [SETUP.md §Reporter rewards](./SETUP.md).

> The map has no clustering — every pin stays visible at every zoom. WebGL failures
> (some in-app browsers / old devices) degrade gracefully to a no-map fallback that still
> shows the counter and the buildings grid.

---

## Routes

| Route | What it is |
|---|---|
| `/` | Damage map + recent-buildings grid (home) |
| `/reporte` | Report a damaged building or a missing person |
| `/acopio` | Report an aid collection center |
| `/ayuda` | Ofertas de Ayuda — partner resources |
| `/mis-reportes` | Reporter rewards: email-OTP login, balance, report list, withdraw via Coco Wallet |
| `/edificio/[id]` | Per-building share page (OG image → redirect to map) |
| `/api/notify` | Server route: sends web-push on new reports (webhook-triggered) |
| `/manifest.webmanifest`, `/robots.txt`, `/sitemap.xml` | PWA + SEO |

The shared top navigation (Hospitales y pacientes · Busca Personas · 💚 Ayuda, plus a
🗺️ Mapa link on subpages) lives in [`components/TopNav.tsx`](./components/TopNav.tsx) and
renders on every page.

---

## Stack

- **[Next.js](https://nextjs.org) 15** (App Router, React 19) on **Vercel**
- **[Supabase](https://supabase.com)** — Postgres + Storage + browser client (anon key,
  RLS-protected); server-only service role for the push route
- **[MapLibre GL](https://maplibre.org)** + **[OpenFreeMap](https://openfreemap.org)**
  tiles (no API key, no rate limits)
- **OpenStreetMap Nominatim** for keyless address autocomplete
- Client-side photo compression ([`browser-image-compression`](https://www.npmjs.com/package/browser-image-compression))
- **[web-push](https://www.npmjs.com/package/web-push)** (VAPID) + service worker (`public/sw.js`)
- `@vercel/analytics`

---

## Project structure

```
app/
  page.tsx              Damage map, pins, popups, heatmap, buildings grid (home)
  reporte/page.tsx      Report form (building / missing person)
  acopio/page.tsx       Report an aid collection center
  ayuda/page.tsx        Ofertas de Ayuda resource grid
  edificio/[id]/        Per-building share page + dynamic OG image
  api/notify/route.ts   Web-push fan-out (Supabase webhook → subscribers)
  layout.tsx            Root metadata, JSON-LD, analytics
  manifest.ts, robots.ts, sitemap.ts
components/TopNav.tsx    Shared floating top nav (all pages)
lib/                     Data access + shared logic
  supabase.ts  acopios.ts  persons.ts  contributions.ts  push.ts
  severity.ts  geocode.ts  resources.ts  share.ts  stats.ts
public/sw.js             Service worker (web push)
```

`lib/*` holds one focused module per concern — each table has a `fetch*`/`add*` pair, and
shared constants (severity scale, share URL, Caracas center) live alongside them.

---

## Run it locally

1. Follow **[SETUP.md](./SETUP.md)** once (~10 min) — creates the Supabase tables, storage
   bucket, RLS policies, and keys.
2. `npm install`
3. `cp .env.example .env.local` and fill in your Supabase URL + anon key (the two required
   vars — see below).
4. `npm run dev` → http://localhost:3000

Geolocation works on `localhost` (browsers treat it as a secure origin). **Photo upload
needs real Supabase keys** plus the `photos` bucket + INSERT policy from SETUP.md; without
them, the map and navigation still work but uploads fail.

Scripts: `npm run dev` · `npm run build` · `npm run start` · `npm run lint`.

---

## Environment variables

Only the first two are required to run the app. The rest enable feature-specific
behavior; see **[SETUP.md](./SETUP.md)** for where each value comes from.

| Variable | Required | Purpose |
|---|:--:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL (browser client) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/publishable key (browser client) |
| `NEXT_PUBLIC_SITE_URL` | — | Canonical URL for metadata / OG / sitemap (defaults to `https://sismovenezuela.org`) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | — | Web-push public key (client subscribe) |
| `VAPID_PRIVATE_KEY` | — | Web-push private key (server) |
| `VAPID_SUBJECT` | — | `mailto:` contact for VAPID (server) |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Server-only key for the notify route — **never** `NEXT_PUBLIC_` |
| `PUSH_WEBHOOK_SECRET` | — | Shared secret the Supabase webhook sends to `/api/notify` |

> `NEXT_PUBLIC_` vars are baked in at **build time** — change one and you must redeploy.

---

## Data, privacy & moderation

- All writes are **anonymous inserts** under Supabase **Row Level Security**: the public can
  `INSERT` and read `approved = true` rows; there are **no anon UPDATE/DELETE policies**.
- **Moderation** is done from the Supabase dashboard — set a row's `approved` to `false` to
  hide it, or flip the column default to `false` to require approval for all new reports
  (see [SETUP.md §Moderation](./SETUP.md)).
- User-submitted text is **HTML-escaped** before it's rendered into map popups.
- ⚠️ **Privacy note:** missing-person reports can include `cédula` and `phone`, which are
  currently shown publicly on the map. Treat this as a known, deliberate trade-off under
  review — revisit before relying on it.

---

## Deploy

See **[SETUP.md §4](./SETUP.md)**. In short: import the repo at
[vercel.com/new](https://vercel.com/new), add the env vars **before** the first build, and
go live on the `*.vercel.app` URL (valid HTTPS, required for geolocation + Supabase). Attach
a custom domain afterward and set `NEXT_PUBLIC_SITE_URL` so WhatsApp/X previews point at it.

---

## Contributing

- Work on a branch and open a PR; keep changes focused and run `npm run build` before
  pushing (it type-checks and lints).
- Styling is inline `style={}` objects co-located with each component — match the
  surrounding pattern rather than introducing a CSS framework.
- Copy is **Spanish** and the audience is non-technical people on phones during an
  emergency — keep UI text short, clear, and calm.
