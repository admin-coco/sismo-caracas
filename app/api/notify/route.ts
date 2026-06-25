import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// Called by a Supabase DB webhook when a new row is inserted into `reports`.
// Sends a web-push to every stored subscription. Protected by a shared secret.

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@sismovenezuela.org";
const WEBHOOK_SECRET = process.env.PUSH_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  // Auth: the webhook must send our shared secret.
  const secret =
    req.headers.get("x-webhook-secret") ||
    new URL(req.url).searchParams.get("secret");
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: { record?: { place?: string | null; severity?: number } } = {};
  try {
    payload = await req.json();
  } catch {
    /* empty body is fine */
  }
  const place = payload.record?.place;
  const body = place
    ? `Nuevo edificio reportado: ${place.split(",")[0]}`
    : "Se reportó un nuevo edificio dañado.";

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth");
  if (error) {
    console.error(error);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  const notification = JSON.stringify({
    title: "🏚️ SismoVenezuela",
    body,
    url: "https://sismovenezuela.org",
  });

  let sent = 0;
  const stale: string[] = [];
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          notification
        );
        sent++;
      } catch (e: unknown) {
        // 404/410 = subscription expired; mark for cleanup.
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) stale.push(s.endpoint);
      }
    })
  );

  if (stale.length) {
    await admin.from("push_subscriptions").delete().in("endpoint", stale);
  }

  return NextResponse.json({ sent, removed: stale.length });
}
