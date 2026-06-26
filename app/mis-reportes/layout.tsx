import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mis Reportes y Recompensa — Terremoto Venezuela",
  description:
    "Revisa tus reportes y tu recompensa. Ganas $1 por cada reporte aprobado; junta $5 y retíralos por Coco Wallet.",
  alternates: { canonical: "/mis-reportes" },
  robots: { index: false, follow: false }, // private, per-reporter page
};

export default function MisReportesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
