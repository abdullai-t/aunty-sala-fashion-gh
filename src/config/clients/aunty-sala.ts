import type { ClientConfig } from "../client";

export const auntySalaClient: ClientConfig = {
  id: "aunty-sala",
  name: "Aunty Sala Fashion Gh",
  shortName: "Aunty Sala",
  nameSuffix: "Fashion Gh",
  legalName: "Aunty Sala Fashion Gh",
  tagline: "Your inner diva, everything fashionable.",
  description: "An online fashion store for ready-to-wear and made-to-measure Ghanaian fashion.",
  locale: "en-GH",
  currency: "GHS",
  countryCode: "GH",
  countryName: "Ghana",
  city: "Accra",
  legal: {
    jurisdiction: "Ghana",
    privacyLaw: "Ghana's Data Protection Act, 2012 (Act 843)",
  },
  domainPairs: [
    {
      storefront: "https://auntysalafashiongh.store",
      admin: "https://admin.auntysalafashiongh.store",
    },
    {
      storefront: "https://auntysalafashiongh.shop",
      admin: "https://admin.auntysalafashiongh.shop",
    },
  ],
  assets: {
    logo: "/aunty-sala-logo.png",
    favicon: "/favicon.png",
    heroFallback: "/aunty-sala-hero-elegant.webp",
  },
  contact: {
    email: "",
    phone: "",
    whatsapp: "",
    address: "Accra, Ghana",
  },
  social: {
    instagram: "https://www.instagram.com/auntsalafashiongh/",
    tiktok: "https://www.tiktok.com/@auntsala.big.bran",
  },
  theme: {
    primary: "#C4562A",
    primaryHover: "#A8411B",
    accent: "#B8922A",
    background: "#FAF7F2",
    foreground: "#1A1A18",
    muted: "#E8E2D9",
  },
  features: {
    customOrders: true,
    wishlist: true,
    testimonials: true,
    gallery: true,
    internationalPayments: true,
  },
  seo: {
    title: "Aunty Sala Fashion Gh | Ghanaian Fashion & Custom Dresses",
    description: "Shop ready-to-wear and made-to-measure Ghanaian fashion from Aunty Sala Fashion Gh. Contemporary dresses crafted with beautiful African fabrics.",
  },
};
