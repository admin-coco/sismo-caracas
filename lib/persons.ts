import { supabase } from "./supabase";

// Missing-person reports. Own record with a location, optionally linked to a
// building report (report_id). Person fields are shown publicly per product
// decision (note: cédula/phone are sensitive — revisit later).
export interface PersonRow {
  id: string;
  lat: number;
  lng: number;
  first_name: string;
  last_name: string;
  cedula: string | null;
  phone: string | null;
  photo_url: string | null;
  note: string | null;
  report_id: string | null; // linked building, if any
  found: boolean;
  created_at: string;
}

export async function fetchPersons(): Promise<PersonRow[]> {
  const { data, error } = await supabase
    .from("missing_persons")
    .select(
      "id,lat,lng,first_name,last_name,cedula,phone,photo_url,note,report_id,found,created_at"
    )
    .order("created_at", { ascending: false })
    .limit(3000);
  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []) as PersonRow[];
}

export async function addPerson(input: {
  lat: number;
  lng: number;
  first_name: string;
  last_name: string;
  cedula?: string;
  phone?: string;
  photo_url?: string;
  note?: string;
  report_id?: string;
}): Promise<void> {
  const { error } = await supabase.from("missing_persons").insert({
    lat: input.lat,
    lng: input.lng,
    first_name: input.first_name,
    last_name: input.last_name,
    cedula: input.cedula ?? null,
    phone: input.phone ?? null,
    photo_url: input.photo_url ?? null,
    note: input.note ?? null,
    report_id: input.report_id ?? null,
  });
  if (error) throw error;
}
