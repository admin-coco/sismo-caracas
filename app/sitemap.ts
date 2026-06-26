import type { MetadataRoute } from "next";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sismovenezuela.org";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/reporte", "/ayuda", "/acopio"];
  return routes.map((path) => ({
    url: `${SITE}${path}`,
    changeFrequency: path === "" ? "hourly" : "daily",
    priority: path === "" ? 1 : 0.7,
  }));
}
