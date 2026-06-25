# Sismo Caracas — Mapa de daños colaborativo

Public, Spanish, mobile-web tool for crowdsourcing earthquake building damage in Caracas.
Anyone reports a building (location + severity + optional photo); everyone sees the aggregate map.
Built to spread on WhatsApp.

## Stack
- **Next.js** (App Router) on **Vercel**
- **Supabase** — Postgres + Storage + browser client (anon key, RLS-protected)
- **MapLibre GL** + **OpenFreeMap** tiles (no API key, no limits)
- Client-side photo compression (`browser-image-compression`)

## Routes
- `/` — report screen (geolocation + draggable pin + severity + photo + WhatsApp share on success)
- `/map` — full-screen map: severity-colored clusters, heatmap toggle, live "X edificios reportados" counter

## Run it
1. Follow **[SETUP.md](./SETUP.md)** (Supabase table + storage + keys) — once, ~10 min.
2. `npm install`
3. `cp .env.example .env.local` and fill in the two keys.
4. `npm run dev` → http://localhost:3000 (geolocation works on localhost).

> Photo upload only works against the live HTTPS deploy or with proper keys — Supabase Storage
> needs the bucket + INSERT policy from SETUP.md.

## Deploy
See **[SETUP.md](./SETUP.md) §4**. Ship on the `*.vercel.app` URL first; attach a custom domain after.
