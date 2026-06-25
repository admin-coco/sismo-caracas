import type { Metadata, Viewport } from "next";
import "./globals.css";

// metadataBase makes og:image absolute — WhatsApp REQUIRES an absolute URL.
// Override NEXT_PUBLIC_SITE_URL in Vercel once the real domain is attached.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sismo-caracas.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Mapa de Daños — Terremoto Caracas",
  description:
    "Mapa colaborativo de edificios dañados por el terremoto en Caracas. Reporta lo que ves y ayuda a entender dónde se necesita ayuda.",
  openGraph: {
    type: "website",
    locale: "es_VE",
    url: siteUrl,
    title: "Mapa de Daños — Terremoto Caracas",
    description:
      "Reporta y mira en tiempo real los edificios dañados por el terremoto en Caracas.",
    images: [
      {
        url: "/og.jpg?v=1",
        width: 1200,
        height: 630,
        alt: "Mapa de daños del terremoto en Caracas",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#dc2626",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
