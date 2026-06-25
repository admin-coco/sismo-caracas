# Setup — do this once (≈10 min)

You do these steps in your own Supabase + Vercel accounts. The SQL is copy-paste.

## 1. Supabase project

1. Create a new project at https://supabase.com (free tier is fine). Wait ~2 min for it to provision.
2. Open **SQL Editor** → New query → paste and run the block below. It creates the table,
   enables Row Level Security, and adds exactly the policies we need.

```sql
-- Table
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  lat         double precision not null,
  lng         double precision not null,
  severity    smallint not null check (severity between 1 and 4),
  place       text,                             -- building/house name + address (optional)
  photo_url   text,
  note        text,
  approved    boolean not null default true,   -- flip default to false later to moderate
  created_at  timestamptz not null default now()
);
create index reports_created_idx on public.reports (created_at desc);

-- Row Level Security (default-deny once enabled, so we add explicit policies)
alter table public.reports enable row level security;

-- Anyone may submit a report
create policy "anon insert" on public.reports
  for insert to anon with check (true);

-- Anyone may read approved reports (and nothing else)
create policy "anon read approved" on public.reports
  for select to anon using (approved = true);

-- No UPDATE / DELETE policy on purpose => denied for anon.
-- You moderate from the dashboard (service role bypasses RLS).
```

> **Already created the table from an earlier version?** Just add the new column:
> ```sql
> alter table public.reports add column if not exists place text;
> ```

### 1b. Community contributions (votes, extra photos, comments)

Run this block too — it creates the `contributions` table so the public can
vote "real/fake" and add more photos/comments on each report:

```sql
create table public.contributions (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references public.reports(id) on delete cascade,
  kind        text not null check (kind in ('vote_real','vote_fake','comment','photo')),
  comment     text,
  photo_url   text,
  approved    boolean not null default true,
  created_at  timestamptz not null default now()
);
create index contributions_report_idx on public.contributions (report_id);

alter table public.contributions enable row level security;

create policy "anon insert" on public.contributions
  for insert to anon with check (true);

create policy "anon read approved" on public.contributions
  for select to anon using (approved = true);
```

As admin you review everything in **Table Editor → contributions**. To hide
something, set its `approved` to `false` (or delete the row).

## 2. Storage bucket for photos

1. **Storage** → New bucket → name it exactly **`photos`** → toggle **Public bucket** ON → create.
2. **Storage** → Policies → on the `photos` bucket, **New policy** → for the **INSERT** operation,
   target role **`anon`**, with the check expression:

   ```sql
   bucket_id = 'photos'
   ```

   (Public only grants public *read*; uploads still need this INSERT policy. Do NOT add
   update/delete policies — leaving them off keeps photos from being altered/removed by the public.)

## 3. Get your keys

**Project Settings → API**. Copy:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / publishable key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Locally: copy `.env.example` to `.env.local` and paste them in.

## 4. Deploy to Vercel

1. Push this folder to a Git repo and import it at https://vercel.com/new (or `vercel` CLI).
2. **Before the build**, add the two `NEXT_PUBLIC_` env vars in the Vercel project settings.
   They bake in at build time — if you add them after a build, redeploy.
3. Deploy. **Use the `*.vercel.app` URL to go live** — it has valid HTTPS (required for
   geolocation and Supabase). Add a custom domain afterward; don't let DNS block launch.
4. After attaching a domain, set `NEXT_PUBLIC_SITE_URL=https://your-domain` and redeploy so the
   WhatsApp preview points at the real URL.

## Moderation (after launch)
- Hide spam: in the **Table Editor**, set a row's `approved` to `false` (it disappears from the map).
- To require approval for *all* new reports, change the column default:
  `alter table public.reports alter column approved set default false;`
