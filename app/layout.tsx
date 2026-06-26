import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

// metadataBase makes og:image absolute — WhatsApp REQUIRES an absolute URL.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sismovenezuela.org";

const TITLE =
  "Terremoto Venezuela: Mapa de Edificios Dañados | SismoVenezuela";
const DESCRIPTION =
  "Mapa colaborativo en tiempo real de los edificios dañados por el terremoto en Venezuela. Reporta daños, busca personas desaparecidas y encuentra centros de ayuda. Caracas, La Guaira y todo el país.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: TITLE,
    template: "%s | SismoVenezuela",
  },
  description: DESCRIPTION,
  applicationName: "SismoVenezuela",
  keywords: [
    "terremoto Venezuela",
    "sismo Venezuela",
    "terremoto Caracas",
    "edificios dañados",
    "mapa de daños",
    "daños terremoto Venezuela",
    "personas desaparecidas terremoto",
    "centros de acopio Venezuela",
    "ayuda terremoto Venezuela",
    "reportar edificio dañado",
    "La Guaira terremoto",
    "SismoVenezuela",
  ],
  authors: [{ name: "Coco Wallet" }],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    locale: "es_VE",
    siteName: "SismoVenezuela",
    url: siteUrl,
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "/og.jpg?v=3",
        width: 1200,
        height: 630,
        alt: "Mapa de daños del terremoto en Venezuela",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.jpg?v=3"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#dc2626",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "SismoVenezuela",
      url: siteUrl,
      description: DESCRIPTION,
      inLanguage: "es-VE",
    },
    {
      "@type": "Organization",
      name: "SismoVenezuela",
      url: siteUrl,
      logo: `${siteUrl}/og.jpg?v=3`,
    },
    {
      "@type": "WebApplication",
      name: "SismoVenezuela — Mapa de Daños del Terremoto",
      url: siteUrl,
      applicationCategory: "MapApplication",
      operatingSystem: "Web",
      inLanguage: "es-VE",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
