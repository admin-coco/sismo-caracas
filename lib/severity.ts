import type { Severity } from "./supabase";

export interface SeverityInfo {
  value: Severity;
  label: string;
  color: string;
  emoji: string;
}

// Single source of truth for severity labels/colors, shared by the report
// form, the map markers, and the heatmap weights.
export const SEVERITIES: SeverityInfo[] = [
  { value: 1, label: "Leve", color: "#22c55e", emoji: "🟢" },
  { value: 2, label: "Moderado", color: "#eab308", emoji: "🟡" },
  { value: 3, label: "Severo", color: "#f97316", emoji: "🟠" },
  { value: 4, label: "Colapsado", color: "#dc2626", emoji: "🔴" },
];

export function severityInfo(value: number): SeverityInfo {
  return SEVERITIES.find((s) => s.value === value) ?? SEVERITIES[0];
}
