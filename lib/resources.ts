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
];

// Service / marketplace partners that can help affected people.
export const EXTERNAL_RESOURCES: Resource[] = [
  {
    badge: "Mercado",
    badgeColor: "#f59e0b",
    name: "Yummy Marketplace",
    description: "Pide comida, mercado y productos a domicilio.",
    url: "https://yummysuperapp.com",
  },
  {
    badge: "Transporte",
    badgeColor: "#16a34a",
    name: "Yummy Rides",
    description: "Pide un viaje para movilizarte o ayudar a evacuar.",
    url: "https://yummysuperapp.com",
  },
  {
    badge: "Transporte",
    badgeColor: "#7c3aed",
    name: "Ridery",
    description: "Pide un taxi seguro para movilizarte o ayudar a evacuar.",
    url: "https://ridery.app",
  },
  {
    badge: "Pagos",
    badgeColor: "#0ea5e9",
    name: "Tilín",
    description: "Envía y recibe dinero de forma rápida.",
    url: "https://tilin.com",
  },
  {
    badge: "Compra ahora, paga después",
    badgeColor: "#dc2626",
    name: "Cashea",
    description: "Compra lo que necesitas y paga en cuotas.",
    url: "https://cashea.app",
  },
];
