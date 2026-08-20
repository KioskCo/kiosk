/**
 * Kiosk API client — thin wrapper around fetch for calling the backend.
 *
 * Base URL is read from EXPO_PUBLIC_DOMAIN (set by the expo dev script).
 * In development this points to the Replit proxy, which routes /api/* to the Express server.
 *
 * Usage:
 *   import { api } from '@/lib/api'
 *   const { data } = await api.get('/products')
 *   const { data } = await api.post('/orders', { ... })
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// In Expo, env vars prefixed with EXPO_PUBLIC_ are available at runtime
const DOMAIN = process.env["EXPO_PUBLIC_DOMAIN"] ?? "";
// Local dev targets (an IP address or an explicit :port) speak plain http;
// production domains (e.g. api.kiosk.store) are served over https.
const isLocal = /:\d+$/.test(DOMAIN) || /^\d{1,3}(\.\d{1,3}){3}/.test(DOMAIN);
const scheme = isLocal ? "http" : "https";
const BASE_URL = DOMAIN ? `${scheme}://${DOMAIN}/api` : "/api";

// DEBUG: log the resolved API base URL so builds can be verified against
// the intended backend (EAS bakes EXPO_PUBLIC_DOMAIN at build time).
console.log("[API] EXPO_PUBLIC_DOMAIN =", DOMAIN);
console.log("[API] BASE_URL =", BASE_URL);

const TOKEN_KEY = "@kiosk/auth_token";

// ─── Token management ─────────────────────────────────────────────────────────

export const tokenStore = {
  async get(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  },
  async set(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
  },
};

// ─── Core request function ────────────────────────────────────────────────────

type RequestOpts = {
  /** How long to wait before aborting (ms). Default 45000. */
  timeout?: number;
  /**
   * How many extra attempts after the first (default 0).
   * Only fires on transient failures: network errors, timeouts, 429, and 5xx.
   * Client errors (4xx) are never retried.
   * Leave at 0 for payment/order-creating calls — retrying those can double-charge
   * or duplicate records when the server already succeeded but the response was lost.
   */
  retries?: number;
  /** Base delay between retries (ms); grows linearly with each attempt. */
  retryDelay?: number;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableError(err: unknown): boolean {
  if ((err as any)?.retryable === true) return true;
  if ((err as Error)?.name === "AbortError") return true;
  if (err instanceof TypeError) return true; // fetch network failure (DNS, refused, offline)
  const status = (err as any)?.status as number | undefined;
  return typeof status === "number" && (status >= 500 || status === 429);
}

async function attemptOnce<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  timeout = 45000
): Promise<{ success: boolean; data?: T; error?: string; [key: string]: unknown }> {
  const token = await tokenStore.get();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Abort the request if the server doesn't respond in time, so the UI fails
  // fast with a clear error instead of hanging on an unreachable server.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      const e = new Error("Request timed out — check your connection and the server address.");
      (e as any).retryable = true;
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  // Parse JSON regardless of status code (errors also return JSON)
  const json = await response.json().catch(() => ({
    success: false,
    error: "Invalid server response",
  }));

  if (!response.ok) {
    const e = new Error(json.error ?? `Request failed with status ${response.status}`);
    (e as any).status = response.status;
    throw e;
  }

  return json;
}

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  opts: RequestOpts = {}
): Promise<{ success: boolean; data?: T; error?: string; [key: string]: unknown }> {
  const { timeout = 45000, retries = 0, retryDelay = 1200 } = opts;
  for (let attempt = 0; ; attempt++) {
    try {
      return await attemptOnce<T>(method, path, body, timeout);
    } catch (err) {
      if (attempt >= retries || !isRetryableError(err)) throw err;
      await sleep(retryDelay * (attempt + 1));
    }
  }
}

// ─── Convenience methods ──────────────────────────────────────────────────────

export const api = {
  get: <T = unknown>(path: string, opts?: RequestOpts) => request<T>("GET", path, undefined, opts),
  post: <T = unknown>(path: string, body?: unknown, opts?: RequestOpts) => request<T>("POST", path, body, opts),
  patch: <T = unknown>(path: string, body?: unknown, opts?: RequestOpts) => request<T>("PATCH", path, body, opts),
  delete: <T = unknown>(path: string, body?: unknown, opts?: RequestOpts) => request<T>("DELETE", path, body, opts),
};

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  /** Begin signup: send OTP to email. */
  signup(email: string, password: string, referralCode?: string) {
    return api.post("/auth/signup", { email, password, referralCode }, { retries: 2 });
  },

  /** Verify the email OTP after signup. Saves token on success. */
  async verifyEmail(email: string, otp: string) {
    const res = await api.post<{ token: string; user: UserProfile }>("/auth/verify-email", { email, otp }, { retries: 2 });
    if (res.token) {
      await tokenStore.set(res.token as string);
    }
    return res;
  },

  /** Login with email + password. Returns JWT immediately (no OTP). */
  async login(email: string, password: string) {
    const res = await api.post<{ token: string; user: UserProfile }>("/auth/login", { email, password }, { retries: 1 });
    if (res.token) {
      await tokenStore.set(res.token as string);
    }
    return res;
  },

  /** Resend the signup verification OTP. */
  resendOtp(email: string) {
    return api.post("/auth/resend-otp", { email }, { retries: 2 });
  },

  /** Get the current merchant's profile. */
  getMe() {
    return api.get<{ user: UserProfile }>("/auth/me");
  },

  /** Update profile fields. */
  updateProfile(data: Partial<{
    name: string;
    businessName: string;
    whatsappNumber: string;
    username: string;
    businessAddress: string;
    deliveryFeeLagos: number;
    deliveryFeeOther: number;
    freeDeliveryThreshold: number | null;
  }>) {
    return api.patch("/auth/profile", data);
  },

  /** Register an Expo push token on the server so the backend can send notifications. */
  registerPushToken(token: string) {
    return api.post("/auth/push-token", { token, platform: Platform.OS });
  },

  /** Sign out — clears the local token. */
  async logout() {
    await tokenStore.clear();
  },

  /** Permanently delete the account. Requires password confirmation. */
  async deleteAccount(password: string) {
    const res = await api.delete("/auth/account", { password });
    await tokenStore.clear();
    return res;
  },

  /** Step 1 of forgot-password: send a reset OTP to the email. */
  forgotPassword(email: string) {
    return api.post("/auth/forgot-password", { email }, { retries: 2 });
  },

  /** Step 2 of forgot-password: verify OTP and set a new password. */
  resetPassword(email: string, otp: string, newPassword: string) {
    return api.post("/auth/reset-password", { email, otp, newPassword }, { retries: 2 });
  },
};

// ─── Products API ─────────────────────────────────────────────────────────────

export const productsApi = {
  list() {
    return api.get<Product[]>("/products");
  },

  create(data: {
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    category?: string;
    stock?: number;
    preorder?: boolean;
    preorderReleaseDate?: string | null;
  }) {
    return api.post<Product>("/products", data);
  },

  update(id: string, data: Partial<{
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    category: string;
    stock: number;
    preorder: boolean;
    preorderReleaseDate: string | null;
  }>) {
    return api.patch<Product>(`/products/${id}`, data);
  },

  delete(id: string) {
    return api.delete(`/products/${id}`);
  },
};

// ─── Orders API ───────────────────────────────────────────────────────────────

export const ordersApi = {
  list() {
    return api.get<Order[]>("/orders");
  },

  get(id: string) {
    return api.get<Order & { items: OrderItem[] }>(`/orders/${id}`);
  },

  create(data: {
    buyerName: string;
    buyerPhone: string;
    buyerAddress?: string;
    notes?: string;
    items: Array<{ productId?: string; productName: string; quantity: number; unitPrice: number }>;
  }) {
    // Writes with side effects (order creation): never auto-retry — a retry could
    // duplicate the order if the first attempt succeeded but the response was lost.
    return api.post<Order>("/orders", data, { retries: 0 });
  },

  updateStatus(id: string, status: string, trackingId?: string, logisticsProvider?: string) {
    return api.patch<Order>(`/orders/${id}/status`, { status, trackingId, logisticsProvider });
  },

  releaseEscrow(id: string, otp: string) {
    return api.post(`/orders/${id}/release-escrow`, { otp });
  },

  refundEscrow(id: string) {
    return api.post(`/orders/${id}/refund-escrow`);
  },

  getInvoice(id: string) {
    return api.get<Invoice>(`/orders/${id}/invoice`);
  },
};

// ─── Payments API ─────────────────────────────────────────────────────────────

export const paymentsApi = {
  initialize(data: { orderId: string; provider?: "paystack" | "flutterwave"; buyerEmail?: string; callbackUrl?: string }) {
    // MONEY: never auto-retry — a retry could create a second payment reference/charge.
    return api.post<{ paymentUrl: string; reference: string; provider: string }>("/payments/initialize", data, { retries: 0 });
  },

  verify(reference: string) {
    return api.get<{ paid: boolean; status: string; orderId: string }>(`/payments/verify/${reference}`);
  },
};

// ─── Logistics API ────────────────────────────────────────────────────────────

export const logisticsApi = {
  searchRiders(params: {
    pickupLat: number; pickupLng: number;
    deliveryLat: number; deliveryLng: number;
    vehicleType?: string; page?: number; limit?: number;
  }) {
    const q = new URLSearchParams(params as any).toString();
    return api.get<{ data: Rider[]; pagination: Pagination }>(`/logistics/riders?${q}`);
  },

  pingRider(riderId: string, message?: string) {
    return api.post(`/logistics/riders/${riderId}/ping`, { message });
  },

  getProviders() {
    return api.get<LogisticsProvider[]>("/logistics/providers");
  },

  getRates(data: object) {
    return api.post<{ terminal_africa: Rate[]; sendbox: Rate[]; gig_logistics: Rate[] }>("/logistics/rates", data);
  },

  book(data: object) {
    return api.post("/logistics/book", data);
  },

  track(trackingId: string) {
    return api.get(`/logistics/track/${trackingId}`);
  },

  getOrderRiders(orderId: string) {
    return api.get(`/logistics/order/${orderId}`);
  },

  listBookings() {
    return api.get("/logistics/bookings");
  },
};

// ─── Referrals API ────────────────────────────────────────────────────────────

export const referralsApi = {
  get() {
    return api.get<ReferralStats>("/referrals");
  },

  leaderboard() {
    return api.get("/referrals/leaderboard");
  },
};

// ─── Ads API ──────────────────────────────────────────────────────────────────

export const adsApi = {
  list() {
    return api.get<AdCampaign[]>("/ads");
  },
  create(data: { name: string; targetAudience?: string; budget: number; duration?: number; imageUrl?: string }) {
    return api.post<AdCampaign>("/ads", data);
  },
  update(id: string, data: Partial<{ name: string; budget: number; active: boolean; targetAudience: string }>) {
    return api.patch<AdCampaign>(`/ads/${id}`, data);
  },
  delete(id: string) {
    return api.delete(`/ads/${id}`);
  },
  stats(id: string) {
    return api.get(`/ads/${id}/stats`);
  },
};

// ─── Templates API ────────────────────────────────────────────────────────────

export const templatesApi = {
  list() {
    return api.get<StoreTemplate[]>("/templates");
  },
  create(data: { name: string; themeColor?: string; fontFamily?: string }) {
    return api.post<StoreTemplate>("/templates", data);
  },
  update(id: string, data: Partial<{
    name: string; kind: string;
    accentColor: string; bgColor: string; textColor: string; cardColor: string;
    paymentGateways: string[]; thumbnail: string; whatsappLink: string;
    settings: Record<string, unknown>;
  }>) {
    // PATCH is idempotent (full-state replace); safe to retry on network blips.
    return api.patch<StoreTemplate>(`/templates/${id}`, data, { retries: 2 });
  },
  activate(id: string, username?: string) {
    // Launch is a state setter (launched=true + launch_url) — retrying is safe.
    return api.post(`/templates/${id}/launch`, username ? { username } : undefined, { retries: 2 });
  },
  deactivate(id: string) {
    return api.post(`/templates/${id}/deactivate`);
  },
  delete(id: string) {
    return api.delete(`/templates/${id}`);
  },
};

// ─── Subscriptions API ────────────────────────────────────────────────────────

export const subscriptionsApi = {
  getCurrent() {
    return api.get<SubscriptionInfo>("/subscriptions/me");
  },
  /** Step 1: Get a payment URL for a plan. */
  initiatePay(plan: "3months" | "6months" | "yearly" | "custom", provider: "paystack" | "flutterwave", months?: number) {
    // MONEY: never auto-retry — a retry could create a second payment reference/charge.
    return api.post<{ paymentUrl: string; reference: string; months: number; amount: number }>("/subscriptions/pay", { plan, provider, months }, { retries: 0 });
  },
  /** Step 2: Activate after payment gateway confirms. */
  activate(data: { plan: "3months" | "6months" | "yearly" | "custom"; provider: string; reference: string; months?: number }) {
    return api.post<SubscriptionInfo>("/subscriptions/activate", data);
  },
  cancel() {
    return api.post("/subscriptions/cancel");
  },
};

// ─── Wallet API ───────────────────────────────────────────────────────────────

export const walletApi = {
  getBalance() {
    return api.get<WalletInfo>("/wallet/balance");
  },
  getTransactions(params?: { limit?: number; offset?: number }) {
    const q = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return api.get<WalletTransaction[]>(`/wallet/transactions${q}`);
  },
  withdraw(data: { amount: number; bankAccountId: string }) {
    // MONEY: never auto-retry — a retry could double-withdraw funds.
    return api.post<{ reference: string; status: string }>("/wallet/withdraw", data, { retries: 0 });
  },
  addBankAccount(data: { bankCode?: string; bankName: string; accountNumber: string; accountName: string }) {
    return api.post("/wallet/banks", data);
  },
  getBankAccounts() {
    return api.get("/wallet/banks");
  },
};

// ─── Uploads API ─────────────────────────────────────────────────────────────

export const uploadsApi = {
  /** Get upload config (provider, cloud name, etc). */
  getConfig() {
    return api.get<{
      provider: "cloudinary" | "s3" | "inline";
      cloudName?: string;
      uploadPreset?: string;
      uploadUrl?: string;
    }>("/uploads/config");
  },

  /** Get a presigned upload URL (for S3) or Cloudinary direct-upload config. */
  presign(filename: string, contentType: string) {
    return api.post<{
      provider: string;
      presignedUrl?: string;
      publicUrl?: string;
      uploadUrl?: string;
      uploadPreset?: string;
    }>("/uploads/presign", { filename, contentType });
  },

  /** Upload a base64 image to Cloudinary (unsigned upload, no server needed). */
  async uploadToCloudinary(base64: string, mimeType: string): Promise<string> {
    const config = await uploadsApi.getConfig();
    if (config.data?.provider !== "cloudinary" || !config.data.uploadUrl) {
      throw new Error("Cloudinary not configured");
    }
    const body = new FormData();
    body.append("file", `data:${mimeType};base64,${base64}`);
    body.append("upload_preset", config.data.uploadPreset ?? "kiosk_unsigned");
    const res = await fetch(config.data.uploadUrl, { method: "POST", body });
    const json = await res.json() as { secure_url?: string; error?: { message?: string } };
    if (!json.secure_url) throw new Error(json.error?.message ?? "Cloudinary upload failed");
    return json.secure_url;
  },
};

// ─── Referral API ────────────────────────────────────────────────────────────

export const referralApi = {
  getStats() {
    return api.get<ReferralStats>("/referrals");
  },
  withdraw(amount: number) {
    // MONEY: never auto-retry — a retry could double-withdraw funds.
    return api.post<{ amount: number; reference: string }>("/referrals/withdraw", { amount }, { retries: 0 });
  },
};

// ─── Support API ─────────────────────────────────────────────────────────────

export const supportApi = {
  sendMessage(message: string, subject?: string) {
    return api.post<{ message: string }>("/support/message", { message, subject });
  },
  getMessages() {
    return api.get<Array<{ id: string; subject: string | null; message: string; status: string; reply: string | null; created_at: string }>>("/support/messages");
  },
};

// ─── Customers API ───────────────────────────────────────────────────────────

export const customersApi = {
  list() {
    return api.get<CustomerRecord[]>("/customers");
  },

  getNewsletter() {
    return api.get<NewsletterSubscriber[]>("/customers/newsletter");
  },

  unsubscribe(id: string) {
    return api.delete(`/customers/newsletter/${id}`);
  },

  bulkUnsubscribe(ids: string[]) {
    return api.post<{ removed: number }>("/customers/newsletter/bulk-delete", { ids });
  },

  /** ids omitted (or empty) sends to every current subscriber. */
  sendNewsletter(subject: string, body: string, ids?: string[]) {
    return api.post<{ sent: number; total: number }>("/customers/newsletter/send", { subject, body, ids });
  },
};

// ─── Analytics API ───────────────────────────────────────────────────────────

export const analyticsApi = {
  getSnapshot() {
    return api.get<AnalyticsSnapshot>("/analytics");
  },
};

// ─── Reviews API ─────────────────────────────────────────────────────────────

export const reviewsApi = {
  /** Vendor: list all reviews for this store. */
  list() {
    return api.get<{ data: ProductReview[]; avgRating: number | null; total: number; productInsights: ProductRatingInsight[] }>("/reviews");
  },
  /** Vendor: approve, hide, or reply to a review. */
  update(id: string, data: { status?: "approved" | "hidden" | "pending"; reply?: string }) {
    return api.patch(`/reviews/${id}`, data);
  },
  /** Vendor: permanently delete a review. */
  remove(id: string) {
    return api.delete(`/reviews/${id}`);
  },
};

// ─── Customer Notes API ───────────────────────────────────────────────────────

export const customerNotesApi = {
  list(phone: string) {
    return api.get<{ data: CustomerNote[] }>(`/customers/notes/${encodeURIComponent(phone)}`);
  },
  add(customerPhone: string, note: string, tag?: string) {
    return api.post<{ data: CustomerNote }>("/customers/notes", { customerPhone, note, tag });
  },
  remove(id: string) {
    return api.delete(`/customers/notes/${id}`);
  },
};

// ─── Discounts API ───────────────────────────────────────────────────────────

export const discountsApi = {
  list() {
    return api.get<{ data: Discount[] }>("/discounts");
  },
  create(data: { code: string; type: "percent" | "fixed"; value: number; minOrder?: number; maxUses?: number; expiresAt?: string }) {
    return api.post<{ data: Discount }>("/discounts", data);
  },
  toggle(id: string, active: boolean) {
    return api.patch(`/discounts/${id}`, { active });
  },
  remove(id: string) {
    return api.delete(`/discounts/${id}`);
  },
  validate(code: string, vendorId: string, orderTotal?: number) {
    return api.post<{ data: DiscountValidation }>("/discounts/validate", { code, vendorId, orderTotal });
  },
};

// ─── Flash Sale API ───────────────────────────────────────────────────────────

export const flashSaleApi = {
  set(productId: string, salePrice: number, saleEndsAt: string) {
    return api.patch(`/products/${productId}/flash-sale`, { salePrice, saleEndsAt });
  },
  clear(productId: string) {
    return api.delete(`/products/${productId}/flash-sale`);
  },
};

// ─── Buyer Referrals API ──────────────────────────────────────────────────────

export interface BuyerReferrer {
  id: string;
  buyerName: string;
  buyerPhone: string;
  code: string;
  timesUsed: number;
  createdAt: string;
}

export const buyerReferralsApi = {
  stats() {
    return api.get<{ data: { totalReferrers: number; totalReferredOrders: number; vendorUsername: string; referrers: BuyerReferrer[] } }>("/referrals/buyers");
  },
};

// ─── WhatsApp API ─────────────────────────────────────────────────────────────

export const whatsappApi = {
  send(to: string, message: string) {
    return api.post("/whatsapp/send", { to, message });
  },

  messages() {
    return api.get("/whatsapp/messages");
  },

  /** Returns the Meta OAuth URL to open in WebBrowser. */
  getOAuthUrl() {
    return api.get<{ authUrl: string }>("/whatsapp/oauth/start");
  },

  /** Poll this after the OAuth browser closes to check if the vendor is now connected. */
  getStatus() {
    return api.get<{ connected: boolean; phoneNumber: string | null; phoneNumberId: string | null }>("/whatsapp/status");
  },

  disconnect() {
    return api.post("/whatsapp/disconnect");
  },
};

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  businessName: string | null;
  businessAddress: string | null;
  whatsappNumber: string | null;
  referralCode: string | null;
  kycVerified: boolean | null;
  walletBalance: string | null;
  createdAt?: string;
}

export interface Product {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  category: string | null;
  stock: number | null;
  active: boolean | null;
  salePrice: string | null;
  saleEndsAt: string | null;
  createdAt: string | null;
}

export interface Discount {
  id: string;
  vendorId: string;
  code: string;
  type: "percent" | "fixed";
  value: string;
  minOrder: string | null;
  maxUses: number | null;
  usesCount: number | null;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

export interface DiscountValidation {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  discountAmount: number;
  label: string;
}

export interface Order {
  id: string;
  userId: string;
  buyerName: string;
  buyerPhone: string;
  buyerAddress: string | null;
  status: string | null;
  escrowStatus: string | null;
  totalAmount: string;
  paymentReference: string | null;
  paymentProvider: string | null;
  trackingId: string | null;
  logisticsProvider: string | null;
  createdAt: string | null;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
}

export interface Invoice {
  invoiceNumber: string;
  issuedAt: string;
  merchant: { name: string; phone?: string; whatsappNumber?: string };
  buyer: { name: string; phone: string; address?: string };
  items: Array<{ name: string; quantity: number; unitPrice: string; lineTotal: string }>;
  totalAmount: string;
  status: string;
  escrowStatus: string;
  paymentProvider: string | null;
  paymentReference: string | null;
}

export interface Rider {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  rating: number;
  eta: number;
  distanceKm: number;
  priceNaira: number;
}

export interface Rate {
  carrierId: string;
  carrierName: string;
  serviceCode: string;
  serviceName: string;
  estimatedDays: number;
  fee: number;
  currency: string;
}

export interface LogisticsProvider {
  id: string;
  name: string;
  logo: string;
  type: "courier" | "on_demand_rider" | "aggregator";
  coverage: string;
  coverageStates: string[] | "all";
  vehicleTypes: string[];
  estimatedDays: string;
  bestFor: string;
  trackingSupport: boolean;
  codSupport: boolean;
}


export interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface AdCampaign {
  id: string;
  userId: string;
  name: string;
  targetAudience: string | null;
  budget: string;
  spent: string | null;
  impressions: number | null;
  clicks: number | null;
  active: boolean | null;
  imageUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string | null;
}

export interface StoreTemplate {
  id: string;
  userId: string;
  name: string;
  themeColor: string | null;
  fontFamily: string | null;
  isActive: boolean | null;
  publishedUrl: string | null;
  createdAt: string | null;
}

export interface SubscriptionInfo {
  id: string;
  userId: string;
  plan: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  paymentProvider: string | null;
  paymentReference: string | null;
  createdAt: string | null;
}

export interface WalletInfo {
  balance: string;
  escrowBalance: string;
  currency: string;
}

export interface CustomerRecord {
  buyerName: string;
  buyerPhone: string;
  buyerAddress: string | null;
  lastOrderAt: string | null;
  totalOrders: number;
  totalSpent: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  source: string | null;
  subscribed: boolean;
  created_at: string;
}

export interface ReferredVendor {
  id: string;
  name: string;
  phone: string | null;
  status: "pending" | "rewarded";
  reward: string | null;
  joinedAt: string | null;
}

export interface ReferralStats {
  referralCode: string | null;
  referralLink: string;
  referralBalance: number;
  rewardPerReferral: number;
  paidReferrals: number;
  pendingReferrals: number;
  totalReferrals: number;
  referred: ReferredVendor[];
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: string;
  amount: string;
  reference: string | null;
  description: string | null;
  status: string | null;
  createdAt: string | null;
}

// ─── Analytics types ──────────────────────────────────────────────────────────

export interface AnalyticsRevenue {
  today: number; week: number; month: number; year: number;
  todayChange: number; weekChange: number; monthChange: number; yearChange: number;
}

export interface AnalyticsOrders {
  total: number; paid: number; pending: number; shipped: number;
  delivered: number; cancelled: number; avgOrderValue: number;
}

export interface ProductPerf {
  productId: string | null; name: string; unitsSold: number; revenue: number; orderCount: number;
}

export interface InventoryItem {
  id: string; name: string; stock: number | null; category: string | null;
}

export interface FastMovingItem extends InventoryItem {
  unitsSold30d: number; daysUntilDepletion: number | null;
}

export interface CustomerSegment {
  name: string | null; phone: string | null; spent: number; orders: number;
  segment: "new" | "returning" | "vip" | "inactive";
}

export interface AnalyticsSnapshot {
  revenue: AnalyticsRevenue;
  orders: AnalyticsOrders;
  products: {
    bestSellers: ProductPerf[];
    worstPerformers: ProductPerf[];
    fastMoving: FastMovingItem[];
    slowMoving: InventoryItem[];
  };
  inventory: {
    total: number;
    lowStockCount: number;
    outOfStockCount: number;
    lowStock: InventoryItem[];
    outOfStock: InventoryItem[];
  };
  customers: {
    total: number; new: number; returning: number; vip: number; inactive: number;
    topBySpend: CustomerSegment[];
    topByOrders: CustomerSegment[];
  };
}

// ─── Review types ─────────────────────────────────────────────────────────────

export interface ProductReview {
  id: string;
  vendorId: string;
  productId: string | null;
  productName: string;
  orderId: string | null;
  buyerName: string;
  buyerEmail: string | null;
  rating: number;
  body: string | null;
  photoUrls: string[];
  status: "pending" | "approved" | "hidden";
  reply: string | null;
  createdAt: string;
}

export interface ProductRatingInsight {
  name: string; count: number; avgRating: number;
}

// ─── Customer note types ──────────────────────────────────────────────────────

export interface CustomerNote {
  id: string;
  userId: string;
  customerPhone: string;
  note: string;
  tag: string | null;
  createdAt: string;
}
