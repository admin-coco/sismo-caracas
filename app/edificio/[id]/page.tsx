import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// Per-building share page. Its only job is to carry the building's PHOTO as
// the OG/Twitter preview image (so X/WhatsApp scrape the real photo), then
// redirect a human visitor to the map focused on that building.

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sismovenezuela.org";

const SEVERITY_LABEL: Record<number, string> = {
  1: "Leve",
  2: "Moderado",
  3: "Severo",
  4: "Colapsado",
};

async function getBuilding(id: string) {
  try {
    const supabase = createClient(SUPABASE_URL, ANON);
    const { data } = await supabase
      .from("reports")
      .select("place,severity,photo_url")
      .eq("id", id)
      .maybeSingle();
    return data as
      | { place: string | null; severity: number; photo_url: string | null }
      | null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const b = await getBuilding(id);
  const where = b?.place ? b.place.split(",")[0] : "Edificio reportado";
  const sev = b ? SEVERITY_LABEL[b.severity] ?? "" : "";
  const title = `${where}${sev ? ` · ${sev}` : ""} — Terremoto Venezuela`;
  const description =
    "Edificio reportado en el mapa colaborativo de daños del terremoto en Venezuela.";
  // Use the building's own photo if it has one; else fall back to the card.
  const image = b?.photo_url || `${SITE}/og.jpg?v=2`;

  return {
    metadataBase: new URL(SITE),
    title,
    description,
    openGraph: {
      type: "website",
      locale: "es_VE",
      url: `${SITE}/edificio/${id}`,
      title,
      description,
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function EdificioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Send humans to the map, focused on this building.
  redirect(`/?b=${id}`);
}
