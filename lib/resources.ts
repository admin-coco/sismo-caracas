// Curated help resources shown on /ayuda. `badge` color matches the category.
export interface Resource {
  badge: string;
  badgeColor: string;
  name: string;
  description: string;
  url: string;
}

// Coco services + Ridery — our own response options, shown first.
export const COCO_RESOURCES: Resource[] = [
  {
    badge: "Enviar comida",
    badgeColor: "#16a34a",
    name: "Coco Mercado",
    description: "Envía comida y víveres a familiares y afectados en Venezuela.",
    url: "https://cocomercado.com",
  },
  {
    badge: "Enviar dinero",
    badgeColor: "#0ea5e9",
    name: "Coco Wallet",
    description: "Envía dinero de forma rápida a quienes lo necesitan.",
    url: "https://cocowallet.app",
  },
  {
    badge: "Transporte",
    badgeColor: "#7c3aed",
    name: "Ridery",
    description: "Pide un taxi seguro para movilizarte o ayudar a evacuar.",
    url: "https://ridery.app",
  },
];

// Other community emergency / missing-persons resources.
export const EXTERNAL_RESOURCES: Resource[] = [
  {
    badge: "Mapa de Emergencia y Rescate",
    badgeColor: "#1d4ed8",
    name: "terremotovenezuela.app",
    description: "Reportes, desaparecidos y mapa de emergencia en una sola app.",
    url: "https://terremotovenezuela.app",
  },
  {
    badge: "Personas desaparecidas",
    badgeColor: "#eab308",
    name: "venezuelatebusca.com",
    description: "Reporta y busca familiares o amigos desaparecidos tras el terremoto.",
    url: "https://venezuelatebusca.com",
  },
  {
    badge: "Reportes de desaparecidos",
    badgeColor: "#dc2626",
    name: "venezuelareporta.org",
    description: "Registro y consulta de personas desaparecidas en Venezuela.",
    url: "https://venezuelareporta.org",
  },
  {
    badge: "Personas desaparecidas",
    badgeColor: "#1d4ed8",
    name: "desaparecidosterremotovenezuela.com",
    description: "Directorio dedicado a desaparecidos tras el terremoto en Venezuela.",
    url: "https://desaparecidosterremotovenezuela.com",
  },
];
