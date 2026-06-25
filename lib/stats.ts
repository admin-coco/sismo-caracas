// Casualty figures for the "Resumen" modal. These are NOT collected by this
// app — they are externally sourced estimates. EDIT THESE as official numbers
// are confirmed, and keep `source` + `partial` accurate. `edificios` is filled
// live from our own report count, so it's left out here.
export interface Stat {
  label: string;
  value: string;
  color: string;
}

export const RESUMEN_STATS: Stat[] = [
  { label: "Fallecidos", value: "210+", color: "#f87171" },
  { label: "Heridos", value: "1,500+", color: "#fb923c" },
  { label: "Desaparecidos", value: "12,400+", color: "#c4b5fd" },
  { label: "Encontrados", value: "820", color: "#4ade80" },
];

// Shown under the figures. Update when figures are confirmed/official.
export const RESUMEN_SOURCE = "Cifras parciales · fuentes en prensa";
export const RESUMEN_DATE = "25 jun 2026";
