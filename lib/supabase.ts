import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anonKey) {
  // Surfaces the single most common launch bug loudly instead of a cryptic
  // "supabaseUrl is required" deep in the SDK.
  // eslint-disable-next-line no-console
  console.error(
    "Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Configúralas (con el prefijo NEXT_PUBLIC_) antes de compilar."
  );
}

export const supabase = createClient(url, anonKey);

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
