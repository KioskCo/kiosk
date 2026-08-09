import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as Notifications from "expo-notifications";
import { setAudioMode, playSound } from "@/lib/audio";

let NOTIFY_SRC: any, MONEY_SRC: any;
try { NOTIFY_SRC = require("../assets/sounds/ding_normalnotify.mp3"); } catch {}
try { MONEY_SRC  = require("../assets/sounds/moneyenternotification.mp3"); } catch {}
import { Alert, AppState as RNAppState, Platform } from "react-native";

import { authApi, productsApi, ordersApi, adsApi, subscriptionsApi, walletApi, whatsappApi, logisticsApi, referralsApi, tokenStore } from "@/lib/api";

async function registerPushToken(): Promise<void> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Kiosk Notifications",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6366F1",
      });
    }

    // Register the token with our backend
    await authApi.registerPushToken(token);
  } catch {
    // Non-fatal — app still works without push notifications
  }
}

export type Industry = "Retail" | "Services" | "Project/Quotation";
export type PlanType = "none" | "3months" | "6months" | "yearly" | "custom";

export interface SubscriptionPlan {
  type: PlanType;
  startDate?: Date;
  expiryDate?: Date;
  active: boolean;
  months?: number;
}

export interface BusinessProfile {
  id?: string;
  name: string;
  username: string;
  industry: Industry;
  email: string;
  avatarUri?: string;
  businessAddress?: string;
  phone?: string;
  deliveryFeeLagos?: number;
  deliveryFeeOther?: number;
  freeDeliveryThreshold?: number | null;
}

export type AdPlatform = "instagram" | "facebook" | "tiktok" | "youtube";

export interface Notification {
  id: string;
  type: "escrow" | "chat" | "logistics" | "marketing";
  /** Which sound to play: "money" for payments/orders, "notify" for everything else. Default: "notify" */
  sound?: "money" | "notify";
  title: string;
  body: string;
  read: boolean;
  timestamp: Date;
  actionScreen?: string;
  actionParams?: Record<string, string>;
  orderId?: string;
}

export interface ActivityItem {
  id: string;
  type: "order" | "payment" | "escrow" | "transfer" | "dispute" | "bot";
  icon: string;
  title: string;
  subtitle: string;
  timestamp: Date;
  variant?: "success" | "warning" | "error" | "default";
  orderId?: string;
  amount?: number;
}

export interface ChatThread {
  id: string;
  customerName: string;
  customerPhone: string;
  lastMessage: string;
  timestamp: Date;
  status: "bot" | "human" | "paused";
  unreadCount: number;
  avatarInitials: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  from: "customer" | "merchant" | "bot";
  ts: Date;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  inStock: boolean;
  category: string;
  imageUri?: string;
  images?: string[];
  stock?: number;
  stockQuantity?: number;
  preorder?: boolean;
  preorderReleaseDate?: string | null;
}

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  buyerName: string;
  buyerPhone: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  escrowCode: string;
  status: "escrow_pending" | "delivered" | "reversed" | "disputed";
  timestamp: Date;
  invoiceSent: boolean;
  trackingId?: string | null;
}

export interface Ad {
  id: string;
  name: string;
  status: "active" | "paused" | "draft";
  platforms: AdPlatform[];
  mediaUri?: string;
  mediaType?: "image" | "video";
  copy: string;
  dailyBudget: number;
  totalSpend: number;
  impressions: number;
  clicks: number;
  leads: number;
  cpl: number;
  sales: number;
  createdAt: Date;
}

export interface SectionComponent {
  id: string;
  type: "text" | "button" | "input" | "link" | "list" | "carousel" | "divider" | "image";
  content: string;
  placeholder?: string;
  items?: string[];
  action?: "none" | "whatsapp" | "checkout" | "add-to-cart" | "payment-link" | "navigate" | "call";
  actionValue?: string;
  styles?: {
    fontSize?: number;
    fontWeight?: "normal" | "bold" | "semibold";
    color?: string;
    bgColor?: string;
    align?: "left" | "center" | "right";
    borderRadius?: number;
    padding?: number;
    italic?: boolean;
    underline?: boolean;
  };
}

export interface TemplateSection {
  id: string;
  type: "hero" | "products" | "about" | "contact" | "cta" | "gallery" | "custom" | "testimonials" | "faq" | "pricing" | "features" | "newsletter" | "banner" | "countdown" | "video";
  title: string;
  subtitle?: string;
  body?: string;
  buttonText?: string;
  buttonLink?: string;
  imageUri?: string;
  bgColor?: string;
  textColor?: string;
  visible: boolean;
  components?: SectionComponent[];
}

export interface TemplatePage {
  id: string;
  name: string;
  slug: string;
  sections: TemplateSection[];
}

export interface StoreTemplate {
  id: string;
  name: string;
  kind: "shop-boutique" | "shop-market" | "website-pro";
  accentColor: string;
  bgColor: string;
  textColor: string;
  cardColor: string;
  sections: TemplateSection[];
  pages?: TemplatePage[];
  paymentGateways: Array<"flutterwave" | "paystack" | "paypal">;
  launched: boolean;
  whatsappLink?: string;
  launchUrl?: string;
  thumbnailUri?: string;
}

export interface Rider {
  id: string;
  name: string;
  phone: string;
  vehicle: "bike" | "car" | "van";
  status: "available" | "busy" | "offline" | "booked";
  eta: number;
  platform: "Kwik" | "Gokada" | "Sendbox" | "Independent";
  rating: number;
  completedDeliveries: number;
  location: string;
  pinged: boolean;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  verified: boolean;
  isPrimary: boolean;
}

export interface WithdrawalRecord {
  id: string;
  amount: number;
  bankAccountId: string;
  bankName: string;
  accountNumber: string;
  status: "pending" | "success" | "failed";
  timestamp: Date;
  reference: string;
}

export interface ReferralRecord {
  id: string;
  name: string;
  phone: string;
  joinedAt: Date;
  status: "pending" | "active";
  earnings: number;
}

interface AppState {
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  profile: BusinessProfile | null;
  escrowBalance: number;
  availableBalance: number;
  notifications: Notification[];
  activity: ActivityItem[];
  chats: ChatThread[];
  rawMessages: Record<string, ChatMessage[]>;
  products: Product[];
  ads: Ad[];
  orders: Order[];
  templates: StoreTemplate[];
  riders: Rider[];
  bankAccounts: BankAccount[];
  withdrawals: WithdrawalRecord[];
  botEnabled: boolean;
  referrals: ReferralRecord[];
  referralCode: string;
  referralEarnings: number;
  historicalAdSpend: number;
  subscription: SubscriptionPlan;
  isDummyDataCleared: boolean;
  notifDrawerVisible: boolean;
  whatsappConnected: boolean;
  whatsappNumber: string;
}

interface AppContextValue extends AppState {
  login: (profile: BusinessProfile) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<BusinessProfile>) => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addNotification: (notif: Omit<Notification, "id" | "timestamp" | "read">) => void;
  toggleBot: (chatId?: string) => void;
  toggleProductStock: (id: string) => void;
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addAd: (ad: Omit<Ad, "id" | "createdAt" | "totalSpend" | "impressions" | "clicks" | "leads" | "cpl" | "sales">) => void;
  updateAd: (id: string, updates: Partial<Ad>) => void;
  deleteAd: (id: string) => void;
  releaseEscrow: (orderId: string, code: string) => boolean;
  reverseTransaction: (orderId: string) => void;
  sendInvoice: (orderId: string) => void;
  withdraw: (amount: number, bankAccountId: string) => WithdrawalRecord | null;
  addBankAccount: (account: Omit<BankAccount, "id" | "verified" | "isPrimary">) => void;
  updateTemplate: (id: string, updates: Partial<StoreTemplate>) => void;
  updateTemplateSection: (templateId: string, sectionId: string, updates: Partial<TemplateSection>) => void;
  addTemplateSection: (templateId: string, section: Omit<TemplateSection, "id">) => void;
  removeTemplateSection: (templateId: string, sectionId: string) => void;
  addSectionComponent: (templateId: string, sectionId: string, component: Omit<SectionComponent, "id">) => void;
  updateSectionComponent: (templateId: string, sectionId: string, componentId: string, updates: Partial<SectionComponent>) => void;
  removeSectionComponent: (templateId: string, sectionId: string, componentId: string) => void;
  reorderTemplateSections: (templateId: string, sectionId: string, direction: "up" | "down", pageId?: string) => void;
  addTemplatePage: (templateId: string, name: string) => void;
  updateTemplatePage: (templateId: string, pageId: string, updates: Partial<Omit<TemplatePage, "id">>) => void;
  deleteTemplatePage: (templateId: string, pageId: string) => void;
  addTemplateSectionToPage: (templateId: string, pageId: string, section: Omit<TemplateSection, "id">) => void;
  updateTemplateSectionInPage: (templateId: string, pageId: string, sectionId: string, updates: Partial<TemplateSection>) => void;
  removeTemplateSectionFromPage: (templateId: string, pageId: string, sectionId: string) => void;
  createTemplate: (name: string, kind: StoreTemplate["kind"]) => void;
  deleteTemplate: (id: string) => void;
  launchTemplate: (id: string) => void;
  deactivateTemplate: (id: string) => void;
  loadOrderItems: (orderId: string) => Promise<void>;
  pingRider: (riderId: string) => void;
  markRiderBooked: (riderId: string) => void;
  sendWhatsAppMessage: (to: string, message: string) => Promise<void>;
  activateSubscription: (plan: PlanType, months?: number) => void;
  cancelSubscription: () => void;
  connectWhatsApp: (number: string) => void;
  disconnectWhatsApp: () => void;
  clearDummyData: () => void;
  openNotifDrawer: () => void;
  closeNotifDrawer: () => void;
  unreadCount: number;
  refreshProducts: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const MOCK_CHATS: ChatThread[] = [
  { id: "1", customerName: "Chidi Okonkwo", customerPhone: "+2348031234567", lastMessage: "I'd like to order the red sneakers in size 42", timestamp: new Date(Date.now() - 5 * 60 * 1000), status: "bot", unreadCount: 3, avatarInitials: "CO" },
  { id: "2", customerName: "Shade Adeyemi", customerPhone: "+2348051234567", lastMessage: "Can we do Sunday for the bridal makeup session?", timestamp: new Date(Date.now() - 22 * 60 * 1000), status: "human", unreadCount: 1, avatarInitials: "SA" },
  { id: "3", customerName: "Tunde Balogun", customerPhone: "+2348071234567", lastMessage: "Payment done! Waiting for confirmation", timestamp: new Date(Date.now() - 65 * 60 * 1000), status: "paused", unreadCount: 0, avatarInitials: "TB" },
  { id: "4", customerName: "Ngozi Eze", customerPhone: "+2348021234567", lastMessage: "How long does delivery take to Abuja?", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), status: "bot", unreadCount: 0, avatarInitials: "NE" },
  { id: "5", customerName: "Emeka Nwosu", customerPhone: "+2348041234567", lastMessage: "Thanks! The package arrived safely", timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), status: "bot", unreadCount: 0, avatarInitials: "EN" },
];

const MOCK_ORDERS: Order[] = [
  { id: "ord-1", orderNumber: "#1042", buyerName: "Chidi Okonkwo", buyerPhone: "+2348031234567", items: [{ name: "Classic White Sneakers", qty: 1, price: 18500 }, { name: "Ankara Print Tote Bag", qty: 2, price: 8900 }], subtotal: 36300, deliveryFee: 1500, total: 37800, escrowCode: "7421", status: "escrow_pending", timestamp: new Date(Date.now() - 8 * 60 * 1000), invoiceSent: false },
  { id: "ord-2", orderNumber: "#1038", buyerName: "Shade Adeyemi", buyerPhone: "+2348051234567", items: [{ name: "Men's Agbada Set", qty: 1, price: 45000 }], subtotal: 45000, deliveryFee: 0, total: 45000, escrowCode: "3856", status: "escrow_pending", timestamp: new Date(Date.now() - 35 * 60 * 1000), invoiceSent: false },
  { id: "ord-3", orderNumber: "#1031", buyerName: "Tunde Balogun", buyerPhone: "+2348071234567", items: [{ name: "Perfume - Oud Noir", qty: 1, price: 12000 }, { name: "Gold Hoop Earrings", qty: 2, price: 6500 }], subtotal: 25000, deliveryFee: 1200, total: 26200, escrowCode: "9103", status: "delivered", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), invoiceSent: true },
  { id: "ord-4", orderNumber: "#1028", buyerName: "Ngozi Eze", buyerPhone: "+2348021234567", items: [{ name: "Leather Crossbody Bag", qty: 1, price: 22000 }], subtotal: 22000, deliveryFee: 2000, total: 24000, escrowCode: "5517", status: "reversed", timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), invoiceSent: false },
];

const MOCK_ACTIVITY: ActivityItem[] = [
  { id: "1", type: "order", icon: "shopping-cart", title: "New Order #1042", subtitle: "Chidi Okonkwo placed an order — ₦37,800 in escrow", timestamp: new Date(Date.now() - 5 * 60 * 1000), variant: "default", orderId: "ord-1", amount: 37800 },
  { id: "2", type: "payment", icon: "credit-card", title: "Payment Processing", subtitle: "Paystack generated a virtual account for Tunde", timestamp: new Date(Date.now() - 12 * 60 * 1000), variant: "default", amount: 26200 },
  { id: "3", type: "escrow", icon: "shield", title: "Escrow Released", subtitle: "OTP Verified! ₦26,200 moved to Available Balance", timestamp: new Date(Date.now() - 45 * 60 * 1000), variant: "success", orderId: "ord-3", amount: 26200 },
  { id: "4", type: "transfer", icon: "arrow-up-right", title: "Bank Transfer", subtitle: "Withdrawal of ₦120,000 to GTBank successful", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), variant: "success", amount: 120000 },
  { id: "5", type: "dispute", icon: "alert-circle", title: "Dispute Opened", subtitle: "Customer flagged Order #1028: 'Wrong size delivered'", timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), variant: "error", orderId: "ord-4" },
  { id: "6", type: "bot", icon: "cpu", title: "Bot Active", subtitle: "AI processed 12 customer enquiries automatically", timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), variant: "default" },
];

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "1", type: "escrow", title: "Escrow Funded", body: "Order #1042 funded by Chidi! ₦37,800 is now locked in Escrow.", read: false, timestamp: new Date(Date.now() - 8 * 60 * 1000), actionScreen: "/order/ord-1", orderId: "ord-1" },
  { id: "2", type: "chat", title: "Human Handoff", body: "AI paused. Shade needs help closing a wedding booking.", read: false, timestamp: new Date(Date.now() - 25 * 60 * 1000), actionScreen: "/chat/2" },
  { id: "3", type: "logistics", title: "Rider Arrived", body: "Kwik Rider has arrived at your shop for pickup — Order #1042.", read: false, timestamp: new Date(Date.now() - 40 * 60 * 1000), actionScreen: "/logistics" },
  { id: "4", type: "escrow", title: "Escrow Funded", body: "Order #1038 funded by Shade! ₦45,000 is now locked in Escrow.", read: false, timestamp: new Date(Date.now() - 55 * 60 * 1000), actionScreen: "/order/ord-2", orderId: "ord-2" },
  { id: "5", type: "marketing", title: "Ad Milestone", body: "Your Instagram Ad just brought in 50 new WhatsApp leads today!", read: true, timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000) },
];

const MOCK_PRODUCTS: Product[] = [
  { id: "1", name: "Classic White Sneakers", price: 18500, description: "Premium canvas sneakers, unisex", inStock: true, category: "Footwear", imageUri: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80" },
  { id: "2", name: "Ankara Print Tote Bag", price: 8900, description: "Handcrafted wax print tote", inStock: true, category: "Accessories", imageUri: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80" },
  { id: "3", name: "Men's Agbada Set", price: 45000, description: "Full 3-piece traditional attire", inStock: false, category: "Fashion", imageUri: "https://images.unsplash.com/photo-1594938298603-c8148c4b0f79?w=600&q=80" },
  { id: "4", name: "Gold Hoop Earrings", price: 6500, description: "14k gold-plated statement earrings", inStock: true, category: "Jewelry", imageUri: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80" },
  { id: "5", name: "Perfume - Oud Noir", price: 12000, description: "Long-lasting oriental fragrance, 50ml", inStock: true, category: "Fragrance", imageUri: "https://images.unsplash.com/photo-1541643600914-78b084683702?w=600&q=80" },
  { id: "6", name: "Leather Crossbody Bag", price: 22000, description: "Genuine leather, multiple compartments", inStock: false, category: "Accessories", imageUri: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80" },
];

const MOCK_ADS: Ad[] = [
  { id: "1", name: "Summer Fashion Drop", status: "active", platforms: ["instagram", "facebook"], copy: "Discover our new summer collection! Quality fashion delivered to your door.", dailyBudget: 5000, totalSpend: 60000, impressions: 12400, clicks: 843, leads: 50, cpl: 1200, sales: 187500, createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  { id: "2", name: "Fragrance Promo", status: "paused", platforms: ["instagram"], copy: "Smell irresistible. Our Oud Noir fragrance is perfect for any occasion.", dailyBudget: 3500, totalSpend: 50400, impressions: 5200, clicks: 321, leads: 18, cpl: 2800, sales: 78000, createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
];

const MOCK_TEMPLATES: StoreTemplate[] = [
  {
    id: "tmpl-1",
    name: "Boutique Luxe",
    kind: "shop-boutique",
    accentColor: "#1A1C4B",
    bgColor: "#FAFAFA",
    textColor: "#1A1C4B",
    cardColor: "#FFFFFF",
    paymentGateways: ["flutterwave", "paystack"],
    launched: false,
    sections: [
      { id: "s1", type: "hero", title: "Welcome to Our Store", subtitle: "Premium quality, delivered to your door", buttonText: "Shop Now", visible: true },
      { id: "s2", type: "products", title: "Featured Products", visible: true },
      { id: "s3", type: "about", title: "Our Story", body: "We bring you the finest curated collection of fashion and lifestyle products.", visible: true },
      { id: "s4", type: "contact", title: "Get in Touch", subtitle: "Chat with us on WhatsApp", visible: true },
    ],
  },
  {
    id: "tmpl-2",
    name: "Fresh Market",
    kind: "shop-market",
    accentColor: "#0F766E",
    bgColor: "#F0FDF4",
    textColor: "#064E3B",
    cardColor: "#FFFFFF",
    paymentGateways: ["paystack"],
    launched: false,
    sections: [
      { id: "s1", type: "hero", title: "Fresh Daily Deals", subtitle: "Quality products at unbeatable prices", buttonText: "Browse Now", visible: true },
      { id: "s2", type: "products", title: "Today's Picks", visible: true },
      { id: "s3", type: "cta", title: "Order via WhatsApp", subtitle: "Fast, easy and reliable delivery", buttonText: "Chat Now", visible: true },
      { id: "s4", type: "contact", title: "Contact Us", visible: true },
    ],
  },
  {
    id: "tmpl-3",
    name: "Prestige Pro",
    kind: "website-pro",
    accentColor: "#4338CA",
    bgColor: "#FFFFFF",
    textColor: "#1E293B",
    cardColor: "#F8FAFC",
    paymentGateways: ["flutterwave"],
    launched: true,
    launchUrl: "https://kiosk.store/@myshop",
    whatsappLink: "https://wa.me/2348031234567?text=Hello%2C+I+found+your+site+on+Kiosk",
    sections: [
      { id: "s1", type: "hero", title: "Professional Services You Can Trust", subtitle: "Experience excellence with every interaction", buttonText: "Get Started", visible: true },
      { id: "s2", type: "products", title: "Our Services", visible: true },
      { id: "s3", type: "about", title: "About Us", body: "We are a team of dedicated professionals committed to delivering exceptional value to every client.", visible: true },
      { id: "s4", type: "gallery", title: "Our Work", visible: true },
      { id: "s5", type: "contact", title: "Contact", subtitle: "We'd love to hear from you", visible: true },
    ],
  },
];

const MOCK_RIDERS: Rider[] = [
  { id: "r1", name: "Seun Adeyemi", phone: "+2348031234567", vehicle: "bike", status: "available", eta: 12, platform: "Kwik", rating: 4.8, completedDeliveries: 234, location: "Yaba, Lagos", pinged: false },
  { id: "r2", name: "Biodun Okafor", phone: "+2348041234567", vehicle: "bike", status: "available", eta: 18, platform: "Gokada", rating: 4.6, completedDeliveries: 189, location: "Surulere, Lagos", pinged: false },
  { id: "r3", name: "Chukwuemeka Nwosu", phone: "+2348051234567", vehicle: "car", status: "busy", eta: 35, platform: "Kwik", rating: 4.9, completedDeliveries: 412, location: "Victoria Island, Lagos", pinged: false },
  { id: "r4", name: "Amaka Obi", phone: "+2348061234567", vehicle: "van", status: "available", eta: 25, platform: "Sendbox", rating: 4.7, completedDeliveries: 156, location: "Ikeja, Lagos", pinged: false },
  { id: "r5", name: "Tunde Fashola", phone: "+2348071234567", vehicle: "bike", status: "offline", eta: 0, platform: "Independent", rating: 4.5, completedDeliveries: 98, location: "Lekki, Lagos", pinged: false },
  { id: "r6", name: "Kemi Adebayo", phone: "+2348081234567", vehicle: "bike", status: "available", eta: 9, platform: "Kwik", rating: 4.9, completedDeliveries: 317, location: "Shomolu, Lagos", pinged: false },
  { id: "r7", name: "Ayo Bankole", phone: "+2348091234567", vehicle: "car", status: "available", eta: 22, platform: "Gokada", rating: 4.4, completedDeliveries: 88, location: "Ikoyi, Lagos", pinged: false },
  { id: "r8", name: "Nkechi Okeke", phone: "+2348021111111", vehicle: "van", status: "busy", eta: 40, platform: "Sendbox", rating: 4.7, completedDeliveries: 203, location: "Mushin, Lagos", pinged: false },
];

const MOCK_BANK_ACCOUNTS: BankAccount[] = [
  { id: "ba-1", bankName: "GTBank", accountNumber: "0123456789", accountName: "My Shop Ltd", verified: true, isPrimary: true },
];

const MOCK_REFERRALS: ReferralRecord[] = [
  { id: "ref-1", name: "Tolu Adeyemi", phone: "+2348031112222", joinedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), status: "active", earnings: 2500 },
  { id: "ref-2", name: "Chuks Obi", phone: "+2348041112222", joinedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), status: "active", earnings: 2500 },
  { id: "ref-3", name: "Funmi Balogun", phone: "+2348051112222", joinedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), status: "pending", earnings: 0 },
];

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 6);
}

// Configure how notifications are shown when app is in foreground
function setupNotifications() {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {}
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    setupNotifications();
    setAudioMode().catch(() => {});
  }, []);

  const playNotify = useCallback(async () => {
    try { await playSound(NOTIFY_SRC); } catch {}
  }, []);

  const playMoney = useCallback(async () => {
    try { await playSound(MONEY_SRC); } catch {}
  }, []);

  const [state, setState] = useState<AppState>({
    isAuthenticated: false,
    isAuthLoading: true,
    profile: null,
    escrowBalance: 0,
    availableBalance: 0,
    notifications: [],
    activity: [],
    chats: [],
    rawMessages: {},
    products: [],
    ads: [],
    orders: [],
    templates: [],
    riders: [],
    bankAccounts: [],
    withdrawals: [],
    botEnabled: true,
    referrals: [],
    referralCode: "",
    referralEarnings: 0,
    historicalAdSpend: 0,
    subscription: { type: "none", active: false },
    isDummyDataCleared: false,
    notifDrawerVisible: false,
    whatsappConnected: false,
    whatsappNumber: "",
  });

  useEffect(() => {
    let mounted = true;
    const safetyTimeout = setTimeout(() => {
      if (!mounted) return;
      setState((prev) => prev.isAuthLoading ? { ...prev, isAuthLoading: false } : prev);
    }, 15000);

    (async () => {
      try {
        const [token, cachedVal, dataVal] = await Promise.all([
          tokenStore.get(),
          AsyncStorage.getItem("kiosk_auth"),
          AsyncStorage.getItem("kiosk_data"),
        ]);
        const cached = cachedVal ? (JSON.parse(cachedVal) as BusinessProfile) : null;

        // Immediately unblock the UI — show dashboard if we have any cached session
        if (cached) {
          const dataCache = dataVal ? JSON.parse(dataVal) : null;
          setState((prev) => ({
            ...prev,
            isAuthenticated: true,
            isAuthLoading: false,
            profile: cached,
            ...(dataCache ? {
              products:         dataCache.products         ?? prev.products,
              orders:           (dataCache.orders ?? []).map((o: any) => ({ ...o, timestamp: new Date(o.timestamp) })),
              bankAccounts:     dataCache.bankAccounts     ?? prev.bankAccounts,
              availableBalance: dataCache.availableBalance ?? prev.availableBalance,
              escrowBalance:    dataCache.escrowBalance    ?? prev.escrowBalance,
              withdrawals:      dataCache.withdrawals      ?? prev.withdrawals,
              subscription:     dataCache.subscription ? {
                ...dataCache.subscription,
                startDate:  dataCache.subscription.startDate  ? new Date(dataCache.subscription.startDate)  : undefined,
                expiryDate: dataCache.subscription.expiryDate ? new Date(dataCache.subscription.expiryDate) : undefined,
              } : prev.subscription,
            } : {}),
          }));
          loadApiData();
        }

        if (!token) {
          // No token → cached was already applied above (or nothing to do)
          if (!cached) setState((prev) => ({ ...prev, isAuthLoading: false }));
          return;
        }

        // Silent background refresh — user is already on the dashboard
        try {
          const res = await authApi.getMe();
          const user = (res as any).user ?? res;
          if (user?.id) {
            const profile: BusinessProfile = {
              name: user.name ?? user.businessName ?? "",
              username: user.username ?? cached?.username ?? (user.businessName ?? user.name ?? "").toLowerCase().replace(/\s+/g, ""),
              industry: "Retail",
              email: user.email ?? "",
              avatarUri: cached?.avatarUri,
            };
            setState((prev) => ({ ...prev, isAuthenticated: true, isAuthLoading: false, profile }));
            AsyncStorage.setItem("kiosk_auth", JSON.stringify(profile));
            if (!cached) loadApiData();
          }
        } catch (err) {
          const msg = (err as Error)?.message ?? "";
          const isOffline = msg.includes("timed out") || msg.includes("Network request failed") || (err as Error)?.name === "AbortError";
          if (!cached && !isOffline) {
            // No cache and server rejected token — force to login screen
            setState((prev) => ({ ...prev, isAuthenticated: false, isAuthLoading: false }));
          } else if (!cached) {
            // Offline with no cache — still unblock UI to login page
            setState((prev) => ({ ...prev, isAuthLoading: false }));
          }
          // If offline but cached, user is already on dashboard — nothing to do
        }
      } catch {
        if (mounted) setState((prev) => ({ ...prev, isAuthLoading: false }));
      } finally {
        clearTimeout(safetyTimeout);
      }
    })();

    return () => { mounted = false; clearTimeout(safetyTimeout); };
  }, []);

  const loadApiData = useCallback(async () => {
    try {
      const [prodsRes, ordersRes, subsRes, walletRes, txRes, bankRes, chatRes, adsRes, referralRes, ridersRes] = await Promise.allSettled([
        productsApi.list(),
        ordersApi.list(),
        subscriptionsApi.getCurrent(),
        walletApi.getBalance(),
        walletApi.getTransactions({ limit: 20 }),
        walletApi.getBankAccounts(),
        whatsappApi.messages(),
        adsApi.list(),
        referralsApi.get(),
        logisticsApi.searchRiders({ pickupLat: 6.5244, pickupLng: 3.3792, deliveryLat: 6.5244, deliveryLng: 3.3792, limit: 50 }),
      ]);

      setState((prev) => {
        let next = { ...prev };

        if (prodsRes.status === "fulfilled") {
          const apiProds = ((prodsRes.value as any).data ?? prodsRes.value) as any[];
          if (Array.isArray(apiProds)) {
            next.products = apiProds.map((p: any) => ({
              id: p.id,
              name: p.name,
              price: parseFloat(p.price ?? "0"),
              description: p.description ?? "",
              inStock: p.active !== false && (p.stock == null || p.stock > 0),
              category: p.category ?? "General",
              imageUri: p.imageUrl ?? undefined,
              stock: p.stock != null ? Number(p.stock) : undefined,
            }));
          }
        }

        if (ordersRes.status === "fulfilled") {
          const apiOrders = ((ordersRes.value as any).data ?? ordersRes.value) as any[];
          if (Array.isArray(apiOrders)) {
            // Map DB statuses (pending/paid/shipped/delivered/cancelled) → mobile statuses
            const mapOrderStatus = (s: string): Order["status"] => {
              if (s === "delivered") return "delivered";
              if (s === "cancelled" || s === "reversed") return "reversed";
              return "escrow_pending"; // pending, paid, shipped all = awaiting delivery
            };
            next.orders = apiOrders.map((o: any) => ({
              id: o.id,
              orderNumber: o.orderNumber ?? `#${o.id.slice(-4).toUpperCase()}`,
              buyerName: o.buyerName ?? "Customer",
              buyerPhone: o.buyerPhone ?? "",
              items: [],
              subtotal: parseFloat(o.totalAmount ?? "0"),
              deliveryFee: 0,
              total: parseFloat(o.totalAmount ?? "0"),
              escrowCode: o.escrowOtp ?? "0000",
              status: mapOrderStatus(o.status ?? "pending"),
              timestamp: new Date(o.createdAt ?? Date.now()),
              invoiceSent: false,
              trackingId: o.trackingId ?? null,
            }));
            // Escrow balance = sum of all orders still awaiting delivery confirmation
            const inEscrow = next.orders
              .filter((o) => o.status === "escrow_pending")
              .reduce((s, o) => s + o.total, 0);
            next.escrowBalance = inEscrow;
          }
        }

        if (subsRes.status === "fulfilled") {
          const sub = (subsRes.value as any).data ?? (subsRes.value as any).subscription ?? (subsRes.value as any);
          if (sub?.plan && sub.status === "active") {
            next.subscription = {
              type: sub.plan as PlanType,
              active: true,
              startDate: sub.startDate ? new Date(sub.startDate) : undefined,
              expiryDate: sub.endDate ? new Date(sub.endDate) : undefined,
            };
          }
        }

        if (walletRes.status === "fulfilled") {
          // API returns { success, data: { balance, escrowBalance, transactions } }
          const wallet = (walletRes.value as any).data ?? (walletRes.value as any).wallet ?? walletRes.value;
          if (wallet?.balance != null) {
            next.availableBalance = parseFloat(String(wallet.balance ?? "0"));
          }
          if (wallet?.escrowBalance != null) {
            next.escrowBalance = parseFloat(String(wallet.escrowBalance ?? "0"));
          }
        }

        if (txRes.status === "fulfilled") {
          const txs = ((txRes.value as any).data ?? txRes.value) as any[];

          // Wallet transaction activity items
          const txActivity: ActivityItem[] = Array.isArray(txs) ? txs.map((t: any) => ({
            id: `tx-${t.id}`,
            type: (t.type?.includes("referral") ? "transfer" : t.type === "withdrawal" ? "transfer" : t.type === "logistics_debit" ? "transfer" : "payment") as ActivityItem["type"],
            icon: t.type === "withdrawal" ? "arrow-up-right"
                : t.type === "credit" ? "arrow-down-left"
                : t.type === "logistics_debit" ? "truck"
                : t.type?.includes("referral") ? "gift"
                : "credit-card",
            title: t.type === "credit" ? "Escrow Released"
                 : t.type === "withdrawal" ? "Bank Transfer"
                 : t.type === "logistics_debit" ? "Shipment Booked"
                 : t.type === "referral_credit" ? "Referral Reward"
                 : t.description ?? t.type,
            subtitle: `₦${parseFloat(t.amount ?? "0").toLocaleString("en-NG")} — ${t.description ?? ""}`,
            timestamp: new Date(t.createdAt ?? Date.now()),
            variant: t.type === "credit" || t.type === "referral_credit" ? "success"
                   : t.type === "withdrawal" ? "default"
                   : "default",
            amount: parseFloat(t.amount ?? "0"),
          })) : [];

          // Order activity items — new orders from the server feed into activity too
          const orderActivity: ActivityItem[] = (next.orders ?? []).slice(0, 20).map((o) => ({
            id: `ord-${o.id}`,
            type: "order" as const,
            icon: o.status === "delivered" ? "check-circle"
                : o.status === "reversed" ? "x-circle"
                : "shopping-cart",
            title: o.status === "delivered" ? `Order ${o.orderNumber} Delivered`
                 : o.status === "reversed" ? `Order ${o.orderNumber} Refunded`
                 : `New Order ${o.orderNumber}`,
            subtitle: `${o.buyerName} — ₦${o.total.toLocaleString("en-NG")} in escrow`,
            timestamp: o.timestamp,
            variant: o.status === "delivered" ? "success"
                   : o.status === "reversed" ? "error"
                   : "default",
            orderId: o.id,
            amount: o.total,
          }));

          // Merge and sort by most recent
          next.activity = [...txActivity, ...orderActivity]
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 50);
        }

        if (bankRes.status === "fulfilled") {
          const accounts = ((bankRes.value as any).data ?? bankRes.value) as any[];
          if (Array.isArray(accounts)) {
            next.bankAccounts = accounts.map((a: any) => ({
              id: a.id,
              bankName: a.bankName,
              accountNumber: a.accountNumber,
              accountName: a.accountName,
              verified: a.verified ?? false,
              isPrimary: a.isPrimary ?? false,
            }));
          }
        }

        if (chatRes.status === "fulfilled") {
          const msgs = ((chatRes.value as any).data ?? chatRes.value) as any[];
          if (Array.isArray(msgs)) {
            const threads = new Map<string, any[]>();
            for (const m of msgs) {
              const key = m.customerPhone;
              if (!threads.has(key)) threads.set(key, []);
              threads.get(key)!.push(m);
            }
            const rawMessages: Record<string, ChatMessage[]> = {};
            next.chats = Array.from(threads.entries()).map(([phone, messages]) => {
              const last = messages[messages.length - 1]!;
              const unread = messages.filter((m: any) => m.direction === "inbound" && !m.read).length;
              rawMessages[phone] = messages.map((m: any, i: number) => ({
                id: m.id ?? `${phone}-${i}`,
                text: m.message ?? "",
                from: m.direction === "inbound" ? ("customer" as const) : ("merchant" as const),
                ts: new Date(m.createdAt ?? Date.now()),
              }));
              return {
                id: phone,
                customerName: phone,
                customerPhone: phone,
                lastMessage: last.message ?? "",
                timestamp: new Date(last.createdAt ?? Date.now()),
                status: "bot" as const,
                unreadCount: unread,
                avatarInitials: phone.slice(-4),
              };
            });
            next.rawMessages = rawMessages;
          }
        }

        if (adsRes.status === "fulfilled") {
          const apiAds = ((adsRes.value as any).data ?? adsRes.value) as any[];
          if (Array.isArray(apiAds)) {
            next.ads = apiAds.map((a: any) => ({
              id: a.id,
              name: a.name,
              status: (a.status ?? "draft") as Ad["status"],
              platforms: (a.platforms ?? ["instagram"]) as Ad["platforms"],
              copy: a.copy ?? a.description ?? "",
              dailyBudget: parseFloat(a.budget ?? a.dailyBudget ?? "0"),
              totalSpend: parseFloat(a.totalSpend ?? "0"),
              impressions: a.impressions ?? 0,
              clicks: a.clicks ?? 0,
              leads: a.leads ?? 0,
              cpl: a.cpl ?? 0,
              sales: a.sales ?? 0,
              createdAt: new Date(a.createdAt ?? Date.now()),
            }));
          }
        }

        if (referralRes.status === "fulfilled") {
          const ref = (referralRes.value as any).data ?? referralRes.value;
          if (ref) {
            if (ref.referralCode) next.referralCode = ref.referralCode;
            if (ref.totalEarned != null) next.referralEarnings = parseFloat(String(ref.totalEarned ?? "0"));
            if (Array.isArray(ref.referred)) {
              next.referrals = ref.referred.map((r: any) => ({
                id: r.id,
                name: r.name ?? "User",
                phone: r.phone ?? r.email ?? "",
                joinedAt: new Date(r.joinedAt ?? r.createdAt ?? Date.now()),
                status: (r.status === "active" || r.status === "rewarded" ? "active" : "pending") as "pending" | "active",
                earnings: parseFloat(String(r.reward ?? "0")),
              }));
            }
          }
        }

        if (ridersRes.status === "fulfilled") {
          const apiRiders = ((ridersRes.value as any).data ?? ridersRes.value) as any[];
          if (Array.isArray(apiRiders)) {
            next.riders = apiRiders.map((r: any) => ({
              id: r.id,
              name: r.name,
              phone: r.phone ?? "",
              vehicle: r.vehicleType ?? r.vehicle ?? "bike",
              status: (r.status ?? "available") as Rider["status"],
              eta: r.eta ?? 0,
              platform: r.platform ?? "Independent",
              rating: parseFloat(r.rating ?? "0"),
              completedDeliveries: r.completedDeliveries ?? r.deliveries ?? 0,
              location: r.location ?? r.currentArea ?? "",
              pinged: false,
            }));
          }
        }

        // Persist the critical fields so they survive offline restarts
        const toCache = {
          products:         next.products,
          orders:           next.orders,
          bankAccounts:     next.bankAccounts,
          availableBalance: next.availableBalance,
          escrowBalance:    next.escrowBalance,
          withdrawals:      next.withdrawals,
          subscription:     next.subscription
            ? { ...next.subscription, startDate: next.subscription.startDate?.toISOString(), expiryDate: next.subscription.expiryDate?.toISOString() }
            : null,
          cachedAt: Date.now(),
        };
        AsyncStorage.setItem("kiosk_data", JSON.stringify(toCache)).catch(() => {});

        return next;
      });
    } catch {
      // Silently ignore — keep mock/local state
    }
  }, []);

  // Refresh data when app returns to foreground
  useEffect(() => {
    const sub = RNAppState.addEventListener("change", (next) => {
      if (next === "active") {
        loadApiData();
      }
    });
    return () => sub.remove();
  }, [loadApiData]);

  const login = useCallback(async (profile: BusinessProfile) => {
    await AsyncStorage.setItem("kiosk_auth", JSON.stringify(profile));
    setState((prev) => ({ ...prev, isAuthenticated: true, profile }));
    loadApiData();
    registerPushToken(); // non-blocking — register for push notifications
  }, [loadApiData]);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem("kiosk_auth");
    await tokenStore.clear();
    await authApi.logout();
    setState((prev) => ({ ...prev, isAuthenticated: false, profile: null }));
  }, []);

  const updateProfile = useCallback(async (updates: Partial<BusinessProfile>) => {
    setState((prev) => {
      const updated = { ...(prev.profile ?? { name: "", username: "", industry: "Retail" as const, email: "" }), ...updates };
      AsyncStorage.setItem("kiosk_auth", JSON.stringify(updated));
      return { ...prev, profile: updated };
    });
    // Sync non-local fields to backend (avatarUri stays local only)
    const serverUpdates: Record<string, string | number | null | undefined> = {};
    if (updates.name !== undefined) serverUpdates["name"] = updates.name;
    if (updates.username !== undefined) serverUpdates["username"] = updates.username;
    if ((updates as any).businessAddress !== undefined) serverUpdates["businessAddress"] = (updates as any).businessAddress;
    if (updates.deliveryFeeLagos !== undefined) serverUpdates["deliveryFeeLagos"] = updates.deliveryFeeLagos;
    if (updates.deliveryFeeOther !== undefined) serverUpdates["deliveryFeeOther"] = updates.deliveryFeeOther;
    if (updates.freeDeliveryThreshold !== undefined) serverUpdates["freeDeliveryThreshold"] = updates.freeDeliveryThreshold;
    if (Object.keys(serverUpdates).length > 0) {
      authApi.updateProfile(serverUpdates as any).catch(() => {});
    }
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
    }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, []);

  const openNotifDrawer = useCallback(() => {
    setState((prev) => ({ ...prev, notifDrawerVisible: true }));
  }, []);

  const closeNotifDrawer = useCallback(() => {
    setState((prev) => ({ ...prev, notifDrawerVisible: false }));
  }, []);

  const toggleBot = useCallback(() => {
    setState((prev) => ({ ...prev, botEnabled: !prev.botEnabled }));
  }, []);

  const toggleProductStock = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) => p.id === id ? { ...p, inStock: !p.inStock } : p),
    }));
  }, []);

  const addProduct = useCallback((product: Omit<Product, "id">) => {
    const tempId = `prod-${genId()}`;
    const newProduct: Product = { ...product, id: tempId };
    setState((prev) => ({ ...prev, products: [newProduct, ...prev.products] }));
    productsApi.create({
      name: product.name,
      description: product.description,
      price: product.price,
      imageUrl: product.imageUri,
      category: product.category,
      stock: product.inStock ? (product.stockQuantity ?? 999) : 0,
      preorder: product.preorder ?? false,
      preorderReleaseDate: product.preorderReleaseDate ?? null,
    }).then((res) => {
      const created = (res as any).data ?? (res as any).product ?? res;
      if (created?.id && created.id !== tempId) {
        setState((prev) => ({
          ...prev,
          products: prev.products.map((p) =>
            p.id === tempId ? { ...p, id: created.id } : p
          ),
        }));
      }
    }).catch((err: unknown) => {
      setState((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== tempId),
      }));
      Alert.alert(
        "Couldn't save product",
        (err as Error)?.message ?? "Product was not saved. Check your connection and try again.",
      );
    });
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) => p.id === id ? { ...p, ...updates } : p),
    }));
    productsApi.update(id, {
      name: updates.name,
      description: updates.description,
      price: updates.price,
      imageUrl: updates.imageUri,
      category: updates.category,
      stock: updates.inStock !== undefined ? (updates.inStock ? 999 : 0) : undefined,
      preorder: updates.preorder,
      preorderReleaseDate: updates.preorderReleaseDate ?? null,
    }).catch(() => {});
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setState((prev) => ({ ...prev, products: prev.products.filter((p) => p.id !== id) }));
    productsApi.delete(id).catch(() => {});
  }, []);

  const addAd = useCallback((ad: Omit<Ad, "id" | "createdAt" | "totalSpend" | "impressions" | "clicks" | "leads" | "cpl" | "sales">) => {
    const tempId = `ad-${genId()}`;
    const newAd: Ad = { ...ad, id: tempId, createdAt: new Date(), totalSpend: 0, impressions: 0, clicks: 0, leads: 0, cpl: 0, sales: 0 };
    setState((prev) => ({ ...prev, ads: [newAd, ...prev.ads] }));
    adsApi.create({
      name: ad.name,
      budget: ad.dailyBudget,
    }).then((res) => {
      const created = (res as any).ad ?? res;
      if (created?.id && created.id !== tempId) {
        setState((prev) => ({
          ...prev,
          ads: prev.ads.map((a) => a.id === tempId ? { ...a, id: created.id } : a),
        }));
      }
    }).catch(() => {});
  }, []);

  const updateAd = useCallback((id: string, updates: Partial<Ad>) => {
    setState((prev) => ({
      ...prev,
      ads: prev.ads.map((a) => a.id === id ? { ...a, ...updates } : a),
    }));
  }, []);

  const deleteAd = useCallback((id: string) => {
    setState((prev) => {
      const ad = prev.ads.find((a) => a.id === id);
      return {
        ...prev,
        ads: prev.ads.filter((a) => a.id !== id),
        historicalAdSpend: prev.historicalAdSpend + (ad?.totalSpend ?? 0),
      };
    });
    adsApi.delete(id).catch(() => {});
  }, []);

  const releaseEscrow = useCallback((orderId: string, code: string): boolean => {
    let released = false;
    setState((prev) => {
      const order = prev.orders.find((o) => o.id === orderId);
      if (!order || order.status !== "escrow_pending" || order.escrowCode !== code) return prev;
      released = true;
      const newActivity: ActivityItem = {
        id: `act-${genId()}`,
        type: "escrow",
        icon: "shield",
        title: "Escrow Released",
        subtitle: `OTP Verified! ₦${order.total.toLocaleString("en-NG")} moved to Available Balance`,
        timestamp: new Date(),
        variant: "success",
        orderId: order.id,
        amount: order.total,
      };
      return {
        ...prev,
        orders: prev.orders.map((o) => o.id === orderId ? { ...o, status: "delivered" as const } : o),
        escrowBalance: prev.escrowBalance - order.total,
        availableBalance: prev.availableBalance + order.total,
        activity: [newActivity, ...prev.activity],
        notifications: prev.notifications.map((n) => n.orderId === orderId ? { ...n, read: true } : n),
      };
    });
    if (released) {
      ordersApi.releaseEscrow(orderId, code).catch(() => {});
      playMoney();
    }
    return released;
  }, [playMoney]);

  const reverseTransaction = useCallback((orderId: string) => {
    setState((prev) => {
      const order = prev.orders.find((o) => o.id === orderId);
      if (!order) return prev;
      const newActivity: ActivityItem = {
        id: `act-${genId()}`,
        type: "transfer",
        icon: "rotate-ccw",
        title: "Transaction Reversed",
        subtitle: `Order ${order.orderNumber} reversed — ₦${order.total.toLocaleString("en-NG")} refunded`,
        timestamp: new Date(),
        variant: "warning",
        orderId: order.id,
        amount: order.total,
      };
      const delta = order.status === "escrow_pending" ? order.total : 0;
      return {
        ...prev,
        orders: prev.orders.map((o) => o.id === orderId ? { ...o, status: "reversed" as const } : o),
        escrowBalance: prev.escrowBalance - delta,
        activity: [newActivity, ...prev.activity],
      };
    });
    ordersApi.refundEscrow(orderId).catch(() => {});
  }, []);

  const sendInvoice = useCallback((orderId: string) => {
    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((o) => o.id === orderId ? { ...o, invoiceSent: true } : o),
    }));
  }, []);

  const withdraw = useCallback((amount: number, bankAccountId: string): WithdrawalRecord | null => {
    let record: WithdrawalRecord | null = null;
    const transferFee = amount > 5000 ? 10 : 0;
    const totalDebit = amount + transferFee;
    setState((prev) => {
      if (prev.availableBalance < totalDebit) return prev;
      const bank = prev.bankAccounts.find((b) => b.id === bankAccountId);
      if (!bank) return prev;
      const reference = `KSK${Date.now().toString().slice(-8)}`;
      record = {
        id: `wd-${genId()}`,
        amount,
        bankAccountId,
        bankName: bank.bankName,
        accountNumber: bank.accountNumber,
        status: "pending",
        timestamp: new Date(),
        reference,
      };
      const newActivity: ActivityItem = {
        id: `act-${genId()}`,
        type: "transfer",
        icon: "arrow-up-right",
        title: "Withdrawal Requested",
        subtitle: `Withdrawal of ₦${amount.toLocaleString("en-NG")} to ${bank.bankName} is processing`,
        timestamp: new Date(),
        variant: "default",
        amount,
      };
      // Call backend withdrawal API — server expects bankAccountId (UUID)
      walletApi.withdraw({ amount, bankAccountId }).then((res) => {
        const ref = (res as any).reference ?? reference;
        setState((s) => ({
          ...s,
          availableBalance: s.availableBalance - totalDebit,
          withdrawals: s.withdrawals.map((w) => w.reference === reference ? { ...w, status: "success", reference: ref } : w),
          activity: s.activity.map((a) =>
            a.title === "Withdrawal Requested" && a.amount === amount
              ? { ...a, title: "Bank Transfer", subtitle: `₦${amount.toLocaleString("en-NG")} sent to ${bank.bankName} successfully`, variant: "success" }
              : a
          ),
        }));
      }).catch(() => {
        setState((s) => ({
          ...s,
          withdrawals: s.withdrawals.map((w) => w.reference === reference ? { ...w, status: "failed" } : w),
        }));
      });
      return {
        ...prev,
        withdrawals: [record!, ...prev.withdrawals],
        activity: [newActivity, ...prev.activity],
      };
    });
    return record;
  }, []);

  const addBankAccount = useCallback((account: Omit<BankAccount, "id" | "verified" | "isPrimary">) => {
    const tempId = `ba-${genId()}`;
    const newAcc: BankAccount = { ...account, id: tempId, verified: true, isPrimary: false };
    setState((prev) => {
      const isPrimary = prev.bankAccounts.length === 0;
      return { ...prev, bankAccounts: [...prev.bankAccounts, { ...newAcc, isPrimary }] };
    });
    // Persist to backend
    walletApi.addBankAccount({
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
    }).catch(() => {});
  }, []);

  const updateTemplate = useCallback((id: string, updates: Partial<StoreTemplate>) => {
    setState((prev) => ({
      ...prev,
      templates: prev.templates.map((t) => t.id === id ? { ...t, ...updates } : t),
    }));
  }, []);

  const updateTemplateSection = useCallback((templateId: string, sectionId: string, updates: Partial<TemplateSection>) => {
    setState((prev) => ({
      ...prev,
      templates: prev.templates.map((t) =>
        t.id === templateId
          ? { ...t, sections: t.sections.map((s) => s.id === sectionId ? { ...s, ...updates } : s) }
          : t
      ),
    }));
  }, []);

  const addTemplateSection = useCallback((templateId: string, section: Omit<TemplateSection, "id">) => {
    const newSection: TemplateSection = { ...section, id: `sec-${genId()}` };
    setState((prev) => ({
      ...prev,
      templates: prev.templates.map((t) =>
        t.id === templateId ? { ...t, sections: [...t.sections, newSection] } : t
      ),
    }));
  }, []);

  const removeTemplateSection = useCallback((templateId: string, sectionId: string) => {
    setState((prev) => ({
      ...prev,
      templates: prev.templates.map((t) =>
        t.id === templateId ? { ...t, sections: t.sections.filter((s) => s.id !== sectionId) } : t
      ),
    }));
  }, []);

  const addSectionComponent = useCallback((templateId: string, sectionId: string, component: Omit<SectionComponent, "id">) => {
    const newComp: SectionComponent = { ...component, id: `comp-${genId()}` };
    setState((prev) => ({
      ...prev,
      templates: prev.templates.map((t) =>
        t.id === templateId
          ? {
              ...t,
              sections: t.sections.map((s) =>
                s.id === sectionId ? { ...s, components: [...(s.components ?? []), newComp] } : s
              ),
            }
          : t
      ),
    }));
  }, []);

  const updateSectionComponent = useCallback((templateId: string, sectionId: string, componentId: string, updates: Partial<SectionComponent>) => {
    setState((prev) => ({
      ...prev,
      templates: prev.templates.map((t) =>
        t.id === templateId
          ? {
              ...t,
              sections: t.sections.map((s) =>
                s.id === sectionId
                  ? { ...s, components: (s.components ?? []).map((c) => c.id === componentId ? { ...c, ...updates } : c) }
                  : s
              ),
            }
          : t
      ),
    }));
  }, []);

  const removeSectionComponent = useCallback((templateId: string, sectionId: string, componentId: string) => {
    setState((prev) => ({
      ...prev,
      templates: prev.templates.map((t) =>
        t.id === templateId
          ? {
              ...t,
              sections: t.sections.map((s) =>
                s.id === sectionId
                  ? { ...s, components: (s.components ?? []).filter((c) => c.id !== componentId) }
                  : s
              ),
            }
          : t
      ),
    }));
  }, []);

  const reorderTemplateSections = useCallback((templateId: string, sectionId: string, direction: "up" | "down", pageId?: string) => {
    setState((prev) => ({
      ...prev,
      templates: prev.templates.map((t) => {
        if (t.id !== templateId) return t;
        if (pageId) {
          return {
            ...t,
            pages: (t.pages ?? []).map((p) => {
              if (p.id !== pageId) return p;
              const idx = p.sections.findIndex((s) => s.id === sectionId);
              if (idx === -1) return p;
              const newSections = [...p.sections];
              const swapIdx = direction === "up" ? idx - 1 : idx + 1;
              if (swapIdx < 0 || swapIdx >= newSections.length) return p;
              [newSections[idx], newSections[swapIdx]] = [newSections[swapIdx], newSections[idx]];
              return { ...p, sections: newSections };
            }),
          };
        } else {
          const idx = t.sections.findIndex((s) => s.id === sectionId);
          if (idx === -1) return t;
          const newSections = [...t.sections];
          const swapIdx = direction === "up" ? idx - 1 : idx + 1;
          if (swapIdx < 0 || swapIdx >= newSections.length) return t;
          [newSections[idx], newSections[swapIdx]] = [newSections[swapIdx], newSections[idx]];
          return { ...t, sections: newSections };
        }
      }),
    }));
  }, []);

  const addTemplatePage = useCallback((templateId: string, name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const newPage: TemplatePage = { id: `page-${genId()}`, name, slug, sections: [] };
    setState((prev) => ({
      ...prev,
      templates: prev.templates.map((t) =>
        t.id === templateId ? { ...t, pages: [...(t.pages ?? []), newPage] } : t
      ),
    }));
  }, []);

  const updateTemplatePage = useCallback((templateId: string, pageId: string, updates: Partial<Omit<TemplatePage, "id">>) => {
    setState((prev) => ({
      ...prev,
      templates: prev.templates.map((t) =>
        t.id === templateId
          ? { ...t, pages: (t.pages ?? []).map((p) => p.id === pageId ? { ...p, ...updates } : p) }
          : t
      ),
    }));
  }, []);

  const deleteTemplatePage = useCallback((templateId: string, pageId: string) => {
    setState((prev) => ({
      ...prev,
      templates: prev.templates.map((t) =>
        t.id === templateId ? { ...t, pages: (t.pages ?? []).filter((p) => p.id !== pageId) } : t
      ),
    }));
  }, []);

  const addTemplateSectionToPage = useCallback((templateId: string, pageId: string, section: Omit<TemplateSection, "id">) => {
    const newSection: TemplateSection = { ...section, id: `sec-${genId()}` };
    setState((prev) => ({
      ...prev,
      templates: prev.templates.map((t) =>
        t.id === templateId
          ? { ...t, pages: (t.pages ?? []).map((p) => p.id === pageId ? { ...p, sections: [...p.sections, newSection] } : p) }
          : t
      ),
    }));
  }, []);

  const updateTemplateSectionInPage = useCallback((templateId: string, pageId: string, sectionId: string, updates: Partial<TemplateSection>) => {
    setState((prev) => ({
      ...prev,
      templates: prev.templates.map((t) =>
        t.id === templateId
          ? { ...t, pages: (t.pages ?? []).map((p) => p.id === pageId ? { ...p, sections: p.sections.map((s) => s.id === sectionId ? { ...s, ...updates } : s) } : p) }
          : t
      ),
    }));
  }, []);

  const removeTemplateSectionFromPage = useCallback((templateId: string, pageId: string, sectionId: string) => {
    setState((prev) => ({
      ...prev,
      templates: prev.templates.map((t) =>
        t.id === templateId
          ? { ...t, pages: (t.pages ?? []).map((p) => p.id === pageId ? { ...p, sections: p.sections.filter((s) => s.id !== sectionId) } : p) }
          : t
      ),
    }));
  }, []);

  const launchTemplate = useCallback((id: string) => {
    setState((prev) => {
      const template = prev.templates.find((t) => t.id === id);
      if (!template) return prev;
      const username = prev.profile?.username ?? "myshop";
      const launchUrl = `https://kiosk.store/@${username}`;
      const waMsg = encodeURIComponent(`Hello, I found your store on Kiosk! I'd love to shop with you.`);
      const whatsappLink = `https://wa.me/?text=${waMsg}`;
      return {
        ...prev,
        templates: prev.templates.map((t) =>
          t.id === id
            ? { ...t, launched: true, launchUrl, whatsappLink }
            : t.launched
            ? { ...t, launched: false, launchUrl: undefined }
            : t
        ),
      };
    });
  }, []);

  const deactivateTemplate = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      templates: prev.templates.map((t) =>
        t.id === id ? { ...t, launched: false, launchUrl: undefined } : t
      ),
    }));
  }, []);

  const createTemplate = useCallback((name: string, kind: StoreTemplate["kind"]) => {
    const DEFAULTS: Record<StoreTemplate["kind"], { accentColor: string; bgColor: string; textColor: string; cardColor: string }> = {
      "shop-boutique": { accentColor: "#1A1C4B", bgColor: "#FAFAFA", textColor: "#1A1C4B", cardColor: "#FFFFFF" },
      "shop-market":   { accentColor: "#0F766E", bgColor: "#F0FDF4", textColor: "#064E3B", cardColor: "#FFFFFF" },
      "website-pro":   { accentColor: "#4338CA", bgColor: "#FFFFFF", textColor: "#1E293B", cardColor: "#F8FAFC" },
    };
    const d = DEFAULTS[kind];
    const newTemplate: StoreTemplate = {
      id: `tmpl-${genId()}`,
      name,
      kind,
      ...d,
      paymentGateways: ["paystack"],
      launched: false,
      sections: [
        { id: `s-${genId()}`, type: "hero", title: "Welcome to " + name, subtitle: "Your tagline here", buttonText: "Shop Now", visible: true },
        { id: `s-${genId()}`, type: "products", title: "Our Products", visible: true },
        { id: `s-${genId()}`, type: "contact", title: "Contact Us", subtitle: "Chat with us on WhatsApp", visible: true },
      ],
    };
    setState((prev) => ({ ...prev, templates: [...prev.templates, newTemplate] }));
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      templates: prev.templates.filter((t) => t.id !== id),
    }));
  }, []);

  const loadOrderItems = useCallback(async (orderId: string) => {
    try {
      const res = await ordersApi.get(orderId);
      const detail = (res as any).data ?? res;
      if (!Array.isArray(detail?.items)) return;
      const items: OrderItem[] = detail.items.map((i: any) => ({
        name: i.productName ?? i.name ?? "Item",
        qty: i.quantity ?? i.qty ?? 1,
        price: parseFloat(i.unitPrice ?? i.price ?? "0"),
      }));
      setState((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => o.id === orderId ? { ...o, items } : o),
      }));
    } catch {
      // keep existing items
    }
  }, []);

  const pingRider = useCallback((riderId: string) => {
    setState((prev) => ({
      ...prev,
      riders: prev.riders.map((r) => r.id === riderId ? { ...r, pinged: true, status: "busy" as const } : r),
    }));
    logisticsApi.pingRider(riderId, "Merchant requesting pickup").catch(() => {});
  }, []);

  const markRiderBooked = useCallback((riderId: string) => {
    setState((prev) => ({
      ...prev,
      riders: prev.riders.map((r) => r.id === riderId ? { ...r, status: "booked" as const, pinged: true } : r),
    }));
  }, []);

  // Auto-deactivate store + mark subscription inactive when expiry date passes
  useEffect(() => {
    const checkExpiry = () => {
      setState((prev) => {
        if (!prev.subscription.active || !prev.subscription.expiryDate) return prev;
        if (new Date(prev.subscription.expiryDate) > new Date()) return prev;
        return {
          ...prev,
          subscription: { ...prev.subscription, active: false },
          templates: prev.templates.map((t) =>
            t.launched ? { ...t, launched: false, launchUrl: undefined } : t
          ),
        };
      });
    };
    checkExpiry();
    const interval = setInterval(checkExpiry, 60_000); // re-check every minute
    return () => clearInterval(interval);
  }, []);

  const activateSubscription = useCallback((plan: PlanType, months?: number) => {
    const startDate = new Date();
    const expiryDate = new Date(startDate);
    if (plan === "3months") expiryDate.setMonth(expiryDate.getMonth() + 3);
    else if (plan === "6months") expiryDate.setMonth(expiryDate.getMonth() + 6);
    else if (plan === "yearly") expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    else if (plan === "custom" && months) expiryDate.setMonth(expiryDate.getMonth() + months);

    setState((prev) => ({
      ...prev,
      subscription: { type: plan, startDate, expiryDate, active: true, months },
    }));
  }, []);

  const cancelSubscription = useCallback(() => {
    setState((prev) => ({ ...prev, subscription: { type: "none", active: false } }));
    subscriptionsApi.cancel().catch(() => {});
  }, []);

  const connectWhatsApp = useCallback((number: string) => {
    setState((prev) => ({ ...prev, whatsappConnected: true, whatsappNumber: number }));
    authApi.updateProfile({ whatsappNumber: number }).catch(() => {});
  }, []);

  const disconnectWhatsApp = useCallback(() => {
    setState((prev) => ({ ...prev, whatsappConnected: false, whatsappNumber: "" }));
    authApi.updateProfile({ whatsappNumber: "" }).catch(() => {});
  }, []);

  const clearDummyData = useCallback(() => {
    setState((prev) => ({
      ...prev,
      chats: [],
      products: [],
      ads: [],
      orders: [],
      activity: [],
      notifications: [],
      referrals: [],
      escrowBalance: 0,
      availableBalance: 0,
      historicalAdSpend: 0,
      isDummyDataCleared: true,
    }));
  }, []);

  const sendWhatsAppMessage = useCallback((to: string, message: string): Promise<void> => {
    const outbound: ChatMessage = {
      id: `local-${genId()}`,
      text: message,
      from: "merchant",
      ts: new Date(),
    };
    setState((prev) => ({
      ...prev,
      rawMessages: {
        ...prev.rawMessages,
        [to]: [...(prev.rawMessages[to] ?? []), outbound],
      },
      chats: prev.chats.map((c: ChatThread) =>
        c.customerPhone === to ? { ...c, lastMessage: message, timestamp: new Date() } : c
      ),
    }));
    return whatsappApi.send(to, message).then(() => {}).catch(() => {});
  }, []);

  const unreadCount = state.notifications.filter((n) => !n.read).length;

  const addNotification = useCallback((notif: Omit<Notification, "id" | "timestamp" | "read">) => {
    setState((prev) => ({
      ...prev,
      notifications: [
        {
          ...notif,
          id: `notif-${genId()}`,
          timestamp: new Date(),
          read: false,
        },
        ...prev.notifications,
      ],
    }));
    if (notif.sound === "money" || (notif.type === "escrow" && notif.sound !== "notify")) {
      playMoney();
    } else {
      playNotify();
    }
  }, [playMoney, playNotify]);

  return (
    <AppContext.Provider
      value={{
        ...state,
        login,
        logout,
        markNotificationRead,
        markAllNotificationsRead,
        addNotification,
        toggleBot,
        toggleProductStock,
        addProduct,
        updateProduct,
        deleteProduct,
        addAd,
        updateAd,
        deleteAd,
        releaseEscrow,
        reverseTransaction,
        sendInvoice,
        withdraw,
        addBankAccount,
        updateTemplate,
        updateTemplateSection,
        addTemplateSection,
        removeTemplateSection,
        addSectionComponent,
        updateSectionComponent,
        removeSectionComponent,
        createTemplate,
        deleteTemplate,
        launchTemplate,
        deactivateTemplate,
        loadOrderItems,
        pingRider,
        markRiderBooked,
        sendWhatsAppMessage,
        updateProfile,
        activateSubscription,
        cancelSubscription,
        connectWhatsApp,
        disconnectWhatsApp,
        clearDummyData,
        openNotifDrawer,
        closeNotifDrawer,
        unreadCount,
        refreshProducts: loadApiData,
        reorderTemplateSections,
        addTemplatePage,
        updateTemplatePage,
        deleteTemplatePage,
        addTemplateSectionToPage,
        updateTemplateSectionInPage,
        removeTemplateSectionFromPage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
