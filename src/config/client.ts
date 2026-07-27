export type ClientFeatureFlags = {
  customOrders: boolean;
  wishlist: boolean;
  testimonials: boolean;
  gallery: boolean;
  internationalPayments: boolean;
};

export type ClientDomainPair = {
  storefront: string;
  admin: string;
};

export type ClientConfig = {
  id: string;
  name: string;
  shortName: string;
  nameSuffix: string;
  legalName: string;
  tagline: string;
  description: string;
  locale: string;
  currency: string;
  countryCode: string;
  countryName: string;
  city: string;
  legal: {
    jurisdiction: string;
    privacyLaw: string;
  };
  domainPairs: ClientDomainPair[];
  assets: {
    logo: string;
    favicon: string;
    heroFallback: string;
  };
  contact: {
    email: string;
    phone: string;
    whatsapp: string;
    address: string;
  };
  social: {
    instagram?: string;
    tiktok?: string;
    facebook?: string;
  };
  theme: {
    primary: string;
    primaryHover: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
  };
  features: ClientFeatureFlags;
  seo: {
    title: string;
    description: string;
  };
};

const normalizeOrigin = (origin: string) => origin.replace(/\/+$/, "");
const hostnameFromOrigin = (origin: string) => new URL(origin).hostname.toLowerCase();

export function resolveDomainPair(client: ClientConfig, hostname: string): ClientDomainPair {
  const normalizedHostname = hostname.toLowerCase();
  return client.domainPairs.find((pair) => (
    hostnameFromOrigin(pair.storefront) === normalizedHostname
    || hostnameFromOrigin(pair.admin) === normalizedHostname
  )) ?? client.domainPairs[0];
}

export function isAdminHostname(client: ClientConfig, hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase();
  return normalizedHostname === "admin.localhost"
    || client.domainPairs.some((pair) => hostnameFromOrigin(pair.admin) === normalizedHostname);
}

export function normalizeClientConfig(client: ClientConfig): ClientConfig {
  return {
    ...client,
    domainPairs: client.domainPairs.map((pair) => ({
      storefront: normalizeOrigin(pair.storefront),
      admin: normalizeOrigin(pair.admin),
    })),
  };
}

export function validateClientConfig(client: ClientConfig): void {
  const errors: string[] = [];
  if (!client.id.trim()) errors.push("id is required");
  if (!client.name.trim()) errors.push("name is required");
  if (!/^[A-Z]{3}$/.test(client.currency)) errors.push("currency must be a three-letter ISO code");
  if (!/^[A-Z]{2}$/.test(client.countryCode)) errors.push("countryCode must be a two-letter ISO code");
  if (!client.domainPairs.length) errors.push("at least one storefront/admin domain pair is required");
  client.domainPairs.forEach((pair, index) => {
    try {
      const storefront = new URL(pair.storefront);
      const admin = new URL(pair.admin);
      if (!["http:", "https:"].includes(storefront.protocol) || !["http:", "https:"].includes(admin.protocol)) {
        errors.push(`domainPairs[${index}] must use HTTP or HTTPS`);
      }
      if (storefront.origin === admin.origin) errors.push(`domainPairs[${index}] must use separate storefront and admin origins`);
    } catch {
      errors.push(`domainPairs[${index}] contains an invalid URL`);
    }
  });
  Object.entries(client.theme).forEach(([key, value]) => {
    if (!/^#[0-9a-f]{6}$/i.test(value)) errors.push(`theme.${key} must be a six-digit hex colour`);
  });
  if (errors.length) throw new Error(`Invalid client configuration "${client.id}": ${errors.join("; ")}`);
}

export function applyClientTheme(client: ClientConfig): void {
  const root = document.documentElement;
  root.lang = client.locale.split("-")[0] || "en";
  const tokens: Record<string, string> = {
    "--brand-primary": client.theme.primary,
    "--brand-primary-hover": client.theme.primaryHover,
    "--brand-accent": client.theme.accent,
    "--brand-background": client.theme.background,
    "--brand-foreground": client.theme.foreground,
    "--brand-muted": client.theme.muted,
    "--background": client.theme.background,
    "--foreground": client.theme.foreground,
    "--primary": client.theme.primary,
    "--accent": client.theme.accent,
    "--ring": client.theme.primary,
    "--sidebar": client.theme.foreground,
    "--sidebar-primary": client.theme.accent,
  };
  Object.entries(tokens).forEach(([name, value]) => root.style.setProperty(name, value));
  document.title = client.seo.title;
  document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute("content", client.seo.description);
  document.querySelector<HTMLMetaElement>('meta[property="og:site_name"]')?.setAttribute("content", client.name);
  document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute("content", client.seo.title);
  document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.setAttribute("content", client.seo.description);
  document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.setAttribute("content", client.seo.title);
  document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]')?.setAttribute("content", client.seo.description);
  document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.setAttribute("href", client.assets.favicon);
  document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')?.setAttribute("href", client.assets.favicon);
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute("content", client.theme.foreground);
}

export function formatClientMoney(client: ClientConfig, amount: number): string {
  return new Intl.NumberFormat(client.locale, {
    style: "currency",
    currency: client.currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
