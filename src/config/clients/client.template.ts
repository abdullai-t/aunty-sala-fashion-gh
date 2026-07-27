import type { ClientConfig } from "../client";

/**
 * Copy this file, rename the export, and register it in `clients/index.ts`.
 * Use one Supabase project and one deployment environment per client.
 */
export const clientTemplate: ClientConfig = {
  id: "client-slug",
  name: "Client Fashion Store",
  shortName: "Client",
  nameSuffix: "Fashion",
  legalName: "Client Fashion Store Ltd",
  tagline: "A short client tagline.",
  description: "A concise description of the store and what it sells.",
  locale: "en-GH",
  currency: "GHS",
  countryCode: "GH",
  countryName: "Ghana",
  city: "Accra",
  legal: {
    jurisdiction: "Ghana",
    privacyLaw: "applicable data protection laws",
  },
  domainPairs: [
    {
      storefront: "https://example.com",
      admin: "https://admin.example.com",
    },
  ],
  assets: {
    logo: "/brand/client-logo.png",
    favicon: "/brand/client-favicon.png",
    heroFallback: "/brand/client-hero.webp",
  },
  contact: {
    email: "hello@example.com",
    phone: "+233000000000",
    whatsapp: "+233000000000",
    address: "Accra, Ghana",
  },
  social: {
    instagram: "https://instagram.com/example",
    tiktok: "https://tiktok.com/@example",
    facebook: "https://facebook.com/example",
  },
  theme: {
    primary: "#9A4E34",
    primaryHover: "#783824",
    accent: "#C39B42",
    background: "#FAF8F4",
    foreground: "#1D1B19",
    muted: "#E9E3DA",
  },
  features: {
    customOrders: true,
    wishlist: true,
    testimonials: true,
    gallery: true,
    internationalPayments: true,
  },
  seo: {
    title: "Client Fashion Store | Official Online Store",
    description: "Shop the latest pieces from Client Fashion Store.",
  },
};
