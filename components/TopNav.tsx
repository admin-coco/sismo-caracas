import type { CSSProperties } from "react";

// Light cream pill — stands out on the dark map AND on the dark page
// background of /reporte, /acopio, /ayuda. Exported so callers (e.g. the
// landing page's heatmap toggle / counter) can reuse the same styling for
// map-only controls that sit alongside the nav.
export const PILL: CSSProperties = {
  background: "rgba(250,246,236,0.95)",
  color: "#1f2937",
  border: "none",
  padding: "10px 14px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 14,
  textDecoration: "none",
  display: "inline-block",
  whiteSpace: "nowrap",
  boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
  cursor: "pointer",
  fontFamily: "inherit",
  pointerEvents: "auto",
};

// Floating pill-style top nav used by every page so the universal links
// (Hospitales, Busca Personas, Ayuda) are reachable from anywhere — not only
// from the landing map. Pages render extra map-only controls (counter,
// heatmap toggle) alongside this via the `extras` slot.
export function TopNav({
  showMapaLink = false,
  extras,
}: {
  // On subpages we add a "🗺️ Mapa" link back home — without a map there's no
  // visual cue otherwise. The landing page suppresses it.
  showMapaLink?: boolean;
  // Buttons rendered BEFORE the universal links (e.g. the "📊 N edificios"
  // counter / "🔥 Mapa de Calor" toggle on /).
  extras?: React.ReactNode;
}) {
  return (
    <div style={BAR}>
      {extras}
      {showMapaLink && (
        <a style={PILL} href="/">
          🗺️ Mapa
        </a>
      )}
      <a
        // inline-flex + center so the ✚ glyph (shorter than an emoji) stays
        // vertically aligned with the emoji on the sibling buttons.
        style={{ ...PILL, display: "inline-flex", alignItems: "center", gap: 5 }}
        href="https://terremotovenezuela.app/hospitales"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span style={{ color: "#dc2626", fontWeight: 900 }} aria-hidden="true">✚</span>
        Hospitales y pacientes
      </a>
      <a
        style={PILL}
        href="https://terremotovenezuela.app/#desaparecidas"
        target="_blank"
        rel="noopener noreferrer"
      >
        🧍 Busca Personas
      </a>
      <a style={PILL} href="/ayuda">
        💚 Ayuda
      </a>
    </div>
  );
}

const BAR: CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  display: "flex",
  gap: 8,
  padding: 12,
  alignItems: "center",
  justifyContent: "flex-end",
  flexWrap: "wrap",
  // Above MapLibre's canvas (z 0–10) and our modal backdrop (z 20), below the
  // building-detail modal (z 60).
  zIndex: 30,
  // Don't intercept clicks in the gaps between pills — let map pans / page
  // scrolls fall through.
  pointerEvents: "none",
};
