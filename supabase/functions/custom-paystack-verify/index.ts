import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, envKey, json, kickNotificationDispatch } from "../_shared/http.ts";

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
    const { reference } = await request.json();
    if (typeof reference !== "string" || !reference.startsWith("ASFC-")) return json({ error: "Invalid custom payment reference." }, 400);

    const { data: payment, error: paymentError } = await userClient.from("custom_order_payments")
      .select("amount,currency,paystack_reference,status,custom_order:custom_orders(reference_number)")
      .eq("paystack_reference", reference).single();
    if (paymentError || !payment) return json({ error: "Custom payment was not found." }, 404);
    const orderRelation = payment.custom_order as unknown;
    const customOrder = Array.isArray(orderRelation) ? orderRelation[0] : orderRelation as { reference_number?: string } | null;
    if (payment.status === "paid") return json({ paid: true, status: "success", customOrderReference: customOrder?.reference_number });

    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secretKey) throw new Error("Paystack is not configured on the server.");
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const verification = await verifyResponse.json();
    if (!verifyResponse.ok || !verification.status || verification.data?.status !== "success") {
      return json({ paid: false, status: verification.data?.status ?? "pending", customOrderReference: customOrder?.reference_number });
    }
    if (Number(verification.data.amount) !== Math.round(Number(payment.amount) * 100)
      || verification.data.currency !== payment.currency
      || verification.data.reference !== payment.paystack_reference) {
      return json({ error: "Payment verification did not match the custom order." }, 409);
    }

    const adminClient = createClient(supabaseUrl, envKey("secret"), { auth: { persistSession: false } });
    const { data: customOrderReference, error: finalizeError } = await adminClient.rpc("finalize_custom_order_payment", {
      paystack_reference_input: reference,
      amount_minor_input: verification.data.amount,
      currency_input: verification.data.currency,
      transaction_id_input: String(verification.data.id),
    });
    if (finalizeError) throw finalizeError;
    await kickNotificationDispatch();
    return json({ paid: true, status: "success", customOrderReference });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Custom payment verification failed." }, 400);
  }
});
