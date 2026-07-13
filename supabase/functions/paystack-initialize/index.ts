import { createClient } from "npm:@supabase/supabase-js@2";
import { allowedCallbackUrl, corsHeaders, envKey, json } from "../_shared/http.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  let orderId: string | null = null;
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return json({ error: "Authentication is required." }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, envKey("publishable"), {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: userResult, error: userError } = await userClient.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
    if (userError || !userResult.user) return json({ error: "Your session is invalid or expired." }, 401);

    const body = await request.json();
    const callbackUrl = allowedCallbackUrl(body.callbackUrl);
    const { data, error } = await userClient.rpc("create_checkout_order", {
      customer: body.customer,
      items: body.items,
      promo_code_input: body.promoCode ?? null,
      checkout_key_input: body.checkoutKey,
    });
    if (error) throw error;
    const order = data?.[0];
    if (!order) throw new Error("The checkout order could not be created.");
    orderId = order.order_id;

    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secretKey) throw new Error("Paystack is not configured on the server.");
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: userResult.user.email,
        amount: Math.round(Number(order.total) * 100),
        currency: order.currency,
        reference: order.paystack_reference,
        callback_url: callbackUrl,
        channels: ["card", "mobile_money"],
        metadata: { order_id: order.order_id, order_number: order.order_number, user_id: userResult.user.id },
      }),
    });
    const paystack = await paystackResponse.json();
    if (!paystackResponse.ok || !paystack.status || !paystack.data?.authorization_url) {
      throw new Error(paystack.message ?? "Paystack could not initialize the payment.");
    }

    return json({
      authorizationUrl: paystack.data.authorization_url,
      accessCode: paystack.data.access_code,
      reference: order.paystack_reference,
      orderNumber: order.order_number,
      total: Number(order.total),
      currency: order.currency,
    });
  } catch (error) {
    if (orderId) {
      try {
        const authorization = request.headers.get("Authorization")!;
        const userClient = createClient(Deno.env.get("SUPABASE_URL")!, envKey("publishable"), {
          global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
        });
        await userClient.rpc("release_checkout_order", { order_id_input: orderId });
      } catch { /* Reservation expiry is the fallback. */ }
    }
    return json({ error: error instanceof Error ? error.message : "Payment initialization failed." }, 400);
  }
});
