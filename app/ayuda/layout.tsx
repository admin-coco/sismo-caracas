import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ayuda y Recursos — Terremoto Venezuela",
  description:
    "Enlaces útiles para afectados por el terremoto en Venezuela: enviar comida y dinero, transporte, centros de ayuda y servicios. Coco Mercado, Coco Wallet, Yummy, Ridery, Tilín y Cashea.",
  alternates: { canonical: "/ayuda" },
};

export default function AyudaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
