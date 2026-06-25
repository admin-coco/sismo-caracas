import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

// Dynamic OG image: the building's photo composited into a proper 1200×630
// card, so X/WhatsApp always get a valid summary_large_image regardless of
// the original photo's aspect ratio.

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";
export const alt = "Edificio reportado — Terremoto Venezuela";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const SEVERITY: Record<number, { label: string; color: string }> = {
  1: { label: "Leve", color: "#22c55e" },
  2: { label: "Moderado", color: "#eab308" },
  3: { label: "Severo", color: "#f97316" },
  4: { label: "Colapsado", color: "#dc2626" },
};

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let place = "Edificio reportado";
  let sev = SEVERITY[3];
  let photo: string | null = null;
  try {
    const supabase = createClient(SUPABASE_URL, ANON);
    const { data } = await supabase
      .from("reports")
      .select("place,severity,photo_url")
      .eq("id", id)
      .maybeSingle();
    if (data) {
      if (data.place) place = data.place.split(",").slice(0, 2).join(",");
      sev = SEVERITY[data.severity as number] ?? sev;
      photo = data.photo_url ?? null;
    }
  } catch {
    /* fall back to defaults */
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0f172a",
          position: "relative",
        }}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            width={1200}
            height={490}
            style={{ width: "1200px", height: "490px", objectFit: "cover" }}
          />
        ) : (
          <div style={{ width: 1200, height: 490, display: "flex" }} />
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "20px 40px",
            flex: 1,
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                background: sev.color,
                color: "#fff",
                fontSize: 28,
                fontWeight: 800,
                padding: "6px 20px",
                borderRadius: 999,
              }}
            >
              {sev.label}
            </div>
            <div style={{ color: "#94a3b8", fontSize: 26 }}>
              Terremoto Venezuela
            </div>
          </div>
          <div
            style={{
              color: "#f8fafc",
              fontSize: 40,
              fontWeight: 800,
              marginTop: 12,
              overflow: "hidden",
            }}
          >
            🏚️ {place}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
