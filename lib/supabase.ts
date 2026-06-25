import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Surfaces the single most common launch bug loudly instead of a cryptic
  // "supabaseUrl is required" deep in the SDK. Placeholders below let the
  // build/prerender succeed without keys; the client is only ever *called*
  // in the browser, so set the real NEXT_PUBLIC_ vars and redeploy to enable it.
  // eslint-disable-next-line no-console
  console.error(
    "Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Configúralas (con el prefijo NEXT_PUBLIC_) en Vercel y vuelve a desplegar."
  );
}

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder-anon-key"
);

export const PHOTOS_BUCKET = "photos";

export type Severity = 1 | 2 | 3 | 4;

export interface ReportRow {
  id: string;
  lat: number;
  lng: number;
  severity: Severity;
  photo_url: string | null;
  note: string | null;
  created_at: string;
}
