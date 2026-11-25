import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  getProducts,
  getProductsPage,
  getProductFilters,
  getProductBySlug,
  getStoreContent,
  getAccountData,
  getAdminData,
  getCheckoutQuote,
  initializePaystackCheckout,
  verifyPaystackPayment,
  submitContactMessage,
  submitCustomOrder,
  updateCustomOrderStatus,
  setCustomOrderQuote,
  initializeCustomOrderPayment,
  verifyCustomOrderPayment,
  createProduct,
  createCategory,
  updateProduct,
  archiveProduct,
  restoreProduct,
  updateOrderStatus,
  saveStoreSettings,
  addAdminUserByEmail,
  setAdminUserAccess,
  saveSiteMedia,
  addGalleryMedia,
  removeAdminMedia,
  getWishlistProductIds,
  addWishlistItem,
  removeWishlistItem,
  getSavedAddresses,
  addSavedAddress,
  updateSavedAddress,
  saveMeasurements,
  dispatchNotifications,
  type AccountData,
  type AdminData,
  type AdminOrder,
  type GalleryItem,
  type StoreProduct,
  type Testimonial,
  type SavedAddress,
  type CheckoutQuote,
} from "../lib/store-api";
import { uploadManyToCloudinary, type CloudinaryAsset } from "../lib/cloudinary";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import {
  ShoppingCart, Menu, X, Star, Heart, Search, Package, Users,
  BarChart2, Settings, ShoppingBag, Scissors, MessageCircle,
  Instagram, Phone, Mail, MapPin, Check, ArrowRight, Plus, Minus,
  Trash2, Upload, Clock, TrendingUp, AlertCircle, Eye, Edit,
  Download, Printer, LogOut, Bell, ChevronLeft, ChevronRight,
  Calendar, DollarSign, Send, CreditCard, ChevronDown, Truck,
  Award, User, Home, Tag, Filter, LayoutGrid, LayoutList, Zap, Music2,
  CheckCircle, Circle, Archive
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from "recharts";

// This single-page app owns route scrolling. Prevent the browser from restoring
// a stale scroll position after asynchronously loaded storefront content mounts.
if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

// ─── Data ──────────────────────────────────────────────────────────────────
type Product = StoreProduct;

const ProductsContext = createContext<Product[]>([]);
const useProducts = () => useContext(ProductsContext);
const WishlistContext = createContext<{ ids: string[]; toggle: (productId: string) => Promise<void>; isAuthenticated: boolean }>({ ids: [], toggle: async () => {}, isAuthenticated: false });
const useWishlist = () => useContext(WishlistContext);
const StoreContentContext = createContext<{ testimonials: Testimonial[]; gallery: GalleryItem[]; settings: Record<string, unknown>; siteMedia: Record<string, string> }>({ testimonials: [], gallery: [], settings: {}, siteMedia: {} });
const useStoreContent = () => useContext(StoreContentContext);
const EMPTY_ADMIN_DATA: AdminData = { orders: [], customPayments: [], customers: [], tailoringItems: [], salesData: [], categoryData: [], categories: [], products: [], media: [], notifications: [], settings: {}, users: [] };
type AdminDataContextValue = AdminData & { refresh: () => Promise<void> };
const AdminDataContext = createContext<AdminDataContextValue>({ ...EMPTY_ADMIN_DATA, refresh: async () => {} });
const useAdminData = () => useContext(AdminDataContext);
const PIE_COLORS = ["#C4562A","#B8922A","#7A8C6E","#4A6B8A","#8B5E3C"];

const KANBAN_COLS: { key: string; label: string; color: string }[] = [
  { key: "new", label: "New", color: "bg-blue-100 text-blue-800" },
  { key: "reviewing", label: "Reviewing", color: "bg-blue-100 text-blue-800" },
  { key: "quoted", label: "Quoted", color: "bg-yellow-100 text-yellow-800" },
  { key: "measuring", label: "Measuring", color: "bg-yellow-100 text-yellow-800" },
  { key: "cutting", label: "Cutting", color: "bg-orange-100 text-orange-800" },
  { key: "sewing", label: "Sewing", color: "bg-purple-100 text-purple-800" },
  { key: "fitting", label: "Fitting", color: "bg-pink-100 text-pink-800" },
  { key: "ready", label: "Ready", color: "bg-green-100 text-green-800" },
  { key: "completed", label: "Completed", color: "bg-green-100 text-green-800" },
  { key: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
];


// ─── Helpers ───────────────────────────────────────────────────────────────
const ghs = (n: number) => `GH₵ ${n.toLocaleString()}`;
const settingString = (settings: Record<string, unknown>, key: string) => {
  const value = settings[key];
  return typeof value === "string" ? value.trim() : "";
};
const getInstagramProfile = (settings: Record<string, unknown>) => {
  const configured = settingString(settings, "instagram_handle").replace(/^@(?=https?:\/\/)/i, "");
  if (!configured) return null;
  const isUrl = /^https?:\/\//i.test(configured);
  const handle = (isUrl ? configured.replace(/^https?:\/\/(?:www\.)?instagram\.com\//i, "") : configured)
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
  if (!handle || (isUrl && !/^https?:\/\/(?:www\.)?instagram\.com\//i.test(configured))) return null;
  return {
    href: isUrl ? configured : `https://www.instagram.com/${handle}/`,
    label: `@${handle}`,
  };
};
const getWhatsAppUrl = (settings: Record<string, unknown>, message: string) => {
  const configured = settingString(settings, "whatsapp_number") || settingString(settings, "store_phone");
  let number = configured.replace(/\D/g, "");
  if (number.startsWith("0")) number = `233${number.slice(1)}`;
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : "";
};
const getGoogleMapsUrl = (settings: Record<string, unknown>) => {
  const address = settingString(settings, "store_address");
  return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "";
};

function SeoHead({ page, product, settings, isAdmin = false }: { page: string; product?: Product; settings: Record<string, unknown>; isAdmin?: boolean }) {
  useEffect(() => {
    const privatePages = new Set(["account", "cart", "checkout"]);
    const noIndex = isAdmin || privatePages.has(page);
    const pageMeta: Record<string, { title: string; description: string }> = {
      home: {
        title: "Aunty Sala Fashion Gh | Ghanaian Fashion & Custom Dresses",
        description: "Shop ready-to-wear and made-to-measure Ghanaian fashion from Aunty Sala Fashion Gh. Contemporary dresses crafted with beautiful African fabrics.",
      },
      shop: {
        title: "Shop Ghanaian Dresses & African Fashion | Aunty Sala",
        description: "Explore contemporary Ghanaian dresses, gowns, sets, and African-print fashion handcrafted by Aunty Sala Fashion Gh.",
      },
      custom: {
        title: "Custom-Made Dresses in Ghana | Aunty Sala Fashion Gh",
        description: "Order a made-to-measure dress crafted in Ghana. Choose your style and fabric, share your measurements, and let Aunty Sala create your piece.",
      },
      about: {
        title: "About Aunty Sala Fashion Gh | Crafted in Ghana",
        description: "Discover the story, craftsmanship, and Ghanaian heritage behind Aunty Sala Fashion Gh and its made-to-measure designs.",
      },
      contact: {
        title: "Contact Aunty Sala Fashion Gh",
        description: "Contact Aunty Sala Fashion Gh for custom dresses, sizing assistance, order support, and worldwide delivery enquiries.",
      },
      "help-sizing": { title: "Dress Sizing Guide | Aunty Sala Fashion Gh", description: "Find your best fit with the Aunty Sala Fashion Gh dress sizing and body measurement guide." },
      "help-fabric-care": { title: "African Fabric Care Guide | Aunty Sala Fashion Gh", description: "Learn how to wash, dry, iron, and care for Ankara, kente, batik, and other African-fabric garments." },
      "help-returns": { title: "Returns Policy | Aunty Sala Fashion Gh", description: "Read the returns, exchanges, alterations, and custom-order policy for Aunty Sala Fashion Gh." },
      "help-faqs": { title: "Frequently Asked Questions | Aunty Sala Fashion Gh", description: "Answers about custom orders, sizing, worldwide delivery, order tracking, and Ghanaian fashion from Aunty Sala." },
      "privacy-policy": { title: "Privacy Policy | Aunty Sala Fashion Gh", description: "Learn how Aunty Sala Fashion Gh collects, uses, protects, and shares personal information when you use our store." },
      "terms-of-service": { title: "Terms of Service | Aunty Sala Fashion Gh", description: "Read the terms that apply when you browse, create an account, or place an order with Aunty Sala Fashion Gh." },
      account: { title: "My Account | Aunty Sala Fashion Gh", description: "Manage your Aunty Sala Fashion Gh account and orders." },
      cart: { title: "Shopping Cart | Aunty Sala Fashion Gh", description: "Review the items in your Aunty Sala Fashion Gh shopping cart." },
      checkout: { title: "Secure Checkout | Aunty Sala Fashion Gh", description: "Complete your Aunty Sala Fashion Gh order securely." },
    };
    const meta = product ? {
      title: `${product.name} | Aunty Sala Fashion Gh`,
      description: product.description.slice(0, 155),
    } : isAdmin ? {
      title: "Admin Portal | Aunty Sala Fashion Gh",
      description: "Aunty Sala Fashion Gh administration portal.",
    } : pageMeta[page] ?? pageMeta.home;
    const canonicalUrl = new URL(window.location.pathname, window.location.origin).toString();
    const imageUrl = product?.images[0] || new URL("/aunty-sala-logo.png", window.location.origin).toString();

    const setMeta = (selector: string, attribute: "name" | "property", key: string, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      element.content = content;
    };
    document.title = meta.title;
    setMeta('meta[name="description"]', "name", "description", meta.description);
    setMeta('meta[name="robots"]', "name", "robots", noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large");
    setMeta('meta[property="og:type"]', "property", "og:type", product ? "product" : "website");
    setMeta('meta[property="og:title"]', "property", "og:title", meta.title);
    setMeta('meta[property="og:description"]', "property", "og:description", meta.description);
    setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    setMeta('meta[property="og:image"]', "property", "og:image", imageUrl);
    setMeta('meta[property="og:image:alt"]', "property", "og:image:alt", product?.name ?? "Aunty Sala Fashion Gh logo");
    setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", meta.title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", meta.description);
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", imageUrl);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    const instagram = getInstagramProfile(settings);
    const schema = product ? {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.description,
      image: product.images,
      sku: product.sku,
      category: product.category,
      brand: { "@type": "Brand", name: "Aunty Sala Fashion Gh" },
      offers: {
        "@type": "Offer",
        url: canonicalUrl,
        priceCurrency: "GHS",
        price: product.price,
        availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      },
    } : {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: settingString(settings, "store_name") || "Aunty Sala Fashion Gh",
      url: window.location.origin,
      logo: new URL("/aunty-sala-logo.png", window.location.origin).toString(),
      email: settingString(settings, "store_email") || undefined,
      telephone: settingString(settings, "store_phone") || undefined,
      address: settingString(settings, "store_address") ? { "@type": "PostalAddress", streetAddress: settingString(settings, "store_address"), addressCountry: "GH" } : undefined,
      sameAs: instagram ? [instagram.href] : undefined,
    };
    let structuredData = document.head.querySelector<HTMLScriptElement>('#aunty-sala-structured-data');
    if (!structuredData) {
      structuredData = document.createElement("script");
      structuredData.id = "aunty-sala-structured-data";
      structuredData.type = "application/ld+json";
      document.head.appendChild(structuredData);
    }
    structuredData.textContent = JSON.stringify(schema);
  }, [isAdmin, page, product, settings]);
  return null;
}
const downloadCsv = (filename: string, rows: Array<Array<string | number>>) => {
  const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
function ManagedImage({ src, alt, className, onLoad }: { src?: string; alt: string; className: string; onLoad?: () => void }) {
  return src ? <img src={src} alt={alt} className={className} onLoad={onLoad} /> : null;
}
function FashionLoader({ label = "Tailoring your experience…", compact = false, className = "" }: { label?: string; compact?: boolean; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label} className={`${compact ? "min-h-64" : "min-h-screen"} ${className} flex flex-col items-center justify-center gap-5 px-6 bg-background`}>
      <div className="relative w-24 h-28 flex items-center justify-center text-[#C4562A]" aria-hidden="true">
        <svg className="fashion-loader-dress w-[86px] h-[102px] overflow-visible" viewBox="0 0 86 102" fill="none">
          <path d="M36 9C36 4 50 4 50 9L49 20L59 28L55 43C58 56 69 73 75 91C59 99 27 99 11 91C17 73 28 56 31 43L27 28L37 20ZM31 43C38 47 48 47 55 43" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="43" cy="23" r="3.5" className="fashion-loader-pin fill-[#B8922A]" />
        </svg>
      </div>
      <div className="text-center">
        <p className="font-semibold text-[#1A1A18]" style={{ fontFamily: "var(--font-display)" }}>{label}</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#B8922A]">Aunty Sala Fashion Gh</p>
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
const statusColor: Record<string, string> = {
  Created: "bg-amber-50 text-amber-700",
  "Draft (not paid)": "bg-amber-50 text-amber-700",
  Paid: "bg-emerald-50 text-emerald-700",
  Processing: "bg-blue-50 text-blue-700",
  Measuring: "bg-cyan-50 text-cyan-700",
  Cutting: "bg-orange-50 text-orange-700",
  Sewing: "bg-purple-50 text-purple-700",
  Ready: "bg-green-50 text-green-700",
  Shipped: "bg-amber-50 text-amber-700",
  Delivered: "bg-gray-50 text-gray-600",
  Fitting: "bg-pink-50 text-pink-700",
  Cancelled: "bg-red-50 text-red-700",
};

// ─── Pattern SVG ───────────────────────────────────────────────────────────
function KenteStripe({ className = "" }: { className?: string }) {
  return (
    <div className={`overflow-hidden ${className}`} style={{ height: 8 }}>
      <svg width="100%" height="8" preserveAspectRatio="none">
        <defs>
          <pattern id="kente" x="0" y="0" width="40" height="8" patternUnits="userSpaceOnUse">
            <rect width="10" height="8" fill="#C4562A"/>
            <rect x="10" width="10" height="8" fill="#B8922A"/>
            <rect x="20" width="10" height="8" fill="#1A1A18"/>
            <rect x="30" width="10" height="8" fill="#7A8C6E"/>
          </pattern>
        </defs>
        <rect width="100%" height="8" fill="url(#kente)" opacity="0.7"/>
      </svg>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={14} className={i <= rating ? "fill-[#B8922A] text-[#B8922A]" : "fill-muted text-muted"} />
      ))}
    </div>
  );
}

// ─── Customer Nav ──────────────────────────────────────────────────────────
function CustomerNav({ page, setPage, cartCount, isAuthenticated }:
  { page: string; setPage: (p: string) => void; cartCount: number; isAuthenticated: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    { label: "Home", page: "home" }, { label: "Shop", page: "shop" }, { label: "Custom Order", page: "custom" },
    { label: "About", page: "about" }, { label: "Contact", page: "contact" },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || page !== "home" ? "bg-[#FAF7F2]/95 backdrop-blur-sm shadow-sm" : "bg-gradient-to-b from-black/50 to-transparent"}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <button onClick={() => setPage("home")} className="flex items-center gap-2 leading-none" aria-label="Aunty Sala Fashion Gh home">
          <img src="/aunty-sala-logo.png" alt="" className="h-12 w-auto object-contain" />
          <span className="hidden sm:flex flex-col items-start">
            <span className={`text-xl font-bold tracking-tight transition-colors ${!scrolled && page === "home" ? "text-white" : "text-[#1A1A18]"}`} style={{ fontFamily: "var(--font-display)" }}>
              Aunty Sala
            </span>
            <span className="text-[10px] tracking-[0.25em] uppercase text-[#B8922A] font-medium" style={{ fontFamily: "var(--font-body)" }}>
              Fashion Gh
            </span>
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <button key={l.page} onClick={() => setPage(l.page)}
              className={`text-sm tracking-wide transition-colors hover:text-[#C4562A] ${page === l.page ? "text-[#C4562A]" : scrolled || page !== "home" ? "text-[#1A1A18]" : "text-white"}`}
              style={{ fontFamily: "var(--font-body)" }}>
              {l.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button onClick={() => setPage("account")} className={`hidden md:flex items-center gap-1.5 p-2 text-sm font-semibold hover:text-[#C4562A] transition-colors ${!scrolled && page === "home" ? "text-white" : ""}`} aria-label={isAuthenticated ? "Account" : "Login"}>
            {isAuthenticated ? <User size={20} /> : "Login"}
          </button>
          <button onClick={() => setPage("cart")} className={`relative p-2 hover:text-[#C4562A] transition-colors ${!scrolled && page === "home" ? "text-white" : ""}`} aria-label="Cart">
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#C4562A] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
          <button onClick={() => setOpen(!open)} className="md:hidden p-2" aria-label="Menu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-[#FAF7F2] border-t border-border px-6 py-4 flex flex-col gap-3">
          {links.map(l => (
            <button key={l.page} onClick={() => { setPage(l.page); setOpen(false); }}
              className="text-left py-2 text-base font-medium hover:text-[#C4562A] transition-colors"
              style={{ fontFamily: "var(--font-body)" }}>
              {l.label}
            </button>
          ))}
          <hr className="border-border my-1" />
          <button onClick={() => { setPage("account"); setOpen(false); }}
            className="text-left py-2 text-base font-medium hover:text-[#C4562A]">{isAuthenticated ? "My Account" : "Login"}</button>
        </div>
      )}
    </header>
  );
}

// ─── Customer Footer ───────────────────────────────────────────────────────
function CustomerFooter({ setPage }: { setPage: (p: string) => void }) {
  const { settings } = useStoreContent();
  const instagram = getInstagramProfile(settings);
  const whatsappUrl = getWhatsAppUrl(settings, "Hello Aunty Sala Fashion Gh, I would like to make an enquiry.");
  const phone = settingString(settings, "store_phone");
  const storeEmail = settingString(settings, "store_email");
  const socialLinks = [
    instagram && {
      label: `Instagram ${instagram.label}`,
      href: instagram.href,
      icon: Instagram,
      external: true,
    },
    {
      label: "TikTok @auntsala.big.bran",
      href: "https://www.tiktok.com/@auntsala.big.bran",
      icon: Music2,
      external: true,
    },
    whatsappUrl && {
      label: "Chat with us on WhatsApp",
      href: whatsappUrl,
      icon: MessageCircle,
      external: true,
    },
    phone && {
      label: `Call ${phone}`,
      href: `tel:${phone.replace(/[^\d+]/g, "")}`,
      icon: Phone,
      external: false,
    },
    storeEmail && {
      label: `Email ${storeEmail}`,
      href: `mailto:${storeEmail}`,
      icon: Mail,
      external: false,
    },
  ].filter(Boolean) as Array<{ label: string; href: string; icon: typeof Instagram; external: boolean }>;
  const shopLinks = [
    { label: "Shop All", page: "shop" },
    { label: "Custom Orders", page: "custom" },
    { label: "My Account", page: "account" },
    { label: "Shopping Cart", page: "cart" },
  ];
  const helpLinks = [
    { label: "About Us", page: "about" },
    { label: "Contact", page: "contact" },
    { label: "Sizing Guide", page: "help-sizing" },
    { label: "Fabric Care", page: "help-fabric-care" },
    { label: "Returns Policy", page: "help-returns" },
    { label: "FAQs", page: "help-faqs" },
  ];
  return (
    <footer className="bg-[#1A1A18] text-[#FAF7F2]">
      <KenteStripe />
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-1">
          <button type="button" onClick={() => setPage("home")} className="mb-4 flex items-center gap-3 text-left" aria-label="Go to homepage">
            <img src="/aunty-sala-logo.png" alt="Aunty Sala Fashion Gh logo" className="h-20 w-auto object-contain" />
            <div>
              <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Aunty Sala</p>
              <p className="text-[10px] tracking-[0.25em] uppercase text-[#B8922A] font-medium" style={{ fontFamily: "var(--font-body)" }}>Fashion Gh</p>
            </div>
          </button>
          <p className="text-sm text-[#FAF7F2]/60 leading-relaxed mt-3">
            Made-to-order dresses and ready-to-wear pieces blending contemporary silhouettes with the finest African print fabrics.
          </p>
        </div>

        <div>
          <p className="text-xs tracking-widest uppercase text-[#B8922A] mb-5 font-semibold">Shop</p>
          {shopLinks.map(({ label, page }) => (
            <button key={label} type="button" onClick={() => setPage(page)}
              className="block text-sm text-[#FAF7F2]/60 hover:text-[#FAF7F2] mb-2.5 transition-colors text-left">{label}</button>
          ))}
        </div>

        <div>
          <p className="text-xs tracking-widest uppercase text-[#B8922A] mb-5 font-semibold">Help</p>
          {helpLinks.map(({ label, page }) => (
            <button key={label} type="button" onClick={() => setPage(page)}
              className="block text-sm text-[#FAF7F2]/60 hover:text-[#FAF7F2] mb-2.5 transition-colors text-left">{label}</button>
          ))}
        </div>

        <div>
          <p className="text-xs tracking-widest uppercase text-[#B8922A] mb-5 font-semibold">Follow Us</p>
          <p className="text-sm text-[#FAF7F2]/60 mb-4 leading-relaxed">Follow our latest pieces and speak directly with the Aunty Sala team.</p>
          <div className="flex flex-wrap items-center gap-3">
            {socialLinks.map(({ label, href, icon: Icon, external }) => (
              <a key={label} href={href} aria-label={label} title={label}
                target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-[#FAF7F2] hover:border-[#B8922A] hover:bg-[#B8922A] hover:text-[#1A1A18] transition-colors">
                <Icon size={17} />
              </a>
            ))}
            {socialLinks.length === 0 && <p className="text-sm text-[#FAF7F2]/50">Social links will appear here once added in store settings.</p>}
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 max-w-7xl mx-auto px-6 lg:px-10 py-5 flex flex-col lg:flex-row justify-between items-center gap-3 text-xs text-[#FAF7F2]/40">
        <p>© {new Date().getFullYear()} Aunty Sala Fashion Gh. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => setPage("privacy-policy")} className="hover:text-[#FAF7F2] transition-colors">Privacy Policy</button>
          <button type="button" onClick={() => setPage("terms-of-service")} className="hover:text-[#FAF7F2] transition-colors">Terms of Service</button>
        </div>
        <p>Designed & crafted in Accra, Ghana 🇬🇭</p>
      </div>
    </footer>
  );
}

// ─── HOME PAGE ─────────────────────────────────────────────────────────────
function HomePage({ setPage, addToCart }: { setPage: (p: string) => void; addToCart: (p: Product) => void }) {
  const PRODUCTS = useProducts();
  const { testimonials, gallery, siteMedia, settings } = useStoreContent();
  const [heroLoaded, setHeroLoaded] = useState(false);
  const testimonialScrollerRef = useRef<HTMLDivElement>(null);
  const featured = PRODUCTS.slice(0, 4);
  const instagram = getInstagramProfile(settings);
  const scrollTestimonials = (direction: -1 | 1) => {
    const scroller = testimonialScrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({ left: direction * Math.max(320, scroller.clientWidth * 0.8) });
  };

  return (
    <div className="min-h-screen" style={{ fontFamily: "var(--font-body)" }}>
      {/* Hero */}
      <section className="relative flex h-[100svh] min-h-[660px] max-h-[820px] items-end overflow-hidden bg-[#2A1810] md:h-[92vh] md:min-h-[600px] md:max-h-none">
        <ManagedImage src={siteMedia.home_hero} alt="Aunty Sala Fashion Gh collection"
          onLoad={() => setHeroLoaded(true)}
          className={`absolute inset-0 h-full w-full object-cover object-[82%_center] transition-opacity duration-700 md:object-top ${heroLoaded ? "opacity-90" : "opacity-0"}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#160B06] via-[#160B06]/35 to-black/10 md:bg-gradient-to-r md:from-[#1A0E08]/80 md:via-[#1A0E08]/40 md:to-transparent" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-10 sm:px-6 sm:pb-14 lg:px-10 lg:pb-20">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D1A938] sm:text-xs md:mb-4 md:tracking-[0.22em]">
            <span className="md:hidden">Aunty Sala Fashion Gh</span>
            <span className="hidden md:inline">Aunty Sala Fashion Gh — Official Online Fashion Store</span>
          </p>
          <h1 className="mb-4 max-w-[20rem] text-[clamp(2.8rem,13vw,4rem)] font-bold leading-[0.92] text-white sm:max-w-xl sm:text-6xl md:mb-6 md:max-w-4xl md:text-6xl md:leading-none lg:text-7xl" style={{ fontFamily: "var(--font-display)" }}>
            Your Inner Diva<span className="text-[#C4562A] md:text-white">.</span>
            <em className="hidden not-italic text-[#C4562A] md:inline"><br />Everything Fashionable.</em>
          </h1>
          <p className="mb-6 max-w-[17rem] text-sm leading-relaxed text-white/75 sm:max-w-sm md:mb-8 md:text-lg">
            <span className="md:hidden">Contemporary Ghanaian fashion, made for you.</span>
            <span className="hidden md:inline">Made-to-measure dresses woven from the finest kente, ankara &amp; batik — crafted in Accra, for women everywhere.</span>
          </p>
          <div className="grid max-w-sm grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-4">
            <button onClick={() => setPage("shop")}
              className="flex items-center justify-center gap-2 rounded bg-[#C4562A] px-4 py-3 text-xs font-semibold tracking-wide text-white transition-colors hover:bg-[#A8411B] sm:px-8 sm:py-3.5 sm:text-sm">
              Shop Now <ArrowRight size={16} />
            </button>
            <button onClick={() => setPage("custom")}
              className="rounded border border-white/50 px-4 py-3 text-xs font-semibold tracking-wide text-white transition-colors hover:border-white sm:px-8 sm:py-3.5 sm:text-sm">
              Custom Order
            </button>
          </div>
        </div>
        <div className="absolute right-8 bottom-8 hidden lg:flex flex-col items-center gap-2">
          <div className="w-px h-16 bg-white/30" />
          <span className="text-white/40 text-[10px] tracking-widest rotate-90 origin-center" style={{ writingMode: "vertical-rl" }}>Scroll</span>
        </div>
      </section>

      <KenteStripe />

      {/* Store purpose */}
      <section className="bg-[#FAF7F2] px-6 lg:px-10 py-14" aria-labelledby="store-purpose-heading">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-[#B8922A] text-xs tracking-[0.3em] uppercase mb-3 font-semibold">About This Store</p>
          <h2 id="store-purpose-heading" className="text-3xl md:text-4xl font-bold mb-5" style={{ fontFamily: "var(--font-display)" }}>
            Ghanaian fashion, made personal
          </h2>
          <p className="max-w-3xl mx-auto text-muted-foreground leading-relaxed">
            Aunty Sala Fashion Gh is an online fashion store for discovering ready-to-wear pieces, requesting made-to-measure dresses, saving favourites, placing secure orders, and tracking each order from creation to delivery.
          </p>
        </div>
      </section>

      {/* Featured Collections */}
      <section className="py-20 px-6 lg:px-10 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-[#B8922A] text-xs tracking-[0.3em] uppercase mb-2 font-semibold">Curated for You</p>
            <h2 className="text-4xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Featured Pieces</h2>
          </div>
          <button onClick={() => setPage("shop")} className="hidden sm:flex items-center gap-2 text-sm font-semibold text-[#C4562A] hover:gap-3 transition-all">
            View All <ArrowRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map(p => (
            <div key={p.id} className="group text-left bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="relative overflow-hidden bg-[#E8E2D9]" style={{ aspectRatio: "3/4" }}
                onClick={() => setPage(`product-${p.slug}`)}>
                <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                {p.badge && (
                  <span className="absolute top-3 left-3 bg-[#C4562A] text-white text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded">
                    {p.badge}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                <button onClick={e => { e.stopPropagation(); addToCart(p); }}
                  className="absolute bottom-3 left-3 right-3 bg-white/95 hover:bg-[#C4562A] hover:text-white text-[#1A1A18] text-xs font-semibold py-2.5 rounded opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                  Add to Cart
                </button>
              </div>
              <div className="p-4" onClick={() => setPage(`product-${p.slug}`)}>
                <p className="text-xs text-[#B8922A] uppercase tracking-widest mb-1 font-semibold">{p.fabric}</p>
                <p className="font-semibold text-sm mb-1" style={{ fontFamily: "var(--font-display)" }}>{p.name}</p>
                <p className="text-[#C4562A] font-bold text-sm">{ghs(p.price)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Custom Order Banner */}
      <section className="relative overflow-hidden bg-[#1A1A18] mx-6 lg:mx-10 rounded-2xl mb-20">
        <div className="absolute inset-0">
          <ManagedImage src={siteMedia.home_custom_banner} alt="Custom fashion fabric" className="w-full h-full object-cover opacity-20" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 px-10 py-14">
          <div>
            <p className="text-[#B8922A] text-xs tracking-[0.3em] uppercase mb-3 font-semibold">Bespoke Service</p>
            <h2 className="text-white text-4xl font-bold mb-4 max-w-md" style={{ fontFamily: "var(--font-display)" }}>
              Your Dream Dress,<br /><em className="not-italic text-[#C4562A]">Made for You.</em>
            </h2>
            <p className="text-white/60 max-w-sm leading-relaxed">
              Share your measurements, choose your fabric, and let our master seamstresses craft a one-of-a-kind piece. Delivered in 2–4 weeks.
            </p>
          </div>
          <div className="flex flex-col gap-4 min-w-[200px]">
            {["Choose Your Fabric","Share Measurements","We Craft It","Delivered"].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full border-2 border-[#B8922A] text-[#B8922A] text-xs font-bold flex items-center justify-center shrink-0">{i+1}</div>
                <span className="text-white/80 text-sm">{step}</span>
              </div>
            ))}
            <button onClick={() => setPage("custom")}
              className="mt-2 bg-[#C4562A] hover:bg-[#A8411B] text-white px-6 py-3 text-sm font-semibold rounded transition-colors flex items-center justify-center gap-2">
              Start Custom Order <Scissors size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 lg:px-10 max-w-7xl mx-auto">
        <div className="flex items-end justify-between gap-6 mb-12">
          <div>
            <p className="text-[#B8922A] text-xs tracking-[0.3em] uppercase mb-2 font-semibold">What Our Clients Say</p>
            <h2 className="text-4xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Worn &amp; Loved</h2>
          </div>
          {testimonials.length > 1 && (
            <div className="flex items-center gap-2" aria-label="Testimonial controls">
              <button type="button" onClick={() => scrollTestimonials(-1)} aria-label="Previous testimonials" className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center hover:border-[#C4562A] hover:text-[#C4562A] transition-colors">
                <ChevronLeft size={18} />
              </button>
              <button type="button" onClick={() => scrollTestimonials(1)} aria-label="Next testimonials" className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center hover:border-[#C4562A] hover:text-[#C4562A] transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
        <div ref={testimonialScrollerRef} tabIndex={0} aria-label="Customer testimonials" className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth motion-reduce:scroll-auto pb-4 overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {testimonials.map((t) => (
            <article key={t.id} className="min-w-[85%] sm:min-w-[360px] lg:min-w-[calc(33.333%-1rem)] snap-start bg-card rounded-xl p-7 shadow-sm border border-border/50 flex flex-col">
              <StarRating rating={t.rating} />
              <p className="text-sm leading-relaxed text-[#1A1A18]/80 mt-4 mb-5 italic" style={{ fontFamily: "var(--font-display)" }}>
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="mt-auto">
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.location}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Instagram Gallery Strip */}
      <section className="pb-20 px-6 lg:px-10 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Instagram size={18} className="text-[#C4562A]" />
            <p className="font-semibold text-sm">{instagram?.label ?? "Instagram"}</p>
          </div>
          {instagram && <a href={instagram.href} target="_blank" rel="noreferrer" className="text-xs text-[#C4562A] font-semibold hover:underline">Follow us on Instagram</a>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          {gallery.map((item) => (
            <div key={item.id} className="relative overflow-hidden rounded-xl bg-[#E8E2D9] group shadow-sm" style={{ aspectRatio: "3 / 4" }}>
              <img
                src={item.imageUrl}
                alt={item.altText}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain object-center transition-[filter] duration-500 group-hover:brightness-95"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Instagram size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Values Strip */}
      <section className="bg-[#F0EAE0] py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Scissors, label: "Master Craftsmanship", sub: "Hand-finished by expert seamstresses" },
            { icon: Truck, label: "Worldwide Delivery", sub: "Shipped to Ghana, UK, US & more" },
            { icon: Award, label: "Premium Fabrics", sub: "Sourced directly from local weavers" },
            { icon: MessageCircle, label: "WhatsApp Support", sub: "Direct line to our team, always" },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[#C4562A]/10 rounded-lg flex items-center justify-center shrink-0">
                <Icon size={18} className="text-[#C4562A]" />
              </div>
              <div>
                <p className="font-semibold text-sm mb-0.5">{label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── SHOP PAGE ─────────────────────────────────────────────────────────────
function ShopPage({ setPage, addToCart }: { setPage: (p: string) => void; addToCart: (p: Product) => void }) {
  const { siteMedia } = useStoreContent();
  const { ids: wishlist, toggle: toggleWishlist, isAuthenticated } = useWishlist();
  const [category, setCategory] = useState("All");
  const [fabric, setFabric] = useState("All");
  const [sortBy, setSortBy] = useState("featured");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [wishlistPending, setWishlistPending] = useState<string[]>([]);
  const [wishlistError, setWishlistError] = useState("");
  const [shopProducts, setShopProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [productsLoading, setProductsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [filterOptions, setFilterOptions] = useState<{ categories: string[]; fabrics: string[] }>({ categories: [], fabrics: [] });
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const requestVersionRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const handleWishlist = async (productId: string) => {
    if (!isAuthenticated) {
      setPage("account");
      return;
    }
    setWishlistPending((current) => [...current, productId]);
    setWishlistError("");
    try {
      await toggleWishlist(productId);
    } catch (error) {
      setWishlistError(error instanceof Error ? error.message : "The wishlist could not be updated.");
    } finally {
      setWishlistPending((current) => current.filter((id) => id !== productId));
    }
  };

  const categories = ["All", ...filterOptions.categories];
  const fabrics = ["All", ...filterOptions.fabrics];
  const hasMore = shopProducts.length < totalProducts;

  useEffect(() => {
    getProductFilters().then(setFilterOptions).catch(() => setFilterOptions({ categories: [], fabrics: [] }));
  }, []);

  useEffect(() => {
    const requestVersion = ++requestVersionRef.current;
    setProductsLoading(true);
    setProductsError("");
    setShopProducts([]);
    setTotalProducts(0);
    loadingMoreRef.current = false;
    setLoadingMore(false);
    const timer = window.setTimeout(() => {
      getProductsPage({
        offset: 0,
        limit: 20,
        category,
        fabric,
        search,
        sortBy: sortBy as "featured" | "price-asc" | "price-desc",
      }).then((result) => {
        if (requestVersion !== requestVersionRef.current) return;
        setShopProducts(result.products);
        setTotalProducts(result.total);
      }).catch((error) => {
        if (requestVersion !== requestVersionRef.current) return;
        setProductsError(error instanceof Error ? error.message : "Products could not be loaded.");
      }).finally(() => {
        if (requestVersion === requestVersionRef.current) setProductsLoading(false);
      });
    }, search.trim() ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [category, fabric, search, sortBy]);

  const loadMoreProducts = useCallback(async () => {
    if (loadingMoreRef.current || productsLoading || shopProducts.length >= totalProducts) return;
    const requestVersion = requestVersionRef.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setProductsError("");
    try {
      const result = await getProductsPage({
        offset: shopProducts.length,
        limit: 10,
        category,
        fabric,
        search,
        sortBy: sortBy as "featured" | "price-asc" | "price-desc",
      });
      if (requestVersion !== requestVersionRef.current) return;
      setShopProducts((current) => {
        const existing = new Set(current.map((product) => product.id));
        return [...current, ...result.products.filter((product) => !existing.has(product.id))];
      });
      setTotalProducts(result.total);
    } catch (error) {
      if (requestVersion === requestVersionRef.current) setProductsError(error instanceof Error ? error.message : "More products could not be loaded.");
    } finally {
      if (requestVersion === requestVersionRef.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [category, fabric, productsLoading, search, shopProducts.length, sortBy, totalProducts]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore || productsLoading) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void loadMoreProducts();
    }, { rootMargin: "500px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadMoreProducts, productsLoading]);

  return (
    <div className="min-h-screen pt-16" style={{ fontFamily: "var(--font-body)" }}>
      {/* Page Header */}
      <div className="bg-[#1A1A18] min-h-[280px] md:min-h-[360px] px-6 lg:px-10 text-center relative overflow-hidden flex items-center justify-center">
        <ManagedImage src={siteMedia.shop_banner} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15" />
        <div className="relative z-10">
          <p className="text-[#B8922A] text-xs tracking-[0.3em] uppercase mb-2 font-semibold">Our Collection</p>
          <h1 className="text-white text-4xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Shop All Pieces</h1>
        </div>
      </div>
      <KenteStripe />

      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center mb-8">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search pieces..." className="w-full pl-9 pr-3 py-2.5 border border-border rounded-lg text-sm bg-card focus:outline-none focus:border-[#C4562A]" />
          </div>

          <div className="flex gap-2 flex-wrap">
            {categories.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${category === c ? "bg-[#C4562A] text-white border-[#C4562A]" : "border-border hover:border-[#C4562A] text-[#1A1A18]"}`}>
                {c}
              </button>
            ))}
          </div>

          <select value={fabric} onChange={e => setFabric(e.target.value)}
            className="border border-border rounded-lg px-3 py-2.5 text-sm bg-card focus:outline-none focus:border-[#C4562A]">
            {fabrics.map(f => <option key={f} value={f}>{f === "All" ? "All Fabrics" : f}</option>)}
          </select>

          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="border border-border rounded-lg px-3 py-2.5 text-sm bg-card focus:outline-none focus:border-[#C4562A]">
            <option value="featured">Featured</option>
            <option value="price-asc">Price: Low–High</option>
            <option value="price-desc">Price: High–Low</option>
          </select>

          <div className="ml-auto flex gap-1">
            <button onClick={() => setView("grid")} className={`p-2 rounded ${view === "grid" ? "bg-[#C4562A] text-white" : "hover:bg-muted"}`}><LayoutGrid size={16}/></button>
            <button onClick={() => setView("list")} className={`p-2 rounded ${view === "list" ? "bg-[#C4562A] text-white" : "hover:bg-muted"}`}><LayoutList size={16}/></button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6">{productsLoading ? "Finding pieces…" : `${totalProducts} piece${totalProducts !== 1 ? "s" : ""} found`}</p>
        {wishlistError && <p role="alert" className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{wishlistError}</p>}
        {productsError && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"><span>{productsError}</span>{shopProducts.length > 0 && <button type="button" onClick={() => void loadMoreProducts()} className="font-bold underline">Try again</button>}</div>}

        {productsLoading && <FashionLoader compact label="Curating the collection…" />}

        {!productsLoading && view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {shopProducts.map(p => (
              <div key={p.id} className="group bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-border/40 [content-visibility:auto] [contain-intrinsic-size:480px]">
                <div className="relative overflow-hidden bg-[#E8E2D9] cursor-pointer" style={{ aspectRatio: "3/4" }}
                  onClick={() => setPage(`product-${p.slug}`)}>
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {p.badge && <span className="absolute top-3 left-3 bg-[#C4562A] text-white text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded">{p.badge}</span>}
                  {!p.inStock && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="bg-white text-xs font-bold px-3 py-1 rounded">Out of Stock</span></div>}
                  <button disabled={wishlistPending.includes(p.id)} onClick={e => { e.stopPropagation(); void handleWishlist(p.id); }}
                    aria-label={wishlist.includes(p.id) ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`}
                    className="absolute top-3 right-3 w-8 h-8 bg-white disabled:opacity-50 rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                    <Heart size={14} className={wishlist.includes(p.id) ? "fill-[#C4562A] text-[#C4562A]" : "text-[#1A1A18]"} />
                  </button>
                  {p.inStock && (
                    <button onClick={e => { e.stopPropagation(); addToCart(p); }}
                      className="absolute bottom-3 left-3 right-3 bg-white/95 hover:bg-[#C4562A] hover:text-white text-[#1A1A18] text-xs font-semibold py-2.5 rounded opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                      Add to Cart
                    </button>
                  )}
                </div>
                <div className="p-4" onClick={() => setPage(`product-${p.slug}`)} role="button">
                  <p className="text-xs text-[#B8922A] uppercase tracking-widest mb-1 font-semibold">{p.fabric}</p>
                  <p className="font-semibold text-sm mb-1" style={{ fontFamily: "var(--font-display)" }}>{p.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[#C4562A] font-bold text-sm">{ghs(p.price)}</span>
                    {p.originalPrice && <span className="text-muted-foreground text-xs line-through">{ghs(p.originalPrice)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !productsLoading ? (
          <div className="flex flex-col gap-4">
            {shopProducts.map(p => (
              <div key={p.id} className="bg-card rounded-xl overflow-hidden shadow-sm border border-border/40 flex gap-5 p-4 cursor-pointer hover:shadow-md transition-shadow [content-visibility:auto] [contain-intrinsic-size:144px]"
                onClick={() => setPage(`product-${p.slug}`)}>
                <div className="w-24 h-28 rounded-lg overflow-hidden bg-[#E8E2D9] shrink-0">
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#B8922A] uppercase tracking-widest font-semibold">{p.fabric} · {p.category}</p>
                  <p className="font-bold text-base mt-0.5" style={{ fontFamily: "var(--font-display)" }}>{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{p.description}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-[#C4562A] font-bold">{ghs(p.price)}</span>
                    <span className="text-xs text-muted-foreground">{p.sizes.join(" · ")}</span>
                  </div>
                </div>
                <div className="self-center shrink-0 flex items-center gap-2">
                  <button disabled={wishlistPending.includes(p.id)} onClick={e => { e.stopPropagation(); void handleWishlist(p.id); }} aria-label={wishlist.includes(p.id) ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`} className="p-2.5 border border-border rounded hover:border-[#C4562A] disabled:opacity-50">
                    <Heart size={15} className={wishlist.includes(p.id) ? "fill-[#C4562A] text-[#C4562A]" : ""} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); if (p.inStock) addToCart(p); }}
                    disabled={!p.inStock}
                    className="bg-[#C4562A] disabled:opacity-40 hover:bg-[#A8411B] text-white text-xs font-semibold px-4 py-2.5 rounded transition-colors">
                    {p.inStock ? "Add" : "OOS"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!productsLoading && shopProducts.length === 0 && !productsError && (
          <div className="text-center py-20 text-muted-foreground">
            <Package size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-semibold">No pieces match your filters</p>
            <button onClick={() => { setCategory("All"); setFabric("All"); setSearch(""); }} className="mt-3 text-[#C4562A] text-sm font-semibold hover:underline">Clear filters</button>
          </div>
        )}

        {!productsLoading && shopProducts.length > 0 && (
          <div ref={loadMoreRef} className="min-h-24 flex items-center justify-center" aria-live="polite">
            {loadingMore ? (
              <FashionLoader compact label="Tailoring more pieces…" />
            ) : hasMore ? (
              <button type="button" onClick={() => void loadMoreProducts()} className="border border-border rounded-lg px-5 py-2.5 text-sm font-semibold hover:border-[#C4562A] hover:text-[#C4562A] transition-colors">Load more pieces</button>
            ) : (
              <p className="text-xs text-muted-foreground">You’ve seen the full collection.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PRODUCT DETAIL ────────────────────────────────────────────────────────
function ProductDetailPage({ productSlug, setPage, addToCart, onProductLoaded }:
  { productSlug: string; setPage: (p: string) => void; addToCart: (p: Product) => void; onProductLoaded?: (product: Product) => void }) {
  const PRODUCTS = useProducts();
  const { testimonials } = useStoreContent();
  const { ids: wishlist, toggle: toggleWishlist, isAuthenticated } = useWishlist();
  const localProduct = PRODUCTS.find(p => p.slug === productSlug);
  const [remoteProduct, setRemoteProduct] = useState<Product | null>(null);
  const [productLoading, setProductLoading] = useState(!localProduct);
  const [productLoadError, setProductLoadError] = useState("");
  const product = localProduct ?? remoteProduct;
  const [imgIdx, setImgIdx] = useState(0);
  const [size, setSize] = useState("");
  const [tab, setTab] = useState("description");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [wishlistPending, setWishlistPending] = useState(false);
  const [wishlistError, setWishlistError] = useState("");
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const related = product ? PRODUCTS.filter(p => p.id !== product.id && p.category === product.category).slice(0,3) : [];
  const averageRating = testimonials.length
    ? testimonials.reduce((total, testimonial) => total + testimonial.rating, 0) / testimonials.length
    : null;

  useEffect(() => {
    setImgIdx(0);
    if (localProduct) {
      setRemoteProduct(null);
      setProductLoading(false);
      setProductLoadError("");
      return;
    }
    let active = true;
    setProductLoading(true);
    setProductLoadError("");
    getProductBySlug(productSlug)
      .then((result) => {
        if (!active) return;
        setRemoteProduct(result);
        if (result) onProductLoaded?.(result);
      })
      .catch((error) => { if (active) setProductLoadError(error instanceof Error ? error.message : "The product could not be loaded."); })
      .finally(() => { if (active) setProductLoading(false); });
    return () => { active = false; };
  }, [localProduct, onProductLoaded, productSlug]);

  if (productLoading) return <FashionLoader className="pt-16" label="Preparing this piece…" />;
  if (!product) return <div className="min-h-screen pt-24 text-center text-muted-foreground">{productLoadError || "Product not found."}</div>;

  const handleAdd = () => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };
  const handleWishlist = async () => {
    if (!isAuthenticated) {
      setPage("account");
      return;
    }
    setWishlistPending(true);
    setWishlistError("");
    try {
      await toggleWishlist(product.id);
    } catch (error) {
      setWishlistError(error instanceof Error ? error.message : "The wishlist could not be updated.");
    } finally {
      setWishlistPending(false);
    }
  };

  return (
    <div className="min-h-screen pt-16" style={{ fontFamily: "var(--font-body)" }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
          <button onClick={() => setPage("shop")} className="hover:text-[#C4562A]">Shop</button>
          <ChevronRight size={12} />
          <span>{product.category}</span>
          <ChevronRight size={12} />
          <span className="text-[#1A1A18]">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Gallery */}
          <div className="flex gap-4">
            <div className="flex flex-col gap-2 w-16 shrink-0">
              {product.images.map((img, i) => (
                <button key={i} onClick={() => setImgIdx(i)}
                  className={`w-16 h-20 rounded-lg overflow-hidden border-2 transition-colors ${imgIdx === i ? "border-[#C4562A]" : "border-transparent"}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <div className="flex-1 relative rounded-2xl overflow-hidden bg-[#E8E2D9]" style={{ aspectRatio: "3/4" }}>
              <img src={product.images[imgIdx]} alt={product.name} className="w-full h-full object-cover" />
              {product.badge && <span className="absolute top-4 left-4 bg-[#C4562A] text-white text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded">{product.badge}</span>}
              <button onClick={() => setImgIdx(i => (i - 1 + product.images.length) % product.images.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => setImgIdx(i => (i + 1) % product.images.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Info */}
          <div>
            <p className="text-[#B8922A] text-xs tracking-widest uppercase font-bold mb-2">{product.fabric} · {product.category}</p>
            <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>{product.name}</h1>
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-bold text-[#C4562A]">{ghs(product.price)}</span>
              {product.originalPrice && <span className="text-muted-foreground line-through text-lg">{ghs(product.originalPrice)}</span>}
            </div>

            {averageRating !== null && (
              <div className="mb-6">
                <StarRating rating={Math.round(averageRating)} />
                <p className="text-xs text-muted-foreground mt-1">
                  {averageRating.toFixed(1)} · {testimonials.length} {testimonials.length === 1 ? "review" : "reviews"}
                </p>
              </div>
            )}

            {/* Color Swatches */}
            <div className="mb-5">
              <p className="text-sm font-semibold mb-2">Colour Options</p>
              <div className="flex gap-2">
                {product.colors.map((c, i) => (
                  <button key={i} title={c}
                    className="w-7 h-7 rounded-full border-2 border-offset-1 hover:scale-110 transition-transform border-border hover:border-[#B8922A]"
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>

            {/* Size Selector */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <p className="text-sm font-semibold">Size</p>
                <button onClick={() => setShowSizeGuide((current) => !current)} className="text-xs text-[#C4562A] hover:underline">Size Guide</button>
              </div>
              {showSizeGuide && <div className="mb-3 overflow-x-auto rounded-lg border border-border bg-muted/30 p-3">
                <table className="w-full text-xs"><thead><tr>{["Size","Bust","Waist","Hips"].map((heading) => <th key={heading} className="px-2 py-1.5 text-left">{heading}</th>)}</tr></thead><tbody>
                  {[["XS","81–84","63–66","88–91"],["S","86–89","68–71","93–97"],["M","91–94","73–76","99–102"],["L","97–102","79–84","104–109"],["XL","104–109","86–91","112–117"],["XXL","112–117","94–99","119–124"]].map((row) => <tr key={row[0]} className="border-t border-border"><td className="px-2 py-1.5 font-semibold">{row[0]}</td><td className="px-2 py-1.5">{row[1]} cm</td><td className="px-2 py-1.5">{row[2]} cm</td><td className="px-2 py-1.5">{row[3]} cm</td></tr>)}
                </tbody></table>
              </div>}
              <div className="flex flex-wrap gap-2">
                {product.sizes.map(s => (
                  <button key={s} onClick={() => setSize(s)}
                    className={`w-12 h-10 text-sm rounded-lg border-2 font-semibold transition-colors ${size === s ? "border-[#C4562A] bg-[#C4562A] text-white" : "border-border hover:border-[#C4562A]"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Qty + Add */}
            <div className="flex gap-3 mb-4">
              <div className="flex items-center border border-border rounded-lg overflow-hidden">
                <button onClick={() => setQty(q => Math.max(1,q-1))} className="w-10 h-12 flex items-center justify-center hover:bg-muted transition-colors"><Minus size={14}/></button>
                <span className="w-12 text-center font-semibold text-sm">{qty}</span>
                <button onClick={() => setQty(q => q+1)} className="w-10 h-12 flex items-center justify-center hover:bg-muted transition-colors"><Plus size={14}/></button>
              </div>
              <button onClick={handleAdd} disabled={!product.inStock}
                className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${added ? "bg-green-600 text-white" : "bg-[#C4562A] hover:bg-[#A8411B] text-white"} disabled:opacity-40`}>
                {added ? <><Check size={16}/> Added!</> : <><ShoppingCart size={16}/> Add to Cart</>}
              </button>
              <button disabled={wishlistPending} onClick={() => void handleWishlist()} aria-label={wishlist.includes(product.id) ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`} className="w-12 h-12 border border-border disabled:opacity-50 rounded-lg flex items-center justify-center hover:border-[#C4562A] transition-colors">
                <Heart size={18} className={wishlist.includes(product.id) ? "fill-[#C4562A] text-[#C4562A]" : ""} />
              </button>
            </div>
            {wishlistError && <p role="alert" className="mb-4 text-sm text-red-600">{wishlistError}</p>}

            <button onClick={() => setPage("custom")}
              className="w-full border-2 border-[#C4562A] text-[#C4562A] hover:bg-[#C4562A] hover:text-white py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 mb-6">
              <Scissors size={15} /> Request Custom Fit
            </button>

            {/* Delivery */}
            <div className="flex gap-4 py-4 border-t border-border">
              {[{ icon: Truck, text: "Free delivery on orders over GH₵ 500" }, { icon: Clock, text: "Made-to-order: 2–4 weeks" }].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon size={14} className="text-[#B8922A] shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="border-t border-border pt-6 mt-2">
              <div className="flex gap-6 mb-5">
                {["description","fabric-care","reviews"].map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`text-sm font-semibold pb-2 border-b-2 transition-colors ${tab === t ? "border-[#C4562A] text-[#C4562A]" : "border-transparent text-muted-foreground hover:text-[#1A1A18]"}`}>
                    {t === "description" ? "Description" : t === "fabric-care" ? "Fabric Care" : "Reviews"}
                  </button>
                ))}
              </div>
              {tab === "description" && <p className="text-sm text-[#1A1A18]/70 leading-relaxed">{product.description}</p>}
              {tab === "fabric-care" && (
                <ul className="text-sm text-[#1A1A18]/70 space-y-2">
                  {["Hand wash or gentle machine wash in cold water","Do not tumble dry — hang or lay flat to dry","Iron on low heat, inside out","Dry clean recommended for Kente pieces","Store folded in a cool, dry place"].map(i => (
                    <li key={i} className="flex items-start gap-2"><Check size={14} className="text-[#B8922A] mt-0.5 shrink-0"/>{i}</li>
                  ))}
                </ul>
              )}
              {tab === "reviews" && (
                <div className="space-y-4">
                  {testimonials.slice(0,2).map((t) => (
                    <div key={t.id} className="border-b border-border pb-4 last:border-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">{t.name}</span>
                        <StarRating rating={t.rating} />
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{t.location}</p>
                      <p className="text-sm text-[#1A1A18]/70 leading-relaxed">&ldquo;{t.text.slice(0,120)}...&rdquo;</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-20">
            <h2 className="text-2xl font-bold mb-8" style={{ fontFamily: "var(--font-display)" }}>You May Also Love</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {related.map(p => (
                <button key={p.id} onClick={() => setPage(`product-${p.slug}`)} className="group text-left bg-card rounded-xl overflow-hidden shadow-sm border border-border/40 hover:shadow-md transition-shadow">
                  <div className="overflow-hidden bg-[#E8E2D9]" style={{ aspectRatio: "3/4" }}>
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-[#B8922A] uppercase tracking-widest font-semibold mb-1">{p.fabric}</p>
                    <p className="font-semibold text-sm" style={{ fontFamily: "var(--font-display)" }}>{p.name}</p>
                    <p className="text-[#C4562A] font-bold text-sm mt-1">{ghs(p.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CUSTOM ORDER ──────────────────────────────────────────────────────────
function CustomOrderPage() {
  const { siteMedia, settings } = useStoreContent();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submissionReference, setSubmissionReference] = useState("");
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    style: "", fabric: "", occasion: "", budget: "", name: "", email: "", phone: "",
    bust: "", waist: "", hips: "", height: "", notes: "",
  });
  const total = 4;
  const whatsappNumber = String(settings.whatsapp_number ?? settings.store_phone ?? "").replace(/[^0-9]/g, "");
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hello Aunty Sala Fashion Gh, I need help with a custom order.")}` : undefined;

  const up = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const media = referenceFiles.length
        ? await uploadManyToCloudinary(referenceFiles, "aunty-sala-fashion-gh/custom-orders")
        : [];
      const reference = await submitCustomOrder({ ...form, media });
      setSubmissionReference(reference);
      setStep(5);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "We couldn't submit your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const fabrics = [
    { name: "Ankara", desc: "Bold, wax-resist dyed cotton prints", img: siteMedia.fabric_ankara },
    { name: "Kente", desc: "Hand-woven silk & cotton strips", img: siteMedia.fabric_kente },
    { name: "Batik", desc: "Wax resist on fine cotton", img: siteMedia.fabric_batik },
    { name: "Mixed", desc: "Let our designers suggest", img: siteMedia.fabric_mixed },
  ];
  const styles = ["Maxi Gown","Midi Dress","Mini Dress","Skirt & Top Set","Jumpsuit","Peplum Top","Wrap Dress","Tailored Suit"];
  const occasions = ["Wedding Guest","Bridal","Corporate/Formal","Casual/Everyday","Cultural Event","Birthday","Red Carpet","Other"];

  return (
    <div className="min-h-screen pt-16 pb-20" style={{ fontFamily: "var(--font-body)" }}>
      <div className="bg-[#1A1A18] min-h-[280px] md:min-h-[360px] px-6 text-center relative overflow-hidden flex items-center justify-center">
        <ManagedImage src={siteMedia.custom_order_banner} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        <div className="relative z-10">
          <p className="text-[#B8922A] text-xs tracking-[0.3em] uppercase mb-2 font-semibold">Bespoke Service</p>
          <h1 className="text-white text-4xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Custom Made-to-Measure</h1>
          <p className="text-white/60 mt-2 text-sm">Your dream piece, crafted to your exact measurements. Ready in 2–4 weeks.</p>
        </div>
      </div>
      <KenteStripe />

      {/* Progress */}
      <div className="max-w-2xl mx-auto px-6 pt-10 pb-4">
        <div className="flex items-center gap-0">
          {["Style","Fabric","Measurements","Details"].map((s, i) => {
            const idx = i + 1;
            const done = step > idx; const active = step === idx;
            return (
              <div key={s} className="flex-1 flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${done ? "bg-[#C4562A] border-[#C4562A] text-white" : active ? "border-[#C4562A] text-[#C4562A]" : "border-border text-muted-foreground"}`}>
                    {done ? <Check size={14}/> : idx}
                  </div>
                  <span className={`text-xs mt-1.5 font-medium ${active ? "text-[#C4562A]" : "text-muted-foreground"}`}>{s}</span>
                </div>
                {i < 3 && <div className={`flex-1 h-0.5 mx-2 ${step > idx ? "bg-[#C4562A]" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6">
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-2 mt-6" style={{ fontFamily: "var(--font-display)" }}>Choose Your Style</h2>
            <p className="text-sm text-muted-foreground mb-6">What silhouette are you envisioning?</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {styles.map(s => (
                <button key={s} onClick={() => up("style", s)}
                  className={`p-3 rounded-xl border-2 text-sm font-semibold text-center transition-colors ${form.style === s ? "border-[#C4562A] bg-[#C4562A]/5 text-[#C4562A]" : "border-border hover:border-[#C4562A]"}`}>
                  {s}
                </button>
              ))}
            </div>
            <div className="mb-6">
              <p className="text-sm font-semibold mb-3">Occasion</p>
              <div className="flex flex-wrap gap-2">
                {occasions.map(o => (
                  <button key={o} onClick={() => up("occasion", o)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${form.occasion === o ? "bg-[#C4562A] text-white border-[#C4562A]" : "border-border hover:border-[#C4562A]"}`}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-8">
              <p className="text-sm font-semibold mb-2">Budget Range</p>
              <select value={form.budget} onChange={e => up("budget", e.target.value)}
                className="w-full border border-border rounded-lg px-4 py-3 text-sm bg-card focus:outline-none focus:border-[#C4562A]">
                <option value="">Select budget</option>
                <option>GH₵ 300–500</option><option>GH₵ 500–800</option>
                <option>GH₵ 800–1,200</option><option>GH₵ 1,200+</option>
              </select>
            </div>
            <button disabled={!form.style} onClick={() => setStep(2)}
              className="w-full bg-[#C4562A] disabled:opacity-40 hover:bg-[#A8411B] text-white py-3.5 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
              Next: Choose Fabric <ArrowRight size={16}/>
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold mb-2 mt-6" style={{ fontFamily: "var(--font-display)" }}>Select Your Fabric</h2>
            <p className="text-sm text-muted-foreground mb-6">Each fabric tells a different story.</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {fabrics.map(f => (
                <button key={f.name} onClick={() => up("fabric", f.name)}
                  className={`relative rounded-xl overflow-hidden border-2 transition-colors text-left ${form.fabric === f.name ? "border-[#C4562A]" : "border-transparent"}`}>
                  <ManagedImage src={f.img} alt={f.name} className="w-full h-32 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-3">
                    <p className="text-white font-bold text-sm">{f.name}</p>
                    <p className="text-white/70 text-xs">{f.desc}</p>
                  </div>
                  {form.fabric === f.name && <div className="absolute top-2 right-2 w-6 h-6 bg-[#C4562A] rounded-full flex items-center justify-center"><Check size={12} className="text-white"/></div>}
                </button>
              ))}
            </div>
            <div className="mb-8">
              <label className="block text-sm font-semibold mb-2">Reference Images / Inspiration</label>
              <label className="block border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-[#C4562A] transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="sr-only"
                  onChange={(event) => setReferenceFiles(Array.from(event.target.files ?? []).slice(0, 5))}
                />
                <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to choose reference files</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG or PDF · maximum 5 files</p>
              </label>
              {referenceFiles.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {referenceFiles.map((file) => <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>)}
                </ul>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 border border-border py-3.5 rounded-lg font-semibold text-sm hover:bg-muted transition-colors">Back</button>
              <button disabled={!form.fabric} onClick={() => setStep(3)} className="flex-1 bg-[#C4562A] disabled:opacity-40 hover:bg-[#A8411B] text-white py-3.5 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
                Next: Measurements <ArrowRight size={16}/>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold mb-2 mt-6" style={{ fontFamily: "var(--font-display)" }}>Your Measurements</h2>
            <p className="text-sm text-muted-foreground mb-6">All in centimetres (cm). Not sure? We can guide you via WhatsApp.</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[["bust","Bust / Chest"],["waist","Waist"],["hips","Hips"],["height","Full Height"]].map(([k,label]) => (
                <div key={k}>
                  <label className="block text-sm font-semibold mb-1.5">{label} <span className="text-muted-foreground font-normal">(cm)</span></label>
                  <input type="number" value={(form as Record<string,string>)[k]} onChange={e => up(k, e.target.value)}
                    placeholder="e.g. 90" className="w-full border border-border rounded-lg px-4 py-3 text-sm bg-card focus:outline-none focus:border-[#C4562A]" />
                </div>
              ))}
            </div>
            <div className="bg-[#F0EAE0] rounded-xl p-4 mb-6 flex gap-3 items-start">
              <MessageCircle size={16} className="text-[#B8922A] mt-0.5 shrink-0"/>
              <div>
                <p className="text-sm font-semibold text-[#1A1A18]">Need help with measurements?</p>
                <p className="text-xs text-muted-foreground mt-0.5">Our team can walk you through on WhatsApp. {whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noreferrer" className="text-[#C4562A] font-semibold hover:underline">Chat now →</a> : <span className="text-muted-foreground">Add a WhatsApp number in store settings.</span>}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 border border-border py-3.5 rounded-lg font-semibold text-sm hover:bg-muted transition-colors">Back</button>
              <button onClick={() => setStep(4)} className="flex-1 bg-[#C4562A] hover:bg-[#A8411B] text-white py-3.5 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
                Next: Your Details <ArrowRight size={16}/>
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold mb-2 mt-6" style={{ fontFamily: "var(--font-display)" }}>Your Details</h2>
            <p className="text-sm text-muted-foreground mb-6">We'll contact you within 24 hours to confirm your order.</p>
            <div className="space-y-4 mb-5">
              {[["name","Full Name","text"],["email","Email Address","email"],["phone","Phone / WhatsApp","tel"]].map(([k,label,type]) => (
                <div key={k}>
                  <label className="block text-sm font-semibold mb-1.5">{label}</label>
                  <input type={type} value={(form as Record<string,string>)[k]} onChange={e => up(k, e.target.value)}
                    className="w-full border border-border rounded-lg px-4 py-3 text-sm bg-card focus:outline-none focus:border-[#C4562A]" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-semibold mb-1.5">Additional Notes</label>
                <textarea value={form.notes} onChange={e => up("notes", e.target.value)} rows={3}
                  placeholder="Any specific design details, colour preferences, or special requests..."
                  className="w-full border border-border rounded-lg px-4 py-3 text-sm bg-card focus:outline-none focus:border-[#C4562A] resize-none" />
              </div>
            </div>
            {/* Summary */}
            <div className="bg-[#F0EAE0] rounded-xl p-5 mb-6">
              <p className="font-bold text-sm mb-3">Order Summary</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Style:</span><span className="font-medium">{form.style || "–"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fabric:</span><span className="font-medium">{form.fabric || "–"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Occasion:</span><span className="font-medium">{form.occasion || "–"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Budget:</span><span className="font-medium">{form.budget || "–"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Timeline:</span><span className="font-medium text-[#B8922A]">2–4 weeks</span></div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="flex-1 border border-border py-3.5 rounded-lg font-semibold text-sm hover:bg-muted transition-colors">Back</button>
              <button disabled={submitting || !form.name || !form.email || !form.phone} onClick={handleSubmit} className="flex-1 bg-[#C4562A] disabled:opacity-50 hover:bg-[#A8411B] text-white py-3.5 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
                {submitting ? (referenceFiles.length ? "Uploading & submitting…" : "Submitting…") : "Submit Order"} <Send size={15}/>
              </button>
            </div>
            {submitError && <p role="alert" className="text-sm text-red-600 mt-3">{submitError}</p>}
          </div>
        )}

        {step === 5 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={36} className="text-green-600" />
            </div>
            <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>Order Received!</h2>
            <p className="text-muted-foreground mb-2">Thank you, <strong>{form.name || "dear customer"}</strong>.</p>
            {submissionReference && <p className="text-sm font-semibold text-[#C4562A] mb-2">Reference {submissionReference}</p>}
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Our team will review your custom order and reach out within 24 hours via WhatsApp and email to confirm fabric availability and pricing.
            </p>
            <div className="mt-8 flex gap-3 justify-center">
              <button onClick={() => setStep(1)} className="border border-border px-6 py-3 rounded-lg text-sm font-semibold hover:bg-muted transition-colors">New Order</button>
              {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noreferrer" className="bg-[#C4562A] text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-[#A8411B] transition-colors flex items-center gap-2">
                <MessageCircle size={15}/> Chat on WhatsApp
              </a>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CART PAGE ─────────────────────────────────────────────────────────────
interface CartItem { product: Product; qty: number; size: string; }

function CartPage({ cartItems, setCartItems, setPage, promoCode, setPromoCode }:
  { cartItems: CartItem[]; setCartItems: (items: CartItem[]) => void; setPage: (p: string) => void; promoCode: string; setPromoCode: (code: string) => void }) {
  const [promo, setPromo] = useState("");
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  useEffect(() => {
    if (!cartItems.length) { setQuote(null); return; }
    let active = true;
    setQuoteLoading(true);
    setQuoteError("");
    getCheckoutQuote(cartItems.map((item) => ({ productId: item.product.id, quantity: item.qty, size: item.size })), promoCode)
      .then((nextQuote) => { if (active) setQuote(nextQuote); })
      .catch((error) => { if (active) setQuoteError(error instanceof Error ? error.message : "The order total could not be calculated."); })
      .finally(() => { if (active) setQuoteLoading(false); });
    return () => { active = false; };
  }, [cartItems, promoCode]);
  const subtotal = quote?.subtotal ?? 0;
  const discount = quote?.discountAmount ?? 0;
  const shipping = quote?.shippingFee ?? 0;
  const total = quote?.total ?? 0;

  const updateQty = (idx: number, qty: number) => {
    if (qty < 1) return;
    const next = [...cartItems]; next[idx].qty = qty; setCartItems(next);
  };
  const remove = (idx: number) => setCartItems(cartItems.filter((_, i) => i !== idx));

  return (
    <div className="min-h-screen pt-20 pb-16" style={{ fontFamily: "var(--font-body)" }}>
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: "var(--font-display)" }}>Your Cart <span className="text-muted-foreground text-xl font-normal">({cartItems.length})</span></h1>

        {cartItems.length === 0 ? (
          <div className="text-center py-24">
            <ShoppingCart size={48} className="mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>Your cart is empty</p>
            <p className="text-sm text-muted-foreground mb-6">Discover our beautiful collection of African print fashion.</p>
            <button onClick={() => setPage("shop")} className="bg-[#C4562A] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#A8411B] transition-colors">Shop Now</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item, idx) => (
                <div key={idx} className="bg-card rounded-xl p-5 flex gap-4 shadow-sm border border-border/40">
                  <img src={item.product.images[0]} alt={item.product.name}
                    className="w-24 h-28 rounded-lg object-cover bg-[#E8E2D9] shrink-0 cursor-pointer"
                    onClick={() => setPage(`product-${item.product.slug}`)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-[#B8922A] uppercase tracking-widest font-bold">{item.product.fabric}</p>
                        <p className="font-bold text-base mt-0.5" style={{ fontFamily: "var(--font-display)" }}>{item.product.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Size: {item.size || "M"}</p>
                      </div>
                      <button onClick={() => remove(idx)} className="text-muted-foreground hover:text-[#C4562A] transition-colors p-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-border rounded-lg overflow-hidden">
                        <button onClick={() => updateQty(idx, item.qty - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors"><Minus size={12}/></button>
                        <span className="w-10 text-center text-sm font-semibold">{item.qty}</span>
                        <button onClick={() => updateQty(idx, item.qty + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors"><Plus size={12}/></button>
                      </div>
                      <p className="font-bold text-[#C4562A]">{ghs(item.product.price * item.qty)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div>
              <div className="bg-card rounded-xl p-6 shadow-sm border border-border/40 sticky top-24">
                <h2 className="font-bold text-lg mb-5" style={{ fontFamily: "var(--font-display)" }}>Order Summary</h2>
                <div className="space-y-3 text-sm mb-5">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{ghs(subtotal)}</span></div>
                  {quote?.promoApplied && <div className="flex justify-between text-green-700"><span>Promotion</span><span>− {ghs(discount)}</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shipping === 0 ? "Free" : ghs(shipping)}</span></div>
                  <div className="border-t border-border pt-3 flex justify-between font-bold text-base"><span>Total</span><span className="text-[#C4562A]">{ghs(total)}</span></div>
                </div>
                {/* Promo */}
                <div className="flex gap-2 mb-5">
                  <input value={promo} onChange={e => setPromo(e.target.value)}
                    placeholder="Promo code" className="flex-1 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C4562A]" />
                  <button disabled={quoteLoading || !promo.trim()} onClick={() => setPromoCode(promo.trim().toUpperCase())}
                    className="bg-[#1A1A18] text-white text-sm font-semibold px-4 rounded-lg hover:bg-[#2A2A20] transition-colors">Apply</button>
                </div>
                {promoCode && quote?.promoMessage && <p className={`text-xs -mt-3 mb-4 ${quote.promoApplied ? "text-green-700" : "text-red-500"}`}>{quote.promoMessage}</p>}
                {quoteError && <p role="alert" className="text-xs text-red-600 mb-4">{quoteError}</p>}
                <button disabled={quoteLoading || !quote || Boolean(quoteError)} onClick={() => setPage("checkout")}
                  className="w-full bg-[#C4562A] hover:bg-[#A8411B] text-white py-3.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2">
                  {quoteLoading ? "Checking total…" : "Proceed to Checkout"} <ArrowRight size={16}/>
                </button>
                <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1">
                  <CreditCard size={12}/> Secure checkout · Mobile Money &amp; Card
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CHECKOUT PAGE ─────────────────────────────────────────────────────────
function CheckoutPage({ cartItems, setPage, session, onOrderPlaced, promoCode }:
  { cartItems: CartItem[]; setPage: (p: string) => void; session: Session; onOrderPlaced: () => void; promoCode: string }) {
  const profileName = String(session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? "").trim();
  const profileNameParts = profileName.split(/\s+/).filter(Boolean);
  const [step, setStep] = useState(1);
  const [placed, setPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressError, setAddressError] = useState("");
  const [addressMode, setAddressMode] = useState<"saved" | "new">("new");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [checkoutKey, setCheckoutKey] = useState(() => crypto.randomUUID());
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [shipping, setShipping] = useState({
    firstName: profileNameParts[0] ?? "", lastName: profileNameParts.slice(1).join(" "), email: session.user.email ?? "", phone: "",
    address: "", city: "", country: "Ghana",
  });
  const total = quote?.total ?? 0;

  const steps = ["Shipping", "Payment", "Review"];

  const updateShipping = (key: keyof typeof shipping, value: string) => {
    setShipping((current) => ({ ...current, [key]: value }));
  };

  const applySavedAddress = (address: SavedAddress) => {
    const names = address.recipientName.trim().split(/\s+/).filter(Boolean);
    setSelectedAddressId(address.id);
    setAddressMode("saved");
    setShipping((current) => ({
      ...current,
      firstName: names[0] ?? "",
      lastName: names.slice(1).join(" "),
      phone: address.phone,
      address: address.address,
      city: address.city,
      country: address.country,
    }));
  };

  useEffect(() => {
    let active = true;
    getSavedAddresses()
      .then((savedAddresses) => {
        if (!active) return;
        setAddresses(savedAddresses);
        const preferred = savedAddresses.find((address) => address.isDefault) ?? savedAddresses[0];
        if (preferred) applySavedAddress(preferred);
      })
      .catch((error) => { if (active) setAddressError(error instanceof Error ? error.message : "Saved addresses could not be loaded."); })
      .finally(() => { if (active) setAddressesLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!cartItems.length) { setQuoteLoading(false); return; }
    let active = true;
    setQuoteLoading(true);
    getCheckoutQuote(cartItems.map((item) => ({ productId: item.product.id, quantity: item.qty, size: item.size })), promoCode)
      .then((nextQuote) => { if (active) setQuote(nextQuote); })
      .catch((error) => { if (active) setOrderError(error instanceof Error ? error.message : "The checkout total could not be calculated."); })
      .finally(() => { if (active) setQuoteLoading(false); });
    return () => { active = false; };
  }, [cartItems, promoCode]);

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get("reference")
      ?? new URLSearchParams(window.location.search).get("trxref");
    if (!reference) return;
    let active = true;
    setVerifyingPayment(true);
    setOrderError("");
    verifyPaystackPayment(reference)
      .then((result) => {
        if (!active) return;
        if (!result.paid) throw new Error(`Payment is ${result.status}. Please complete payment or try again.`);
        setOrderNumber(result.orderNumber ?? "");
        onOrderPlaced();
        setPlaced(true);
        window.history.replaceState({}, "", "/checkout");
      })
      .catch((error) => { if (active) setOrderError(error instanceof Error ? error.message : "Payment verification failed."); })
      .finally(() => { if (active) setVerifyingPayment(false); });
    return () => { active = false; };
  }, []);

  const handleShippingContinue = async () => {
    if (addressMode === "saved") {
      setStep(2);
      return;
    }
    setSavingAddress(true);
    setAddressError("");
    try {
      const savedAddress = await addSavedAddress({
        recipientName: `${shipping.firstName} ${shipping.lastName}`.trim(),
        address: shipping.address,
        city: shipping.city,
        country: shipping.country,
        phone: shipping.phone,
        isDefault: addresses.length === 0,
      });
      setAddresses((current) => [savedAddress, ...current]);
      setSelectedAddressId(savedAddress.id);
      setAddressMode("saved");
      setStep(2);
    } catch (error) {
      setAddressError(error instanceof Error ? error.message : "The address could not be saved.");
    } finally {
      setSavingAddress(false);
    }
  };

  const handlePlaceOrder = async () => {
    setPlacingOrder(true);
    setOrderError("");
    try {
      const checkout = await initializePaystackCheckout({
        customer: {
          name: `${shipping.firstName} ${shipping.lastName}`.trim(),
          email: shipping.email,
          phone: shipping.phone,
          address: shipping.address,
          city: shipping.city,
          country: shipping.country,
        },
        items: cartItems.map((item) => ({
          productId: item.product.id,
          quantity: item.qty,
          size: item.size,
        })),
        promoCode,
        checkoutKey,
        callbackUrl: `${window.location.origin}/checkout`,
      });
      window.location.assign(checkout.authorizationUrl);
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : "We couldn't place your order. Please try again.");
      setCheckoutKey(crypto.randomUUID());
    } finally {
      setPlacingOrder(false);
    }
  };

  if (placed) return (
    <div className="min-h-screen pt-20 flex items-center justify-center" style={{ fontFamily: "var(--font-body)" }}>
      <div className="text-center px-6 max-w-md">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={36} className="text-green-600" />
        </div>
        <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>Order Placed!</h1>
        <p className="text-muted-foreground mb-1">Order {orderNumber} confirmed.</p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">Your Paystack payment was verified and your order is ready for processing.</p>
        <button onClick={() => setPage("account")} className="bg-[#C4562A] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#A8411B] transition-colors">Track My Order</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-20 pb-16" style={{ fontFamily: "var(--font-body)" }}>
      <div className="max-w-4xl mx-auto px-6 lg:px-10">
        <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: "var(--font-display)" }}>Checkout</h1>

        {/* Steps */}
        <div className="flex items-center mb-10">
          {steps.map((s, i) => {
            const idx = i+1; const done = step > idx; const active = step === idx;
            return (
              <div key={s} className="flex-1 flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${done ? "bg-[#C4562A] border-[#C4562A] text-white" : active ? "border-[#C4562A] text-[#C4562A]" : "border-border text-muted-foreground"}`}>
                    {done ? <Check size={12}/> : idx}
                  </div>
                  <span className={`text-xs mt-1 font-medium ${active ? "text-[#C4562A]" : "text-muted-foreground"}`}>{s}</span>
                </div>
                {i < 2 && <div className={`flex-1 h-0.5 mx-2 ${step > idx ? "bg-[#C4562A]" : "bg-border"}`}/>}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {step === 1 && (
              <div className="bg-card rounded-xl p-6 border border-border/40 shadow-sm">
                <h2 className="font-bold text-lg mb-5" style={{ fontFamily: "var(--font-display)" }}>Shipping Details</h2>
                {addressesLoading ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Loading saved addresses…</p>
                ) : (
                  <>
                    {addresses.length > 0 && (
                      <div className="space-y-3 mb-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saved addresses</p>
                        {addresses.map((address) => (
                          <label key={address.id} className={`block cursor-pointer rounded-xl border-2 p-4 transition-colors ${addressMode === "saved" && selectedAddressId === address.id ? "border-[#C4562A] bg-[#C4562A]/5" : "border-border hover:border-[#C4562A]/40"}`}>
                            <input type="radio" name="shipping-address" className="sr-only" checked={addressMode === "saved" && selectedAddressId === address.id} onChange={() => applySavedAddress(address)} />
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-sm">{address.recipientName}</p>
                                <p className="text-sm text-muted-foreground mt-1">{address.address}</p>
                                <p className="text-sm text-muted-foreground">{address.city}, {address.country}</p>
                                {address.phone && <p className="text-xs text-muted-foreground mt-1">{address.phone}</p>}
                              </div>
                              {address.isDefault && <span className="text-[10px] font-bold uppercase text-[#C4562A]">Default</span>}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}

                    <button type="button" onClick={() => {
                      setAddressMode("new");
                      setSelectedAddressId("");
                      setShipping((current) => ({ ...current, phone: "", address: "", city: "", country: "Ghana" }));
                    }} className={`w-full border-2 border-dashed rounded-xl p-4 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${addressMode === "new" ? "border-[#C4562A] text-[#C4562A]" : "border-border text-muted-foreground hover:border-[#C4562A]"}`}>
                      <Plus size={16}/> Add a new address
                    </button>

                    {addressMode === "new" && (
                      <div className="grid grid-cols-2 gap-4 mt-5">
                        {[["firstName","First Name","text"],["lastName","Last Name","text"],["email","Email","email"],["phone","Phone","tel"]].map(([key,label,type]) => (
                          <div key={key}>
                            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">{label}</label>
                            <input required type={type} value={shipping[key as keyof typeof shipping]} onChange={(event) => updateShipping(key as keyof typeof shipping, event.target.value)} className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C4562A]" />
                          </div>
                        ))}
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">Address</label>
                          <input required type="text" value={shipping.address} onChange={(event) => updateShipping("address", event.target.value)} className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C4562A]" />
                        </div>
                        {[["city","City","text"],["country","Country","text"]].map(([key,label,type]) => (
                          <div key={key}>
                            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">{label}</label>
                            <input required type={type} value={shipping[key as keyof typeof shipping]} onChange={(event) => updateShipping(key as keyof typeof shipping, event.target.value)} className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C4562A]" />
                          </div>
                        ))}
                        <p className="col-span-2 text-xs text-muted-foreground">This address will be saved to your account.</p>
                      </div>
                    )}

                    {addressMode === "saved" && (
                      <div className="grid grid-cols-2 gap-4 mt-5">
                        <div>
                          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">Email</label>
                          <input type="email" value={shipping.email} onChange={(event) => updateShipping("email", event.target.value)} className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C4562A]" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">Phone</label>
                          <input type="tel" value={shipping.phone} onChange={(event) => updateShipping("phone", event.target.value)} className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C4562A]" />
                        </div>
                      </div>
                    )}
                  </>
                )}
                {addressError && <p role="alert" className="mt-4 text-sm text-red-600">{addressError}</p>}
                <button disabled={addressesLoading || savingAddress || !shipping.firstName || !shipping.email || !shipping.phone || !shipping.address || !shipping.city} onClick={() => void handleShippingContinue()} className="mt-6 w-full bg-[#C4562A] disabled:opacity-50 text-white py-3.5 rounded-lg font-bold hover:bg-[#A8411B] transition-colors flex items-center justify-center gap-2">
                  {savingAddress ? "Saving address…" : "Continue to Payment"} <ArrowRight size={16}/>
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="bg-card rounded-xl p-6 border border-border/40 shadow-sm">
                <h2 className="font-bold text-lg mb-5" style={{ fontFamily: "var(--font-display)" }}>Secure Paystack Checkout</h2>
                <div className="rounded-xl border border-border bg-muted/30 p-5 mb-6 flex gap-4">
                  <div className="w-10 h-10 bg-[#C4562A]/10 rounded-lg flex items-center justify-center shrink-0"><CreditCard size={19} className="text-[#C4562A]"/></div>
                  <div><p className="font-semibold text-sm">Mobile Money and international cards</p><p className="text-xs text-muted-foreground mt-1 leading-relaxed">After reviewing your order, Paystack will securely collect and verify your payment. Aunty Sala Fashion Gh never receives your card number or CVV.</p></div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 border border-border py-3.5 rounded-lg font-semibold text-sm hover:bg-muted transition-colors">Back</button>
                  <button onClick={() => setStep(3)} className="flex-1 bg-[#C4562A] text-white py-3.5 rounded-lg font-bold hover:bg-[#A8411B] transition-colors flex items-center justify-center gap-2">
                    Review Order <ArrowRight size={16}/>
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="bg-card rounded-xl p-6 border border-border/40 shadow-sm">
                <h2 className="font-bold text-lg mb-5" style={{ fontFamily: "var(--font-display)" }}>Review &amp; Place Order</h2>
                <div className="space-y-3 mb-5">
                  {cartItems.map((item, i) => (
                    <div key={i} className="flex gap-3 items-center">
                      <img src={item.product.images[0]} alt={item.product.name} className="w-14 h-16 rounded-lg object-cover bg-[#E8E2D9]" />
                      <div className="flex-1">
                        <p className="font-semibold text-sm" style={{ fontFamily: "var(--font-display)" }}>{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.qty} · Size: {item.size || "M"}</p>
                      </div>
                      <p className="font-bold text-sm text-[#C4562A]">{ghs(item.product.price * item.qty)}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-4 flex justify-between font-bold mb-6">
                  <span>Total</span><span className="text-[#C4562A]">{ghs(total)}</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="flex-1 border border-border py-3.5 rounded-lg font-semibold text-sm hover:bg-muted transition-colors">Back</button>
                  <button disabled={placingOrder || verifyingPayment || quoteLoading || !quote || cartItems.length === 0} onClick={handlePlaceOrder} className="flex-1 bg-[#C4562A] disabled:opacity-50 text-white py-3.5 rounded-lg font-bold hover:bg-[#A8411B] transition-colors">{placingOrder ? "Opening Paystack…" : verifyingPayment ? "Verifying…" : "Pay with Paystack"}</button>
                </div>
                {orderError && <p role="alert" className="text-sm text-red-600 mt-3">{orderError}</p>}
              </div>
            )}
          </div>

          {/* Mini summary */}
          <div className="bg-card rounded-xl p-5 border border-border/40 shadow-sm h-fit">
            <h3 className="font-bold text-sm mb-4">Order Items</h3>
            {cartItems.map((item, i) => (
              <div key={i} className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground truncate max-w-[140px]">{item.product.name} ×{item.qty}</span>
                <span className="font-semibold shrink-0 ml-2">{ghs(item.product.price * item.qty)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-3 mt-2 flex justify-between font-bold text-[#C4562A]">
              <span>Total</span><span>{ghs(total)}</span>
            </div>
            {quote?.discountAmount ? <p className="mt-2 text-xs text-green-700">Promotion saved you {ghs(quote.discountAmount)}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ACCOUNT PAGE ──────────────────────────────────────────────────────────
function PasswordRecoveryPage({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (!supabase) throw new Error("Supabase is not configured yet.");
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      onComplete();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "We couldn't update your password. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F3ECE2] px-4 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5 rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A18]" style={{ fontFamily: "var(--font-display)" }}>Set a new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">Choose a password to secure your account.</p>
        </div>
        <label htmlFor="recovery-password" className="block">
          <span className="mb-2 block text-sm font-semibold">New password</span>
          <input id="recovery-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:border-[#C4562A] focus:outline-none focus:ring-4 focus:ring-[#C4562A]/10" />
        </label>
        <label htmlFor="recovery-password-confirm" className="block">
          <span className="mb-2 block text-sm font-semibold">Confirm password</span>
          <input id="recovery-password-confirm" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:border-[#C4562A] focus:outline-none focus:ring-4 focus:ring-[#C4562A]/10" />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={saving || !isSupabaseConfigured} className="w-full rounded-xl bg-[#C4562A] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#A8411B] disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? "Updating password…" : "Update password"}
        </button>
      </form>
    </main>
  );
}

function LoginPage({ redirectPath = "/account", context = "customer" }: { redirectPath?: string; context?: "customer" | "admin" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "reset">("sign-in");

  const redirectTo = `${window.location.origin}${redirectPath}`;

  const handleGoogleLogin = async () => {
    setError("");
    if (!supabase) {
      setError("Supabase is not configured yet.");
      return;
    }
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (authError) setError(authError.message);
  };

  const handleEmailPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setError("");
    setMessage("");
    try {
      if (!supabase) throw new Error("Supabase is not configured yet.");
      if (mode === "reset") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${redirectTo}?passwordRecovery=1`,
        });
        if (authError) throw authError;
        setMessage("If an account exists for this email, a password-reset link has been sent.");
      } else if (mode === "sign-up") {
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (authError) throw authError;
        setPassword("");
        setMessage("Check your email to confirm your account, then sign in with your password.");
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const isAdminLogin = context === "admin";
  const isResetMode = mode === "reset";
  const isSignUpMode = mode === "sign-up";

  return (
    <div className={`relative flex min-h-screen items-start justify-center overflow-y-auto px-4 py-6 sm:px-6 ${isAdminLogin ? "bg-[#2B2822]" : "fixed inset-0 z-[80] bg-transparent"}`} style={{ fontFamily: "var(--font-body)" }}>
      {!isAdminLogin ? <>
        <img src="/aunty-sala-hero-elegant.webp" alt="" aria-hidden="true" className="pointer-events-none fixed inset-0 h-full w-full scale-105 object-cover object-center" />
        <div className="pointer-events-none fixed inset-0 bg-[#141311]/65 backdrop-blur-[6px]" />
        <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-black/25 via-transparent to-[#C4562A]/15" />
        <a href="/" aria-label="Close sign in and return to the store" className="fixed right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:right-6 sm:top-6"><X size={19} /></a>
      </> : null}
      <div className="pointer-events-none fixed -left-24 top-1/4 h-72 w-72 rounded-full bg-[#C4562A]/15 blur-3xl" />
      <div className="pointer-events-none fixed -right-20 bottom-0 h-80 w-80 rounded-full bg-[#B8922A]/15 blur-3xl" />

      <div className="relative z-10 my-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/40 bg-card shadow-[0_30px_90px_rgba(0,0,0,0.35)] lg:min-h-[700px] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden bg-[#1A1A18] lg:flex lg:flex-col lg:justify-between" aria-label="Aunty Sala Fashion Gh">
          <img src="/aunty-sala-hero-elegant.webp" alt="Model wearing an Aunty Sala African print dress" className="absolute inset-0 h-full w-full object-cover object-center" />
          <div className={`absolute inset-0 bg-gradient-to-b ${isAdminLogin ? "from-black/10 via-black/5 to-black/65" : "from-black/20 via-black/10 to-black/85"}`} />
          <div className={`absolute inset-0 bg-gradient-to-r ${isAdminLogin ? "from-black/15 via-transparent to-black/5" : "from-black/25 via-transparent to-black/15"}`} />

          <div className="relative flex items-center gap-3 p-8">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-black/25 backdrop-blur-md"><img src="/aunty-sala-logo.png" alt="" className="h-11 w-auto object-contain" /></span>
            <div><p className="font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Aunty Sala Fashion Gh</p><p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.24em] text-[#E0BD5B]">Everything fashionable</p></div>
          </div>

          <div className="relative p-8 xl:p-10">
            <span className="mb-4 inline-flex rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#E0BD5B] backdrop-blur-md">{isAdminLogin ? "Private workspace" : "Made in Accra"}</span>
            <h2 className="max-w-lg text-4xl font-bold leading-[1.08] text-white xl:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
              {isAdminLogin ? "Your store, beautifully managed." : "Your style journey continues here."}
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/65">
              {isAdminLogin ? "Access orders, customers, tailoring and storefront tools from one secure workspace." : "Return to your saved pieces, custom measurements and every order made with care."}
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              {(isAdminLogin ? ["Secure staff access", "Live store data", "Protected workspace"] : ["Saved wishlist", "Order tracking", "Custom measurements"]).map((item) => <span key={item} className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[10px] font-semibold text-white/80 backdrop-blur-md"><Check size={11} className="text-[#E0BD5B]" />{item}</span>)}
            </div>
          </div>
        </section>

        <section className="relative flex items-center bg-[#FCFAF7] px-5 py-8 sm:px-10 sm:py-12 lg:px-12 xl:px-14">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-3"><img src="/aunty-sala-logo.png" alt="Aunty Sala Fashion Gh" className="h-12 w-auto object-contain" /><div><p className="text-sm font-bold" style={{ fontFamily: "var(--font-display)" }}>Aunty Sala</p><p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#B8922A]">Fashion Gh</p></div></div>
              <span className="rounded-full bg-[#C4562A]/8 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#C4562A]">{isAdminLogin ? "Admin" : "Account"}</span>
            </div>

            <div className="mb-7">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#B8922A]/20 bg-[#B8922A]/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A6E1E]"><User size={12} />{isAdminLogin ? "Authorized team members" : "Your personal account"}</div>
              <h1 className="text-3xl font-bold leading-tight text-[#1A1A18] sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>{isResetMode ? "Reset your password" : isSignUpMode ? "Create your account" : isAdminLogin ? "Welcome to the studio" : "Welcome back"}</h1>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{isResetMode ? "Enter your email and we’ll send you a link to choose a new password." : isSignUpMode ? "Create an account to save your details and track your orders." : isAdminLogin ? "Sign in with your approved staff email to continue to the admin portal." : "Sign in to continue shopping and manage your Aunty Sala experience."}</p>
            </div>

            {!isResetMode && <>
              <button type="button" onClick={handleGoogleLogin} disabled={!isSupabaseConfigured}
                className="group flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-sm font-bold text-[#1A1A18] shadow-[0_4px_14px_rgba(26,26,24,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#C4562A]/35 hover:shadow-[0_8px_22px_rgba(26,26,24,0.08)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#C4562A]/10 disabled:cursor-not-allowed disabled:opacity-50">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-white text-sm font-black text-[#4285F4] shadow-sm">G</span>
                Continue with Google
              </button>
              <div className="my-6 flex items-center gap-3" aria-hidden="true"><div className="h-px flex-1 bg-border" /><span className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">or continue with email</span><div className="h-px flex-1 bg-border" /></div>
            </>}

            <form onSubmit={handleEmailPassword} className="space-y-4">
              <label htmlFor="login-email" className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Email address</span><div className="relative"><Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" /><input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="min-h-12 w-full rounded-xl border border-border bg-white py-3 pl-11 pr-4 text-sm transition-all placeholder:text-muted-foreground/45 focus:border-[#C4562A] focus:outline-none focus:ring-4 focus:ring-[#C4562A]/8" /></div></label>
              {!isResetMode && <label htmlFor="login-password" className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Password</span><input id="login-password" type="password" autoComplete={isSignUpMode ? "new-password" : "current-password"} minLength={isSignUpMode ? 8 : undefined} required value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm transition-all focus:border-[#C4562A] focus:outline-none focus:ring-4 focus:ring-[#C4562A]/8" /></label>}
              {mode === "sign-in" && <div className="text-right"><button type="button" onClick={() => { setMode("reset"); setMessage(""); setError(""); }} className="text-xs font-semibold text-[#C4562A] hover:underline">Forgot password?</button></div>}
              <button type="submit" disabled={sending || !isSupabaseConfigured}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#C4562A] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(196,86,42,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#A8411B] hover:shadow-[0_14px_28px_rgba(196,86,42,0.26)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#C4562A]/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0">
                <Mail size={15} /> {sending ? "Please wait…" : isResetMode ? "Send reset link" : isSignUpMode ? "Create account" : "Sign in"}
              </button>
            </form>

            {!isAdminLogin && <p className="mt-5 text-center text-sm text-muted-foreground">
              {isResetMode ? "Remembered your password?" : isSignUpMode ? "Already have an account?" : "New to Aunty Sala?"}{" "}
              <button type="button" onClick={() => { setMode(isResetMode || isSignUpMode ? "sign-in" : "sign-up"); setMessage(""); setError(""); }} className="font-semibold text-[#C4562A] hover:underline">
                {isResetMode || isSignUpMode ? "Sign in" : "Create an account"}
              </button>
            </p>}

            {message ? <p role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle size={17} className="mt-0.5 shrink-0" />{message}</p> : null}
            {error ? <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</p> : null}

            {!isResetMode && <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-[#F3ECE2]/70 p-3 text-[11px] leading-relaxed text-muted-foreground"><CheckCircle size={15} className="mt-0.5 shrink-0 text-[#7A8C6E]" /><p>Use a unique password you don’t use on other sites. You can reset it by email if you forget it.</p></div>}
            <p className="mt-6 text-center text-[10px] leading-relaxed text-muted-foreground">By continuing, you agree to our <a href={isAdminLogin ? `${STORE_ORIGIN}/terms-of-service` : "/terms-of-service"} className="font-semibold text-[#C4562A] hover:underline">Terms of Service</a> and <a href={isAdminLogin ? `${STORE_ORIGIN}/privacy-policy` : "/privacy-policy"} className="font-semibold text-[#C4562A] hover:underline">Privacy Policy</a>.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function AccountPage({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const [tab, setTab] = useState("orders");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [accountError, setAccountError] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [accountSaving, setAccountSaving] = useState(false);
  const [customPaymentLoadingId, setCustomPaymentLoadingId] = useState<string | null>(null);
  const [customPaymentVerifying, setCustomPaymentVerifying] = useState(false);
  const [editingMeasurements, setEditingMeasurements] = useState(false);
  const [measurementForm, setMeasurementForm] = useState({ bust: "", waist: "", hips: "", height: "", shoulderWidth: "", armLength: "" });
  const [editingAddress, setEditingAddress] = useState<SavedAddress | "new" | null>(null);
  const [addressForm, setAddressForm] = useState({ recipientName: "", address: "", city: "", country: "Ghana", phone: "", isDefault: false });
  const displayName = session.user.user_metadata.full_name
    || session.user.user_metadata.name
    || session.user.email?.split("@")[0]
    || "Customer";
  const joinedDate = new Intl.DateTimeFormat("en-GH", { month: "short", year: "numeric" }).format(new Date(session.user.created_at));
  const refreshAccount = async () => setAccountData(await getAccountData());
  useEffect(() => {
    refreshAccount().catch((error) => setAccountError(error instanceof Error ? error.message : "Unable to load your account."));
  }, [session.user.id]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");
    if (!reference?.startsWith("ASFC-")) return;
    setCustomPaymentVerifying(true);
    setAccountError("");
    verifyCustomOrderPayment(reference)
      .then(async (result) => {
        if (!result.paid) throw new Error(`Payment is ${result.status}. If you completed it, wait a moment and refresh.`);
        await refreshAccount();
        setAccountMessage(`Payment verified for ${result.customOrderReference ?? "your custom order"}.`);
      })
      .catch((error) => setAccountError(error instanceof Error ? error.message : "Custom payment verification failed."))
      .finally(() => {
        setCustomPaymentVerifying(false);
        window.history.replaceState({}, "", "/account");
      });
  }, [session.user.id]);
  const orders = accountData?.orders ?? [];
  const statusSteps = ["Created","Paid","Processing","Shipped","Delivered"];
  const customStatusSteps = ["Submitted", "Reviewing", "Quoted", "In Production", "Ready", "Completed"];
  const beginMeasurementEdit = () => {
    const byLabel = new Map((accountData?.measurements ?? []).map((item) => [item.label, item.value.replace(/[^0-9.]/g, "")]));
    setMeasurementForm({
      bust: byLabel.get("Bust") ?? "", waist: byLabel.get("Waist") ?? "", hips: byLabel.get("Hips") ?? "",
      height: byLabel.get("Full Height") ?? "", shoulderWidth: byLabel.get("Shoulder Width") ?? "", armLength: byLabel.get("Arm Length") ?? "",
    });
    setEditingMeasurements(true);
    setAccountMessage("");
  };
  const handleMeasurementSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccountSaving(true); setAccountError(""); setAccountMessage("");
    try {
      const numberOrUndefined = (value: string) => value ? Number(value) : undefined;
      await saveMeasurements({
        bust: numberOrUndefined(measurementForm.bust), waist: numberOrUndefined(measurementForm.waist),
        hips: numberOrUndefined(measurementForm.hips), height: numberOrUndefined(measurementForm.height),
        shoulderWidth: numberOrUndefined(measurementForm.shoulderWidth), armLength: numberOrUndefined(measurementForm.armLength),
      });
      await refreshAccount(); setEditingMeasurements(false); setAccountMessage("Measurements saved.");
    } catch (error) { setAccountError(error instanceof Error ? error.message : "Measurements could not be saved."); }
    finally { setAccountSaving(false); }
  };
  const beginAddressEdit = (address?: SavedAddress) => {
    setEditingAddress(address ?? "new");
    setAddressForm(address ? { recipientName: address.recipientName, address: address.address, city: address.city, country: address.country, phone: address.phone, isDefault: address.isDefault }
      : { recipientName: displayName, address: "", city: "", country: "Ghana", phone: "", isDefault: (accountData?.addresses.length ?? 0) === 0 });
    setAccountMessage("");
  };
  const handleAddressSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccountSaving(true); setAccountError(""); setAccountMessage("");
    try {
      if (editingAddress === "new") await addSavedAddress(addressForm);
      else if (editingAddress) await updateSavedAddress({ id: editingAddress.id, ...addressForm });
      await refreshAccount(); setEditingAddress(null); setAccountMessage("Address saved.");
    } catch (error) { setAccountError(error instanceof Error ? error.message : "The address could not be saved."); }
    finally { setAccountSaving(false); }
  };
  const handleCustomPayment = async (customOrderId: string) => {
    setCustomPaymentLoadingId(customOrderId);
    setAccountError("");
    setAccountMessage("");
    try {
      const payment = await initializeCustomOrderPayment(customOrderId, `${window.location.origin}/account`);
      window.location.assign(payment.authorizationUrl);
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "The custom payment could not be started.");
      setCustomPaymentLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16" style={{ fontFamily: "var(--font-body)" }}>
      <div className="max-w-5xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-[#C4562A] rounded-full flex items-center justify-center">
            <User size={24} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold capitalize" style={{ fontFamily: "var(--font-display)" }}>{displayName}</h1>
            <p className="text-sm text-muted-foreground">{session.user.email} · Member since {joinedDate}</p>
          </div>
          <button onClick={onSignOut} className="border border-border rounded-lg px-4 py-2 text-sm font-semibold hover:border-[#C4562A] hover:text-[#C4562A] transition-colors flex items-center gap-2">
            <LogOut size={14} /> Sign out
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-border mb-8">
          {[["orders","Orders"],["measurements","Measurements"],["wishlist","Wishlist"],["addresses","Addresses"]].map(([k,label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`text-sm font-semibold pb-3 border-b-2 transition-colors ${tab === k ? "border-[#C4562A] text-[#C4562A]" : "border-transparent text-muted-foreground hover:text-[#1A1A18]"}`}>
              {label}
            </button>
          ))}
        </div>

        {accountError && <p role="alert" className="mb-6 rounded-lg bg-red-50 text-red-600 p-4 text-sm">{accountError}</p>}
        {accountMessage && <p role="status" className="mb-6 rounded-lg bg-green-50 text-green-700 p-4 text-sm">{accountMessage}</p>}
        {customPaymentVerifying && <p role="status" className="mb-6 rounded-lg bg-amber-50 text-amber-800 p-4 text-sm">Verifying your custom-order payment…</p>}
        {!accountData && !accountError && <FashionLoader compact label="Preparing your account…" />}

        {accountData && tab === "orders" && (
          <div className="space-y-4">
            {orders.length === 0 && <p className="py-12 text-center text-muted-foreground">You have no orders yet.</p>}
            {orders.map(o => {
              const expanded = expandedOrderId === o.id;
              const customProgressStatus = ["Measuring", "Cutting", "Sewing", "Fitting"].includes(o.status) ? "In Production" : o.status;
              const progressSteps = o.isCustom ? customStatusSteps : statusSteps;
              const stepIdx = o.status === "Cancelled" ? 0 : progressSteps.indexOf(customProgressStatus);
              const custom = o.customDetails;
              const quotedTotal = custom?.quotedPrice ?? 0;
              const paidAmount = custom?.amountPaid ?? 0;
              const balance = Math.max(quotedTotal - paidAmount, 0);
              const isDepositDue = custom?.paymentPlan === "deposit" && paidAmount === 0;
              const nextPayment = isDepositDue
                ? Math.round(quotedTotal * (custom?.depositPercentage ?? 0)) / 100
                : balance;
              const canPayCustom = Boolean(
                custom
                && quotedTotal > 0
                && balance > 0
                && ["sent", "accepted"].includes(custom.quoteStatus)
                && custom.paymentStatus !== "paid",
              );
              return (
                <div key={o.id} className="bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden">
                  <button type="button" onClick={() => setExpandedOrderId(expanded ? null : o.id)} aria-expanded={expanded} aria-controls={`order-${o.id}`}
                    className="w-full p-5 md:p-6 flex flex-wrap items-center justify-between gap-4 text-left hover:bg-muted/30 transition-colors">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-sm font-mono">{o.id}</p>
                        {o.isCustom && <span className="rounded-full bg-[#B8922A]/15 text-[#7A5D10] px-2 py-0.5 text-[9px] font-bold tracking-wider">CUSTOM ORDER</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{o.date} · {o.isCustom ? o.items : `${o.itemDetails.length} ${o.itemDetails.length === 1 ? "item" : "items"}`}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-auto">
                      <span className={`font-bold ${o.amount == null ? "text-xs text-muted-foreground" : "text-[#C4562A]"}`}>{o.amount == null ? "Quote pending" : ghs(o.amount)}</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${o.status === "Cancelled" ? statusColor.Cancelled : o.isCustom ? "bg-[#B8922A]/15 text-[#7A5D10]" : statusColor[o.status] || "bg-gray-50 text-gray-600"}`}>{o.status}</span>
                      <ChevronDown size={18} className={`text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </div>
                  </button>
                  {expanded && (
                    <div id={`order-${o.id}`} className="border-t border-border/60 p-5 md:p-6">
                      {o.isCustom && o.customDetails ? (
                        <div className="mb-6">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Custom order details</h3>
                          <div className="rounded-xl border border-border overflow-hidden bg-background">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border">
                              {[
                                ["Style", o.customDetails.style], ["Fabric", o.customDetails.fabric],
                                ["Occasion", o.customDetails.occasion], ["Budget", o.customDetails.budget],
                                ["Due date", o.customDetails.dueDate],
                              ].filter(([, value]) => value).map(([label, value]) => (
                                <div key={label} className="bg-background p-4">
                                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">{label}</p>
                                  <p className="text-sm font-semibold">{value}</p>
                                </div>
                              ))}
                            </div>
                            {o.customDetails.measurements.length > 0 && <div className="border-t border-border p-4">
                              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Submitted measurements</p>
                              <div className="flex flex-wrap gap-2">{o.customDetails.measurements.map((measurement) => <span key={measurement.label} className="rounded-lg bg-[#F0EAE0] px-3 py-2 text-xs"><strong>{measurement.label}:</strong> {measurement.value}</span>)}</div>
                            </div>}
                            {o.customDetails.notes && <div className="border-t border-border p-4"><p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Notes</p><p className="text-sm text-muted-foreground leading-relaxed">{o.customDetails.notes}</p></div>}
                          </div>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Order items</h3>
                          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden mb-6">
                            {o.itemDetails.map((item, index) => (
                              <div key={`${item.name}-${index}`} className="p-4 flex items-start justify-between gap-4 bg-background">
                                <div>
                                  <p className="font-semibold text-sm">{item.name}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Quantity: {item.quantity}{item.size ? ` · Size: ${item.size}` : ""}{item.color ? ` · Colour: ${item.color}` : ""}
                                  </p>
                                </div>
                                <p className="font-bold text-sm shrink-0">{ghs(item.unitPrice * item.quantity)}</p>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      {o.isCustom && custom && (
                        <div className="mb-6 rounded-xl border border-[#C4562A]/25 bg-[#FFF8F3] p-4 md:p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="text-xs font-bold uppercase tracking-wider text-[#9B3F1D]">Quote &amp; payment</h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {custom.quoteStatus === "pending"
                                  ? "Our team is reviewing your request. Your quote will appear here when it is ready."
                                  : custom.paymentStatus === "paid"
                                    ? "Your custom order is fully paid."
                                    : isDepositDue
                                      ? `${custom.depositPercentage}% deposit is due to begin production.`
                                      : paidAmount > 0
                                        ? "Your remaining balance is ready for payment."
                                        : "Pay the full quote to begin production."}
                              </p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${custom.paymentStatus === "paid" ? "bg-green-100 text-green-700" : custom.paymentStatus === "partially_paid" ? "bg-amber-100 text-amber-800" : "bg-white text-muted-foreground border border-border"}`}>
                              {custom.paymentStatus.replace("_", " ")}
                            </span>
                          </div>
                          {quotedTotal > 0 && (
                            <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-white p-3 border border-border/60">
                              <div><p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Quote</p><p className="mt-1 text-sm font-bold">{ghs(quotedTotal)}</p></div>
                              <div><p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Paid</p><p className="mt-1 text-sm font-bold text-green-700">{ghs(paidAmount)}</p></div>
                              <div><p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Balance</p><p className="mt-1 text-sm font-bold text-[#C4562A]">{ghs(balance)}</p></div>
                            </div>
                          )}
                          {canPayCustom && (
                            <button
                              type="button"
                              disabled={customPaymentLoadingId === custom.customOrderId || customPaymentVerifying}
                              onClick={() => handleCustomPayment(custom.customOrderId)}
                              className="mt-4 w-full rounded-lg bg-[#1A1A18] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#C4562A] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {customPaymentLoadingId === custom.customOrderId
                                ? "Opening secure payment…"
                                : `Pay ${isDepositDue ? "deposit" : paidAmount > 0 ? "balance" : "quote"} — ${ghs(nextPayment)}`}
                            </button>
                          )}
                        </div>
                      )}
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">{o.isCustom ? "Custom order status" : "Order status"}</h3>
                      <div className="flex items-center overflow-x-auto pb-1">
                        {progressSteps.map((status, index) => {
                          const done = index <= stepIdx;
                          return (
                            <div key={status} className="flex items-center shrink-0">
                              <div className="flex flex-col items-center">
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${done ? "bg-[#C4562A] border-[#C4562A]" : "border-border"}`}>
                                  {done && <Check size={12} className="text-white"/>}
                                </div>
                                <span className={`text-[10px] mt-1 font-medium whitespace-nowrap ${done ? "text-[#C4562A]" : "text-muted-foreground"}`}>{status}</span>
                              </div>
                              {index < progressSteps.length - 1 && (
                                <div className={`w-12 h-0.5 mx-1 ${index < stepIdx ? "bg-[#C4562A]" : "bg-border"}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {accountData && tab === "measurements" && (
          <div className="bg-card rounded-xl p-6 border border-border/40 shadow-sm max-w-lg">
            <h2 className="font-bold text-lg mb-5" style={{ fontFamily: "var(--font-display)" }}>Saved Measurements</h2>
            <div className="grid grid-cols-2 gap-4">
              {accountData.measurements.map((measurement) => (
                <div key={measurement.label} className="bg-[#F0EAE0] rounded-lg p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">{measurement.label}</p>
                  <p className="font-bold text-lg">{measurement.value}</p>
                </div>
              ))}
            </div>
            {accountData.measurements.length === 0 && <p className="text-sm text-muted-foreground">No measurements saved.</p>}
            <button onClick={beginMeasurementEdit} className="mt-5 w-full border border-border py-3 rounded-lg text-sm font-semibold hover:border-[#C4562A] hover:text-[#C4562A] transition-colors flex items-center justify-center gap-2">
              <Edit size={14}/> Update Measurements
            </button>
            {editingMeasurements && <form onSubmit={handleMeasurementSave} className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-5">
              {([['bust','Bust'],['waist','Waist'],['hips','Hips'],['height','Full Height'],['shoulderWidth','Shoulder Width'],['armLength','Arm Length']] as const).map(([key, label]) => <div key={key}>
                <label className="block text-xs font-semibold mb-1 text-muted-foreground">{label} (cm)</label>
                <input type="number" min="1" step="0.1" value={measurementForm[key]} onChange={(event) => setMeasurementForm((current) => ({ ...current, [key]: event.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
              </div>)}
              <div className="col-span-2 flex gap-2"><button type="button" onClick={() => setEditingMeasurements(false)} className="flex-1 border border-border rounded-lg py-2 text-sm font-semibold">Cancel</button><button disabled={accountSaving} type="submit" className="flex-1 bg-[#C4562A] text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50">{accountSaving ? "Saving…" : "Save"}</button></div>
            </form>}
          </div>
        )}

        {accountData && tab === "wishlist" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {accountData.wishlist.map(p => (
              <div key={p.id} className="bg-card rounded-xl overflow-hidden border border-border/40 shadow-sm group">
                <div className="overflow-hidden bg-[#E8E2D9]" style={{ aspectRatio: "3/4" }}>
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-3">
                  <p className="text-xs text-[#B8922A] uppercase tracking-widest font-bold">{p.fabric}</p>
                  <p className="font-bold text-sm" style={{ fontFamily: "var(--font-display)" }}>{p.name}</p>
                  <p className="text-[#C4562A] font-bold text-sm">{ghs(p.price)}</p>
                </div>
              </div>
            ))}
            {accountData.wishlist.length === 0 && <p className="col-span-full py-12 text-center text-muted-foreground">Your wishlist is empty.</p>}
          </div>
        )}

        {accountData && tab === "addresses" && (
          <div className="max-w-lg">
            {accountData.addresses.map((address) => (
              <div key={address.id} className={`bg-card rounded-xl p-5 border shadow-sm mb-4 ${address.isDefault ? "border-2 border-[#C4562A]" : "border-border"}`}>
                <div className="flex justify-between mb-2">
                  {address.isDefault && <span className="text-xs font-bold text-[#C4562A] uppercase tracking-wide">Default</span>}
                  <button onClick={() => beginAddressEdit(address)} aria-label={`Edit ${address.recipientName} address`} className="ml-auto text-xs text-muted-foreground hover:text-[#C4562A]"><Edit size={12}/></button>
                </div>
                <p className="font-bold text-sm capitalize">{address.recipientName}</p>
                <p className="text-sm text-muted-foreground">{address.address}, {address.city}, {address.country}</p>
              </div>
            ))}
            {accountData.addresses.length === 0 && <p className="mb-4 text-sm text-muted-foreground">No saved addresses.</p>}
            <button onClick={() => beginAddressEdit()} className="w-full border-2 border-dashed border-border rounded-xl p-4 text-sm font-semibold text-muted-foreground hover:border-[#C4562A] hover:text-[#C4562A] transition-colors flex items-center justify-center gap-2">
              <Plus size={16}/> Add New Address
            </button>
            {editingAddress && <form onSubmit={handleAddressSave} className="mt-5 space-y-3 rounded-xl border border-border p-5">
              <h3 className="font-bold">{editingAddress === "new" ? "New Address" : "Edit Address"}</h3>
              {([['recipientName','Recipient name'],['address','Street address'],['city','City'],['country','Country'],['phone','Phone']] as const).map(([key, label]) => <div key={key}><label className="block text-xs font-semibold mb-1 text-muted-foreground">{label}</label><input required value={addressForm[key]} onChange={(event) => setAddressForm((current) => ({ ...current, [key]: event.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm" /></div>)}
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={addressForm.isDefault} onChange={(event) => setAddressForm((current) => ({ ...current, isDefault: event.target.checked }))} /> Set as default</label>
              <div className="flex gap-2"><button type="button" onClick={() => setEditingAddress(null)} className="flex-1 border border-border rounded-lg py-2 text-sm font-semibold">Cancel</button><button disabled={accountSaving} type="submit" className="flex-1 bg-[#C4562A] text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50">{accountSaving ? "Saving…" : "Save Address"}</button></div>
            </form>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ABOUT PAGE ────────────────────────────────────────────────────────────
function AboutPage() {
  const { siteMedia, settings } = useStoreContent();
  const whatsappUrl = getWhatsAppUrl(settings, "Hello Aunty Sala Fashion Gh, I would like to learn more about your designs.");
  const storeAddress = settingString(settings, "store_address");
  const mapUrl = getGoogleMapsUrl(settings);
  return (
    <div className="min-h-screen pt-16" style={{ fontFamily: "var(--font-body)" }}>
      {/* Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[70vh]">
        <div className="relative bg-[#1A1A18] flex items-center px-10 lg:px-16 py-16 lg:py-0">
          <div className="relative z-10">
            <p className="text-[#B8922A] text-xs tracking-[0.3em] uppercase mb-4 font-semibold">Our Story</p>
            <h1 className="text-white text-5xl font-bold leading-tight mb-6" style={{ fontFamily: "var(--font-display)" }}>
              Sewn with<br />Love, Rooted<br />in <em className="text-[#C4562A]">Ghana.</em>
            </h1>
            <p className="text-white/60 leading-relaxed max-w-sm">
              Aunty Sala Fashion Gh was born in a small workshop in Accra's Osu district.
              What began as one woman's passion for bringing African print fabrics into modern silhouettes
              has grown into a beloved boutique serving clients across Ghana and the diaspora.
            </p>
          </div>
        </div>
        <div className="relative overflow-hidden bg-[#E8E2D9] min-h-[50vh]">
          <ManagedImage src={siteMedia.about_story} alt="Seamstress at work" className="w-full h-full object-cover" />
        </div>
      </div>

      <KenteStripe />

      {/* Brand Values */}
      <section className="py-20 px-6 lg:px-10 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[#B8922A] text-xs tracking-[0.3em] uppercase mb-2 font-semibold">What We Stand For</p>
          <h2 className="text-4xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Craftsmanship Values</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { icon: Award, title: "Heritage Preserved", body: "Every fabric we use — kente, ankara, batik — is sourced directly from Ghanaian and West African weavers. We are proud partners of artisan communities." },
            { icon: Scissors, title: "Made-to-Measure", body: "We believe every woman deserves clothing that fits perfectly. Our custom service ensures no compromises — your dress, your shape, your story." },
            { icon: Zap, title: "Contemporary Vision", body: "We honour tradition while pushing the silhouette forward. Our designs sit at the intersection of Ghanaian culture and global fashion sensibility." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="text-center">
              <div className="w-14 h-14 bg-[#C4562A]/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Icon size={22} className="text-[#C4562A]" />
              </div>
              <h3 className="font-bold text-xl mb-3" style={{ fontFamily: "var(--font-display)" }}>{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workshop */}
      <section className="bg-[#F0EAE0] py-16 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[#B8922A] text-xs tracking-[0.3em] uppercase mb-3 font-semibold">The Atelier</p>
            <h2 className="text-4xl font-bold mb-5" style={{ fontFamily: "var(--font-display)" }}>Where Every Piece Comes to Life</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Our Osu workshop is home to seven skilled seamstresses, each with over a decade of dressmaking experience.
              Every garment is cut, sewn, and finished by hand — no mass production, ever.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              When you order from Aunty Sala, you're not just buying a dress. You're investing in Ghanaian craftsmanship,
              supporting female artisans, and wearing something that was made with genuine love and intention.
            </p>
            {mapUrl && (
              <a href={mapUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-start gap-3 mt-6 text-sm font-semibold text-[#C4562A] hover:text-[#A8411B] transition-colors">
                <MapPin size={20} className="shrink-0 mt-0.5" />
                <span>
                  <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Visit our atelier</span>
                  {storeAddress}
                </span>
              </a>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ManagedImage src={siteMedia.about_workshop} alt="Workshop" className="rounded-xl w-full h-48 object-cover" />
            <ManagedImage src={siteMedia.about_fabric} alt="Fabric" className="rounded-xl w-full h-48 object-cover" />
            <ManagedImage src={siteMedia.about_textiles} alt="Textiles" className="rounded-xl w-full h-48 object-cover col-span-2" />
          </div>
        </div>
      </section>

      {whatsappUrl && (
        <section className="px-6 lg:px-10 py-14 bg-[#FAF7F2]">
          <div className="max-w-4xl mx-auto rounded-2xl bg-[#1A1A18] px-7 py-8 md:px-10 md:py-9 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-[#B8922A] text-xs tracking-[0.25em] uppercase mb-2 font-semibold">Speak With Our Team</p>
              <h2 className="text-white text-2xl md:text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Have a design in mind?</h2>
              <p className="text-white/60 text-sm mt-2">Chat with us directly for sizing, fabrics, custom orders, or any questions.</p>
            </div>
            <a href={whatsappUrl} target="_blank" rel="noreferrer"
              className="shrink-0 bg-[#25D366] hover:bg-[#20bd5a] text-white px-6 py-3.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors">
              <MessageCircle size={18} /> Chat on WhatsApp
            </a>
          </div>
        </section>
      )}
    </div>
  );
}

type HelpSection = "sizing" | "fabric-care" | "returns" | "faqs";

function HelpPage({ section, setPage }: { section: HelpSection; setPage: (page: string) => void }) {
  const sectionTitles: Record<HelpSection, string> = {
    sizing: "Sizing Guide",
    "fabric-care": "Fabric Care",
    returns: "Returns Policy",
    faqs: "Frequently Asked Questions",
  };
  return (
    <div className="min-h-screen pt-16 pb-20" style={{ fontFamily: "var(--font-body)" }}>
      <div className="bg-[#1A1A18] py-12 px-6 text-center">
        <p className="text-[#B8922A] text-xs tracking-[0.3em] uppercase mb-2 font-semibold">Customer Care</p>
        <h1 className="text-white text-4xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{sectionTitles[section]}</h1>
      </div>
      <KenteStripe />
      <div className="max-w-3xl mx-auto px-6 py-14">
        {section === "sizing" && <>
          <p className="text-muted-foreground mb-7 leading-relaxed">Use the measurements below as a general guide. For made-to-measure pieces, submit your exact measurements with your custom order.</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm"><thead className="bg-[#F0EAE0]"><tr>{["Size","Bust","Waist","Hips"].map((item) => <th key={item} className="px-4 py-3 text-left">{item}</th>)}</tr></thead><tbody>
              {[["XS","81–84","63–66","88–91"],["S","86–89","68–71","93–97"],["M","91–94","73–76","99–102"],["L","97–102","79–84","104–109"],["XL","104–109","86–91","112–117"],["XXL","112–117","94–99","119–124"]].map((row) => <tr key={row[0]} className="border-t border-border"><td className="px-4 py-3 font-bold">{row[0]}</td>{row.slice(1).map((value) => <td key={value} className="px-4 py-3">{value} cm</td>)}</tr>)}
            </tbody></table>
          </div>
        </>}
        {section === "fabric-care" && <>
          <p className="text-muted-foreground mb-6 leading-relaxed">Care instructions can vary by fabric and embellishment. Always follow the care label supplied with your garment.</p>
          <div className="space-y-3">{["Hand wash or use a gentle machine cycle in cold water.","Wash strong colours separately and avoid bleach.","Air dry away from harsh direct sunlight; do not tumble dry.","Iron on low heat from the reverse side.","Use professional dry cleaning for structured, embellished, or kente pieces."].map((item) => <div key={item} className="flex gap-3 rounded-lg bg-[#F0EAE0] p-4 text-sm"><Check size={17} className="text-[#C4562A] shrink-0" />{item}</div>)}</div>
        </>}
        {section === "returns" && <>
          <p className="text-muted-foreground leading-relaxed mb-5">If there is a problem with your order, contact us promptly with your order number and clear photographs where relevant. Our team will confirm whether the item qualifies for a return, exchange, alteration, or repair.</p>
          <div className="rounded-xl border border-border p-6 space-y-3 text-sm text-muted-foreground">
            <p>Items must remain unworn, unwashed, and in their original condition.</p>
            <p>Do not send an item back until our team has provided return instructions.</p>
            <p>Made-to-measure and personalized garments are normally not returnable unless they are faulty or differ materially from the approved order.</p>
            <p>Delivery charges and timelines depend on the reason for the return and the destination.</p>
          </div>
        </>}
        {section === "faqs" && <div className="space-y-4">
          {[
            ["Do you deliver internationally?", "Yes. Delivery options and charges are confirmed for the destination during the order process."],
            ["Can I order a custom size?", "Yes. Choose Custom Order and submit your measurements, preferred style, fabric, and occasion."],
            ["How long does a custom order take?", "The schedule depends on the design and current workload. The team will confirm timing before production begins."],
            ["How can I check my order?", "Sign in to your account to view order status, or contact the team with your order number."],
            ["How do I choose the right size?", "Compare your body measurements with our sizing guide. Contact us if you fall between sizes."],
          ].map(([question, answer]) => <div key={question} className="rounded-xl border border-border p-5"><h2 className="font-bold mb-2">{question}</h2><p className="text-sm text-muted-foreground leading-relaxed">{answer}</p></div>)}
        </div>}
        <div className="mt-10 rounded-xl bg-[#1A1A18] p-6 text-center">
          <p className="text-white font-bold mb-2">Still need help?</p>
          <p className="text-white/60 text-sm mb-4">Our team can help with your order, measurements, or garment care.</p>
          <button type="button" onClick={() => setPage("contact")} className="bg-[#C4562A] hover:bg-[#A8411B] text-white px-6 py-3 rounded-lg text-sm font-bold">Contact Us</button>
        </div>
      </div>
    </div>
  );
}

type LegalPageKind = "privacy-policy" | "terms-of-service";

function LegalPage({ kind, setPage }: { kind: LegalPageKind; setPage: (page: string) => void }) {
  const { settings } = useStoreContent();
  const storeEmail = settingString(settings, "store_email");
  const updatedAt = "14 July 2026";
  const isPrivacy = kind === "privacy-policy";

  return (
    <div className="min-h-screen pt-16 pb-20" style={{ fontFamily: "var(--font-body)" }}>
      <div className="bg-[#1A1A18] py-12 px-6 text-center">
        <p className="text-[#B8922A] text-xs tracking-[0.3em] uppercase mb-2 font-semibold">Legal</p>
        <h1 className="text-white text-4xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          {isPrivacy ? "Privacy Policy" : "Terms of Service"}
        </h1>
        <p className="text-white/50 text-sm mt-3">Last updated: {updatedAt}</p>
      </div>
      <KenteStripe />

      <article className="max-w-3xl mx-auto px-6 py-14 text-[#34332F]">
        {isPrivacy ? (
          <div className="space-y-9">
            <section>
              <p className="text-muted-foreground leading-relaxed">
                Aunty Sala Fashion Gh respects your privacy. This policy explains the personal information we collect when you visit our website, create an account, contact us, or place an order, and how we use and protect it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>1. Information we collect</h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p><strong className="text-foreground">Account information:</strong> your name, email address, authentication details, and account identifiers.</p>
                <p><strong className="text-foreground">Order and delivery information:</strong> products, measurements or customization details, delivery address, phone number, order history, and transaction references.</p>
                <p><strong className="text-foreground">Messages and preferences:</strong> contact-form messages, newsletter choices, wishlist items, product reviews, and communications with our team.</p>
                <p><strong className="text-foreground">Technical information:</strong> essential browser storage used for your session, cart, security, and site operation, together with basic device and request information processed by our hosting providers.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>2. How we use your information</h2>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground leading-relaxed">
                <li>To create and secure your account.</li>
                <li>To process, tailor, deliver, and support your orders.</li>
                <li>To take payment, prevent fraud, and maintain transaction records.</li>
                <li>To send service messages such as order confirmations and status updates.</li>
                <li>To answer enquiries and, where you opt in, send marketing updates.</li>
                <li>To operate, troubleshoot, protect, and improve the store and comply with legal obligations.</li>
              </ul>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">We process information as needed to perform our contract with you, comply with law, pursue legitimate business and security interests, or based on your consent where consent is required.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>Google Sign-In data</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">If you choose Google Sign-In, Google provides your basic profile information, including your name, email address, profile image, and account identifier. We use this information only to authenticate you, create or locate your customer account, display your profile, and connect you with your orders, saved addresses, and wishlist. We do not request access to Google Drive, contacts, calendar, or email content, and we do not sell Google user data.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>3. Service providers and sharing</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">We do not sell your personal information. We share only what is needed with providers that help us run the store, including:</p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground leading-relaxed">
                <li>Supabase for authentication, database, and application services.</li>
                <li>Paystack and participating financial institutions for payment processing and verification. We do not receive or store your full card details.</li>
                <li>Cloudinary for product and site media, and Cloudflare for hosting, delivery, and security.</li>
                <li>Email and WhatsApp service providers for transactional messages and customer support.</li>
                <li>Delivery partners, professional advisers, regulators, or law enforcement where necessary or legally required.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>4. Retention and security</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">We retain personal information only for as long as it is reasonably needed to provide the service, maintain business and tax records, resolve disputes, prevent fraud, and meet legal obligations. We use reasonable administrative and technical safeguards, but no internet service can guarantee absolute security.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>5. International processing</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">Some providers may process information outside Ghana. Where this occurs, we take reasonable steps to use providers and safeguards appropriate to the information and applicable law.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>6. Your choices and rights</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">Subject to applicable law, including Ghana's Data Protection Act, 2012 (Act 843), you may ask to access, correct, update, object to certain processing of, or request deletion of your personal information. You may unsubscribe from marketing at any time. We may need to verify your identity and may retain information where the law permits or requires it.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>7. Children and policy changes</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">The store is not intended for children to make purchases without the involvement of a parent or guardian. We may update this policy as the store or legal requirements change. The latest version and effective date will appear on this page.</p>
            </section>
          </div>
        ) : (
          <div className="space-y-9">
            <section>
              <p className="text-muted-foreground leading-relaxed">These Terms of Service apply when you access the Aunty Sala Fashion Gh website, create an account, or purchase ready-to-wear or custom-made products. By using the store, you agree to these terms.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>1. Accounts and acceptable use</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">You must provide accurate information, keep your sign-in method secure, and promptly update information that changes. You may not misuse the website, attempt unauthorized access, interfere with its operation, submit unlawful content, or use it for fraudulent activity. You are responsible for activity carried out through your account.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>2. Products and custom orders</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">We aim to describe and display products accurately, but colours and textures can vary by screen, fabric batch, and handmade production. For made-to-measure work, you are responsible for providing accurate measurements and approving the agreed design details. Reasonable handmade variation is not a defect.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>3. Orders, prices, and payment</h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>Submitting an order is an offer to purchase. An order is accepted when we confirm it and, where required, receive cleared payment. We may decline or cancel an order because of unavailable materials, an obvious pricing error, suspected fraud, delivery limitations, or another reasonable operational issue. If we cancel a paid order, we will arrange the applicable refund.</p>
                <p>Prices are shown in the currency displayed at checkout. Delivery charges, duties, taxes, currency conversion, or bank fees may apply and will be shown or communicated where reasonably possible. Payments are processed by Paystack or another displayed payment provider under that provider's terms.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>4. Production and delivery</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">Production and delivery dates are estimates unless we expressly agree otherwise in writing. Delays may occur because of material availability, customization, courier operations, customs, weather, or events outside our reasonable control. You are responsible for providing a complete, accurate delivery address and for any destination duties or import charges unless stated otherwise.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>5. Returns, alterations, and refunds</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">Our Returns Policy forms part of these terms. Made-to-measure, altered, or personalized items are normally not returnable unless faulty or materially different from the approved order. Contact us before returning anything so we can assess the issue and provide instructions.</p>
              <button type="button" onClick={() => setPage("help-returns")} className="mt-3 text-sm font-bold text-[#C4562A] hover:text-[#A8411B]">Read the Returns Policy →</button>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>6. Intellectual property and third-party services</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">The website's branding, text, original images, designs, and other content belong to Aunty Sala Fashion Gh or their respective owners and may not be copied or commercially reused without permission. Links and services provided by third parties are governed by their own terms and policies.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>7. Liability</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">Nothing in these terms excludes rights or liability that cannot lawfully be excluded. To the extent permitted by law, we are not responsible for indirect or unforeseeable losses, third-party service failures, or loss caused by misuse of the website. Our responsibility for a product order will not exceed the amount paid for that order, except where applicable law requires otherwise.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>8. Governing law and changes</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">These terms are governed by the laws of Ghana. We encourage you to contact us first so we can try to resolve any concern. We may update these terms from time to time; the version published when you place an order will apply to that order unless a change is required by law.</p>
            </section>
          </div>
        )}

        <section className="mt-12 rounded-xl bg-[#F0EAE0] p-6">
          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>Contact us</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">Questions about {isPrivacy ? "your personal information or this policy" : "these terms or an order"} can be sent to our team.</p>
          {storeEmail && <a href={`mailto:${storeEmail}`} className="block text-sm font-semibold text-[#C4562A] hover:text-[#A8411B] mb-3">{storeEmail}</a>}
          <button type="button" onClick={() => setPage("contact")} className="bg-[#1A1A18] hover:bg-black text-white px-5 py-2.5 rounded-lg text-sm font-bold">Contact Us</button>
        </section>
      </article>
    </div>
  );
}

// ─── CONTACT PAGE ──────────────────────────────────────────────────────────
function ContactPage() {
  const { settings, siteMedia } = useStoreContent();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const whatsappUrl = getWhatsAppUrl(settings, "Hello Aunty Sala Fashion Gh, I would like to make an enquiry.");
  const mapUrl = getGoogleMapsUrl(settings);

  const handleContactSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSending(true);
    setSendError("");
    try {
      await submitContactMessage({
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        subject: String(formData.get("subject") ?? ""),
        message: String(formData.get("message") ?? ""),
      });
      setSent(true);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "We couldn't send your message. Please try again.");
    } finally {
      setSending(false);
    }
  };
  return (
    <div className="min-h-screen pt-16 pb-20" style={{ fontFamily: "var(--font-body)" }}>
      <div className="bg-[#1A1A18] min-h-[280px] md:min-h-[360px] px-6 text-center relative overflow-hidden flex items-center justify-center">
        <ManagedImage src={siteMedia.contact_banner} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15" />
        <div className="relative z-10">
          <p className="text-[#B8922A] text-xs tracking-[0.3em] uppercase mb-2 font-semibold">We'd Love to Hear From You</p>
          <h1 className="text-white text-4xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Get in Touch</h1>
        </div>
      </div>
      <KenteStripe />

      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-14 grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Form */}
        <div>
          <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "var(--font-display)" }}>Send a Message</h2>
          {sent ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <CheckCircle size={40} className="text-green-500" />
              <p className="text-lg font-bold">Message sent!</p>
              <p className="text-sm text-muted-foreground text-center">We'll reply within 24 hours. You can also reach us on WhatsApp for a faster response.</p>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {["Name","Email"].map(l => (
                  <div key={l}>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">{l}</label>
                    <input name={l.toLowerCase()} type={l === "Email" ? "email" : "text"} required className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C4562A]" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">Subject</label>
                <select name="subject" className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C4562A]">
                  <option>General Enquiry</option><option>Custom Order</option>
                  <option>Order Status</option><option>Returns &amp; Exchanges</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">Message</label>
                <textarea name="message" required rows={5} className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C4562A] resize-none" />
              </div>
              <button disabled={sending} type="submit" className="w-full bg-[#C4562A] disabled:opacity-50 hover:bg-[#A8411B] text-white py-3.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2">
                {sending ? "Sending…" : "Send Message"} <Send size={15}/>
              </button>
              {sendError && <p role="alert" className="text-sm text-red-600">{sendError}</p>}
            </form>
          )}
        </div>

        {/* Info */}
        <div>
          <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "var(--font-display)" }}>Contact Info</h2>
          <div className="space-y-5 mb-8">
            {[{ icon: MapPin, label: "Location", value: String(settings.store_address ?? "") },
              { icon: Phone, label: "Phone", value: String(settings.store_phone ?? "") },
              { icon: Mail, label: "Email", value: String(settings.store_email ?? "") },
              { icon: Clock, label: "Hours", value: String(settings.store_hours ?? "") }
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#C4562A]/10 rounded-lg flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-[#C4562A]" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* WhatsApp CTA */}
          {whatsappUrl && <div className="bg-[#25D366]/10 border border-[#25D366]/30 rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-[#25D366] rounded-xl flex items-center justify-center shrink-0">
              <MessageCircle size={22} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">Fastest response on WhatsApp</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">Chat directly with our design team — we reply within hours.</p>
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#25D366] hover:underline flex items-center gap-1">
                Open WhatsApp Chat <ArrowRight size={12}/>
              </a>
            </div>
          </div>}

          {/* Map placeholder */}
          <div className="mt-6 rounded-xl overflow-hidden bg-[#E8E2D9] h-48 flex items-center justify-center relative">
            <ManagedImage src={siteMedia.contact_location} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
            <div className="relative z-10 flex flex-col items-center">
              <MapPin size={28} className="text-[#C4562A] mb-1" />
              <p className="text-sm font-bold">{String(settings.store_address ?? "Location not configured")}</p>
              {mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer" className="text-xs text-[#C4562A] hover:underline mt-1">View on Google Maps</a>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN SIDEBAR ─────────────────────────────────────────────────────────
const ADMIN_LINKS = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "products", label: "Products", icon: ShoppingBag },
  { key: "archived-products", label: "Archived Products", icon: Archive },
  { key: "orders", label: "Orders", icon: Package },
  { key: "custom-orders", label: "Tailoring Queue", icon: Scissors },
  { key: "customers", label: "Customers", icon: Users },
  { key: "analytics", label: "Analytics", icon: BarChart2 },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "email-templates", label: "Email Templates", icon: Mail },
  { key: "settings", label: "Settings", icon: Settings },
];

function AdminSidebar({ page, setPage, onExit, onLogout }:
  { page: string; setPage: (p: string) => void; onExit: () => void; onLogout: () => Promise<void> }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex h-screen h-dvh w-60 shrink-0 flex-col overflow-hidden bg-[#1A1A18] text-[#FAF7F2] shadow-[8px_0_30px_rgba(26,26,24,0.08)]">
      <div className="px-5 py-4 border-b border-white/8 flex items-center gap-3">
        <img src="/aunty-sala-logo.png" alt="Aunty Sala Fashion Gh logo" className="h-12 w-auto object-contain" />
        <div>
          <p className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>Aunty Sala</p>
          <p className="text-[10px] tracking-[0.25em] uppercase text-[#B8922A] font-medium">Admin Portal</p>
        </div>
      </div>
      <nav aria-label="Admin navigation" className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-4 overscroll-contain">
        {ADMIN_LINKS.map(({ key, label, icon: Icon }) => {
          const active = page === key;
          return (
            <button key={key} type="button" onClick={() => setPage(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? "bg-[#B8922A]/15 text-[#B8922A]" : "hover:bg-white/5 text-[#FAF7F2]/70 hover:text-[#FAF7F2]"}`}>
              <Icon size={16} className={active ? "text-[#B8922A]" : ""} />
              {label}
            </button>
          );
        })}
      </nav>
      <div className="px-3 pb-5 border-t border-white/8 pt-4 space-y-1">
        <button type="button" onClick={onExit} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#FAF7F2]/50 hover:text-[#FAF7F2]/80 transition-colors">
          <Home size={15} /> Back to Store
        </button>
        <button type="button" onClick={() => void onLogout()} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#FAF7F2]/70 hover:bg-red-500/10 hover:text-red-300 transition-colors">
          <LogOut size={15} /> Log Out
        </button>
      </div>
    </aside>
  );
}

// ─── ADMIN DASHBOARD ───────────────────────────────────────────────────────
type AdminDatePreset = "today" | "month" | "year" | "custom";

type AdminDateRange = {
  start: Date;
  end: Date;
  label: string;
};

const dateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isFinite(date.getTime()) ? date : new Date();
};

function adminDateRange(preset: AdminDatePreset, customStart: string, customEnd: string): AdminDateRange {
  const now = new Date();
  let start: Date;
  let end: Date;
  let label: string;
  if (preset === "today") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = new Date(start);
    end.setDate(end.getDate() + 1);
    label = "Today";
  } else if (preset === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    label = new Intl.DateTimeFormat("en-GH", { month: "long", year: "numeric" }).format(start);
  } else if (preset === "year") {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear() + 1, 0, 1);
    label = String(now.getFullYear());
  } else {
    start = dateFromInput(customStart);
    const inclusiveEnd = dateFromInput(customEnd);
    if (inclusiveEnd < start) inclusiveEnd.setTime(start.getTime());
    end = new Date(inclusiveEnd);
    end.setDate(end.getDate() + 1);
    const formatter = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" });
    label = `${formatter.format(start)} – ${formatter.format(inclusiveEnd)}`;
  }
  return { start, end, label };
}

function useAdminDateRange() {
  const [preset, setPreset] = useState<AdminDatePreset>("month");
  const [customStart, setCustomStart] = useState(() => {
    const now = new Date();
    return dateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [customEnd, setCustomEnd] = useState(() => dateInputValue(new Date()));
  const range = useMemo(() => adminDateRange(preset, customStart, customEnd), [preset, customStart, customEnd]);
  return { preset, setPreset, customStart, setCustomStart, customEnd, setCustomEnd, range };
}

function AdminDateRangeFilter({ filter }: { filter: ReturnType<typeof useAdminDateRange> }) {
  const options: Array<{ key: AdminDatePreset; label: string }> = [
    { key: "today", label: "Today" },
    { key: "month", label: "This Month" },
    { key: "year", label: "This Year" },
    { key: "custom", label: "Custom Range" },
  ];
  return (
    <div className="flex flex-col items-start lg:items-end gap-3">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option.key} type="button" onClick={() => filter.setPreset(option.key)}
            className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${filter.preset === option.key ? "bg-[#1A1A18] border-[#1A1A18] text-white" : "bg-card border-border hover:border-[#C4562A]"}`}>
            {option.label}
          </button>
        ))}
      </div>
      {filter.preset === "custom" && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-2"><span className="text-muted-foreground">From</span><input type="date" value={filter.customStart} max={filter.customEnd} onChange={(event) => filter.setCustomStart(event.target.value)} className="border border-border rounded-lg bg-card px-3 py-2" /></label>
          <label className="flex items-center gap-2"><span className="text-muted-foreground">To</span><input type="date" value={filter.customEnd} min={filter.customStart} max={dateInputValue(new Date())} onChange={(event) => filter.setCustomEnd(event.target.value)} className="border border-border rounded-lg bg-card px-3 py-2" /></label>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Showing {filter.range.label}</p>
    </div>
  );
}

const dateInAdminRange = (value: string | undefined, range: AdminDateRange) => {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= range.start.getTime() && time < range.end.getTime();
};

function paidOrdersInRange(orders: AdminOrder[], range: AdminDateRange) {
  return orders.filter((order) => order.paymentStatus === "paid" && dateInAdminRange(order.paidAt ?? order.createdAt, range));
}

function revenueSeriesForRange(events: Array<{ amount: number; paidAt: string }>, range: AdminDateRange) {
  const dayCount = Math.ceil((range.end.getTime() - range.start.getTime()) / 86_400_000);
  const monthly = dayCount > 62;
  const buckets = new Map<string, { month: string; revenue: number; orders: number }>();
  const cursor = new Date(range.start);
  while (cursor < range.end) {
    const key = monthly
      ? `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`
      : dateInputValue(cursor);
    const month = new Intl.DateTimeFormat("en-GH", monthly ? { month: "short", year: "2-digit" } : { day: "numeric", month: "short" }).format(cursor);
    buckets.set(key, { month, revenue: 0, orders: 0 });
    if (monthly) cursor.setMonth(cursor.getMonth() + 1, 1);
    else cursor.setDate(cursor.getDate() + 1);
  }
  for (const event of events) {
    const date = new Date(event.paidAt);
    const key = monthly
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      : dateInputValue(date);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.revenue += event.amount;
    bucket.orders += 1;
  }
  return [...buckets.values()];
}

function AdminDashboard({ setPage }: { setPage: (p: string) => void }) {
  const PRODUCTS = useProducts();
  const { orders: ORDERS_DATA, customPayments, tailoringItems } = useAdminData();
  const dateFilter = useAdminDateRange();
  const { periodOrders, paidOrders, paidCustomOrderCount, periodCustomOrders, salesData: SALES_DATA, revenue, categoryData: CATEGORY_DATA } = useMemo(() => {
    const filteredOrders = ORDERS_DATA.filter((order) => dateInAdminRange(order.createdAt, dateFilter.range));
    const filteredPaidOrders = paidOrdersInRange(ORDERS_DATA, dateFilter.range);
    const filteredCustomPayments = customPayments.filter((payment) => dateInAdminRange(payment.paidAt, dateFilter.range));
    const filteredCustomOrders = tailoringItems.filter((item) => dateInAdminRange(item.createdAt, dateFilter.range));
    const paidRevenue = filteredPaidOrders.reduce((sum, order) => sum + order.amount, 0)
      + filteredCustomPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const categoryMap = new Map<string, number>();
    filteredPaidOrders.forEach((order) => order.salesBreakdown.forEach((item) => categoryMap.set(item.category, (categoryMap.get(item.category) ?? 0) + item.quantity)));
    const revenueEvents = [
      ...filteredPaidOrders.map((order) => ({ amount: order.amount, paidAt: order.paidAt ?? order.createdAt })),
      ...filteredCustomPayments.map((payment) => ({ amount: payment.amount, paidAt: payment.paidAt })),
    ];
    return {
      periodOrders: filteredOrders,
      paidOrders: filteredPaidOrders,
      paidCustomOrderCount: new Set(filteredCustomPayments.map((payment) => payment.customOrderId)).size,
      periodCustomOrders: filteredCustomOrders,
      salesData: revenueSeriesForRange(revenueEvents, dateFilter.range),
      revenue: paidRevenue,
      categoryData: [...categoryMap].map(([name, value]) => ({ name, value })).sort((left, right) => right.value - left.value),
    };
  }, [ORDERS_DATA, customPayments, tailoringItems, dateFilter.range]);
  const metrics = [
    { label: "Paid Revenue", value: ghs(revenue), delta: `${paidOrders.length + paidCustomOrderCount} paid order${paidOrders.length + paidCustomOrderCount === 1 ? "" : "s"} including custom`, icon: DollarSign, up: true },
    { label: "Orders Created", value: String(periodOrders.length), delta: dateFilter.range.label, icon: Package, up: true },
    { label: "Custom Requests", value: String(periodCustomOrders.length), delta: dateFilter.range.label, icon: Scissors, up: false },
    { label: "Out of Stock", value: String(PRODUCTS.filter((product) => !product.inStock).length), delta: "Products", icon: AlertCircle, up: false },
  ];

  return (
    <div className="p-8" style={{ fontFamily: "var(--font-body)" }}>
      <div className="mb-8 flex flex-col lg:flex-row lg:items-start justify-between gap-5">
        <div><h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Live paid sales data from Supabase</p></div>
        <AdminDateRangeFilter filter={dateFilter} />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {metrics.map(m => (
          <div key={m.label} className="bg-card rounded-xl p-5 border border-border/50 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{m.label}</p>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${m.up ? "bg-[#C4562A]/10" : "bg-amber-50"}`}>
                <m.icon size={16} className={m.up ? "text-[#C4562A]" : "text-amber-600"} />
              </div>
            </div>
            <p className="text-2xl font-bold mb-1">{m.value}</p>
            <p className={`text-xs font-medium ${m.up ? "text-green-600" : "text-amber-600"}`}>{m.delta}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <div className="xl:col-span-2 bg-card rounded-xl p-6 border border-border/50 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <h2 className="font-bold text-base" style={{ fontFamily: "var(--font-display)" }}>Revenue Trend</h2>
            <span className="text-xs text-muted-foreground">{dateFilter.range.label}</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={SALES_DATA}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C4562A" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#C4562A" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`GH₵ ${v.toLocaleString()}`, "Revenue"]} />
              <Area type="monotone" dataKey="revenue" stroke="#C4562A" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl p-6 border border-border/50 shadow-sm">
          <h2 className="font-bold text-base mb-5" style={{ fontFamily: "var(--font-display)" }}>Sales by Category</h2>
          {CATEGORY_DATA.length > 0 ? <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={CATEGORY_DATA} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                {CATEGORY_DATA.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [v, "Items sold"]} />
            </PieChart>
          </ResponsiveContainer> : <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No paid sales in this period.</div>}
          <div className="space-y-1.5 mt-2">
            {CATEGORY_DATA.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                  <span>{d.name}</span>
                </div>
                <span className="font-semibold">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="flex justify-between items-center px-6 py-4 border-b border-border">
          <h2 className="font-bold text-base" style={{ fontFamily: "var(--font-display)" }}>Recent Orders</h2>
          <button onClick={() => setPage("orders")} className="text-xs text-[#C4562A] font-semibold hover:underline">View all</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Order","Customer","Items","Amount","Status","Date"].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ORDERS_DATA.slice(0,5).map(o => (
                <tr key={o.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-3.5 font-mono text-xs font-bold text-[#C4562A]">{o.id}</td>
                  <td className="px-6 py-3.5 font-medium">{o.customer}</td>
                  <td className="px-6 py-3.5 text-muted-foreground max-w-[180px] truncate">{o.items}</td>
                  <td className="px-6 py-3.5 font-bold">{ghs(o.amount)}</td>
                  <td className="px-6 py-3.5"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusColor[o.status]}`}>{o.status}</span></td>
                  <td className="px-6 py-3.5 text-muted-foreground">{o.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN PRODUCTS ────────────────────────────────────────────────────────
function AdminProducts() {
  const { categories, products: PRODUCTS, refresh } = useAdminData();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [editingProduct, setEditingProduct] = useState<(typeof PRODUCTS)[number] | null>(null);
  const [productFiles, setProductFiles] = useState<File[]>([]);
  const [retainedProductMedia, setRetainedProductMedia] = useState<Product["mediaItems"]>([]);
  const [availableCategories, setAvailableCategories] = useState(categories);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [availableFabrics, setAvailableFabrics] = useState<string[]>([]);
  const [showNewFabric, setShowNewFabric] = useState(false);
  const [newFabricName, setNewFabricName] = useState("");
  const [productForm, setProductForm] = useState({
    name: "", sku: "", price: "", category: "", fabric: "", stock: "0",
    description: "", sizes: "", colors: "",
  });
  useEffect(() => {
    setAvailableCategories(categories);
    setProductForm((current) => current.category || categories.length === 0 ? current : { ...current, category: categories[0].name });
  }, [categories]);
  useEffect(() => {
    const fabrics = [...new Set(PRODUCTS.map((product) => product.fabric).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    setAvailableFabrics(fabrics);
    setProductForm((current) => current.fabric || fabrics.length === 0 ? current : { ...current, fabric: fabrics[0] });
  }, [PRODUCTS]);
  const productFilePreviews = useMemo(() => productFiles.map((file) => ({ file, url: URL.createObjectURL(file) })), [productFiles]);
  useEffect(() => () => productFilePreviews.forEach((preview) => URL.revokeObjectURL(preview.url)), [productFilePreviews]);
  const activeProducts = PRODUCTS.filter((product) => product.isActive);
  const filtered = activeProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.fabric.toLowerCase().includes(search.toLowerCase()));
  const productMediaCount = retainedProductMedia.length + productFiles.length;
  const setProductField = (field: keyof typeof productForm, value: string) => setProductForm((current) => ({ ...current, [field]: value }));
  const resetProductForm = () => {
    setEditingProduct(null);
    setProductFiles([]);
    setRetainedProductMedia([]);
    setSaveError("");
    setProductForm({
      name: "", sku: "", price: "", category: availableCategories[0]?.name ?? "",
      fabric: availableFabrics[0] ?? "", stock: "0", description: "", sizes: "", colors: "",
    });
  };
  const openNewProduct = () => {
    resetProductForm();
    setShowForm(true);
  };
  const openEditProduct = (product: (typeof PRODUCTS)[number]) => {
    setEditingProduct(product);
    setProductFiles([]);
    setRetainedProductMedia(product.mediaItems);
    setSaveError("");
    setProductForm({
      name: product.name, sku: product.sku, price: String(product.price), category: product.category,
      fabric: product.fabric, stock: String(product.inventoryQuantity), description: product.description,
      sizes: product.sizes.join(", "), colors: product.colors.join(", "),
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const handleCreateCategory = async () => {
    setCategorySaving(true);
    setCategoryError("");
    try {
      const category = await createCategory(newCategoryName);
      setAvailableCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name)));
      setProductField("category", category.name);
      setNewCategoryName("");
      setShowNewCategory(false);
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : "The category could not be created.");
    } finally {
      setCategorySaving(false);
    }
  };
  const handleAddFabric = () => {
    const fabric = newFabricName.trim();
    if (!fabric) return;
    setAvailableFabrics((current) => [...new Set([...current, fabric])].sort((a, b) => a.localeCompare(b)));
    setProductField("fabric", fabric);
    setNewFabricName("");
    setShowNewFabric(false);
  };
  const handleCreateProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (productMediaCount < 1) {
      setSaveError("Every product must have at least one image.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const media = productFiles.length ? await uploadManyToCloudinary(productFiles, "aunty-sala-fashion-gh/products") : [];
      const productInput = {
        name: productForm.name,
        sku: productForm.sku,
        price: Number(productForm.price),
        category: productForm.category,
        fabric: productForm.fabric,
        inventoryQuantity: Number(productForm.stock),
        description: productForm.description,
        sizes: productForm.sizes.split(",").map((value) => value.trim()).filter(Boolean),
        colors: productForm.colors.split(",").map((value) => value.trim()).filter(Boolean),
        media,
      };
      if (editingProduct) await updateProduct({
        id: editingProduct.id,
        ...productInput,
        retainedMediaIds: retainedProductMedia.map((item) => item.id),
      });
      else await createProduct(productInput);
      await refresh();
      resetProductForm();
      setShowForm(false);
      setActionMessage(editingProduct ? "Product updated." : "Product created.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "The product could not be saved.");
    } finally {
      setSaving(false);
    }
  };
  const handleArchiveProduct = async (product: (typeof PRODUCTS)[number]) => {
    if (!window.confirm(`Archive ${product.name}? It will be removed from the storefront.`)) return;
    setSaveError("");
    try {
      await archiveProduct(product.id);
      await refresh();
      setActionMessage(`${product.name} was archived.`);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "The product could not be archived.");
    }
  };
  return (
    <div className="p-8" style={{ fontFamily: "var(--font-body)" }}>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Products</h1>
          <p className="text-muted-foreground text-sm mt-1">{activeProducts.length} active product{activeProducts.length === 1 ? "" : "s"}</p>
        </div>
        <button onClick={openNewProduct} className="bg-[#C4562A] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#A8411B] transition-colors flex items-center gap-2">
          <Plus size={15}/> Add Product
        </button>
      </div>

      {actionMessage && <p role="status" className="mb-4 text-sm text-muted-foreground">{actionMessage}</p>}

      {showForm && (
        <form onSubmit={handleCreateProduct} className="bg-card rounded-xl p-6 border border-border/50 shadow-sm mb-6">
          <div className="flex justify-between mb-5">
            <h2 className="font-bold text-lg" style={{ fontFamily: "var(--font-display)" }}>{editingProduct ? "Edit Product" : "New Product"}</h2>
            <button type="button" onClick={() => { resetProductForm(); setShowForm(false); }} className="text-muted-foreground hover:text-[#1A1A18]"><X size={18}/></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              ["name", "Product Name", "text"], ["sku", "SKU", "text"], ["price", "Price (GH₵)", "number"],
              ["stock", "Stock Qty", "number"],
              ["sizes", "Sizes (comma-separated)", "text"], ["colors", "Colours (comma-separated)", "text"],
            ].map(([field, label, type]) => (
              <div key={field}>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">{label}</label>
                <input required={!['sizes', 'colors'].includes(field)} type={type} min={type === "number" ? "0" : undefined} value={productForm[field as keyof typeof productForm]} onChange={(event) => setProductField(field as keyof typeof productForm, event.target.value)} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C4562A]" />
              </div>
            ))}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</label>
                <button type="button" onClick={() => { setShowNewCategory((current) => !current); setCategoryError(""); }} className="text-xs font-semibold text-[#C4562A] hover:underline flex items-center gap-1">
                  <Plus size={12}/> Add new
                </button>
              </div>
              <select required value={productForm.category} onChange={(event) => setProductField("category", event.target.value)} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-card focus:outline-none focus:border-[#C4562A]">
                <option value="" disabled>Select category</option>
                {availableCategories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
              </select>
              {showNewCategory && (
                <div className="mt-2 flex gap-2">
                  <input autoFocus value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="New category" className="min-w-0 flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C4562A]" />
                  <button type="button" disabled={categorySaving || !newCategoryName.trim()} onClick={() => void handleCreateCategory()} className="bg-[#1A1A18] disabled:opacity-50 text-white px-3 rounded-lg text-xs font-semibold">{categorySaving ? "Adding…" : "Add"}</button>
                </div>
              )}
              {categoryError && <p role="alert" className="mt-1.5 text-xs text-red-600">{categoryError}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fabric</label>
                <button type="button" onClick={() => setShowNewFabric((current) => !current)} className="text-xs font-semibold text-[#C4562A] hover:underline flex items-center gap-1">
                  <Plus size={12}/> Add new
                </button>
              </div>
              <select required value={productForm.fabric} onChange={(event) => setProductField("fabric", event.target.value)} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-card focus:outline-none focus:border-[#C4562A]">
                <option value="" disabled>Select fabric</option>
                {availableFabrics.map((fabric) => <option key={fabric} value={fabric}>{fabric}</option>)}
              </select>
              {showNewFabric && (
                <div className="mt-2 flex gap-2">
                  <input autoFocus value={newFabricName} onChange={(event) => setNewFabricName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); handleAddFabric(); } }} placeholder="New fabric" className="min-w-0 flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C4562A]" />
                  <button type="button" disabled={!newFabricName.trim()} onClick={handleAddFabric} className="bg-[#1A1A18] disabled:opacity-50 text-white px-3 rounded-lg text-xs font-semibold">Add</button>
                </div>
              )}
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">Description</label>
              <textarea required value={productForm.description} onChange={(event) => setProductField("description", event.target.value)} rows={3} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C4562A] resize-none" />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">Product media</label>
              {productMediaCount > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-3">
                  {retainedProductMedia.map((item, index) => (
                    <div key={item.id} className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border bg-muted group">
                      <img src={item.url} alt={item.altText || `${productForm.name} image ${index + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-2 left-2 rounded bg-black/65 px-2 py-1 text-[10px] font-semibold text-white">Current</span>
                      <button
                        type="button"
                        disabled={productMediaCount <= 1}
                        onClick={() => setRetainedProductMedia((current) => current.filter((media) => media.id !== item.id))}
                        aria-label={`Remove current image ${index + 1}`}
                        title={productMediaCount <= 1 ? "A product must keep at least one image" : "Remove image"}
                        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-red-600 shadow-md transition-colors hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                  {productFilePreviews.map(({ file, url }, index) => (
                    <div key={`${file.name}-${file.lastModified}-${index}`} className="relative aspect-[3/4] overflow-hidden rounded-xl border-2 border-[#C4562A]/35 bg-muted group">
                      <img src={url} alt={`New upload preview ${index + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-2 left-2 rounded bg-[#C4562A] px-2 py-1 text-[10px] font-semibold text-white">New</span>
                      <button
                        type="button"
                        disabled={productMediaCount <= 1}
                        onClick={() => setProductFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                        aria-label={`Remove new image ${index + 1}`}
                        title={productMediaCount <= 1 ? "A product must keep at least one image" : "Remove image"}
                        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-red-600 shadow-md transition-colors hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg px-4 py-6 text-sm text-muted-foreground cursor-pointer hover:border-[#C4562A]">
                <input required={productMediaCount === 0} type="file" accept="image/*" multiple className="sr-only" onChange={(event) => {
                  const selectedFiles = Array.from(event.target.files ?? []);
                  setProductFiles((current) => [...current, ...selectedFiles]);
                  event.currentTarget.value = "";
                }} />
                <Upload size={16} /> {productMediaCount ? "Add more images" : "Choose images for Cloudinary"}
              </label>
              <p className="mt-2 text-xs text-muted-foreground">{productMediaCount} image{productMediaCount === 1 ? "" : "s"} in this product gallery. At least one image is required.</p>
            </div>
          </div>
          {saveError && <p role="alert" className="mt-4 text-sm text-red-600">{saveError}</p>}
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => { resetProductForm(); setShowForm(false); }} className="border border-border px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-muted transition-colors">Cancel</button>
            <button disabled={saving || productMediaCount === 0} type="submit" className="bg-[#C4562A] disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#A8411B] transition-colors">{saving ? "Uploading & saving…" : editingProduct ? "Update Product" : "Save Product"}</button>
          </div>
        </form>
      )}

      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="px-6 py-4 border-b border-border flex gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products..." className="w-full pl-9 pr-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:border-[#C4562A]" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Product","Fabric","Category","Price","Stock","Actions"].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={p.images[0]} alt={p.name} className="w-10 h-12 rounded-lg object-cover bg-[#E8E2D9]" />
                      <div>
                        <p className="font-semibold">{p.name}</p>
                        {p.badge && <span className="text-[10px] bg-[#C4562A] text-white px-1.5 py-0.5 rounded font-bold">{p.badge}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{p.fabric}</td>
                  <td className="px-6 py-4 text-muted-foreground">{p.category}</td>
                  <td className="px-6 py-4 font-bold text-[#C4562A]">{ghs(p.price)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${!p.isActive ? "bg-gray-100 text-gray-600" : p.inStock ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      {!p.isActive ? "Archived" : p.inStock ? "In Stock" : "Out of Stock"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditProduct(p)} aria-label={`Edit ${p.name}`} className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-[#1A1A18]"><Edit size={14}/></button>
                      {p.isActive && <button onClick={() => window.open(`/product/${p.slug}`, "_blank", "noopener,noreferrer")} aria-label={`View ${p.name}`} className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-[#C4562A]"><Eye size={14}/></button>}
                      <button onClick={() => void handleArchiveProduct(p)} aria-label={`Archive ${p.name}`} className="p-1.5 hover:bg-red-50 rounded transition-colors text-muted-foreground hover:text-red-600"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminArchivedProducts({ setPage }: { setPage: (page: string) => void }) {
  const { products, refresh } = useAdminData();
  const [search, setSearch] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const archivedProducts = products
    .filter((product) => !product.isActive)
    .filter((product) => product.name.toLowerCase().includes(search.toLowerCase())
      || product.sku.toLowerCase().includes(search.toLowerCase())
      || product.fabric.toLowerCase().includes(search.toLowerCase()));

  const handleRestore = async (product: Product) => {
    setRestoringId(product.id);
    setMessage("");
    setError("");
    try {
      await restoreProduct(product.id, product.inventoryQuantity);
      await refresh();
      setMessage(`${product.name} was restored to the active products list.`);
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : "The product could not be restored.");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="p-8" style={{ fontFamily: "var(--font-body)" }}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Archived Products</h1>
          <p className="text-muted-foreground text-sm mt-1">{archivedProducts.length} archived product{archivedProducts.length === 1 ? "" : "s"}</p>
        </div>
        <button type="button" onClick={() => setPage("products")} className="border border-border bg-card px-4 py-2.5 rounded-lg text-sm font-semibold hover:border-[#C4562A] hover:text-[#C4562A] transition-colors">
          Back to Products
        </button>
      </div>

      {message && <p role="status" className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</p>}
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <section className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search archived products…" className="w-full pl-9 pr-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:border-[#C4562A]" />
          </div>
        </div>

        {archivedProducts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Archive size={34} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-semibold">{search ? "No archived products match your search." : "There are no archived products."}</p>
            <p className="text-sm text-muted-foreground mt-1">Archived products will appear here and can be restored at any time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Product", "SKU", "Fabric", "Category", "Price", "Stock", "Action"].map((heading) => <th key={heading} className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {archivedProducts.map((product) => (
                  <tr key={product.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 min-w-[220px]">
                        <img src={product.images[0]} alt="" className="w-12 h-14 rounded-lg object-cover bg-[#E8E2D9] grayscale-[20%]" />
                        <div><p className="font-semibold">{product.name}</p><span className="inline-block mt-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">Archived</span></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{product.sku}</td>
                    <td className="px-6 py-4 text-muted-foreground">{product.fabric}</td>
                    <td className="px-6 py-4 text-muted-foreground">{product.category}</td>
                    <td className="px-6 py-4 font-bold text-[#C4562A]">{ghs(product.price)}</td>
                    <td className="px-6 py-4 text-muted-foreground">{product.inventoryQuantity}</td>
                    <td className="px-6 py-4">
                      <button type="button" disabled={restoringId === product.id} onClick={() => void handleRestore(product)} className="rounded-lg bg-[#1A1A18] px-4 py-2 text-xs font-semibold text-white hover:bg-[#C4562A] disabled:opacity-50 transition-colors">
                        {restoringId === product.id ? "Restoring…" : "Restore"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── ADMIN ORDERS ──────────────────────────────────────────────────────────
function AdminOrders() {
  const { orders: ORDERS_DATA, refresh } = useAdminData();
  const [filter, setFilter] = useState("All");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "last-week" | "last-month" | "custom">("all");
  const [customStart, setCustomStart] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 29);
    return dateInputValue(date);
  });
  const [customEnd, setCustomEnd] = useState(() => dateInputValue(new Date()));
  const [selected, setSelected] = useState<(typeof ORDERS_DATA)[0] | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const statuses = ["All","Draft (not paid)","Paid","Processing","Shipped","Delivered","Cancelled"];
  const orderDateRange = useMemo<AdminDateRange | null>(() => {
    if (datePreset === "all") return null;
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    if (datePreset === "today") {
      return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end, label: "Today" };
    }
    if (datePreset === "last-week") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      return { start, end, label: "Last 7 days" };
    }
    if (datePreset === "last-month") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      return { start, end, label: "Last 30 days" };
    }
    const start = dateFromInput(customStart);
    const inclusiveEnd = dateFromInput(customEnd);
    if (inclusiveEnd < start) inclusiveEnd.setTime(start.getTime());
    const customRangeEnd = new Date(inclusiveEnd);
    customRangeEnd.setDate(customRangeEnd.getDate() + 1);
    const formatter = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" });
    return { start, end: customRangeEnd, label: `${formatter.format(start)} – ${formatter.format(inclusiveEnd)}` };
  }, [datePreset, customStart, customEnd]);
  const filtered = useMemo(() => ORDERS_DATA.filter((order) => {
    const statusMatches = filter === "All" || order.status === filter;
    const dateMatches = !orderDateRange || dateInAdminRange(order.createdAt, orderDateRange);
    return statusMatches && dateMatches;
  }), [ORDERS_DATA, filter, orderDateRange]);
  const selectOrder = (order: (typeof ORDERS_DATA)[number]) => {
    setSelected(order);
    setSelectedStatus(order.status);
    setStatusMessage("");
  };
  const handleStatusSave = async () => {
    if (!selected) return;
    setStatusSaving(true);
    setStatusMessage("");
    try {
      await updateOrderStatus(selected.databaseId, selectedStatus);
      setSelected({ ...selected, status: selectedStatus });
      await refresh();
      setStatusMessage("Order status updated.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "The order status could not be updated.");
    } finally {
      setStatusSaving(false);
    }
  };
  const exportOrders = () => downloadCsv("aunty-sala-orders.csv", [
    ["Order", "Customer", "Items", "Amount", "Status", "Date"],
    ...filtered.map((order) => [order.id, order.customer, order.items, order.amount, order.status, order.date]),
  ]);

  return (
    <div className="p-8" style={{ fontFamily: "var(--font-body)" }}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} shown · {ORDERS_DATA.length} total orders</p>
        </div>
        <button onClick={exportOrders} className="border border-border px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-muted transition-colors flex items-center gap-2">
          <Download size={14}/> Export CSV
        </button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filter === s ? "bg-[#C4562A] text-white border-[#C4562A]" : "border-border hover:border-[#C4562A]"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="mb-6 rounded-xl border border-border/60 bg-card p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Order Date</p>
          <p className="text-xs text-muted-foreground">{orderDateRange?.label ?? "All recorded dates"}</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "All Dates"],
              ["today", "Today"],
              ["last-week", "Last Week"],
              ["last-month", "Last Month"],
              ["custom", "Custom Range"],
            ].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setDatePreset(key as typeof datePreset)}
                className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${datePreset === key ? "bg-[#1A1A18] border-[#1A1A18] text-white" : "border-border hover:border-[#C4562A]"}`}>
                {label}
              </button>
            ))}
          </div>
          {datePreset === "custom" && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="flex items-center gap-2"><span className="text-muted-foreground">From</span><input type="date" value={customStart} max={customEnd} onChange={(event) => setCustomStart(event.target.value)} className="border border-border rounded-lg bg-card px-3 py-2" /></label>
              <label className="flex items-center gap-2"><span className="text-muted-foreground">To</span><input type="date" value={customEnd} min={customStart} max={dateInputValue(new Date())} onChange={(event) => setCustomEnd(event.target.value)} className="border border-border rounded-lg bg-card px-3 py-2" /></label>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Order","Customer","Amount","Status","Date"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id} onClick={() => selectOrder(o)}
                    className={`border-b border-border/50 cursor-pointer transition-colors ${selected?.id === o.id ? "bg-[#C4562A]/5" : "hover:bg-muted/30"}`}>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs font-bold text-[#C4562A]">{o.id}</span>
                      {o.custom && <span className="ml-1.5 text-[9px] bg-[#B8922A] text-white px-1.5 py-0.5 rounded font-bold">CUSTOM</span>}
                    </td>
                    <td className="px-5 py-3.5 font-medium">{o.customer}</td>
                    <td className="px-5 py-3.5 font-bold">{ghs(o.amount)}</td>
                    <td className="px-5 py-3.5"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColor[o.status]}`}>{o.status}</span></td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs">{o.date}</td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">No orders match the selected status and date filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
              <div className="flex justify-between items-start gap-4 px-6 py-5 border-b border-border bg-gradient-to-br from-[#C4562A]/8 to-transparent">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-mono text-base font-bold text-[#C4562A]">{selected.id}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor[selected.status]}`}>{selected.status}</span>
                  </div>
                  <p className="text-muted-foreground text-xs flex items-center gap-1.5"><Calendar size={12}/>{selected.date}</p>
                </div>
                <button onClick={() => setSelected(null)} aria-label="Close order details" className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-[#1A1A18] hover:bg-black/5 transition-colors"><X size={17}/></button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="rounded-xl bg-[#F0EAE0]/70 p-4 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Customer</p>
                    <p className="font-semibold text-sm truncate" title={selected.customer}>{selected.customer}</p>
                  </div>
                  <div className="rounded-xl bg-[#C4562A]/8 p-4 text-right">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Order Total</p>
                    <p className="font-bold text-lg text-[#C4562A]">{ghs(selected.amount)}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Order Items</h3>
                    <span className="text-xs font-semibold text-[#C4562A]">{selected.itemDetails.reduce((sum, item) => sum + item.quantity, 0)} item{selected.itemDetails.reduce((sum, item) => sum + item.quantity, 0) === 1 ? "" : "s"}</span>
                  </div>
                  <div className="space-y-3">
                    {selected.itemDetails.map((item, index) => (
                      <article key={`${item.sku}-${index}`} className="rounded-xl border border-border/70 p-3 flex gap-3 bg-white/60">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-14 h-[68px] rounded-lg object-cover bg-[#E8E2D9] shrink-0" />
                        ) : (
                          <div className="w-14 h-[68px] rounded-lg bg-[#E8E2D9] flex items-center justify-center shrink-0"><ShoppingBag size={19} className="text-muted-foreground/50" /></div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm leading-snug">{item.name}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{item.sku} · {item.fabric} · {item.category}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-[#1A1A18] text-white text-[10px] font-bold px-2 py-1">×{item.quantity}</span>
                          </div>
                          <div className="flex flex-wrap items-end justify-between gap-2 mt-2">
                            <div className="flex flex-wrap gap-1.5">
                              {item.size && <span className="rounded bg-[#F0EAE0] px-2 py-1 text-[10px] font-semibold">Size {item.size}</span>}
                              {item.color && <span className="rounded bg-[#F0EAE0] px-2 py-1 text-[10px] font-semibold">{item.color}</span>}
                            </div>
                            <p className="text-xs font-bold text-[#C4562A]">{ghs(item.unitPrice * item.quantity)}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-5 mb-4">
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wide text-muted-foreground">Update Status</label>
                <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C4562A]">
                  {statuses.filter((status) => status !== "All").map((status) => (
                    <option key={status} disabled={(status === "Paid" && selected.status === "Draft (not paid)") || (status === "Draft (not paid)" && selected.status !== "Draft (not paid)")}>
                      {status}
                    </option>
                  ))}
                </select>
                {selected.status === "Draft (not paid)" && <p className="text-xs text-muted-foreground mt-2">Paid is set automatically after Paystack verifies the payment.</p>}
                </div>
                <div className="flex gap-2">
                  <button disabled={statusSaving || selectedStatus === selected.status} onClick={() => void handleStatusSave()} className="flex-1 bg-[#C4562A] disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#A8411B] transition-colors">{statusSaving ? "Saving…" : "Save Status"}</button>
                  <button onClick={() => window.print()} aria-label={`Print ${selected.id}`} className="p-2.5 border border-border rounded-lg hover:bg-muted transition-colors"><Printer size={15}/></button>
                </div>
                {statusMessage && <p role="status" className="mt-3 text-xs text-muted-foreground">{statusMessage}</p>}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border/50 shadow-sm p-6 flex flex-col items-center justify-center h-48 text-center">
              <Package size={28} className="text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Select an order to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN CUSTOM ORDERS KANBAN ────────────────────────────────────────────
function AdminCustomOrders() {
  const { tailoringItems, refresh } = useAdminData();
  const [items, setItems] = useState(tailoringItems);
  const [selected, setSelected] = useState<(typeof tailoringItems)[number] | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropColumn, setDropColumn] = useState<string | null>(null);
  const draggedRef = useRef(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [quoteSaving, setQuoteSaving] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ price: "", dueDate: "", paymentPlan: "full" as "full" | "deposit", depositPercentage: "50" });
  useEffect(() => {
    setItems(tailoringItems);
    setSelected((current) => current ? tailoringItems.find((item) => item.id === current.id) ?? null : null);
  }, [tailoringItems]);
  useEffect(() => {
    if (!selected) return;
    setQuoteForm({
      price: selected.quotedPrice == null ? "" : String(selected.quotedPrice),
      dueDate: selected.dueDateValue,
      paymentPlan: selected.paymentPlan === "deposit" ? "deposit" : "full",
      depositPercentage: String(selected.depositPercentage || 50),
    });
  }, [selected?.id, selected?.quotedPrice, selected?.dueDateValue, selected?.paymentPlan, selected?.depositPercentage]);
  const byCol = (col: string) => items.filter(i => i.col === col);

  const moveItem = async (id: string, toCol: string) => {
    const currentItem = items.find((item) => item.id === id);
    if (!currentItem || currentItem.col === toCol || savingId === id) return;
    const previousItems = items;
    setItems(prev => prev.map(i => i.id === id ? { ...i, col: toCol } : i));
    setSelected((current) => current?.id === id ? { ...current, col: toCol } : current);
    setSavingId(id);
    setStatusMessage("");
    try {
      await updateCustomOrderStatus(id, toCol);
      await refresh();
      setStatusMessage("Tailoring status updated.");
    } catch (error) {
      setItems(previousItems);
      setSelected((current) => current?.id === id ? { ...current, col: currentItem.col } : current);
      setStatusMessage(error instanceof Error ? error.message : "The tailoring status could not be updated.");
    } finally {
      setSavingId(null);
    }
  };

  const saveQuote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    setQuoteSaving(true);
    setStatusMessage("");
    try {
      await setCustomOrderQuote({
        customOrderId: selected.id,
        quotedPrice: Number(quoteForm.price),
        dueDate: quoteForm.dueDate,
        paymentPlan: quoteForm.paymentPlan,
        depositPercentage: Number(quoteForm.depositPercentage),
      });
      await refresh();
      setStatusMessage(`Quote sent for ${selected.reference}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "The quote could not be saved.");
    } finally {
      setQuoteSaving(false);
    }
  };

  return (
    <div className="p-8" style={{ fontFamily: "var(--font-body)" }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Tailoring Queue</h1>
        <p className="text-muted-foreground text-sm mt-1">Drag cards between stages, or click one to view the complete custom-order brief</p>
      </div>
      {statusMessage && <p role="status" className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {KANBAN_COLS.map(col => (
            <div key={col.key}
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropColumn(col.key); }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropColumn((current) => current === col.key ? null : current); }}
              onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData("text/plain") || draggedId;
                setDropColumn(null);
                setDraggedId(null);
                if (id) void moveItem(id, col.key);
              }}
              className={`w-56 rounded-xl border shadow-sm flex flex-col transition-colors ${dropColumn === col.key ? "bg-[#C4562A]/5 border-[#C4562A]" : "bg-card border-border/50"}`}>
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.color.includes("blue") ? "bg-blue-500" : col.color.includes("yellow") ? "bg-yellow-500" : col.color.includes("orange") ? "bg-orange-500" : col.color.includes("purple") ? "bg-purple-500" : col.color.includes("pink") ? "bg-pink-500" : "bg-green-500"}`} />
                  <span className="font-bold text-sm">{col.label}</span>
                </div>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-semibold">{byCol(col.key).length}</span>
              </div>
              <div className="p-3 flex flex-col gap-2.5 flex-1">
                {byCol(col.key).map(item => (
                  <div key={item.id} draggable={savingId !== item.id}
                    onDragStart={(event) => {
                      draggedRef.current = true;
                      setDraggedId(item.id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", item.id);
                    }}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setDropColumn(null);
                      window.setTimeout(() => { draggedRef.current = false; }, 0);
                    }}
                    onClick={() => { if (!draggedRef.current) setSelected(item); }}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(item); } }}
                    role="button" tabIndex={0} aria-label={`View ${item.reference} details`}
                    className={`bg-background border rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing transition-all focus:outline-none focus:ring-2 focus:ring-[#C4562A]/40 ${draggedId === item.id ? "opacity-40 scale-[0.98]" : "border-border/60 hover:border-[#C4562A]/50 hover:shadow-md"}`}>
                    <p className="font-mono text-[10px] text-[#C4562A] font-bold mb-1">{item.reference}</p>
                    <p className="font-semibold text-xs leading-snug mb-1">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug mb-2">{item.item}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Calendar size={10}/> {item.due || "No due date"}</span>
                      <select disabled={savingId === item.id} value={item.col}
                        onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}
                        onChange={e => void moveItem(item.id, e.target.value)}
                        className="text-[10px] border border-border rounded px-1.5 py-0.5 focus:outline-none focus:border-[#C4562A] bg-card">
                        {KANBAN_COLS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
                {byCol(col.key).length === 0 && (
                  <div className={`border-2 border-dashed rounded-lg h-20 flex items-center justify-center transition-colors ${dropColumn === col.key ? "border-[#C4562A] text-[#C4562A]" : "border-border text-muted-foreground"}`}>
                    <span className="text-xs">{dropColumn === col.key ? "Drop here" : "Empty"}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center" onMouseDown={() => setSelected(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="custom-order-detail-title" onMouseDown={(event) => event.stopPropagation()}
            className="bg-[#FAF7F2] rounded-2xl shadow-2xl border border-white/30 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-[#1A1A18] text-white px-6 py-5 flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 id="custom-order-detail-title" className="font-mono text-lg font-bold text-[#D6B450]">{selected.reference}</h2>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">{KANBAN_COLS.find((column) => column.key === selected.col)?.label ?? selected.col}</span>
                </div>
                <p className="text-white/60 text-sm">Submitted {new Intl.DateTimeFormat("en-GH", { dateStyle: "medium" }).format(new Date(selected.createdAt))}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close custom order details" className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"><X size={18}/></button>
            </div>

            <div className="p-6 md:p-8 space-y-7">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-border bg-card p-4"><p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Customer</p><p className="font-bold">{selected.name}</p></div>
                <a href={`mailto:${selected.email}`} className="rounded-xl border border-border bg-card p-4 hover:border-[#C4562A] transition-colors"><p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Email</p><p className="font-semibold text-sm break-all">{selected.email}</p></a>
                <a href={`tel:${selected.phone.replace(/[^\d+]/g, "")}`} className="rounded-xl border border-border bg-card p-4 hover:border-[#C4562A] transition-colors"><p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Phone</p><p className="font-semibold text-sm">{selected.phone}</p></a>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Design brief</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[["Style", selected.style], ["Fabric", selected.fabric], ["Occasion", selected.occasion || "Not specified"], ["Budget", selected.budget || "Not specified"], ["Quote", selected.quotedPrice == null ? "Not quoted" : ghs(selected.quotedPrice)], ["Due date", selected.due || "Not scheduled"]].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-[#F0EAE0] p-4"><p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">{label}</p><p className="font-semibold text-sm">{value}</p></div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Measurements</h3>
                  {selected.measurements.length > 0 ? <div className="grid grid-cols-2 gap-2">{selected.measurements.map((measurement) => <div key={measurement.label} className="rounded-lg border border-border bg-card p-3 flex justify-between gap-3 text-sm"><span className="text-muted-foreground">{measurement.label}</span><strong>{measurement.value}</strong></div>)}</div> : <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">No measurements were submitted.</p>}
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Customer notes</h3>
                  <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground leading-relaxed min-h-24">{selected.notes || "No additional notes."}</p>
                </div>
              </div>

              {selected.referenceMedia.length > 0 && <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Reference media</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{selected.referenceMedia.map((media, index) => <a key={`${media.url}-${index}`} href={media.url} target="_blank" rel="noreferrer" className="rounded-xl border border-border overflow-hidden bg-card hover:border-[#C4562A] transition-colors">
                  {media.resourceType === "video" ? <video src={media.url} className="w-full aspect-square object-cover" /> : <img src={media.url} alt={`${selected.reference} reference ${index + 1}`} className="w-full aspect-square object-cover" />}
                  <p className="p-2 text-[10px] text-muted-foreground truncate">{media.name}</p>
                </a>)}</div>
              </div>}

              <form onSubmit={saveQuote} className="rounded-2xl border border-[#B8922A]/30 bg-[#B8922A]/5 p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                  <div><h3 className="font-bold text-lg" style={{ fontFamily: "var(--font-display)" }}>Quote &amp; Payment</h3><p className="text-xs text-muted-foreground mt-1">Saving sends the customer an email and WhatsApp payment invitation.</p></div>
                  <span className={`self-start rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${selected.paymentStatus === "paid" ? "bg-green-100 text-green-700" : selected.paymentStatus === "partially_paid" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>{selected.paymentStatus.replace(/_/g, " ")}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <label><span className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Price ({selected.currency})</span><input required disabled={selected.amountPaid > 0} type="number" min="1" step="0.01" value={quoteForm.price} onChange={(event) => setQuoteForm((current) => ({ ...current, price: event.target.value }))} className="w-full border border-border rounded-lg bg-card px-3 py-2.5 text-sm disabled:opacity-60" /></label>
                  <label><span className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Due date</span><input type="date" value={quoteForm.dueDate} onChange={(event) => setQuoteForm((current) => ({ ...current, dueDate: event.target.value }))} className="w-full border border-border rounded-lg bg-card px-3 py-2.5 text-sm" /></label>
                  <label><span className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Payment plan</span><select disabled={selected.amountPaid > 0} value={quoteForm.paymentPlan} onChange={(event) => setQuoteForm((current) => ({ ...current, paymentPlan: event.target.value as "full" | "deposit" }))} className="w-full border border-border rounded-lg bg-card px-3 py-2.5 text-sm disabled:opacity-60"><option value="full">Full payment</option><option value="deposit">Deposit + balance</option></select></label>
                  {quoteForm.paymentPlan === "deposit" && <label><span className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Deposit %</span><input required disabled={selected.amountPaid > 0} type="number" min="1" max="99" value={quoteForm.depositPercentage} onChange={(event) => setQuoteForm((current) => ({ ...current, depositPercentage: event.target.value }))} className="w-full border border-border rounded-lg bg-card px-3 py-2.5 text-sm disabled:opacity-60" /></label>}
                </div>
                {selected.quotedPrice != null && <div className="grid grid-cols-3 gap-3 mt-4 text-sm"><div><span className="block text-[10px] uppercase text-muted-foreground">Quoted</span><strong>{ghs(selected.quotedPrice)}</strong></div><div><span className="block text-[10px] uppercase text-muted-foreground">Paid</span><strong className="text-green-700">{ghs(selected.amountPaid)}</strong></div><div><span className="block text-[10px] uppercase text-muted-foreground">Balance</span><strong className="text-[#C4562A]">{ghs(Math.max(0, selected.quotedPrice - selected.amountPaid))}</strong></div></div>}
                <button disabled={quoteSaving || !quoteForm.price || selected.paymentStatus === "paid"} type="submit" className="mt-4 bg-[#C4562A] disabled:opacity-50 text-white rounded-lg px-5 py-2.5 text-sm font-bold hover:bg-[#A8411B]">{quoteSaving ? "Sending quote…" : selected.quoteStatus === "pending" ? "Save & Send Quote" : "Update & Resend Quote"}</button>
              </form>

              <div className="border-t border-border pt-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="w-full sm:max-w-xs">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Move to stage</label>
                  <select disabled={savingId === selected.id} value={selected.col} onChange={(event) => void moveItem(selected.id, event.target.value)} className="w-full border border-border rounded-lg bg-card px-3 py-3 text-sm font-semibold focus:outline-none focus:border-[#C4562A]">
                    {KANBAN_COLS.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}
                  </select>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="border border-border rounded-lg px-5 py-3 text-sm font-semibold hover:bg-muted">Close</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN CUSTOMERS ───────────────────────────────────────────────────────
function AdminCustomers() {
  const { customers: CUSTOMERS_DATA } = useAdminData();
  const [selected, setSelected] = useState<(typeof CUSTOMERS_DATA)[0] | null>(null);
  const [search, setSearch] = useState("");
  const filtered = CUSTOMERS_DATA.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.email.includes(search.toLowerCase())
  );

  return (
    <div className="p-8" style={{ fontFamily: "var(--font-body)" }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Customers</h1>
        <p className="text-muted-foreground text-sm mt-1">{CUSTOMERS_DATA.length} registered customers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border/50 shadow-sm">
          <div className="px-5 py-4 border-b border-border">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search customers..." className="w-full pl-9 pr-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:border-[#C4562A]" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Customer","Location","Orders","Spent","Joined"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} onClick={() => setSelected(c)}
                    className={`border-b border-border/50 cursor-pointer transition-colors ${selected?.id === c.id ? "bg-[#C4562A]/5" : "hover:bg-muted/30"}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#C4562A]/10 rounded-full flex items-center justify-center text-xs font-bold text-[#C4562A]">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{c.location}</td>
                    <td className="px-5 py-3.5 font-semibold">{c.orders}</td>
                    <td className="px-5 py-3.5 font-bold text-[#C4562A]">{ghs(c.spent)}</td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs">{c.joined}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Profile */}
        <div>
          {selected ? (
            <div className="bg-card rounded-xl border border-border/50 shadow-sm p-6">
              <div className="text-center mb-5">
                <div className="w-14 h-14 bg-[#C4562A]/10 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold text-[#C4562A]">
                  {selected.name.charAt(0)}
                </div>
                <p className="font-bold text-base">{selected.name}</p>
                <p className="text-xs text-muted-foreground">{selected.email}</p>
                <p className="text-xs text-muted-foreground">{selected.location} · Since {selected.joined}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[["Total Orders", selected.orders],["Total Spent", ghs(selected.spent)]].map(([k,v]) => (
                  <div key={String(k)} className="bg-[#F0EAE0] rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{k}</p>
                    <p className="font-bold text-base">{v}</p>
                  </div>
                ))}
              </div>
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Saved Measurements</p>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {selected.measurements.map((measurement) => (
                    <div key={measurement.label} className="flex justify-between bg-[#F0EAE0] rounded px-2 py-1.5">
                      <span className="text-muted-foreground">{measurement.label}</span>
                      <span className="font-semibold">{measurement.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <a href={`mailto:${selected.email}?subject=${encodeURIComponent("Aunty Sala Fashion Gh")}`} className="w-full border border-border py-2.5 rounded-lg text-sm font-semibold hover:bg-muted transition-colors flex items-center justify-center gap-2">
                <Mail size={14}/> Email Customer
              </a>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border/50 shadow-sm p-6 flex flex-col items-center justify-center h-48 text-center">
              <Users size={28} className="text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Select a customer to view their profile</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN ANALYTICS ───────────────────────────────────────────────────────
function AdminAnalytics() {
  const { orders, customPayments, tailoringItems } = useAdminData();
  const dateFilter = useAdminDateRange();
  const { paidOrders, paidCustomOrderCount, periodCustomOrders, salesData: SALES_DATA, totalRevenue, fabricData } = useMemo(() => {
    const filteredPaidOrders = paidOrdersInRange(orders, dateFilter.range);
    const filteredCustomPayments = customPayments.filter((payment) => dateInAdminRange(payment.paidAt, dateFilter.range));
    const filteredCustomOrders = tailoringItems.filter((item) => dateInAdminRange(item.createdAt, dateFilter.range));
    const revenue = filteredPaidOrders.reduce((sum, order) => sum + order.amount, 0)
      + filteredCustomPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const fabricMap = new Map<string, { name: string; orderIds: Set<string>; revenue: number }>();
    filteredPaidOrders.forEach((order) => order.salesBreakdown.forEach((item) => {
      const name = item.fabric || "Other";
      const current = fabricMap.get(name) ?? { name, orderIds: new Set<string>(), revenue: 0 };
      current.orderIds.add(order.databaseId);
      current.revenue += item.revenue;
      fabricMap.set(name, current);
    }));
    filteredCustomPayments.forEach((payment) => {
      const name = payment.fabric || "Custom Tailoring";
      const current = fabricMap.get(name) ?? { name, orderIds: new Set<string>(), revenue: 0 };
      current.orderIds.add(`custom-${payment.customOrderId}`);
      current.revenue += payment.amount;
      fabricMap.set(name, current);
    });
    const revenueEvents = [
      ...filteredPaidOrders.map((order) => ({ amount: order.amount, paidAt: order.paidAt ?? order.createdAt })),
      ...filteredCustomPayments.map((payment) => ({ amount: payment.amount, paidAt: payment.paidAt })),
    ];
    return {
      paidOrders: filteredPaidOrders,
      paidCustomOrderCount: new Set(filteredCustomPayments.map((payment) => payment.customOrderId)).size,
      periodCustomOrders: filteredCustomOrders,
      salesData: revenueSeriesForRange(revenueEvents, dateFilter.range),
      totalRevenue: revenue,
      fabricData: [...fabricMap.values()].map((item) => ({ name: item.name, orders: item.orderIds.size, revenue: item.revenue })).sort((left, right) => right.revenue - left.revenue),
    };
  }, [orders, customPayments, tailoringItems, dateFilter.range]);
  const paidOrderCount = paidOrders.length + paidCustomOrderCount;
  const averageOrderValue = paidOrderCount ? Math.round(totalRevenue / paidOrderCount) : 0;

  return (
    <div className="p-8" style={{ fontFamily: "var(--font-body)" }}>
      <div className="mb-8 flex flex-col lg:flex-row lg:items-start justify-between gap-5">
        <div><h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Verified paid sales performance and trends</p></div>
        <AdminDateRangeFilter filter={dateFilter} />
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {[{ label: "Paid Revenue", value: ghs(totalRevenue) },
          { label: "Avg Paid Order", value: ghs(averageOrderValue) },
          { label: "Paid Orders", value: String(paidOrderCount) },
          { label: "Custom Requests", value: String(periodCustomOrders.length) }].map(m => (
          <div key={m.label} className="bg-card rounded-xl p-5 border border-border/50 shadow-sm text-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{m.label}</p>
            <p className="text-3xl font-bold text-[#C4562A]">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Revenue chart */}
        <div className="bg-card rounded-xl p-6 border border-border/50 shadow-sm">
          <h2 className="font-bold text-base mb-5" style={{ fontFamily: "var(--font-display)" }}>Paid Revenue &amp; Orders</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={SALES_DATA} barGap={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number, name: string) => [name === "revenue" ? `GH₵ ${v.toLocaleString()}` : v, name === "revenue" ? "Revenue" : "Orders"]} />
              <Bar dataKey="revenue" fill="#C4562A" radius={[4,4,0,0]} />
              <Bar dataKey="orders" fill="#B8922A" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Paid orders */}
        <div className="bg-card rounded-xl p-6 border border-border/50 shadow-sm">
          <h2 className="font-bold text-base mb-5" style={{ fontFamily: "var(--font-display)" }}>Paid Orders Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={SALES_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#C4562A" strokeWidth={2.5} dot={{ fill: "#C4562A", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Best Selling Fabrics */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-bold text-base" style={{ fontFamily: "var(--font-display)" }}>Best-Selling Fabrics</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Fabric","Orders","Revenue","Avg Order","Share"].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fabricData.map((f, i) => {
                const totalRev = fabricData.reduce((s,x) => s + x.revenue, 0);
                const share = totalRev > 0 ? Math.round(f.revenue / totalRev * 100) : 0;
                return (
                  <tr key={f.name} className="border-b border-border/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg" style={{ background: PIE_COLORS[i % PIE_COLORS.length], opacity: 0.8 }} />
                        <span className="font-semibold">{f.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold">{f.orders}</td>
                    <td className="px-6 py-4 font-bold text-[#C4562A]">{ghs(f.revenue)}</td>
                    <td className="px-6 py-4 text-muted-foreground">{ghs(Math.round(f.revenue/f.orders))}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-[#C4562A]" style={{ width: `${share}%` }} />
                        </div>
                        <span className="text-xs font-semibold">{share}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {fabricData.length === 0 && <tr><td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">No paid sales in this period.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN NOTIFICATIONS ──────────────────────────────────────────────────
const EMAIL_TEMPLATE_PREVIEWS = [
  {
    id: "account-created", name: "Welcome email", audience: "Customer", subject: "Welcome to Aunty Sala Fashion Gh",
    content: <><p>Hello Ama,</p><p>Your account has been created. You can now track orders, save addresses and measurements, and manage your wishlist.</p></>,
  },
  {
    id: "order-paid", name: "Order confirmed", audience: "Customer", subject: "Order #ASF-1084 confirmed",
    content: <><p>Hello Ama,</p><p>Payment for order <strong>#ASF-1084</strong> has been verified.</p><ul><li>Ama Sika Kente Blazer Dress × 1 — size M</li><li>Efe Indigo Batik Midi Dress × 1 — size L</li></ul><p><strong>Total:</strong> GHS 1,480.00</p><p>We will email you whenever its status changes.</p></>,
  },
  {
    id: "order-status", name: "Order status update", audience: "Customer", subject: "Order #ASF-1084 is now Shipped",
    content: <><p>Hello Ama,</p><p>Order <strong>#ASF-1084</strong> is now <strong>shipped</strong>.</p></>,
  },
  {
    id: "custom-submitted", name: "Custom order received", audience: "Customer", subject: "Custom order request received",
    content: <><p>Hello Ama,</p><p>We received your custom order request <strong>#CUSTOM-A82F14C0</strong> for an off-shoulder evening gown in Kente.</p><p>Our team will review it and contact you with the next steps.</p></>,
  },
  {
    id: "custom-quote", name: "Custom quote ready", audience: "Customer", subject: "Quote ready for #CUSTOM-A82F14C0",
    content: <><p>Hello Ama,</p><p>Your quote for custom order <strong>#CUSTOM-A82F14C0</strong> is ready.</p><p><strong>Quoted price:</strong> GHS 1,250.00<br/><strong>Payment plan:</strong> 50% deposit, then balance</p><p>Sign in to your account, open the order, and select <strong>Pay with Paystack</strong> to continue.</p></>,
  },
  {
    id: "custom-payment", name: "Custom payment received", audience: "Customer", subject: "Payment received for #CUSTOM-A82F14C0",
    content: <><p>Hello Ama,</p><p>Your deposit payment for custom order <strong>#CUSTOM-A82F14C0</strong> has been verified.</p><p><strong>Payment:</strong> GHS 625.00<br/><strong>Total paid:</strong> GHS 625.00 of GHS 1,250.00</p><p>We will keep you updated as your piece moves through production.</p></>,
  },
  {
    id: "newsletter", name: "Newsletter welcome", audience: "Customer", subject: "Welcome to the Aunty Sala newsletter",
    content: <><p>Thanks for joining the Aunty Sala Fashion Gh newsletter.</p><p>You will receive new collections, style stories, and selected offers from us.</p></>,
  },
  {
    id: "admin-account", name: "New customer account", audience: "Admin", subject: "New customer account created",
    content: <><p>A new customer account was created.</p><p><strong>Name:</strong> Ama Mensah<br/><strong>Email:</strong> ama@example.com</p></>,
  },
  {
    id: "admin-order", name: "New paid order", audience: "Admin", subject: "New paid order #ASF-1084",
    content: <><p>A new paid order is ready for processing.</p><p><strong>Order:</strong> #ASF-1084<br/><strong>Customer:</strong> Ama Mensah</p><ul><li>Ama Sika Kente Blazer Dress × 1 — size M</li><li>Efe Indigo Batik Midi Dress × 1 — size L</li></ul><p><strong>Total:</strong> GHS 1,480.00</p></>,
  },
  {
    id: "admin-contact", name: "Contact form message", audience: "Admin", subject: "New contact form message",
    content: <><p>A new contact form message was received.</p><p><strong>From:</strong> Ama Mensah (ama@example.com)<br/><strong>Subject:</strong> International delivery question</p><div style={{ whiteSpace: "pre-wrap" }}>Hello, please can you confirm delivery times to London for a made-to-measure dress?</div></>,
  },
  {
    id: "admin-custom", name: "New custom order", audience: "Admin", subject: "New custom order request",
    content: <><p>A new custom order request was received.</p><p><strong>Reference:</strong> #CUSTOM-A82F14C0<br/><strong>Customer:</strong> Ama Mensah (ama@example.com)<br/><strong>Phone:</strong> +233 24 000 0000<br/><strong>Style:</strong> Off-shoulder evening gown<br/><strong>Fabric:</strong> Kente</p></>,
  },
  {
    id: "admin-custom-payment", name: "Custom-order payment", audience: "Admin", subject: "Custom order payment #CUSTOM-A82F14C0",
    content: <><p>A verified custom-order payment was received.</p><p><strong>Reference:</strong> #CUSTOM-A82F14C0<br/><strong>Customer:</strong> Ama Mensah (ama@example.com)<br/><strong>Payment type:</strong> Deposit<br/><strong>Amount:</strong> GHS 625.00<br/><strong>Payment status:</strong> Partially paid</p></>,
  },
] as const;

function AdminEmailTemplates() {
  const [selectedId, setSelectedId] = useState(EMAIL_TEMPLATE_PREVIEWS[0].id);
  const selected = EMAIL_TEMPLATE_PREVIEWS.find((template) => template.id === selectedId) ?? EMAIL_TEMPLATE_PREVIEWS[0];

  return (
    <div className="p-8" style={{ fontFamily: "var(--font-body)" }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Email Templates</h1>
        <p className="text-muted-foreground text-sm mt-1">Preview the customer and admin emails sent by the notification service.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-6 items-start">
        <aside className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="font-semibold text-sm">Templates</p>
            <span className="text-xs text-muted-foreground">{EMAIL_TEMPLATE_PREVIEWS.length}</span>
          </div>
          <div className="p-2 max-h-[72vh] overflow-y-auto">
            {EMAIL_TEMPLATE_PREVIEWS.map((template) => (
              <button key={template.id} type="button" onClick={() => setSelectedId(template.id)} className={`w-full rounded-lg px-3 py-3 text-left transition-colors ${selected.id === template.id ? "bg-[#C4562A]/10 text-[#C4562A]" : "hover:bg-muted"}`}>
                <span className="block text-sm font-semibold">{template.name}</span>
                <span className={`inline-block mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${template.audience === "Customer" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>{template.audience}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0">
          <div className="bg-card rounded-xl border border-border/50 shadow-sm px-5 py-4 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject line</p><p className="font-semibold mt-1">{selected.subject}</p></div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${selected.audience === "Customer" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>{selected.audience} email</span>
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-auto bg-[#faf7f2] p-4 sm:p-8">
            <div style={{ maxWidth: 600, margin: "auto", padding: "32px 20px", color: "#1a1a18", fontFamily: "Arial, sans-serif" }}>
              <div style={{ borderTop: "6px solid #b8922a", background: "#fff", padding: 32, borderRadius: 10 }}>
                <div style={{ textAlign: "center", margin: "0 0 18px" }}>
                  <img src="/aunty-sala-logo.png" width="92" alt="Aunty Sala Fashion Gh" style={{ display: "block", width: 92, maxWidth: "100%", height: "auto", margin: "0 auto", border: 0 }} />
                </div>
                <p style={{ margin: "0 0 8px", color: "#b8922a", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", textAlign: "center" }}>Aunty Sala Fashion Gh</p>
                <h1 style={{ fontSize: 24, margin: "0 0 20px", fontFamily: "Arial, sans-serif" }}>{selected.subject}</h1>
                <div style={{ fontSize: 15, lineHeight: 1.7, color: "#4a4742" }}>{selected.content}</div>
              </div>
              <p style={{ fontSize: 11, color: "#777", textAlign: "center", marginTop: 20 }}>Your inner diva, everything fashionable.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function AdminNotifications() {
  const { notifications, refresh } = useAdminData();
  const [filter, setFilter] = useState("All");
  const [dispatching, setDispatching] = useState(false);
  const [message, setMessage] = useState("");
  const filtered = filter === "All" ? notifications : notifications.filter((notification) => notification.status === filter);
  const statuses = ["All", "Pending", "Processing", "Sent", "Failed"];
  const handleDispatch = async () => {
    setDispatching(true);
    setMessage("");
    await dispatchNotifications();
    await refresh();
    setDispatching(false);
    setMessage("Notification queue checked.");
  };
  return (
    <div className="p-8" style={{ fontFamily: "var(--font-body)" }}>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">Email and WhatsApp delivery history</p>
        </div>
        <button type="button" disabled={dispatching} onClick={() => void handleDispatch()} className="bg-[#C4562A] disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#A8411B] transition-colors flex items-center gap-2">
          <Send size={14}/>{dispatching ? "Checking…" : "Run Delivery"}
        </button>
      </div>
      {message && <p role="status" className="mb-4 text-sm text-green-700 bg-green-50 rounded-lg p-3">{message}</p>}
      <div className="flex gap-2 mb-6 flex-wrap">
        {statuses.map((status) => <button key={status} type="button" onClick={() => setFilter(status)} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filter === status ? "bg-[#C4562A] text-white border-[#C4562A]" : "border-border hover:border-[#C4562A]"}`}>{status}</button>)}
      </div>
      <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">{["Event", "Channel", "Recipient", "Status", "Attempts", "Created"].map((heading) => <th key={heading} className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{heading}</th>)}</tr></thead>
            <tbody>{filtered.map((notification) => <tr key={notification.id} className="border-b border-border/50 align-top">
              <td className="px-5 py-4"><p className="font-semibold">{notification.eventType}</p>{notification.subject && <p className="text-xs text-muted-foreground mt-1">{notification.subject}</p>}{notification.lastError && <p className="text-xs text-red-600 mt-1 max-w-sm">{notification.lastError}</p>}</td>
              <td className="px-5 py-4">{notification.channel}</td>
              <td className="px-5 py-4 font-mono text-xs">{notification.recipient}</td>
              <td className="px-5 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${notification.status === "Sent" ? "bg-green-50 text-green-700" : notification.status === "Failed" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{notification.status}</span></td>
              <td className="px-5 py-4">{notification.attempts}</td>
              <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">{notification.createdAt}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No notifications in this view.</p>}
      </div>
    </div>
  );
}

// ─── ADMIN SETTINGS ────────────────────────────────────────────────────────
type SettingsTab = "store" | "media" | "users";

const SETTINGS_TABS = [
  { key: "store", label: "Store details", description: "Identity, contact and notifications", icon: Settings },
  { key: "media", label: "Media library", description: "Storefront imagery and gallery", icon: Upload },
  { key: "users", label: "Team access", description: "Roles and admin permissions", icon: Users },
] as const;

function AdminSettings() {
  const { settings, users, media, refresh } = useAdminData();
  const [tab, setTab] = useState<SettingsTab>("store");
  const storeFields = [
    ["store_name", "Store name"], ["store_email", "Store email"], ["store_phone", "Store phone"],
    ["store_address", "Store address"], ["store_hours", "Store hours"],
    ["instagram_handle", "Instagram handle"], ["whatsapp_number", "WhatsApp number"],
    ["notification_admin_email", "Admin notification email"], ["notification_admin_whatsapp", "Admin notification WhatsApp"],
  ] as const;
  const settingText = (key: string) => {
    const value = settings[key];
    return typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);
  };
  const [storeForm, setStoreForm] = useState<Record<string, string>>(() => Object.fromEntries(storeFields.map(([key]) => [key, settingText(key)])));
  const [storeSaving, setStoreSaving] = useState(false);
  const [storeMessage, setStoreMessage] = useState("");
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminRole, setAdminRole] = useState<"staff" | "admin">("staff");
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [mediaPlacement, setMediaPlacement] = useState("home_hero");
  const [mediaAlt, setMediaAlt] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaSaving, setMediaSaving] = useState(false);
  const [mediaMessage, setMediaMessage] = useState("");
  const [mediaInputKey, setMediaInputKey] = useState(0);
  const mediaPlacements = [
    "home_hero", "home_custom_banner", "shop_banner", "custom_order_banner",
    "fabric_ankara", "fabric_kente", "fabric_batik", "fabric_mixed",
    "about_story", "about_workshop", "about_fabric", "about_textiles",
    "contact_banner", "contact_location", "gallery",
  ];
  useEffect(() => {
    setStoreForm(Object.fromEntries(storeFields.map(([key]) => [key, settingText(key)])));
  }, [settings]);
  const handleStoreSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStoreSaving(true);
    setStoreMessage("");
    try {
      await saveStoreSettings(storeForm);
      await refresh();
      setStoreMessage("Store information saved.");
    } catch (error) {
      setStoreMessage(error instanceof Error ? error.message : "Store information could not be saved.");
    } finally {
      setStoreSaving(false);
    }
  };
  const handleAddAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminSaving(true);
    setAdminMessage("");
    try {
      await addAdminUserByEmail(adminEmail, adminRole);
      await refresh();
      setAdminEmail("");
      setShowAddAdmin(false);
      setAdminMessage("Admin access added.");
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : "Admin access could not be added.");
    } finally {
      setAdminSaving(false);
    }
  };
  const handleAccessChange = async (id: string, role: "staff" | "admin", active: boolean) => {
    setAdminSaving(true);
    setAdminMessage("");
    try {
      await setAdminUserAccess(id, role, active);
      await refresh();
      setAdminMessage("Admin access updated.");
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : "Admin access could not be updated.");
    } finally {
      setAdminSaving(false);
    }
  };
  const handleMediaSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!mediaFile) return;
    setMediaSaving(true);
    setMediaMessage("");
    try {
      const [asset] = await uploadManyToCloudinary([mediaFile], `aunty-sala-fashion-gh/${mediaPlacement === "gallery" ? "gallery" : "site"}`);
      if (mediaPlacement === "gallery") await addGalleryMedia(mediaAlt, asset);
      else await saveSiteMedia(mediaPlacement, mediaAlt, asset);
      await refresh();
      setMediaMessage("Media uploaded to Cloudinary and saved.");
      setMediaFile(null);
      setMediaAlt("");
      setMediaInputKey((current) => current + 1);
    } catch (error) {
      setMediaMessage(error instanceof Error ? error.message : "The media could not be saved.");
    } finally {
      setMediaSaving(false);
    }
  };
  const handleMediaRemove = async (kind: "site" | "gallery", id: string, label: string) => {
    if (!window.confirm(`Remove ${label} from the site? The Cloudinary asset itself will be kept.`)) return;
    setMediaSaving(true);
    setMediaMessage("");
    try {
      await removeAdminMedia(kind, id);
      await refresh();
      setMediaMessage(`${label} was removed from the site.`);
    } catch (error) {
      setMediaMessage(error instanceof Error ? error.message : "The media could not be removed.");
    } finally {
      setMediaSaving(false);
    }
  };

  const activeUsers = users.filter((user) => user.active).length;

  return (
    <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 xl:p-8" style={{ fontFamily: "var(--font-body)" }}>
      <header className="relative mb-6 overflow-hidden rounded-3xl bg-[#1A1A18] px-6 py-7 text-white shadow-[0_18px_50px_rgba(26,26,24,0.16)] sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#C4562A]/20 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 right-1/3 h-28 w-28 rounded-full bg-[#B8922A]/10 blur-xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#D6B450]"><Settings size={12} /> Admin workspace</div>
            <h1 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>Store settings</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60">Manage the details, visual assets and team access that keep Aunty Sala Fashion Gh running smoothly.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[[storeFields.length, "Details"], [media.length, "Media"], [activeUsers, "Active team"]].map(([value, label]) => (
              <div key={label} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 backdrop-blur-sm sm:min-w-28 sm:px-4">
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wide text-white/45">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div role="tablist" aria-label="Settings sections" className="mb-7 grid grid-cols-1 gap-2 rounded-2xl border border-border/60 bg-card p-2 shadow-sm sm:grid-cols-3">
        {SETTINGS_TABS.map((item) => {
          const TabIcon = item.icon;
          const selected = tab === item.key;
          return (
            <button key={item.key} id={`settings-tab-${item.key}`} type="button" role="tab" aria-selected={selected} aria-controls={`settings-panel-${item.key}`} onClick={() => setTab(item.key)}
              className={`group flex min-w-0 items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4562A]/40 ${selected ? "border-[#C4562A]/25 bg-[#C4562A] text-white shadow-[0_8px_20px_rgba(196,86,42,0.22)]" : "border-transparent text-[#1A1A18] hover:border-border hover:bg-[#F6F0E7]"}`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${selected ? "bg-white/15 text-white" : "bg-[#C4562A]/8 text-[#C4562A] group-hover:bg-[#C4562A]/12"}`}><TabIcon size={18} /></span>
              <span className="min-w-0"><span className="block text-sm font-bold">{item.label}</span><span className={`mt-0.5 block truncate text-[11px] ${selected ? "text-white/65" : "text-muted-foreground"}`}>{item.description}</span></span>
            </button>
          );
        })}
      </div>

      {tab === "store" && (
        <form id="settings-panel-store" role="tabpanel" aria-labelledby="settings-tab-store" onSubmit={handleStoreSave} className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div><h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>Store details</h2><p className="mt-1 text-xs text-muted-foreground">Keep customer-facing and operational information accurate.</p></div>
            <span className="self-start rounded-full bg-[#7A8C6E]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#526346]">Live on storefront</span>
          </div>
          <div className="grid grid-cols-1 gap-4 bg-[#F8F4ED]/60 p-4 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
            {storeFields.map(([key, label]) => (
              <label key={key} htmlFor={`setting-${key}`} className={`rounded-2xl border border-border/60 bg-card p-4 shadow-[0_5px_20px_rgba(26,26,24,0.035)] ${key === "store_address" ? "md:col-span-2" : ""}`}>
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
                <input id={`setting-${key}`} type={key.includes("email") ? "email" : key.includes("phone") || key.includes("whatsapp") ? "tel" : "text"} value={storeForm[key] ?? ""} onChange={(event) => setStoreForm((current) => ({ ...current, [key]: event.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm transition-all focus:border-[#C4562A] focus:outline-none focus:ring-4 focus:ring-[#C4562A]/8" />
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-4 border-t border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{storeMessage || "Changes appear on the storefront after saving."}</p>
            <button disabled={storeSaving} type="submit" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#C4562A] px-6 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(196,86,42,0.18)] transition-colors hover:bg-[#A8411B] disabled:cursor-not-allowed disabled:opacity-50">{storeSaving ? <><Clock size={15}/> Saving…</> : <><Check size={15}/> Save store details</>}</button>
          </div>
        </form>
      )}

      {tab === "users" && (
        <div id="settings-panel-users" role="tabpanel" aria-labelledby="settings-tab-users" className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="flex flex-col gap-4 border-b border-border/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div><h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>Team access</h2><p className="mt-1 text-xs text-muted-foreground">{activeUsers} active of {users.length} team member{users.length === 1 ? "" : "s"}</p></div>
            <button type="button" aria-expanded={showAddAdmin} onClick={() => setShowAddAdmin((current) => !current)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#C4562A] px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#A8411B]"><Plus size={14}/> Add team member</button>
          </div>
          <div className="bg-[#F8F4ED]/60 p-4 sm:p-6">
          {showAddAdmin && (
            <form onSubmit={handleAddAdmin} className="mb-5 rounded-2xl border border-[#C4562A]/20 bg-[#C4562A]/5 p-4 sm:p-5">
              <div className="mb-4"><h3 className="text-sm font-bold">Add a team member</h3><p className="mt-1 text-xs text-muted-foreground">They must already have a customer account using this email.</p></div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
                <input aria-label="Team member email" required type="email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} placeholder="person@example.com" className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm focus:border-[#C4562A] focus:outline-none focus:ring-4 focus:ring-[#C4562A]/8" />
                <select aria-label="Team member role" value={adminRole} onChange={(event) => setAdminRole(event.target.value as "staff" | "admin")} className="h-11 rounded-xl border border-border bg-card px-3 text-sm"><option value="staff">Staff</option><option value="admin">Admin</option></select>
                <button disabled={adminSaving} type="submit" className="h-11 rounded-xl bg-[#1A1A18] px-5 text-xs font-bold text-white disabled:opacity-50">{adminSaving ? "Adding…" : "Add access"}</button>
              </div>
            </form>
          )}
          {adminMessage && <p role="status" aria-live="polite" className="mb-4 rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">{adminMessage}</p>}
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {users.map(u => (
              <div key={u.id} className={`rounded-2xl border bg-card p-4 shadow-[0_5px_18px_rgba(26,26,24,0.035)] ${u.active ? "border-border/70" : "border-border/50 opacity-60"}`}>
                <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C4562A]/10 text-sm font-bold text-[#C4562A]">{u.name.charAt(0)}</div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{u.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${u.active ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground"}`}>{u.active ? "Active" : "Inactive"}</span>
                </div>
                <div className="mt-4 flex gap-2 border-t border-border/60 pt-3">
                  <select aria-label={`Role for ${u.name}`} disabled={adminSaving} value={u.role.toLowerCase()} onChange={(event) => void handleAccessChange(u.id, event.target.value as "staff" | "admin", u.active)} className="min-w-0 flex-1 rounded-lg border border-border bg-card px-2 py-2 text-xs"><option value="staff">Staff</option><option value="admin">Admin</option></select>
                  <button type="button" disabled={adminSaving} onClick={() => void handleAccessChange(u.id, u.role.toLowerCase() as "staff" | "admin", !u.active)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50">{u.active ? "Deactivate" : "Reactivate"}</button>
                </div>
              </div>
            ))}
            {users.length === 0 ? <div className="col-span-full rounded-2xl border border-dashed border-border bg-card p-10 text-center"><Users size={26} className="mx-auto mb-2 text-muted-foreground/40"/><p className="text-sm text-muted-foreground">No admin memberships found.</p></div> : null}
          </div>
          </div>
        </div>
      )}

      {tab === "media" && (
        <div id="settings-panel-media" role="tabpanel" aria-labelledby="settings-tab-media" className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(340px,430px)_1fr]">
          <form onSubmit={handleMediaSave} className="h-fit overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm xl:sticky xl:top-24">
            <div className="border-b border-border/60 bg-[#1A1A18] px-6 py-5 text-white"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#D6B450]"><Upload size={18}/></span><div><h2 className="font-bold" style={{ fontFamily: "var(--font-display)" }}>Upload media</h2><p className="mt-0.5 text-[11px] text-white/50">Publish to Cloudinary and the storefront</p></div></div></div>
            <div className="p-5 sm:p-6">
            <p className="mb-5 rounded-xl border border-[#B8922A]/15 bg-[#B8922A]/5 p-3 text-xs leading-relaxed text-muted-foreground">Existing placements are replaced automatically. Gallery uploads create a new item.</p>
            <div className="space-y-4">
              <div>
                <label htmlFor="media-placement" className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Storefront placement</label>
                <select id="media-placement" value={mediaPlacement} onChange={(event) => setMediaPlacement(event.target.value)} className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm capitalize focus:border-[#C4562A] focus:outline-none focus:ring-4 focus:ring-[#C4562A]/8">
                  {mediaPlacements.map((placement) => <option key={placement} value={placement}>{placement.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="media-alt" className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Accessible description</label>
                <input id="media-alt" required value={mediaAlt} onChange={(event) => setMediaAlt(event.target.value)} placeholder="Describe what is shown in the image" className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:border-[#C4562A] focus:outline-none focus:ring-4 focus:ring-[#C4562A]/8" />
                <p className="mt-1.5 text-[10px] text-muted-foreground">Clear descriptions improve accessibility and search visibility.</p>
              </div>
              <label className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-9 text-center transition-colors ${mediaFile ? "border-[#7A8C6E] bg-[#7A8C6E]/5" : "border-border bg-[#F8F4ED]/60 hover:border-[#C4562A] hover:bg-[#C4562A]/5"}`}>
                <input key={mediaInputKey} required type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" className="sr-only" onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)} />
                <span className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${mediaFile ? "bg-[#7A8C6E]/10 text-[#526346]" : "bg-card text-[#C4562A] shadow-sm"}`}><Upload size={19}/></span>
                <span className="max-w-full truncate text-sm font-bold text-[#1A1A18]">{mediaFile?.name ?? "Choose an image or video"}</span>
                <span className="mt-1 text-[10px] text-muted-foreground">JPEG, PNG, WebP, GIF, MP4 or WebM</span>
              </label>
            </div>
            {mediaMessage && <p role="status" aria-live="polite" className="mt-4 rounded-xl border border-border bg-background px-4 py-3 text-xs text-muted-foreground">{mediaMessage}</p>}
            <button disabled={mediaSaving || !mediaFile || !mediaAlt.trim()} type="submit" className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#C4562A] px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(196,86,42,0.18)] transition-colors hover:bg-[#A8411B] disabled:cursor-not-allowed disabled:opacity-50">
              {mediaSaving ? "Uploading…" : mediaPlacement === "gallery" ? "Add to Gallery" : "Upload & Replace"}
            </button>
            </div>
          </form>

          <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-5 sm:px-6">
              <div><h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>Current media</h2><p className="mt-0.5 text-xs text-muted-foreground">{media.length} active item{media.length === 1 ? "" : "s"} across the storefront</p></div>
              <span className="rounded-full bg-[#C4562A]/8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#C4562A]">Cloudinary</span>
            </div>
            {media.length === 0 ? <div className="p-14 text-center text-sm text-muted-foreground"><span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted"><Upload size={24} className="opacity-40"/></span><p className="font-semibold text-[#1A1A18]">Your media library is empty</p><p className="mt-1 text-xs">Upload the first storefront image using the form.</p></div> : (
              <div className="grid grid-cols-1 gap-4 bg-[#F8F4ED]/60 p-4 sm:grid-cols-2 sm:p-5 2xl:grid-cols-3">
                {media.map((item) => <article key={`${item.kind}-${item.id}`} className="group overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_5px_18px_rgba(26,26,24,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(26,26,24,0.1)]">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {item.resourceType === "video" ? <video src={item.url} controls className="h-full w-full object-cover" /> : <img src={item.url} alt={item.altText} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />}
                    <span className="absolute left-3 top-3 rounded-full bg-[#1A1A18]/80 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">{item.kind}</span>
                  </div>
                  <div className="p-4">
                    <div className="min-w-0"><p className="truncate text-sm font-bold capitalize">{item.placement.replace(/_/g, " ")}</p><p className="mt-1 truncate text-xs text-muted-foreground">{item.altText || "No alt text"}</p></div>
                    <div className="mt-4 flex gap-2 border-t border-border/60 pt-3">
                      {item.kind === "site" ? <button type="button" onClick={() => { setMediaPlacement(item.placement); setMediaAlt(item.altText); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex-1 rounded-lg border border-border py-2 text-xs font-semibold transition-colors hover:border-[#C4562A]/30 hover:bg-[#C4562A]/5 hover:text-[#C4562A]">Replace</button> : <span className="flex-1" />}
                      <button disabled={mediaSaving} type="button" onClick={() => void handleMediaRemove(item.kind, item.id, item.placement.replace(/_/g, " "))} className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50" aria-label={`Remove ${item.placement.replace(/_/g, " ")}`}><Trash2 size={14}/></button>
                    </div>
                  </div>
                </article>)}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────
const PAGE_PATHS: Record<string, string> = {
  home: "/",
  shop: "/shop",
  custom: "/custom-order",
  cart: "/cart",
  checkout: "/checkout",
  account: "/account",
  about: "/about",
  contact: "/contact",
  "help-sizing": "/help/sizing",
  "help-fabric-care": "/help/fabric-care",
  "help-returns": "/help/returns",
  "help-faqs": "/help/faqs",
  "privacy-policy": "/privacy-policy",
  "terms-of-service": "/terms-of-service",
};

const CONFIGURED_STORE_ORIGIN = (import.meta.env.VITE_STORE_ORIGIN || "https://auntysalafashiongh.store").replace(/\/$/, "");
const CONFIGURED_ADMIN_ORIGIN = (import.meta.env.VITE_ADMIN_ORIGIN || "https://admin.auntysalafashiongh.store").replace(/\/$/, "");
const SHOP_DOMAIN = "auntysalafashiongh.shop";
const currentHostname = window.location.hostname.toLowerCase();
const usesShopDomain = currentHostname === SHOP_DOMAIN
  || currentHostname === `www.${SHOP_DOMAIN}`
  || currentHostname === `admin.${SHOP_DOMAIN}`;
const STORE_ORIGIN = usesShopDomain ? `https://${SHOP_DOMAIN}` : CONFIGURED_STORE_ORIGIN;
const ADMIN_ORIGIN = usesShopDomain ? `https://admin.${SHOP_DOMAIN}` : CONFIGURED_ADMIN_ORIGIN;
const ADMIN_HOSTNAMES = new Set([
  new URL(CONFIGURED_ADMIN_ORIGIN).hostname,
  "admin.auntysalafashiongh.store",
  `admin.${SHOP_DOMAIN}`,
  "admin.localhost",
]);

function isAdminHostname(hostname: string) {
  return ADMIN_HOSTNAMES.has(hostname.toLowerCase());
}

function adminPageFromPath(path: string, adminHost: boolean) {
  const requestedAdminPage = adminHost
    ? path.split("/")[1] || "dashboard"
    : path.split("/")[2] || "dashboard";
  return ADMIN_LINKS.some((link) => link.key === requestedAdminPage)
    ? requestedAdminPage
    : "dashboard";
}

function routeFromPath(pathname: string, hostname = window.location.hostname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  const adminHost = isAdminHostname(hostname);

  if (adminHost) {
    return { page: "home", adminPage: adminPageFromPath(path, true), isAdmin: true };
  }

  const productMatch = path.match(/^\/product\/([^/]+)$/);
  if (productMatch) {
    return { page: `product-${productMatch[1]}`, adminPage: "dashboard", isAdmin: false };
  }

  if (path === "/admin" || path.startsWith("/admin/")) {
    return { page: "home", adminPage: adminPageFromPath(path, false), isAdmin: true };
  }

  const page = Object.entries(PAGE_PATHS).find(([, routePath]) => routePath === path)?.[0]
    ?? (path === "/custom" ? "custom" : "home");
  return { page, adminPage: "dashboard", isAdmin: false };
}

function pathFromPage(page: string) {
  if (page.startsWith("product-")) return `/product/${page.replace("product-", "")}`;
  return PAGE_PATHS[page] ?? "/";
}

export default function App() {
  const adminHost = isAdminHostname(window.location.hostname);
  const localHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const legacyAdminPath = window.location.pathname === "/admin" || window.location.pathname.startsWith("/admin/");
  const legacyAdminRedirect = !adminHost && !localHost && legacyAdminPath
    ? `${ADMIN_ORIGIN}${window.location.pathname.replace(/^\/admin/, "") || "/"}${window.location.search}${window.location.hash}`
    : "";
  const initialRoute = routeFromPath(window.location.pathname, window.location.hostname);
  const [page, setPage] = useState(initialRoute.page);
  const [adminPage, setAdminPage] = useState(initialRoute.adminPage);
  const [isAdmin, setIsAdmin] = useState(initialRoute.isAdmin);
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const stored = window.localStorage.getItem("aunty-sala-cart");
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [promoCode, setPromoCode] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [storeContent, setStoreContent] = useState<{ testimonials: Testimonial[]; gallery: GalleryItem[]; settings: Record<string, unknown>; siteMedia: Record<string, string> }>({ testimonials: [], gallery: [], settings: {}, siteMedia: {} });
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeError, setStoreError] = useState("");
  const [adminData, setAdminData] = useState<AdminData>(EMPTY_ADMIN_DATA);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(
    () => new URLSearchParams(window.location.search).get("passwordRecovery") === "1",
  );
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  useEffect(() => {
    if (legacyAdminRedirect) window.location.replace(legacyAdminRedirect);
  }, [legacyAdminRedirect]);

  useEffect(() => {
    let active = true;
    Promise.all([getProducts(), getStoreContent()])
      .then(([databaseProducts, content]) => {
        if (active) {
          setProducts(databaseProducts);
          setStoreContent(content);
          setStoreLoading(false);
        }
      })
      .catch((error) => {
        if (active) {
          setStoreError(error instanceof Error ? error.message : "Unable to load the store.");
          setStoreLoading(false);
        }
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    window.localStorage.setItem("aunty-sala-cart", JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    if (!isAdmin || !session) return;
    setAdminLoading(true);
    setAdminError("");
    getAdminData()
      .then(setAdminData)
      .catch((error) => setAdminError(error instanceof Error ? error.message : "Unable to load admin data."))
      .finally(() => setAdminLoading(false));
  }, [isAdmin, session]);

  useEffect(() => {
    let active = true;
    if (!session) {
      setWishlistIds([]);
      return;
    }
    getWishlistProductIds()
      .then((ids) => { if (active) setWishlistIds(ids); })
      .catch(() => { if (active) setWishlistIds([]); });
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") setIsPasswordRecovery(true);
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) void dispatchNotifications();
  }, [session?.user.id]);

  useEffect(() => {
    const storefrontPageLoadsAsync = page === "home"
      || page === "shop"
      || page === "contact"
      || page.startsWith("product-");

    // Wait until the loader has been replaced by the real page. Otherwise the
    // browser can retain the loader's scroll offset when the taller page mounts.
    if (!isAdmin && storefrontPageLoadsAsync && storeLoading) return;

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [page, isAdmin, adminPage, storeLoading]);

  useEffect(() => {
    if (!isAdmin) return;
    document.title = "Admin Portal | Aunty Sala Fashion Gh";
    document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.setAttribute("content", "noindex, nofollow");
  }, [isAdmin]);

  useEffect(() => {
    const handlePopState = () => {
      const route = routeFromPath(window.location.pathname, window.location.hostname);
      setPage(route.page);
      setAdminPage(route.adminPage);
      setIsAdmin(route.isAdmin);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const addToCart = (product: Product) => {
    setCartItems(prev => {
      const existing = prev.findIndex(i => i.product.id === product.id);
      if (existing >= 0) {
        const next = [...prev]; next[existing].qty += 1; return next;
      }
      return [...prev, { product, qty: 1, size: product.sizes[1] || product.sizes[0] }];
    });
  };

  const navigateTo = (path: string) => {
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    const route = routeFromPath(path, window.location.hostname);
    setPage(route.page);
    setAdminPage(route.adminPage);
    setIsAdmin(route.isAdmin);
  };

  const setPageNav = (nextPage: string) => navigateTo(pathFromPage(nextPage));
  const setAdminPageNav = (nextPage: string) => navigateTo(adminHost
    ? (nextPage === "dashboard" ? "/" : `/${nextPage}`)
    : (nextPage === "dashboard" ? "/admin" : `/admin/${nextPage}`));
  const handleSignOut = async () => {
    await supabase?.auth.signOut();
    navigateTo("/");
  };
  const refreshAdminData = async () => {
    setAdminData(await getAdminData());
  };

  const toggleWishlistItem = async (productId: string) => {
    if (!session) throw new Error("AUTH_REQUIRED");
    const wasSaved = wishlistIds.includes(productId);
    setWishlistIds((current) => wasSaved ? current.filter((id) => id !== productId) : [...current, productId]);
    try {
      if (wasSaved) await removeWishlistItem(productId);
      else await addWishlistItem(productId);
    } catch (error) {
      setWishlistIds((current) => wasSaved
        ? (current.includes(productId) ? current : [...current, productId])
        : current.filter((id) => id !== productId));
      throw error;
    }
  };

  const mergeStoreProduct = useCallback((product: Product) => {
    setProducts((current) => current.some((item) => item.id === product.id) ? current : [...current, product]);
  }, []);

  // Extract product ID from page string
  const productSlug = page.startsWith("product-") ? page.replace("product-", "") : "";
  const seoProduct = productSlug ? products.find((product) => product.slug === productSlug) : undefined;

  if (legacyAdminRedirect) return <FashionLoader label="Opening the admin portal…" />;

  if (isPasswordRecovery) {
    if (authLoading) return <FashionLoader label="Preparing password recovery…" />;
    return <PasswordRecoveryPage onComplete={() => {
      setIsPasswordRecovery(false);
      const url = new URL(window.location.href);
      url.searchParams.delete("passwordRecovery");
      url.hash = "";
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    }} />;
  }

  if (isAdmin) {
    if (authLoading) return <FashionLoader label="Checking your session…" />;
    if (!session) return <LoginPage redirectPath="/" context="admin" />;
    if (adminLoading) return <FashionLoader label="Preparing the admin portal…" />;
    if (adminError) return <div className="min-h-screen flex flex-col gap-4 items-center justify-center"><p className="text-red-600">{adminError}</p><button onClick={() => window.location.assign(STORE_ORIGIN)} className="text-[#C4562A] font-semibold">Back to store</button></div>;
    return (
      <ProductsContext.Provider value={products}>
      <AdminDataContext.Provider value={{ ...adminData, refresh: refreshAdminData }}>
      <div className="h-screen h-dvh overflow-hidden bg-background" style={{ fontFamily: "var(--font-body)" }}>
        <SeoHead page="admin" settings={storeContent.settings} isAdmin />
        <AdminSidebar page={adminPage} setPage={setAdminPageNav} onExit={() => window.location.assign(STORE_ORIGIN)} onLogout={handleSignOut} />
        <main className="ml-60 h-screen h-dvh min-w-0 overflow-y-auto overscroll-contain">
          {/* Admin Header */}
          <div className="sticky top-0 z-20 bg-background border-b border-border px-8 py-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">
              {ADMIN_LINKS.find(l => l.key === adminPage)?.label || "Admin"}
            </p>
            <div className="flex items-center gap-3">
              <button onClick={() => setAdminPageNav("orders")} aria-label="View orders requiring attention" className="relative p-2 hover:bg-muted rounded-lg transition-colors">
                <Bell size={18} />
                {adminData.orders.some((order) => ["Paid", "Processing"].includes(order.status)) && <span className="absolute top-1 right-1 w-2 h-2 bg-[#C4562A] rounded-full" />}
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#C4562A]/10 rounded-full flex items-center justify-center text-sm font-bold text-[#C4562A]">{session.user.email?.charAt(0).toUpperCase()}</div>
                <span className="text-sm font-semibold hidden sm:block">{session.user.email}</span>
              </div>
            </div>
          </div>
          {adminPage === "dashboard" && <AdminDashboard setPage={setAdminPageNav} />}
          {adminPage === "products" && <AdminProducts />}
          {adminPage === "archived-products" && <AdminArchivedProducts setPage={setAdminPageNav} />}
          {adminPage === "orders" && <AdminOrders />}
          {adminPage === "custom-orders" && <AdminCustomOrders />}
          {adminPage === "customers" && <AdminCustomers />}
          {adminPage === "analytics" && <AdminAnalytics />}
          {adminPage === "notifications" && <AdminNotifications />}
          {adminPage === "email-templates" && <AdminEmailTemplates />}
          {adminPage === "settings" && <AdminSettings />}
        </main>
      </div>
      </AdminDataContext.Provider>
      </ProductsContext.Provider>
    );
  }

  return (
    <ProductsContext.Provider value={products}>
    <StoreContentContext.Provider value={storeContent}>
    <WishlistContext.Provider value={{ ids: wishlistIds, toggle: toggleWishlistItem, isAuthenticated: Boolean(session) }}>
    <div className="bg-background min-h-screen" style={{ fontFamily: "var(--font-body)" }}>
      <SeoHead page={page} product={seoProduct} settings={storeContent.settings} />
      <CustomerNav page={page} setPage={setPageNav} cartCount={cartItems.reduce((s,i) => s + i.qty, 0)} isAuthenticated={Boolean(session)} />
      {storeLoading && <FashionLoader className="pt-16" label="Curating the collection…" />}
      {storeError && <div className="min-h-screen pt-24 flex items-center justify-center text-red-600">{storeError}</div>}
      {!storeLoading && !storeError && page === "home" && <HomePage setPage={setPageNav} addToCart={addToCart} />}
      {!storeLoading && !storeError && page === "shop" && <ShopPage setPage={setPageNav} addToCart={addToCart} />}
      {!storeLoading && !storeError && page.startsWith("product-") && <ProductDetailPage productSlug={productSlug} setPage={setPageNav} addToCart={addToCart} onProductLoaded={mergeStoreProduct} />}
      {page === "custom" && <CustomOrderPage />}
      {page === "cart" && <CartPage cartItems={cartItems} setCartItems={setCartItems} setPage={setPageNav} promoCode={promoCode} setPromoCode={setPromoCode} />}
      {page === "checkout" && (authLoading
        ? <FashionLoader className="pt-16" label="Preparing checkout…" />
        : session
          ? <CheckoutPage cartItems={cartItems} setPage={setPageNav} session={session} promoCode={promoCode} onOrderPlaced={() => { setCartItems([]); setPromoCode(""); }} />
          : <LoginPage redirectPath="/checkout" />)}
      {page === "account" && (authLoading
        ? <FashionLoader className="pt-16" label="Preparing your account…" />
        : session
          ? <AccountPage session={session} onSignOut={handleSignOut} />
          : <LoginPage />)}
      {page === "about" && <AboutPage />}
      {page.startsWith("help-") && <HelpPage section={page.replace("help-", "") as HelpSection} setPage={setPageNav} />}
      {(page === "privacy-policy" || page === "terms-of-service") && <LegalPage kind={page} setPage={setPageNav} />}
      {!storeLoading && !storeError && page === "contact" && <ContactPage />}

      <CustomerFooter setPage={setPageNav} />
    </div>
    </WishlistContext.Provider>
    </StoreContentContext.Provider>
    </ProductsContext.Provider>
  );
}
