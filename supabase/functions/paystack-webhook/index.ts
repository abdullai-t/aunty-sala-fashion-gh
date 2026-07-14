import { createClient } from "npm:@supabase/supabase-js@2";
import { envKey, json, kickNotificationDispatch } from "../_shared/http.ts";

const encoder = new TextEncoder();
const toHex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
const safeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
};

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secretKey) throw new Error("Paystack is not configured on the server.");
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature") ?? "";
    const hmacKey = await crypto.subtle.importKey("raw", encoder.encode(secretKey), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
    const expected = toHex(await crypto.subtle.sign("HMAC", hmacKey, encoder.encode(rawBody)));
    if (!safeEqual(signature, expected)) return json({ error: "Invalid webhook signature." }, 401);

    const event = JSON.parse(rawBody);
    if (event.event !== "charge.success") return json({ received: true });
    const reference = event.data?.reference;
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const verification = await verifyResponse.json();
    if (!verifyResponse.ok || verification.data?.status !== "success") throw new Error("Paystack verification failed.");

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, envKey("secret"), { auth: { persistSession: false } });
    const isCustomPayment = String(verification.data.reference).startsWith("ASFC-");
    const { error } = await adminClient.rpc(isCustomPayment ? "finalize_custom_order_payment" : "finalize_paid_checkout", {
      paystack_reference_input: verification.data.reference,
      amount_minor_input: verification.data.amount,
      currency_input: verification.data.currency,
      transaction_id_input: String(verification.data.id),
    });
    if (error) throw error;
    await kickNotificationDispatch();
    return json({ received: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Webhook processing failed." }, 500);
  }
});
