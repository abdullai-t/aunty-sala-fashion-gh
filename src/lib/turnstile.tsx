import { useEffect, useRef } from "react";

type TurnstileTheme = "light" | "dark" | "auto";

type TurnstileApi = {
  render: (container: HTMLElement, options: {
    sitekey: string;
    action: string;
    theme: TurnstileTheme;
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": () => void;
  }) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const verifyUrl = import.meta.env.VITE_TURNSTILE_VERIFY_URL;
const scriptId = "cloudflare-turnstile-script";
let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const finish = () => window.turnstile
      ? resolve(window.turnstile)
      : reject(new Error("Cloudflare verification did not load."));
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => reject(new Error("Cloudflare verification could not load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", () => reject(new Error("Cloudflare verification could not load.")), { once: true });
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export function TurnstileWidget({ onVerify, onError, theme = "auto" }: {
  onVerify: (token: string) => void;
  onError: (message: string) => void;
  theme?: TurnstileTheme;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onVerifyRef = useRef(onVerify);
  const onErrorRef = useRef(onError);
  onVerifyRef.current = onVerify;
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    let widgetId = "";

    if (!siteKey) {
      onErrorRef.current("Cloudflare verification is not configured.");
      return;
    }

    void loadTurnstile().then((turnstile) => {
      if (cancelled || !containerRef.current) return;
      widgetId = turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action: "turnstile-spin-v1",
        theme,
        callback: (token) => onVerifyRef.current(token),
        "expired-callback": () => onVerifyRef.current(""),
        "error-callback": () => {
          onVerifyRef.current("");
          onErrorRef.current("Cloudflare could not verify you. Please try again.");
        },
      });
    }).catch((error) => onErrorRef.current(error instanceof Error ? error.message : "Cloudflare verification could not load."));

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [theme]);

  return <div ref={containerRef} className="min-h-[65px] overflow-hidden" data-action="turnstile-spin-v1" aria-label="Cloudflare security verification" />;
}

export async function verifyTurnstileToken(token: string): Promise<void> {
  if (!token) throw new Error("Complete the security verification before submitting.");
  if (!verifyUrl) throw new Error("Cloudflare verification is not configured.");

  let response: Response;
  try {
    response = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch {
    throw new Error("Cloudflare verification is unavailable. Please try again.");
  }

  const result = await response.json().catch(() => null) as { success?: boolean } | null;
  if (!response.ok || result?.success !== true) {
    throw new Error("Cloudflare could not verify you. Please complete the challenge again.");
  }
}
