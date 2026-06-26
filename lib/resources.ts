// Curated help resources shown on /ayuda. `badge` color matches the category.
export interface Resource {
  badge: string;
  badgeColor: string;
  name: string;
  description: string;
  url: string;
  logo?: string; // path under /public, shown top-left of the card
  logoHeight?: number; // override default logo height (px) for tighter-cropped logos
}

// Coco services + Ridery — our own response options, shown first.
export const COCO_RESOURCES: Resource[] = [
  {
    badge: "Enviar comida",
    badgeColor: "#16a34a",
    name: "Coco Mercado",
    description: "Envía comida y víveres a familiares y afectados en Venezuela.",
    url: "https://cocomercado.com",
    logo: "/logos/coco-mercado.png",
    logoHeight: 44,
  },
  {
    badge: "Enviar dinero",
    badgeColor: "#0ea5e9",
    name: "Coco Wallet",
    description: "Envía dinero de forma rápida a quienes lo necesitan.",
    url: "https://cocowallet.app",
    logo: "/logos/coco-wallet.png",
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
    logo: "/logos/yummy-marketplace.png",
  },
  {
    badge: "Donación",
    badgeColor: "#16a34a",
    name: "Yummy Rides",
    description:
      "Ayuda directamente a familias afectadas enviando una donación.",
    url: "https://dona.yummyrides.com",
    logo: "/logos/yummy-rides.png",
  },
  {
    badge: "Transporte",
    badgeColor: "#7c3aed",
    name: "Ridery",
    description: "Pide un taxi seguro para movilizarte o ayudar a evacuar.",
    url: "https://ridery.app",
    logo: "/logos/ridery.png",
  },
  {
    badge: "Servicios",
    badgeColor: "#0ea5e9",
    name: "Tilín",
    description:
      "Inspecciones de ingenieros virtuales gratuitas para hogares afectados por el terremoto.",
    url: "https://tilinapp.com",
    logo: "/logos/tilin.svg",
  },
  {
    badge: "Compra ahora, paga después",
    badgeColor: "#dc2626",
    name: "Cashea",
    description: "Compra lo que necesitas y paga en cuotas.",
    url: "https://www.cashea.app",
    logo: "/logos/cashea.png",
  },
];
