import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, envKey, json } from "../_shared/http.ts";

type Notification = {
  id: string;
  event_type: string;
  channel: "email" | "whatsapp";
  recipient: string;
  subject: string | null;
  payload: Record<string, unknown>;
};

const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const money = (payload: Record<string, unknown>) => `${escapeHtml(payload.currency ?? "GHS")} ${Number(payload.total ?? 0).toFixed(2)}`;
const orderItems = (payload: Record<string, unknown>) => Array.isArray(payload.items) && payload.items.length
  ? `<ul>${payload.items.map((item: Record<string, unknown>) => `<li>${escapeHtml(item.name)} × ${escapeHtml(item.quantity)}${item.size ? ` — size ${escapeHtml(item.size)}` : ""}</li>`).join("")}</ul>`
  : "";

function emailContent(notification: Notification): string {
  const payload = notification.payload;
  const customerName = escapeHtml(payload.customerName || "there");
  let heading = notification.subject ?? "Aunty Sala Fashion Gh update";
  let content = "<p>We have an update for you.</p>";

  switch (notification.event_type) {
    case "account_created":
      heading = "Welcome to Aunty Sala Fashion Gh";
      content = `<p>Hello ${customerName},</p><p>Your account has been created. You can now track orders, save addresses and measurements, and manage your wishlist.</p>`;
      break;
    case "admin_account_created":
      content = `<p>A new customer account was created.</p><p><strong>Name:</strong> ${customerName}<br><strong>Email:</strong> ${escapeHtml(payload.customerEmail)}</p>`;
      break;
    case "order_paid":
      content = `<p>Hello ${customerName},</p><p>Payment for order <strong>${escapeHtml(payload.orderNumber)}</strong> has been verified.</p>${orderItems(payload)}<p><strong>Total:</strong> ${money(payload)}</p><p>We will email you whenever its status changes.</p>`;
      break;
    case "admin_order_paid":
      content = `<p>A new paid order is ready for processing.</p><p><strong>Order:</strong> ${escapeHtml(payload.orderNumber)}<br><strong>Customer:</strong> ${customerName}</p>${orderItems(payload)}<p><strong>Total:</strong> ${money(payload)}</p>`;
      break;
    case "order_status_changed":
      content = `<p>Hello ${customerName},</p><p>Order <strong>${escapeHtml(payload.orderNumber)}</strong> is now <strong>${escapeHtml(payload.status)}</strong>.</p>`;
      break;
    case "contact_submitted":
      content = `<p>A new contact form message was received.</p><p><strong>From:</strong> ${customerName} (${escapeHtml(payload.customerEmail)})<br><strong>Subject:</strong> ${escapeHtml(payload.subject)}</p><div style="white-space:pre-wrap">${escapeHtml(payload.message)}</div>`;
      break;
    case "custom_order_submitted":
      content = `<p>Hello ${customerName},</p><p>We received your custom order request <strong>${escapeHtml(payload.reference)}</strong> for ${escapeHtml(payload.style)} in ${escapeHtml(payload.fabric)}.</p><p>Our team will review it and contact you with the next steps.</p>`;
      break;
    case "admin_custom_order_submitted":
      content = `<p>A new custom order request was received.</p><p><strong>Reference:</strong> ${escapeHtml(payload.reference)}<br><strong>Customer:</strong> ${customerName} (${escapeHtml(payload.customerEmail)})<br><strong>Phone:</strong> ${escapeHtml(payload.phone)}<br><strong>Style:</strong> ${escapeHtml(payload.style)}<br><strong>Fabric:</strong> ${escapeHtml(payload.fabric)}</p>`;
      break;
    case "newsletter_subscribed":
      content = "<p>Thanks for joining the Aunty Sala Fashion Gh newsletter.</p><p>You will receive new collections, style stories, and selected offers from us.</p>";
      break;
  }

  return `<!doctype html><html><body style="margin:0;background:#faf7f2;color:#1a1a18;font-family:Arial,sans-serif"><div style="max-width:600px;margin:auto;padding:32px 20px"><div style="border-top:6px solid #b8922a;background:#fff;padding:32px;border-radius:10px"><p style="margin:0 0 8px;color:#b8922a;font-size:12px;letter-spacing:2px;text-transform:uppercase">Aunty Sala Fashion Gh</p><h1 style="font-size:24px;margin:0 0 20px">${escapeHtml(heading)}</h1><div style="font-size:15px;line-height:1.7;color:#4a4742">${content}</div></div><p style="font-size:11px;color:#777;text-align:center;margin-top:20px">Your inner diva, everything fashionable.</p></div></body></html>`;
}

async function sendEmail(notification: Notification): Promise<string> {
  const apiKey = Deno.env.get("RESEND_API_KEY")!;
  const from = Deno.env.get("RESEND_FROM_EMAIL")!;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "aunty-sala-fashion-gh-notifications/1.0",
    },
    body: JSON.stringify({ from, to: [notification.recipient], subject: notification.subject ?? "Aunty Sala Fashion Gh update", html: emailContent(notification) }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.message ?? "Resend rejected the email.");
  return String(result.id ?? "");
}

async function sendWhatsApp(notification: Notification): Promise<string> {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
  const graphVersion = Deno.env.get("WHATSAPP_GRAPH_API_VERSION")!;
  const templateName = Deno.env.get("WHATSAPP_TEMPLATE_NAME");
  const text = String(notification.payload.whatsappText ?? notification.subject ?? "New Aunty Sala Fashion Gh notification.");
  const message = templateName ? {
    messaging_product: "whatsapp",
    to: notification.recipient.replace(/\D/g, ""),
    type: "template",
    template: {
      name: templateName,
      language: { code: Deno.env.get("WHATSAPP_TEMPLATE_LANGUAGE") ?? "en_US" },
      components: [{ type: "body", parameters: [{ type: "text", text }] }],
    },
  } : {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: notification.recipient.replace(/\D/g, ""),
    type: "text",
    text: { preview_url: false, body: text },
  };
  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.error?.message ?? "WhatsApp rejected the message.");
  return String(result?.messages?.[0]?.id ?? "");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const emailConfigured = Boolean(Deno.env.get("RESEND_API_KEY") && Deno.env.get("RESEND_FROM_EMAIL"));
  const whatsappConfigured = Boolean(Deno.env.get("WHATSAPP_ACCESS_TOKEN") && Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") && Deno.env.get("WHATSAPP_GRAPH_API_VERSION"));
  const channels = [emailConfigured && "email", whatsappConfigured && "whatsapp"].filter(Boolean) as string[];

  try {
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, envKey("secret"), { auth: { persistSession: false } });
    const { error: configError } = await adminClient.rpc("configure_notification_dispatch", {
      dispatch_url_input: `${Deno.env.get("SUPABASE_URL")!}/functions/v1/notification-dispatch`,
      publishable_key_input: envKey("publishable"),
    });
    if (configError) throw configError;
    if (!channels.length) return json({ processed: 0, configured: false });
    const { data, error } = await adminClient.rpc("claim_notification_batch", { batch_size_input: 20, channels_input: channels });
    if (error) throw error;
    const notifications = (data ?? []) as Notification[];
    let sent = 0;
    for (const notification of notifications) {
      try {
        const providerId = notification.channel === "email" ? await sendEmail(notification) : await sendWhatsApp(notification);
        const { error: completeError } = await adminClient.rpc("complete_notification", { notification_id_input: notification.id, success_input: true, provider_message_id_input: providerId, error_input: null });
        if (completeError) throw completeError;
        sent += 1;
      } catch (providerError) {
        await adminClient.rpc("complete_notification", {
          notification_id_input: notification.id,
          success_input: false,
          provider_message_id_input: null,
          error_input: providerError instanceof Error ? providerError.message : "Provider delivery failed.",
        });
      }
    }
    return json({ processed: notifications.length, sent, configured: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Notification dispatch failed." }, 500);
  }
});
