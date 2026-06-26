import type { CSSProperties } from "react";

// Curated help resources shown on /ayuda. `badge` color matches the category.
export interface Resource {
  badge: string;
  badgeColor: string;
  name: string;
  description: string;
  url: string;
  logo?: string; // path under /public, shown top-left of the card
  logoHeight?: number; // override default logo height (px) for tighter-cropped logos
  logoStyle?: CSSProperties; // extra overrides (e.g. negative margins to crop padding)
  benefits?: string[]; // compact one-line bullets shown under the description
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
    benefits: [
      "🎟️ Tickets de donación en tiendas",
      "🤝 Fundación Santa: comida y medicinas",
      "🏷️ Cupón CONTIGO5: $5 de descuento",
    ],
  },
  {
    badge: "Enviar dinero",
    badgeColor: "#0ea5e9",
    name: "Coco Wallet",
    description: "Envía dinero de forma rápida a quienes lo necesitan.",
    url: "https://cocowallet.app",
    logo: "/logos/coco-wallet.png",
    benefits: [
      "🇻🇪 Envía a la ONG “AYUDA VENEZUELA”",
      "💳 $3 gratis por tu primer depósito",
    ],
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
      "Inspecciones virtuales gratuitas para hogares afectados por el terremoto.",
    url: "https://tilinapp.com/inspeccion-emergencia",
    logo: "/logos/tilin.svg",
  },
  {
    badge: "Servicios",
    badgeColor: "#dc2626",
    name: "Cashea",
    description:
      "Compra lo que necesitas y paga en cuotas. Hasta el 30 de Junio no aplicarán cargo de reactivación.",
    url: "https://www.cashea.app",
    logo: "/logos/cashea.png",
  },
  {
    badge: "Donación",
    badgeColor: "#16a34a",
    name: "GoFundMe",
    description:
      "Dona al fondo de ayuda para afectados por el terremoto de We Love Foundation. Más de $2M recaudados.",
    url: "https://www.gofundme.com/f/emergency-relief-for-venezuela-earthquake-victims",
    logo: "/logos/gofundme.png",
    // Square PNG with heavy transparent padding: scale it up, then crop the
    // built-in top/bottom whitespace with negative margins so the visible
    // wordmark matches the height/alignment of the other (tight) logos.
    logoHeight: 84,
    logoStyle: { marginTop: -26, marginBottom: -16 },
  },
];
