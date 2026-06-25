import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

// metadataBase makes og:image absolute — WhatsApp REQUIRES an absolute URL.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sismovenezuela.org";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Mapa de Daños — Terremoto Venezuela",
  description:
    "Mapa colaborativo de edificios dañados por el terremoto en Venezuela. Reporta lo que ves y ayuda a entender dónde se necesita ayuda.",
  openGraph: {
    type: "website",
    locale: "es_VE",
    url: siteUrl,
    title: "Mapa de Daños — Terremoto Venezuela",
    description:
      "Reporta y mira en tiempo real los edificios dañados por el terremoto en Venezuela.",
    images: [
      {
        url: "/og.jpg?v=2",
        width: 1200,
        height: 630,
        alt: "Mapa de daños del terremoto en Venezuela",
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
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
