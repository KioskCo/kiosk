/**
 * Storefront URL resolution for the vendor app.
 *
 * The store base URL is served at runtime by GET /api/config (backed by the
 * SHOP_BASE_URL env var on the server), so pointing the platform at a new
 * frontend — e.g. a Cloudflare Workers deployment or a custom domain — only
 * requires changing that one env var, not rebuilding the APK.
 *
 * Local fallback order:
 *   1. runtime value from /api/config (cached)
 *   2. EXPO_PUBLIC_SHOP_URL (baked at build time)
 *   3. https://keeosk.store/@
 */

import { api } from "./api";

const DEFAULT_BASE = process.env["EXPO_PUBLIC_SHOP_URL"] ?? "https://keeosk.store/@";

let cachedBase: string | null = null;
let inflight: Promise<string> | null = null;

export function getShopBaseUrl(): string {
  return cachedBase ?? DEFAULT_BASE;
}

/** Fetch the current base URL from the server once. Safe to call repeatedly. */
export async function loadShopBaseUrl(): Promise<string> {
  if (cachedBase) return cachedBase;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await api.get<{ shopBaseUrl?: string }>("/config");
      const base = res.data?.shopBaseUrl;
      if (base) cachedBase = base;
    } catch {
      // Keep the local default; the config endpoint is best-effort.
    }
    return cachedBase ?? DEFAULT_BASE;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

/**
 * Re-fetch the base URL, ignoring any previously cached value. Use this right
 * before launching a store so the URL reflects the server's current
 * SHOP_BASE_URL (e.g. after it points at a new frontend) — not a stale value
 * cached earlier in the session.
 */
export async function refreshShopBaseUrl(): Promise<string> {
  cachedBase = null;
  inflight = null;
  return loadShopBaseUrl();
}

/** Build a store URL: <base>/@<username> (base includes the "/@" suffix). */
export function shopUrl(username?: string): string {
  const base = getShopBaseUrl();
  const slug = (username ?? "").toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9_]/g, "");
  return `${base}${slug}`;
}

/** Hostname of the current store base (e.g. "keeosk.store") — for CNAME targets. */
export function shopBaseHostname(): string {
  try {
    return new URL(getShopBaseUrl()).hostname;
  } catch {
    return "keeosk.store";
  }
}

/** Build a WhatsApp chat link from a phone number (digits only, wa.me format). */
export function waMeLink(phone: string, message?: string): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}