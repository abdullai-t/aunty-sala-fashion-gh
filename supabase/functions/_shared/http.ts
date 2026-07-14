export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function envKey(name: "publishable" | "secret"): string {
  const legacyName = name === "publishable" ? "SUPABASE_ANON_KEY" : "SUPABASE_SERVICE_ROLE_KEY";
  const legacy = Deno.env.get(legacyName);
  if (legacy) return legacy;
  const values = JSON.parse(Deno.env.get(name === "publishable" ? "SUPABASE_PUBLISHABLE_KEYS" : "SUPABASE_SECRET_KEYS") ?? "{}");
  const key = values.default ?? Object.values(values)[0];
  if (typeof key !== "string") throw new Error(`Supabase ${name} key is unavailable.`);
  return key;
}

export function allowedCallbackUrl(value: unknown, allowedPaths = ["/checkout"]): string {
  if (typeof value !== "string") throw new Error("A payment callback URL is required.");
  const url = new URL(value);
  const configured = (Deno.env.get("PAYMENT_CALLBACK_ORIGINS") ?? "http://localhost:5173,http://127.0.0.1:5173")
    .split(",").map((origin) => origin.trim()).filter(Boolean);
  if (!configured.includes(url.origin) || !allowedPaths.includes(url.pathname)) {
    throw new Error("The payment callback URL is not allowed.");
  }
  return url.toString();
}

export async function kickNotificationDispatch(): Promise<void> {
  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")!}/functions/v1/notification-dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: envKey("publishable") },
      body: "{}",
    });
  } catch {
    // Delivery is retried from the durable outbox; notification failures never fail the source event.
  }
}
