import { supabase } from "./supabase";

// Centros de acopio (aid collection/distribution points). Separate from
// building damage reports — different fields, shown as green pins.
export interface AcopioRow {
  id: string;
  lat: number;
  lng: number;
  name: string;
  needs: string | null; // what they're collecting / what they need
  contact: string | null;
  created_at: string;
}

export async function fetchAcopios(): Promise<AcopioRow[]> {
  const { data, error } = await supabase
    .from("acopios")
    .select("id,lat,lng,name,needs,contact,created_at")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []) as AcopioRow[];
}

export async function addAcopio(input: {
  lat: number;
  lng: number;
  name: string;
  needs?: string;
  contact?: string;
}): Promise<void> {
  const { error } = await supabase.from("acopios").insert({
    lat: input.lat,
    lng: input.lng,
    name: input.name,
    needs: input.needs ?? null,
    contact: input.contact ?? null,
  });
  if (error) throw error;
}
