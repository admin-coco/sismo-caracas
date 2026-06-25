import { supabase } from "./supabase";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlB64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// Registers the SW, requests permission, subscribes, and stores the
// subscription in Supabase. Returns true on success.
export async function subscribeToPush(): Promise<boolean> {
  if (!pushSupported() || !VAPID_PUBLIC) return false;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      // Cast to BufferSource for the newer DOM typings.
      applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC) as BufferSource,
    });
  }

  const json = sub.toJSON();
  // Upsert by endpoint so re-subscribing the same device doesn't duplicate.
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    },
    { onConflict: "endpoint" }
  );
  if (error) {
    console.error("Failed to save subscription:", error);
    return false;
  }
  return true;
}

export function pushPermission(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}
