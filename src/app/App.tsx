import { useState, useEffect } from "react";
import {
  ShoppingCart, Menu, X, Star, Heart, Search, Package, Users,
  BarChart2, Settings, ShoppingBag, Scissors, MessageCircle,
  Instagram, Phone, Mail, MapPin, Check, ArrowRight, Plus, Minus,
  Trash2, Upload, Clock, TrendingUp, AlertCircle, Eye, Edit,
  Download, Printer, LogOut, Bell, ChevronLeft, ChevronRight,
  Calendar, DollarSign, Send, CreditCard, ChevronDown, Truck,
  Award, User, Home, Tag, Filter, LayoutGrid, LayoutList, Zap,
  CheckCircle, Circle
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from "recharts";

// ─── Image URLs ────────────────────────────────────────────────────────────
const IMG = {
  hero1: "https://images.unsplash.com/photo-1533659828870-95ee305cee3e?w=1400&h=900&fit=crop&auto=format",
  model1: "https://images.unsplash.com/photo-1730140322846-e6be13da2ce1?w=600&h=800&fit=crop&auto=format",
  model2: "https://images.unsplash.com/photo-1562894369-193bedce28e3?w=600&h=800&fit=crop&auto=format",
  model3: "https://images.unsplash.com/photo-1769650795527-a707e63754a0?w=600&h=800&fit=crop&auto=format",
  model4: "https://images.unsplash.com/photo-1769650795970-89690d0f535a?w=600&h=800&fit=crop&auto=format",
  model5: "https://images.unsplash.com/photo-1761574028030-6d42536b9b12?w=600&h=800&fit=crop&auto=format",
  model6: "https://images.unsplash.com/photo-1775259037868-1237ddc37bf5?w=600&h=800&fit=crop&auto=format",
  fabric1: "https://images.unsplash.com/photo-1552710307-537199cd41c0?w=600&h=400&fit=crop&auto=format",
  fabric2: "https://images.unsplash.com/photo-1578509566163-068acd11b8e7?w=600&h=400&fit=crop&auto=format",
  fabric3: "https://images.unsplash.com/photo-1768212566108-4ce4f329e4d2?w=600&h=400&fit=crop&auto=format",
  fabric4: "https://images.unsplash.com/photo-1655682614757-a9a33fa45c93?w=600&h=400&fit=crop&auto=format",
  sewing: "https://images.unsplash.com/photo-1687422808289-e721259c9eb4?w=800&h=600&fit=crop&auto=format",
  workshop: "https://images.unsplash.com/photo-1612353318597-702ae55258cb?w=800&h=600&fit=crop&auto=format",
};

// ─── Data ──────────────────────────────────────────────────────────────────
interface Product {
  id: number; name: string; price: number; originalPrice?: number;
  fabric: string; category: string; sizes: string[]; colors: string[];
  images: string[]; description: string; inStock: boolean; badge?: string;
}

const PRODUCTS: Product[] = [
  { id: 1, name: "Adwoa Midi Dress", price: 480, fabric: "Ankara", category: "Dresses",
    sizes: ["XS","S","M","L","XL"], colors: ["#C4562A","#1A1A18","#B8922A"],
    images: [IMG.model1, IMG.fabric1, IMG.model3],
    description: "A structured midi silhouette in vibrant Ankara print. Designed with a fitted bodice, flutter sleeves, and a flared skirt that moves beautifully. Fully lined, hidden zip at back.",
    inStock: true, badge: "Bestseller" },
  { id: 2, name: "Efua Wrap Gown", price: 620, fabric: "Kente", category: "Gowns",
    sizes: ["S","M","L","XL"], colors: ["#7A3B2E","#2C4A3E","#B8922A"],
    images: [IMG.model2, IMG.fabric2, IMG.model4],
    description: "A floor-length wrap gown woven from authentic Kente cloth. The asymmetric neckline and draped skirt create an effortlessly elegant silhouette for formal occasions.",
    inStock: true, badge: "New" },
  { id: 3, name: "Abena Peplum Top", price: 280, fabric: "Batik", category: "Tops",
    sizes: ["XS","S","M","L"], colors: ["#C4562A","#FAF7F2","#1A1A18"],
    images: [IMG.model3, IMG.fabric3, IMG.model5],
    description: "A statement peplum top in hand-dyed batik fabric. The voluminous peplum hem and off-shoulder cut make this a versatile piece for any occasion.",
    inStock: true },
  { id: 4, name: "Akosua Maxi Skirt", price: 360, originalPrice: 420, fabric: "Ankara",
    category: "Skirts", sizes: ["XS","S","M","L","XL","XXL"],
    colors: ["#4A3728","#C4562A","#7A8C6E"],
    images: [IMG.model4, IMG.fabric1, IMG.model6],
    description: "A sweeping maxi skirt in bold Ankara print. Elasticated waist for a perfect fit across all sizes. The tiered hem adds movement and drama.",
    inStock: true, badge: "Sale" },
  { id: 5, name: "Ama Shift Dress", price: 520, fabric: "Kente", category: "Dresses",
    sizes: ["S","M","L"], colors: ["#B8922A","#1A1A18","#C4562A"],
    images: [IMG.model5, IMG.fabric2, IMG.model1],
    description: "A refined shift dress in woven Kente cloth. Knee-length with a boat neckline and structured shoulders — a modern take on traditional Ghanaian weaving.",
    inStock: true },
  { id: 6, name: "Yaa Co-ord Set", price: 580, fabric: "Batik", category: "Sets",
    sizes: ["XS","S","M","L","XL"], colors: ["#2C4A3E","#C4562A","#FAF7F2"],
    images: [IMG.model6, IMG.fabric4, IMG.model2],
    description: "A matching top and wide-leg trouser set in rich indigo batik. The coordinated print creates a striking full look that transitions effortlessly from day to evening.",
    inStock: false, badge: "Pre-order" },
  { id: 7, name: "Adjoa Evening Gown", price: 890, fabric: "Ankara", category: "Gowns",
    sizes: ["S","M","L","XL"], colors: ["#1A1A18","#C4562A","#B8922A"],
    images: [IMG.model3, IMG.fabric3, IMG.model5],
    description: "Our signature floor-length gown in exclusive Ankara print. Strapless fitted bodice with a dramatic train. Available for custom measurements.",
    inStock: true, badge: "Exclusive" },
  { id: 8, name: "Serwaa Jumpsuit", price: 440, fabric: "Batik", category: "Jumpsuits",
    sizes: ["XS","S","M","L"], colors: ["#C4562A","#7A3B2E","#FAF7F2"],
    images: [IMG.model4, IMG.fabric4, IMG.model6],
    description: "A tailored wide-leg jumpsuit in hand-waxed batik. Deep V-neckline, cinched waist with a self-tie belt, and wide palazzo legs for a statement silhouette.",
    inStock: true },
];

const TESTIMONIALS = [
  { name: "Akosua Mensah", location: "Accra, Ghana", rating: 5,
    text: "The Efua Wrap Gown I ordered was absolutely stunning. The attention to detail in the stitching and the way the Kente cloth was handled shows real mastery. I wore it to my cousin's wedding and received so many compliments." },
  { name: "Ama Asante", location: "London, UK", rating: 5,
    text: "I commissioned a custom wedding guest outfit and Anty Sala exceeded every expectation. They took my measurements remotely and the fit was absolutely perfect. The fabric choices are exceptional quality." },
  { name: "Efua Darko", location: "Toronto, Canada", rating: 5,
    text: "As a Ghanaian living abroad, finding quality African fashion that actually fits well has always been a struggle. Anty Sala solves that completely. The made-to-measure service is a game changer." },
];

const GALLERY_IMGS = [IMG.model1, IMG.model2, IMG.model3, IMG.model4, IMG.fabric1, IMG.fabric2, IMG.model5, IMG.model6];

// Admin data
const SALES_DATA = [
  { month: "Feb", revenue: 8200, orders: 34 }, { month: "Mar", revenue: 11400, orders: 48 },
  { month: "Apr", revenue: 9800, orders: 41 }, { month: "May", revenue: 14200, orders: 59 },
  { month: "Jun", revenue: 16800, orders: 71 }, { month: "Jul", revenue: 13600, orders: 57 },
];
const CATEGORY_DATA = [
  { name: "Dresses", value: 38 }, { name: "Gowns", value: 24 },
  { name: "Sets", value: 18 }, { name: "Skirts", value: 12 }, { name: "Other", value: 8 },
];
const PIE_COLORS = ["#C4562A","#B8922A","#7A8C6E","#4A6B8A","#8B5E3C"];

const ORDERS_DATA = [
  { id: "#ASF-1041", customer: "Abena Owusu", items: "Adwoa Midi Dress × 1", amount: 480, status: "Shipped", date: "Jul 10, 2026", fabric: "Ankara" },
  { id: "#ASF-1040", customer: "Yaa Boateng", items: "Efua Wrap Gown × 1", amount: 620, status: "Sewing", date: "Jul 9, 2026", fabric: "Kente", custom: true },
  { id: "#ASF-1039", customer: "Adjoa Kumi", items: "Yaa Co-ord Set × 1, Abena Peplum Top × 2", amount: 1140, status: "Processing", date: "Jul 9, 2026", fabric: "Batik" },
  { id: "#ASF-1038", customer: "Akua Asante", items: "Adjoa Evening Gown × 1", amount: 890, status: "Ready", date: "Jul 8, 2026", fabric: "Ankara", custom: true },
  { id: "#ASF-1037", customer: "Ama Mensah", items: "Akosua Maxi Skirt × 1", amount: 360, status: "Delivered", date: "Jul 7, 2026", fabric: "Ankara" },
  { id: "#ASF-1036", customer: "Efua Darko", items: "Serwaa Jumpsuit × 1", amount: 440, status: "Delivered", date: "Jul 6, 2026", fabric: "Batik" },
];

const CUSTOMERS_DATA = [
  { id: 1, name: "Abena Owusu", email: "abena.o@gmail.com", orders: 7, spent: 3240, location: "Accra", joined: "Jan 2025" },
  { id: 2, name: "Yaa Boateng", email: "yaa.b@yahoo.com", orders: 4, spent: 2180, location: "Kumasi", joined: "Mar 2025" },
  { id: 3, name: "Adjoa Kumi", email: "adjoa.k@outlook.com", orders: 12, spent: 6850, location: "London", joined: "Oct 2024" },
  { id: 4, name: "Akua Asante", email: "akua.a@gmail.com", orders: 3, spent: 1670, location: "Toronto", joined: "May 2025" },
  { id: 5, name: "Ama Mensah", email: "ama.m@icloud.com", orders: 9, spent: 4320, location: "Accra", joined: "Feb 2024" },
  { id: 6, name: "Efua Darko", email: "efua.d@gmail.com", orders: 6, spent: 2940, location: "New York", joined: "Jun 2024" },
];

const KANBAN_COLS: { key: string; label: string; color: string }[] = [
  { key: "new", label: "New", color: "bg-blue-100 text-blue-800" },
  { key: "measuring", label: "Measuring", color: "bg-yellow-100 text-yellow-800" },
  { key: "cutting", label: "Cutting", color: "bg-orange-100 text-orange-800" },
  { key: "sewing", label: "Sewing", color: "bg-purple-100 text-purple-800" },
  { key: "fitting", label: "Fitting", color: "bg-pink-100 text-pink-800" },
  { key: "ready", label: "Ready", color: "bg-green-100 text-green-800" },
];

const KANBAN_ITEMS = [
  { id: "#ASF-1042", name: "Kofi Agyemang", item: "Custom Wedding Ankara Gown", col: "new", due: "Jul 20" },
  { id: "#ASF-1040", name: "Yaa Boateng", item: "Efua Wrap Gown — Custom Fit", col: "sewing", due: "Jul 13" },
  { id: "#ASF-1038", name: "Akua Asante", item: "Adjoa Evening Gown — Tailored", col: "ready", due: "Jul 12" },
  { id: "#ASF-1035", name: "Maame Frimpong", item: "Batik Bridal Set — 2 pieces", col: "cutting", due: "Jul 15" },
  { id: "#ASF-1034", name: "Adwoa Sarpong", item: "Custom Kente Shift Dress", col: "measuring", due: "Jul 14" },
  { id: "#ASF-1033", name: "Esi Owusu", item: "Mother-of-Bride Maxi Gown", col: "fitting", due: "Jul 12" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────
const ghs = (n: number) => `GH₵ ${n.toLocaleString()}`;
const statusColor: Record<string, string> = {
  Processing: "bg-blue-50 text-blue-700",
  Sewing: "bg-purple-50 text-purple-700",
  Ready: "bg-green-50 text-green-700",
  Shipped: "bg-amber-50 text-amber-700",
  Delivered: "bg-gray-50 text-gray-600",
  Fitting: "bg-pink-50 text-pink-700",
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
function CustomerNav({ page, setPage, cartCount, onAdminEnter }:
  { page: string; setPage: (p: string) => void; cartCount: number; onAdminEnter: () => void }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    { label: "Shop", page: "shop" }, { label: "Custom Order", page: "custom" },
    { label: "About", page: "about" }, { label: "Contact", page: "contact" },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || page !== "home" ? "bg-[#FAF7F2]/95 backdrop-blur-sm shadow-sm" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <button onClick={() => setPage("home")} className="flex flex-col leading-none">
          <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Anty Sala
          </span>
          <span className="text-[10px] tracking-[0.25em] uppercase text-[#B8922A] font-medium" style={{ fontFamily: "var(--font-body)" }}>
            Fashion GH
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <button key={l.page} onClick={() => setPage(l.page)}
              className={`text-sm tracking-wide transition-colors hover:text-[#C4562A] ${page === l.page ? "text-[#C4562A]" : "text-[#1A1A18]"}`}
              style={{ fontFamily: "var(--font-body)" }}>
              {l.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button onClick={() => setPage("account")} className="hidden md:flex p-2 hover:text-[#C4562A] transition-colors" aria-label="Account">
            <User size={20} />
          </button>
          <button onClick={() => setPage("cart")} className="relative p-2 hover:text-[#C4562A] transition-colors" aria-label="Cart">
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
            className="text-left py-2 text-base font-medium hover:text-[#C4562A]">My Account</button>
          <button onClick={onAdminEnter}
            className="text-left py-2 text-xs text-muted-foreground hover:text-[#C4562A]">Admin Portal ↗</button>
        </div>
      )}
    </header>
  );
}

// ─── Customer Footer ───────────────────────────────────────────────────────
function CustomerFooter({ setPage }: { setPage: (p: string) => void }) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  return (
    <footer className="bg-[#1A1A18] text-[#FAF7F2]">
      <KenteStripe />
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-1">
          <div className="mb-4">
            <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Anty Sala</p>
            <p className="text-[10px] tracking-[0.25em] uppercase text-[#B8922A] font-medium" style={{ fontFamily: "var(--font-body)" }}>Fashion GH</p>
          </div>
          <p className="text-sm text-[#FAF7F2]/60 leading-relaxed mt-3">
            Made-to-order dresses and ready-to-wear pieces blending contemporary silhouettes with the finest African print fabrics.
          </p>
          <div className="flex gap-3 mt-5">
            {[Instagram, MessageCircle, Phone].map((Icon, i) => (
              <button key={i} className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center hover:border-[#B8922A] hover:text-[#B8922A] transition-colors">
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs tracking-widest uppercase text-[#B8922A] mb-5 font-semibold">Shop</p>
          {["New Arrivals","Dresses","Gowns","Sets & Co-ords","Custom Orders"].map(l => (
            <button key={l} onClick={() => setPage("shop")}
              className="block text-sm text-[#FAF7F2]/60 hover:text-[#FAF7F2] mb-2.5 transition-colors text-left">{l}</button>
          ))}
        </div>

        <div>
          <p className="text-xs tracking-widest uppercase text-[#B8922A] mb-5 font-semibold">Help</p>
          {["About Us","Contact","Sizing Guide","Fabric Care","Returns Policy","FAQs"].map(l => (
            <button key={l} onClick={() => setPage("about")}
              className="block text-sm text-[#FAF7F2]/60 hover:text-[#FAF7F2] mb-2.5 transition-colors text-left">{l}</button>
          ))}
        </div>

        <div>
          <p className="text-xs tracking-widest uppercase text-[#B8922A] mb-5 font-semibold">Newsletter</p>
          <p className="text-sm text-[#FAF7F2]/60 mb-4 leading-relaxed">New collections, style stories, and exclusive offers — straight to your inbox.</p>
          {subscribed ? (
            <div className="flex items-center gap-2 text-[#B8922A] text-sm">
              <Check size={16} /> <span>You're subscribed!</span>
            </div>
          ) : (
            <form onSubmit={e => { e.preventDefault(); if (email) setSubscribed(true); }} className="flex flex-col gap-2">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" required
                className="bg-white/10 border border-white/20 rounded px-3 py-2.5 text-sm placeholder-white/30 focus:outline-none focus:border-[#B8922A] text-white" />
              <button type="submit" className="bg-[#C4562A] hover:bg-[#A8411B] text-white text-sm font-semibold py-2.5 rounded transition-colors">
                Subscribe
              </button>
            </form>
          )}
        </div>
      </div>
      <div className="border-t border-white/10 max-w-7xl mx-auto px-6 lg:px-10 py-5 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-[#FAF7F2]/40">
        <p>© 2026 Anty Sala Fashion GH. All rights reserved.</p>
        <p>Designed & crafted in Accra, Ghana 🇬🇭</p>
      </div>
    </footer>
  );
}

// ─── HOME PAGE ─────────────────────────────────────────────────────────────
function HomePage({ setPage, addToCart }: { setPage: (p: string) => void; addToCart: (p: Product) => void }) {
  const [heroLoaded, setHeroLoaded] = useState(false);
  const featured = PRODUCTS.slice(0, 4);

  return (
    <div className="min-h-screen" style={{ fontFamily: "var(--font-body)" }}>
      {/* Hero */}
      <section className="relative h-[92vh] min-h-[600px] flex items-end bg-[#2A1810]">
        <img src={IMG.hero1} alt="Elegant model in African print dress"
          onLoad={() => setHeroLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-700 ${heroLoaded ? "opacity-90" : "opacity-0"}`} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1A0E08]/80 via-[#1A0E08]/40 to-transparent" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pb-20 w-full">
          <p className="text-[#B8922A] text-xs tracking-[0.3em] uppercase mb-4 font-semibold">New Collection — Summer 2026</p>
          <h1 className="text-white text-5xl md:text-7xl font-bold leading-none mb-6 max-w-xl" style={{ fontFamily: "var(--font-display)" }}>
            Wear Your<br /><em className="not-italic text-[#C4562A]">Heritage.</em>
          </h1>
          <p className="text-white/70 text-lg max-w-sm mb-8 leading-relaxed">
            Made-to-measure dresses woven from the finest kente, ankara &amp; batik — crafted in Accra, for women everywhere.
          </p>
          <div className="flex flex-wrap gap-4">
            <button onClick={() => setPage("shop")}
              className="bg-[#C4562A] hover:bg-[#A8411B] text-white px-8 py-3.5 text-sm font-semibold tracking-wide rounded transition-colors flex items-center gap-2">
              Shop Now <ArrowRight size={16} />
            </button>
            <button onClick={() => setPage("custom")}
              className="border border-white/50 hover:border-white text-white px-8 py-3.5 text-sm font-semibold tracking-wide rounded transition-colors">
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
            <button key={p.id} onClick={() => setPage(`product-${p.id}`)}
              className="group text-left bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="relative overflow-hidden bg-[#E8E2D9]" style={{ aspectRatio: "3/4" }}>
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
              <div className="p-4">
                <p className="text-xs text-[#B8922A] uppercase tracking-widest mb-1 font-semibold">{p.fabric}</p>
                <p className="font-semibold text-sm mb-1" style={{ fontFamily: "var(--font-display)" }}>{p.name}</p>
                <p className="text-[#C4562A] font-bold text-sm">{ghs(p.price)}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Custom Order Banner */}
      <section className="relative overflow-hidden bg-[#1A1A18] mx-6 lg:mx-10 rounded-2xl mb-20">
        <div className="absolute inset-0">
          <img src={IMG.fabric3} alt="Fabric texture" className="w-full h-full object-cover opacity-20" />
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
        <div className="text-center mb-12">
          <p className="text-[#B8922A] text-xs tracking-[0.3em] uppercase mb-2 font-semibold">What Our Clients Say</p>
          <h2 className="text-4xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Worn &amp; Loved</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bg-card rounded-xl p-7 shadow-sm border border-border/50">
              <StarRating rating={t.rating} />
              <p className="text-sm leading-relaxed text-[#1A1A18]/80 mt-4 mb-5 italic" style={{ fontFamily: "var(--font-display)" }}>
                &ldquo;{t.text}&rdquo;
              </p>
              <div>
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.location}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Instagram Gallery Strip */}
      <section className="pb-20 px-6 lg:px-10 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Instagram size={18} className="text-[#C4562A]" />
            <p className="font-semibold text-sm">@antysalafashiongh</p>
          </div>
          <a href="#" className="text-xs text-[#C4562A] font-semibold hover:underline">Follow us on Instagram</a>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {GALLERY_IMGS.map((img, i) => (
            <div key={i} className="relative overflow-hidden rounded-lg bg-[#E8E2D9] group cursor-pointer" style={{ aspectRatio: "1" }}>
              <img src={img} alt={`Gallery ${i+1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
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
  const [category, setCategory] = useState("All");
  const [fabric, setFabric] = useState("All");
  const [sortBy, setSortBy] = useState("featured");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [wishlist, setWishlist] = useState<number[]>([]);

  const categories = ["All","Dresses","Gowns","Sets","Skirts","Jumpsuits","Tops"];
  const fabrics = ["All","Ankara","Kente","Batik"];

  let filtered = PRODUCTS.filter(p => {
    const catMatch = category === "All" || p.category === category;
    const fabMatch = fabric === "All" || p.fabric === fabric;
    const searchMatch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return catMatch && fabMatch && searchMatch;
  });
  if (sortBy === "price-asc") filtered = [...filtered].sort((a,b) => a.price - b.price);
  if (sortBy === "price-desc") filtered = [...filtered].sort((a,b) => b.price - a.price);

  return (
    <div className="min-h-screen pt-16" style={{ fontFamily: "var(--font-body)" }}>
      {/* Page Header */}
      <div className="bg-[#1A1A18] py-14 px-6 lg:px-10 text-center relative overflow-hidden">
        <img src={IMG.fabric2} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15" />
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

        <p className="text-sm text-muted-foreground mb-6">{filtered.length} piece{filtered.length !== 1 ? "s" : ""} found</p>

        {view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filtered.map(p => (
              <div key={p.id} className="group bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-border/40">
                <div className="relative overflow-hidden bg-[#E8E2D9] cursor-pointer" style={{ aspectRatio: "3/4" }}
                  onClick={() => setPage(`product-${p.id}`)}>
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {p.badge && <span className="absolute top-3 left-3 bg-[#C4562A] text-white text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded">{p.badge}</span>}
                  {!p.inStock && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="bg-white text-xs font-bold px-3 py-1 rounded">Out of Stock</span></div>}
                  <button onClick={e => { e.stopPropagation(); setWishlist(w => w.includes(p.id) ? w.filter(i => i !== p.id) : [...w, p.id]); }}
                    className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity">
                    <Heart size={14} className={wishlist.includes(p.id) ? "fill-[#C4562A] text-[#C4562A]" : "text-[#1A1A18]"} />
                  </button>
                  {p.inStock && (
                    <button onClick={e => { e.stopPropagation(); addToCart(p); }}
                      className="absolute bottom-3 left-3 right-3 bg-white/95 hover:bg-[#C4562A] hover:text-white text-[#1A1A18] text-xs font-semibold py-2.5 rounded opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                      Add to Cart
                    </button>
                  )}
                </div>
                <div className="p-4" onClick={() => setPage(`product-${p.id}`)} role="button">
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
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map(p => (
              <div key={p.id} className="bg-card rounded-xl overflow-hidden shadow-sm border border-border/40 flex gap-5 p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setPage(`product-${p.id}`)}>
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
                <button onClick={e => { e.stopPropagation(); if (p.inStock) addToCart(p); }}
                  disabled={!p.inStock}
                  className="self-center shrink-0 bg-[#C4562A] disabled:opacity-40 hover:bg-[#A8411B] text-white text-xs font-semibold px-4 py-2.5 rounded transition-colors">
                  {p.inStock ? "Add" : "OOS"}
                </button>
              </div>
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Package size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-semibold">No pieces match your filters</p>
            <button onClick={() => { setCategory("All"); setFabric("All"); setSearch(""); }} className="mt-3 text-[#C4562A] text-sm font-semibold hover:underline">Clear filters</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PRODUCT DETAIL ────────────────────────────────────────────────────────
function ProductDetailPage({ productId, setPage, addToCart }:
  { productId: number; setPage: (p: string) => void; addToCart: (p: Product) => void }) {
  const product = PRODUCTS.find(p => p.id === productId) || PRODUCTS[0];
  const [imgIdx, setImgIdx] = useState(0);
  const [size, setSize] = useState("");
  const [tab, setTab] = useState("description");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const related = PRODUCTS.filter(p => p.id !== product.id && p.category === product.category).slice(0,3);

  const handleAdd = () => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
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

            <StarRating rating={5} />
            <p className="text-xs text-muted-foreground mt-1 mb-6">4.9 · 24 reviews</p>

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
                <button className="text-xs text-[#C4562A] hover:underline">Size Guide</button>
              </div>
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
              <button className="w-12 h-12 border border-border rounded-lg flex items-center justify-center hover:border-[#C4562A] transition-colors">
                <Heart size={18} />
              </button>
            </div>

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
                  {TESTIMONIALS.slice(0,2).map((t,i) => (
                    <div key={i} className="border-b border-border pb-4 last:border-0">
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
                <button key={p.id} onClick={() => setPage(`product-${p.id}`)} className="group text-left bg-card rounded-xl overflow-hidden shadow-sm border border-border/40 hover:shadow-md transition-shadow">
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
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    style: "", fabric: "", occasion: "", budget: "", name: "", email: "", phone: "",
    bust: "", waist: "", hips: "", height: "", notes: "",
  });
  const total = 4;

  const up = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const fabrics = [
    { name: "Ankara", desc: "Bold, wax-resist dyed cotton prints", img: IMG.fabric1 },
    { name: "Kente", desc: "Hand-woven silk & cotton strips", img: IMG.fabric2 },
    { name: "Batik", desc: "Wax resist on fine cotton", img: IMG.fabric3 },
    { name: "Mixed", desc: "Let our designers suggest", img: IMG.fabric4 },
  ];
  const styles = ["Maxi Gown","Midi Dress","Mini Dress","Skirt & Top Set","Jumpsuit","Peplum Top","Wrap Dress","Tailored Suit"];
  const occasions = ["Wedding Guest","Bridal","Corporate/Formal","Casual/Everyday","Cultural Event","Birthday","Red Carpet","Other"];

  return (
    <div className="min-h-screen pt-16 pb-20" style={{ fontFamily: "var(--font-body)" }}>
      <div className="bg-[#1A1A18] py-12 px-6 text-center relative overflow-hidden">
        <img src={IMG.fabric4} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
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
                  <img src={f.img} alt={f.name} className="w-full h-32 object-cover" />
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
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-[#C4562A] transition-colors cursor-pointer">
                <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Drop files or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, PDF up to 10MB</p>
              </div>
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
                <p className="text-xs text-muted-foreground mt-0.5">Our team can walk you through on WhatsApp. <button className="text-[#C4562A] font-semibold hover:underline">Chat now →</button></p>
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
              <button onClick={() => setStep(5)} className="flex-1 bg-[#C4562A] hover:bg-[#A8411B] text-white py-3.5 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
                Submit Order <Send size={15}/>
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={36} className="text-green-600" />
            </div>
            <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>Order Received!</h2>
            <p className="text-muted-foreground mb-2">Thank you, <strong>{form.name || "dear customer"}</strong>.</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Our team will review your custom order and reach out within 24 hours via WhatsApp and email to confirm fabric availability and pricing.
            </p>
            <div className="mt-8 flex gap-3 justify-center">
              <button onClick={() => setStep(1)} className="border border-border px-6 py-3 rounded-lg text-sm font-semibold hover:bg-muted transition-colors">New Order</button>
              <button className="bg-[#C4562A] text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-[#A8411B] transition-colors flex items-center gap-2">
                <MessageCircle size={15}/> Chat on WhatsApp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CART PAGE ─────────────────────────────────────────────────────────────
interface CartItem { product: Product; qty: number; size: string; }

function CartPage({ cartItems, setCartItems, setPage }:
  { cartItems: CartItem[]; setCartItems: (items: CartItem[]) => void; setPage: (p: string) => void }) {
  const [promo, setPromo] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);

  const subtotal = cartItems.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  const discount = promoApplied ? Math.round(subtotal * 0.1) : 0;
  const shipping = subtotal >= 500 ? 0 : 50;
  const total = subtotal - discount + shipping;

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
                    onClick={() => setPage(`product-${item.product.id}`)} />
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
                  {promoApplied && <div className="flex justify-between text-green-700"><span>Promo (10% off)</span><span>− {ghs(discount)}</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shipping === 0 ? "Free" : ghs(shipping)}</span></div>
                  <div className="border-t border-border pt-3 flex justify-between font-bold text-base"><span>Total</span><span className="text-[#C4562A]">{ghs(total)}</span></div>
                </div>
                {/* Promo */}
                <div className="flex gap-2 mb-5">
                  <input value={promo} onChange={e => setPromo(e.target.value)}
                    placeholder="Promo code" className="flex-1 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C4562A]" />
                  <button onClick={() => { if (promo === "ANTY10") setPromoApplied(true); }}
                    className="bg-[#1A1A18] text-white text-sm font-semibold px-4 rounded-lg hover:bg-[#2A2A20] transition-colors">Apply</button>
                </div>
                {promo && promo !== "ANTY10" && <p className="text-xs text-red-500 -mt-3 mb-4">Invalid promo code. Try ANTY10</p>}
                <button onClick={() => setPage("checkout")}
                  className="w-full bg-[#C4562A] hover:bg-[#A8411B] text-white py-3.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2">
                  Proceed to Checkout <ArrowRight size={16}/>
                </button>
                <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1">
                  <CreditCard size={12}/> Secure checkout · Mobile Money &amp; Card
                </p>
                {subtotal < 500 && <p className="text-xs text-center mt-2 text-[#B8922A]">Add {ghs(500-subtotal)} more for free delivery</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CHECKOUT PAGE ─────────────────────────────────────────────────────────
function CheckoutPage({ cartItems, setPage }:
  { cartItems: CartItem[]; setPage: (p: string) => void }) {
  const [step, setStep] = useState(1);
  const [payment, setPayment] = useState("momo");
  const [placed, setPlaced] = useState(false);
  const total = cartItems.reduce((s, i) => s + i.product.price * i.qty, 0) + 50;

  const steps = ["Shipping", "Payment", "Review"];

  if (placed) return (
    <div className="min-h-screen pt-20 flex items-center justify-center" style={{ fontFamily: "var(--font-body)" }}>
      <div className="text-center px-6 max-w-md">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={36} className="text-green-600" />
        </div>
        <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>Order Placed!</h1>
        <p className="text-muted-foreground mb-1">Order #ASF-1043 confirmed.</p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">We've sent a confirmation to your email. Your pieces are now with our seamstresses.</p>
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
                <div className="grid grid-cols-2 gap-4">
                  {[["First Name","text"],["Last Name","text"],["Email","email"],["Phone","tel"]].map(([label,type]) => (
                    <div key={label}>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">{label}</label>
                      <input type={type} className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C4562A]" />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">Address</label>
                    <input type="text" className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C4562A]" />
                  </div>
                  {[["City","text"],["Country","text"]].map(([label,type]) => (
                    <div key={label}>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">{label}</label>
                      <input type={type} defaultValue={label === "Country" ? "Ghana" : ""} className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C4562A]" />
                    </div>
                  ))}
                </div>
                <button onClick={() => setStep(2)} className="mt-6 w-full bg-[#C4562A] text-white py-3.5 rounded-lg font-bold hover:bg-[#A8411B] transition-colors flex items-center justify-center gap-2">
                  Continue to Payment <ArrowRight size={16}/>
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="bg-card rounded-xl p-6 border border-border/40 shadow-sm">
                <h2 className="font-bold text-lg mb-5" style={{ fontFamily: "var(--font-display)" }}>Payment Method</h2>
                <div className="space-y-3 mb-6">
                  {[{ id: "momo", label: "Mobile Money", sub: "MTN MoMo · Vodafone Cash · AirtelTigo", icon: Phone },
                    { id: "card", label: "Debit / Credit Card", sub: "Visa · Mastercard · Verve", icon: CreditCard }].map(({ id, label, sub, icon: Icon }) => (
                    <label key={id} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${payment === id ? "border-[#C4562A] bg-[#C4562A]/5" : "border-border hover:border-[#C4562A]/40"}`}>
                      <input type="radio" name="payment" value={id} checked={payment === id} onChange={() => setPayment(id)} className="accent-[#C4562A]" />
                      <div className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center"><Icon size={18}/></div>
                      <div>
                        <p className="font-semibold text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">{sub}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {payment === "momo" && (
                  <div className="mb-4">
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">Mobile Money Number</label>
                    <input type="tel" placeholder="024 XXX XXXX" className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C4562A]" />
                  </div>
                )}
                {payment === "card" && (
                  <div className="space-y-3 mb-4">
                    <input type="text" placeholder="Card number" className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C4562A]" />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="MM / YY" className="border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C4562A]" />
                      <input type="text" placeholder="CVV" className="border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C4562A]" />
                    </div>
                  </div>
                )}
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
                  <button onClick={() => setPlaced(true)} className="flex-1 bg-[#C4562A] text-white py-3.5 rounded-lg font-bold hover:bg-[#A8411B] transition-colors">Place Order</button>
                </div>
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
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ACCOUNT PAGE ──────────────────────────────────────────────────────────
function AccountPage() {
  const [tab, setTab] = useState("orders");
  const orders = [
    { id: "#ASF-1041", date: "Jul 10, 2026", items: "Adwoa Midi Dress", amount: 480, status: "Shipped" },
    { id: "#ASF-1038", date: "Jun 22, 2026", items: "Adjoa Evening Gown (Custom)", amount: 890, status: "Delivered" },
    { id: "#ASF-1030", date: "May 14, 2026", items: "Abena Peplum Top × 2", amount: 560, status: "Delivered" },
  ];
  const statusSteps = ["Processing","Sewing","Ready","Shipped","Delivered"];

  return (
    <div className="min-h-screen pt-20 pb-16" style={{ fontFamily: "var(--font-body)" }}>
      <div className="max-w-5xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-[#C4562A] rounded-full flex items-center justify-center">
            <User size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Akosua Mensah</h1>
            <p className="text-sm text-muted-foreground">akosua.m@gmail.com · Member since Jan 2025</p>
          </div>
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

        {tab === "orders" && (
          <div className="space-y-4">
            {orders.map(o => {
              const stepIdx = statusSteps.indexOf(o.status);
              return (
                <div key={o.id} className="bg-card rounded-xl p-6 border border-border/40 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                    <div>
                      <p className="font-bold text-sm">{o.id}</p>
                      <p className="text-xs text-muted-foreground">{o.date} · {o.items}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[#C4562A]">{ghs(o.amount)}</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusColor[o.status] || "bg-gray-50 text-gray-600"}`}>{o.status}</span>
                    </div>
                  </div>
                  {/* Tracker */}
                  <div className="flex items-center overflow-x-auto pb-1">
                    {statusSteps.map((s, i) => {
                      const done = i <= stepIdx;
                      return (
                        <div key={s} className="flex items-center shrink-0">
                          <div className="flex flex-col items-center">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${done ? "bg-[#C4562A] border-[#C4562A]" : "border-border"}`}>
                              {done && <Check size={12} className="text-white"/>}
                            </div>
                            <span className={`text-[10px] mt-1 font-medium whitespace-nowrap ${done ? "text-[#C4562A]" : "text-muted-foreground"}`}>{s}</span>
                          </div>
                          {i < statusSteps.length - 1 && <div className={`w-12 h-0.5 mx-1 ${i < stepIdx ? "bg-[#C4562A]" : "bg-border"}`}/>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "measurements" && (
          <div className="bg-card rounded-xl p-6 border border-border/40 shadow-sm max-w-lg">
            <h2 className="font-bold text-lg mb-5" style={{ fontFamily: "var(--font-display)" }}>Saved Measurements</h2>
            <div className="grid grid-cols-2 gap-4">
              {[["Bust","92 cm"],["Waist","74 cm"],["Hips","100 cm"],["Full Height","168 cm"],["Shoulder Width","38 cm"],["Arm Length","58 cm"]].map(([k,v]) => (
                <div key={k} className="bg-[#F0EAE0] rounded-lg p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">{k}</p>
                  <p className="font-bold text-lg">{v}</p>
                </div>
              ))}
            </div>
            <button className="mt-5 w-full border border-border py-3 rounded-lg text-sm font-semibold hover:border-[#C4562A] hover:text-[#C4562A] transition-colors flex items-center justify-center gap-2">
              <Edit size={14}/> Update Measurements
            </button>
          </div>
        )}

        {tab === "wishlist" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {PRODUCTS.slice(0,3).map(p => (
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
          </div>
        )}

        {tab === "addresses" && (
          <div className="max-w-lg">
            <div className="bg-card rounded-xl p-5 border-2 border-[#C4562A] shadow-sm mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-xs font-bold text-[#C4562A] uppercase tracking-wide">Default</span>
                <button className="text-xs text-muted-foreground hover:text-[#C4562A]"><Edit size={12}/></button>
              </div>
              <p className="font-bold text-sm">Akosua Mensah</p>
              <p className="text-sm text-muted-foreground">14 Cantonments Rd, Accra, Ghana</p>
            </div>
            <button className="w-full border-2 border-dashed border-border rounded-xl p-4 text-sm font-semibold text-muted-foreground hover:border-[#C4562A] hover:text-[#C4562A] transition-colors flex items-center justify-center gap-2">
              <Plus size={16}/> Add New Address
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ABOUT PAGE ────────────────────────────────────────────────────────────
function AboutPage() {
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
              Anty Sala Fashion GH was born in a small workshop in Accra's Osu district.
              What began as one woman's passion for bringing African print fabrics into modern silhouettes
              has grown into a beloved boutique serving clients across Ghana and the diaspora.
            </p>
          </div>
        </div>
        <div className="relative overflow-hidden bg-[#E8E2D9] min-h-[50vh]">
          <img src={IMG.sewing} alt="Seamstress at work" className="w-full h-full object-cover" />
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
              When you order from Anty Sala, you're not just buying a dress. You're investing in Ghanaian craftsmanship,
              supporting female artisans, and wearing something that was made with genuine love and intention.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <img src={IMG.workshop} alt="Workshop" className="rounded-xl w-full h-48 object-cover" />
            <img src={IMG.fabric1} alt="Fabric" className="rounded-xl w-full h-48 object-cover" />
            <img src={IMG.fabric3} alt="Textiles" className="rounded-xl w-full h-48 object-cover col-span-2" />
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── CONTACT PAGE ──────────────────────────────────────────────────────────
function ContactPage() {
  const [sent, setSent] = useState(false);
  return (
    <div className="min-h-screen pt-16 pb-20" style={{ fontFamily: "var(--font-body)" }}>
      <div className="bg-[#1A1A18] py-12 px-6 text-center relative overflow-hidden">
        <img src={IMG.fabric2} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15" />
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
            <form onSubmit={e => { e.preventDefault(); setSent(true); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {["Name","Email"].map(l => (
                  <div key={l}>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">{l}</label>
                    <input type={l === "Email" ? "email" : "text"} required className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C4562A]" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">Subject</label>
                <select className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C4562A]">
                  <option>General Enquiry</option><option>Custom Order</option>
                  <option>Order Status</option><option>Returns &amp; Exchanges</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">Message</label>
                <textarea required rows={5} className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C4562A] resize-none" />
              </div>
              <button type="submit" className="w-full bg-[#C4562A] hover:bg-[#A8411B] text-white py-3.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2">
                Send Message <Send size={15}/>
              </button>
            </form>
          )}
        </div>

        {/* Info */}
        <div>
          <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "var(--font-display)" }}>Contact Info</h2>
          <div className="space-y-5 mb-8">
            {[{ icon: MapPin, label: "Location", value: "14 Cantonments Road, Osu, Accra, Ghana" },
              { icon: Phone, label: "Phone", value: "+233 24 000 0000" },
              { icon: Mail, label: "Email", value: "hello@antysalafashion.com" },
              { icon: Clock, label: "Hours", value: "Mon–Sat: 9am – 6pm | Sun: Closed" }
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
          <div className="bg-[#25D366]/10 border border-[#25D366]/30 rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-[#25D366] rounded-xl flex items-center justify-center shrink-0">
              <MessageCircle size={22} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">Fastest response on WhatsApp</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">Chat directly with our design team — we reply within hours.</p>
              <a href="#" className="text-xs font-bold text-[#25D366] hover:underline flex items-center gap-1">
                Open WhatsApp Chat <ArrowRight size={12}/>
              </a>
            </div>
          </div>

          {/* Map placeholder */}
          <div className="mt-6 rounded-xl overflow-hidden bg-[#E8E2D9] h-48 flex items-center justify-center relative">
            <img src={IMG.fabric4} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
            <div className="relative z-10 flex flex-col items-center">
              <MapPin size={28} className="text-[#C4562A] mb-1" />
              <p className="text-sm font-bold">Cantonments Road, Osu, Accra</p>
              <a href="#" className="text-xs text-[#C4562A] hover:underline mt-1">View on Google Maps</a>
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
  { key: "orders", label: "Orders", icon: Package },
  { key: "custom-orders", label: "Tailoring Queue", icon: Scissors },
  { key: "customers", label: "Customers", icon: Users },
  { key: "analytics", label: "Analytics", icon: BarChart2 },
  { key: "settings", label: "Settings", icon: Settings },
];

function AdminSidebar({ page, setPage, onExit }:
  { page: string; setPage: (p: string) => void; onExit: () => void }) {
  return (
    <aside className="w-60 bg-[#1A1A18] text-[#FAF7F2] flex flex-col shrink-0 min-h-screen">
      <div className="px-6 py-5 border-b border-white/8">
        <p className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>Anty Sala</p>
        <p className="text-[10px] tracking-[0.25em] uppercase text-[#B8922A] font-medium">Admin Portal</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {ADMIN_LINKS.map(({ key, label, icon: Icon }) => {
          const active = page === key;
          return (
            <button key={key} onClick={() => setPage(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? "bg-[#B8922A]/15 text-[#B8922A]" : "hover:bg-white/5 text-[#FAF7F2]/70 hover:text-[#FAF7F2]"}`}>
              <Icon size={16} className={active ? "text-[#B8922A]" : ""} />
              {label}
            </button>
          );
        })}
      </nav>
      <div className="px-3 pb-5 border-t border-white/8 pt-4">
        <button onClick={onExit} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#FAF7F2]/50 hover:text-[#FAF7F2]/80 transition-colors">
          <LogOut size={15} /> Back to Store
        </button>
      </div>
    </aside>
  );
}

// ─── ADMIN DASHBOARD ───────────────────────────────────────────────────────
function AdminDashboard({ setPage }: { setPage: (p: string) => void }) {
  const metrics = [
    { label: "Revenue (Jul)", value: "GH₵ 13,600", delta: "+18%", icon: DollarSign, up: true },
    { label: "Orders Today", value: "7", delta: "+3 vs yesterday", icon: Package, up: true },
    { label: "Custom Queue", value: "6", delta: "2 urgent", icon: Scissors, up: false },
    { label: "Low Stock", value: "2 items", delta: "Batik Set, Kente Gown", icon: AlertCircle, up: false },
  ];

  return (
    <div className="p-8" style={{ fontFamily: "var(--font-body)" }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Saturday, 12 July 2026</p>
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
            <span className="text-xs text-muted-foreground">Last 6 months</span>
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
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={CATEGORY_DATA} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                {CATEGORY_DATA.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v}%`, "Share"]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {CATEGORY_DATA.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                  <span>{d.name}</span>
                </div>
                <span className="font-semibold">{d.value}%</span>
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
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const filtered = PRODUCTS.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.fabric.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8" style={{ fontFamily: "var(--font-body)" }}>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Products</h1>
          <p className="text-muted-foreground text-sm mt-1">{PRODUCTS.length} total products</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-[#C4562A] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#A8411B] transition-colors flex items-center gap-2">
          <Plus size={15}/> Add Product
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl p-6 border border-border/50 shadow-sm mb-6">
          <div className="flex justify-between mb-5">
            <h2 className="font-bold text-lg" style={{ fontFamily: "var(--font-display)" }}>New Product</h2>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-[#1A1A18]"><X size={18}/></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {["Product Name","Price (GH₵)","Category","Fabric","Stock Qty"].map(l => (
              <div key={l}>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">{l}</label>
                <input className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C4562A]" />
              </div>
            ))}
            <div className="col-span-2 md:col-span-3">
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">Description</label>
              <textarea rows={3} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C4562A] resize-none" />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={() => setShowForm(false)} className="border border-border px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-muted transition-colors">Cancel</button>
            <button className="bg-[#C4562A] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#A8411B] transition-colors">Save Product</button>
          </div>
        </div>
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
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${p.inStock ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      {p.inStock ? "In Stock" : "Out of Stock"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-[#1A1A18]"><Edit size={14}/></button>
                      <button className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-[#C4562A]"><Eye size={14}/></button>
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

// ─── ADMIN ORDERS ──────────────────────────────────────────────────────────
function AdminOrders() {
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<(typeof ORDERS_DATA)[0] | null>(null);
  const statuses = ["All","Processing","Sewing","Ready","Shipped","Delivered"];
  const filtered = filter === "All" ? ORDERS_DATA : ORDERS_DATA.filter(o => o.status === filter);

  return (
    <div className="p-8" style={{ fontFamily: "var(--font-body)" }}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">{ORDERS_DATA.length} total orders</p>
        </div>
        <button className="border border-border px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-muted transition-colors flex items-center gap-2">
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
                  <tr key={o.id} onClick={() => setSelected(o)}
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
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="bg-card rounded-xl border border-border/50 shadow-sm p-6">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <p className="font-mono text-sm font-bold text-[#C4562A]">{selected.id}</p>
                  <p className="text-muted-foreground text-xs">{selected.date}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-[#1A1A18]"><X size={16}/></button>
              </div>
              <div className="space-y-3 text-sm mb-5">
                {[["Customer", selected.customer],["Items", selected.items],["Fabric", selected.fabric],["Amount", ghs(selected.amount)]].map(([k,v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">{k}</span>
                    <span className="font-semibold text-right">{v}</span>
                  </div>
                ))}
                {selected.custom && (
                  <div className="bg-[#F0EAE0] rounded-lg p-3 mt-2">
                    <p className="text-xs font-bold text-[#B8922A] uppercase tracking-wide mb-1">Custom Measurements</p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {[["Bust","92cm"],["Waist","74cm"],["Hips","100cm"],["Height","168cm"]].map(([k,v]) => (
                        <div key={k}><span className="text-muted-foreground">{k}: </span><span className="font-semibold">{v}</span></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wide text-muted-foreground">Update Status</label>
                <select defaultValue={selected.status} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C4562A]">
                  {["Processing","Sewing","Fitting","Ready","Shipped","Delivered"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 bg-[#C4562A] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#A8411B] transition-colors">Save Status</button>
                <button className="p-2.5 border border-border rounded-lg hover:bg-muted transition-colors"><Printer size={15}/></button>
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
  const [items, setItems] = useState(KANBAN_ITEMS);
  const byCol = (col: string) => items.filter(i => i.col === col);

  const moveItem = (id: string, toCol: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, col: toCol } : i));
  };

  return (
    <div className="p-8" style={{ fontFamily: "var(--font-body)" }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Tailoring Queue</h1>
        <p className="text-muted-foreground text-sm mt-1">Track every custom order through the making process</p>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {KANBAN_COLS.map(col => (
            <div key={col.key} className="w-56 bg-card rounded-xl border border-border/50 shadow-sm flex flex-col">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.color.includes("blue") ? "bg-blue-500" : col.color.includes("yellow") ? "bg-yellow-500" : col.color.includes("orange") ? "bg-orange-500" : col.color.includes("purple") ? "bg-purple-500" : col.color.includes("pink") ? "bg-pink-500" : "bg-green-500"}`} />
                  <span className="font-bold text-sm">{col.label}</span>
                </div>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-semibold">{byCol(col.key).length}</span>
              </div>
              <div className="p-3 flex flex-col gap-2.5 flex-1">
                {byCol(col.key).map(item => (
                  <div key={item.id} className="bg-background border border-border/60 rounded-lg p-3 shadow-sm">
                    <p className="font-mono text-[10px] text-[#C4562A] font-bold mb-1">{item.id}</p>
                    <p className="font-semibold text-xs leading-snug mb-1">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug mb-2">{item.item}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Calendar size={10}/> {item.due}</span>
                      <select value={item.col} onChange={e => moveItem(item.id, e.target.value)}
                        className="text-[10px] border border-border rounded px-1.5 py-0.5 focus:outline-none focus:border-[#C4562A] bg-card">
                        {KANBAN_COLS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
                {byCol(col.key).length === 0 && (
                  <div className="border-2 border-dashed border-border rounded-lg h-16 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">Empty</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN CUSTOMERS ───────────────────────────────────────────────────────
function AdminCustomers() {
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
                  {[["Bust","92cm"],["Waist","74cm"],["Hips","100cm"],["Height","168cm"]].map(([k,v]) => (
                    <div key={k} className="flex justify-between bg-[#F0EAE0] rounded px-2 py-1.5">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-semibold">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button className="w-full border border-border py-2.5 rounded-lg text-sm font-semibold hover:bg-muted transition-colors flex items-center justify-center gap-2">
                <Mail size={14}/> Send Message
              </button>
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
  const fabricData = [
    { name: "Ankara", orders: 58, revenue: 32400 },
    { name: "Kente", orders: 34, revenue: 28600 },
    { name: "Batik", orders: 29, revenue: 17800 },
  ];
  const weeklyData = [
    { day: "Mon", orders: 8 }, { day: "Tue", orders: 12 }, { day: "Wed", orders: 6 },
    { day: "Thu", orders: 15 }, { day: "Fri", orders: 18 }, { day: "Sat", orders: 22 }, { day: "Sun", orders: 9 },
  ];

  return (
    <div className="p-8" style={{ fontFamily: "var(--font-body)" }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Sales performance and trends</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {[{ label: "Avg Order Value", value: "GH₵ 529" },
          { label: "Returning Customers", value: "64%" },
          { label: "Custom Orders %", value: "38%" }].map(m => (
          <div key={m.label} className="bg-card rounded-xl p-5 border border-border/50 shadow-sm text-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{m.label}</p>
            <p className="text-3xl font-bold text-[#C4562A]">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Revenue chart */}
        <div className="bg-card rounded-xl p-6 border border-border/50 shadow-sm">
          <h2 className="font-bold text-base mb-5" style={{ fontFamily: "var(--font-display)" }}>Monthly Revenue & Orders</h2>
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

        {/* Weekly orders */}
        <div className="bg-card rounded-xl p-6 border border-border/50 shadow-sm">
          <h2 className="font-bold text-base mb-5" style={{ fontFamily: "var(--font-display)" }}>Orders This Week</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
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
                const share = Math.round(f.revenue / totalRev * 100);
                return (
                  <tr key={f.name} className="border-b border-border/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg" style={{ background: PIE_COLORS[i], opacity: 0.8 }} />
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN SETTINGS ────────────────────────────────────────────────────────
function AdminSettings() {
  const [tab, setTab] = useState("store");
  const tabs = [["store","Store Info"],["shipping","Shipping"],["payment","Payments"],["users","User Roles"]];

  return (
    <div className="p-8" style={{ fontFamily: "var(--font-body)" }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Settings</h1>
      </div>

      <div className="flex gap-1 mb-7 border-b border-border">
        {tabs.map(([k,label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === k ? "border-[#C4562A] text-[#C4562A]" : "border-transparent text-muted-foreground hover:text-[#1A1A18]"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "store" && (
        <div className="max-w-lg bg-card rounded-xl p-6 border border-border/50 shadow-sm">
          <h2 className="font-bold text-base mb-5" style={{ fontFamily: "var(--font-display)" }}>Store Information</h2>
          <div className="space-y-4">
            {[["Store Name","Anty Sala Fashion GH"],["Email","hello@antysalafashion.com"],["Phone","+233 24 000 0000"],["Address","14 Cantonments Road, Osu, Accra, Ghana"],["Instagram","@antysalafashiongh"],["WhatsApp","+233 24 000 0001"]].map(([label,val]) => (
              <div key={label}>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">{label}</label>
                <input defaultValue={val} className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C4562A]" />
              </div>
            ))}
          </div>
          <button className="mt-5 bg-[#C4562A] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#A8411B] transition-colors">Save Changes</button>
        </div>
      )}

      {tab === "shipping" && (
        <div className="max-w-lg bg-card rounded-xl p-6 border border-border/50 shadow-sm">
          <h2 className="font-bold text-base mb-5" style={{ fontFamily: "var(--font-display)" }}>Delivery Zones</h2>
          <div className="space-y-3">
            {[{ zone: "Accra Metro", cost: "GH₵ 30", days: "Same day" },
              { zone: "Greater Accra", cost: "GH₵ 50", days: "1–2 days" },
              { zone: "Other Ghana Regions", cost: "GH₵ 80", days: "3–5 days" },
              { zone: "UK & Europe", cost: "GH₵ 350", days: "7–14 days" },
              { zone: "USA & Canada", cost: "GH₵ 400", days: "10–18 days" }].map(z => (
              <div key={z.zone} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div>
                  <p className="font-semibold text-sm">{z.zone}</p>
                  <p className="text-xs text-muted-foreground">{z.days}</p>
                </div>
                <span className="font-bold text-[#C4562A]">{z.cost}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-[#F0EAE0] rounded-lg">
            <p className="text-xs font-semibold text-[#B8922A]">Free delivery on orders over GH₵ 500 (Accra only)</p>
          </div>
        </div>
      )}

      {tab === "payment" && (
        <div className="max-w-lg bg-card rounded-xl p-6 border border-border/50 shadow-sm">
          <h2 className="font-bold text-base mb-5" style={{ fontFamily: "var(--font-display)" }}>Payment Methods</h2>
          <div className="space-y-3">
            {[{ name: "MTN Mobile Money", active: true },
              { name: "Vodafone Cash", active: true },
              { name: "AirtelTigo Money", active: true },
              { name: "Visa / Mastercard", active: true },
              { name: "PayPal", active: false }].map(p => (
              <div key={p.name} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard size={16} className="text-muted-foreground" />
                  <span className="font-medium text-sm">{p.name}</span>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${p.active ? "bg-[#C4562A]" : "bg-muted"}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${p.active ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="max-w-lg bg-card rounded-xl p-6 border border-border/50 shadow-sm">
          <div className="flex justify-between mb-5">
            <h2 className="font-bold text-base" style={{ fontFamily: "var(--font-display)" }}>Admin Users</h2>
            <button className="text-xs bg-[#C4562A] text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-[#A8411B] transition-colors flex items-center gap-1"><Plus size={12}/> Invite</button>
          </div>
          <div className="space-y-3">
            {[{ name: "Sala Mensah", email: "sala@antysalafashion.com", role: "Owner" },
              { name: "Abena K.", email: "abena@antysalafashion.com", role: "Manager" },
              { name: "Efua D.", email: "efua@antysalafashion.com", role: "Staff" }].map(u => (
              <div key={u.name} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#C4562A]/10 rounded-full flex items-center justify-center text-xs font-bold text-[#C4562A]">{u.name.charAt(0)}</div>
                  <div>
                    <p className="font-semibold text-sm">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${u.role === "Owner" ? "bg-[#B8922A]/10 text-[#B8922A]" : "bg-muted text-muted-foreground"}`}>{u.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [adminPage, setAdminPage] = useState("dashboard");
  const [isAdmin, setIsAdmin] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page, isAdmin, adminPage]);

  const addToCart = (product: Product) => {
    setCartItems(prev => {
      const existing = prev.findIndex(i => i.product.id === product.id);
      if (existing >= 0) {
        const next = [...prev]; next[existing].qty += 1; return next;
      }
      return [...prev, { product, qty: 1, size: product.sizes[1] || product.sizes[0] }];
    });
  };

  const setPageNav = (p: string) => {
    // Handle product detail pages: "product-{id}"
    setPage(p);
  };

  // Extract product ID from page string
  const productId = page.startsWith("product-") ? parseInt(page.replace("product-", "")) : 0;

  if (isAdmin) {
    return (
      <div className="flex min-h-screen bg-background" style={{ fontFamily: "var(--font-body)" }}>
        <AdminSidebar page={adminPage} setPage={setAdminPage} onExit={() => setIsAdmin(false)} />
        <main className="flex-1 min-w-0 overflow-auto">
          {/* Admin Header */}
          <div className="sticky top-0 z-20 bg-background border-b border-border px-8 py-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">
              {ADMIN_LINKS.find(l => l.key === adminPage)?.label || "Admin"}
            </p>
            <div className="flex items-center gap-3">
              <button className="relative p-2 hover:bg-muted rounded-lg transition-colors">
                <Bell size={18} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#C4562A] rounded-full" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#C4562A]/10 rounded-full flex items-center justify-center text-sm font-bold text-[#C4562A]">S</div>
                <span className="text-sm font-semibold hidden sm:block">Sala M.</span>
              </div>
            </div>
          </div>
          {adminPage === "dashboard" && <AdminDashboard setPage={setAdminPage} />}
          {adminPage === "products" && <AdminProducts />}
          {adminPage === "orders" && <AdminOrders />}
          {adminPage === "custom-orders" && <AdminCustomOrders />}
          {adminPage === "customers" && <AdminCustomers />}
          {adminPage === "analytics" && <AdminAnalytics />}
          {adminPage === "settings" && <AdminSettings />}
        </main>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen" style={{ fontFamily: "var(--font-body)" }}>
      <CustomerNav page={page} setPage={setPageNav} cartCount={cartItems.reduce((s,i) => s + i.qty, 0)} onAdminEnter={() => setIsAdmin(true)} />
      {page === "home" && <HomePage setPage={setPageNav} addToCart={addToCart} />}
      {page === "shop" && <ShopPage setPage={setPageNav} addToCart={addToCart} />}
      {page.startsWith("product-") && <ProductDetailPage productId={productId} setPage={setPageNav} addToCart={addToCart} />}
      {page === "custom" && <CustomOrderPage />}
      {page === "cart" && <CartPage cartItems={cartItems} setCartItems={setCartItems} setPage={setPageNav} />}
      {page === "checkout" && <CheckoutPage cartItems={cartItems} setPage={setPageNav} />}
      {page === "account" && <AccountPage />}
      {page === "about" && <AboutPage />}
      {page === "contact" && <ContactPage />}

      {/* Admin quick access (footer level) */}
      <CustomerFooter setPage={setPageNav} />
      <button onClick={() => setIsAdmin(true)}
        className="fixed bottom-5 right-5 bg-[#1A1A18] text-white text-xs px-4 py-2.5 rounded-full shadow-lg hover:bg-[#2A2A20] transition-colors flex items-center gap-1.5 z-40">
        <Settings size={12}/> Admin Portal
      </button>
    </div>
  );
}
