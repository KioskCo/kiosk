import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as DocumentPicker from "expo-document-picker";
import { ResizeMode, Video } from "expo-av";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Dimensions, Easing, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
const NUM_COLS = SCREEN_WIDTH >= 768 ? 4 : 2;

import { formatPrice, getProduct, products } from "@/lib/storefront/products";
import { useApp } from "@/context/AppContext";
import { useStorefront } from "@/lib/storefront";
import type {
  AboutSection,
  AnnouncementSection,
  AuthLoginSection,
  AuthSignupSection,
  BuyerOrdersSection,
  BuyerReferralsSection,
  CheckoutFormSection,
  ColumnItem,
  ColumnsSection,
  ContactFormSection,
  ContactSection,
  CountdownSection,
  CtaBannerSection,
  CustomSection,
  CustomBlock,
  GroupBlock,
  LayoutBoxBlock,
  FaqSection,
  FeaturedProductsSection,
  GallerySection,
  HeroSection,
  ImageTextSection,
  LogoBarSection,
  NewsletterSection,
  PricingPlansSection,
  ProductDetailSection,
  RelatedProductsSection,
  RichTextSection,
  SearchSection,
  SearchBarStyle,
  SearchIconName,
  FilterChipStyle,
  Section,
  SectionBase,
  ShopGridSection,
  SpacerSection,
  StatsSection,
  TeamSection,
  TestimonialsSection,
  TextColumnsSection,
  Theme,
  VideoSection,
  VideoHeroSection,
  SocialFeedSection,
  MapLocationSection,
  SizeGuideSection,
  PortfolioSection,
  WhatsAppCtaSection,
  TrustBadgesSection,
  PaymentMethodsSection,
} from "@/lib/storefront";
import { sectionColors, sectionWrapperStyle } from "./section-utils";

// ─── Per-section element style context ───────────────────────────────────────

const LS_MAP: Record<string, number> = { tight: -0.5, normal: 0, wide: 1, wider: 2 };
const BS_MAP: Record<string, number> = { xs: 12, sm: 14, base: 16, lg: 18, xl: 20 };
const LH_MULT: Record<string, number> = { tight: 1.25, normal: 1.5, relaxed: 1.75, loose: 2 };
const SIZE_MAP: Record<string, { h1: number; h2: number }> = {
  sm: { h1: 24, h2: 18 },
  md: { h1: 32, h2: 22 },
  lg: { h1: 38, h2: 28 },
  xl: { h1: 44, h2: 34 },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ElStyleMap = Record<string, any>;
type ElStyles = {
  heading: ElStyleMap;
  body: ElStyleMap;
  btn: ElStyleMap;
  image: ElStyleMap;
  card: ElStyleMap;
  eyebrow: ElStyleMap;
  subheading: ElStyleMap;
  price: ElStyleMap;
  productCard: ElStyleMap;
  productTitle: ElStyleMap;
  h1Size: number;
  h2Size: number;
};

const EMPTY_EL: ElStyles = {
  heading: {}, body: {}, btn: {}, image: {}, card: {},
  eyebrow: {}, subheading: {}, price: {}, productCard: {}, productTitle: {},
  h1Size: 32, h2Size: 22,
};

const SectionElCtx = createContext<ElStyles>(EMPTY_EL);

// Shared scroll offset from the parent ScrollView — enables scroll-triggered section animations
const _defaultScrollY = new Animated.Value(0);
const SectionScrollCtx = createContext<Animated.Value>(_defaultScrollY);
/** Wrap the preview ScrollView content in this to enable scroll-triggered section entrance animations. */
export const SectionScrollCtxProvider = SectionScrollCtx.Provider;

type ContactSubmitFn = (data: { name: string; email: string; subject?: string; message: string }) => Promise<void>;
const ContactApiCtx = createContext<ContactSubmitFn | null>(null);

// Map design-token font keys to the fonts loaded in _layout.tsx
const HEADING_FONT_MAP: Record<string, { regular: string; bold: string }> = {
  // Serifs
  playfair:  { regular: "PlayfairDisplay_400Regular",  bold: "PlayfairDisplay_700Bold" },
  lora:      { regular: "Lora_400Regular",             bold: "Lora_700Bold" },
  cormorant: { regular: "CormorantGaramond_400Regular", bold: "CormorantGaramond_700Bold" },
  cinzel:    { regular: "Cinzel_400Regular",           bold: "Cinzel_700Bold" },
  // Sans-serifs
  poppins:   { regular: "Poppins_400Regular",          bold: "Poppins_700Bold" },
  raleway:   { regular: "Raleway_400Regular",          bold: "Raleway_700Bold" },
  josefin:   { regular: "JosefinSans_400Regular",      bold: "JosefinSans_700Bold" },
  oswald:    { regular: "Oswald_400Regular",           bold: "Oswald_700Bold" },
  montserrat:{ regular: "Montserrat_400Regular",       bold: "Montserrat_700Bold" },
  // Scripts / calligraphy (no bold — use regular as "bold")
  dancing:   { regular: "DancingScript_400Regular",    bold: "DancingScript_700Bold" },
  greatvibes:{ regular: "GreatVibes_400Regular",       bold: "GreatVibes_400Regular" },
  pacifico:  { regular: "Pacifico_400Regular",         bold: "Pacifico_400Regular" },
  // Display
  abril:     { regular: "AbrilFatface_400Regular",     bold: "AbrilFatface_400Regular" },
  bebas:     { regular: "BebasNeue_400Regular",        bold: "BebasNeue_400Regular" },
  barlow:    { regular: "BarlowCondensed_400Regular",  bold: "BarlowCondensed_700Bold" },
  righteous: { regular: "Righteous_400Regular",        bold: "Righteous_400Regular" },
  lobster:   { regular: "Lobster_400Regular",          bold: "Lobster_400Regular" },
  // Scripts (new)
  satisfy:   { regular: "Satisfy_400Regular",          bold: "Satisfy_400Regular" },
  sacramento:{ regular: "Sacramento_400Regular",       bold: "Sacramento_400Regular" },
  // Sans
  nunito:    { regular: "Nunito_400Regular",           bold: "Nunito_700Bold" },
};
const BODY_FONT_MAP: Record<string, string> = {
  poppins: "Poppins_400Regular",
  raleway: "Raleway_400Regular",
};

function computeElStyles(s: SectionBase, fontHeading?: string, fontBody?: string): ElStyles {
  const el = (s.elStyles ?? {}) as Record<string, Record<string, string | number> | undefined>;
  const bfs = s.bodySize ? BS_MAP[s.bodySize] : 16;
  const sizes = SIZE_MAP[s.fontSize ?? "md"];

  // Resolve heading font family: custom fonts → loaded TTF names; fallbacks to system
  const headingFF = fontHeading
    ? HEADING_FONT_MAP[fontHeading]
      ? HEADING_FONT_MAP[fontHeading].bold      // Use bold weight for headings
      : fontHeading === "serif" ? "serif" : undefined
    : undefined;
  const bodyFF = fontBody && BODY_FONT_MAP[fontBody] ? BODY_FONT_MAP[fontBody] : undefined;

  // When a loaded named font is active (e.g. "PlayfairDisplay_700Bold"), the weight
  // is already baked into the font name. Leaving fontWeight:"700" alongside it causes
  // Android/web to try to synthesize a bold variant on top of the named font and fall
  // back to the system typeface. Setting fontWeight:"normal" here lets the named font
  // render as-is — the 700Bold in the name IS the visual weight.
  const headingFontWeight = headingFF && headingFF !== "serif" ? ("normal" as const) : undefined;

  return {
    heading: {
      ...(headingFF ? { fontFamily: headingFF } : {}),
      // Only apply headingWeight when NOT using a named loaded font — the 700Bold in the
      // font name is already the visual weight; combining it with a non-"normal" fontWeight
      // makes Android synthesize bold on top and fall back to the system face.
      ...(!headingFF || headingFF === "serif" ? (s.headingWeight ? { fontWeight: s.headingWeight } : {}) : { fontWeight: "normal" as const }),
      ...(s.headingLetterSpacing ? { letterSpacing: LS_MAP[s.headingLetterSpacing] } : {}),
      ...(s.textAlign ? { textAlign: s.textAlign } : {}),
      ...(el.heading ?? {}),
    },
    body: {
      ...(bodyFF ? { fontFamily: bodyFF } : {}),
      ...(s.bodySize ? { fontSize: bfs } : {}),
      ...(s.bodyLineHeight ? { lineHeight: bfs * LH_MULT[s.bodyLineHeight] } : {}),
      ...(s.textAlign ? { textAlign: s.textAlign } : {}),
      ...(el.body ?? {}),
    },
    btn: { ...(el.button ?? {}) },
    image: { ...(s.borderRadius !== undefined ? { borderRadius: s.borderRadius } : {}), ...(el.image ?? {}) },
    card: { ...(el.card ?? {}) },
    eyebrow: { ...(s.textAlign ? { textAlign: s.textAlign } : {}), ...(el.eyebrow ?? {}) },
    subheading: { ...(s.textAlign ? { textAlign: s.textAlign } : {}), ...(el.subheading ?? {}) },
    price: { ...(el.price ?? {}) },
    productCard: { ...(s.borderRadius !== undefined ? { borderRadius: s.borderRadius, overflow: "hidden" } : {}), ...(el.productCard ?? {}) },
    productTitle: {
      // Product names in cards inherit the section heading font so they stay on-brand
      ...(headingFF && headingFF !== "serif" ? { fontFamily: headingFF, fontWeight: "normal" as const } : {}),
      ...(el.productTitle ?? {})
    },
    h1Size: sizes.h1,
    h2Size: sizes.h2,
  };
}

// ─── Linear-gradient CSS string → expo-linear-gradient props ─────────────────

function parseLinearGradient(css: string): {
  colors: [string, string, ...string[]];
  start: { x: number; y: number };
  end: { x: number; y: number };
} | null {
  const match = css.match(/linear-gradient\(([^)]+)\)/i);
  if (!match) return null;

  // Split by top-level commas (respects rgba/hsl nested parens)
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of match[1]) {
    if (ch === "(") { depth++; cur += ch; }
    else if (ch === ")") { depth--; cur += ch; }
    else if (ch === "," && depth === 0) { parts.push(cur.trim()); cur = ""; }
    else { cur += ch; }
  }
  if (cur.trim()) parts.push(cur.trim());

  let angleRad = Math.PI; // default 180 deg = top → bottom
  let colorStart = 0;

  if (parts[0]?.includes("deg")) {
    angleRad = (parseFloat(parts[0]) * Math.PI) / 180;
    colorStart = 1;
  } else if (parts[0]?.startsWith("to ")) {
    const dir = parts[0].toLowerCase();
    if (dir === "to top") angleRad = 0;
    else if (dir === "to right") angleRad = Math.PI / 2;
    else if (dir === "to bottom") angleRad = Math.PI;
    else if (dir === "to left") angleRad = (3 * Math.PI) / 2;
    colorStart = 1;
  }

  // Strip position tokens (e.g. "#fff 50%") — keep only the color value
  const colors = parts.slice(colorStart).map((p) => p.trim().split(/\s+/)[0]).filter(Boolean);
  if (colors.length < 2) return null;

  const sin = Math.sin(angleRad);
  const cos = Math.cos(angleRad);
  const clamp = (v: number) => Math.max(0, Math.min(1, v));

  return {
    colors: colors as [string, string, ...string[]],
    start: { x: clamp(0.5 - sin * 0.5), y: clamp(0.5 + cos * 0.5) },
    end:   { x: clamp(0.5 + sin * 0.5), y: clamp(0.5 - cos * 0.5) },
  };
}

// ─── Renderer ────────────────────────────────────────────────────────────────

type CartProduct = { id: string; name: string; price: number; imageUri?: string };
type PreviewCartItem = { id: string; name: string; price: number; qty: number; image?: string };

type Props = {
  section: Section;
  theme?: Theme;
  onLinkPress?: (href: string) => void;
  compact?: boolean;
  previewCart?: PreviewCartItem[];
  onAddToCart?: (product: CartProduct) => void;
  initialCategory?: string;
  /** Slug extracted from the active URL, e.g. "/product/abc" → "abc" */
  activeProductSlug?: string;
  /** Called when a contact form is submitted — parent handles the actual API call */
  onContactSubmit?: ContactSubmitFn;
};

export function SectionRenderer({ section, theme = "light", onLinkPress, compact, previewCart, onAddToCart, activeProductSlug, initialCategory, onContactSubmit }: Props) {
  // Hidden sections are invisible in the live store (editor still shows a placeholder)
  if (section.visible === false && !compact) return null;

  const { style, colors, selfPadded } = sectionWrapperStyle(section, theme);
  const { designTokens } = useStorefront();
  // Section-level headingFont overrides the global design token for that section only
  const resolvedHeadingFont = section.headingFont ?? designTokens?.fontHeading;
  const el = useMemo(() => computeElStyles(section, resolvedHeadingFont, designTokens?.fontBody), [section, resolvedHeadingFont, designTokens?.fontBody]);

  // ── Scroll-triggered entrance animation (bidirectional) ──────────────────────
  const { height: screenH } = useWindowDimensions();
  const scrollY = useContext(SectionScrollCtx);
  const anim = compact ? "none" : (section.animation ?? "none");
  const parallaxEnabled = !compact && (section as any).parallax === true;
  const animValue = useRef(new Animated.Value(anim === "none" ? 1 : 0)).current;
  const isVisible = useRef(anim === "none");
  const sectionLayoutY = useRef(0);
  const sectionHeight = useRef(200);
  // Track measured layout Y as state so parallaxTY recalculates after onLayout fires.
  // Null means "not yet measured" — parallax is inactive until we have a real position.
  const [measuredY, setMeasuredY] = useState<number | null>(null);

  useEffect(() => {
    if (anim === "none" && !parallaxEnabled) return;

    const update = (offset: number) => {
      const sTop = sectionLayoutY.current;
      const sBot = sTop + sectionHeight.current;
      // Section is "in view" when it overlaps the visible window [offset, offset+screenH]
      const inView = offset + screenH > sTop + 60 && offset < sBot;

      if (anim !== "none") {
        if (inView && !isVisible.current) {
          isVisible.current = true;
          Animated.timing(animValue, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
        } else if (!inView && isVisible.current && offset < sTop) {
          // Scrolled back UP past the section — reset so it reveals again on next scroll-down
          isVisible.current = false;
          animValue.setValue(0);
        }
      }
    };

    update(0);
    const id = scrollY.addListener(({ value }) => update(value));
    return () => scrollY.removeListener(id);
  }, [screenH, anim, parallaxEnabled]);

  const animStyle = useMemo(() => {
    if (anim === "none") return {};
    const ty = animValue.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });
    const tx = animValue.interpolate({ inputRange: [0, 1], outputRange: [anim === "slideLeft" ? 44 : -44, 0] });
    const sc = animValue.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
    if (anim === "fadeIn")    return { opacity: animValue };
    if (anim === "slideUp")   return { opacity: animValue, transform: [{ translateY: ty }] };
    if (anim === "slideLeft") return { opacity: animValue, transform: [{ translateX: tx }] };
    if (anim === "slideRight")return { opacity: animValue, transform: [{ translateX: tx }] };
    if (anim === "zoomIn")    return { opacity: animValue, transform: [{ scale: sc }] };
    return { opacity: animValue };
  }, [anim]);

  // Hero sections get image-only parallax (passed as prop to HeroBlock).
  // Non-hero sections get a subtle section-level shift (depth ∝ height so short
  // sections like announcement bars barely move, tall sections get ~6% depth).
  // inputRange starts at max(0,…) so translateY=0 at scroll=0 — no initial snap.
  const heroParallaxTY = useMemo(() => {
    if (!parallaxEnabled || section.type !== "hero" || measuredY === null) return null;
    const heroH =
      (section as any).height === "sm" ? 260 :
      (section as any).height === "lg" ? 480 :
      (section as any).height === "full" ? 640 : 360;
    return scrollY.interpolate({
      inputRange: [Math.max(0, measuredY - screenH), Math.max(1, measuredY + heroH)],
      outputRange: [0, 40],
      extrapolate: "clamp",
    });
  }, [parallaxEnabled, section, measuredY, screenH]);

  const sectionParallaxTY = useMemo(() => {
    if (!parallaxEnabled || section.type === "hero" || measuredY === null) return null;
    const depth = Math.min(40, Math.round(sectionHeight.current * 0.06));
    return scrollY.interpolate({
      inputRange: [Math.max(0, measuredY - screenH), Math.max(1, measuredY + sectionHeight.current)],
      outputRange: [0, depth],
      extrapolate: "clamp",
    });
  }, [parallaxEnabled, section.type, measuredY, screenH]);
  // ─────────────────────────────────────────────────────────────────────────────

  const wrap = (children: React.ReactNode) => {
    // In editor mode (compact=true), disable all touches so buttons/links don't fire
    const editOverlay = compact ? (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-only" />
    ) : null;

    // bgGradient — strip backgroundColor from the style so LinearGradient provides it
    if (section.bgGradient) {
      const grad = parseLinearGradient(section.bgGradient);
      if (grad) {
        const { backgroundColor: _bg, ...gradStyle } = style as Record<string, unknown>;
        return (
          <LinearGradient
            colors={grad.colors}
            style={gradStyle as object}
            start={grad.start}
            end={grad.end}
          >
            {children}
          </LinearGradient>
        );
      }
    }

    // bgImage — absolute Image behind content with optional dark overlay
    if (section.bgImage) {
      const overlayAlpha = 1 - (section.bgOpacity ?? 1);
      return (
        <View style={[style as object, { overflow: "hidden" }]}>
          <Image source={{ uri: section.bgImage }} style={StyleSheet.absoluteFill} contentFit="cover" />
          {overlayAlpha > 0 && (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${overlayAlpha.toFixed(2)})` }]} />
          )}
          {children}
          {editOverlay}
        </View>
      );
    }

    return <View style={style as object}>{children}{editOverlay}</View>;
  };

  const inner = (() => {
    switch (section.type) {
      case "announcement":
        return <AnnouncementBlock s={section} />;
      case "hero":
        return <HeroBlock s={section} theme={theme} compact={compact} onLinkPress={onLinkPress} imageParallaxTY={heroParallaxTY} />;
      case "columns":
        return wrap(<ColumnsBlock s={section} colors={colors} onLinkPress={onLinkPress} />);
      case "featured-products":
        return wrap(<FeaturedBlock s={section} colors={colors} onLinkPress={onLinkPress} onAddToCart={onAddToCart} />);
      case "image-text":
        return wrap(<ImageTextBlock s={section} colors={colors} onLinkPress={onLinkPress} />);
      case "rich-text":
        return wrap(<RichTextBlock s={section} colors={colors} />);
      case "gallery":
        return wrap(<GalleryBlock s={section} colors={colors} />);
      case "collection-list":
        return wrap(<CollectionBlock s={section} colors={colors} onLinkPress={onLinkPress} />);
      case "newsletter":
        return wrap(<NewsletterBlock s={section} colors={colors} />);
      case "cta-banner":
        return wrap(<CtaBlock s={section} colors={colors} onLinkPress={onLinkPress} />);
      case "text-columns":
        return wrap(<TextColumnsBlock s={section} colors={colors} />);
      case "testimonials":
        return wrap(<TestimonialsBlock s={section} colors={colors} />);
      case "faq":
        return wrap(<FaqBlock s={section} colors={colors} />);
      case "video":
        return wrap(<VideoBlock s={section} colors={colors} />);
      case "spacer":
        return <SpacerBlock s={section} />;
      case "shop-grid":
        return wrap(<ShopGridBlock s={section} colors={colors} onAddToCart={onAddToCart} onLinkPress={onLinkPress} initialCategory={initialCategory} />);
      case "logo-bar":
        return wrap(<LogoBarBlock s={section} colors={colors} />);
      case "related-products":
        return wrap(<RelatedProductsBlock s={section} colors={colors} onLinkPress={onLinkPress} onAddToCart={onAddToCart} activeSourceSlug={activeProductSlug} />);
      case "search":
        return wrap(<SearchBlock s={section} colors={colors} onLinkPress={onLinkPress} onAddToCart={onAddToCart} />);
      case "product-detail":
        return <ProductDetailBlock s={section} theme={theme} compact={compact} selfPadded={selfPadded} activeProductSlug={activeProductSlug} onAddToCart={onAddToCart} />;
      case "checkout-form":
        return wrap(<CheckoutFormBlock s={section} colors={colors} cart={previewCart} />);
      case "contact-form":
        return wrap(<ContactFormBlock s={section} colors={colors} />);
      case "pricing-plans":
        return wrap(<PricingPlansBlock s={section} colors={colors} onLinkPress={onLinkPress} />);
      case "countdown":
        return wrap(<CountdownBlock s={section} colors={colors} onLinkPress={onLinkPress} />);
      case "stats":
        return wrap(<StatsBlock s={section} colors={colors} />);
      case "team":
        return wrap(<TeamBlock s={section} colors={colors} />);
      case "auth-login":
        return <AuthLoginBlock s={section} colors={colors} onLinkPress={onLinkPress} />;
      case "auth-signup":
        return <AuthSignupBlock s={section} colors={colors} onLinkPress={onLinkPress} />;
      case "buyer-orders":
        return wrap(<BuyerOrdersBlock s={section} colors={colors} />);
      case "buyer-referrals":
        return wrap(<BuyerReferralsBlock s={section} colors={colors} />);
      case "about":
        return wrap(<AboutBlock s={section} colors={colors} onLinkPress={onLinkPress} />);
      case "contact":
        return wrap(<ContactBlock s={section} colors={colors} />);
      case "video-hero":
        return wrap(<VideoHeroBlock s={section as VideoHeroSection} colors={colors} onLinkPress={onLinkPress} />);
      case "social-feed":
        return wrap(<SocialFeedBlock s={section as SocialFeedSection} colors={colors} onLinkPress={onLinkPress} />);
      case "map-location":
        return wrap(<MapLocationBlock s={section as MapLocationSection} colors={colors} onLinkPress={onLinkPress} />);
      case "size-guide":
        return wrap(<SizeGuideBlock s={section as SizeGuideSection} colors={colors} />);
      case "portfolio":
        return wrap(<PortfolioBlock s={section as PortfolioSection} colors={colors} onLinkPress={onLinkPress} />);
      case "reviews":
        return wrap(<ReviewsBlock s={section as any} colors={colors} />);
      case "lookbook":
        return wrap(<LookbookBlock s={section as any} colors={colors} onLinkPress={onLinkPress} />);
      case "timeline":
        return wrap(<TimelineBlock s={section as any} colors={colors} />);
      case "before-after":
        return wrap(<BeforeAfterBlock s={section as any} colors={colors} />);
      case "bundle-offer":
        return wrap(<BundleOfferBlock s={section as any} colors={colors} onLinkPress={onLinkPress} />);
      case "whatsapp-cta":
        return wrap(<WhatsAppCtaBlock s={section as any} colors={colors} />);
      case "trust-badges":
        return wrap(<TrustBadgesBlock s={section as any} colors={colors} />);
      case "payment-methods":
        return wrap(<PaymentMethodsBlock s={section as any} colors={colors} />);
      case "custom":
        return wrap(
          <CustomSectionBlock
            s={section as CustomSection}
            colors={colors}
            onAction={(action) => runBlockAction(action, onLinkPress)}
          />,
        );
      default:
        return wrap(
          <Text style={{ color: colors.color, fontSize: 13, textAlign: "center", paddingVertical: 24 }}>
            {(section as Section).type} section
          </Text>,
        );
    }
  })();

  const onSectionLayout = (e: any) => {
    const y = e.nativeEvent.layout.y;
    const h = e.nativeEvent.layout.height;
    sectionLayoutY.current = y;
    sectionHeight.current = h;
    // Trigger parallaxTY recomputation with the real position on first measurement.
    setMeasuredY((prev) => (prev === null ? y : prev));
  };

  const needsWrapper = anim !== "none" || parallaxEnabled;
  const wrapperStyle = [
    anim !== "none" ? animStyle : {},
    sectionParallaxTY ? { transform: [{ translateY: sectionParallaxTY }] } : {},
  ];

  return (
    <SectionElCtx.Provider value={el}>
      <ContactApiCtx.Provider value={onContactSubmit ?? null}>
        {needsWrapper
          ? <Animated.View style={wrapperStyle} onLayout={onSectionLayout}>{inner}</Animated.View>
          : inner
        }
      </ContactApiCtx.Provider>
    </SectionElCtx.Provider>
  );
}

// ─── Blocks ───────────────────────────────────────────────────────────────────

function AnnouncementBlock({ s }: { s: AnnouncementSection }) {
  return (
    <View style={{ backgroundColor: s.bgColor ?? "#171717", paddingVertical: 10, paddingHorizontal: 16 }}>
      <Text style={{ color: s.textColor ?? "#fff", fontSize: 12, textAlign: "center" }}>{s.text}</Text>
    </View>
  );
}

function heroAlignStyle(align: string): { justifyContent: "flex-start" | "center" | "flex-end"; alignItems: "flex-start" | "center" | "flex-end" } {
  const parts = align?.split("-") ?? ["bottom", "left"];
  const jc = parts[0] === "top" ? "flex-start" : parts[0] === "bottom" ? "flex-end" : "center";
  const ai = parts[1] === "left" ? "flex-start" : parts[1] === "right" ? "flex-end" : "center";
  return { justifyContent: jc, alignItems: ai };
}

function HeroCta({ label, link, btnStyle, dark, accent, el, icon, onLinkPress }: {
  label: string; link?: string; btnStyle?: string; dark: boolean; accent: string;
  el: any; icon?: { name: string; lib?: string; pos?: "left" | "right"; size?: number };
  onLinkPress?: (href: string) => void;
}) {
  const style = btnStyle ?? "solid";
  const iconPos = icon?.pos ?? "right";
  const iconSize = icon?.size ?? 14;
  const iconEl = icon ? (
    <Ionicons name={icon.name as any} size={iconSize} color="inherit" />
  ) : null;

  const btnEl = el.btn as any;
  if (style === "outline") {
    const c = (btnEl?.color as string) || (dark ? "#fff" : accent);
    const bc = (btnEl?.borderColor as string) || c;
    return (
      <TouchableOpacity onPress={() => link && onLinkPress?.(link)}
        style={[styles.btn, { backgroundColor: "transparent", borderWidth: 1.5, borderColor: bc, flexDirection: "row", alignItems: "center", gap: 4 }, el.btn as object]}>
        {iconEl && iconPos === "left" && <Ionicons name={icon!.name as any} size={iconSize} color={c} />}
        <Text style={[styles.btnText, { color: c }]}>{label}</Text>
        {iconEl && iconPos === "right" && <Ionicons name={icon!.name as any} size={iconSize} color={c} />}
      </TouchableOpacity>
    );
  }
  if (style === "ghost") {
    const c = (btnEl?.color as string) || (dark ? "#fff" : accent);
    return (
      <TouchableOpacity onPress={() => link && onLinkPress?.(link)} style={[{ paddingVertical: 10, paddingHorizontal: 4, flexDirection: "row", alignItems: "center", gap: 4 }, el.btn as object]}>
        {iconEl && iconPos === "left" && <Ionicons name={icon!.name as any} size={iconSize} color={c} />}
        <Text style={[styles.btnText, { color: c, textDecorationLine: "underline" }]}>{label}</Text>
        {iconEl && iconPos === "right" && <Ionicons name={icon!.name as any} size={iconSize} color={c} />}
      </TouchableOpacity>
    );
  }
  // solid (default)
  const bg = (btnEl?.backgroundColor as string) || (dark ? "#fff" : accent);
  const fg = (btnEl?.color as string) || (dark ? "#111" : "#fff");
  return (
    <TouchableOpacity onPress={() => link && onLinkPress?.(link)}
      style={[styles.btn, { backgroundColor: bg, flexDirection: "row", alignItems: "center", gap: 4 }, el.btn as object]}>
      {iconEl && iconPos === "left" && <Ionicons name={icon!.name as any} size={iconSize} color={fg} />}
      <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
      {iconEl && iconPos === "right" && <Ionicons name={icon!.name as any} size={iconSize} color={fg} />}
    </TouchableOpacity>
  );
}

function InlineCta({ label, link, accent, el, icon, textColor, onLinkPress }: {
  label: string; link?: string; accent: string; el: any; textColor?: string;
  icon?: { name: string; pos?: "left" | "right"; size?: number };
  onLinkPress?: (href: string) => void;
}) {
  const iconPos = icon?.pos ?? "right";
  const color = textColor ?? accent;
  return (
    <TouchableOpacity onPress={() => link && onLinkPress?.(link)}
      style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      {icon && iconPos === "left" && <Ionicons name={icon.name as any} size={icon.size ?? 14} color={color} />}
      <Text style={[{ color, fontWeight: "700" }, el.btn as object]}>{label}</Text>
      {icon
        ? (iconPos === "right" ? <Ionicons name={icon.name as any} size={icon.size ?? 14} color={color} /> : null)
        : <Text style={{ color, fontWeight: "700" }}> →</Text>}
    </TouchableOpacity>
  );
}

function HeroBlock({
  s,
  theme,
  compact,
  onLinkPress,
  imageParallaxTY,
}: {
  s: HeroSection;
  theme: Theme;
  compact?: boolean;
  onLinkPress?: (href: string) => void;
  imageParallaxTY?: Animated.AnimatedInterpolation<number> | null;
}) {
  const variant = (() => {
    const v = s.variant ?? "overlay";
    if (v === "split") return "split-right"; // backward compat
    if (v === "minimal" || v === "centered") return "overlay"; // backward compat
    return v;
  })();

  const h = compact ? 200 : s.height === "sm" ? 260 : s.height === "lg" ? 480 : s.height === "full" ? 640 : 360;
  const colors = sectionColors(s, theme);
  const el = useContext(SectionElCtx);
  const { width: carouselW } = useWindowDimensions();
  const [carouselPage, setCarouselPage] = useState(0);
  const carouselRef = useRef<ScrollView | null>(null);
  const overlayOpacity = ((s.overlayOpacity ?? 40) / 100);
  const overlayColor = s.overlayColor ?? "#000000";
  const alignStyle = heroAlignStyle(s.align ?? "bottom-left");

  const textContent = (dark: boolean) => (
    <View style={{ gap: 6 }}>
      {s.eyebrow ? <Text style={[{ fontSize: 11, color: dark ? "#ddd" : "#888", marginBottom: 2 }, el.eyebrow as object]}>{s.eyebrow}</Text> : null}
      <Text style={[{ fontSize: compact ? 22 : (el.h1Size as number), fontWeight: "700", color: dark ? "#fff" : colors.headingColor, lineHeight: compact ? 28 : undefined }, el.heading as object]}>
        {s.heading}
      </Text>
      {s.body ? <Text style={[{ color: dark ? "#eee" : "#555", lineHeight: 20, marginTop: 4 }, el.body as object]}>{s.body}</Text> : null}
      {(s.ctaLabel || s.ctaLabel2) ? (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {s.ctaLabel ? <HeroCta label={s.ctaLabel} link={s.ctaLink} btnStyle={s.ctaStyle} dark={dark} accent={colors.accent} el={el} icon={s.elIcons?.button as any} onLinkPress={onLinkPress} /> : null}
          {s.ctaLabel2 ? <HeroCta label={s.ctaLabel2} link={s.ctaLink2} btnStyle={s.ctaStyle2 ?? "outline"} dark={dark} accent={colors.accent} el={el} icon={s.elIcons?.button as any} onLinkPress={onLinkPress} /> : null}
        </View>
      ) : null}
    </View>
  );

  // ── OVERLAY / FULLSCREEN ─────────────────────────────────────────────────────
  if (variant === "overlay" || variant === "fullscreen") {
    const height = variant === "fullscreen" ? (compact ? 200 : 640) : h;
    // Image is made 80px taller (40px each side) so it always fills the section
    // even when shifted by the parallax. overflow:hidden clips the excess cleanly.
    const extraH = imageParallaxTY && !compact ? 40 : 0;
    return (
      <View style={{ height, overflow: "hidden" }}>
        {s.image ? (
          <Animated.View style={[
            { position: "absolute", top: -extraH, left: 0, right: 0, height: height + extraH * 2 },
            imageParallaxTY && !compact ? { transform: [{ translateY: imageParallaxTY }] } : null,
          ]}>
            <Image source={{ uri: s.image }} style={[{ width: "100%", height: "100%" }, el.image as object]} contentFit="cover" />
          </Animated.View>
        ) : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor, opacity: overlayOpacity }]} />
        <View style={{ flex: 1, ...alignStyle, padding: 20 }}>
          {textContent(true)}
        </View>
      </View>
    );
  }

  // ── SPLIT RIGHT / SPLIT LEFT ─────────────────────────────────────────────────
  if (variant === "split-right" || variant === "split-left") {
    const imageOnLeft = variant === "split-left";
    const textPanel = (
      <View style={{ flex: 1, padding: compact ? 16 : 28, justifyContent: "center", backgroundColor: s.textBg ?? colors.backgroundColor }}>
        {textContent(false)}
      </View>
    );
    const imagePanel = s.image
      ? <Image source={{ uri: s.image }} style={[{ flex: 1, minHeight: h }, el.image as object]} contentFit="cover" />
      : <View style={{ flex: 1, minHeight: h, backgroundColor: (colors.backgroundColor ?? "#f0f0f0") + "80" }} />;
    return (
      <View style={{ flexDirection: compact ? "column" : "row", minHeight: h }}>
        {imageOnLeft ? imagePanel : textPanel}
        {imageOnLeft ? textPanel : imagePanel}
      </View>
    );
  }

  // ── STACKED (image top, text below) ─────────────────────────────────────────
  if (variant === "stacked") {
    return (
      <View>
        {s.image ? <Image source={{ uri: s.image }} style={[{ width: "100%", height: Math.round(h * 0.6) }, el.image as object]} contentFit="cover" /> : null}
        <View style={{ padding: compact ? 16 : 28, backgroundColor: s.textBg ?? colors.backgroundColor }}>
          {textContent(false)}
        </View>
      </View>
    );
  }

  // ── TEXT-ONLY ────────────────────────────────────────────────────────────────
  if (variant === "text-only") {
    return (
      <View style={{ height: h, backgroundColor: s.textBg ?? colors.backgroundColor, ...alignStyle, padding: 24 }}>
        {textContent(false)}
      </View>
    );
  }

  // ── BOXED-RIGHT / BOXED-LEFT ────────────────────────────────────────────────
  if (variant === "boxed-right" || variant === "boxed-left") {
    const imageOnLeft = variant === "boxed-left";
    const boxed = s.imageBoxed !== false; // default true
    const imgSize = compact ? 100 : 150;

    const imageEl = s.image ? (
      <View style={[
        { width: imgSize, flexShrink: 0, borderRadius: boxed ? 14 : 0, overflow: "hidden" },
        boxed && {
          shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.14, shadowRadius: 10, elevation: 5,
        },
      ]}>
        <Image
          source={{ uri: s.image }}
          style={[{ width: imgSize, aspectRatio: 3 / 4 }, el.image as object]}
          contentFit="cover"
          contentPosition="center"
        />
      </View>
    ) : null;

    return (
      <View style={{
        flexDirection: "row", alignItems: "center", gap: compact ? 14 : 24,
        padding: compact ? 16 : 28,
        backgroundColor: s.textBg ?? colors.backgroundColor,
        minHeight: h,
      }}>
        {imageOnLeft ? imageEl : null}
        <View style={{ flex: 1 }}>{textContent(false)}</View>
        {!imageOnLeft ? imageEl : null}
      </View>
    );
  }

  // ── GLASS ────────────────────────────────────────────────────────────────────
  if (variant === "glass") {
    const extraH = imageParallaxTY && !compact ? 40 : 0;
    return (
      <View style={{ height: h, overflow: "hidden" }}>
        {s.image ? (
          <Animated.View style={[
            { position: "absolute", top: -extraH, left: 0, right: 0, height: h + extraH * 2 },
            imageParallaxTY && !compact ? { transform: [{ translateY: imageParallaxTY }] } : null,
          ]}>
            <Image source={{ uri: s.image }} style={[{ width: "100%", height: "100%" }, el.image as object]} contentFit="cover" />
          </Animated.View>
        ) : <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.backgroundColor ?? "#1a1a2e" }]} />}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor, opacity: Math.max(overlayOpacity, 0.2) }]} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{ backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", borderRadius: 24, padding: compact ? 16 : 28, maxWidth: 340 }}>
            {textContent(true)}
          </View>
        </View>
      </View>
    );
  }

  // ── DIAGONAL ─────────────────────────────────────────────────────────────────
  if (variant === "diagonal") {
    return (
      <View style={{ flexDirection: compact ? "column" : "row", minHeight: h }}>
        <View style={{ flex: compact ? undefined : 5, height: compact ? h * 0.5 : undefined, backgroundColor: s.bgColor ?? colors.accent ?? "#111", justifyContent: "center", padding: compact ? 16 : 32 }}>
          {textContent(false)}
        </View>
        <View style={{ flex: compact ? undefined : 4, height: compact ? h * 0.5 : undefined }}>
          {s.image ? <Image source={{ uri: s.image }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : <View style={{ flex: 1, backgroundColor: "#e0e0e0" }} />}
        </View>
      </View>
    );
  }

  // ── DUO ──────────────────────────────────────────────────────────────────────
  if (variant === "duo") {
    const imgs: string[] = s.image ? [s.image] : [];
    if ((s as any).image2) imgs.push((s as any).image2);
    return (
      <View>
        <View style={{ flexDirection: "row", height: Math.round(h * 0.65) }}>
          {imgs[0] ? <Image source={{ uri: imgs[0] }} style={{ flex: 1 }} contentFit="cover" /> : <View style={{ flex: 1, backgroundColor: "#ddd" }} />}
          {imgs[1] ? <Image source={{ uri: imgs[1] }} style={{ flex: 1 }} contentFit="cover" /> : <View style={{ flex: 1, backgroundColor: "#bbb" }} />}
        </View>
        <View style={{ padding: compact ? 16 : 28, backgroundColor: s.textBg ?? colors.backgroundColor }}>
          {textContent(false)}
        </View>
      </View>
    );
  }

  // ── BOLD ─────────────────────────────────────────────────────────────────────
  if (variant === "bold") {
    const boldBg = s.bgColor ?? colors.accent ?? "#111";
    return (
      <View style={{ minHeight: h, backgroundColor: boldBg, justifyContent: "flex-end", padding: compact ? 16 : 32 }}>
        {s.image ? <Image source={{ uri: s.image }} style={[StyleSheet.absoluteFill, { opacity: 0.15 }]} contentFit="cover" /> : null}
        <View style={{ gap: 8 }}>
          {s.eyebrow ? <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", letterSpacing: 2, textTransform: "uppercase" }}>{s.eyebrow}</Text> : null}
          <Text style={[{ fontSize: compact ? 26 : 42, fontWeight: "900", color: "#fff", lineHeight: compact ? 30 : 46, letterSpacing: -1 }, el.heading as object]}>{s.heading}</Text>
          {(s.ctaLabel || s.ctaLabel2) ? (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {s.ctaLabel ? <HeroCta label={s.ctaLabel} link={s.ctaLink} btnStyle={s.ctaStyle} dark accent={colors.accent} el={el} icon={s.elIcons?.button as any} onLinkPress={onLinkPress} /> : null}
              {s.ctaLabel2 ? <HeroCta label={s.ctaLabel2} link={s.ctaLink2} btnStyle="outline" dark accent={colors.accent} el={el} icon={s.elIcons?.button as any} onLinkPress={onLinkPress} /> : null}
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  // ── REVEAL ───────────────────────────────────────────────────────────────────
  if (variant === "reveal") {
    return (
      <View style={{ flexDirection: compact ? "column" : "row", minHeight: h }}>
        <View style={{ flex: compact ? undefined : 4, padding: compact ? 16 : 32, justifyContent: "center", backgroundColor: s.textBg ?? colors.backgroundColor, borderLeftWidth: 4, borderLeftColor: colors.accent ?? "#111" }}>
          {textContent(false)}
        </View>
        <View style={{ flex: compact ? undefined : 6, height: compact ? Math.round(h * 0.55) : undefined }}>
          {s.image ? <Image source={{ uri: s.image }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : <View style={{ flex: 1, backgroundColor: "#e0e0e0" }} />}
        </View>
      </View>
    );
  }

  // ── CAROUSEL ────────────────────────────────────────────────────────────────
  if (variant === "carousel") {
    const winW = carouselW;
    const height = compact ? 240 : s.height === "sm" ? 300 : s.height === "full" ? 640 : 420;
    const slides = (s.slides && s.slides.length
      ? s.slides
      : [{ eyebrow: s.eyebrow, heading: s.heading, body: s.body, image: s.image, ctaLabel: s.ctaLabel, ctaLink: s.ctaLink }]
    ).filter(Boolean);
    const showArrows = s.showCarouselArrows !== false;
    const scrollToPage = (page: number) =>
      carouselRef.current?.scrollTo({ x: page * winW, animated: true });
    return (
      <View>
        <View style={{ height, position: "relative" }}>
          <ScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setCarouselPage(Math.round(e.nativeEvent.contentOffset.x / (winW || 1)))}
          >
            {slides.map((slide, i) => (
              <View key={i} style={{ width: winW, height, overflow: "hidden" }}>
                {slide.image
                  ? <Image source={{ uri: slide.image }} style={[{ width: "100%", height: "100%" }, el.image as object]} contentFit="cover" />
                  : <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.backgroundColor }]} />}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor, opacity: overlayOpacity }]} />
                <View style={{ flex: 1, justifyContent: "flex-end", padding: 20 }}>
                  {slide.eyebrow ? <Text style={[{ fontSize: 11, color: "#ddd", marginBottom: 2 }, el.eyebrow as object]}>{slide.eyebrow}</Text> : null}
                  <Text style={[{ fontSize: compact ? 22 : (el.h1Size as number), fontWeight: "700", color: "#fff", lineHeight: compact ? 28 : undefined }, el.heading as object]}>
                    {slide.heading}
                  </Text>
                  {slide.body ? <Text style={[{ color: "#eee", lineHeight: 20, marginTop: 4 }, el.body as object]}>{slide.body}</Text> : null}
                  {slide.ctaLabel ? (
                    <View style={{ marginTop: 10 }}>
                      <HeroCta label={slide.ctaLabel} link={slide.ctaLink} btnStyle={s.ctaStyle} dark accent={colors.accent} el={el} icon={s.elIcons?.button as any} onLinkPress={onLinkPress} />
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </ScrollView>
          {showArrows && slides.length > 1 && (
            <>
              <TouchableOpacity
                onPress={() => scrollToPage(Math.max(0, carouselPage - 1))}
                style={{ position: "absolute", left: 12, top: "50%", marginTop: -18, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" }}
              >
                <Feather name="chevron-left" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => scrollToPage(Math.min(slides.length - 1, carouselPage + 1))}
                style={{ position: "absolute", right: 12, top: "50%", marginTop: -18, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" }}
              >
                <Feather name="chevron-right" size={20} color="#fff" />
              </TouchableOpacity>
            </>
          )}
        </View>
        {slides.length > 1 && (
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: 8, backgroundColor: colors.backgroundColor }}>
            {slides.map((_, i) => (
              <View key={i} style={{ width: i === carouselPage ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i === carouselPage ? colors.accent : "#cccccc55" }} />
            ))}
          </View>
        )}
      </View>
    );
  }

  // fallback — overlay
  return (
    <View style={{ height: h }}>
      {s.image ? <Image source={{ uri: s.image }} style={[StyleSheet.absoluteFill, el.image as object]} contentFit="cover" /> : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${overlayOpacity})` }]} />
      <View style={{ flex: 1, ...alignStyle, padding: 20 }}>
        {textContent(true)}
      </View>
    </View>
  );
}

type CartBtnConfig = {
  style?: string;   // "plus" | "cart" | "text" | "plus-text" | "cart-text"
  bg?: string;
  color?: string;
  label?: string;
};

function CartBtn({ cfg, accent, onPress }: { cfg: CartBtnConfig; accent: string; onPress?: () => void }) {
  const el = useContext(SectionElCtx);
  const btnEl = el.btn ?? {};
  const bg = (btnEl.backgroundColor as string) || cfg.bg || accent;
  const fg = (btnEl.color as string) || cfg.color || "#fff";
  const style = cfg.style ?? "plus";
  const label = cfg.label || "Add to cart";
  const br = btnEl.borderRadius != null ? Number(btnEl.borderRadius) : 6;
  const fontSize = btnEl.fontSize != null ? Number(btnEl.fontSize) : 12;

  const iconEl = style === "cart" || style === "cart-text"
    ? <Ionicons name="bag-add-outline" size={14} color={fg} />
    : style === "plus" || style === "plus-text"
    ? <Ionicons name="add" size={14} color={fg} />
    : null;

  const textEl = (style === "text" || style === "plus-text" || style === "cart-text")
    ? <Text style={{ color: fg, fontSize, fontWeight: String(btnEl.fontWeight ?? "700") as any }}>{label}</Text>
    : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        marginTop: 6,
        backgroundColor: bg,
        borderRadius: br,
        paddingVertical: btnEl.paddingVertical != null ? Number(btnEl.paddingVertical) : 7,
        paddingHorizontal: btnEl.paddingHorizontal != null ? Number(btnEl.paddingHorizontal) : 10,
        ...(btnEl.borderColor ? { borderWidth: 1.5, borderColor: String(btnEl.borderColor) } : {}),
      }}
    >
      {iconEl}
      {textEl}
    </TouchableOpacity>
  );
}

function ProductThumb({
  slug,
  colors,
  onAddToCart,
  onPress,
  cartBtnCfg,
  cartBtnLayout,
  cardVariant = "classic",
}: {
  slug: string;
  colors: ReturnType<typeof sectionColors>;
  onAddToCart?: (p: { id: string; name: string; price: number; imageUri?: string }) => void;
  onPress?: () => void;
  cartBtnCfg?: CartBtnConfig;
  cartBtnLayout?: string;
  cardVariant?: string;
}) {
  const el = useContext(SectionElCtx);
  const { products: inventory } = useApp();

  const mock = getProduct(slug);
  const inv = mock ? null : inventory.find((p) => p.id === slug);

  if (inv && inv.inStock === false) return null;

  const name = mock?.name ?? inv?.name;
  const image = mock?.image ?? inv?.imageUri ?? (inv as any)?.images?.[0] ?? null;
  const price = mock ? mock.price : inv ? inv.price : 0;

  if (!name) return null;

  const cartPressHandler = onAddToCart ? () => onAddToCart({ id: slug, name, price, imageUri: image ?? undefined }) : undefined;
  const cfg = cartBtnCfg ?? { style: "plus" as const };

  const ImageBlock = ({ ratio, borderRadius = 0 }: { ratio: number; borderRadius?: number }) =>
    image ? (
      <Image source={{ uri: image }} style={[{ width: "100%", aspectRatio: ratio, borderRadius }, el.image as object]} contentFit="cover" contentPosition="center" transition={200} />
    ) : (
      <View style={[{ width: "100%", aspectRatio: ratio, borderRadius, backgroundColor: "#f0eeeb", alignItems: "center", justifyContent: "center" }, el.image as object]}>
        <Feather name="image" size={28} color="#bbb" />
      </View>
    );

  // ── OVERLAY — image fills card, gradient + text inside ────────────────────
  if (cardVariant === "overlay") {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[{ overflow: "hidden", borderRadius: 8 }, el.productCard as object]}>
        {image ? (
          <Image source={{ uri: image }} style={{ width: "100%", aspectRatio: 3 / 4 }} contentFit="cover" />
        ) : (
          <View style={{ width: "100%", aspectRatio: 3 / 4, backgroundColor: "#f0eeeb" }} />
        )}
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 10, paddingTop: 28 }}>
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, top: 0, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 0 }} />
          <View style={{ position: "relative" }}>
            <Text style={[{ fontWeight: "700", color: "#fff", fontSize: 12 }, el.productTitle as object]} numberOfLines={2}>{name}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
              <Text style={[{ fontSize: 12, fontWeight: "700", color: "#fff" }, el.price as object]}>{formatPrice(price)}</Text>
              <CartBtn cfg={cfg} accent="#fff" onPress={cartPressHandler} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ── HORIZONTAL — image left square, info right ────────────────────────────
  if (cardVariant === "horizontal") {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[{ flexDirection: "row", gap: 10, alignItems: "center" }, el.productCard as object]}>
        {image ? (
          <Image source={{ uri: image }} style={[{ width: 80, height: 80, borderRadius: 8 }, el.image as object]} contentFit="cover" />
        ) : (
          <View style={[{ width: 80, height: 80, borderRadius: 8, backgroundColor: "#f0eeeb", alignItems: "center", justifyContent: "center" }, el.image as object]}>
            <Feather name="image" size={20} color="#bbb" />
          </View>
        )}
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[{ fontWeight: "600", color: colors.headingColor, fontSize: 13 }, el.productTitle as object]} numberOfLines={2}>{name}</Text>
          <Text style={[{ fontSize: 13, fontWeight: "700", color: colors.accent }, el.price as object]}>{formatPrice(price)}</Text>
          <CartBtn cfg={cfg} accent={colors.accent} onPress={cartPressHandler} />
        </View>
      </TouchableOpacity>
    );
  }

  // ── MINIMAL — clean image + name + price, no cart button displayed ─────────
  if (cardVariant === "minimal") {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[el.productCard as object]}>
        <ImageBlock ratio={3 / 4} />
        <View style={{ paddingTop: 6, gap: 2 }}>
          <Text style={[{ fontWeight: "500", color: colors.headingColor, fontSize: 12 }, el.productTitle as object]} numberOfLines={1}>{name}</Text>
          <Text style={[{ fontSize: 12, color: colors.accent }, el.price as object]}>{formatPrice(price)}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // ── EDITORIAL — landscape image, bold name inside gradient footer ──────────
  if (cardVariant === "editorial") {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[{ overflow: "hidden", borderRadius: 8, position: "relative" }, el.productCard as object]}>
        {image ? (
          <Image source={{ uri: image }} style={{ width: "100%", aspectRatio: 4 / 3 }} contentFit="cover" />
        ) : (
          <View style={{ width: "100%", aspectRatio: 4 / 3, backgroundColor: "#1a1a1a" }} />
        )}
        {/* Smooth gradient overlay — transparent at top → dark at bottom */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.18)", "rgba(0,0,0,0.75)"]}
          locations={[0, 0.45, 1]}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, top: 0 }}
          pointerEvents="none"
        />
        {/* Text content */}
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 10 }}>
          <Text style={[{ color: "#fff", fontSize: 13, letterSpacing: -0.2 }, el.productTitle as object]} numberOfLines={2}>{name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 3 }}>
            <Text style={[{ fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.85)" }, el.price as object]}>{formatPrice(price)}</Text>
            <CartBtn cfg={cfg} accent="#fff" onPress={cartPressHandler} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ── CHIP — compact square card ─────────────────────────────────────────────
  if (cardVariant === "chip") {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[el.productCard as object]}>
        <ImageBlock ratio={1} borderRadius={6} />
        <View style={{ paddingTop: 4, gap: 1 }}>
          <Text style={[{ fontWeight: "600", color: colors.headingColor, fontSize: 10 }, el.productTitle as object]} numberOfLines={1}>{name}</Text>
          <Text style={[{ fontSize: 10, fontWeight: "700", color: colors.accent }, el.price as object]}>{formatPrice(price)}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // ── BORDERED — classic with card border ───────────────────────────────────
  if (cardVariant === "bordered") {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[{ borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 8, overflow: "hidden" }, el.productCard as object]}>
        <ImageBlock ratio={3 / 4} />
        <View style={{ padding: 10, gap: 4 }}>
          <Text style={[{ fontWeight: "600", color: colors.headingColor, fontSize: 12 }, el.productTitle as object]} numberOfLines={2}>{name}</Text>
          <Text style={[{ fontSize: 13, fontWeight: "700", color: colors.accent }, el.price as object]}>{formatPrice(price)}</Text>
          <CartBtn cfg={cfg} accent={colors.accent} onPress={cartPressHandler} />
        </View>
      </TouchableOpacity>
    );
  }

  // ── FLOATING — image + raised card-style text block below ─────────────────
  if (cardVariant === "floating") {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[{ paddingBottom: 4 }, el.productCard as object]}>
        <ImageBlock ratio={3 / 4} borderRadius={8} />
        <View style={{ marginHorizontal: 6, marginTop: -12, borderRadius: 8, backgroundColor: "#fff", padding: 8, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3, gap: 3 }}>
          <Text style={[{ fontWeight: "600", color: colors.headingColor, fontSize: 12 }, el.productTitle as object]} numberOfLines={2}>{name}</Text>
          <Text style={[{ fontSize: 12, fontWeight: "700", color: colors.accent }, el.price as object]}>{formatPrice(price)}</Text>
          <CartBtn cfg={cfg} accent={colors.accent} onPress={cartPressHandler} />
        </View>
      </TouchableOpacity>
    );
  }

  // ── COMPACT — vertical card, name+price left + icon cart button right ────────
  if (cardVariant === "compact") {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[el.productCard as object]}>
        <ImageBlock ratio={1} borderRadius={6} />
        <View style={{ paddingTop: 6, paddingHorizontal: 2, flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={[{ fontWeight: "600", color: colors.headingColor, fontSize: 11 }, el.productTitle as object]} numberOfLines={1}>{name}</Text>
            <Text style={[{ fontSize: 11, fontWeight: "700", color: colors.accent }, el.price as object]}>{formatPrice(price)}</Text>
          </View>
          <CartBtn cfg={cfg} accent={colors.accent} onPress={cartPressHandler} />
        </View>
      </TouchableOpacity>
    );
  }

  // ── CLASSIC (default) — image top, right layout toggle ────────────────────
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[el.productCard as object]}>
      <ImageBlock ratio={3 / 4} />
      {cartBtnLayout === "right" ? (
        <View style={{ padding: 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[{ fontWeight: "600", color: colors.headingColor, fontSize: 12 }, el.productTitle as object]} numberOfLines={1}>{name}</Text>
            <Text style={[{ fontSize: 12, fontWeight: "700", color: colors.accent }, el.price as object]}>{formatPrice(price)}</Text>
          </View>
          <CartBtn cfg={cfg} accent={colors.accent} onPress={cartPressHandler} />
        </View>
      ) : (
        <View style={{ padding: 10, gap: 2 }}>
          <Text style={[{ fontWeight: "600", color: colors.headingColor, fontSize: 13 }, el.productTitle as object]} numberOfLines={2}>{name}</Text>
          <Text style={[{ fontSize: 13, fontWeight: "700", color: colors.accent }, el.price as object]}>{formatPrice(price)}</Text>
          <CartBtn cfg={cfg} accent={colors.accent} onPress={cartPressHandler} />
        </View>
      )}
    </TouchableOpacity>
  );
}

function FeaturedBlock({
  s,
  colors,
  onLinkPress,
  onAddToCart,
}: {
  s: FeaturedProductsSection;
  colors: ReturnType<typeof sectionColors>;
  onLinkPress?: (href: string) => void;
  onAddToCart?: (p: { id: string; name: string; price: number; imageUri?: string }) => void;
}) {
  const el = useContext(SectionElCtx);
  const { products: inventory } = useApp();
  const { width: winWidth } = useWindowDimensions();
  const cols = winWidth >= 768 ? 4 : 2;
  const variant = s.variant ?? "grid";

  const inventorySorted = [...inventory.filter((p) => p.inStock !== false)]
    .sort((a, b) => {
      const ta = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
      const tb = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
      return tb - ta;
    });

  const slugs = (s.sourceMode === "inventory"
    ? inventorySorted.slice(0, 8).map((p) => p.id)
    : s.productSlugs.slice(0, 8));

  const cartCfg: CartBtnConfig = { style: s.cartBtnStyle, bg: s.cartBtnBg, color: s.cartBtnColor, label: s.cartBtnLabel };
  const cardVariant = s.cardVariant ?? "classic";

  const heading = (s.heading || s.subheading) ? (
    <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
      {s.heading ? (
        <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor }, el.heading as object]}>
          {s.heading}
        </Text>
      ) : null}
      {s.subheading ? (
        <Text style={[{ color: "#888", marginTop: 4, fontSize: 13 }, el.subheading as object]}>
          {s.subheading}
        </Text>
      ) : null}
    </View>
  ) : null;

  if (slugs.length === 0) {
    return (
      <View>
        {heading}
        <View style={{ padding: 20, alignItems: "center" }}>
          <Text style={{ color: "#aaa", fontSize: 13 }}>No products yet — add some in Inventory</Text>
        </View>
      </View>
    );
  }

  // CAROUSEL: horizontal scroll of fixed-width cards
  if (variant === "carousel") {
    return (
      <View>
        {heading}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 12 }}>
          {slugs.map((slug) => (
            <View key={slug} style={{ width: cardVariant === "chip" ? 110 : 180 }}>
              <ProductThumb
                slug={slug}
                colors={colors}
                onAddToCart={onAddToCart}
                onPress={() => onLinkPress?.(s.productLink?.replace(":slug", slug) ?? `/product/${slug}`)}
                cartBtnCfg={cartCfg}
                cartBtnLayout={(s as any).cartBtnLayout}
                cardVariant={cardVariant}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // LIST: full-width rows with image on left, info on right
  if (variant === "list") {
    return (
      <View>
        {heading}
        <View style={{ paddingHorizontal: 8 }}>
          {slugs.map((slug) => {
            const mock = getProduct(slug);
            const inv = mock ? null : inventory.find((p) => p.id === slug);
            const name = mock?.name ?? inv?.name;
            const image = mock?.image ?? inv?.imageUri ?? (inv as any)?.images?.[0] ?? null;
            const price = mock ? mock.price : inv ? inv.price : 0;
            if (!name) return null;
            return (
              <TouchableOpacity
                key={slug}
                onPress={() => onLinkPress?.(s.productLink?.replace(":slug", slug) ?? `/product/${slug}`)}
                activeOpacity={0.85}
                style={[{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f0f0f0" }, el.productCard as object]}
              >
                {image ? (
                  <Image source={{ uri: image }} style={[{ width: 76, height: 76, borderRadius: 8 }, el.image as object]} contentFit="cover" />
                ) : (
                  <View style={[{ width: 76, height: 76, borderRadius: 8, backgroundColor: "#f0eeeb", alignItems: "center", justifyContent: "center" }, el.image as object]}>
                    <Feather name="image" size={20} color="#bbb" />
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[{ fontWeight: "600", color: colors.headingColor, fontSize: 14 }, el.productTitle as object]} numberOfLines={2}>{name}</Text>
                  <Text style={[{ fontSize: 14, fontWeight: "700", color: colors.accent }, el.price as object]}>{formatPrice(price)}</Text>
                </View>
                <CartBtn cfg={cartCfg} accent={colors.accent} onPress={onAddToCart ? () => onAddToCart({ id: slug, name, price, imageUri: image ?? undefined }) : undefined} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  // GRID (default): 2-column wrapping grid
  // Horizontal card variant stacks full-width, others use column grid
  if (cardVariant === "horizontal") {
    return (
      <View>
        {heading}
        <View style={{ paddingHorizontal: 8, gap: 8 }}>
          {slugs.map((slug) => (
            <ProductThumb
              key={slug}
              slug={slug}
              colors={colors}
              onAddToCart={onAddToCart}
              onPress={() => onLinkPress?.(s.productLink?.replace(":slug", slug) ?? `/product/${slug}`)}
              cartBtnCfg={cartCfg}
              cardVariant="horizontal"
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View>
      {heading}
      <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 8 }}>
        {slugs.map((slug) => (
          <View key={slug} style={{ width: `${100 / cols}%` as any, padding: 5 }}>
            <ProductThumb
              slug={slug}
              colors={colors}
              onAddToCart={onAddToCart}
              onPress={() => onLinkPress?.(s.productLink?.replace(":slug", slug) ?? `/product/${slug}`)}
              cartBtnCfg={cartCfg}
              cartBtnLayout={(s as any).cartBtnLayout}
              cardVariant={cardVariant}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function ImageTextBlock({
  s,
  colors,
  onLinkPress,
}: {
  s: ImageTextSection;
  colors: ReturnType<typeof sectionColors>;
  onLinkPress?: (href: string) => void;
}) {
  const el = useContext(SectionElCtx);
  const variant = s.variant ?? "stacked";

  const textContent = (
    <View style={{ gap: 10 }}>
      <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor }, el.heading as object]}>{s.heading}</Text>
      <Text style={[{ color: "#666", lineHeight: 22 }, el.body as object]}>{s.body}</Text>
      {s.ctaLabel ? (
        <InlineCta label={s.ctaLabel} link={s.ctaLink} accent={colors.accent} el={el} icon={s.elIcons?.button as any} onLinkPress={onLinkPress} />
      ) : null}
    </View>
  );

  // SIDE-BY-SIDE: image (40%) + text (60%) in a horizontal row
  if (variant === "side-by-side") {
    const imgLeft = s.imageSide !== "right";
    return (
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
        {imgLeft && s.image ? (
          <Image source={{ uri: s.image }} style={[{ flex: 0.4, aspectRatio: 3 / 4 }, el.image as object]} contentFit="cover" />
        ) : imgLeft ? <View style={{ flex: 0.4 }} /> : null}
        <View style={{ flex: 0.6 }}>{textContent}</View>
        {!imgLeft && s.image ? (
          <Image source={{ uri: s.image }} style={[{ flex: 0.4, aspectRatio: 3 / 4 }, el.image as object]} contentFit="cover" />
        ) : !imgLeft ? <View style={{ flex: 0.4 }} /> : null}
      </View>
    );
  }

  // OFFSET: full-width image with a floating card overlapping its bottom edge
  if (variant === "offset") {
    const imgLeft = s.imageSide !== "right";
    const { width: screenW } = useWindowDimensions();
    return (
      <View>
        {s.image ? (
          <Image
            source={{ uri: s.image }}
            style={[{ width: "100%", aspectRatio: 16 / 10, borderRadius: 12 }, el.image as object]}
            contentFit="cover"
          />
        ) : null}
        {/* Card lifts up over the bottom of the image */}
        <View style={{
          marginTop: s.image ? -44 : 0,
          marginHorizontal: 16,
          alignSelf: imgLeft ? "flex-end" : "flex-start",
          width: screenW * 0.7,
          backgroundColor: colors.backgroundColor,
          borderRadius: 14,
          padding: 18,
          shadowColor: "#000",
          shadowOpacity: 0.14,
          shadowRadius: 18,
          elevation: 6,
          gap: 10,
        }}>
          {textContent}
        </View>
      </View>
    );
  }

  // STACKED (default): image above or below based on imageSide
  const imgFirst = s.imageSide === "left";
  return (
    <View style={{ gap: 16 }}>
      {imgFirst && s.image ? (
        <Image source={{ uri: s.image }} style={[{ width: "100%", aspectRatio: 4 / 3 }, el.image as object]} contentFit="cover" />
      ) : null}
      {textContent}
      {!imgFirst && s.image ? (
        <Image source={{ uri: s.image }} style={[{ width: "100%", aspectRatio: 4 / 3 }, el.image as object]} contentFit="cover" />
      ) : null}
    </View>
  );
}

function RichTextBlock({ s, colors }: { s: RichTextSection; colors: ReturnType<typeof sectionColors> }) {
  const el = useContext(SectionElCtx);
  const variant = (s as any).variant ?? "paragraph";
  const align = s.align ?? "left";
  const alignStyle = { textAlign: align as any };
  const selfAlign = align === "center" ? "center" as const : align === "right" ? "flex-end" as const : "flex-start" as const;

  // QUOTE: large pull-quote with accent left border
  if (variant === "quote") {
    return (
      <View style={{ flexDirection: "row", gap: 14 }}>
        <View style={{ width: 4, borderRadius: 2, backgroundColor: colors.accent, minHeight: 48 }} />
        <View style={{ flex: 1 }}>
          <Text style={[{ fontSize: 20, fontStyle: "italic", lineHeight: 30, color: colors.headingColor, fontWeight: "600" }, el.body as object]}>
            "{s.body}"
          </Text>
          {s.heading ? (
            <Text style={[{ marginTop: 10, fontSize: 13, color: "#888", fontWeight: "500" }, el.heading as object]}>
              — {s.heading}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  // CARD: content in a bordered card box
  if (variant === "card") {
    return (
      <View style={[styles.card, { borderColor: "#e5e5e5", backgroundColor: "#fafafa" }, el.card as object]}>
        {s.heading ? (
          <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor, marginBottom: 10 }, alignStyle, el.heading as object]}>{s.heading}</Text>
        ) : null}
        <Text style={[{ color: "#555", lineHeight: 24, fontSize: 15 }, alignStyle, el.body as object]}>{s.body}</Text>
      </View>
    );
  }

  // ARTICLE: drop-cap first letter, generous line height
  if (variant === "article") {
    const firstChar = s.body?.[0] ?? "";
    const rest = s.body?.slice(1) ?? "";
    return (
      <View style={{ alignItems: selfAlign }}>
        {s.heading ? (
          <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor, marginBottom: 16 }, alignStyle, el.heading as object]}>{s.heading}</Text>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          <Text style={[{ fontSize: 52, fontWeight: "900", lineHeight: 52, color: colors.accent, float: "left" as any, marginRight: 4, marginBottom: -4 }, el.heading as object]}>{firstChar}</Text>
          <Text style={[{ fontSize: 16, lineHeight: 28, color: "#444", flex: 1 }, el.body as object]}>{rest}</Text>
        </View>
      </View>
    );
  }

  // PARAGRAPH (default)
  return (
    <View style={{ alignItems: selfAlign }}>
      {s.heading ? (
        <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor, marginBottom: 10 }, alignStyle, el.heading as object]}>{s.heading}</Text>
      ) : null}
      <Text style={[{ color: "#555", lineHeight: 26, fontSize: 15 }, alignStyle, el.body as object]}>{s.body}</Text>
    </View>
  );
}

function GalleryBlock({ s, colors }: { s: GallerySection; colors: ReturnType<typeof sectionColors> }) {
  const el = useContext(SectionElCtx);
  const { width: winWidth } = useWindowDimensions();
  const cols = s.columns ?? (NUM_COLS >= 4 ? 3 : 2);
  const variant = s.variant ?? "grid";

  // Section wrapper adds paddingHorizontal (default 16 each side)
  const padH: number = (s as any).paddingXPx ?? 16;
  const availW = winWidth - padH * 2;

  const GRID_GAP = 2;
  // Exact pixel size avoids percentage + gap overflow in React Native
  const gridItemSize = Math.floor((availW - GRID_GAP * (cols - 1)) / cols);
  // Minimal is edge-to-edge so uses full winWidth
  const minimalItemSize = Math.floor(winWidth / cols);

  const heading = s.heading ? (
    <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor, marginBottom: 12, paddingHorizontal: padH }, el.heading as object]}>
      {s.heading}
    </Text>
  ) : null;

  // minimal: true edge-to-edge — break out of section padding with negative margins
  if (variant === "minimal") {
    return (
      <View style={{ marginHorizontal: -padH }}>
        {heading && <View style={{ paddingHorizontal: padH }}>{heading}</View>}
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {s.images.map((src, i) => (
            <Image key={i} source={{ uri: src }} style={[{ width: minimalItemSize, height: minimalItemSize }, el.image as object]} contentFit="cover" />
          ))}
        </View>
      </View>
    );
  }

  // featured: first image full-width, rest in exact-pixel grid
  if (variant === "featured" && s.images.length > 0) {
    const [first, ...rest] = s.images;
    return (
      <View style={{ gap: 3 }}>
        {heading}
        <Image source={{ uri: first }} style={[{ width: availW, aspectRatio: 16 / 9 }, el.image as object]} contentFit="cover" />
        {rest.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP }}>
            {rest.map((src, i) => (
              <Image key={i} source={{ uri: src }} style={[{ width: gridItemSize, height: gridItemSize }, el.image as object]} contentFit="cover" />
            ))}
          </View>
        )}
      </View>
    );
  }

  // masonry: two flex columns, alternating aspect ratios — flex: 1 works fine
  if (variant === "masonry") {
    return (
      <View>
        {heading}
        <View style={{ flexDirection: "row", gap: 3 }}>
          <View style={{ flex: 1, gap: 3 }}>
            {s.images.filter((_, i) => i % 2 === 0).map((src, i) => (
              <Image key={i} source={{ uri: src }} style={[{ width: "100%", aspectRatio: i % 3 === 0 ? 0.75 : 1.2 }, el.image as object]} contentFit="cover" />
            ))}
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            {s.images.filter((_, i) => i % 2 === 1).map((src, i) => (
              <Image key={i} source={{ uri: src }} style={[{ width: "100%", aspectRatio: i % 3 === 0 ? 1.2 : 0.75 }, el.image as object]} contentFit="cover" />
            ))}
          </View>
        </View>
      </View>
    );
  }

  // grid (default) — exact pixel sizes, no overflow
  return (
    <View>
      {heading}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP }}>
        {s.images.map((src, i) => (
          <Image key={i} source={{ uri: src }} style={[{ width: gridItemSize, height: gridItemSize }, el.image as object]} contentFit="cover" />
        ))}
      </View>
    </View>
  );
}

function CollectionBlock({ s, colors, onLinkPress }: { s: import("@/lib/storefront").CollectionListSection; colors: ReturnType<typeof sectionColors>; onLinkPress?: (href: string) => void }) {
  const el = useContext(SectionElCtx);
  const { products: inventory } = useApp();
  const imgRadius = s.borderRadius !== undefined ? s.borderRadius : 10;
  const variant = s.variant ?? "scroller";

  const items = s.useLiveCategories
    ? Array.from(new Set(inventory.map((p) => p.category).filter(Boolean))).map((cat) => {
        const match = inventory.find((p) => p.category === cat && p.imageUri);
        return { label: cat as string, image: match?.imageUri ?? "", link: `/shop?category=${encodeURIComponent(cat as string)}` };
      })
    : s.items;

  const sectionHeading = (
    <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor, marginBottom: 12 }, el.heading as object]}>
      {s.heading}
    </Text>
  );

  // GRID: 2-column grid layout
  if (variant === "grid") {
    return (
      <View>
        {sectionHeading}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {items.map((it, i) => (
            <TouchableOpacity key={i} style={[{ width: "47%" }, el.card as object]} onPress={() => onLinkPress?.(it.link)} activeOpacity={0.75}>
              <View style={{ width: "100%", aspectRatio: 1, borderRadius: imgRadius, overflow: "hidden" }}>
                <Image source={{ uri: it.image }} style={[{ width: "100%", height: "100%" }, el.image as object]} contentFit="cover" />
              </View>
              <Text style={[{ marginTop: 6, fontSize: 13, fontWeight: "500", textAlign: "center", color: colors.color ?? "#333" }, el.productTitle as object]}>{it.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // SCROLLER (default): horizontal scroll
  return (
    <View>
      {sectionHeading}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 2 }}>
        {items.map((it, i) => (
          <TouchableOpacity key={i} style={[{ width: 130 }, el.card as object]} onPress={() => onLinkPress?.(it.link)} activeOpacity={0.75}>
            <View style={{ width: 130, height: 130, borderRadius: imgRadius, overflow: "hidden" }}>
              <Image source={{ uri: it.image }} style={[{ width: 130, height: 130 }, el.image as object]} contentFit="cover" />
            </View>
            <Text style={[{ marginTop: 6, fontSize: 13, fontWeight: "500", textAlign: "center", color: colors.color ?? "#333" }, el.productTitle as object]}>{it.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function NewsletterBlock({ s, colors }: { s: NewsletterSection; colors: ReturnType<typeof sectionColors> }) {
  const el = useContext(SectionElCtx);
  return (
    <View style={{ alignItems: "center", paddingHorizontal: 20 }}>
      <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor, textAlign: "center" }, el.heading as object]}>
        {s.heading}
      </Text>
      {s.body ? (
        <Text style={[{ marginTop: 6, color: "#666", textAlign: "center", lineHeight: 20 }, el.body as object]}>{s.body}</Text>
      ) : null}
      <View style={[styles.inputRow, { marginTop: 16, width: "100%" }]}>
        <TextInput placeholder="Your email address" placeholderTextColor="#999" style={[styles.input, { flex: 1 }]} keyboardType="email-address" autoCapitalize="none" />
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent, flexShrink: 0 }, el.btn as object]}>
          <Text style={[styles.btnText, { color: (el.btn as any)?.color ?? "#fff" }]}>{s.buttonLabel ?? "Subscribe"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CtaBlock({
  s,
  colors,
  onLinkPress,
}: {
  s: CtaBannerSection;
  colors: ReturnType<typeof sectionColors>;
  onLinkPress?: (href: string) => void;
}) {
  const el = useContext(SectionElCtx);

  if (s.variant === "split" && s.image) {
    return (
      <View style={{ flexDirection: "row", minHeight: 200 }}>
        <View style={{ flex: 1, justifyContent: "center", padding: 20, gap: 8 }}>
          <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor }, el.heading as object]}>{s.heading}</Text>
          {s.body ? <Text style={[{ color: "#666", lineHeight: 20 }, el.body as object]}>{s.body}</Text> : null}
          <TouchableOpacity onPress={() => onLinkPress?.(s.ctaLink)} style={[styles.btn, { backgroundColor: colors.accent, alignSelf: "flex-start", marginTop: 6, flexDirection: "row", alignItems: "center", gap: 4 }, el.btn as object]}>
            {s.elIcons?.button?.pos === "left" && <Ionicons name={s.elIcons.button.name as any} size={s.elIcons.button.size ?? 14} color={(el.btn as any)?.color ?? "#fff"} />}
            <Text style={[styles.btnText, { color: (el.btn as any)?.color ?? "#fff" }]}>{s.ctaLabel}</Text>
            {s.elIcons?.button && s.elIcons.button.pos !== "left" && <Ionicons name={s.elIcons.button.name as any} size={s.elIcons.button.size ?? 14} color={(el.btn as any)?.color ?? "#fff"} />}
          </TouchableOpacity>
        </View>
        <Image source={{ uri: s.image }} style={[{ flex: 1, minHeight: 200 }, el.image as object]} contentFit="cover" />
      </View>
    );
  }

  return (
    <View style={{ alignItems: "center", paddingVertical: 8 }}>
      <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor, textAlign: "center" }, el.heading as object]}>
        {s.heading}
      </Text>
      {s.body ? (
        <Text style={[{ marginTop: 6, color: "#666", textAlign: "center" }, el.body as object]}>{s.body}</Text>
      ) : null}
      <TouchableOpacity
        onPress={() => onLinkPress?.(s.ctaLink)}
        style={[styles.btn, { backgroundColor: colors.accent, marginTop: 14, flexDirection: "row", alignItems: "center", gap: 4 }, el.btn as object]}
      >
        {s.elIcons?.button?.pos === "left" && <Ionicons name={s.elIcons.button.name as any} size={s.elIcons.button.size ?? 14} color={(el.btn as any)?.color ?? "#fff"} />}
        <Text style={[styles.btnText, { color: (el.btn as any)?.color ?? "#fff" }]}>{s.ctaLabel}</Text>
        {s.elIcons?.button && s.elIcons.button.pos !== "left" && <Ionicons name={s.elIcons.button.name as any} size={s.elIcons.button.size ?? 14} color={(el.btn as any)?.color ?? "#fff"} />}
      </TouchableOpacity>
    </View>
  );
}

function TextColumnsBlock({ s, colors }: { s: TextColumnsSection; colors: ReturnType<typeof sectionColors> }) {
  const el = useContext(SectionElCtx);
  const variant = s.variant ?? "minimal";

  const heading = s.heading ? (
    <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor, marginBottom: 12 }, el.heading as object]}>
      {s.heading}
    </Text>
  ) : null;

  // CARDS: each column in a bordered card, side by side
  if (variant === "cards") {
    return (
      <View>
        {heading}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {s.columns.map((c, i) => (
            <View key={i} style={[styles.card, { flex: 1, minWidth: 140, borderColor: "#e5e5e5", gap: 6 }, el.card as object]}>
              {c.icon ? (
                <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.accent + "18", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
                  <Feather name={c.icon as any} size={18} color={colors.accent} />
                </View>
              ) : null}
              <Text style={[{ fontWeight: "700", color: colors.headingColor, fontSize: 15 }, el.heading as object]}>{c.title}</Text>
              <Text style={[{ color: "#666", lineHeight: 20, fontSize: 13 }, el.body as object]}>{c.body}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // ICONS: numbered circles (or icon) + title + body as a vertical list
  if (variant === "icons") {
    return (
      <View>
        {heading}
        {s.columns.map((c, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 12, marginBottom: 16, alignItems: "flex-start" }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {c.icon ? (
                <Feather name={c.icon as any} size={18} color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>{i + 1}</Text>
              )}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[{ fontWeight: "700", color: colors.headingColor, fontSize: 15 }, el.heading as object]}>{c.title}</Text>
              <Text style={[{ color: "#666", lineHeight: 20, fontSize: 13 }, el.body as object]}>{c.body}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  // MINIMAL (default): simple vertical list
  return (
    <View>
      {heading}
      {s.columns.map((c, i) => (
        <View key={i} style={[{ marginBottom: 14 }, el.card as object]}>
          <Text style={[{ fontWeight: "600", color: colors.headingColor }, el.heading as object]}>{c.title}</Text>
          <Text style={[{ marginTop: 4, color: "#666", lineHeight: 20 }, el.body as object]}>{c.body}</Text>
        </View>
      ))}
    </View>
  );
}

function TestimonialsBlock({ s, colors }: { s: TestimonialsSection; colors: ReturnType<typeof sectionColors> }) {
  const el = useContext(SectionElCtx);
  const variant = s.variant ?? "cards";

  const heading = s.heading ? (
    <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor, marginBottom: 16 }, el.heading as object]}>{s.heading}</Text>
  ) : null;

  if (variant === "quotes") {
    return (
      <View>
        {heading}
        {s.items.map((it, i) => (
          <View key={i} style={{ marginBottom: 24, paddingLeft: 16, borderLeftWidth: 3, borderLeftColor: colors.accent }}>
            <Text style={[{ fontSize: 16, fontStyle: "italic", color: colors.headingColor, lineHeight: 26 }, el.body as object]}>"{it.quote}"</Text>
            <Text style={[{ marginTop: 10, fontWeight: "700", fontSize: 13, color: colors.headingColor }, el.heading as object]}>— {it.author}</Text>
            {it.role ? <Text style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{it.role}</Text> : null}
          </View>
        ))}
      </View>
    );
  }

  if (variant === "grid") {
    return (
      <View>
        {heading}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {s.items.map((it, i) => (
            <View key={i} style={[styles.card, { flex: 1, minWidth: 140, borderColor: "#e5e5e5", gap: 6 }, el.card as object]}>
              <Text style={[{ fontStyle: "italic", color: "#444", fontSize: 13, lineHeight: 20 }, el.body as object]}>"{it.quote}"</Text>
              <Text style={[{ fontWeight: "600", fontSize: 12, color: colors.headingColor }, el.heading as object]}>{it.author}</Text>
              {it.role ? <Text style={{ fontSize: 11, color: "#888" }}>{it.role}</Text> : null}
            </View>
          ))}
        </View>
      </View>
    );
  }

  // default: cards
  return (
    <View>
      {heading}
      {s.items.map((it, i) => (
        <View key={i} style={[styles.card, { marginBottom: 10, borderColor: "#e5e5e5" }, el.card as object]}>
          <Text style={[{ fontStyle: "italic", color: "#444", lineHeight: 20 }, el.body as object]}>"{it.quote}"</Text>
          <Text style={[{ marginTop: 8, fontWeight: "600", color: colors.headingColor }, el.heading as object]}>{it.author}</Text>
          {it.role ? <Text style={{ fontSize: 12, color: "#888" }}>{it.role}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function FaqBlock({ s, colors }: { s: FaqSection; colors: ReturnType<typeof sectionColors> }) {
  const [open, setOpen] = useState<number | null>(0);
  const el = useContext(SectionElCtx);
  return (
    <View>
      <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor, marginBottom: 12 }, el.heading as object]}>
        {s.heading}
      </Text>
      {s.items.map((it, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => setOpen(open === i ? null : i)}
          style={[styles.card, { marginBottom: 8, borderColor: "#e5e5e5" }, el.card as object]}
        >
          <Text style={[{ fontWeight: "600", color: colors.headingColor }, el.heading as object]}>{it.question}</Text>
          {open === i ? (
            <Text style={[{ marginTop: 8, color: "#666", lineHeight: 20 }, el.body as object]}>{it.answer}</Text>
          ) : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function VideoBlock({ s, colors }: { s: VideoSection; colors: ReturnType<typeof sectionColors> }) {
  const el = useContext(SectionElCtx);
  return (
    <View>
      {s.heading ? (
        <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor, marginBottom: 8 }, el.heading as object]}>
          {s.heading}
        </Text>
      ) : null}
      <View style={{ height: 180, backgroundColor: "#111", borderRadius: 8, alignItems: "center", justifyContent: "center" }}>
        <Feather name="play-circle" size={40} color="#666" />
        <Text style={{ color: "#888", fontSize: 11, marginTop: 6 }} numberOfLines={1}>{s.url}</Text>
      </View>
    </View>
  );
}

function SpacerBlock({ s }: { s: SpacerSection }) {
  const h = s.size === "sm" ? 16 : s.size === "lg" ? 48 : s.size === "xl" ? 64 : 32;
  return <View style={{ height: h }} />;
}

// ─── Shared search-bar + filter-chip helpers (used by SearchBlock & ShopGridBlock) ──

type SearchBarCfg = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  barStyle?: SearchBarStyle;
  barBg?: string;
  barBorderColor?: string;
  barTextColor?: string;
  iconName?: SearchIconName;
  accent: string;
  textColor: string;
  height?: number;
  marginH?: number;
  marginB?: number;
};

function SearchBarInput({ value, onChangeText, placeholder, barStyle = "pill", barBg, barBorderColor, barTextColor, iconName = "search", accent, textColor, height = 48, marginH = 0, marginB = 12 }: SearchBarCfg) {
  const radius = barStyle === "pill" ? 100 : barStyle === "sharp" ? 6 : 0;
  const isUnderline = barStyle === "underline";
  const bg = barBg ?? "transparent";
  const border = barBorderColor ?? (isUnderline ? "transparent" : accent + "40");
  const txtColor = barTextColor ?? textColor;

  const renderIcon = () => {
    if (iconName === "none") return null;
    if (iconName === "sliders") return <Feather name="sliders" size={16} color={accent} style={{ marginRight: 8 }} />;
    if (iconName === "sparkles") return <MaterialCommunityIcons name="star-four-points-outline" size={16} color={accent} style={{ marginRight: 8 }} />;
    return <Feather name="search" size={16} color={accent} style={{ marginRight: 8 }} />;
  };

  return (
    <View style={{
      flexDirection: "row", alignItems: "center",
      marginHorizontal: marginH, marginBottom: marginB,
      height, paddingHorizontal: isUnderline ? 0 : 14,
      borderRadius: radius,
      borderWidth: isUnderline ? 0 : 1.5,
      borderBottomWidth: isUnderline ? 1.5 : undefined,
      borderColor: border,
      backgroundColor: bg,
    }}>
      {renderIcon()}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? "Search products…"}
        placeholderTextColor={txtColor + "66"}
        style={{ flex: 1, color: txtColor, fontSize: 14 }}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText("")} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: accent + "22", alignItems: "center", justifyContent: "center", marginLeft: 4 }}>
          <Feather name="x" size={11} color={accent} />
        </TouchableOpacity>
      )}
    </View>
  );
}

type FilterChipsCfg = {
  categories: string[];
  active: string;
  onSelect: (c: string) => void;
  chipStyle?: FilterChipStyle;
  activeBg?: string;
  activeFg?: string;
  marginB?: number;
  paddingH?: number;
};

function FilterChips({ categories, active, onSelect, chipStyle = "pill", activeBg = "#000", activeFg = "#fff", marginB = 12, paddingH = 0 }: FilterChipsCfg) {
  const radius = chipStyle === "pill" ? 100 : chipStyle === "tag" ? 6 : 2;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: marginB, paddingHorizontal: paddingH }}>
      {categories.map((c) => {
        const isActive = c === active || (c === "All" && active === "");
        return (
          <TouchableOpacity
            key={c}
            onPress={() => onSelect(c === "All" ? "" : c)}
            style={[styles.filterChip, {
              borderRadius: radius,
              borderColor: isActive ? activeBg : "#ddd",
              backgroundColor: isActive ? activeBg : "transparent",
            }]}
          >
            <Text style={{ fontSize: 12, color: isActive ? activeFg : "#555", fontWeight: isActive ? "600" : "400" }}>{c}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function ShopGridBlock({
  s,
  colors,
  onAddToCart,
  onLinkPress,
  initialCategory,
}: {
  s: ShopGridSection;
  colors: ReturnType<typeof sectionColors>;
  onAddToCart?: (p: { id: string; name: string; price: number; imageUri?: string }) => void;
  onLinkPress?: (href: string) => void;
  initialCategory?: string;
}) {
  const cartCfg: CartBtnConfig = { style: s.cartBtnStyle, bg: s.cartBtnBg, color: s.cartBtnColor, label: s.cartBtnLabel };
  const cardVariant = s.cardVariant ?? "classic";
  const [cat, setCat] = useState(initialCategory || "All");
  const [shopQ, setShopQ] = useState("");

  useEffect(() => {
    if (initialCategory) setCat(initialCategory);
  }, [initialCategory]);
  const el = useContext(SectionElCtx);
  const { products: inventory } = useApp();
  const { width: winWidth } = useWindowDimensions();
  const cols = winWidth >= 768 ? 4 : 2;

  const useInventory = s.sourceMode === "inventory";
  const allProducts = useInventory
    ? inventory.filter((p) => p.inStock !== false).map((p) => ({
        slug: p.id, name: p.name,
        image: p.imageUri ?? (p as any).images?.[0] ?? "",
        price: p.price, category: p.category ?? "Other",
      }))
    : products;

  const categories = ["All", ...Array.from(new Set(allProducts.map((p) => p.category ?? "Other")))];
  const catFiltered = cat === "All" ? allProducts : allProducts.filter((p) => p.category === cat);
  const filtered = shopQ.trim()
    ? catFiltered.filter((p) => (p.name + " " + (p.category ?? "")).toLowerCase().includes(shopQ.toLowerCase()))
    : catFiltered;

  return (
    <View>
      {s.heading ? (
        <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor, paddingHorizontal: 16, marginBottom: 12 }, el.heading as object]}>
          {s.heading}
        </Text>
      ) : null}

      {(s.showSearch ?? false) && (
        <SearchBarInput
          value={shopQ}
          onChangeText={setShopQ}
          placeholder={s.searchPlaceholder ?? "Search products…"}
          barStyle={s.barStyle}
          barBg={s.barBg}
          barBorderColor={s.barBorderColor}
          barTextColor={s.barTextColor}
          iconName={s.searchIcon}
          accent={colors.accent}
          textColor={colors.color}
          height={46}
          marginH={16}
          marginB={12}
        />
      )}

      {(s.showFilters ?? true) && (
        <FilterChips
          categories={categories}
          active={cat}
          onSelect={setCat}
          chipStyle={s.filterChipStyle}
          activeBg={s.filterActiveBg ?? colors.accent}
          activeFg={s.filterActiveColor ?? "#fff"}
          marginB={12}
          paddingH={16}
        />
      )}

      {cardVariant === "horizontal" ? (
        <View style={{ paddingHorizontal: 8, gap: 8 }}>
          {filtered.map((p) => (
            <ProductThumb
              key={p.slug}
              slug={p.slug}
              colors={colors}
              onAddToCart={onAddToCart}
              onPress={() => onLinkPress?.(`/product/${p.slug}`)}
              cartBtnCfg={cartCfg}
              cardVariant="horizontal"
            />
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 8 }}>
          {filtered.map((p) => (
            <View key={p.slug} style={{ width: `${100 / cols}%` as any, padding: 5 }}>
              <ProductThumb
                slug={p.slug}
                colors={colors}
                onAddToCart={onAddToCart}
                onPress={() => onLinkPress?.(`/product/${p.slug}`)}
                cartBtnCfg={cartCfg}
                cartBtnLayout={s.cartBtnLayout as any}
                cardVariant={cardVariant}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function LogoBarBlock({ s, colors }: { s: LogoBarSection; colors: ReturnType<typeof sectionColors> }) {
  const el = useContext(SectionElCtx);
  return (
    <View>
      {s.heading ? (
        <Text
          style={[
            { textAlign: "center", fontSize: 11, letterSpacing: 2, color: "#888", marginBottom: 12, textTransform: "uppercase" },
            el.eyebrow as object,
          ]}
        >
          {s.heading}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 16, opacity: 0.7 }}>
        {s.logos.map((l, i) => (
          <Image key={i} source={{ uri: l.src }} style={[{ height: 32, width: 80 }, el.image as object]} contentFit="contain" />
        ))}
      </View>
    </View>
  );
}

function RelatedProductsBlock({
  s,
  colors,
  onLinkPress,
  onAddToCart,
  activeSourceSlug,
}: {
  s: RelatedProductsSection;
  colors: ReturnType<typeof sectionColors>;
  onLinkPress?: (href: string) => void;
  onAddToCart?: (p: { id: string; name: string; price: number; imageUri?: string }) => void;
  activeSourceSlug?: string;
}) {
  const el = useContext(SectionElCtx);
  const { products: inventory } = useApp();
  const { width: winWidth } = useWindowDimensions();
  const relCols = winWidth >= 768 ? 4 : 2;

  // Use the live URL slug if available (for product page previews)
  const effectiveSourceSlug = activeSourceSlug ?? s.sourceSlug;

  const scored = useMemo(() => {
    if (s.useInventory || activeSourceSlug) {
      // Use live inventory — match by category or name similarity
      const sourceItem = inventory.find((p) => p.id === effectiveSourceSlug || p.name.toLowerCase() === effectiveSourceSlug.toLowerCase());
      const toks = new Set((sourceItem?.name ?? "").toLowerCase().split(/\s+/).filter((w) => w.length > 2));
      return inventory
        .filter((p) => p.id !== effectiveSourceSlug && p.inStock !== false)
        .map((p) => {
          const pt = new Set(p.name.toLowerCase().split(/\s+/));
          let score = 0;
          toks.forEach((t) => { if (pt.has(t)) score++; });
          if (sourceItem && p.category === sourceItem.category) score += 0.5;
          return { id: p.id, name: p.name, image: p.imageUri, price: p.price, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, s.limit)
        .map(({ id }) => id);
    }
    // Demo catalog fallback
    const source = products.find((p) => p.slug === effectiveSourceSlug);
    const toks = new Set((source?.name ?? "").toLowerCase().split(/\s+/).filter((w) => w.length > 2));
    return products
      .filter((p) => p.slug !== effectiveSourceSlug)
      .map((p) => {
        const pt = new Set(p.name.toLowerCase().split(/\s+/));
        let score = 0;
        toks.forEach((t) => { if (pt.has(t)) score++; });
        if (source && p.category === source.category) score += 0.5;
        return { slug: p.slug, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, s.limit)
      .map(({ slug }) => slug);
  }, [effectiveSourceSlug, s.limit, s.useInventory, activeSourceSlug, inventory]);

  return (
    <View style={{ paddingHorizontal: 2 }}>
      {s.heading ? (
        <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor, marginBottom: 4, textAlign: "center" }, el.heading as object]}>
          {s.heading}
        </Text>
      ) : null}
      {(s as any).subheading ? (
        <Text style={{ fontSize: 13, color: colors.color + "99", textAlign: "center", marginBottom: 14 }}>{(s as any).subheading}</Text>
      ) : null}
      {scored.length === 0 ? (
        <Text style={{ textAlign: "center", color: colors.color + "66", fontSize: 13, paddingVertical: 24 }}>
          No related products found
        </Text>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {scored.map((slug) => (
            <View key={slug} style={{ width: `${100 / relCols}%` as any }}>
              <ProductThumb
                slug={slug}
                colors={colors}
                onAddToCart={onAddToCart}
                onPress={() => onLinkPress?.(`/product/${slug}`)}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function SearchBlock({
  s,
  colors,
  onLinkPress,
  onAddToCart,
}: {
  s: SearchSection;
  colors: ReturnType<typeof sectionColors>;
  onLinkPress?: (href: string) => void;
  onAddToCart?: (p: { id: string; name: string; price: number; imageUri?: string }) => void;
}) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const el = useContext(SectionElCtx);
  const { products: inventory } = useApp();
  const { width: winWidth } = useWindowDimensions();
  const srchCols = winWidth >= 768 ? 4 : 2;

  // Prefer live inventory when useInventory is on (default true); fall back to demo catalog
  const useInv = (s as any).useInventory !== false;
  const allProducts = useInv && inventory.length > 0
    ? inventory.filter((p) => p.inStock !== false).map((p) => ({
        slug: p.id,
        name: p.name,
        description: p.description ?? "",
        category: p.category ?? "Other",
        price: p.price,
        image: p.imageUri ?? "",
      }))
    : products.map((p) => ({ slug: p.slug, name: p.name, description: p.description, category: p.category, price: p.price, image: p.image }));

  const categories = ["All", ...Array.from(new Set(allProducts.map((p) => p.category)))];

  const results = allProducts.filter(
    (p) =>
      (q.trim() === "" || (p.name + " " + p.description).toLowerCase().includes(q.toLowerCase())) &&
      (category === "" || category === "All" || p.category === category),
  );

  return (
    <View>
      {s.heading ? (
        <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor, marginBottom: 12, textAlign: "center" }, el.heading as object]}>
          {s.heading}
        </Text>
      ) : null}
      <SearchBarInput
        value={q}
        onChangeText={setQ}
        placeholder={s.placeholder ?? "Search products…"}
        barStyle={s.barStyle}
        barBg={s.barBg}
        barBorderColor={s.barBorderColor}
        barTextColor={s.barTextColor}
        iconName={s.searchIcon}
        accent={colors.accent}
        textColor={colors.color}
        height={50}
        marginB={14}
      />
      {s.showFilters ? (
        <FilterChips
          categories={categories}
          active={category || "All"}
          onSelect={(c) => setCategory(c)}
          chipStyle={s.filterChipStyle}
          activeBg={s.filterActiveBg ?? colors.accent}
          activeFg={s.filterActiveColor ?? "#fff"}
          marginB={12}
        />
      ) : null}
      <Text style={{ fontSize: 12, color: "#888", marginBottom: 8, paddingHorizontal: 2 }}>
        {q.trim() ? `${results.length} result${results.length === 1 ? "" : "s"}` : `${allProducts.length} products`}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {results.map((p) => (
          <View key={p.slug} style={{ width: `${100 / srchCols}%` as any }}>
            <ProductThumb
              slug={p.slug}
              colors={colors}
              onAddToCart={onAddToCart}
              onPress={() => onLinkPress?.(`/product/${p.slug}`)}
            />
          </View>
        ))}
      </View>
      {results.length === 0 && q.trim() ? (
        <Text style={{ textAlign: "center", color: "#888", marginTop: 12 }}>No products match.</Text>
      ) : null}
    </View>
  );
}

function ProductDetailBlock({
  s,
  theme,
  compact,
  selfPadded,
  activeProductSlug,
  onAddToCart,
}: {
  s: ProductDetailSection;
  theme: Theme;
  compact?: boolean;
  selfPadded?: boolean;
  activeProductSlug?: string;
  onAddToCart?: (p: CartProduct) => void;
}) {
  const { products: inventory } = useApp();
  const colors = sectionColors(s, theme);
  const el = useContext(SectionElCtx);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);

  // Prefer the URL slug (activeProductSlug) over the static section productSlug
  const slug = activeProductSlug ?? s.productSlug;
  const invProduct = inventory.find((p) => p.id === slug);
  const demoProduct = !invProduct ? getProduct(slug) : null;

  if (!invProduct && !demoProduct) {
    return (
      <View style={{ padding: 32, alignItems: "center", gap: 10 }}>
        <Ionicons name="cube-outline" size={40} color="#bbb" />
        <Text style={{ textAlign: "center", color: "#888", fontSize: 14 }}>
          {activeProductSlug ? "Product not found." : "Tap any product to view details here."}
        </Text>
      </View>
    );
  }

  const name = invProduct?.name ?? demoProduct!.name;
  const price = invProduct?.price ?? demoProduct!.price;
  const description = invProduct?.description ?? demoProduct!.description;
  const category = invProduct?.category ?? demoProduct!.category;
  const mainImage = invProduct?.imageUri ?? (invProduct as any)?.images?.[0] ?? demoProduct?.image;
  const gallery = [mainImage, ...s.extraImages.filter(Boolean)].filter(Boolean) as string[];
  const pad = selfPadded ? { padding: 16 } : {};

  const layout = s.layout ?? "stacked";
  const showQty = s.showQty !== false;
  const showDesc = s.showDescription !== false;
  const cartLabel = s.addToCartLabel || "Add to bag";
  const aspectRatio = s.imageRatio === "portrait" ? 0.75 : s.imageRatio === "landscape" ? 1.6 : 1;

  const ImageBlock = (
    <View style={layout === "split" ? { flex: 1 } : undefined}>
      {gallery.length > 0 ? (
        <Image
          source={{ uri: gallery[activeImg] }}
          style={[{ width: "100%", aspectRatio, borderRadius: layout === "hero" ? 0 : 8 }, el.image as object]}
          contentFit="cover"
        />
      ) : (
        <View style={[{ width: "100%", aspectRatio, backgroundColor: "#f0eeeb", borderRadius: layout === "hero" ? 0 : 8, alignItems: "center", justifyContent: "center" }, el.image as object]}>
          <Ionicons name="cube-outline" size={64} color="#bbb" />
        </View>
      )}
      {gallery.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8, paddingHorizontal: layout === "hero" ? 12 : 0 }}>
          {gallery.map((img, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setActiveImg(i)}
              style={{ marginRight: 8, borderWidth: activeImg === i ? 2 : 0, borderColor: colors.accent, borderRadius: 6 }}
            >
              <Image source={{ uri: img }} style={{ width: 56, height: 56, borderRadius: 6 }} contentFit="cover" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const InfoBlock = (
    <View style={layout === "split" ? { flex: 1, paddingLeft: 12 } : layout === "hero" ? { padding: 16 } : { marginTop: 12 }}>
      <Text style={{ fontSize: 11, color: "#888", textTransform: "uppercase" }}>{category}</Text>
      <Text style={[{ fontSize: compact ? 20 : el.h1Size, fontWeight: "700", color: colors.headingColor, marginTop: 4 }, el.heading as object]}>
        {name}
      </Text>
      <Text style={[{ fontSize: 20, fontWeight: "700", marginTop: 8, color: colors.headingColor }, el.price as object]}>
        {formatPrice(price)}
      </Text>
      {showDesc && description ? (
        <Text style={[{ marginTop: 10, lineHeight: 20, color: "#666", fontSize: 13 }, el.body as object]}>{description}</Text>
      ) : null}
      {s.showShareBtn && (
        <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
          <Feather name="share-2" size={15} color={colors.headingColor} />
          <Text style={{ fontSize: 13, color: colors.headingColor }}>Share</Text>
        </TouchableOpacity>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 }}>
        {showQty && (
          <View style={{ flexDirection: "row", borderWidth: 1, borderColor: colors.headingColor + "33", borderRadius: 8 }}>
            <TouchableOpacity onPress={() => setQty((x) => Math.max(1, x - 1))} style={{ padding: 10 }}>
              <Ionicons name="remove" size={15} color={colors.headingColor} />
            </TouchableOpacity>
            <Text style={{ paddingHorizontal: 14, paddingVertical: 10, color: colors.headingColor, fontWeight: "600" }}>{qty}</Text>
            <TouchableOpacity onPress={() => setQty((x) => x + 1)} style={{ padding: 10 }}>
              <Ionicons name="add" size={15} color={colors.headingColor} />
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity
          onPress={() => {
            onAddToCart?.({ id: slug, name, price, imageUri: mainImage });
            setQty(1);
          }}
          style={[styles.btn, { flex: 1, backgroundColor: colors.accent }, el.btn as object]}
        >
          <Text style={styles.btnText}>{cartLabel} — {formatPrice(price * qty)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (layout === "split") {
    return (
      <View style={[{ paddingVertical: compact ? 12 : 20, flexDirection: "row", alignItems: "flex-start" }, pad]}>
        {ImageBlock}
        {InfoBlock}
      </View>
    );
  }

  if (layout === "hero") {
    return (
      <View style={[{ paddingBottom: compact ? 12 : 20 }, pad]}>
        {ImageBlock}
        {InfoBlock}
      </View>
    );
  }

  return (
    <View style={[{ paddingVertical: compact ? 12 : 24 }, pad]}>
      {ImageBlock}
      {InfoBlock}
    </View>
  );
}

function CheckoutFormBlock({
  s,
  colors,
  cart,
}: {
  s: CheckoutFormSection;
  colors: ReturnType<typeof sectionColors>;
  cart?: PreviewCartItem[];
}) {
  const el = useContext(SectionElCtx);
  const { paymentConfig } = useStorefront();
  const [submitted, setSubmitted] = useState(false);
  const [chosenProvider, setChosenProvider] = useState<"paystack" | "flutterwave">("paystack");
  const items = cart ?? [];
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shipping = subtotal >= 15000 || subtotal === 0 ? 0 : 1500;
  const total = subtotal + shipping;

  if (submitted) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 40, gap: 12 }}>
        <Ionicons name="checkmark-circle" size={56} color={colors.accent} />
        <Text style={[styles.h2, { color: colors.headingColor, textAlign: "center" }, el.heading as object]}>Order placed!</Text>
        <Text style={{ color: "#666", textAlign: "center", lineHeight: 20 }}>
          This is a preview. In the live store, payment would be collected here.
        </Text>
        <TouchableOpacity onPress={() => setSubmitted(false)} style={[styles.btn, { backgroundColor: colors.accent, marginTop: 8 }]}>
          <Text style={styles.btnText}>Place another order</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 32, gap: 10 }}>
        <Ionicons name="bag-outline" size={40} color="#bbb" />
        <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor }, el.heading as object]}>
          {s.heading ?? "Checkout"}
        </Text>
        <Text style={{ color: "#888", textAlign: "center", lineHeight: 20 }}>
          Your cart is empty.{"\n"}Go back to the shop and add products.
        </Text>
      </View>
    );
  }

  const Field = ({ label, placeholder }: { label: string; placeholder?: string }) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 11, color: "#888", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text>
      <TextInput placeholder={placeholder} placeholderTextColor="#bbb" style={styles.input} />
    </View>
  );

  const activeProvider = paymentConfig.provider === "both" ? chosenProvider : paymentConfig.provider;
  const providerLabel = activeProvider === "paystack" ? "Paystack" : activeProvider === "flutterwave" ? "Flutterwave" : null;

  return (
    <View style={{ paddingHorizontal: 16 }}>
      {s.heading ? (
        <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor, marginBottom: 20 }, el.heading as object]}>
          {s.heading}
        </Text>
      ) : null}

      {/* Order summary at top */}
      <View style={[styles.card, { borderColor: "#e5e5e5", marginBottom: 20 }, el.card as object]}>
        <Text style={[{ fontWeight: "700", color: colors.headingColor, marginBottom: 8 }, el.heading as object]}>Order summary</Text>
        {items.map((i) => (
          <View key={i.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f0f0f0" }}>
            <Text style={[{ fontSize: 13, color: colors.headingColor, flex: 1 }, el.body as object]} numberOfLines={1}>{i.name} × {i.qty}</Text>
            <Text style={[{ fontSize: 13, fontWeight: "600", color: colors.accent }, el.price as object]}>{formatPrice(i.price * i.qty)}</Text>
          </View>
        ))}
        {shipping > 0 && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
            <Text style={{ fontSize: 13, color: "#888" }}>Shipping</Text>
            <Text style={{ fontSize: 13, color: "#888" }}>{formatPrice(shipping)}</Text>
          </View>
        )}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#e5e5e5" }}>
          <Text style={{ fontWeight: "700", color: colors.headingColor }}>Total</Text>
          <Text style={[{ fontWeight: "700", fontSize: 16, color: colors.accent }, el.price as object]}>{formatPrice(total)}</Text>
        </View>
      </View>

      <Field label="Email" placeholder="you@email.com" />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}><Field label="First name" /></View>
        <View style={{ flex: 1 }}><Field label="Last name" /></View>
      </View>
      <Field label="Phone" placeholder="+234 ..." />
      <Field label="Delivery address" />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}><Field label="City" /></View>
        <View style={{ flex: 1 }}><Field label="State" /></View>
      </View>

      {/* Payment gateway selector */}
      <View style={{ marginTop: 16, marginBottom: 4 }}>
        <Text style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Payment method</Text>
        {paymentConfig.provider === "both" ? (
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            {(["paystack", "flutterwave"] as const).map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setChosenProvider(p)}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5,
                  borderColor: chosenProvider === p ? colors.accent : "#ddd",
                  backgroundColor: chosenProvider === p ? colors.accent + "12" : "transparent",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "600", fontSize: 13, color: chosenProvider === p ? colors.accent : "#555" }}>
                  {p === "paystack" ? "Paystack" : "Flutterwave"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : paymentConfig.provider !== "none" ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 8, backgroundColor: colors.accent + "10", marginBottom: 8 }}>
            <Ionicons name="card-outline" size={16} color={colors.accent} />
            <Text style={{ fontSize: 13, color: colors.accent, fontWeight: "600" }}>
              {paymentConfig.provider === "paystack" ? "Paystack" : "Flutterwave"} secure checkout
            </Text>
          </View>
        ) : null}
      </View>

      <TouchableOpacity
        onPress={() => setSubmitted(true)}
        style={[styles.btn, { backgroundColor: colors.accent, marginTop: 8 }, el.btn as object]}
      >
        <Ionicons name="lock-closed" size={14} color="#fff" style={{ marginRight: 6 }} />
        <Text style={styles.btnText}>
          {providerLabel ? `Pay with ${providerLabel} · ` : "Pay "}{formatPrice(total)}
        </Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 11, color: "#888", textAlign: "center", marginTop: 10 }}>
        Preview mode — no real payment is taken
      </Text>
    </View>
  );
}

function ContactFormBlock({ s, colors }: { s: ContactFormSection; colors: ReturnType<typeof sectionColors> }) {
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const el = useContext(SectionElCtx);
  const onSubmit = useContext(ContactApiCtx);

  if (done) {
    return (
      <View style={[styles.card, { borderColor: "#e5e5e5", alignItems: "center", padding: 24 }]}>
        <Feather name="check-circle" size={32} color={colors.accent} />
        <Text style={[{ fontWeight: "600", marginTop: 12, color: colors.headingColor }, el.heading as object]}>Message sent!</Text>
        <Text style={{ fontSize: 13, color: "#888", marginTop: 4, textAlign: "center" }}>Thanks for reaching out.</Text>
        <TouchableOpacity onPress={() => { setDone(false); setName(""); setEmail(""); setSubject(""); setMessage(""); }} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.accent, fontSize: 12 }}>Send another</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSend = async () => {
    if (!name.trim() || !message.trim()) { setError("Name and message are required."); return; }
    setError(""); setSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() });
      }
      setDone(true);
    } catch {
      setError("Failed to send — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View>
      {s.heading ? (
        <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor, textAlign: "center" }, el.heading as object]}>
          {s.heading}
        </Text>
      ) : null}
      {s.subheading ? (
        <Text style={[{ textAlign: "center", color: "#666", marginTop: 6, marginBottom: 16 }, el.subheading as object]}>
          {s.subheading}
        </Text>
      ) : null}
      <TextInput value={name} onChangeText={setName} placeholder="Name *" placeholderTextColor="#999" style={[styles.input, { marginBottom: 8 }]} />
      <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#999" keyboardType="email-address" autoCapitalize="none" style={[styles.input, { marginBottom: 8 }]} />
      <TextInput value={subject} onChangeText={setSubject} placeholder="Subject" placeholderTextColor="#999" style={[styles.input, { marginBottom: 8 }]} />
      <TextInput value={message} onChangeText={setMessage} placeholder="Message *" placeholderTextColor="#999" multiline style={[styles.input, { minHeight: 100, marginBottom: error ? 6 : 12, textAlignVertical: "top" }]} />
      {error ? <Text style={{ color: "#e11d48", fontSize: 12, marginBottom: 8 }}>{error}</Text> : null}
      <TouchableOpacity
        disabled={submitting}
        onPress={handleSend}
        style={[styles.btn, { backgroundColor: colors.accent }, el.btn as object]}
      >
        <Text style={[styles.btnText, { color: (el.btn as any)?.color ?? "#fff" }]}>{submitting ? "Sending…" : "Send message"}</Text>
      </TouchableOpacity>
    </View>
  );
}

function PricingPlansBlock({
  s,
  colors,
  onLinkPress,
}: {
  s: PricingPlansSection;
  colors: ReturnType<typeof sectionColors>;
  onLinkPress?: (href: string) => void;
}) {
  const el = useContext(SectionElCtx);
  const variant = s.variant ?? "cards";

  const heading = s.heading ? (
    <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor, textAlign: "center" }, el.heading as object]}>
      {s.heading}
    </Text>
  ) : null;
  const subheading = s.subheading ? (
    <Text style={[{ textAlign: "center", color: "#666", marginTop: 6, marginBottom: 16 }, el.subheading as object]}>
      {s.subheading}
    </Text>
  ) : null;

  const openPlan = (plan: (typeof s.plans)[0]) => {
    if (plan.paystackLink) {
      Linking.openURL(plan.paystackLink).catch(() => {});
    } else if (plan.ctaLink) {
      onLinkPress?.(plan.ctaLink);
    }
  };

  const PlanCard = ({ plan, i, extraStyle }: { plan: (typeof s.plans)[0]; i: number; extraStyle?: object }) => (
    <View style={[styles.card, { borderColor: plan.highlighted ? colors.accent : "#e5e5e5", backgroundColor: plan.highlighted ? colors.accent + "0D" : undefined }, extraStyle, el.card as object]}>
      {plan.highlighted ? (
        <View style={{ alignSelf: "center", backgroundColor: colors.accent, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 8 }}>
          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>POPULAR</Text>
        </View>
      ) : null}
      <Text style={[{ fontWeight: "700", fontSize: 15, color: colors.headingColor, textAlign: "center" }, el.heading as object]}>{plan.name}</Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 6, justifyContent: "center" }}>
        <Text style={[{ fontSize: 28, fontWeight: "800", color: plan.highlighted ? colors.accent : colors.headingColor }, el.price as object]}>{plan.price}</Text>
        {plan.period ? <Text style={{ fontSize: 13, color: "#888", marginLeft: 4 }}>{plan.period}</Text> : null}
      </View>
      {plan.description ? <Text style={[{ color: "#666", marginTop: 4, marginBottom: 10, textAlign: "center" }, el.body as object]}>{plan.description}</Text> : null}
      {plan.features.map((f, fi) => (
        <View key={fi} style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 6 }}>
          <Feather name="check" size={13} color={plan.highlighted ? colors.accent : "#10b981"} />
          <Text style={{ fontSize: 12, color: "#444", flex: 1 }}>{f}</Text>
        </View>
      ))}
      {/* Badge indicating Paystack payment is configured */}
      {plan.paystackLink ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 10 }}>
          <Feather name="lock" size={10} color="#10b981" />
          <Text style={{ fontSize: 10, color: "#10b981" }}>Secure Paystack checkout</Text>
        </View>
      ) : null}
      <TouchableOpacity onPress={() => openPlan(plan)} style={[styles.btn, { backgroundColor: plan.highlighted ? colors.accent : "transparent", borderWidth: plan.highlighted ? 0 : 1, borderColor: colors.accent, alignItems: "center", marginTop: 10 }, el.btn as object]}>
        <Text style={[styles.btnText, { color: plan.highlighted ? "#fff" : colors.accent }]}>{plan.ctaLabel}</Text>
      </TouchableOpacity>
    </View>
  );

  // TABLE: horizontal scroll side-by-side comparison
  if (variant === "table") {
    return (
      <View>
        {heading}
        {subheading}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 10, padding: 4 }}>
            {s.plans.map((plan, i) => (
              <PlanCard key={i} plan={plan} i={i} extraStyle={{ width: 180 }} />
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // CARDS (default): stacked vertical list
  return (
    <View>
      {heading}
      {subheading}
      {s.plans.map((plan, i) => (
        <PlanCard key={i} plan={plan} i={i} extraStyle={{ marginBottom: 12 }} />
      ))}
    </View>
  );
}

function CountdownBlock({
  s,
  colors,
  onLinkPress,
}: {
  s: CountdownSection;
  colors: ReturnType<typeof sectionColors>;
  onLinkPress?: (href: string) => void;
}) {
  const el = useContext(SectionElCtx);
  const variant = s.variant ?? "banner";
  const target = new Date(s.targetDate).getTime();
  const now = Date.now();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  const sectionHeading = s.heading ? (
    <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor, textAlign: "center", marginBottom: 8 }, el.heading as object]}>
      {s.heading}
    </Text>
  ) : null;
  const bodyText = s.body ? (
    <Text style={[{ color: "#666", textAlign: "center", marginBottom: 16 }, el.body as object]}>{s.body}</Text>
  ) : null;
  const cta = s.ctaLabel ? (
    <TouchableOpacity onPress={() => s.ctaLink && onLinkPress?.(s.ctaLink)} style={[styles.btn, { backgroundColor: colors.accent, marginTop: 16 }, el.btn as object]}>
      <Text style={[styles.btnText, { color: (el.btn as any)?.color ?? "#fff" }]}>{s.ctaLabel}</Text>
    </TouchableOpacity>
  ) : null;

  // BOX: each time unit in its own colored box
  if (variant === "box") {
    const boxUnit = (n: number, label: string) => (
      <View style={{ alignItems: "center", flex: 1 }}>
        <View style={{ backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 12, alignItems: "center", width: "100%" }}>
          <Text style={[{ fontSize: 28, fontWeight: "800", color: "#fff" }, el.heading as object]}>{String(n).padStart(2, "0")}</Text>
        </View>
        <Text style={{ fontSize: 10, color: "#888", textTransform: "uppercase", marginTop: 4 }}>{label}</Text>
      </View>
    );
    return (
      <View style={{ alignItems: "center" }}>
        {sectionHeading}
        {bodyText}
        <View style={{ flexDirection: "row", gap: 8, width: "100%", paddingHorizontal: 8 }}>
          {boxUnit(days, "days")}
          {boxUnit(hours, "hrs")}
          {boxUnit(mins, "min")}
          {boxUnit(secs, "sec")}
        </View>
        {cta}
      </View>
    );
  }

  // BANNER (default): inline row with colon separators
  const unit = (n: number, label: string) => (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Text style={[{ fontSize: 32, fontWeight: "800", color: colors.headingColor }, el.heading as object]}>{String(n).padStart(2, "0")}</Text>
      <Text style={{ fontSize: 10, color: "#888", textTransform: "uppercase" }}>{label}</Text>
    </View>
  );
  return (
    <View style={{ alignItems: "center" }}>
      {sectionHeading}
      {bodyText}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {unit(days, "days")}
        <Text style={{ fontSize: 24, fontWeight: "700", color: colors.accent }}>:</Text>
        {unit(hours, "hrs")}
        <Text style={{ fontSize: 24, fontWeight: "700", color: colors.accent }}>:</Text>
        {unit(mins, "min")}
        <Text style={{ fontSize: 24, fontWeight: "700", color: colors.accent }}>:</Text>
        {unit(secs, "sec")}
      </View>
      {cta}
    </View>
  );
}

function StatsBlock({ s, colors }: { s: StatsSection; colors: ReturnType<typeof sectionColors> }) {
  const el = useContext(SectionElCtx);
  const variant = s.variant ?? "centered";

  const heading = s.heading ? (
    <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor, textAlign: "center", marginBottom: 16 }, el.heading as object]}>
      {s.heading}
    </Text>
  ) : null;

  // BADGES: each stat in an accent-tinted pill
  if (variant === "badges") {
    return (
      <View>
        {heading}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          {s.items.map((item, i) => (
            <View key={i} style={[{ backgroundColor: colors.accent + "15", borderRadius: 16, paddingVertical: 12, paddingHorizontal: 20, alignItems: "center", minWidth: "40%" }, el.card as object]}>
              <Text style={[{ fontSize: 28, fontWeight: "800", color: colors.accent }, el.price as object]}>{item.value}</Text>
              <Text style={[{ fontWeight: "600", color: colors.headingColor, marginTop: 2, fontSize: 13 }, el.heading as object]}>{item.label}</Text>
              {item.description ? <Text style={[{ fontSize: 11, color: "#888", textAlign: "center", marginTop: 2 }, el.body as object]}>{item.description}</Text> : null}
            </View>
          ))}
        </View>
      </View>
    );
  }

  // MINIMAL: just large number + label, no backgrounds
  if (variant === "minimal") {
    return (
      <View>
        {heading}
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 20 }}>
          {s.items.map((item, i) => (
            <View key={i} style={[{ alignItems: "center", minWidth: "40%" }, el.card as object]}>
              <Text style={[{ fontSize: 36, fontWeight: "900", color: colors.accent, letterSpacing: -1 }, el.price as object]}>{item.value}</Text>
              <Text style={[{ fontWeight: "500", color: "#888", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }, el.heading as object]}>{item.label}</Text>
              {item.description ? <Text style={[{ fontSize: 12, color: "#bbb", textAlign: "center", marginTop: 2 }, el.body as object]}>{item.description}</Text> : null}
            </View>
          ))}
        </View>
      </View>
    );
  }

  // CENTERED (default)
  return (
    <View>
      {heading}
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 16 }}>
        {s.items.map((item, i) => (
          <View key={i} style={[{ alignItems: "center", minWidth: "40%", padding: 12 }, el.card as object]}>
            <Text style={[{ fontSize: 32, fontWeight: "800", color: colors.accent }, el.price as object]}>{item.value}</Text>
            <Text style={[{ fontWeight: "600", color: colors.headingColor, marginTop: 4 }, el.heading as object]}>{item.label}</Text>
            {item.description ? (
              <Text style={[{ fontSize: 12, color: "#888", textAlign: "center", marginTop: 2 }, el.body as object]}>{item.description}</Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function TeamBlock({ s, colors }: { s: TeamSection; colors: ReturnType<typeof sectionColors> }) {
  const el = useContext(SectionElCtx);
  const variant = s.variant ?? "cards";

  const heading = s.heading ? (
    <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor, textAlign: "center" }, el.heading as object]}>
      {s.heading}
    </Text>
  ) : null;
  const subheading = s.subheading ? (
    <Text style={[{ textAlign: "center", color: "#666", marginTop: 6, marginBottom: 16 }, el.subheading as object]}>
      {s.subheading}
    </Text>
  ) : null;

  // MINIMAL: horizontal list rows, avatar left + info right
  if (variant === "minimal") {
    return (
      <View>
        {heading}
        {subheading}
        {s.members.map((m, i) => (
          <View key={i} style={[{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f0f0f0" }, el.card as object]}>
            {m.avatar ? (
              <Image source={{ uri: m.avatar }} style={[{ width: 56, height: 56, borderRadius: 28 }, el.image as object]} contentFit="cover" />
            ) : (
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent + "22", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 20, fontWeight: "700", color: colors.accent }}>{m.name[0]}</Text>
              </View>
            )}
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={[{ fontWeight: "700", color: colors.headingColor }, el.heading as object]}>{m.name}</Text>
              <Text style={{ fontSize: 12, color: "#888" }}>{m.role}</Text>
              {m.bio ? <Text style={[{ fontSize: 12, color: "#666", marginTop: 2 }, el.body as object]} numberOfLines={2}>{m.bio}</Text> : null}
            </View>
          </View>
        ))}
      </View>
    );
  }

  // CARDS (default): 2-column grid of cards
  return (
    <View>
      {heading}
      {subheading}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
        {s.members.map((m, i) => (
          <View key={i} style={[styles.card, { borderColor: "#e5e5e5", alignItems: "center", width: "47%", padding: 16 }, el.card as object]}>
            {m.avatar ? (
              <Image source={{ uri: m.avatar }} style={[{ width: 72, height: 72, borderRadius: 36, marginBottom: 10 }, el.image as object]} contentFit="cover" />
            ) : (
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accent + "22", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                <Text style={{ fontSize: 24, fontWeight: "700", color: colors.accent }}>{m.name[0]}</Text>
              </View>
            )}
            <Text style={[{ fontWeight: "700", color: colors.headingColor, textAlign: "center" }, el.heading as object]}>{m.name}</Text>
            <Text style={{ fontSize: 12, color: "#888", textAlign: "center" }}>{m.role}</Text>
            {m.bio ? <Text style={[{ fontSize: 12, color: "#666", textAlign: "center", marginTop: 6 }, el.body as object]}>{m.bio}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── About + Contact sections ─────────────────────────────────────────────────

function AboutBlock({ s, colors, onLinkPress }: {
  s: AboutSection;
  colors: ReturnType<typeof sectionColors>;
  onLinkPress?: (href: string) => void;
}) {
  const el = useContext(SectionElCtx);
  const variant = s.variant ?? "story";

  const textBlock = (
    <View style={{ gap: 10 }}>
      <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor }, el.heading as object]}>
        {s.heading ?? "Our story"}
      </Text>
      {s.subheading ? (
        <Text style={[{ color: colors.accent, fontSize: 15, fontWeight: "600" }, el.subheading as object]}>{s.subheading}</Text>
      ) : null}
      {s.body ? (
        <Text style={[{ color: "#666", lineHeight: 22 }, el.body as object]}>{s.body}</Text>
      ) : null}
      {s.ctaLabel ? (
        <InlineCta label={s.ctaLabel} link={s.ctaLink} accent={colors.accent} el={el} icon={s.elIcons?.button as any} onLinkPress={onLinkPress} />
      ) : null}
    </View>
  );

  // SPLIT: image left 40%, text right 60%
  if (variant === "split") {
    return (
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
        {s.image ? (
          <Image source={{ uri: s.image }} style={[{ flex: 0.45, aspectRatio: 0.8, borderRadius: 10 }, el.image as object]} contentFit="cover" />
        ) : null}
        <View style={{ flex: 0.55 }}>{textBlock}</View>
      </View>
    );
  }

  // TEAM: text + member grid
  if (variant === "team") {
    const members = s.team ?? [];
    return (
      <View style={{ gap: 20 }}>
        {textBlock}
        {members.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
            {members.map((m, i) => (
              <View key={i} style={{ width: "45%", alignItems: "center", gap: 6 }}>
                {m.image ? (
                  <Image source={{ uri: m.image }} style={{ width: 64, height: 64, borderRadius: 32 }} contentFit="cover" />
                ) : (
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent + "22", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 22, fontWeight: "700", color: colors.accent }}>{m.name[0]}</Text>
                  </View>
                )}
                <Text style={{ fontWeight: "700", color: colors.headingColor, textAlign: "center", fontSize: 13 }}>{m.name}</Text>
                <Text style={{ fontSize: 11, color: "#888", textAlign: "center" }}>{m.role}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  // MAGAZINE: full-bleed image with text overlay
  if (variant === "magazine" && s.image) {
    return (
      <View style={{ minHeight: 300 }}>
        <Image source={{ uri: s.image }} style={[StyleSheet.absoluteFill, el.image as object]} contentFit="cover" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)" }]} />
        <View style={{ padding: 24, paddingTop: 40, gap: 10 }}>
          <Text style={[styles.h2, { fontSize: el.h2Size, color: "#fff" }, el.heading as object]}>{s.heading ?? "Our story"}</Text>
          {s.body ? <Text style={[{ color: "rgba(255,255,255,0.85)", lineHeight: 22 }, el.body as object]}>{s.body}</Text> : null}
          {s.ctaLabel ? (
            <InlineCta label={s.ctaLabel} link={s.ctaLink} accent={colors.accent} el={el} textColor="#fff" icon={s.elIcons?.button as any} onLinkPress={onLinkPress} />
          ) : null}
        </View>
      </View>
    );
  }

  // STORY (default): image top, text below
  return (
    <View style={{ gap: 16 }}>
      {s.image ? (
        <Image source={{ uri: s.image }} style={[{ width: "100%", aspectRatio: 16 / 9, borderRadius: 10 }, el.image as object]} contentFit="cover" />
      ) : null}
      {textBlock}
    </View>
  );
}

function ContactBlock({ s, colors }: {
  s: ContactSection;
  colors: ReturnType<typeof sectionColors>;
}) {
  const el = useContext(SectionElCtx);
  const onSubmit = useContext(ContactApiCtx);
  const variant = s.variant ?? "split";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const infoItems = [
    s.email && { icon: "mail-outline" as const, label: s.email },
    s.phone && { icon: "call-outline" as const, label: s.phone },
    s.address && { icon: "location-outline" as const, label: s.address },
    s.hours && { icon: "time-outline" as const, label: s.hours },
  ].filter(Boolean) as { icon: "mail-outline" | "call-outline" | "location-outline" | "time-outline"; label: string }[];

  const infoBlock = (
    <View style={{ gap: 12 }}>
      {infoItems.map((item, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
          <Ionicons name={item.icon} size={18} color={colors.accent} style={{ marginTop: 1 }} />
          <Text style={[{ color: "#666", lineHeight: 22, flex: 1 }, el.body as object]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );

  const handleContactSend = async () => {
    if (!name.trim() || !message.trim()) { setError("Name and message are required."); return; }
    setError(""); setSubmitting(true);
    try {
      if (onSubmit) await onSubmit({ name: name.trim(), email: email.trim(), message: message.trim() });
      setSent(true);
    } catch {
      setError("Failed to send — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formBlock = s.showForm !== false && (
    sent ? (
      <View style={{ alignItems: "center", gap: 8, paddingVertical: 20 }}>
        <Ionicons name="checkmark-circle" size={44} color={colors.accent} />
        <Text style={{ fontWeight: "600", color: colors.headingColor, fontSize: 16 }}>Message sent!</Text>
        <Text style={{ color: "#888", textAlign: "center" }}>We'll get back to you soon.</Text>
      </View>
    ) : (
      <View style={{ gap: 10 }}>
        <TextInput value={name} onChangeText={setName} placeholder="Your name *" placeholderTextColor="#999" style={styles.input} />
        <TextInput value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor="#999" keyboardType="email-address" autoCapitalize="none" style={styles.input} />
        <TextInput value={message} onChangeText={setMessage} placeholder="Your message *" placeholderTextColor="#999" multiline numberOfLines={4} style={[styles.input, { height: 96, textAlignVertical: "top" }]} />
        {error ? <Text style={{ color: "#e11d48", fontSize: 12 }}>{error}</Text> : null}
        <TouchableOpacity disabled={submitting} onPress={handleContactSend} style={[styles.btn, { backgroundColor: colors.accent }, el.btn as object]}>
          <Text style={[styles.btnText, { color: (el.btn as any)?.color ?? "#fff" }]}>{submitting ? "Sending…" : "Send message"}</Text>
        </TouchableOpacity>
      </View>
    )
  );

  // CARDS: info items as cards, form below
  if (variant === "cards") {
    return (
      <View style={{ gap: 20 }}>
        <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor }, el.heading as object]}>{s.heading ?? "Get in touch"}</Text>
        {s.subheading ? <Text style={[{ color: "#888" }, el.body as object]}>{s.subheading}</Text> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {infoItems.map((item, i) => (
            <View key={i} style={{ flex: 1, minWidth: "45%", backgroundColor: colors.accent + "0D", borderRadius: 12, padding: 12, gap: 6 }}>
              <Ionicons name={item.icon} size={20} color={colors.accent} />
              <Text style={[{ color: "#666", fontSize: 13, lineHeight: 18 }, el.body as object]}>{item.label}</Text>
            </View>
          ))}
        </View>
        {formBlock}
      </View>
    );
  }

  // FULL: heading + info left, form right (stacks on mobile)
  if (variant === "full") {
    return (
      <View style={{ gap: 20 }}>
        <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor }, el.heading as object]}>{s.heading ?? "Get in touch"}</Text>
        {s.subheading ? <Text style={[{ color: "#888", marginBottom: 4 }, el.body as object]}>{s.subheading}</Text> : null}
        {infoBlock}
        {formBlock && <View style={{ marginTop: 8 }}>{formBlock}</View>}
      </View>
    );
  }

  // SIMPLE: compact, stacked
  if (variant === "simple") {
    return (
      <View style={{ gap: 16 }}>
        <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor }, el.heading as object]}>{s.heading ?? "Get in touch"}</Text>
        {infoBlock}
        {formBlock}
      </View>
    );
  }

  // SPLIT (default): info + form side by side
  return (
    <View style={{ gap: 20 }}>
      <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor }, el.heading as object]}>{s.heading ?? "Get in touch"}</Text>
      {s.subheading ? <Text style={[{ color: "#888", marginBottom: 4 }, el.body as object]}>{s.subheading}</Text> : null}
      {infoBlock}
      {formBlock && <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 16 }}>{formBlock}</View>}
    </View>
  );
}

// ─── Auth + Buyer sections ─────────────────────────────────────────────────────

function AuthLoginBlock({
  s,
  colors,
  onLinkPress,
}: {
  s: AuthLoginSection;
  colors: ReturnType<typeof sectionColors>;
  onLinkPress?: (href: string) => void;
}) {
  const el = useContext(SectionElCtx);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const imageSide = s.imageSide ?? "right";
  const hasImage = !!s.image;

  const formContent = (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16 }}>
      <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor }, el.heading as object]}>
        {s.heading ?? "Welcome back"}
      </Text>
      {s.subheading ? (
        <Text style={[{ color: "#888", lineHeight: 20, marginTop: -8 }, el.body as object]}>{s.subheading}</Text>
      ) : null}
      {done ? (
        <View style={{ alignItems: "center", gap: 10, paddingVertical: 20 }}>
          <Ionicons name="checkmark-circle" size={48} color={colors.accent} />
          <Text style={{ color: colors.headingColor, fontWeight: "600", fontSize: 16 }}>Logged in!</Text>
          <Text style={{ color: "#888", textAlign: "center" }}>Preview only — no real auth in the editor.</Text>
        </View>
      ) : (
        <>
          <View style={{ gap: 10 }}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry
              style={styles.input}
            />
          </View>
          <TouchableOpacity
            onPress={() => { setLoading(true); setTimeout(() => { setLoading(false); setDone(true); }, 600); }}
            style={[styles.btn, { backgroundColor: colors.accent }, el.btn as object]}
          >
            <Text style={styles.btnText}>{loading ? "Signing in…" : "Sign in"}</Text>
          </TouchableOpacity>
          {s.signupLink ? (
            <TouchableOpacity onPress={() => onLinkPress?.(s.signupLink!)}>
              <Text style={{ textAlign: "center", color: colors.accent, fontSize: 13 }}>
                Don't have an account? <Text style={{ fontWeight: "700" }}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          ) : null}
        </>
      )}
    </View>
  );

  if (hasImage && imageSide === "background") {
    return (
      <View style={{ minHeight: 400 }}>
        <Image source={{ uri: s.image }} style={[StyleSheet.absoluteFill, el.image as object]} contentFit="cover" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]} />
        <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16 }}>
          <Text style={[styles.h2, { fontSize: el.h2Size, color: "#fff" }, el.heading as object]}>{s.heading ?? "Welcome back"}</Text>
          {s.subheading ? <Text style={[{ color: "#ddd", lineHeight: 20 }, el.body as object]}>{s.subheading}</Text> : null}
          <TextInput placeholder="Email address" placeholderTextColor="#ccc" keyboardType="email-address" autoCapitalize="none" style={[styles.input, { backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.3)", color: "#fff" }]} />
          <TextInput placeholder="Password" placeholderTextColor="#ccc" secureTextEntry style={[styles.input, { backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.3)", color: "#fff" }]} />
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }, el.btn as object]}>
            <Text style={styles.btnText}>Sign in</Text>
          </TouchableOpacity>
          {s.signupLink ? (
            <TouchableOpacity onPress={() => onLinkPress?.(s.signupLink!)}>
              <Text style={{ textAlign: "center", color: "#fff", fontSize: 13 }}>Don't have an account? <Text style={{ fontWeight: "700" }}>Sign up</Text></Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  if (hasImage) {
    const imgLeft = imageSide === "left";
    return (
      <View style={{ flexDirection: "row", minHeight: 360 }}>
        {imgLeft ? <Image source={{ uri: s.image }} style={[{ flex: 1 }, el.image as object]} contentFit="cover" /> : null}
        {formContent}
        {!imgLeft ? <Image source={{ uri: s.image }} style={[{ flex: 1 }, el.image as object]} contentFit="cover" /> : null}
      </View>
    );
  }

  return formContent;
}

function AuthSignupBlock({
  s,
  colors,
  onLinkPress,
}: {
  s: AuthSignupSection;
  colors: ReturnType<typeof sectionColors>;
  onLinkPress?: (href: string) => void;
}) {
  const el = useContext(SectionElCtx);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const imageSide = s.imageSide ?? "right";
  const hasImage = !!s.image;

  const formContent = (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16 }}>
      <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor }, el.heading as object]}>
        {s.heading ?? "Create account"}
      </Text>
      {s.subheading ? (
        <Text style={[{ color: "#888", lineHeight: 20, marginTop: -8 }, el.body as object]}>{s.subheading}</Text>
      ) : null}
      {done ? (
        <View style={{ alignItems: "center", gap: 10, paddingVertical: 20 }}>
          <Ionicons name="checkmark-circle" size={48} color={colors.accent} />
          <Text style={{ color: colors.headingColor, fontWeight: "600", fontSize: 16 }}>Account created!</Text>
          <Text style={{ color: "#888", textAlign: "center" }}>Preview only — no real auth in the editor.</Text>
        </View>
      ) : (
        <>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput placeholder="First name" placeholderTextColor="#999" style={[styles.input, { flex: 1 }]} />
              <TextInput placeholder="Last name" placeholderTextColor="#999" style={[styles.input, { flex: 1 }]} />
            </View>
            <TextInput placeholder="Email address" placeholderTextColor="#999" keyboardType="email-address" autoCapitalize="none" style={styles.input} />
            <TextInput placeholder="Phone number" placeholderTextColor="#999" keyboardType="phone-pad" style={styles.input} />
            <TextInput placeholder="Password" placeholderTextColor="#999" secureTextEntry style={styles.input} />
          </View>
          <TouchableOpacity
            onPress={() => { setLoading(true); setTimeout(() => { setLoading(false); setDone(true); }, 600); }}
            style={[styles.btn, { backgroundColor: colors.accent }, el.btn as object]}
          >
            <Text style={styles.btnText}>{loading ? "Creating account…" : "Create account"}</Text>
          </TouchableOpacity>
          {s.loginLink ? (
            <TouchableOpacity onPress={() => onLinkPress?.(s.loginLink!)}>
              <Text style={{ textAlign: "center", color: colors.accent, fontSize: 13 }}>
                Already have an account? <Text style={{ fontWeight: "700" }}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          ) : null}
        </>
      )}
    </View>
  );

  if (hasImage && imageSide === "background") {
    return (
      <View style={{ minHeight: 440 }}>
        <Image source={{ uri: s.image }} style={[StyleSheet.absoluteFill, el.image as object]} contentFit="cover" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]} />
        <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 14 }}>
          <Text style={[styles.h2, { fontSize: el.h2Size, color: "#fff" }, el.heading as object]}>{s.heading ?? "Create account"}</Text>
          {s.subheading ? <Text style={[{ color: "#ddd", lineHeight: 20 }, el.body as object]}>{s.subheading}</Text> : null}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput placeholder="First name" placeholderTextColor="#ccc" style={[styles.input, { flex: 1, backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.3)", color: "#fff" }]} />
            <TextInput placeholder="Last name" placeholderTextColor="#ccc" style={[styles.input, { flex: 1, backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.3)", color: "#fff" }]} />
          </View>
          <TextInput placeholder="Email" placeholderTextColor="#ccc" keyboardType="email-address" style={[styles.input, { backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.3)", color: "#fff" }]} />
          <TextInput placeholder="Password" placeholderTextColor="#ccc" secureTextEntry style={[styles.input, { backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.3)", color: "#fff" }]} />
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }, el.btn as object]}>
            <Text style={styles.btnText}>Create account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (hasImage) {
    const imgLeft = imageSide === "left";
    return (
      <View style={{ flexDirection: "row", minHeight: 440 }}>
        {imgLeft ? <Image source={{ uri: s.image }} style={[{ flex: 1 }, el.image as object]} contentFit="cover" /> : null}
        {formContent}
        {!imgLeft ? <Image source={{ uri: s.image }} style={[{ flex: 1 }, el.image as object]} contentFit="cover" /> : null}
      </View>
    );
  }

  return formContent;
}

function BuyerOrdersBlock({ s, colors }: { s: BuyerOrdersSection; colors: ReturnType<typeof sectionColors> }) {
  const el = useContext(SectionElCtx);
  const mockOrders = [
    { id: "ORD-0001", date: "Dec 12, 2024", status: "Delivered", total: 12500, items: 3 },
    { id: "ORD-0002", date: "Jan 3, 2025", status: "In transit", total: 7800, items: 1 },
    { id: "ORD-0003", date: "Feb 18, 2025", status: "Processing", total: 19200, items: 2 },
  ];
  const statusColor = (st: string) =>
    st === "Delivered" ? "#10b981" : st === "In transit" ? colors.accent : "#f59e0b";

  return (
    <View>
      <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor, marginBottom: 4 }, el.heading as object]}>
        {s.heading ?? "My Orders"}
      </Text>
      {s.subheading ? (
        <Text style={[{ color: "#888", marginBottom: 16, fontSize: 13 }, el.body as object]}>{s.subheading}</Text>
      ) : <View style={{ marginBottom: 16 }} />}
      {mockOrders.map((order, i) => (
        <View key={i} style={[styles.card, { borderColor: "#e5e5e5", marginBottom: 10 }, el.card as object]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={[{ fontWeight: "700", color: colors.headingColor }, el.heading as object]}>{order.id}</Text>
            <View style={{ backgroundColor: statusColor(order.status) + "18", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ color: statusColor(order.status), fontSize: 12, fontWeight: "600" }}>{order.status}</Text>
            </View>
          </View>
          <Text style={{ color: "#888", fontSize: 12, marginTop: 4 }}>{order.date} · {order.items} item{order.items > 1 ? "s" : ""}</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <Text style={[{ fontWeight: "700", color: colors.accent }, el.price as object]}>₦{order.total.toLocaleString()}</Text>
            <TouchableOpacity style={[{ borderWidth: 1, borderColor: colors.accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }, el.btn as object]}>
              <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "600" }}>Track order</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <Text style={{ textAlign: "center", color: "#bbb", fontSize: 11, marginTop: 8 }}>
        Preview mode — live data loads from your store's API
      </Text>
    </View>
  );
}

function BuyerReferralsBlock({ s, colors }: { s: BuyerReferralsSection; colors: ReturnType<typeof sectionColors> }) {
  const el = useContext(SectionElCtx);
  const mockCode = "AMAKA-XK7B";
  const mockStats = { used: 3, pending: 1, earned: 4500 };

  return (
    <View>
      <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor, marginBottom: 4 }, el.heading as object]}>
        {s.heading ?? "Refer & Earn"}
      </Text>
      {s.subheading ? (
        <Text style={[{ color: "#888", marginBottom: 16, fontSize: 13 }, el.body as object]}>{s.subheading}</Text>
      ) : <View style={{ marginBottom: 16 }} />}

      {/* Referral code */}
      <View style={[styles.card, { borderColor: colors.accent + "44", backgroundColor: colors.accent + "08", marginBottom: 16, alignItems: "center", gap: 10 }, el.card as object]}>
        <Text style={{ color: "#888", fontSize: 12 }}>Your referral code</Text>
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.accent, letterSpacing: 2 }}>{mockCode}</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent, paddingVertical: 8 }, el.btn as object]}>
          <Feather name="copy" size={14} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.btnText}>Copy link</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Successful", value: mockStats.used, icon: "check-circle" as const },
          { label: "Pending", value: mockStats.pending, icon: "clock" as const },
          { label: "Earned", value: `₦${mockStats.earned.toLocaleString()}`, icon: "award" as const },
        ].map((stat, i) => (
          <View key={i} style={[styles.card, { flex: 1, borderColor: "#e5e5e5", alignItems: "center", gap: 4, padding: 12 }, el.card as object]}>
            <Feather name={stat.icon} size={18} color={colors.accent} />
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.headingColor }}>{stat.value}</Text>
            <Text style={{ fontSize: 11, color: "#888" }}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {s.rewardLabel ? (
        <View style={{ backgroundColor: "#f0fdf4", borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Feather name="gift" size={16} color="#10b981" />
          <Text style={{ color: "#065f46", fontSize: 13, flex: 1 }}>You earn <Text style={{ fontWeight: "700" }}>{s.rewardLabel}</Text> for every friend who orders</Text>
        </View>
      ) : null}
      <Text style={{ textAlign: "center", color: "#bbb", fontSize: 11, marginTop: 12 }}>
        Preview mode — live data loads from your store's API
      </Text>
    </View>
  );
}

function ColumnsBlock({
  s,
  colors,
  onLinkPress,
}: {
  s: ColumnsSection;
  colors: ReturnType<typeof sectionColors>;
  onLinkPress?: (href: string) => void;
}) {
  const el = useContext(SectionElCtx);
  const { width: winWidth } = useWindowDimensions();
  const count = s.count ?? 2;
  const gap = s.gap === "sm" ? 8 : s.gap === "lg" ? 24 : 16;
  const imgRatio = s.imgAspectRatio ?? 1;
  const valign = s.verticalAlign ?? "top";
  const alignItems = valign === "center" ? "center" as const : valign === "bottom" ? "flex-end" as const : "flex-start" as const;
  const variant = (s as any).variant ?? "plain";

  // Exact pixel width to prevent flex-wrap overflow (same fix as GalleryBlock)
  const stack = (s.stackOnMobile !== false) && winWidth < 600;
  const padH = (s as any).paddingXPx ?? 16;
  const availW = winWidth - padH * 2;
  const colW = stack ? availW : Math.floor((availW - gap * (count - 1)) / count);

  const items = s.items.slice(0, count);

  const SectionHeader = () => (s.heading || s.subheading) ? (
    <View style={{ marginBottom: 18 }}>
      {s.heading ? <Text style={[styles.h2, { fontSize: el.h2Size, color: colors.headingColor }, el.heading as object]}>{s.heading}</Text> : null}
      {s.subheading ? <Text style={[{ color: "#888", marginTop: 4, fontSize: 13 }, el.subheading as object]}>{s.subheading}</Text> : null}
    </View>
  ) : null;

  // IMAGE-SIDE: each column is a horizontal card (image left, text right)
  if (variant === "image-side") {
    return (
      <View>
        <SectionHeader />
        <View style={{ gap: gap * 1.5 }}>
          {items.map((col: ColumnItem, i: number) => (
            <View key={i} style={[{ flexDirection: "row", gap: 14, alignItems: "flex-start" }, el.card as object]}>
              {col.imageUri ? (
                <Image source={{ uri: col.imageUri }} style={[{ width: 90, height: 90, borderRadius: 8 }, el.image as object]} contentFit="cover" />
              ) : col.iconName ? (
                <View style={{ width: 50, height: 50, borderRadius: 12, backgroundColor: col.iconBg ?? colors.accent + "18", alignItems: "center", justifyContent: "center" }}>
                  <Feather name={col.iconName as any} size={22} color={col.iconBg ? "#fff" : colors.accent} />
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                {col.heading ? <Text style={[{ fontWeight: "700", fontSize: 16, color: colors.headingColor, marginBottom: 4 }, el.heading as object]}>{col.heading}</Text> : null}
                {col.body ? <Text style={[{ color: "#666", lineHeight: 22, fontSize: 14 }, el.body as object]}>{col.body}</Text> : null}
                {col.ctaLabel ? (
                  <TouchableOpacity onPress={() => col.ctaHref && onLinkPress?.(col.ctaHref)} style={[{ marginTop: 8 }]}>
                    <Text style={[{ color: colors.accent, fontWeight: "600", fontSize: 13 }, el.btn as object]}>{col.ctaLabel} →</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // NUMBERED: large number + heading + body
  if (variant === "numbered") {
    return (
      <View>
        <SectionHeader />
        <View style={{ flexDirection: stack ? "column" : "row", flexWrap: "wrap", gap }}>
          {items.map((col: ColumnItem, i: number) => (
            <View key={i} style={{ width: stack ? availW : colW }}>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                <Text style={[{ fontSize: 44, fontWeight: "900", color: colors.accent + "40", lineHeight: 46, width: 44 }, el.heading as object]}>{String(i + 1).padStart(2, "0")}</Text>
                <View style={{ flex: 1, paddingTop: 4 }}>
                  {col.heading ? <Text style={[{ fontWeight: "700", fontSize: 16, color: colors.headingColor, marginBottom: 4 }, el.heading as object]}>{col.heading}</Text> : null}
                  {col.body ? <Text style={[{ color: "#666", lineHeight: 22, fontSize: 14 }, el.body as object]}>{col.body}</Text> : null}
                  {col.ctaLabel ? (
                    <TouchableOpacity onPress={() => col.ctaHref && onLinkPress?.(col.ctaHref)} style={[styles.btn, { backgroundColor: colors.accent, marginTop: 12, alignSelf: "flex-start" }, el.btn as object]}>
                      <Text style={[styles.btnText, { color: (el.btn as any)?.color ?? "#fff" }]}>{col.ctaLabel}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // FEATURE: accent icon bubble + heading + body, airy spacing
  if (variant === "feature") {
    return (
      <View>
        <SectionHeader />
        <View style={{ flexDirection: stack ? "column" : "row", flexWrap: "wrap", gap }}>
          {items.map((col: ColumnItem, i: number) => (
            <View key={i} style={[{ width: stack ? availW : colW, alignItems: "flex-start" }, el.card as object]}>
              {col.iconName ? (
                <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <Feather name={col.iconName as any} size={24} color="#fff" />
                </View>
              ) : col.imageUri ? (
                <Image source={{ uri: col.imageUri }} style={[{ width: "100%", aspectRatio: imgRatio, borderRadius: 10, marginBottom: 12 }, el.image as object]} contentFit="cover" />
              ) : null}
              {col.heading ? <Text style={[{ fontWeight: "700", fontSize: 17, color: colors.headingColor, marginBottom: 6 }, el.heading as object]}>{col.heading}</Text> : null}
              {col.body ? <Text style={[{ color: "#666", lineHeight: 23, fontSize: 14 }, el.body as object]}>{col.body}</Text> : null}
              {col.ctaLabel ? (
                <TouchableOpacity onPress={() => col.ctaHref && onLinkPress?.(col.ctaHref)} style={{ marginTop: 12 }}>
                  <Text style={[{ color: colors.accent, fontWeight: "600", fontSize: 13 }, el.btn as object]}>{col.ctaLabel} →</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    );
  }

  // CARDS: each column in a bordered elevated card
  if (variant === "cards") {
    return (
      <View>
        <SectionHeader />
        <View style={{ flexDirection: stack ? "column" : "row", flexWrap: "wrap", gap }}>
          {items.map((col: ColumnItem, i: number) => (
            <View key={i} style={[styles.card, { width: stack ? availW : colW, alignItems }, el.card as object]}>
              {col.imageUri ? (
                <Image source={{ uri: col.imageUri }} style={[{ width: "100%", aspectRatio: imgRatio, borderRadius: 6, marginBottom: 12 }, el.image as object]} contentFit="cover" />
              ) : null}
              {col.iconName ? (
                <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: col.iconBg ?? colors.accent + "18", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <Feather name={col.iconName as any} size={20} color={col.iconBg ? "#fff" : colors.accent} />
                </View>
              ) : null}
              {col.heading ? <Text style={[{ fontWeight: "700", fontSize: 16, color: colors.headingColor, marginBottom: 6 }, el.heading as object]}>{col.heading}</Text> : null}
              {col.body ? <Text style={[{ color: "#666", lineHeight: 22, fontSize: 14 }, el.body as object]}>{col.body}</Text> : null}
              {col.ctaLabel ? (
                <TouchableOpacity onPress={() => col.ctaHref && onLinkPress?.(col.ctaHref)} style={[styles.btn, { backgroundColor: colors.accent, marginTop: 12, alignSelf: "flex-start" }, el.btn as object]}>
                  <Text style={[styles.btnText, { color: (el.btn as any)?.color ?? "#fff" }]}>{col.ctaLabel}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    );
  }

  // PLAIN (default): clean columns, no card border, icon/image top, exact pixel widths
  return (
    <View>
      <SectionHeader />
      <View style={{ flexDirection: stack ? "column" : "row", flexWrap: "wrap", gap }}>
        {items.map((col: ColumnItem, i: number) => (
          <View key={i} style={[{ width: stack ? availW : colW, alignItems }, el.card as object]}>
            {col.imageUri ? (
              <Image source={{ uri: col.imageUri }} style={[{ width: "100%", aspectRatio: imgRatio, borderRadius: 8, marginBottom: 12 }, el.image as object]} contentFit="cover" contentPosition="center" />
            ) : null}
            {col.iconName ? (
              <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: col.iconBg ?? colors.accent + "18", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Feather name={col.iconName as any} size={22} color={col.iconBg ? "#fff" : colors.accent} />
              </View>
            ) : null}
            {col.heading ? <Text style={[{ fontWeight: "700", fontSize: 16, color: colors.headingColor, marginBottom: 6 }, el.heading as object]}>{col.heading}</Text> : null}
            {col.body ? <Text style={[{ color: "#666", lineHeight: 22, fontSize: 14 }, el.body as object]}>{col.body}</Text> : null}
            {col.ctaLabel ? (
              <TouchableOpacity onPress={() => col.ctaHref && onLinkPress?.(col.ctaHref)} style={[styles.btn, { backgroundColor: colors.accent, marginTop: 12, alignSelf: "flex-start" }, el.btn as object]}>
                <Text style={[styles.btnText, { color: (el.btn as any)?.color ?? "#fff" }]}>{col.ctaLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  h2: { fontSize: 22, fontWeight: "700" },
  btn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 24 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  card: { borderWidth: 1, borderRadius: 10, padding: 14 },
  inputRow: { flexDirection: "row", gap: 8, width: "100%" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  filterChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
});

// ─── Custom Section (free block canvas renderer) ───────────────────────────────

const GAP_MAP: Record<string, number> = { none: 0, sm: 8, md: 16, lg: 24 };

/** Convert a CSS-ish length (px/rem/em/%/unitless) to a React Native value. */
function pxNum(v: any): number | string | undefined {
  if (v == null || v === "") return undefined;
  if (typeof v === "number") return v;
  const s = String(v).trim();
  if (!s) return undefined;
  if (s.endsWith("px")) return parseFloat(s);
  if (s.endsWith("rem") || s.endsWith("em")) return parseFloat(s) * 16;
  if (s.endsWith("%")) return s;
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  return undefined;
}

/** Expand CSS padding shorthand ("10px 20px", "1rem", …) into RN padding. */
function parsePadding(v?: string): Partial<Record<"paddingTop"|"paddingBottom"|"paddingLeft"|"paddingRight", number>> | undefined {
  if (!v) return undefined;
  const parts = v.trim().split(/\s+/).map(pxNum);
  if (!parts.length || parts.some((p) => p === undefined || typeof p !== "number")) return undefined;
  const [a, b, c, d] = parts as number[];
  if (parts.length === 1) return { paddingTop: a, paddingRight: a, paddingBottom: a, paddingLeft: a };
  if (parts.length === 2) return { paddingTop: a, paddingRight: b, paddingBottom: a, paddingLeft: b };
  if (parts.length === 3) return { paddingTop: a, paddingRight: b, paddingBottom: c, paddingLeft: b };
  return { paddingTop: a, paddingRight: b, paddingBottom: c, paddingLeft: d };
}

/** Per-block wrapper styles the web editor exposes (maxWidth, alignment, margins, opacity). */
function blockWrapStyle(styles?: import("@/lib/storefront").BlockStyles): Record<string, any> {
  const st = styles ?? {};
  const out: Record<string, any> = {};
  if (st.alignSelf) out.alignSelf = st.alignSelf;
  const maxW = pxNum(st.maxWidth);
  if (maxW !== undefined) out.maxWidth = maxW;
  const mt = pxNum(st.marginTop);
  if (mt !== undefined) out.marginTop = mt;
  const mb = pxNum(st.marginBottom);
  if (mb !== undefined) out.marginBottom = mb;
  if (st.opacity !== undefined) out.opacity = Number(st.opacity);
  const p = parsePadding(st.padding);
  if (p) Object.assign(out, p);
  return out;
}

/** Run a BlockAction. Internal paths go through onLinkPress; external links open directly. */
function runBlockAction(action: import("@/lib/storefront").BlockAction | undefined, onLinkPress?: (href: string) => void) {
  if (!action || action.type === "none") return;
  if (action.type === "navigate") {
    const href = action.href;
    if (/^(https?:|mailto:|tel:|whatsapp:)/i.test(href)) {
      Linking.openURL(href).catch(() => {});
    } else {
      onLinkPress?.(href);
    }
  } else if (action.type === "whatsapp") {
    const clean = (action.number ?? "").replace(/\D/g, "");
    const url = `https://wa.me/${clean}${action.message ? `?text=${encodeURIComponent(action.message)}` : ""}`;
    Linking.openURL(url).catch(() => {});
  }
  // open-cart / open-search / scroll-top: no-op in the mobile preview
}

/** Simple mount animation for blocks that carry an animation preset. */
function BlockReveal({ animation, style, children }: { animation?: string; style?: Record<string, any>; children: React.ReactNode }) {
  const hidden = !!animation && animation !== "none";
  const opacity = useRef(new Animated.Value(hidden ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(hidden ? 24 : 0)).current;
  useEffect(() => {
    if (!hidden) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}

function useCountdown(targetDate: string) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(targetDate).getTime() - Date.now()));
  useEffect(() => {
    if (!targetDate) return;
    const id = setInterval(() => setLeft(Math.max(0, new Date(targetDate).getTime() - Date.now())), 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  const s = Math.floor(left / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60, done: left <= 0 };
}

/** Feather-first icon with Ionicons fallback (web editor may use either set). */
function BlockIcon({ name, size, color }: { name?: string; size?: number; color?: string }) {
  if (name && (name as string) in Feather.glyphMap) {
    return <Feather name={name as keyof typeof Feather.glyphMap} size={size ?? 24} color={color ?? "#4f46e5"} />;
  }
  return <Ionicons name={(name ?? "star-outline") as any} size={size ?? 24} color={color ?? "#4f46e5"} />;
}

function KioskBlockRenderer({ block, elStyles, colors, onAction }: {
  block: CustomBlock;
  elStyles?: Record<string, Record<string, any>>;
  colors: ReturnType<typeof sectionColors>;
  onAction?: (action: import("@/lib/storefront").BlockAction) => void;
}) {
  const fg = colors.color;
  const accent = colors.accent;
  const fire = (action?: import("@/lib/storefront").BlockAction) => {
    if (action && action.type !== "none" && onAction) onAction(action);
  };
  const [accordionOpen, setAccordionOpen] = useState<Record<string, boolean>>({});
  const [slideshowIdx, setSlideshowIdx] = useState(0);
  const [slideshowW, setSlideshowW] = useState(0);
  const cdTarget = block.type === "countdown" ? (block as import("@/lib/storefront").CountdownBlock).targetDate ?? "" : "";
  const countdownT = useCountdown(cdTarget);

  if (block.type === "text") {
    const b = block as import("@/lib/storefront").TextBlock;
    const isHeading = b.tag && ["h1","h2","h3","h4"].includes(b.tag);
    const sectionStyle = elStyles?.[isHeading ? "heading" : "body"] ?? {};
    const st = b.styles ?? {};
    const tagSizes: Record<string, number> = { h1: 28, h2: 22, h3: 18, h4: 16, p: 15, span: 14, label: 13 };
    const fontSize = Number(pxNum(st.fontSize) ?? sectionStyle.fontSize ?? tagSizes[b.tag ?? "p"] ?? 15);
    const pad = parsePadding(st.padding);
    return (
      <BlockReveal animation={b.animation}>
        <Text style={[{
          color: sectionStyle.color ?? st.color ?? (isHeading ? colors.headingColor : fg),
          fontSize,
          fontWeight: (sectionStyle.fontWeight ?? st.fontWeight ?? (isHeading ? "700" : "400")) as any,
          textAlign: (st.textAlign ?? "left") as any,
          marginTop: Number(pxNum(st.marginTop) ?? 0),
          marginBottom: Number(pxNum(st.marginBottom) ?? 0),
          backgroundColor: st.backgroundColor as any,
          borderRadius: Number(pxNum(st.borderRadius) ?? 0),
          opacity: st.opacity !== undefined ? Number(st.opacity) : 1,
          ...(pad as any),
        }]}>
          {b.content ?? ""}
        </Text>
      </BlockReveal>
    );
  }

  if (block.type === "button") {
    const b = block as import("@/lib/storefront").ButtonBlock;
    const sectionStyle = elStyles?.button ?? {};
    const st = b.styles ?? {};
    const bg = sectionStyle.backgroundColor ?? st.backgroundColor ?? accent;
    return (
      <BlockReveal animation={b.animation}>
        <TouchableOpacity
          onPress={() => fire(b.action)}
          style={{
            backgroundColor: bg,
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: Number(pxNum(sectionStyle.borderRadius ?? st.borderRadius) ?? 24),
            alignSelf: st.alignSelf === "center" ? "center" : st.alignSelf === "flex-end" ? "flex-end" : "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
          activeOpacity={0.8}
        >
          {b.iconName && b.iconPos !== "right" ? <BlockIcon name={b.iconName} size={14} color={sectionStyle.color ?? st.color ?? "#fff"} /> : null}
          <Text style={{ color: sectionStyle.color ?? st.color ?? "#fff", fontWeight: "600", fontSize: 14 }}>
            {b.label ?? "Button"}
          </Text>
          {b.iconName && b.iconPos === "right" ? <BlockIcon name={b.iconName} size={14} color={sectionStyle.color ?? st.color ?? "#fff"} /> : null}
        </TouchableOpacity>
      </BlockReveal>
    );
  }

  if (block.type === "icon") {
    const b = block as import("@/lib/storefront").IconBlock;
    const st = b.styles ?? {};
    return (
      <BlockReveal animation={b.animation}>
        <TouchableOpacity onPress={() => fire(b.action)} activeOpacity={b.action ? 0.7 : 1} disabled={!b.action || b.action.type === "none"} style={{ alignSelf: st.alignSelf === "center" ? "center" : st.alignSelf === "flex-end" ? "flex-end" : "flex-start" }}>
          <BlockIcon name={b.name} size={b.size ?? 24} color={b.color ?? accent} />
        </TouchableOpacity>
      </BlockReveal>
    );
  }

  if (block.type === "image") {
    const b = block as import("@/lib/storefront").ImageBlock;
    if (!b.src) return null;
    const st = b.styles ?? {};
    const w = pxNum(st.width);
    const h = pxNum(st.height);
    const objFit = (st.objectFit ?? "cover") as any;
    return (
      <BlockReveal animation={b.animation}>
        <Image
          source={{ uri: b.src }}
          alt={b.alt ?? ""}
          style={{
            width: (w ?? "100%") as any,
            height: h !== undefined ? (h as any) : undefined,
            aspectRatio: h !== undefined ? undefined : 16 / 9,
            borderRadius: Number(pxNum(st.borderRadius) ?? 8),
            objectFit: objFit,
          }}
          contentFit={objFit}
        />
      </BlockReveal>
    );
  }

  if (block.type === "spacer") {
    const b = block as import("@/lib/storefront").SpacerBlock;
    return <View style={{ height: b.height ?? 16 }} />;
  }

  if (block.type === "divider") {
    const b = block as import("@/lib/storefront").DividerBlock;
    return (
      <View style={{
        height: b.thickness ?? 1,
        backgroundColor: b.color === "currentColor" ? "#e5e7eb" : b.color ?? "#e5e7eb",
        marginVertical: b.marginY ?? 8,
        width: "100%",
      }} />
    );
  }

  if (block.type === "badge") {
    const b = block as import("@/lib/storefront").BadgeBlock;
    return (
      <BlockReveal animation={b.animation}>
        <View style={{ backgroundColor: b.bgColor ?? accent, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" }}>
          <Text style={{ color: b.color ?? "#fff", fontSize: 11, fontWeight: "600" }}>{b.text ?? "Badge"}</Text>
        </View>
      </BlockReveal>
    );
  }

  if (block.type === "list") {
    const b = block as import("@/lib/storefront").ListBlock;
    const items = b.items ?? [];
    return (
      <BlockReveal animation={b.animation}>
        <View style={{ gap: 6 }}>
          {items.map((it, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
              {b.ordered ? (
                <Text style={{ color: accent, fontWeight: "700", fontSize: 14 }}>{i + 1}.</Text>
              ) : b.iconName ? (
                <BlockIcon name={b.iconName} size={14} color={accent} />
              ) : (
                <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: accent, marginTop: 7 }} />
              )}
              <Text style={{ color: fg, fontSize: 14, lineHeight: 21, flex: 1 }}>{it}</Text>
            </View>
          ))}
        </View>
      </BlockReveal>
    );
  }

  if (block.type === "card") {
    const b = block as import("@/lib/storefront").CardBlock;
    const radius = { none: 0, sm: 6, md: 12, lg: 18 }[b.radius ?? "md"] ?? 12;
    return (
      <BlockReveal animation={b.animation}>
        <View style={[{
          borderRadius: radius,
          overflow: "hidden",
          borderWidth: b.bordered === false ? 0 : 1,
          borderColor: "#e5e5e5",
          backgroundColor: "#fff",
          shadowColor: "#000",
          shadowOpacity: b.shadow && b.shadow !== "none" ? (b.shadow === "lg" ? 0.18 : b.shadow === "md" ? 0.12 : 0.08) : 0,
          shadowRadius: b.shadow === "lg" ? 16 : b.shadow === "md" ? 10 : 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: b.shadow && b.shadow !== "none" ? 3 : 0,
        }]}>
          {b.image ? <Image source={{ uri: b.image }} style={{ width: "100%", height: b.imageHeight ?? 160 }} contentFit="cover" /> : null}
          <View style={{ padding: 14, gap: 6 }}>
            {b.title ? <Text style={{ fontSize: 16, fontWeight: "700", color: colors.headingColor }}>{b.title}</Text> : null}
            {b.body ? <Text style={{ fontSize: 13, color: "#666", lineHeight: 19 }}>{b.body}</Text> : null}
            {b.ctaLabel ? (
              <TouchableOpacity onPress={() => fire(b.ctaAction)} activeOpacity={0.8} style={{ alignSelf: "flex-start", backgroundColor: accent, paddingVertical: 9, paddingHorizontal: 18, borderRadius: 22, marginTop: 6 }}>
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>{b.ctaLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </BlockReveal>
    );
  }

  if (block.type === "form") {
    const b = block as import("@/lib/storefront").FormBlock;
    const fields = b.fields ?? [];
    const [vals, setVals] = useState<Record<string, string>>({});
    const submit = async () => {
      const lines = fields.map((f) => `${f.label}: ${vals[f.id] ?? ""}`).join("\n");
      const sa = b.submitAction;
      if (sa?.type === "whatsapp") {
        const clean = (sa.number ?? "").replace(/\D/g, "");
        Linking.openURL(`https://wa.me/${clean}?text=${encodeURIComponent(lines)}`).catch(() => {});
      } else if (sa?.type === "email") {
        Linking.openURL(`mailto:${sa.to}?subject=${encodeURIComponent("New form submission")}&body=${encodeURIComponent(lines)}`).catch(() => {});
      } else if (sa?.type === "webhook") {
        try {
          const values: Record<string, string> = {};
          for (const f of fields) values[f.label] = vals[f.id] ?? "";
          await fetch(sa.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ submittedAt: new Date().toISOString(), values }),
          });
          Alert.alert("Form submitted", b.successMessage ?? "Thanks! Your form was submitted.");
        } catch {
          Alert.alert("Something went wrong", "We couldn't send your submission. Please try again.");
        }
      } else {
        Alert.alert("Form submitted", b.successMessage ?? "Thanks! Your form was submitted.");
      }
    };
    return (
      <BlockReveal animation={b.animation}>
        <View style={{ gap: 10, width: "100%" }}>
          {fields.map((f) => (
            <View key={f.id} style={{ gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: fg }}>{f.label}{f.required ? " *" : ""}</Text>
              {f.fieldType === "file" ? (
                <TouchableOpacity
                  onPress={async () => {
                    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
                    if (res.canceled || !res.assets?.[0]) return;
                    setVals((p) => ({ ...p, [f.id]: res.assets[0].name ?? "file" }));
                  }}
                  activeOpacity={0.8}
                  style={{ borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 8, padding: 12, backgroundColor: "#fafafa", alignItems: "center" }}
                >
                  <Feather name="upload" size={16} color={accent} />
                  <Text style={{ color: vals[f.id] ? fg : "#999", fontSize: 13, marginTop: 4 }}>
                    {vals[f.id] ? `Selected: ${vals[f.id]}` : "Tap to upload a file"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TextInput
                  value={vals[f.id] ?? ""}
                  onChangeText={(t) => setVals((p) => ({ ...p, [f.id]: t }))}
                  placeholder={f.placeholder}
                  placeholderTextColor="#999"
                  multiline={f.fieldType === "textarea"}
                  style={{ borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 8, padding: 10, color: fg, minHeight: f.fieldType === "textarea" ? 72 : 44 }}
                />
              )}
            </View>
          ))}
          <TouchableOpacity onPress={submit} activeOpacity={0.85} style={{ backgroundColor: accent, borderRadius: 10, paddingVertical: 12, alignItems: "center" }}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>{b.submitLabel ?? "Submit"}</Text>
          </TouchableOpacity>
        </View>
      </BlockReveal>
    );
  }

  if (block.type === "row") {
    const b = block as import("@/lib/storefront").RowBlock;
    const cols = b.cols ?? [];
    const { width: winW } = useWindowDimensions();
    const stack = (b.stackOnMobile ?? true) && winW < 768;
    const gap = GAP_MAP[b.gap ?? "md"];
    return (
      <BlockReveal animation={undefined}>
        <View style={{ flexDirection: stack ? "column" : "row", gap, width: "100%", alignItems: b.verticalAlign === "bottom" ? "flex-end" : b.verticalAlign === "center" ? "center" : "flex-start" }}>
          {cols.map((col, i) => (
            <View key={i} style={{ flex: stack ? undefined : 1, width: stack ? "100%" : undefined, gap: Math.round(gap * 0.5) }}>
              {col.map((child) => <KioskBlockRenderer key={child.id} block={child} elStyles={elStyles} colors={colors} onAction={onAction} />)}
            </View>
          ))}
        </View>
      </BlockReveal>
    );
  }

  if (block.type === "video") {
    const b = block as import("@/lib/storefront").VideoBlock;
    const st = b.styles ?? {};
    const height = Number(pxNum(st.height) ?? 180);
    const radius = Number(pxNum(st.borderRadius) ?? 8);
    return (
      <BlockReveal animation={b.animation}>
        <View style={{ width: (st.maxWidth ?? "100%") as any, alignSelf: (st.alignSelf ?? "stretch") as any }}>
          <View style={{ height, backgroundColor: st.backgroundColor ?? "#111", borderRadius: radius, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
            {b.url ? (
              <Video
                source={{ uri: b.url }}
                style={{ width: "100%", height: "100%" }}
                useNativeControls
                shouldPlay={false}
                resizeMode={ResizeMode.CONTAIN}
              />
            ) : (
              <>
                <Feather name="play-circle" size={40} color="#666" />
                <Text style={{ color: "#888", fontSize: 11, marginTop: 6 }} numberOfLines={1}>Add a video URL or upload one</Text>
              </>
            )}
          </View>
          {b.caption ? <Text style={{ fontSize: 12, color: fg, marginTop: 6, textAlign: "center" }}>{b.caption}</Text> : null}
        </View>
      </BlockReveal>
    );
  }

  if (block.type === "accordion") {
    const b = block as import("@/lib/storefront").AccordionBlock;
    const items = b.items ?? [];
    const open = accordionOpen;
    const setOpen = setAccordionOpen;
    return (
      <BlockReveal animation={b.animation}>
        <View style={{ gap: 8 }}>
          {items.map((it) => {
            const isOpen = open[it.id] ?? false;
            return (
              <TouchableOpacity key={it.id} onPress={() => setOpen((p) => ({ ...p, [it.id]: !isOpen }))} style={{ borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, padding: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontWeight: "600", color: colors.headingColor, flex: 1 }}>{it.title}</Text>
                  <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={fg} />
                </View>
                {isOpen ? <Text style={{ marginTop: 8, color: "#666", lineHeight: 20 }}>{it.body}</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </BlockReveal>
    );
  }

  if (block.type === "countdown") {
    const b = block as import("@/lib/storefront").CountdownBlock;
    const t = countdownT;
    const cell = (v: number, l: string) => (
      <View style={{ alignItems: "center", backgroundColor: accent + "18", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, minWidth: 52 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: fg }}>{String(v).padStart(2, "0")}</Text>
        {b.showLabels ? <Text style={{ fontSize: 10, color: "#999", marginTop: 2 }}>{l}</Text> : null}
      </View>
    );
    return (
      <BlockReveal animation={b.animation}>
        <View style={{ gap: 6 }}>
          {b.label ? <Text style={{ fontWeight: "600", color: fg }}>{b.label}</Text> : null}
          {t.done && b.expiredText ? (
            <Text style={{ color: fg }}>{b.expiredText}</Text>
          ) : (
            <View style={{ flexDirection: "row", gap: 8 }}>
              {cell(t.days, "days")}
              {cell(t.hours, "hrs")}
              {cell(t.minutes, "min")}
              {cell(t.seconds, "sec")}
            </View>
          )}
        </View>
      </BlockReveal>
    );
  }

  if (block.type === "slideshow") {
    const b = block as import("@/lib/storefront").SlideshowBlock;
    const slides = b.slides ?? [];
    const [idx, setIdx] = [slideshowIdx, setSlideshowIdx];
    const [containerW, setContainerW] = [slideshowW, setSlideshowW];
    const ratio = { "16:9": 16 / 9, "4:3": 4 / 3, "1:1": 1, "3:2": 3 / 2 }[b.ratio ?? "16:9"] ?? 16 / 9;
    if (slides.length === 0) return null;
    const slideW = containerW || 1;
    return (
      <BlockReveal animation={b.animation}>
        <View
          style={{ width: "100%", aspectRatio: ratio, borderRadius: 8, overflow: "hidden", backgroundColor: "#e5e5e5" }}
          onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}
        >
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / Math.max(e.nativeEvent.layoutMeasurement.width, 1)))}
          >
            {slides.map((s, i) =>
              s.src ? (
                <Image key={i} source={{ uri: s.src }} style={{ width: slideW, aspectRatio: ratio }} contentFit="cover" />
              ) : (
                <View key={i} style={{ width: slideW, aspectRatio: ratio, alignItems: "center", justifyContent: "center" }}>
                  <Feather name="image" size={28} color="#999" />
                </View>
              ),
            )}
          </ScrollView>
          {b.showDots && slides.length > 1 ? (
            <View style={{ position: "absolute", bottom: 8, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 5 }}>
              {slides.map((_, i) => (
                <View key={i} style={{ width: i === idx ? 14 : 6, height: 6, borderRadius: 3, backgroundColor: i === idx ? accent : "rgba(255,255,255,0.6)" }} />
              ))}
            </View>
          ) : null}
        </View>
      </BlockReveal>
    );
  }

  if (block.type === "product-embed") {
    const b = block as import("@/lib/storefront").ProductEmbedBlock;
    const prod = b.productSlug ? getProduct(b.productSlug) : undefined;
    if (!prod) return null;
    return (
      <BlockReveal animation={b.animation}>
        <TouchableOpacity activeOpacity={0.85} onPress={() => fire({ type: "navigate", href: `/product/${prod.slug}` })}>
          <View style={{ flexDirection: "row", gap: 12, borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 12, padding: 12, alignItems: "center" }}>
            {prod.image ? <Image source={{ uri: prod.image }} style={{ width: 64, height: 64, borderRadius: 8 }} contentFit="cover" /> : null}
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontWeight: "600", color: colors.headingColor }} numberOfLines={2}>{prod.name}</Text>
              <Text style={{ color: accent, fontWeight: "700" }}>{formatPrice(prod.price)}</Text>
              {b.showDescription && prod.description ? <Text style={{ fontSize: 12, color: "#666", lineHeight: 18 }} numberOfLines={3}>{prod.description}</Text> : null}
            </View>
            <Feather name="chevron-right" size={18} color="#999" />
          </View>
        </TouchableOpacity>
      </BlockReveal>
    );
  }

  if (block.type === "group") {
    const b = block as GroupBlock;
    const dir = b.direction ?? "column";
    const gap = GAP_MAP[b.gap ?? "md"];
    return (
      <BlockReveal animation={b.animation}>
        <View style={{
          flexDirection: dir === "column" ? "column" : "row",
          flexWrap: dir === "row-wrap" ? "wrap" : "nowrap",
          gap,
          width: "100%",
          alignItems: b.align === "center" ? "center" : b.align === "end" ? "flex-end" : b.align === "stretch" ? "stretch" : "flex-start",
          backgroundColor: b.styles?.backgroundColor as any,
          borderRadius: b.styles?.borderRadius ? Number(pxNum(b.styles.borderRadius)) : undefined,
          padding: b.styles?.padding ? Number(pxNum(b.styles.padding)) : undefined,
        }}>
          {b.children.map((child) => (
            <KioskBlockRenderer key={child.id} block={child} elStyles={elStyles} colors={colors} onAction={onAction} />
          ))}
        </View>
      </BlockReveal>
    );
  }

  if (block.type === "layout-box") {
    const b = block as LayoutBoxBlock;
    const gap = GAP_MAP[b.gap ?? "md"];
    const cols = b.columns ?? 2;
    const isGrid = b.layout === "grid" || !b.layout;
    if (isGrid) {
      const itemWidth = `${Math.floor(100 / cols) - 1}%`;
      return (
        <BlockReveal animation={b.animation}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap, width: "100%" }}>
            {b.children.map((child) => (
              <View key={child.id} style={{ width: itemWidth as any, minWidth: 0 }}>
                <KioskBlockRenderer block={child} elStyles={elStyles} colors={colors} onAction={onAction} />
              </View>
            ))}
          </View>
        </BlockReveal>
      );
    }
    const dir = b.direction ?? "row";
    return (
      <BlockReveal animation={b.animation}>
        <View style={{
          flexDirection: dir === "column" ? "column" : "row",
          flexWrap: dir === "row-wrap" ? "wrap" : "nowrap",
          gap,
          width: "100%",
        }}>
          {b.children.map((child) => (
            <KioskBlockRenderer key={child.id} block={child} elStyles={elStyles} colors={colors} onAction={onAction} />
          ))}
        </View>
      </BlockReveal>
    );
  }

  return null;
}

function CustomSectionBlock({ s, colors, onAction }: {
  s: CustomSection;
  colors: ReturnType<typeof sectionColors>;
  onAction?: (action: import("@/lib/storefront").BlockAction) => void;
}) {
  const gapPx = GAP_MAP[s.gap ?? "md"];
  const direction = (s as any).direction ?? "column";
  const PX: Record<string, number> = { none: 0, sm: 24, md: 48, lg: 80 };
  const PY: Record<string, number> = { none: 0, sm: 24, md: 40, lg: 80 };
  const px = PX[(s as any).paddingX ?? "none"];
  const py = PY[(s as any).paddingY ?? "none"];
  const alignMap: Record<string, "flex-start" | "center" | "flex-end" | "stretch"> = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch" };
  const justifyMap: Record<string, "flex-start" | "center" | "flex-end"> = { start: "flex-start", center: "center", end: "flex-end" };
  return (
    <View style={{
      gap: gapPx,
      width: "100%",
      paddingHorizontal: px,
      paddingVertical: py,
      flexDirection: direction === "column" ? "column" : "row",
      flexWrap: direction === "row-wrap" ? "wrap" : "nowrap",
      alignItems: direction === "column" ? alignMap[s.align ?? "start"] : undefined,
      justifyContent: direction !== "column" ? justifyMap[s.align ?? "start"] : undefined,
    }}>
      {s.blocks.map((block) => {
        const bs = (block as any).styles ?? {};
        const wrap = blockWrapStyle(bs);
        const inner = <KioskBlockRenderer block={block} elStyles={s.elStyles} colors={colors} onAction={onAction} />;
        return Object.keys(wrap).length
          ? <View key={block.id} style={wrap}>{inner}</View>
          : <View key={block.id}>{inner}</View>;
      })}
    </View>
  );
}

// ─── New section blocks ───────────────────────────────────────────────────────

function VideoHeroBlock({ s, colors, onLinkPress }: { s: VideoHeroSection; colors: ReturnType<typeof sectionColors>; onLinkPress?: (href: string) => void }) {
  const el = useContext(SectionElCtx);
  const heightMap = { sm: 220, md: 300, lg: 400, full: 500 };
  const h = heightMap[s.height ?? "lg"];
  const textAlign = s.align ?? "center";
  const alignItems = textAlign === "left" ? "flex-start" : textAlign === "right" ? "flex-end" : "center";
  const opacity = s.overlayOpacity ?? 0.45;
  const variant = (s as any).variant ?? "overlay";

  const ctaBtn = s.ctaLabel ? (
    <TouchableOpacity
      onPress={() => onLinkPress?.((s.ctaLink as string) ?? "/shop")}
      style={{ marginTop: 8, backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, alignSelf: "flex-start" }}
    >
      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>{s.ctaLabel}</Text>
    </TouchableOpacity>
  ) : null;

  // SPLIT: image fills left half, text fills right half
  if (variant === "split") {
    return (
      <View style={{ flexDirection: "row", minHeight: 260 }}>
        <View style={{ flex: 1, overflow: "hidden" }}>
          {s.posterImage ? (
            <Image source={{ uri: s.posterImage }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          ) : (
            <View style={{ flex: 1, backgroundColor: "#1a1a2e" }} />
          )}
        </View>
        <View style={{ flex: 1, padding: 24, gap: 10, justifyContent: "center", backgroundColor: colors.backgroundColor ?? "#fff" }}>
          {s.heading ? (
            <Text style={[{ fontSize: 24, fontWeight: "800", color: colors.headingColor, letterSpacing: -0.3 }, el.heading as object]}>{s.heading}</Text>
          ) : null}
          {s.subheading ? (
            <Text style={{ fontSize: 14, color: colors.color, lineHeight: 20 }}>{s.subheading}</Text>
          ) : null}
          {ctaBtn}
        </View>
      </View>
    );
  }

  // MINIMAL: text above a smaller image thumbnail
  if (variant === "minimal") {
    return (
      <View style={{ gap: 14 }}>
        <View style={{ gap: 8 }}>
          {s.heading ? (
            <Text style={[{ fontSize: 24, fontWeight: "800", color: colors.headingColor }, el.heading as object]}>{s.heading}</Text>
          ) : null}
          {s.subheading ? (
            <Text style={{ fontSize: 14, color: colors.color, lineHeight: 20 }}>{s.subheading}</Text>
          ) : null}
          {ctaBtn}
        </View>
        {s.posterImage ? (
          <View style={{ height: 160, borderRadius: 12, overflow: "hidden" }}>
            <Image source={{ uri: s.posterImage }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          </View>
        ) : null}
      </View>
    );
  }

  // OVERLAY (default): full-bleed image with text overlay
  return (
    <View style={{ height: h, overflow: "hidden" }}>
      {s.posterImage ? (
        <Image source={{ uri: s.posterImage }} style={{ ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" }} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#1a1a2e" }]} />
      )}
      <LinearGradient colors={[`rgba(0,0,0,${opacity})`, `rgba(0,0,0,${opacity})`]} style={StyleSheet.absoluteFillObject} />
      <View style={{ flex: 1, justifyContent: "center", alignItems, padding: 24, gap: 12 }}>
        {s.heading ? (
          <Text style={[{ fontSize: 30, fontWeight: "800", color: "#fff", letterSpacing: -0.5, textAlign }, el.heading as object]}>
            {s.heading}
          </Text>
        ) : null}
        {s.subheading ? (
          <Text style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", textAlign, lineHeight: 22 }}>
            {s.subheading}
          </Text>
        ) : null}
        {s.ctaLabel ? (
          <TouchableOpacity
            onPress={() => onLinkPress?.((s.ctaLink as string) ?? "/shop")}
            style={{ marginTop: 8, backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, alignSelf: alignItems === "center" ? "center" : alignItems === "flex-end" ? "flex-end" : "flex-start" }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>{s.ctaLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function SocialFeedBlock({ s, colors, onLinkPress }: { s: SocialFeedSection; colors: ReturnType<typeof sectionColors>; onLinkPress?: (href: string) => void }) {
  const el = useContext(SectionElCtx);
  const { width: winWidth } = useWindowDimensions();
  const cols = s.columns ?? 3;
  const cellSize = (winWidth - 2) / cols;
  const posts = s.posts ?? [];
  const isEmpty = posts.length === 0;
  const variant = (s as any).variant ?? "grid";

  const placeholder: Array<{ imageUri: string; caption?: string; link?: string }> = Array.from({ length: 6 }, (_, i) => ({ imageUri: "", caption: `Post ${i + 1}` }));
  const displayPosts = isEmpty ? placeholder : posts;

  const header = (
    <>
      {s.heading ? (
        <Text style={[{ fontSize: el.h2Size, fontWeight: "700", color: colors.headingColor, textAlign: "center", marginBottom: 8 }, el.heading as object]}>
          {s.heading}
        </Text>
      ) : null}
      {s.showHandle && s.handle ? (
        <Text style={{ textAlign: "center", color: colors.color, fontSize: 13, marginBottom: 12, opacity: 0.65 }}>{s.handle}</Text>
      ) : null}
    </>
  );

  const PostCell = ({ post, style }: { post: typeof displayPosts[0]; style?: object }) => (
    <TouchableOpacity
      onPress={() => post.link ? onLinkPress?.(post.link) : undefined}
      style={style}
      activeOpacity={post.link ? 0.8 : 1}
    >
      {post.imageUri ? (
        <Image source={{ uri: post.imageUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
      ) : (
        <View style={{ width: "100%", height: "100%", backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth, borderColor: "#e5e7eb" }}>
          <Ionicons name="image-outline" size={24} color="#bbb" />
        </View>
      )}
    </TouchableOpacity>
  );

  // SCROLLER: horizontal row with captions below each post
  if (variant === "scroller") {
    const pw = Math.min(200, winWidth * 0.65);
    return (
      <View style={{ gap: 8 }}>
        {header}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 2 }}>
          {displayPosts.map((post, i) => (
            <TouchableOpacity key={i} onPress={() => post.link ? onLinkPress?.(post.link) : undefined} activeOpacity={post.link ? 0.8 : 1} style={{ width: pw }}>
              <View style={{ height: pw, borderRadius: 12, overflow: "hidden" }}>
                <PostCell post={post} style={{ width: "100%", height: "100%" }} />
              </View>
              {post.caption ? (
                <Text style={{ fontSize: 12, color: colors.color, marginTop: 4, opacity: 0.7 }} numberOfLines={2}>{post.caption}</Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
        {isEmpty && <Text style={{ textAlign: "center", color: colors.color, fontSize: 13, opacity: 0.6 }}>Add posts via the web editor.</Text>}
      </View>
    );
  }

  // MASONRY: alternating tall/short cells
  if (variant === "masonry") {
    const half = (winWidth - 32 - 6) / 2;
    const left = displayPosts.filter((_, i) => i % 2 === 0);
    const right = displayPosts.filter((_, i) => i % 2 !== 0);
    const MasonryCol = ({ items }: { items: typeof displayPosts }) => (
      <View style={{ flex: 1, gap: 6 }}>
        {items.map((post, i) => (
          <TouchableOpacity key={i} onPress={() => post.link ? onLinkPress?.(post.link) : undefined} activeOpacity={post.link ? 0.8 : 1} style={{ borderRadius: 10, overflow: "hidden", height: i % 2 === 0 ? 180 : 130 }}>
            <PostCell post={post} style={{ width: "100%", height: "100%" }} />
          </TouchableOpacity>
        ))}
      </View>
    );
    return (
      <View style={{ gap: 8 }}>
        {header}
        <View style={{ flexDirection: "row", gap: 6 }}>
          <MasonryCol items={left} />
          <MasonryCol items={right} />
        </View>
        {isEmpty && <Text style={{ textAlign: "center", color: colors.color, fontSize: 13, opacity: 0.6 }}>Add posts via the web editor.</Text>}
      </View>
    );
  }

  // GRID (default): square tiled grid
  return (
    <View>
      {header}
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {displayPosts.map((post, i) => (
          <PostCell key={i} post={post} style={{ width: cellSize, height: cellSize }} />
        ))}
      </View>
      {isEmpty && (
        <View style={{ padding: 16 }}>
          <Text style={{ textAlign: "center", color: colors.color, fontSize: 13, opacity: 0.6 }}>
            Add post images via the web editor to populate your social feed.
          </Text>
        </View>
      )}
    </View>
  );
}

function MapLocationBlock({ s, colors, onLinkPress }: { s: MapLocationSection; colors: ReturnType<typeof sectionColors>; onLinkPress?: (href: string) => void }) {
  const el = useContext(SectionElCtx);
  const variant = (s as any).variant ?? "simple";

  const MapPlaceholder = ({ height = 180 }: { height?: number }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => s.address && onLinkPress?.(`https://maps.google.com/?q=${encodeURIComponent(s.address)}`)}
      style={{ height, backgroundColor: "#e8f0e8", borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1, borderColor: "#d1e7d1" }}
    >
      <Ionicons name="map-outline" size={48} color="#6aaa6a" style={{ marginBottom: 8 }} />
      <Text style={{ fontSize: 13, color: "#555", textAlign: "center", paddingHorizontal: 16 }}>
        {s.address ?? "Add address to show map"}
      </Text>
    </TouchableOpacity>
  );

  const InfoRow = ({ icon, label, value }: { icon: any; label: string; value: string }) => (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent + "20", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={16} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: colors.color, opacity: 0.6, marginBottom: 2 }}>{label}</Text>
        <Text style={{ fontSize: 14, color: colors.headingColor, fontWeight: "500" }}>{value}</Text>
      </View>
    </View>
  );

  const infoBlock = (
    <View style={{ gap: 12 }}>
      {s.heading ? <Text style={[{ fontSize: el.h2Size, fontWeight: "700", color: colors.headingColor }, el.heading as object]}>{s.heading}</Text> : null}
      {s.address ? <InfoRow icon="location-outline" label="Address" value={s.address} /> : null}
      {s.phone   ? <InfoRow icon="call-outline"     label="Phone"   value={s.phone}   /> : null}
      {s.hours   ? <InfoRow icon="time-outline"     label="Hours"   value={s.hours}   /> : null}
      {s.email   ? <InfoRow icon="mail-outline"     label="Email"   value={s.email}   /> : null}
      {s.ctaLabel ? (
        <TouchableOpacity
          onPress={() => onLinkPress?.((s.ctaLink as string) ?? "/contact")}
          style={{ backgroundColor: colors.accent, paddingVertical: 13, borderRadius: 10, alignItems: "center", marginTop: 4 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>{s.ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  // CARD: info floats as a card overlay on the map
  if (variant === "card") {
    return (
      <View>
        <MapPlaceholder height={260} />
        <View style={{ marginTop: -60, marginHorizontal: 16, backgroundColor: colors.backgroundColor ?? "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 }}>
          {infoBlock}
        </View>
      </View>
    );
  }

  // SPLIT: map left, info right (side-by-side)
  if (variant === "split") {
    return (
      <View style={{ flexDirection: "row", gap: 16, minHeight: 220 }}>
        <View style={{ flex: 1 }}><MapPlaceholder height={220} /></View>
        <View style={{ flex: 1, justifyContent: "center" }}>{infoBlock}</View>
      </View>
    );
  }

  // SIMPLE (default): map on top, info below
  return (
    <View style={{ gap: 20 }}>
      <MapPlaceholder />
      {infoBlock}
    </View>
  );
}

function SizeGuideBlock({ s, colors }: { s: SizeGuideSection; colors: ReturnType<typeof sectionColors> }) {
  const el = useContext(SectionElCtx);
  const [activeCategory, setActiveCategory] = useState(s.categories?.[0] ?? "");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const colBg = colors.backgroundColor === "transparent" ? "#f9fafb" : colors.backgroundColor;
  const headerBg = colors.accent + "15";
  const variant = (s as any).variant ?? "table";

  const header = (
    <>
      {s.heading ? (
        <Text style={[{ fontSize: el.h2Size, fontWeight: "700", color: colors.headingColor, textAlign: "center" }, el.heading as object]}>
          {s.heading}
        </Text>
      ) : null}
      {s.subheading ? (
        <Text style={{ fontSize: 13, color: colors.color, textAlign: "center", opacity: 0.7 }}>{s.subheading}</Text>
      ) : null}
      {(s.categories ?? []).length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
          {s.categories!.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: activeCategory === cat ? colors.accent : "#ddd", backgroundColor: activeCategory === cat ? colors.accent : "transparent" }}
            >
              <Text style={{ fontSize: 12, color: activeCategory === cat ? "#fff" : colors.color, fontWeight: "600" }}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}
    </>
  );

  const noteBlock = s.note ? (
    <View style={{ flexDirection: "row", gap: 8, backgroundColor: colors.accent + "10", padding: 12, borderRadius: 8 }}>
      <Ionicons name="information-circle-outline" size={16} color={colors.accent} style={{ marginTop: 1 }} />
      <Text style={{ flex: 1, fontSize: 12, color: colors.color, lineHeight: 18 }}>{s.note}</Text>
    </View>
  ) : null;

  // CARDS: each row as a card showing column:value pairs
  if (variant === "cards") {
    return (
      <View style={{ gap: 12 }}>
        {header}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {s.rows.map((row, ri) => (
            <View key={ri} style={{ flex: 1, minWidth: "45%", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", padding: 14, gap: 6, backgroundColor: colors.accent + "06" }}>
              {s.columns.map((col, ci) => (
                <View key={ci} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 11, color: colors.color, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.3 }}>{col}</Text>
                  <Text style={{ fontSize: 13, color: ci === 0 ? colors.accent : colors.headingColor, fontWeight: ci === 0 ? "700" : "500" }}>{row[col] ?? "—"}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
        {noteBlock}
      </View>
    );
  }

  // ACCORDION: each row collapses, tap to reveal measurements
  if (variant === "accordion") {
    const sizeCol = s.columns[0] ?? "Size";
    return (
      <View style={{ gap: 12 }}>
        {header}
        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", overflow: "hidden" }}>
          {s.rows.map((row, ri) => {
            const isOpen = expandedRow === ri;
            return (
              <View key={ri} style={{ borderBottomWidth: ri < s.rows.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: "#e5e7eb" }}>
                <TouchableOpacity
                  onPress={() => setExpandedRow(isOpen ? null : ri)}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, backgroundColor: isOpen ? colors.accent + "10" : "transparent" }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "700", color: isOpen ? colors.accent : colors.headingColor }}>{row[sizeCol] ?? `Size ${ri + 1}`}</Text>
                  <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.color} />
                </TouchableOpacity>
                {isOpen && (
                  <View style={{ padding: 14, paddingTop: 0, gap: 6 }}>
                    {s.columns.slice(1).map((col, ci) => (
                      <View key={ci} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: ci < s.columns.length - 2 ? StyleSheet.hairlineWidth : 0, borderBottomColor: "#f0f0f0" }}>
                        <Text style={{ fontSize: 13, color: colors.color, opacity: 0.7 }}>{col}</Text>
                        <Text style={{ fontSize: 13, color: colors.headingColor, fontWeight: "600" }}>{row[col] ?? "—"}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
        {noteBlock}
      </View>
    );
  }

  // TABLE (default): horizontally scrollable table
  return (
    <View style={{ gap: 16 }}>
      {header}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", backgroundColor: headerBg }}>
            {s.columns.map((col, i) => (
              <View key={i} style={{ minWidth: 90, paddingHorizontal: 14, paddingVertical: 10, borderRightWidth: i < s.columns.length - 1 ? StyleSheet.hairlineWidth : 0, borderRightColor: "#e5e7eb" }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.headingColor, textAlign: "center" }}>{col}</Text>
              </View>
            ))}
          </View>
          {s.rows.map((row, ri) => (
            <View key={ri} style={{ flexDirection: "row", backgroundColor: ri % 2 === 0 ? "transparent" : colBg + "80" }}>
              {s.columns.map((col, ci) => (
                <View key={ci} style={{ minWidth: 90, paddingHorizontal: 14, paddingVertical: 9, borderRightWidth: ci < s.columns.length - 1 ? StyleSheet.hairlineWidth : 0, borderRightColor: "#e5e7eb", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e5e7eb" }}>
                  <Text style={{ fontSize: 13, color: ci === 0 ? colors.headingColor : colors.color, fontWeight: ci === 0 ? "700" : "400", textAlign: "center" }}>{row[col] ?? ""}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      {noteBlock}
    </View>
  );
}

function PortfolioBlock({ s, colors, onLinkPress }: { s: PortfolioSection; colors: ReturnType<typeof sectionColors>; onLinkPress?: (href: string) => void }) {
  const el = useContext(SectionElCtx);
  const cols = s.columns ?? 3;
  const { width: winWidth } = useWindowDimensions();
  const cellWidth = (winWidth - 32 - (cols - 1) * 8) / cols;
  const [activeTag, setActiveTag] = useState<string>("");
  const allTags = Array.from(new Set(s.items.flatMap((p) => [p.category ?? "", ...(p.tags ?? [])]).filter(Boolean)));
  const variant = (s as any).variant ?? "grid";

  const filtered = activeTag
    ? s.items.filter((p) => p.category === activeTag || (p.tags ?? []).includes(activeTag))
    : s.items;

  const FilterBar = () => allTags.length > 1 ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {["All", ...allTags].map((tag) => (
        <TouchableOpacity
          key={tag}
          onPress={() => setActiveTag(tag === "All" ? "" : tag)}
          style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: (activeTag === tag || (tag === "All" && !activeTag)) ? colors.accent : "#ddd", backgroundColor: (activeTag === tag || (tag === "All" && !activeTag)) ? colors.accent : "transparent" }}
        >
          <Text style={{ fontSize: 12, color: (activeTag === tag || (tag === "All" && !activeTag)) ? "#fff" : colors.color, fontWeight: "600" }}>{tag}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  ) : null;

  const ItemImg = ({ item, aspectRatio = 1 }: { item: typeof filtered[0]; aspectRatio?: number }) => (
    item.image
      ? <Image source={{ uri: item.image }} style={{ width: "100%", aspectRatio }} contentFit="cover" />
      : <View style={{ width: "100%", aspectRatio, backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center" }}><Ionicons name="images-outline" size={28} color="#bbb" /></View>
  );

  const headings = (
    <>
      {s.heading ? <Text style={[{ fontSize: el.h2Size, fontWeight: "700", color: colors.headingColor, textAlign: "center" }, el.heading as object]}>{s.heading}</Text> : null}
      {s.subheading ? <Text style={{ fontSize: 13, color: colors.color, textAlign: "center", opacity: 0.7, marginBottom: 4 }}>{s.subheading}</Text> : null}
    </>
  );

  // MINIMAL: image-only, no text labels, just category on hover overlay
  if (variant === "minimal") {
    return (
      <View style={{ gap: 12 }}>
        {headings}
        <FilterBar />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {filtered.map((item, i) => (
            <TouchableOpacity key={i} onPress={() => item.link ? onLinkPress?.(item.link) : undefined} activeOpacity={0.8} style={{ width: cellWidth, borderRadius: 8, overflow: "hidden" }}>
              <ItemImg item={item} />
              {item.category ? (
                <View style={{ position: "absolute", bottom: 6, left: 6, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 9, color: "#fff", fontWeight: "700", textTransform: "uppercase" }}>{item.category}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // EDITORIAL: first item large full-width, rest in grid below
  if (variant === "editorial" && filtered.length > 0) {
    const [featured, ...rest] = filtered;
    const restW = (winWidth - 32 - 8) / 2;
    return (
      <View style={{ gap: 12 }}>
        {headings}
        <FilterBar />
        <TouchableOpacity onPress={() => featured.link ? onLinkPress?.(featured.link) : undefined} activeOpacity={featured.link ? 0.85 : 1} style={{ borderRadius: 14, overflow: "hidden" }}>
          <ItemImg item={featured} aspectRatio={16 / 9} />
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: "rgba(0,0,0,0.5)" }}>
            {featured.category ? <Text style={{ fontSize: 10, color: colors.accent, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" }}>{featured.category}</Text> : null}
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#fff" }} numberOfLines={2}>{featured.title}</Text>
          </View>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {rest.map((item, i) => (
            <TouchableOpacity key={i} onPress={() => item.link ? onLinkPress?.(item.link) : undefined} activeOpacity={item.link ? 0.75 : 1} style={{ width: restW, borderRadius: 10, overflow: "hidden", backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb" }}>
              <ItemImg item={item} />
              <View style={{ padding: 8, gap: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.headingColor }} numberOfLines={1}>{item.title}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // MASONRY: two columns, alternating heights
  if (variant === "masonry") {
    const half = (winWidth - 32 - 6) / 2;
    const left = filtered.filter((_, i) => i % 2 === 0);
    const right = filtered.filter((_, i) => i % 2 !== 0);
    const MasonryItem = ({ item, tall }: { item: typeof filtered[0]; tall: boolean }) => (
      <TouchableOpacity onPress={() => item.link ? onLinkPress?.(item.link) : undefined} activeOpacity={0.8} style={{ borderRadius: 10, overflow: "hidden", marginBottom: 6 }}>
        <View style={{ height: tall ? 220 : 150 }}>
          <ItemImg item={item} aspectRatio={tall ? 0.7 : 1.2} />
        </View>
        <View style={{ padding: 8, backgroundColor: "#f9fafb" }}>
          {item.category ? <Text style={{ fontSize: 9, color: colors.accent, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>{item.category}</Text> : null}
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.headingColor }} numberOfLines={1}>{item.title}</Text>
        </View>
      </TouchableOpacity>
    );
    return (
      <View style={{ gap: 12 }}>
        {headings}
        <FilterBar />
        <View style={{ flexDirection: "row", gap: 6 }}>
          <View style={{ flex: 1 }}>{left.map((item, i) => <MasonryItem key={i} item={item} tall={i % 2 === 0} />)}</View>
          <View style={{ flex: 1 }}>{right.map((item, i) => <MasonryItem key={i} item={item} tall={i % 2 !== 0} />)}</View>
        </View>
      </View>
    );
  }

  // GRID (default): uniform column grid
  return (
    <View style={{ gap: 12 }}>
      {headings}
      <FilterBar />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {filtered.map((item, i) => (
          <TouchableOpacity key={i} onPress={() => item.link ? onLinkPress?.(item.link) : undefined} activeOpacity={item.link ? 0.75 : 1} style={{ width: cellWidth, borderRadius: 10, overflow: "hidden", backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb" }}>
            <ItemImg item={item} />
            <View style={{ padding: 10, gap: 2 }}>
              {item.category ? <Text style={{ fontSize: 10, color: colors.accent, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" }}>{item.category}</Text> : null}
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.headingColor }} numberOfLines={1}>{item.title}</Text>
              {item.description ? <Text style={{ fontSize: 11, color: colors.color, opacity: 0.7, lineHeight: 15 }} numberOfLines={2}>{item.description}</Text> : null}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function LookbookBlock({ s, colors, onLinkPress }: { s: any; colors: ReturnType<typeof sectionColors>; onLinkPress?: (href: string) => void }) {
  const el = useContext(SectionElCtx);
  const { width: winWidth } = useWindowDimensions();
  const items: any[] = s.items ?? [];
  const variant = s.variant ?? "grid";
  const cellW2 = (winWidth - 32 - 8) / 2;

  const LookImg = ({ item, style }: { item: any; style?: object }) => (
    item.image
      ? <Image source={{ uri: item.image }} style={[{ width: "100%", height: "100%" }, style]} contentFit="cover" />
      : <View style={[{ width: "100%", height: "100%", backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center" }, style]}><Ionicons name="camera-outline" size={32} color="#bbb" /></View>
  );

  const Overlay = ({ item }: { item: any }) => (item.title || item.description) ? (
    <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 12, backgroundColor: "rgba(0,0,0,0.45)" }}>
      {item.title ? <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }} numberOfLines={1}>{item.title}</Text> : null}
      {item.description ? <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.85)" }} numberOfLines={1}>{item.description}</Text> : null}
      {item.link ? <Text style={{ fontSize: 11, color: "#fff", marginTop: 4, textDecorationLine: "underline" }}>Shop look →</Text> : null}
    </View>
  ) : null;

  const headings = (
    <>
      {s.heading ? <Text style={[{ fontSize: el.h2Size, fontWeight: "700", color: colors.headingColor, textAlign: "center" }, el.heading as object]}>{s.heading}</Text> : null}
      {s.subheading ? <Text style={{ fontSize: 13, color: colors.color, textAlign: "center", opacity: 0.7 }}>{s.subheading}</Text> : null}
    </>
  );

  // SCROLLER: horizontal scroll of tall portrait cards
  if (variant === "scroller") {
    const pw = Math.min(220, winWidth * 0.6);
    return (
      <View style={{ gap: 12 }}>
        {headings}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 2 }}>
          {items.map((item, i) => (
            <TouchableOpacity key={i} onPress={() => item.link ? onLinkPress?.(item.link) : undefined} activeOpacity={0.85} style={{ width: pw, height: pw * 1.35, borderRadius: 14, overflow: "hidden" }}>
              <LookImg item={item} />
              <Overlay item={item} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // MASONRY: alternating tall/short two-column layout
  if (variant === "masonry") {
    const leftItems = items.filter((_, i) => i % 2 === 0);
    const rightItems = items.filter((_, i) => i % 2 !== 0);
    const Col = ({ its }: { its: any[] }) => (
      <View style={{ flex: 1, gap: 8 }}>
        {its.map((item, i) => (
          <TouchableOpacity key={i} onPress={() => item.link ? onLinkPress?.(item.link) : undefined} activeOpacity={0.85} style={{ borderRadius: 12, overflow: "hidden", height: i % 2 === 0 ? 240 : 160 }}>
            <LookImg item={item} />
            <Overlay item={item} />
          </TouchableOpacity>
        ))}
      </View>
    );
    return (
      <View style={{ gap: 12 }}>
        {headings}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Col its={leftItems} />
          <Col its={rightItems} />
        </View>
      </View>
    );
  }

  // EDITORIAL: first item full-width feature, rest 2-col
  if (variant === "editorial" && items.length > 0) {
    const [hero, ...rest] = items;
    return (
      <View style={{ gap: 12 }}>
        {headings}
        <TouchableOpacity onPress={() => hero.link ? onLinkPress?.(hero.link) : undefined} activeOpacity={0.85} style={{ borderRadius: 14, overflow: "hidden", height: 320 }}>
          <LookImg item={hero} />
          <Overlay item={hero} />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {rest.map((item, i) => (
            <TouchableOpacity key={i} onPress={() => item.link ? onLinkPress?.(item.link) : undefined} activeOpacity={0.85} style={{ width: cellW2, borderRadius: 12, overflow: "hidden", aspectRatio: 0.8 }}>
              <LookImg item={item} />
              <Overlay item={item} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // GRID (default): 2-col portrait grid
  return (
    <View style={{ gap: 12 }}>
      {headings}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {items.map((item, i) => (
          <TouchableOpacity key={i} onPress={() => item.link ? onLinkPress?.(item.link) : undefined} activeOpacity={item.link ? 0.8 : 1} style={{ width: cellW2, borderRadius: 12, overflow: "hidden", aspectRatio: 0.75 }}>
            <LookImg item={item} />
            <Overlay item={item} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function TimelineBlock({ s, colors }: { s: any; colors: ReturnType<typeof sectionColors> }) {
  const el = useContext(SectionElCtx);
  const milestones: any[] = s.milestones ?? [];
  const variant = s.variant ?? "vertical";

  const headings = (
    <>
      {s.heading ? <Text style={[{ fontSize: el.h2Size, fontWeight: "700", color: colors.headingColor, textAlign: "center" }, el.heading as object]}>{s.heading}</Text> : null}
      {s.subheading ? <Text style={{ fontSize: 13, color: colors.color, textAlign: "center", opacity: 0.7, marginBottom: 8 }}>{s.subheading}</Text> : null}
    </>
  );

  // HORIZONTAL: scrollable left-to-right timeline
  if (variant === "horizontal") {
    return (
      <View style={{ gap: 12 }}>
        {headings}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, gap: 0 }}>
          {milestones.map((m, i) => (
            <View key={i} style={{ width: 160, alignItems: "center" }}>
              {/* Connector line + dot */}
              <View style={{ flexDirection: "row", alignItems: "center", width: "100%", marginBottom: 8 }}>
                <View style={{ flex: 1, height: 2, backgroundColor: i === 0 ? "transparent" : colors.accent + "44" }} />
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                  <Text style={{ fontSize: 9, fontWeight: "800", color: "#fff" }}>{m.year}</Text>
                </View>
                <View style={{ flex: 1, height: 2, backgroundColor: i === milestones.length - 1 ? "transparent" : colors.accent + "44" }} />
              </View>
              <View style={[{ paddingHorizontal: 8, alignItems: "center", gap: 4 }, el.card as object]}>
                <Text style={[{ fontSize: 13, fontWeight: "700", color: colors.headingColor, textAlign: "center" }, el.heading as object]}>{m.title}</Text>
                {m.description ? <Text style={[{ fontSize: 11, color: colors.color, opacity: 0.7, textAlign: "center", lineHeight: 16 }, el.body as object]} numberOfLines={3}>{m.description}</Text> : null}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // MINIMAL: numbered list, no spine visual, clean
  if (variant === "minimal") {
    return (
      <View style={{ gap: 12 }}>
        {headings}
        {milestones.map((m, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
            <View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: colors.accent + "18", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: colors.accent }}>{String(i + 1).padStart(2, "0")}</Text>
            </View>
            <View style={[{ flex: 1, gap: 2 }, el.card as object]}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.accent, letterSpacing: 0.5, textTransform: "uppercase" }}>{m.year}</Text>
              <Text style={[{ fontSize: 14, fontWeight: "700", color: colors.headingColor }, el.heading as object]}>{m.title}</Text>
              {m.description ? <Text style={[{ fontSize: 13, color: colors.color, lineHeight: 19, opacity: 0.75 }, el.body as object]}>{m.description}</Text> : null}
            </View>
          </View>
        ))}
      </View>
    );
  }

  // VERTICAL (default): spine down the left side
  return (
    <View style={{ gap: 16 }}>
      {headings}
      {milestones.map((m, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 16 }}>
          <View style={{ alignItems: "center", width: 40 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 10, fontWeight: "800", color: "#fff" }}>{m.year}</Text>
            </View>
            {i < milestones.length - 1 ? <View style={{ flex: 1, width: 2, backgroundColor: colors.accent + "33", marginTop: 4 }} /> : null}
          </View>
          <View style={[{ flex: 1, paddingBottom: 20, gap: 4 }, el.card as object]}>
            <Text style={[{ fontSize: 15, fontWeight: "700", color: colors.headingColor }, el.heading as object]}>{m.title}</Text>
            {m.description ? <Text style={[{ fontSize: 13, color: colors.color, lineHeight: 19, opacity: 0.8 }, el.body as object]}>{m.description}</Text> : null}
            {m.image ? <Image source={{ uri: m.image }} style={[{ width: "100%", aspectRatio: 16 / 9, borderRadius: 10, marginTop: 6 }, el.image as object]} contentFit="cover" /> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function BeforeAfterBlock({ s, colors }: { s: any; colors: ReturnType<typeof sectionColors> }) {
  const el = useContext(SectionElCtx);
  const { width: winWidth } = useWindowDimensions();
  const pairs: any[] = s.pairs ?? [];
  const variant = s.variant ?? "side-by-side";
  const [activePair, setActivePair] = useState(0);
  const [showAfter, setShowAfter] = useState(false);

  const headings = (
    <>
      {s.heading ? <Text style={[{ fontSize: el.h2Size, fontWeight: "700", color: colors.headingColor, textAlign: "center" }, el.heading as object]}>{s.heading}</Text> : null}
      {s.subheading ? <Text style={{ fontSize: 13, color: colors.color, textAlign: "center", opacity: 0.7, marginBottom: 4 }}>{s.subheading}</Text> : null}
    </>
  );

  const ImgOrPlaceholder = ({ uri, label, bg = "#f0f0f0" }: { uri?: string; label: string; bg?: string }) =>
    uri
      ? <Image source={{ uri }} style={{ width: "100%", aspectRatio: 1 }} contentFit="cover" />
      : <View style={{ width: "100%", aspectRatio: 1, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 10, color: "#bbb" }}>{label}</Text></View>;

  const SideBySidePair = ({ pair }: { pair: any }) => (
    <View style={{ borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#e5e7eb" }}>
      <View style={{ flexDirection: "row" }}>
        <View style={{ flex: 1 }}>
          <ImgOrPlaceholder uri={pair.beforeImage} label="Before" />
          <View style={{ backgroundColor: "rgba(0,0,0,0.6)", paddingVertical: 4 }}>
            <Text style={{ textAlign: "center", color: "#fff", fontSize: 11, fontWeight: "700" }}>BEFORE</Text>
          </View>
        </View>
        <View style={{ width: 2, backgroundColor: "#fff" }} />
        <View style={{ flex: 1 }}>
          <ImgOrPlaceholder uri={pair.afterImage} label="After" bg="#e0ffe4" />
          <View style={{ backgroundColor: colors.accent, paddingVertical: 4 }}>
            <Text style={{ textAlign: "center", color: "#fff", fontSize: 11, fontWeight: "700" }}>AFTER</Text>
          </View>
        </View>
      </View>
      {(pair.label || pair.description) ? (
        <View style={{ padding: 12, gap: 2 }}>
          {pair.label ? <Text style={{ fontSize: 14, fontWeight: "700", color: colors.headingColor }}>{pair.label}</Text> : null}
          {pair.description ? <Text style={{ fontSize: 12, color: colors.color, opacity: 0.7 }}>{pair.description}</Text> : null}
        </View>
      ) : null}
    </View>
  );

  // SLIDER: tap to toggle between before/after on the active pair
  if (variant === "slider") {
    const pair = pairs[activePair] ?? {};
    return (
      <View style={{ gap: 12 }}>
        {headings}
        <View style={{ borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "#e5e7eb" }}>
          <TouchableOpacity onPress={() => setShowAfter((v) => !v)} activeOpacity={0.9}>
            {!showAfter
              ? <ImgOrPlaceholder uri={pair.beforeImage} label="Before" />
              : <ImgOrPlaceholder uri={pair.afterImage} label="After" bg="#e0ffe4" />}
            <View style={{ position: "absolute", top: 12, right: 12, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>{showAfter ? "← Before" : "After →"}</Text>
            </View>
            <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingVertical: 6, backgroundColor: showAfter ? colors.accent : "rgba(0,0,0,0.55)" }}>
              <Text style={{ textAlign: "center", color: "#fff", fontSize: 12, fontWeight: "700" }}>{showAfter ? "AFTER" : "BEFORE"}</Text>
            </View>
          </TouchableOpacity>
          {pair.label ? <View style={{ padding: 12 }}><Text style={{ fontSize: 14, fontWeight: "700", color: colors.headingColor }}>{pair.label}</Text></View> : null}
        </View>
        {pairs.length > 1 && (
          <View style={{ flexDirection: "row", gap: 8, justifyContent: "center" }}>
            {pairs.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => { setActivePair(i); setShowAfter(false); }} style={{ width: 28, height: 28, borderRadius: 6, borderWidth: 1.5, borderColor: i === activePair ? colors.accent : "#ddd", backgroundColor: i === activePair ? colors.accent + "18" : "transparent", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: i === activePair ? colors.accent : colors.color }}>{i + 1}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }

  // GRID: all pairs in 2-col wrap
  if (variant === "grid") {
    const half = (winWidth - 32 - 8) / 2;
    return (
      <View style={{ gap: 12 }}>
        {headings}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {pairs.map((pair, i) => (
            <View key={i} style={{ width: half }}>
              <SideBySidePair pair={pair} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  // SIDE-BY-SIDE (default): stacked, each pair full width
  return (
    <View style={{ gap: 16 }}>
      {headings}
      {pairs.map((pair, i) => <SideBySidePair key={i} pair={pair} />)}
    </View>
  );
}

function BundleOfferBlock({ s, colors, onLinkPress }: { s: any; colors: ReturnType<typeof sectionColors>; onLinkPress?: (href: string) => void }) {
  const el = useContext(SectionElCtx);
  const variant = s.variant ?? "featured";

  const headings = (
    <>
      {s.heading ? <Text style={[{ fontSize: el.h2Size, fontWeight: "700", color: colors.headingColor, textAlign: "center" }, el.heading as object]}>{s.heading}</Text> : null}
      {s.subheading ? <Text style={{ fontSize: 13, color: colors.color, textAlign: "center", opacity: 0.7 }}>{s.subheading}</Text> : null}
    </>
  );

  const PriceRow = ({ size = "lg" }: { size?: "lg" | "sm" }) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      {s.bundlePrice ? <Text style={{ fontSize: size === "lg" ? 28 : 20, fontWeight: "800", color: colors.headingColor }}>{s.bundlePrice}</Text> : null}
      {s.originalPrice ? <Text style={{ fontSize: size === "lg" ? 16 : 13, color: colors.color, opacity: 0.5, textDecorationLine: "line-through" }}>{s.originalPrice}</Text> : null}
      {s.savingsLabel ? (
        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "#16a34a" }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>{s.savingsLabel}</Text>
        </View>
      ) : null}
    </View>
  );

  const CtaBtn = ({ compact = false }: { compact?: boolean }) => s.ctaLabel ? (
    <TouchableOpacity
      onPress={() => s.ctaLink ? onLinkPress?.(s.ctaLink) : undefined}
      style={[{ paddingVertical: compact ? 10 : 14, borderRadius: 10, backgroundColor: colors.accent, alignItems: "center" }, el.btn as object]}
    >
      <Text style={{ fontSize: compact ? 13 : 15, fontWeight: "700", color: "#fff" }}>{s.ctaLabel}</Text>
    </TouchableOpacity>
  ) : null;

  // COMPACT: single inline row — label + price + button side by side
  if (variant === "compact") {
    return (
      <View style={{ gap: 8 }}>
        {headings}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.accent + "44", backgroundColor: colors.accent + "08" }}>
          {s.bundleLabel ? (
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: colors.accent }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>{s.bundleLabel}</Text>
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            <PriceRow size="sm" />
          </View>
          {s.ctaLabel ? (
            <TouchableOpacity onPress={() => s.ctaLink ? onLinkPress?.(s.ctaLink) : undefined} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.accent }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>{s.ctaLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  // CARDS: if items array exists, show multiple bundles as cards; otherwise single card
  if (variant === "cards") {
    const bundles: any[] = s.items ?? [s]; // fall back to self as single item
    return (
      <View style={{ gap: 12 }}>
        {headings}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {bundles.map((bundle, i) => (
            <View key={i} style={[{ flex: 1, minWidth: "45%", borderRadius: 14, borderWidth: 1.5, borderColor: (bundle.highlighted || i === 0) ? colors.accent : "#e5e7eb", padding: 16, gap: 10, backgroundColor: (bundle.highlighted || i === 0) ? colors.accent + "0A" : undefined }, el.card as object]}>
              {bundle.bundleLabel ? (
                <View style={{ alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: colors.accent }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>{bundle.bundleLabel}</Text>
                </View>
              ) : null}
              <PriceRow />
              <CtaBtn compact />
            </View>
          ))}
        </View>
      </View>
    );
  }

  // FEATURED (default): single large highlighted card
  return (
    <View style={{ gap: 12 }}>
      {headings}
      <View style={[{ borderRadius: 16, borderWidth: 1.5, borderColor: colors.accent + "44", overflow: "hidden", padding: 20, gap: 16, backgroundColor: colors.accent + "08" }, el.card as object]}>
        {s.bundleLabel ? (
          <View style={{ alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: colors.accent }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>{s.bundleLabel}</Text>
          </View>
        ) : null}
        <PriceRow />
        <CtaBtn />
      </View>
    </View>
  );
}

function ReviewsBlock({ s, colors }: { s: any; colors: ReturnType<typeof sectionColors> }) {
  const el = useContext(SectionElCtx);
  const variant = s.variant ?? "grid";
  const testimonials: any[] = s.testimonials ?? [];

  const StarRow = ({ rating }: { rating: number }) => (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1,2,3,4,5].map((n) => (
        <Ionicons key={n} name={n <= rating ? "star" : "star-outline"} size={12} color="#f59e0b" />
      ))}
    </View>
  );

  const ReviewCard = ({ item }: { item: any }) => (
    <View style={[{ padding: 16, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.04)", borderWidth: 1, borderColor: "#e5e7eb", gap: 8 }, el.card as object]}>
      <StarRow rating={item.rating ?? 5} />
      <Text style={[{ fontSize: 13, color: colors.color, lineHeight: 20, fontStyle: "italic" }, el.body as object]}>"{item.text}"</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={[{ width: 32, height: 32, borderRadius: 16 }, el.image as object]} contentFit="cover" />
        ) : (
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>{(item.name ?? "?")[0]?.toUpperCase()}</Text>
          </View>
        )}
        <View>
          <Text style={[{ fontSize: 12, fontWeight: "700", color: colors.headingColor }, el.heading as object]}>{item.name}</Text>
          {item.product ? <Text style={[{ fontSize: 11, color: colors.color, opacity: 0.6 }, el.body as object]}>{item.product}</Text> : null}
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ gap: 16 }}>
      {s.heading ? (
        <Text style={[{ fontSize: el.h2Size, fontWeight: "700", color: colors.headingColor, textAlign: "center" }, el.heading as object]}>
          {s.heading}
        </Text>
      ) : null}
      {s.subheading ? (
        <Text style={{ fontSize: 13, color: colors.color, textAlign: "center", opacity: 0.7, marginBottom: 4 }}>{s.subheading}</Text>
      ) : null}

      {s.useRealReviews ? (
        <View style={{ alignItems: "center", padding: 24, borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", borderStyle: "dashed" }}>
          <Ionicons name="star" size={28} color="#f59e0b" />
          <Text style={{ marginTop: 8, fontSize: 13, color: colors.color, textAlign: "center", opacity: 0.7 }}>
            Live customer reviews will appear here (top {s.maxItems ?? 4} with {s.minRating ?? 4}★+)
          </Text>
        </View>
      ) : variant === "list" || variant === "masonry" ? (
        <View style={{ gap: 12 }}>
          {testimonials.map((item, i) => <ReviewCard key={i} item={item} />)}
        </View>
      ) : variant === "carousel" ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 2 }}>
          {testimonials.map((item, i) => (
            <View key={i} style={{ width: 260 }}><ReviewCard item={item} /></View>
          ))}
        </ScrollView>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {testimonials.map((item, i) => (
            <View key={i} style={{ flex: 1, minWidth: 240 }}><ReviewCard item={item} /></View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── WhatsApp CTA Block ───────────────────────────────────────────────────────

function WhatsAppCtaBlock({ s, colors }: { s: any; colors: ReturnType<typeof sectionColors> }) {
  const el = useContext(SectionElCtx);
  const variant = s.variant ?? "card";
  const phone = (s.phone ?? "").replace(/\D/g, "");
  const message = encodeURIComponent(s.prefilledMessage ?? "Hi! I'd like to know more about your products.");
  const waUrl = `https://wa.me/${phone}?text=${message}`;
  const WaGreen = "#25D366";

  const handlePress = () => {
    if (!phone) return;
    Linking.openURL(waUrl).catch(() => {});
  };

  const BtnRow = () => (
    <TouchableOpacity
      onPress={handlePress}
      style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: WaGreen, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 100 }}
    >
      <MaterialCommunityIcons name="whatsapp" size={22} color="#fff" />
      <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>{s.buttonLabel ?? "Chat on WhatsApp"}</Text>
    </TouchableOpacity>
  );

  if (variant === "banner") {
    return (
      <View style={[{ backgroundColor: WaGreen + "15", borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", gap: 16, borderWidth: 1, borderColor: WaGreen + "40" }, el.card as object]}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: WaGreen, alignItems: "center", justifyContent: "center" }}>
          <MaterialCommunityIcons name="whatsapp" size={26} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          {s.heading ? <Text style={[{ fontSize: 15, fontWeight: "700", color: colors.headingColor }, el.heading as object]}>{s.heading}</Text> : null}
          {s.subheading ? <Text style={[{ fontSize: 12, color: colors.color, opacity: 0.7, marginTop: 2 }, el.body as object]}>{s.subheading}</Text> : null}
        </View>
        <TouchableOpacity onPress={handlePress} style={[{ backgroundColor: WaGreen, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100 }, el.btn as object]}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>Chat</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (variant === "minimal") {
    return (
      <View style={{ alignItems: "center", gap: 12 }}>
        {s.heading ? <Text style={[{ fontSize: el.h2Size, fontWeight: "700", color: colors.headingColor, textAlign: "center" }, el.heading as object]}>{s.heading}</Text> : null}
        {s.subheading ? <Text style={[{ fontSize: 13, color: colors.color, textAlign: "center", opacity: 0.7 }, el.body as object]}>{s.subheading}</Text> : null}
        <BtnRow />
      </View>
    );
  }

  // card (default)
  return (
    <View style={[{ alignItems: "center", gap: 20, padding: 28, borderRadius: 20, backgroundColor: WaGreen + "0D", borderWidth: 1.5, borderColor: WaGreen + "30" }, el.card as object]}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: WaGreen, alignItems: "center", justifyContent: "center" }}>
        <MaterialCommunityIcons name="whatsapp" size={34} color="#fff" />
      </View>
      {s.heading ? <Text style={[{ fontSize: el.h2Size, fontWeight: "700", color: colors.headingColor, textAlign: "center" }, el.heading as object]}>{s.heading}</Text> : null}
      {s.subheading ? <Text style={[{ fontSize: 13, color: colors.color, textAlign: "center", opacity: 0.7, marginTop: -8 }, el.body as object]}>{s.subheading}</Text> : null}
      <BtnRow />
    </View>
  );
}

// ─── Trust Badges Block ───────────────────────────────────────────────────────

function TrustBadgesBlock({ s, colors }: { s: any; colors: ReturnType<typeof sectionColors> }) {
  const el = useContext(SectionElCtx);
  const { width: winWidth } = useWindowDimensions();
  const variant = s.variant ?? "row";
  const badges: Array<{ icon: string; label: string; description?: string }> = s.badges ?? [];

  const ICON_MAP: Record<string, any> = {
    shield: "shield", truck: "truck", "refresh-ccw": "refresh-ccw",
    award: "award", star: "star", zap: "zap", check: "check-circle",
    lock: "lock", heart: "heart", package: "package",
  };

  const Badge = ({ item, compact }: { item: typeof badges[0]; compact?: boolean }) => (
    <View style={[{
      alignItems: "center", gap: compact ? 4 : 8,
      ...(compact ? { flex: 1 } : { flex: 1, minWidth: 120, padding: 16, borderRadius: 12, backgroundColor: colors.accent + "0A", borderWidth: 1, borderColor: colors.accent + "20" }),
    }, el.card as object]}>
      <View style={{ width: compact ? 36 : 44, height: compact ? 36 : 44, borderRadius: compact ? 18 : 22, backgroundColor: colors.accent + "18", alignItems: "center", justifyContent: "center" }}>
        <Feather name={(ICON_MAP[item.icon] ?? "check-circle") as any} size={compact ? 16 : 20} color={colors.accent} />
      </View>
      <Text style={[{ fontSize: compact ? 11 : 13, fontWeight: "700", color: colors.headingColor, textAlign: "center" }, el.heading as object]}>{item.label}</Text>
      {!compact && item.description ? <Text style={[{ fontSize: 11, color: colors.color, opacity: 0.6, textAlign: "center" }, el.body as object]}>{item.description}</Text> : null}
    </View>
  );

  return (
    <View style={{ gap: 16 }}>
      {s.heading ? <Text style={[{ fontSize: el.h2Size, fontWeight: "700", color: colors.headingColor, textAlign: "center" }, el.heading as object]}>{s.heading}</Text> : null}
      {variant === "minimal" ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {badges.map((b, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: colors.accent + "30", backgroundColor: colors.accent + "08" }}>
              <Feather name={(ICON_MAP[b.icon] ?? "check-circle") as any} size={12} color={colors.accent} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.headingColor }}>{b.label}</Text>
            </View>
          ))}
        </View>
      ) : variant === "grid" ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {badges.map((b, i) => <Badge key={i} item={b} />)}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 2 }}>
          {badges.map((b, i) => (
            <View key={i} style={{ width: Math.max(100, (winWidth - 64) / Math.min(badges.length, 4)) }}>
              <Badge item={b} compact />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Payment Methods Block ────────────────────────────────────────────────────

const PM_COLORS: Record<string, string> = {
  paystack: "#00C3F7", flutterwave: "#F5A623", opay: "#00A650",
  palmpay: "#06C270", monnify: "#0066CC", bank: "#3B5BDB",
  "bank-transfer": "#3B5BDB", card: "#374151", ussd: "#9333EA",
  cash: "#16A34A",
};

// Paystack: teal check mark (their actual logo mark is a tick)
// Flutterwave: orange wave lines
// Others: named Feather / MaterialCommunity icons
type PMIconDef = { lib: "feather"; name: string } | { lib: "mci"; name: string };
const PM_ICONS: Record<string, PMIconDef> = {
  paystack:       { lib: "feather", name: "check-circle" },
  flutterwave:    { lib: "mci", name: "lightning-bolt" },
  opay:           { lib: "mci", name: "cellphone-nfc" },
  palmpay:        { lib: "mci", name: "wallet" },
  monnify:        { lib: "mci", name: "shield-lock" },
  bank:           { lib: "mci", name: "bank" },
  "bank-transfer":{ lib: "mci", name: "bank" },
  card:           { lib: "feather", name: "credit-card" },
  ussd:           { lib: "mci", name: "dialpad" },
  cash:           { lib: "mci", name: "cash-multiple" },
};

function PaymentMethodsBlock({ s, colors }: { s: any; colors: ReturnType<typeof sectionColors> }) {
  const el = useContext(SectionElCtx);
  const variant = s.variant ?? "row";
  const methods: Array<{ id: string; label: string; enabled: boolean }> = (s.methods ?? []).filter((m: any) => m.enabled);

  const PMIcon = ({ id, size = 16 }: { id: string; size?: number }) => {
    const bg = PM_COLORS[id] ?? colors.accent;
    const def = PM_ICONS[id];
    if (!def) return <View style={{ width: size, height: size, borderRadius: 3, backgroundColor: bg }} />;
    if (def.lib === "feather") return <Feather name={def.name as any} size={size} color="#fff" />;
    return <MaterialCommunityIcons name={def.name as any} size={size} color="#fff" />;
  };

  const Pill = ({ m }: { m: (typeof methods)[0] }) => {
    const bg = PM_COLORS[m.id] ?? colors.accent;
    // Paystack and Flutterwave get a wider badge with brand name text
    const isBrand = m.id === "paystack" || m.id === "flutterwave";
    return (
      <View style={[{
        flexDirection: "row", alignItems: "center", gap: 7,
        paddingHorizontal: isBrand ? 12 : 10, paddingVertical: 8,
        borderRadius: 12, backgroundColor: bg + "14", borderWidth: 1, borderColor: bg + "50",
      }, el.card as object]}>
        <View style={{ width: 26, height: 26, borderRadius: isBrand ? 6 : 6, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
          <PMIcon id={m.id} size={isBrand ? 14 : 14} />
        </View>
        <Text style={[{ fontSize: 12, fontWeight: isBrand ? "700" : "600", color: isBrand ? bg : colors.headingColor }, el.body as object]}>
          {m.label}
        </Text>
      </View>
    );
  };

  return (
    <View style={{ gap: 14, alignItems: "center" }}>
      {s.heading ? <Text style={{ fontSize: 12, color: colors.color, opacity: 0.55, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.8 }}>{s.heading}</Text> : null}
      {variant === "grid" ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          {methods.map((m, i) => <Pill key={i} m={m} />)}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 2 }}>
          {methods.map((m, i) => <Pill key={i} m={m} />)}
        </ScrollView>
      )}
    </View>
  );
}

