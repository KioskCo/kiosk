import { Feather, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

import type { FontHeading, FooterConfig, NavbarConfig, Theme } from "@/lib/storefront";
import { useStorefront } from "@/lib/storefront";

// Maps font token keys to the BOLD loaded font name (must match _layout.tsx useFonts).
// We always use the Bold variant here so the brand name looks strong in the navbar.
// fontWeight MUST be set to "normal" when using these names — the weight is in the name
// itself, and leaving fontWeight:"700" alongside makes Android fall back to system font.
const BRAND_FONT_MAP: Partial<Record<FontHeading, string>> = {
  // Serifs
  playfair:   "PlayfairDisplay_700Bold",
  lora:       "Lora_700Bold",
  cormorant:  "CormorantGaramond_700Bold",
  cinzel:     "Cinzel_700Bold",
  // Sans-serifs
  poppins:    "Poppins_700Bold",
  raleway:    "Raleway_700Bold",
  josefin:    "JosefinSans_700Bold",
  oswald:     "Oswald_700Bold",
  montserrat: "Montserrat_700Bold",
  // Scripts / calligraphy
  dancing:    "DancingScript_700Bold",
  greatvibes: "GreatVibes_400Regular",
  satisfy:    "Satisfy_400Regular",
  sacramento: "Sacramento_400Regular",
  pacifico:   "Pacifico_400Regular",
  lobster:    "Lobster_400Regular",
  // Fashion / condensed display
  bebas:      "BebasNeue_400Regular",
  barlow:     "BarlowCondensed_700Bold",
  righteous:  "Righteous_400Regular",
  abril:      "AbrilFatface_400Regular",
  // Rounded
  nunito:     "Nunito_700Bold",
};

// ─── StoreSidebar (render inside a relative View to constrain height) ─────────

export function StoreSidebar({
  config,
  theme,
  open,
  onClose,
  onPagePress,
  accentColor = "#111111",
}: {
  config: NavbarConfig;
  theme: Theme;
  open: boolean;
  onClose: () => void;
  onPagePress?: (href: string) => void;
  accentColor?: string;
}) {
  const dark = theme !== "light";
  const bg = dark ? "#111111" : "#ffffff";
  const fg = dark ? "#ffffff" : "#111111";
  const muted = dark ? "#888888" : "#666666";
  const border = dark ? "#222222" : "#f0f0f0";
  const accent = accentColor;

  const animation = config.sidebarAnimation ?? "slide";
  const listStyle = config.listStyle ?? "chevron";
  const links = config.links ?? [];

  const translateX = useRef(new Animated.Value(-320)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      translateX.setValue(-320);
      overlayOpacity.setValue(0);

      const slideAnim =
        animation === "spring"
          ? Animated.spring(translateX, { toValue: 0, useNativeDriver: true, damping: 14, stiffness: 160, mass: 0.7 })
          : animation === "bounce"
          ? Animated.spring(translateX, { toValue: 0, useNativeDriver: true, damping: 8, stiffness: 120, mass: 0.7 })
          : animation === "fade" || animation === "none"
          ? Animated.timing(translateX, { toValue: 0, duration: 1, useNativeDriver: true })
          : Animated.timing(translateX, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true });

      Animated.parallel([
        slideAnim,
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: animation === "fade" ? 220 : 180,
          useNativeDriver: true,
          easing: Easing.ease,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -320, duration: 180, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [open]);

  if (!open) return null;

  const drawerTransform =
    animation === "fade"
      ? [{ scale: Animated.add(0.94, Animated.multiply(overlayOpacity, 0.06)) }]
      : [{ translateX }];

  const getPrefix = (i: number) => {
    switch (listStyle) {
      case "arrow":
        return <Ionicons name="arrow-forward" size={13} color={muted} style={{ marginRight: 8 }} />;
      case "dot":
        return (
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: muted, marginRight: 10, marginTop: 1 }} />
        );
      case "numbered":
        return (
          <Text style={{ color: muted, fontSize: 12, fontWeight: "700", minWidth: 22, marginRight: 8 }}>{i + 1}.</Text>
        );
      default:
        return null;
    }
  };

  const showLinks = links.length > 0
    ? links
    : [
        { label: "Home", href: "/" },
        { label: "Shop", href: "/shop" },
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
      ];

  return (
    // Absolutely fills the parent (which should be a relative View wrapping the store)
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Dim overlay */}
      <Animated.View style={[sidebarStyles.overlay, { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Drawer — slides in from the LEFT */}
      <Animated.View
        style={[
          sidebarStyles.drawer,
          { backgroundColor: bg, borderRightColor: border },
          { transform: drawerTransform as any },
          animation === "fade" ? { opacity: overlayOpacity } : undefined,
        ]}
      >
        <View style={sidebarStyles.header}>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Ionicons name="close" size={22} color={muted} />
          </TouchableOpacity>
          <Text style={[sidebarStyles.brandText, { color: fg }]} numberOfLines={1}>
            {config.brand}
          </Text>
        </View>

        {showLinks.map((link, i) => (
          link.isButton && link.showInSidebar !== false ? (
            <View key={i} style={{ paddingHorizontal: 16, paddingVertical: 5 }}>
              <TouchableOpacity
                onPress={() => { onPagePress?.(link.href); onClose(); }}
                style={[
                  sidebarStyles.sideBtn,
                  link.btnStyle === "solid"
                    ? { backgroundColor: link.btnBg ?? accent }
                    : link.btnStyle === "ghost"
                    ? { backgroundColor: "transparent" }
                    : { borderWidth: 1.5, borderColor: link.btnBg ?? accent, backgroundColor: "transparent" },
                ]}
              >
                <Text style={[sidebarStyles.sideBtnText, {
                  color: link.btnColor ?? (link.btnStyle === "solid" ? "#fff" : accent),
                }]}>{link.label}</Text>
              </TouchableOpacity>
            </View>
          ) : link.isButton && link.showInSidebar === false ? null : (
            <TouchableOpacity
              key={i}
              onPress={() => { onPagePress?.(link.href); onClose(); }}
              style={[sidebarStyles.item, { borderBottomColor: border }]}
            >
              {getPrefix(i)}
              <Text style={[sidebarStyles.itemText, { color: fg }]}>{link.label}</Text>
              {listStyle === "chevron" && (
                <Ionicons name="chevron-forward" size={16} color={muted} style={{ marginLeft: "auto" }} />
              )}
            </TouchableOpacity>
          )
        ))}

        {/* Standalone CTA buttons — shown at bottom of sidebar (unless showInSidebar=false) */}
        {config.ctaButtons && config.ctaButtons.filter((b) => b.showInSidebar !== false).length > 0 && (
          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 }}>
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: border, marginBottom: 8 }} />
            {config.ctaButtons.filter((b) => b.showInSidebar !== false).map((btn, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => { onPagePress?.(btn.href); onClose(); }}
                style={[
                  sidebarStyles.sideBtn,
                  btn.style === "solid"
                    ? { backgroundColor: btn.btnBg ?? accent }
                    : btn.style === "ghost"
                    ? { backgroundColor: "transparent" }
                    : { borderWidth: 1.5, borderColor: btn.btnBg ?? accent, backgroundColor: "transparent" },
                ]}
              >
                <Text style={[sidebarStyles.sideBtnText, {
                  color: btn.btnColor ?? (btn.style === "solid" ? "#fff" : accent),
                }]}>{btn.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const sidebarStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: "72%",
    borderRightWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  brandText: { fontSize: 16, fontWeight: "700", letterSpacing: 0.4 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemText: { fontSize: 16, fontWeight: "500" },
  sideBtn: {
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sideBtnText: { fontSize: 15, fontWeight: "700", letterSpacing: 0.2 },
});

// ─── StoreNavbar ──────────────────────────────────────────────────────────────

export function StoreNavbar({
  config,
  theme,
  onPress,
  selected,
  onMenuOpen,
  onCartPress,
  onSearchPress,
  onLogoPress,
  onLinkPress,
  cartCount = 0,
  accentColor,
}: {
  config: NavbarConfig;
  theme: Theme;
  onPress?: () => void;
  selected?: boolean;
  onMenuOpen?: () => void;
  onCartPress?: () => void;
  onSearchPress?: () => void;
  onLogoPress?: () => void;
  onLinkPress?: (href: string) => void;
  cartCount?: number;
  accentColor?: string;
}) {
  const dark = theme !== "light";
  const navStyle = config.navbarStyle ?? "default";

  // Compute bg/fg/border based on visual style variant
  let bg: string, fg: string, muted: string, border: string, showBorder: boolean;
  if (navStyle === "transparent") {
    bg = "transparent"; fg = dark ? "#ffffff" : "#111111"; muted = dark ? "#aaaaaa" : "#555555"; border = "transparent"; showBorder = false;
  } else if (navStyle === "filled") {
    const fillBg = config.navbarBg ?? (dark ? "#111111" : "#111111");
    bg = fillBg; fg = "#ffffff"; muted = "rgba(255,255,255,0.65)"; border = "rgba(255,255,255,0.12)"; showBorder = false;
  } else if (navStyle === "minimal") {
    bg = dark ? "#0a0a0a" : "#ffffff"; fg = dark ? "#ffffff" : "#111111"; muted = dark ? "#888888" : "#666666"; border = "transparent"; showBorder = false;
  } else if (navStyle === "bordered") {
    bg = dark ? "#111111" : "#ffffff"; fg = dark ? "#ffffff" : "#111111"; muted = dark ? "#888888" : "#666666"; border = dark ? "#444444" : "#222222"; showBorder = true;
  } else {
    // default
    bg = dark ? "#111111" : "#ffffff"; fg = dark ? "#ffffff" : "#111111"; muted = dark ? "#888888" : "#666666"; border = dark ? "#222222" : "#eeeeee"; showBorder = true;
  }
  if (config.navbarBg && navStyle !== "filled") bg = config.navbarBg;

  const layout = config.layout ?? "logo-left";
  const isCenter = layout === "logo-center";
  const isRight = layout === "logo-right";

  const showBadge = (config.showCartCount !== false) && cartCount > 0;
  const badgeBg = config.cartBadgeColor ?? "#ef4444";

  const CartIcon = (
    <TouchableOpacity style={navStyles.iconBtn} onPress={onCartPress}>
      <View>
        <Ionicons name={(config.cartIcon as any) ?? "bag-outline"} size={19} color={muted} />
        {showBadge && (
          <View style={[navStyles.badge, { backgroundColor: badgeBg }]}>
            <Text style={navStyles.badgeText}>{cartCount > 9 ? "9+" : cartCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;

  const logoH = config.logoHeight ?? 34;
  const showLogo = (config.logoMode === "logo" || config.logoMode === "both") && !!config.logoImage;
  const showBrand = config.logoMode === "text" || config.logoMode === "both" || !config.logoMode;

  // Logo + text tightly grouped; image is a fixed square so no trailing whitespace gap
  const BrandInner = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: showLogo && showBrand ? 6 : 0 }}>
      {showLogo && (
        <Image
          source={{ uri: config.logoImage! }}
          style={{ height: logoH, width: logoH }}
          contentFit="contain"
        />
      )}
      {showBrand && (
        <Text
          style={[
            navStyles.brandText,
            { color: fg },
            config.brandFont && BRAND_FONT_MAP[config.brandFont]
              ? { fontFamily: BRAND_FONT_MAP[config.brandFont], fontWeight: "normal" }
              : {},
            config.brandFontSize ? { fontSize: config.brandFontSize } : {},
          ]}
          numberOfLines={1}
        >
          {config.brand}
        </Text>
      )}
    </View>
  );

  const BrandEl = (
    <TouchableOpacity
      style={[navStyles.brand, isCenter && { justifyContent: "center", flex: 0 }, isRight && { justifyContent: "flex-end" }]}
      onPress={onLogoPress}
      activeOpacity={onLogoPress ? 0.7 : 1}
      disabled={!onLogoPress}
    >
      {BrandInner}
    </TouchableOpacity>
  );

  const ctaAccent = accentColor ?? "#111111";

  // Build CTA button element
  const makeCta = (btn: NonNullable<typeof config.ctaButtons>[number], i: number) => (
    <TouchableOpacity
      key={i}
      onPress={() => onLinkPress?.(btn.href)}
      style={[
        navStyles.navCtaBtn,
        btn.style === "solid"
          ? { backgroundColor: btn.btnBg ?? ctaAccent }
          : btn.style === "ghost"
          ? { backgroundColor: "transparent" }
          : { borderWidth: 1.5, borderColor: btn.btnBg ?? ctaAccent, backgroundColor: "transparent" },
      ]}
    >
      <Text style={[navStyles.navCtaBtnText, {
        color: btn.btnColor ?? (btn.style === "solid" ? "#fff" : ctaAccent),
      }]}>{btn.label}</Text>
    </TouchableOpacity>
  );

  // showInSidebar=true: hide from navbar on mobile; on desktop (≥768) always show in navbar
  const navBtnsLeft = (config.ctaButtons ?? []).filter((b) => b.navPosition === "left" && (!b.showInSidebar || isDesktop));
  const navBtnsRight = (config.ctaButtons ?? []).filter((b) => b.navPosition !== "left" && (!b.showInSidebar || isDesktop));

  const IconsEl = (
    <View style={navStyles.right}>
      {config.showSearch && (
        <TouchableOpacity style={navStyles.iconBtn} onPress={onSearchPress}>
          <Ionicons name={(config.searchIcon as any) ?? "search-outline"} size={19} color={muted} />
        </TouchableOpacity>
      )}
      {config.showProfileIcon && (
        <TouchableOpacity style={navStyles.iconBtn} onPress={() => onLinkPress?.(config.profileLink ?? "/login")}>
          <Ionicons name={(config.profileIcon as any) ?? "person-circle-outline"} size={22} color={muted} />
        </TouchableOpacity>
      )}
      {config.showCart && CartIcon}
      {navBtnsRight.map(makeCta)}
      <TouchableOpacity style={navStyles.iconBtn} onPress={onMenuOpen}>
        <Ionicons name={(config.menuIcon as any) ?? "menu-outline"} size={22} color={fg} />
      </TouchableOpacity>
    </View>
  );

  return (
    <TouchableOpacity activeOpacity={onPress ? 0.85 : 1} onPress={onPress} disabled={!onPress}>
      <View style={[navStyles.nav, { backgroundColor: bg, borderBottomColor: border, borderBottomWidth: showBorder ? StyleSheet.hairlineWidth : 0 }, selected && navStyles.selected]}>
        {isCenter ? (
          // Center layout: hamburger left | logo center | icons right
          <>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity style={navStyles.iconBtn} onPress={onMenuOpen}>
                <Ionicons name={(config.menuIcon as any) ?? "menu-outline"} size={22} color={fg} />
              </TouchableOpacity>
              {navBtnsLeft.map(makeCta)}
            </View>
            <TouchableOpacity style={{ flex: 1, alignItems: "center" }} onPress={onLogoPress} activeOpacity={onLogoPress ? 0.7 : 1} disabled={!onLogoPress}>
              {BrandInner}
            </TouchableOpacity>
            <View style={navStyles.right}>
              {config.showSearch && <TouchableOpacity style={navStyles.iconBtn} onPress={onSearchPress}><Ionicons name={(config.searchIcon as any) ?? "search-outline"} size={19} color={muted} /></TouchableOpacity>}
              {config.showProfileIcon && <TouchableOpacity style={navStyles.iconBtn} onPress={() => onLinkPress?.(config.profileLink ?? "/login")}><Ionicons name={(config.profileIcon as any) ?? "person-circle-outline"} size={22} color={muted} /></TouchableOpacity>}
              {config.showCart && CartIcon}
              {navBtnsRight.map(makeCta)}
            </View>
          </>
        ) : isRight ? (
          // Right layout: icons left | logo right
          <>
            {IconsEl}
            <View style={{ flex: 1 }} />
            {BrandEl}
          </>
        ) : (
          // Default left layout: logo left | [left-buttons] | icons right
          <>
            {BrandEl}
            {navBtnsLeft.length > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 8 }}>
                {navBtnsLeft.map(makeCta)}
              </View>
            )}
            {IconsEl}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const navStyles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brand: { flexDirection: "row", alignItems: "center", flex: 1, flexShrink: 1 },
  brandText: { fontSize: 16, fontWeight: "700", letterSpacing: 0.5 },
  right: { flexDirection: "row", alignItems: "center", gap: 2 },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  selected: { borderWidth: 2, borderColor: "#6366f1" },
  badge: { position: "absolute", top: -5, right: -5, minWidth: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  navBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginRight: 4 },
  navCtaBtn: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 8, marginRight: 2 },
  navCtaBtnText: { fontSize: 13, fontWeight: "700", letterSpacing: 0.2 },
});

// ─── StoreFooter ──────────────────────────────────────────────────────────────

export function StoreFooter({
  config,
  theme,
  onPress,
  selected,
  onLinkPress,
}: {
  config: FooterConfig;
  theme: Theme;
  onPress?: () => void;
  selected?: boolean;
  onLinkPress?: (href: string) => void;
}) {
  const { designTokens } = useStorefront();
  const globalHeadingFont = designTokens?.fontHeading;
  const dark = theme !== "light";
  const bg = dark ? "#0a0a0a" : "#f8f8f8";
  const fg = dark ? "#ffffff" : "#111111";
  const muted = dark ? "#888888" : "#555555";
  const subtle = dark ? "#2a2a2a" : "#e5e5e5";

  const align = config.textAlign ?? "left";
  const alignItems =
    align === "center" ? ("center" as const) : align === "right" ? ("flex-end" as const) : ("flex-start" as const);

  return (
    <TouchableOpacity activeOpacity={onPress ? 0.85 : 1} onPress={onPress} disabled={!onPress}>
      <View style={[footerStyles.footer, { backgroundColor: bg, borderTopColor: subtle }, selected && navStyles.selected]}>
        <View style={{ alignItems }}>
          {/* Brand — logo and/or text tightly grouped */}
          {(() => {
            const fLogoH = config.logoHeight ?? 32;
            const fShowLogo = (config.logoMode === "logo" || config.logoMode === "both") && !!config.logoImage;
            const fShowText = config.logoMode === "text" || config.logoMode === "both" || !config.logoMode;
            return (
              <View style={{ flexDirection: "row", alignItems: "center", gap: fShowLogo && fShowText ? 6 : 0, justifyContent: alignItems === "center" ? "center" : alignItems === "flex-end" ? "flex-end" : "flex-start" }}>
                {fShowLogo && (
                  <Image source={{ uri: config.logoImage! }} style={{ height: fLogoH, width: fLogoH }} contentFit="contain" />
                )}
                {fShowText && (
                  <Text
                    style={[
                      footerStyles.brand,
                      { color: fg, textAlign: align },
                      globalHeadingFont && BRAND_FONT_MAP[globalHeadingFont]
                        ? { fontFamily: BRAND_FONT_MAP[globalHeadingFont], fontWeight: "normal" }
                        : {},
                    ]}
                  >
                    {config.brand}
                  </Text>
                )}
              </View>
            );
          })()}
          {config.tagline ? (
            <Text style={[footerStyles.tagline, { color: muted, textAlign: align }]}>{config.tagline}</Text>
          ) : null}
          {/* Footer CTA buttons */}
          {config.ctaButtons && config.ctaButtons.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, justifyContent: alignItems === "center" ? "center" : alignItems === "flex-end" ? "flex-end" : "flex-start" }}>
              {config.ctaButtons.map((btn, i) => {
                const btnAccent = btn.btnBg ?? fg;
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => onLinkPress?.(btn.href)}
                    style={[
                      footerStyles.ctaBtn,
                      btn.style === "solid"
                        ? { backgroundColor: btnAccent }
                        : btn.style === "ghost"
                        ? { backgroundColor: "transparent" }
                        : { borderWidth: 1.5, borderColor: btnAccent, backgroundColor: "transparent" },
                    ]}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "700", color: btn.btnColor ?? (btn.style === "solid" ? bg : btnAccent) }}>{btn.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {config.columns && config.columns.length > 0 && (
          <View
            style={[
              footerStyles.cols,
              align === "center"
                ? { justifyContent: "center" }
                : align === "right"
                ? { justifyContent: "flex-end" }
                : {},
            ]}
          >
            {config.columns.map((col, i) => (
              <View key={i} style={[footerStyles.col, { alignItems }]}>
                <Text style={[footerStyles.colTitle, { color: fg, textAlign: align }]}>{col.title}</Text>
                {col.links.map((l, j) => (
                  <TouchableOpacity key={j} onPress={() => onLinkPress?.(l.href)} activeOpacity={0.65}>
                    <Text style={[footerStyles.colLink, { color: muted, textAlign: align }]}>{l.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Social links */}
        {config.showSocial && config.socialLinks && config.socialLinks.length > 0 && (
          <View style={{ flexDirection: "row", gap: 12, marginTop: 20, flexWrap: "wrap", justifyContent: alignItems === "center" ? "center" : alignItems === "flex-end" ? "flex-end" : "flex-start" }}>
            {config.socialLinks.map((s, i) => {
              const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
                instagram: "logo-instagram",
                twitter: "logo-twitter",
                facebook: "logo-facebook",
                tiktok: "logo-tiktok",
                youtube: "logo-youtube",
                whatsapp: "logo-whatsapp",
                linkedin: "logo-linkedin",
                pinterest: "logo-pinterest",
                snapchat: "logo-snapchat",
              };
              const icon = iconMap[s.platform] ?? "globe-outline";
              return (
                <TouchableOpacity key={i} onPress={() => onLinkPress?.(s.url)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: muted + "22", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={icon} size={18} color={muted} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={[footerStyles.bottom, { borderTopColor: subtle, alignItems }]}>
          <Text style={[footerStyles.copy, { color: muted, textAlign: align }]}>
            © {new Date().getFullYear()} {config.brand}. All rights reserved.
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const footerStyles = StyleSheet.create({
  footer: { padding: 24, borderTopWidth: StyleSheet.hairlineWidth },
  brand: { fontSize: 16, fontWeight: "700", letterSpacing: 0.5 },
  tagline: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  cols: { flexDirection: "row", flexWrap: "wrap", gap: 20, marginTop: 20 },
  col: { minWidth: 100, gap: 4 },
  colTitle: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  colLink: { fontSize: 13, lineHeight: 21 },
  bottom: { marginTop: 24, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth },
  copy: { fontSize: 11 },
  ctaBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8 },
});
