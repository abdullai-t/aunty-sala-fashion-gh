const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const EXPECTED_ACTION = "turnstile-spin-v1";
const MAX_BODY_BYTES = 32 * 1024;
const UPSTREAM_TIMEOUT_MS = 5_000;
const RETRYABLE_STATUSES = new Set([500, 502, 503, 504]);
const WORKER_VERSION = "1.1.0";

function csvValues(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function allowedOrigins(env) {
  return new Set(csvValues(env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN));
}

function expectedHostnames(env) {
  return new Set(csvValues(env.EXPECTED_HOSTNAMES));
}

function requestOriginAllowed(request, env) {
  const origin = request.headers.get("Origin");
  return !origin || allowedOrigins(env).has(origin);
}

function corsHeaders(request, env) {
  const headers = new Headers({
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  });
  const origin = request.headers.get("Origin");
  if (origin && allowedOrigins(env).has(origin)) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

function jsonResponse(request, env, body, status = 200) {
  const headers = corsHeaders(request, env);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

function failure(code, durationMs = 0) {
  return {
    success: false,
    "error-codes": [code],
    _worker: { duration_ms: durationMs, worker_version: WORKER_VERSION },
  };
}

async function parseRequest(request) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error("request-too-large");

  const contentType = request.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json();
    return {
      token: String(body.token ?? body["cf-turnstile-response"] ?? body.response ?? ""),
      idempotencyKey: body.idempotency_key ? String(body.idempotency_key) : undefined,
    };
  }
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const body = await request.formData();
    return {
      token: String(body.get("token") ?? body.get("cf-turnstile-response") ?? body.get("response") ?? ""),
      idempotencyKey: body.get("idempotency_key") ? String(body.get("idempotency_key")) : undefined,
    };
  }
  throw new Error("invalid-content-type");
}

async function fetchSiteverify(body) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const response = await fetch(SITEVERIFY_URL, { method: "POST", body, signal: controller.signal });
      if (!RETRYABLE_STATUSES.has(response.status) || attempt === 1) return response;
    } catch (error) {
      lastError = error;
      if (attempt === 1) throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error("upstream-unavailable");
}

async function verifyToken(request, env) {
  const startedAt = Date.now();
  if (!env.TURNSTILE_SECRET_KEY) return jsonResponse(request, env, failure("missing-input-secret"), 500);

  let parsed;
  try {
    parsed = await parseRequest(request);
  } catch (error) {
    const code = error instanceof Error ? error.message : "bad-request";
    const status = code === "request-too-large" ? 413 : code === "invalid-content-type" ? 415 : 400;
    return jsonResponse(request, env, failure(code, Date.now() - startedAt), status);
  }
  if (!parsed.token) return jsonResponse(request, env, failure("missing-token", Date.now() - startedAt), 400);

  const body = new FormData();
  body.set("secret", env.TURNSTILE_SECRET_KEY);
  body.set("response", parsed.token);
  const remoteIp = request.headers.get("CF-Connecting-IP");
  if (remoteIp) body.set("remoteip", remoteIp);
  if (parsed.idempotencyKey) body.set("idempotency_key", parsed.idempotencyKey);

  try {
    const upstream = await fetchSiteverify(body);
    const durationMs = Date.now() - startedAt;
    const result = await upstream.json();
    const hostnames = expectedHostnames(env);
    if (result.success && hostnames.size > 0 && !hostnames.has(String(result.hostname || ""))) {
      result.success = false;
      result["error-codes"] = ["hostname-mismatch"];
    }
    if (result.success && result.action !== (env.EXPECTED_ACTION || EXPECTED_ACTION)) {
      result.success = false;
      result["error-codes"] = ["action-mismatch"];
    }
    result._worker = { duration_ms: durationMs, worker_version: WORKER_VERSION };
    console.log(JSON.stringify({
      event: "siteverify",
      outcome: result.success ? "ok" : "fail",
      duration_ms: durationMs,
      upstream_status: upstream.status,
      error_codes: result["error-codes"] || [],
      hostname: result.hostname || null,
      action: result.action || null,
    }));
    return jsonResponse(request, env, result, upstream.ok ? 200 : 502);
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error(JSON.stringify({ event: "siteverify", outcome: "error", duration_ms: durationMs, error: error instanceof Error ? error.message : String(error) }));
    return jsonResponse(request, env, failure("upstream-unavailable", durationMs), 502);
  }
}

export default {
  async fetch(request, env) {
    if (!requestOriginAllowed(request, env)) {
      return jsonResponse(request, env, failure("origin-not-allowed"), 403);
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });

    const url = new URL(request.url);
    if (request.method === "GET" && ["/", "/health", "/healthz"].includes(url.pathname)) {
      return jsonResponse(request, env, { ok: true, service: "turnstile-siteverify", version: WORKER_VERSION });
    }
    if (request.method === "POST" && ["/", "/siteverify"].includes(url.pathname)) {
      return verifyToken(request, env);
    }
    return jsonResponse(request, env, failure("not-found"), 404);
  },
};
