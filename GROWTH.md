# Growth Strategy — sismovenezuela.org

How to get people to find, use, and *help build* the map. Crisis maps don't grow
like consumer apps: they spread by being **forwarded into group chats by people who
need them**, not by going "viral" on a feed. Optimize for that.

> **North star:** be the most *useful and trusted* map in the affected neighborhoods.
> Reach is a byproduct of indispensability, not the goal. A map people don't believe
> doesn't get forwarded — so trust is a growth lever, not a side quest.

---

## 1. The primary channel: WhatsApp, not feeds

Venezuela coordinates on **WhatsApp**. Crisis info gets forwarded into *family and
building group chats*. Every product decision should make that forward easier.

### 1a. Per-report deep links + share cards  ← highest ROI
- Give every report a page: `/r/<id>`.
- Server-render an **OG preview image** for it (map pin + severity color + place name +
  "X vecinos confirmaron"). Next.js does this with `opengraph-image.tsx` / `ImageResponse`.
- Result: when anyone forwards `/r/<id>`, the WhatsApp/Telegram preview shows the actual
  damage card — not a generic logo. **Each report becomes a shareable unit.**

### 1b. "Comparte con tu edificio" flow
- After someone reports or opens their building, a one-tap share that pre-fills:
  > "Reporté daños en [Edificio X]. Si vives aquí, confirma o agrega info: [link]"
- Neighbors confirming neighbors = verification engine *and* growth loop in one message.

### 1c. Daily summary card for stories/status
- Auto-generate one image a day: "X edificios reportados hoy, por parroquia."
- Fresh, recurring, screenshottable. Designed for WhatsApp status / IG stories.

---

## 2. Turn the map into a contribution engine

A map people only *view* stalls. A map that *needs* them grows.

- **"Adopta una cuadra" / claim-a-block.** Grid over the city; blocks light up as they get
  reports. People claim and complete blocks. Coverage % per parroquia = a shareable scoreboard.
- **Confirm / dispute on every pin.** (The `contributions` table already supports
  `vote_real` / `vote_fake`.) Show a badge: "confirmado por 6 vecinos." Gives people a
  reason to return and a low-effort way to contribute.
- **Missing-coverage prompts.** "Nadie ha reportado en tu zona — ¿cómo está tu edificio?"
  Geolocate → ask → 10-second report.

---

## 3. Distribution: you need ~20 right shares, not a million views

- **Edificio / condominio admins & building chats** — they already own the exact group
  chats you want to live in. Reach out directly.
- **Hyperlocal IG / journalist accounts** (the source data referenced ones like
  `@cojedesadiario`). Offer an **embeddable map widget** + a clean "datos para prensa" view.
  A media embed buys reach *and* credibility at once.
- **Bomberos, Cruz Roja, Protección Civil, asociaciones de vecinos.** One responder citing
  the map is the trust signal that makes everyone else comfortable forwarding it.

---

## 4. Make sharing useful, not vain

- **Resource overlays people actually need** (you have `/ayuda`): shelters, water, medical,
  where to get help. Utility → repeat visits → organic sharing. People forward what helped them.
- Every share should answer "why would my tía care?" — a specific building, a specific
  resource, a specific number. Not "check out this map."

---

## 5. Trust = the multiplier on all of the above (don't skip)

You asked to focus on growth, so this is framed as growth: **reach without trust backfires
in a crisis.** One screenshot of a fake "edificio colapsado" pin circulating can discredit
the whole map — and a discredited crisis map is worse than none. Cheap insurance:

- **Verification tiers on pins:** preliminar → confirmado por vecinos → fuente oficial.
  Make the difference visible (badge/color) so a fake can't masquerade as fact.
- **Show source + timestamp** on every pin (the imported data even self-labels "PRELIMINAR").
- **A flag button + light rate-limit** on anonymous inserts. Currently every report is
  `approved=true` (auto-live) — fine at low volume, risky the moment growth works. At least
  have a kill switch: flipping `approved` default to `false` during a traffic spike.

---

## Build order (highest leverage first)

1. **WhatsApp share cards** — `/r/<id>` pages + OG images + pre-filled share. The core loop.
2. **Vecino confirm/dispute + confidence badge** — uses the existing `contributions` table;
   verification and re-engagement in one feature.
3. **Trust/source layer on pins** — so #1's reach doesn't blow up in your face.

Everything else (claim-a-block, daily card, embeds, outreach list) layers on top of these.

---

## One naming caution

`sismovenezuela.org` is one character from the live `sismovenezuela.com`. As reach grows,
people *will* confuse them. Decide deliberately: differentiate hard (distinct name/brand) or
coordinate with the `.com` effort. Don't let the ambiguity become the story during a disaster.
