import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reportar Edificio Dañado — Terremoto Venezuela",
  description:
    "Reporta un edificio dañado por el terremoto en Venezuela: marca la ubicación, el nivel de daño y sube una foto. Tu reporte aparece al instante en el mapa colaborativo.",
  alternates: { canonical: "/reporte" },
};

export default function ReporteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
