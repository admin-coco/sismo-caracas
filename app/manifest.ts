import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SismoVenezuela — Mapa de Daños del Terremoto",
    short_name: "SismoVenezuela",
    description:
      "Mapa colaborativo de edificios dañados por el terremoto en Venezuela.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf6ec",
    theme_color: "#dc2626",
    lang: "es-VE",
    icons: [
      {
        src: "/og.jpg?v=2",
        sizes: "1200x630",
        type: "image/jpeg",
      },
    ],
  };
}
