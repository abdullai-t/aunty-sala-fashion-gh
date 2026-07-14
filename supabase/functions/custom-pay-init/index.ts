import { createClient } from "npm:@supabase/supabase-js@2";
import { allowedCallbackUrl, corsHeaders, envKey, json } from "../_shared/http.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return json({ error: "Authentication is required." }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, envKey("publishable"), {
      global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
    });
    const { data: userResult, error: userError } = await userClient.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
    if (userError || !userResult.user) return json({ error: "Your session is invalid or expired." }, 401);

    const body = await request.json();
    if (typeof body.customOrderId !== "string") return json({ error: "A custom order is required." }, 400);
    const callbackUrl = allowedCallbackUrl(body.callbackUrl, ["/account"]);
    const { data, error } = await userClient.rpc("create_custom_payment_attempt", { custom_order_id_input: body.customOrderId });
    if (error) throw error;
    const payment = data?.[0];
    if (!payment) throw new Error("The custom payment could not be created.");

    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secretKey) throw new Error("Paystack is not configured on the server.");
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: payment.customer_email,
        amount: Math.round(Number(payment.amount) * 100),
        currency: payment.currency,
        reference: payment.paystack_reference,
        callback_url: callbackUrl,
        channels: ["card", "mobile_money"],
        metadata: {
          payment_type: "custom_order",
          custom_order_id: body.customOrderId,
          custom_order_reference: payment.custom_order_reference,
          payment_kind: payment.payment_kind,
          user_id: userResult.user.id,
        },
      }),
    });
    const paystack = await paystackResponse.json();
    if (!paystackResponse.ok || !paystack.status || !paystack.data?.authorization_url) {
      throw new Error(paystack.message ?? "Paystack could not initialize the custom payment.");
    }
    return json({
      authorizationUrl: paystack.data.authorization_url,
      reference: payment.paystack_reference,
      customOrderReference: payment.custom_order_reference,
      amount: Number(payment.amount),
      currency: payment.currency,
      paymentKind: payment.payment_kind,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Custom payment initialization failed." }, 400);
  }
});
