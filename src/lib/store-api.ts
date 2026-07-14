import { supabase } from "./supabase";
import type { CloudinaryAsset } from "./cloudinary";

export interface StoreProduct {
  id: string;
  sku: string;
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  fabric: string;
  category: string;
  sizes: string[];
  colors: string[];
  images: string[];
  description: string;
  inStock: boolean;
  isActive: boolean;
  inventoryQuantity: number;
  badge?: string;
}

export interface Testimonial {
  id: string;
  name: string;
  location: string;
  rating: number;
  text: string;
}

export interface GalleryItem {
  id: string;
  imageUrl: string;
  altText: string;
}

export interface SavedAddress {
  id: string;
  recipientName: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

export interface CheckoutQuote {
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  total: number;
  promoApplied: boolean;
  promoMessage?: string;
}

export interface AccountData {
  orders: Array<{
    id: string;
    date: string;
    createdAt: string;
    items: string;
    itemDetails: Array<{ name: string; quantity: number; unitPrice: number; size?: string; color?: string }>;
    amount: number | null;
    status: string;
    isCustom: boolean;
    customDetails?: {
      customOrderId: string;
      style: string;
      fabric: string;
      occasion?: string;
      budget?: string;
      dueDate?: string;
      notes?: string;
      measurements: Array<{ label: string; value: string }>;
      currency: string;
      quotedPrice?: number;
      quoteStatus: string;
      paymentPlan: string;
      depositPercentage: number;
      paymentStatus: string;
      amountPaid: number;
    };
  }>;
  measurements: Array<{ label: string; value: string }>;
  wishlist: StoreProduct[];
  addresses: SavedAddress[];
}

export interface AdminOrder {
  id: string;
  databaseId: string;
  customer: string;
  items: string;
  amount: number;
  status: string;
  date: string;
  fabric: string;
  custom: boolean;
  paymentStatus: string;
  createdAt: string;
  paidAt?: string;
  salesBreakdown: Array<{ fabric: string; category: string; quantity: number; revenue: number }>;
  itemDetails: Array<{
    productId?: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    size?: string;
    color?: string;
    fabric: string;
    category: string;
    imageUrl?: string;
  }>;
}

export interface AdminCustomPayment {
  id: string;
  customOrderId: string;
  reference: string;
  amount: number;
  currency: string;
  paymentKind: string;
  paidAt: string;
  fabric: string;
}

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  orders: number;
  spent: number;
  location: string;
  joined: string;
  measurements: Array<{ label: string; value: string }>;
}

export interface TailoringItem {
  id: string;
  reference: string;
  name: string;
  item: string;
  col: string;
  due: string;
  createdAt: string;
  email: string;
  phone: string;
  style: string;
  fabric: string;
  occasion: string;
  budget: string;
  quotedPrice?: number;
  dueDateValue: string;
  currency: string;
  quoteStatus: string;
  paymentPlan: string;
  depositPercentage: number;
  paymentStatus: string;
  amountPaid: number;
  notes: string;
  measurements: Array<{ label: string; value: string }>;
  referenceMedia: Array<{ url: string; resourceType: string; name: string }>;
}

export interface AdminMediaItem {
  id: string;
  kind: "site" | "gallery";
  placement: string;
  altText: string;
  url: string;
  resourceType: string;
  updatedAt: string;
}

export interface AdminNotification {
  id: string;
  eventType: string;
  channel: string;
  recipient: string;
  subject: string;
  status: string;
  attempts: number;
  lastError: string;
  createdAt: string;
}

export interface AdminData {
  orders: AdminOrder[];
  customPayments: AdminCustomPayment[];
  customers: AdminCustomer[];
  tailoringItems: TailoringItem[];
  salesData: Array<{ month: string; revenue: number; orders: number }>;
  categoryData: Array<{ name: string; value: number }>;
  categories: Array<{ id: string; name: string; slug: string }>;
  products: StoreProduct[];
  media: AdminMediaItem[];
  notifications: AdminNotification[];
  settings: Record<string, unknown>;
  users: Array<{ id: string; userId: string; name: string; email: string; role: string; active: boolean }>;
}

export async function dispatchNotifications(): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.functions.invoke("notification-dispatch", { body: {} });
  } catch {
    // The database outbox retains pending notifications for a later retry.
  }
}

async function edgeFunctionError(error: unknown, fallback: string): Promise<Error> {
  let message = error instanceof Error ? error.message : fallback;
  const context = error && typeof error === "object" && "context" in error ? (error as { context?: unknown }).context : undefined;
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json() as { error?: unknown; message?: unknown };
      const detail = payload.error ?? payload.message;
      if (typeof detail === "string" && detail.trim()) message = detail;
    } catch { /* Keep the provider error when the response is not JSON. */ }
  }
  return new Error(message);
}

export async function subscribeToNewsletter(email: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { error } = await supabase.rpc("subscribe_to_newsletter", { subscriber_email: email });
  if (error) throw error;
  void dispatchNotifications();
}

export async function getProducts(): Promise<StoreProduct[]> {
  if (!supabase) throw new Error("Supabase is not configured. Add the Vite Supabase variables to .env.local.");

  const { data, error } = await supabase
    .from("products")
    .select("id,sku,slug,name,price,original_price,fabric,category:categories!products_category_id_fkey(name),sizes,colors,description,in_stock,is_active,inventory_quantity,badge,media:product_media!product_media_product_id_fkey(sort_order,asset:media_assets!product_media_media_id_fkey(secure_url))")
    .eq("is_active", true)
    .order("id");

  if (error) throw error;

  return (data ?? []).map((product) => mapProduct(product));
}

function mapProduct(product: any): StoreProduct {
  const media = [...(product.media ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: product.id,
    sku: product.sku,
    slug: product.slug,
    name: product.name,
    price: Number(product.price),
    originalPrice: product.original_price == null ? undefined : Number(product.original_price),
    fabric: product.fabric,
    category: Array.isArray(product.category) ? product.category[0]?.name ?? "Other" : product.category?.name ?? "Other",
    sizes: product.sizes ?? [],
    colors: product.colors ?? [],
    images: media.flatMap((item: any) => item.asset?.secure_url ? [item.asset.secure_url] : []),
    description: product.description,
    inStock: product.in_stock,
    isActive: product.is_active,
    inventoryQuantity: product.inventory_quantity ?? 0,
    badge: product.badge ?? undefined,
  };
}

export async function getStoreContent(): Promise<{ testimonials: Testimonial[]; gallery: GalleryItem[]; settings: Record<string, unknown>; siteMedia: Record<string, string> }> {
  if (!supabase) throw new Error("Supabase is not configured. Add the Vite Supabase variables to .env.local.");
  const [testimonialsResult, galleryResult, settingsResult, siteMediaResult] = await Promise.all([
    supabase.from("testimonials").select("id,customer_name,location,rating,body").eq("is_active", true).order("sort_order"),
    supabase.from("gallery_items").select("id,alt_text,media:media_assets!gallery_items_media_id_fkey(secure_url)").eq("is_active", true).order("sort_order"),
    supabase.from("store_settings").select("key,value").eq("is_public", true),
    supabase.from("site_media").select("placement,media:media_assets!site_media_media_id_fkey(secure_url)").eq("is_active", true),
  ]);
  if (testimonialsResult.error) throw testimonialsResult.error;
  if (galleryResult.error) throw galleryResult.error;
  if (settingsResult.error) throw settingsResult.error;
  if (siteMediaResult.error) throw siteMediaResult.error;
  return {
    testimonials: (testimonialsResult.data ?? []).map((item) => ({ id: item.id, name: item.customer_name, location: item.location ?? "", rating: item.rating, text: item.body })),
    gallery: (galleryResult.data ?? []).flatMap((item: any) => {
      const media = Array.isArray(item.media) ? item.media[0] : item.media;
      return media?.secure_url ? [{ id: item.id, imageUrl: media.secure_url, altText: item.alt_text }] : [];
    }),
    settings: Object.fromEntries((settingsResult.data ?? []).map((item) => [item.key, item.value])),
    siteMedia: Object.fromEntries((siteMediaResult.data ?? []).flatMap((item: any) => {
      const media = Array.isArray(item.media) ? item.media[0] : item.media;
      return media?.secure_url ? [[item.placement, media.secure_url]] : [];
    })),
  };
}

export async function getAccountData(): Promise<AccountData> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("You must be signed in.");

  const [ordersResult, customOrdersResult, measurementsResult, wishlistResult, addressesResult] = await Promise.all([
    supabase.from("orders").select("id,order_number,status,total,created_at,order_items(product_name,quantity,unit_price,selected_size,selected_color)").order("created_at", { ascending: false }),
    supabase.from("custom_orders").select("id,reference_number,status,style,fabric,occasion,budget_range,quoted_price,due_date,bust_cm,waist_cm,hips_cm,height_cm,notes,created_at,currency,quote_status,payment_plan,deposit_percentage,payment_status,amount_paid").eq("user_id", userData.user.id).order("created_at", { ascending: false }),
    supabase.from("customer_measurements").select("bust_cm,waist_cm,hips_cm,height_cm,shoulder_width_cm,arm_length_cm").eq("user_id", userData.user.id).maybeSingle(),
    supabase.from("wishlists").select("products(id,sku,slug,name,price,original_price,fabric,category:categories!products_category_id_fkey(name),sizes,colors,description,in_stock,is_active,inventory_quantity,badge,media:product_media!product_media_product_id_fkey(sort_order,asset:media_assets!product_media_media_id_fkey(secure_url)))").order("created_at", { ascending: false }),
    supabase.from("addresses").select("id,recipient_name,address_line,city,country,phone,is_default").order("is_default", { ascending: false }),
  ]);
  for (const result of [ordersResult, customOrdersResult, measurementsResult, wishlistResult, addressesResult]) if (result.error) throw result.error;

  const measurements = measurementsResult.data;
  const measurementFields: Array<[string, unknown]> = measurements ? [
    ["Bust", measurements.bust_cm], ["Waist", measurements.waist_cm], ["Hips", measurements.hips_cm],
    ["Full Height", measurements.height_cm], ["Shoulder Width", measurements.shoulder_width_cm], ["Arm Length", measurements.arm_length_cm],
  ] : [];

  const storeOrders: AccountData["orders"] = (ordersResult.data ?? []).map((order) => ({
      id: order.order_number,
      date: new Intl.DateTimeFormat("en-GH", { dateStyle: "medium" }).format(new Date(order.created_at)),
      createdAt: order.created_at,
      items: (order.order_items ?? []).map((item: any) => `${item.product_name} × ${item.quantity}`).join(", "),
      itemDetails: (order.order_items ?? []).map((item: any) => ({
        name: item.product_name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        size: item.selected_size ?? undefined,
        color: item.selected_color ?? undefined,
      })),
      amount: Number(order.total),
      status: order.status === "draft" ? "Created" : formatOrderStatus(order.status),
      isCustom: false,
    }));
  const customOrders: AccountData["orders"] = (customOrdersResult.data ?? []).map((order) => ({
    id: order.reference_number,
    date: new Intl.DateTimeFormat("en-GH", { dateStyle: "medium" }).format(new Date(order.created_at)),
    createdAt: order.created_at,
    items: `${order.style} · ${order.fabric}`,
    itemDetails: [],
    amount: order.quoted_price == null ? null : Number(order.quoted_price),
    status: order.status === "new" ? "Submitted" : titleCase(order.status),
    isCustom: true,
    customDetails: {
      customOrderId: order.id,
      style: order.style,
      fabric: order.fabric,
      occasion: order.occasion ?? undefined,
      budget: order.budget_range ?? undefined,
      dueDate: order.due_date ? new Intl.DateTimeFormat("en-GH", { dateStyle: "medium" }).format(new Date(`${order.due_date}T00:00:00`)) : undefined,
      notes: order.notes ?? undefined,
      measurements: [
        ["Bust", order.bust_cm], ["Waist", order.waist_cm], ["Hips", order.hips_cm], ["Height", order.height_cm],
      ].filter(([, value]) => value != null).map(([label, value]) => ({ label: String(label), value: `${value} cm` })),
      currency: order.currency,
      quotedPrice: order.quoted_price == null ? undefined : Number(order.quoted_price),
      quoteStatus: order.quote_status,
      paymentPlan: order.payment_plan,
      depositPercentage: Number(order.deposit_percentage),
      paymentStatus: order.payment_status,
      amountPaid: Number(order.amount_paid),
    },
  }));

  return {
    orders: [...storeOrders, ...customOrders].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    measurements: measurementFields.filter(([, value]) => value != null).map(([label, value]) => ({ label, value: `${value} cm` })),
    wishlist: (wishlistResult.data ?? []).flatMap((row: any) => row.products ? [mapProduct(row.products)] : []),
    addresses: (addressesResult.data ?? []).map((address) => ({
      id: address.id, recipientName: address.recipient_name, address: address.address_line,
      city: address.city, country: address.country, phone: address.phone ?? "", isDefault: address.is_default,
    })),
  };
}

export async function getSavedAddresses(): Promise<SavedAddress[]> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("You must be signed in to continue to checkout.");
  const { data, error } = await supabase
    .from("addresses")
    .select("id,recipient_name,address_line,city,country,phone,is_default")
    .eq("user_id", userData.user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((address) => ({
    id: address.id,
    recipientName: address.recipient_name,
    address: address.address_line,
    city: address.city,
    country: address.country,
    phone: address.phone ?? "",
    isDefault: address.is_default,
  }));
}

export async function addSavedAddress(input: Omit<SavedAddress, "id">): Promise<SavedAddress> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("You must be signed in to save an address.");
  if (input.isDefault) {
    const { error: defaultError } = await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", userData.user.id);
    if (defaultError) throw defaultError;
  }
  const { data, error } = await supabase.from("addresses").insert({
    user_id: userData.user.id,
    recipient_name: input.recipientName,
    address_line: input.address,
    city: input.city,
    country: input.country,
    phone: input.phone,
    is_default: input.isDefault,
  }).select("id,recipient_name,address_line,city,country,phone,is_default").single();
  if (error) throw error;
  return {
    id: data.id,
    recipientName: data.recipient_name,
    address: data.address_line,
    city: data.city,
    country: data.country,
    phone: data.phone ?? "",
    isDefault: data.is_default,
  };
}

export async function updateSavedAddress(input: SavedAddress): Promise<SavedAddress> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("You must be signed in to update an address.");
  if (input.isDefault) {
    const { error: defaultError } = await supabase.from("addresses").update({ is_default: false }).eq("user_id", userData.user.id);
    if (defaultError) throw defaultError;
  }
  const { data, error } = await supabase.from("addresses").update({
    recipient_name: input.recipientName,
    address_line: input.address,
    city: input.city,
    country: input.country,
    phone: input.phone,
    is_default: input.isDefault,
  }).eq("id", input.id).eq("user_id", userData.user.id)
    .select("id,recipient_name,address_line,city,country,phone,is_default").single();
  if (error) throw error;
  return {
    id: data.id, recipientName: data.recipient_name, address: data.address_line,
    city: data.city, country: data.country, phone: data.phone ?? "", isDefault: data.is_default,
  };
}

export async function saveMeasurements(input: {
  bust?: number; waist?: number; hips?: number; height?: number; shoulderWidth?: number; armLength?: number;
}): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("You must be signed in to save measurements.");
  const { error } = await supabase.from("customer_measurements").upsert({
    user_id: userData.user.id,
    bust_cm: input.bust ?? null,
    waist_cm: input.waist ?? null,
    hips_cm: input.hips ?? null,
    height_cm: input.height ?? null,
    shoulder_width_cm: input.shoulderWidth ?? null,
    arm_length_cm: input.armLength ?? null,
  }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function getWishlistProductIds(): Promise<string[]> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];
  const { data, error } = await supabase
    .from("wishlists")
    .select("product_id")
    .eq("user_id", userData.user.id);
  if (error) throw error;
  return (data ?? []).map((item) => item.product_id);
}

export async function addWishlistItem(productId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("You must be signed in to save wishlist items.");
  const { error } = await supabase.from("wishlists").upsert({
    user_id: userData.user.id,
    product_id: productId,
  }, { onConflict: "user_id,product_id", ignoreDuplicates: true });
  if (error) throw error;
}

export async function removeWishlistItem(productId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("You must be signed in to update your wishlist.");
  const { error } = await supabase
    .from("wishlists")
    .delete()
    .eq("user_id", userData.user.id)
    .eq("product_id", productId);
  if (error) throw error;
}

const titleCase = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatOrderStatus = (value: string) => value === "draft" ? "Draft (not paid)" : titleCase(value);

export async function getAdminData(): Promise<AdminData> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("You must be signed in.");
  const { data: adminMembership, error: adminMembershipError } = await supabase
    .from("admin_users")
    .select("id,role,is_active")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (adminMembershipError) throw adminMembershipError;
  if (!adminMembership?.is_active) throw new Error("Staff access is required.");

  const [ordersResult, directoryResult, customResult, customPaymentsResult, productsResult, categoriesResult, measurementsResult, settingsResult, siteMediaResult, galleryMediaResult, notificationsResult] = await Promise.all([
    supabase.from("orders").select("id,order_number,user_id,customer_name,customer_email,shipping_city,status,payment_status,total,created_at,paid_at,order_items(product_id,product_name,sku,quantity,unit_price,selected_size,selected_color,products(fabric,category:categories(name)))").order("created_at", { ascending: false }),
    supabase.rpc("admin_directory"),
    supabase.from("custom_orders").select("id,reference_number,customer_name,email,phone,style,fabric,occasion,budget_range,quoted_price,bust_cm,waist_cm,hips_cm,height_cm,notes,status,due_date,created_at,currency,quote_status,payment_plan,deposit_percentage,payment_status,amount_paid,media:custom_order_media(sort_order,asset:media_assets(secure_url,resource_type,original_filename))").order("created_at", { ascending: false }),
    supabase.from("custom_order_payments").select("id,custom_order_id,amount,currency,payment_kind,paid_at,custom_order:custom_orders(reference_number,fabric)").eq("status", "paid").not("paid_at", "is", null).order("paid_at", { ascending: false }),
    supabase.from("products").select("id,sku,slug,name,price,original_price,fabric,category:categories!products_category_id_fkey(name),sizes,colors,description,in_stock,is_active,inventory_quantity,badge,media:product_media!product_media_product_id_fkey(sort_order,asset:media_assets!product_media_media_id_fkey(secure_url))").order("created_at", { ascending: false }),
    supabase.from("categories").select("id,name,slug").order("sort_order").order("name"),
    supabase.from("customer_measurements").select("user_id,bust_cm,waist_cm,hips_cm,height_cm"),
    supabase.from("store_settings").select("key,value"),
    supabase.from("site_media").select("id,placement,alt_text,updated_at,media:media_assets!site_media_media_id_fkey(secure_url,resource_type)").eq("is_active", true).order("placement"),
    supabase.from("gallery_items").select("id,alt_text,updated_at,media:media_assets!gallery_items_media_id_fkey(secure_url,resource_type)").eq("is_active", true).order("sort_order"),
    supabase.from("notification_outbox").select("id,event_type,channel,recipient,subject,status,attempts,last_error,created_at").order("created_at", { ascending: false }).limit(200),
  ]);
  for (const result of [ordersResult, directoryResult, customResult, customPaymentsResult, productsResult, categoriesResult, measurementsResult, settingsResult, siteMediaResult, galleryMediaResult, notificationsResult]) if (result.error) throw result.error;

  const rawOrders = ordersResult.data ?? [];
  const directory = directoryResult.data ?? [];
  const adminProducts = (productsResult.data ?? []).map((product) => mapProduct(product));
  const productById = new Map(adminProducts.map((product) => [product.id, product]));
  const salesMap = new Map<string, { month: string; revenue: number; orders: number }>();
  for (const order of rawOrders) {
    if (order.payment_status !== "paid") continue;
    const date = new Date(order.paid_at ?? order.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const current = salesMap.get(key) ?? { month: new Intl.DateTimeFormat("en-GH", { month: "short", year: "numeric" }).format(date), revenue: 0, orders: 0 };
    current.revenue += Number(order.total);
    current.orders += 1;
    salesMap.set(key, current);
  }
  for (const payment of customPaymentsResult.data ?? []) {
    const date = new Date(payment.paid_at!);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const current = salesMap.get(key) ?? { month: new Intl.DateTimeFormat("en-GH", { month: "short", year: "numeric" }).format(date), revenue: 0, orders: 0 };
    current.revenue += Number(payment.amount);
    current.orders += 1;
    salesMap.set(key, current);
  }
  const categoryMap = new Map<string, number>();
  for (const order of rawOrders) {
    if (order.payment_status !== "paid") continue;
    for (const item of order.order_items ?? []) {
      const productRelation = (item as any).products;
      const product = Array.isArray(productRelation) ? productRelation[0] : productRelation;
      const categoryRelation = product?.category;
      const category = Array.isArray(categoryRelation) ? categoryRelation[0] : categoryRelation;
      const name = category?.name ?? "Other";
      categoryMap.set(name, (categoryMap.get(name) ?? 0) + Number((item as any).quantity));
    }
  }
  const measurementByUser = new Map((measurementsResult.data ?? []).map((measurement) => [measurement.user_id, measurement]));
  const ordersByUser = new Map<string, { count: number; spent: number; email: string; city: string }>();
  for (const order of rawOrders) if (order.user_id && order.payment_status === "paid") {
    const current = ordersByUser.get(order.user_id) ?? { count: 0, spent: 0, email: order.customer_email, city: order.shipping_city };
    current.count += 1; current.spent += Number(order.total); ordersByUser.set(order.user_id, current);
  }

  return {
    orders: rawOrders.map((order) => {
      const productRelation = (order.order_items?.[0] as any)?.products;
      const product = Array.isArray(productRelation) ? productRelation[0] : productRelation;
      const salesBreakdown = (order.order_items ?? []).map((item: any) => {
        const itemProductRelation = item.products;
        const itemProduct = Array.isArray(itemProductRelation) ? itemProductRelation[0] : itemProductRelation;
        const categoryRelation = itemProduct?.category;
        const category = Array.isArray(categoryRelation) ? categoryRelation[0] : categoryRelation;
        return {
          fabric: itemProduct?.fabric ?? "Other",
          category: category?.name ?? "Other",
          quantity: Number(item.quantity),
          revenue: Number(item.unit_price) * Number(item.quantity),
        };
      });
      const itemDetails = (order.order_items ?? []).map((item: any) => {
        const itemProductRelation = item.products;
        const itemProduct = Array.isArray(itemProductRelation) ? itemProductRelation[0] : itemProductRelation;
        const categoryRelation = itemProduct?.category;
        const category = Array.isArray(categoryRelation) ? categoryRelation[0] : categoryRelation;
        const currentProduct = item.product_id ? productById.get(item.product_id) : undefined;
        return {
          productId: item.product_id ?? undefined,
          name: item.product_name,
          sku: item.sku,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unit_price),
          size: item.selected_size ?? undefined,
          color: item.selected_color ?? undefined,
          fabric: itemProduct?.fabric ?? currentProduct?.fabric ?? "Other",
          category: category?.name ?? currentProduct?.category ?? "Other",
          imageUrl: currentProduct?.images[0],
        };
      });
      return {
        id: order.order_number, databaseId: order.id, customer: order.customer_name,
        items: (order.order_items ?? []).map((item: any) => `${item.product_name} × ${item.quantity}`).join(", "),
        amount: Number(order.total), status: formatOrderStatus(order.status),
        date: new Intl.DateTimeFormat("en-GH", { dateStyle: "medium" }).format(new Date(order.created_at)),
        fabric: product?.fabric ?? "", custom: false,
        paymentStatus: order.payment_status,
        createdAt: order.created_at,
        paidAt: order.paid_at ?? undefined,
        salesBreakdown,
        itemDetails,
      };
    }),
    customPayments: (customPaymentsResult.data ?? []).map((payment: any) => {
      const customOrder = Array.isArray(payment.custom_order) ? payment.custom_order[0] : payment.custom_order;
      return {
        id: payment.id,
        customOrderId: payment.custom_order_id,
        reference: customOrder?.reference_number ?? "Custom order",
        amount: Number(payment.amount),
        currency: payment.currency,
        paymentKind: payment.payment_kind,
        paidAt: payment.paid_at,
        fabric: customOrder?.fabric ?? "Custom Tailoring",
      };
    }),
    customers: directory.filter((item: any) => !item.admin_user_id || !item.admin_is_active).map((item: any) => {
      const aggregate = ordersByUser.get(item.user_id);
      const measurement = measurementByUser.get(item.user_id);
      return {
        id: item.user_id, name: item.full_name ?? item.email ?? "Customer", email: item.email ?? aggregate?.email ?? "",
        orders: aggregate?.count ?? 0, spent: aggregate?.spent ?? 0, location: aggregate?.city ?? "",
        joined: new Intl.DateTimeFormat("en-GH", { month: "short", year: "numeric" }).format(new Date(item.created_at)),
        measurements: measurement ? [["Bust", measurement.bust_cm], ["Waist", measurement.waist_cm], ["Hips", measurement.hips_cm], ["Height", measurement.height_cm]].filter(([, value]) => value != null).map(([label, value]) => ({ label: String(label), value: `${value} cm` })) : [],
      };
    }),
    tailoringItems: (customResult.data ?? []).map((item: any) => ({
      id: item.id,
      reference: item.reference_number,
      name: item.customer_name,
      item: `${item.style} · ${item.fabric}`,
      col: item.status,
      due: item.due_date ? new Intl.DateTimeFormat("en-GH", { dateStyle: "medium" }).format(new Date(`${item.due_date}T00:00:00`)) : "",
      createdAt: item.created_at,
      email: item.email,
      phone: item.phone,
      style: item.style,
      fabric: item.fabric,
      occasion: item.occasion ?? "",
      budget: item.budget_range ?? "",
      quotedPrice: item.quoted_price == null ? undefined : Number(item.quoted_price),
      dueDateValue: item.due_date ?? "",
      currency: item.currency,
      quoteStatus: item.quote_status,
      paymentPlan: item.payment_plan,
      depositPercentage: Number(item.deposit_percentage),
      paymentStatus: item.payment_status,
      amountPaid: Number(item.amount_paid),
      notes: item.notes ?? "",
      measurements: [["Bust", item.bust_cm], ["Waist", item.waist_cm], ["Hips", item.hips_cm], ["Height", item.height_cm]]
        .filter(([, value]) => value != null)
        .map(([label, value]) => ({ label: String(label), value: `${value} cm` })),
      referenceMedia: (item.media ?? []).sort((left: any, right: any) => left.sort_order - right.sort_order).flatMap((mediaItem: any) => {
        const asset = Array.isArray(mediaItem.asset) ? mediaItem.asset[0] : mediaItem.asset;
        return asset?.secure_url ? [{ url: asset.secure_url, resourceType: asset.resource_type, name: asset.original_filename ?? "Reference" }] : [];
      }),
    })),
    salesData: [...salesMap.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, value]) => value),
    categoryData: [...categoryMap].map(([name, value]) => ({ name, value })),
    categories: categoriesResult.data ?? [],
    products: adminProducts,
    media: [
      ...(siteMediaResult.data ?? []).flatMap((item: any) => {
        const asset = Array.isArray(item.media) ? item.media[0] : item.media;
        return asset?.secure_url ? [{ id: item.id, kind: "site" as const, placement: item.placement, altText: item.alt_text, url: asset.secure_url, resourceType: asset.resource_type, updatedAt: item.updated_at }] : [];
      }),
      ...(galleryMediaResult.data ?? []).flatMap((item: any) => {
        const asset = Array.isArray(item.media) ? item.media[0] : item.media;
        return asset?.secure_url ? [{ id: item.id, kind: "gallery" as const, placement: "gallery", altText: item.alt_text, url: asset.secure_url, resourceType: asset.resource_type, updatedAt: item.updated_at }] : [];
      }),
    ],
    notifications: (notificationsResult.data ?? []).map((item) => ({
      id: item.id,
      eventType: titleCase(item.event_type),
      channel: titleCase(item.channel),
      recipient: item.recipient,
      subject: item.subject ?? "",
      status: titleCase(item.status),
      attempts: item.attempts,
      lastError: item.last_error ?? "",
      createdAt: new Intl.DateTimeFormat("en-GH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at)),
    })),
    settings: Object.fromEntries((settingsResult.data ?? []).map((item) => [item.key, item.value])),
    users: directory.filter((item: any) => item.admin_user_id).map((item: any) => ({
      id: item.admin_user_id,
      userId: item.user_id,
      name: item.full_name ?? item.email ?? "Admin user",
      email: item.email ?? "",
      role: titleCase(item.admin_role),
      active: Boolean(item.admin_is_active),
    })),
  };
}

export async function updateCustomOrderStatus(id: string, status: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { error } = await supabase.from("custom_orders").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function setCustomOrderQuote(input: {
  customOrderId: string;
  quotedPrice: number;
  dueDate?: string;
  paymentPlan: "full" | "deposit";
  depositPercentage: number;
}): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { error } = await supabase.rpc("admin_set_custom_order_quote", {
    custom_order_id_input: input.customOrderId,
    quoted_price_input: input.quotedPrice,
    due_date_input: input.dueDate || null,
    payment_plan_input: input.paymentPlan,
    deposit_percentage_input: input.paymentPlan === "deposit" ? input.depositPercentage : 100,
  });
  if (error) throw error;
  void dispatchNotifications();
}

export async function initializeCustomOrderPayment(customOrderId: string, callbackUrl: string): Promise<{
  authorizationUrl: string;
  reference: string;
  customOrderReference: string;
  amount: number;
  currency: string;
  paymentKind: string;
}> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { data, error } = await supabase.functions.invoke("custom-pay-init", { body: { customOrderId, callbackUrl } });
  if (error) throw await edgeFunctionError(error, "Custom payment could not be started.");
  if (data?.error) throw new Error(data.error);
  if (!data?.authorizationUrl) throw new Error("Paystack did not return a custom-order checkout URL.");
  return { ...data, amount: Number(data.amount) };
}

export async function verifyCustomOrderPayment(reference: string): Promise<{ paid: boolean; status: string; customOrderReference?: string }> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { data, error } = await supabase.functions.invoke("custom-paystack-verify", { body: { reference } });
  if (error) throw await edgeFunctionError(error, "Custom payment verification failed.");
  if (data?.error) throw new Error(data.error);
  return { paid: Boolean(data?.paid), status: data?.status ?? "pending", customOrderReference: data?.customOrderReference };
}

export async function submitCustomOrder(input: {
  name: string;
  email: string;
  phone: string;
  style: string;
  fabric: string;
  occasion?: string;
  budget?: string;
  bust?: string;
  waist?: string;
  hips?: string;
  height?: string;
  notes?: string;
  media?: CloudinaryAsset[];
}): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured yet.");

  const { data, error } = await supabase.rpc("submit_custom_order", {
    request: input,
  });

  if (error) throw error;
  void dispatchNotifications();
  return data;
}

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function createCategory(name: string): Promise<{ id: string; name: string; slug: string }> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Enter a category name.");
  const { data, error } = await supabase.from("categories").insert({
    name: trimmedName,
    slug: slugify(trimmedName),
  }).select("id,name,slug").single();
  if (error) throw error;
  return data;
}

export async function createProduct(input: {
  name: string;
  sku: string;
  price: number;
  category: string;
  fabric: string;
  inventoryQuantity: number;
  description: string;
  sizes: string[];
  colors: string[];
  media: CloudinaryAsset[];
}): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  if (!input.media.length) throw new Error("Upload at least one product image to Cloudinary.");

  const categorySlug = slugify(input.category);
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .upsert({ name: input.category.trim(), slug: categorySlug }, { onConflict: "slug" })
    .select("id")
    .single();
  if (categoryError) throw categoryError;

  const { data: product, error: productError } = await supabase.from("products").insert({
    name: input.name.trim(),
    slug: slugify(input.name),
    sku: input.sku.trim(),
    price: input.price,
    category_id: category.id,
    fabric: input.fabric.trim(),
    inventory_quantity: input.inventoryQuantity,
    in_stock: input.inventoryQuantity > 0,
    description: input.description.trim(),
    sizes: input.sizes,
    colors: input.colors,
  }).select("id").single();
  if (productError) throw productError;

  const { data: assets, error: assetsError } = await supabase.from("media_assets").upsert(
    input.media.map((asset) => ({
      public_id: asset.publicId, secure_url: asset.secureUrl, resource_type: asset.resourceType,
      format: asset.format ?? null, width: asset.width ?? null, height: asset.height ?? null,
      bytes: asset.bytes ?? null, original_filename: asset.originalFilename ?? null,
    })),
    { onConflict: "public_id" },
  ).select("id,public_id");
  if (assetsError) throw assetsError;

  const idsByPublicId = new Map((assets ?? []).map((asset) => [asset.public_id, asset.id]));
  const { error: mediaError } = await supabase.from("product_media").insert(
    input.media.map((asset, sortOrder) => ({
      product_id: product.id,
      media_id: idsByPublicId.get(asset.publicId),
      alt_text: input.name.trim(),
      sort_order: sortOrder,
    })),
  );
  if (mediaError) throw mediaError;
}

async function saveCloudinaryAsset(asset: CloudinaryAsset): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { data, error } = await supabase.from("media_assets").upsert({
    public_id: asset.publicId,
    secure_url: asset.secureUrl,
    resource_type: asset.resourceType,
    format: asset.format ?? null,
    width: asset.width ?? null,
    height: asset.height ?? null,
    bytes: asset.bytes ?? null,
    original_filename: asset.originalFilename ?? null,
  }, { onConflict: "public_id" }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function saveSiteMedia(placement: string, altText: string, asset: CloudinaryAsset): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const mediaId = await saveCloudinaryAsset(asset);
  const { error } = await supabase.from("site_media").upsert({
    placement,
    media_id: mediaId,
    alt_text: altText.trim(),
    is_active: true,
  }, { onConflict: "placement" });
  if (error) throw error;
}

export async function addGalleryMedia(altText: string, asset: CloudinaryAsset): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const mediaId = await saveCloudinaryAsset(asset);
  const { count, error: countError } = await supabase.from("gallery_items").select("id", { count: "exact", head: true });
  if (countError) throw countError;
  const { error } = await supabase.from("gallery_items").insert({
    media_id: mediaId,
    alt_text: altText.trim(),
    sort_order: count ?? 0,
  });
  if (error) throw error;
}

export async function removeAdminMedia(kind: "site" | "gallery", id: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const table = kind === "site" ? "site_media" : "gallery_items";
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

export async function updateProduct(input: {
  id: string;
  name: string;
  sku: string;
  price: number;
  category: string;
  fabric: string;
  inventoryQuantity: number;
  description: string;
  sizes: string[];
  colors: string[];
  media: CloudinaryAsset[];
}): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const categorySlug = slugify(input.category);
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .upsert({ name: input.category.trim(), slug: categorySlug }, { onConflict: "slug" })
    .select("id")
    .single();
  if (categoryError) throw categoryError;

  const { error: productError } = await supabase.from("products").update({
    name: input.name.trim(),
    slug: slugify(input.name),
    sku: input.sku.trim(),
    price: input.price,
    category_id: category.id,
    fabric: input.fabric.trim(),
    inventory_quantity: input.inventoryQuantity,
    in_stock: input.inventoryQuantity > 0,
    description: input.description.trim(),
    sizes: input.sizes,
    colors: input.colors,
  }).eq("id", input.id);
  if (productError) throw productError;

  if (input.media.length) {
    const { count, error: countError } = await supabase.from("product_media").select("id", { count: "exact", head: true }).eq("product_id", input.id);
    if (countError) throw countError;
    for (const [index, asset] of input.media.entries()) {
      const mediaId = await saveCloudinaryAsset(asset);
      const { error } = await supabase.from("product_media").upsert({
        product_id: input.id,
        media_id: mediaId,
        alt_text: input.name.trim(),
        sort_order: (count ?? 0) + index,
      }, { onConflict: "product_id,media_id" });
      if (error) throw error;
    }
  }
}

export async function archiveProduct(productId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { error } = await supabase.from("products").update({ is_active: false, in_stock: false }).eq("id", productId);
  if (error) throw error;
}

export async function restoreProduct(productId: string, inventoryQuantity: number): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { error } = await supabase.from("products").update({
    is_active: true,
    in_stock: inventoryQuantity > 0,
  }).eq("id", productId);
  if (error) throw error;
}

export async function updateOrderStatus(orderId: string, status: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const databaseStatus = status === "Draft (not paid)" ? "draft" : status.toLowerCase();
  if (!["draft", "paid", "processing", "shipped", "delivered", "cancelled"].includes(databaseStatus)) {
    throw new Error("Unsupported order status.");
  }
  const { error } = await supabase.from("orders").update({ status: databaseStatus }).eq("id", orderId);
  if (error) throw error;
  void dispatchNotifications();
}

export async function saveStoreSettings(settings: Record<string, string>): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const entries = Object.entries(settings).map(([key, value]) => ({ key, value, is_public: true }));
  if (!entries.length) return;
  const { error } = await supabase.from("store_settings").upsert(entries, { onConflict: "key" });
  if (error) throw error;
}

export async function addAdminUserByEmail(email: string, role: "staff" | "admin"): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { error } = await supabase.rpc("add_admin_user_by_email", { user_email: email, requested_role: role });
  if (error) throw error;
}

export async function setAdminUserAccess(id: string, role: "staff" | "admin", active: boolean): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { error } = await supabase.rpc("set_admin_user_access", {
    admin_membership_id: id,
    requested_role: role,
    requested_active: active,
  });
  if (error) throw error;
}

export async function submitContactMessage(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured yet.");

  const { data: authData } = await supabase.auth.getUser();
  const { error } = await supabase.from("contact_messages").insert({
    user_id: authData.user?.id ?? null,
    name: input.name,
    email: input.email.toLowerCase(),
    subject: input.subject,
    message: input.message,
  });

  if (error) throw error;
  void dispatchNotifications();
}

export async function getCheckoutQuote(
  items: Array<{ productId: string; quantity: number; size?: string; color?: string }>,
  promoCode?: string,
): Promise<CheckoutQuote> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { data, error } = await supabase.rpc("calculate_checkout_quote", {
    items: items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      size: item.size ?? null,
      color: item.color ?? null,
    })),
    promo_code_input: promoCode?.trim() || null,
  });
  if (error) throw error;
  const quote = data?.[0];
  if (!quote) throw new Error("The checkout total could not be calculated.");
  return {
    subtotal: Number(quote.subtotal),
    discountAmount: Number(quote.discount_amount),
    shippingFee: Number(quote.shipping_fee),
    total: Number(quote.total),
    promoApplied: Boolean(quote.promo_applied),
    promoMessage: quote.promo_message ?? undefined,
  };
}

export async function initializePaystackCheckout(input: {
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
  };
  items: Array<{ productId: string; quantity: number; size?: string; color?: string }>;
  promoCode?: string;
  checkoutKey: string;
  callbackUrl: string;
}): Promise<{ authorizationUrl: string; reference: string; orderNumber: string; total: number; currency: string }> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { data, error } = await supabase.functions.invoke("paystack-initialize", { body: {
    customer: input.customer,
    items: input.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      size: item.size ?? null,
      color: item.color ?? null,
    })),
    promoCode: input.promoCode?.trim() || null,
    checkoutKey: input.checkoutKey,
    callbackUrl: input.callbackUrl,
  } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.authorizationUrl) throw new Error("Paystack did not return a checkout URL.");
  return {
    authorizationUrl: data.authorizationUrl,
    reference: data.reference,
    orderNumber: data.orderNumber,
    total: Number(data.total),
    currency: data.currency,
  };
}

export async function verifyPaystackPayment(reference: string): Promise<{ paid: boolean; status: string; orderNumber?: string }> {
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { data, error } = await supabase.functions.invoke("paystack-verify", { body: { reference } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return { paid: Boolean(data?.paid), status: data?.status ?? "pending", orderNumber: data?.orderNumber };
}
