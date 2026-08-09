import { Feather, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SectionRenderer, SectionScrollCtxProvider } from "@/components/storefront/SectionRenderer";
import { StoreFooter, StoreNavbar, StoreSidebar } from "@/components/storefront/SiteChrome";
import { getPageUrl, useStorefront } from "@/lib/storefront";
import { products as demoProducts } from "@/lib/storefront/products";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";

type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  image?: string;
};

type SearchProduct = { id: string; name: string; price: number; category?: string; imageUri?: string };

function SearchInputRow({
  searchQ, onChangeQ, onClose, colors,
}: { searchQ: string; onChangeQ: (v: string) => void; onClose: () => void; colors: any }) {
  return (
    <View style={[styles.searchRow, { borderBottomColor: colors.border }]}>
      <Ionicons name="search-outline" size={18} color={colors.mutedForeground} style={{ marginRight: 8 }} />
      <TextInput
        autoFocus
        value={searchQ}
        onChangeText={onChangeQ}
        placeholder="Search products…"
        placeholderTextColor={colors.mutedForeground}
        style={{ flex: 1, fontSize: 15, color: colors.foreground }}
      />
      {searchQ.length > 0 && (
        <TouchableOpacity onPress={() => onChangeQ("")}>
          <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={onClose} style={{ marginLeft: 10 }}>
        <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "600" }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

function SearchResultList({
  results, searchQ, colors, onSelect, flex,
}: { results: SearchProduct[]; searchQ: string; colors: any; onSelect: (p: SearchProduct) => void; flex?: boolean }) {
  return (
    <>
      <ScrollView keyboardShouldPersistTaps="handled" style={flex ? { flex: 1 } : { maxHeight: 340 }}>
        {results.length === 0 ? (
          <View style={{ padding: 32, alignItems: "center", gap: 8 }}>
            <Ionicons name="search-outline" size={36} color={colors.mutedForeground} />
            <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "600", marginTop: 4 }}>
              {searchQ.trim() ? "No products found" : "No products yet"}
            </Text>
            {searchQ.trim() ? (
              <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign: "center" }}>
                Try a different keyword or browse all products below
              </Text>
            ) : (
              <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign: "center" }}>
                Add products in the inventory tab to see them here
              </Text>
            )}
          </View>
        ) : results.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.searchResult, { borderBottomColor: colors.border }]}
            onPress={() => onSelect(p)}
          >
            {p.imageUri
              ? <Image source={{ uri: p.imageUri }} style={styles.searchThumb} />
              : <View style={[styles.searchThumb, { backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }]}>
                  <Ionicons name="cube-outline" size={18} color={colors.mutedForeground} />
                </View>}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }} numberOfLines={1}>{p.name}</Text>
              {p.category ? <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 1 }}>{p.category}</Text> : null}
            </View>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground, marginLeft: 8 }}>
              ₦{Number(p.price).toLocaleString("en-NG")}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {results.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ fontSize: 11, color: colors.mutedForeground, textAlign: "center" }}>
            {results.length} product{results.length === 1 ? "" : "s"}{searchQ.trim() ? ` matching "${searchQ}"` : " available"}
          </Text>
        </View>
      )}
    </>
  );
}

function BarTopSearch({
  visible, searchQ, onChangeQ, results, insets, colors, onClose, onSelect,
}: { visible: boolean; searchQ: string; onChangeQ: (v: string) => void; results: SearchProduct[]; insets: { top: number }; colors: any; onClose: () => void; onSelect: (p: SearchProduct) => void }) {
  const { width: winWidth } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const barWidth = isWeb ? Math.min(winWidth * 0.6, 600) : winWidth;
  const slideY = React.useRef(new Animated.Value(-160)).current;

  React.useEffect(() => {
    if (visible) {
      slideY.setValue(-160);
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 200, mass: 0.6 }).start();
    } else {
      Animated.timing(slideY, { toValue: -160, duration: 180, useNativeDriver: true, easing: Easing.in(Easing.cubic) }).start();
    }
  }, [visible]);

  const hasResults = results.length > 0 && searchQ.trim().length > 0;

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <View style={{ flex: 1 }} pointerEvents="box-none">
        {/* Tap-outside to close */}
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        {/* Centered bar */}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, alignItems: isWeb ? "center" : "stretch", pointerEvents: "box-none" }}>
          <Animated.View style={{ width: barWidth, transform: [{ translateY: slideY }], shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, elevation: 10 }}>
            {/* Input bar */}
            <View style={{ backgroundColor: colors.background, paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: hasResults ? 0 : 1, borderBottomColor: colors.border }}>
              <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
              <TextInput
                autoFocus
                value={searchQ}
                onChangeText={onChangeQ}
                placeholder="Search products…"
                placeholderTextColor={colors.mutedForeground}
                style={{ flex: 1, fontSize: 15, color: colors.foreground }}
              />
              {searchQ.length > 0 && (
                <TouchableOpacity onPress={() => onChangeQ("")}>
                  <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={{ marginLeft: 4 }}>
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
            </View>
            {/* Results row — horizontal scroll, ~60px height per row */}
            {hasResults && (
              <View style={{ backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 10 }}>
                  {results.slice(0, 12).map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => onSelect(p)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, maxWidth: 200 }}
                    >
                      {p.imageUri
                        ? <Image source={{ uri: p.imageUri }} style={{ width: 36, height: 36, borderRadius: 6 }} contentFit="cover" />
                        : <View style={{ width: 36, height: 36, borderRadius: 6, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }}>
                            <Ionicons name="cube-outline" size={14} color={colors.mutedForeground} />
                          </View>
                      }
                      <View style={{ maxWidth: 120 }}>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground }} numberOfLines={1}>{p.name}</Text>
                        <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "700", marginTop: 1 }}>₦{Number(p.price).toLocaleString("en-NG")}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

// Search always uses bar-top style: slides from top, 60% centered on web, 100% on mobile
function SearchModal({
  visible, searchQ, onChangeQ, results, insets, colors, onClose, onSelect,
}: {
  visible: boolean;
  searchQ: string;
  onChangeQ: (v: string) => void;
  results: SearchProduct[];
  insets: { top: number; bottom: number };
  colors: any;
  onClose: () => void;
  onSelect: (p: SearchProduct) => void;
}) {
  return <BarTopSearch visible={visible} searchQ={searchQ} onChangeQ={onChangeQ} results={results} insets={insets} colors={colors} onClose={onClose} onSelect={onSelect} />;
}

export default function StorePreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { applyTemplate, getTemplate, theme, navbar, footer } = useStorefront();
  const { products: inventory, profile } = useApp();
  const template = id ? getTemplate(id) : undefined;

  const [activeSlug, setActiveSlug] = useState("/");
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const cartSlide = React.useRef(new Animated.Value(400)).current;

  // Shared scroll offset for section entrance animations
  const scrollY = React.useRef(new Animated.Value(0)).current;
  // Use router.back() directly — the modal's native slide_from_bottom reverse animation
  // handles the slide-down exit cleanly without any blank-screen flash
  const dismiss = React.useCallback(() => router.back(), [router]);

  React.useEffect(() => {
    Animated.timing(cartSlide, {
      toValue: cartOpen ? 0 : 400,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [cartOpen]);

  useEffect(() => {
    if (id) applyTemplate(id);
  }, [id]);

  const navigate = (href: string) => {
    const [path, qs] = href.split("?");
    const params = new URLSearchParams(qs ?? "");
    setActiveSlug(path);
    setActiveCategory(params.get("category") ?? undefined);
  };

  // Extract product slug when on a product page (e.g. /product/abc123 → abc123)
  const activeProductSlug = activeSlug.startsWith("/product/")
    ? activeSlug.slice("/product/".length)
    : undefined;

  const page = useMemo(() => {
    if (!template) return null;
    // Exact match first
    const exact = template.pages.find((p) => getPageUrl(p.slug) === activeSlug);
    if (exact) return exact;
    // Wildcard: /product/ANYTHING → page with slug /product/:slug
    if (activeSlug.startsWith("/product/")) {
      const productPage = template.pages.find((p) => p.slug === "/product/:slug");
      if (productPage) return productPage;
    }
    return template.pages.find((p) => p.slug === "/") ?? template.pages[0];
  }, [template, activeSlug]);

  // Announcements always render just below the navbar regardless of their position in the array
  const allSections = page?.sections ?? [];
  const announcementSections = allSections.filter((s) => s.type === "announcement");
  const sections = allSections.filter((s) => s.type !== "announcement");
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  // Use live inventory when available; fall back to demo catalog so search is never empty
  const searchProducts: SearchProduct[] = inventory.length > 0
    ? inventory.filter((p) => p.inStock !== false).map((p) => ({
        id: p.id, name: p.name, price: p.price,
        category: p.category, imageUri: p.imageUri,
      }))
    : demoProducts.map((p) => ({
        id: p.slug, name: p.name, price: p.price,
        category: p.category, imageUri: p.image,
      }));
  const searchResults = searchQ.trim()
    ? searchProducts.filter((p) =>
        (p.name + " " + (p.category ?? ""))
          .toLowerCase()
          .includes(searchQ.toLowerCase())
      )
    : searchProducts;

  const addToCart = (product: { id: string; name: string; price: number; imageUri?: string }) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1, image: product.imageUri }];
    });
    // Badge on cart icon updates — drawer stays closed until vendor taps it
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => i.id === id ? { ...i, qty: i.qty + delta } : i).filter((i) => i.qty > 0)
    );
  };

  const handleContactSubmit = async (data: { name: string; email: string; subject?: string; message: string }) => {
    const username = profile?.username ?? template?.launchUrl?.split("/@")[1];
    if (!username) throw new Error("Store not configured");
    await api.post(`/store/${username}/contact`, data);
  };

  if (!template) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.mutedForeground }}>Store not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* App top bar */}
      <View style={[styles.bar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={dismiss} style={styles.iconBtn}>
          <Feather name="chevron-down" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontWeight: "600", color: colors.foreground, fontSize: 13, textAlign: "center" }} numberOfLines={1}>
          {template.name}
        </Text>
        <TouchableOpacity
          onPress={dismiss}
          style={[styles.editBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="edit-2" size={14} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Edit</Text>
        </TouchableOpacity>
        {template.launched && template.launchUrl ? (
          <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(template.launchUrl!)} style={styles.iconBtn}>
            <Feather name="globe" size={18} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Store content */}
      <View style={{ flex: 1, position: "relative" }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
        >
          {/* Navbar: always visible in preview (dimmed if hideNavbar is set) */}
          <View style={page?.hideNavbar ? { opacity: 0.3 } : undefined}>
            <StoreNavbar
              config={navbar}
              theme={template.theme ?? theme}
              onMenuOpen={() => setMenuOpen(true)}
              onCartPress={() => setCartOpen(true)}
              onSearchPress={() => { setSearchQ(""); setSearchOpen(true); }}
              onLogoPress={() => navigate("/")}
              onLinkPress={(href) => { if (!href.includes(":")) navigate(href); }}
              cartCount={cartCount}
            />
          </View>

          {/* Announcement bar(s) always sit directly below the navbar */}
          {announcementSections.length > 0 && (
            <SectionScrollCtxProvider value={scrollY}>
              {announcementSections.map((s) => (
                <SectionRenderer
                  key={s.id}
                  section={s}
                  theme={template.theme ?? theme}
                  onLinkPress={(href) => { if (!href.includes(":")) navigate(href); }}
                  onAddToCart={addToCart}
                  previewCart={cart}
                  onContactSubmit={handleContactSubmit}
                />
              ))}
            </SectionScrollCtxProvider>
          )}

          {sections.length === 0 ? (
            <View style={[styles.emptySections, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="layout" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No sections yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Add sections in the editor to build your store page.
              </Text>
              <TouchableOpacity
                onPress={dismiss}
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              >
                <Feather name="plus" size={14} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>Add sections in editor</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <SectionScrollCtxProvider value={scrollY}>
              {sections.map((s) => (
                <SectionRenderer
                  key={s.id}
                  section={s}
                  theme={template.theme ?? theme}
                  onLinkPress={(href) => { if (!href.includes(":")) navigate(href); }}
                  onAddToCart={addToCart}
                  previewCart={cart}
                  activeProductSlug={activeProductSlug}
                  initialCategory={activeCategory}
                  onContactSubmit={handleContactSubmit}
                />
              ))}
            </SectionScrollCtxProvider>
          )}

          {!page?.hideFooter && (
            <StoreFooter config={footer} theme={template.theme ?? theme} onLinkPress={(href) => navigate(href)} />
          )}
        </ScrollView>

        <StoreSidebar
          config={navbar}
          theme={template.theme ?? theme}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          onPagePress={(href) => navigate(href)}
          accentColor={colors.primary}
        />
      </View>

      {/* Search — slides from top, 60% on web / 100% on mobile */}
      <SearchModal
        visible={searchOpen}
        searchQ={searchQ}
        onChangeQ={setSearchQ}
        results={searchResults}
        insets={insets}
        colors={colors}
        onClose={() => setSearchOpen(false)}
        onSelect={(p) => { setSearchOpen(false); navigate(`/product/${p.id}`); }}
      />

      {/* Cart drawer */}
      <Modal visible={cartOpen} animationType="none" transparent onRequestClose={() => setCartOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setCartOpen(false)} />
        <Animated.View style={[styles.cartSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16, transform: [{ translateX: cartSlide }] }]}>
          <View style={styles.cartHeader}>
            <Text style={[styles.cartTitle, { color: colors.foreground }]}>
              Cart{cartCount > 0 ? ` (${cartCount})` : ""}
            </Text>
            <TouchableOpacity onPress={() => setCartOpen(false)}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <Feather name="shopping-bag" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyCartText, { color: colors.mutedForeground }]}>Your cart is empty</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
              {cart.map((item) => (
                <View key={item.id} style={[styles.cartItem, { borderBottomColor: colors.border }]}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.cartImg} contentFit="cover" />
                  ) : (
                    <View style={[styles.cartImgPlaceholder, { backgroundColor: colors.secondary }]}>
                      <Feather name="package" size={20} color={colors.mutedForeground} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.cartItemName, { color: colors.foreground }]} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={[styles.cartItemPrice, { color: colors.primary }]}>
                      ₦{(item.price * item.qty).toLocaleString("en-NG")}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <View style={styles.qtyRow}>
                      <TouchableOpacity onPress={() => updateQty(item.id, -1)} style={[styles.qtyBtn, { borderColor: colors.border }]}>
                        <Feather name="minus" size={12} color={colors.foreground} />
                      </TouchableOpacity>
                      <Text style={[styles.qtyNum, { color: colors.foreground }]}>{item.qty}</Text>
                      <TouchableOpacity onPress={() => updateQty(item.id, 1)} style={[styles.qtyBtn, { borderColor: colors.border }]}>
                        <Feather name="plus" size={12} color={colors.foreground} />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => setCart((prev) => prev.filter((i) => i.id !== item.id))}>
                      <Text style={{ fontSize: 11, color: colors.mutedForeground }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {cart.length > 0 && (
            <View style={[styles.cartFooter, { borderTopColor: colors.border }]}>
              <View style={styles.totalRow}>
                <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>Total</Text>
                <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "700" }}>
                  ₦{cartTotal.toLocaleString("en-NG")}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.checkoutBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
                onPress={() => {
                  setCartOpen(false);
                  setActiveSlug("/checkout");
                }}
              >
                <Feather name="credit-card" size={16} color="#fff" />
                <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCart([])} style={{ alignItems: "center", marginTop: 10 }}>
                <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Clear cart</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, gap: 4 },
  iconBtn: { padding: 10 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  emptySections: { margin: 24, borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  // Search overlay
  searchSheet: { marginHorizontal: 12, borderRadius: 16, borderWidth: 1, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 20 },
  searchRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  searchResult: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  searchThumb: { width: 44, height: 44, borderRadius: 8 },
  // Cart drawer
  cartSheet: { position: "absolute", top: 0, right: 0, bottom: 0, width: "82%", maxWidth: 380, shadowColor: "#000", shadowOffset: { width: -4, height: 0 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 20 },
  cartHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  cartTitle: { fontSize: 18, fontWeight: "700" },
  emptyCart: { alignItems: "center", gap: 12, paddingVertical: 40 },
  emptyCartText: { fontSize: 14 },
  cartItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  cartImg: { width: 60, height: 60, borderRadius: 10 },
  cartImgPlaceholder: { width: 60, height: 60, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cartItemName: { fontSize: 14, fontWeight: "500", lineHeight: 19 },
  cartItemPrice: { fontSize: 14, fontWeight: "700" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  qtyNum: { fontSize: 15, fontWeight: "600", minWidth: 20, textAlign: "center" },
  cartFooter: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, gap: 12 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  checkoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14 },
  checkoutBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
