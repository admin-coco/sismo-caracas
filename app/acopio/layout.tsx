import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Centros de Acopio — Terremoto Venezuela",
  description:
    "Reporta y encuentra centros de acopio y puntos de ayuda tras el terremoto en Venezuela. Marca dónde se reciben víveres, agua y donaciones para los afectados.",
  alternates: { canonical: "/acopio" },
};

export default function AcopioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
