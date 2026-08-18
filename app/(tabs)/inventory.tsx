import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { hapticImpact, hapticNotification } from "@/hooks/useHapticsStore";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddProductModal } from "@/components/AddProductModal";
import { ProductCard } from "@/components/ProductCard";
import { TemplateCard } from "@/components/storefront/TemplateCard";
import { PresetTemplateCard } from "@/components/storefront/PresetTemplateCard";
import { Product, useApp } from "@/context/AppContext";
import { TEMPLATE_PRESETS, useStorefront } from "@/lib/storefront";
import { useColors } from "@/hooks/useColors";

const TABS = [
  { key: "products", label: "Products", icon: "package" },
  { key: "templates", label: "Templates", icon: "layout" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ─── Component ────────────────────────────────────────────────────────────────

export default function InventoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { products, toggleProductStock, addProduct, updateProduct, deleteProduct, refreshProducts } = useApp();
  const {
    templates,
    activeTemplateId,
    applyTemplate,
    newTemplate,
    newBlankTemplate,
    duplicateTemplate,
    deleteTemplate,
    renameTemplate,
    patchTemplate,
  } = useStorefront();
  const [activeTab, setActiveTab] = useState<TabKey>("products");
  const [refreshing, setRefreshing] = useState(false);
  const [productsRevealed, setProductsRevealed] = useState(products.length > 0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createMode, setCreateMode] = useState<"atelier" | "blank">("atelier");

  useEffect(() => {
    if (productsRevealed) return;
    if (products.length > 0) { setProductsRevealed(true); return; }
    const t = setTimeout(() => setProductsRevealed(true), 3000);
    return () => clearTimeout(t);
  }, [products.length, productsRevealed]);
  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshProducts().catch(() => {});
    setRefreshing(false);
  };

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | undefined>(undefined);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateTab, setTemplateTab] = useState<"mine" | "store">("mine");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + 96;

  const filteredTemplates = templateSearch.trim()
    ? templates.filter((t) => t.name.toLowerCase().includes(templateSearch.toLowerCase()))
    : templates;

  const openEditor = (id: string) => {
    applyTemplate(id);
    router.push(`/store-builder/${id}` as any);
  };

  const handleCreateTemplate = () => {
    const name = createName.trim();
    if (!name) return;
    const isBlank = createMode === "blank";
    const id = isBlank ? newBlankTemplate(name) : newTemplate(name);
    applyTemplate(id);
    setCreateName("");
    setShowCreateModal(false);
    hapticNotification();
    router.push(`/store-builder/${id}` as any);
  };

  const handleDeleteProduct = (id: string, name: string) => {
    if (Platform.OS !== "web") {
      Alert.alert("Delete Product", `Remove "${name}" from your inventory?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteProduct(id) },
      ]);
    } else {
      deleteProduct(id);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Inventory</Text>
        </View>

        <View style={[styles.tabsRow, { backgroundColor: colors.muted, borderRadius: 10 }]}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tabBtn, { backgroundColor: active ? colors.card : "transparent", borderRadius: 8 }]}
              >
                <Feather name={tab.icon as any} size={13} color={active ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.tabLabel, { color: active ? colors.primary : colors.mutedForeground, fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Products tab */}
      {activeTab === "products" && (
        <>
          {!productsRevealed && products.length === 0 ? (
            <View style={styles.emptyProducts}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Loading products...
              </Text>
            </View>
          ) : products.length === 0 ? (
            <ScrollView
              contentContainerStyle={styles.emptyProducts}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
            >
              <Feather name="package" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 16 }]}>
                No products yet
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Tap + to add your first product. Pull down to refresh if you recently added products.
              </Text>
            </ScrollView>
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={[styles.gridContent, { paddingBottom: bottomPad + 20 }]}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
              renderItem={({ item }) => (
                <View style={styles.gridCell}>
                  <TouchableOpacity
                    onPress={() => {
                      hapticImpact();
                      router.push(`/product/${item.id}` as any);
                    }}
                    onLongPress={() => {
                      if (Platform.OS !== "web") {
                        hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
                        Alert.alert(item.name, "What would you like to do?", [
                          { text: "View Details", onPress: () => router.push(`/product/${item.id}` as any) },
                          { text: "Delete", style: "destructive", onPress: () => handleDeleteProduct(item.id, item.name) },
                          { text: "Cancel", style: "cancel" },
                        ]);
                      }
                    }}
                    activeOpacity={0.88}
                  >
                    <ProductCard product={item} onToggleStock={toggleProductStock} />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}

          {/* Bottom-left FAB */}
          <TouchableOpacity
            onPress={() => {
              hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
              setEditProduct(undefined);
              setAddModalVisible(true);
            }}
            style={[styles.fab, { backgroundColor: colors.primary, bottom: bottomPad }]}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </>
      )}

      {/* Templates tab */}
      {activeTab === "templates" && (
        <View style={{ flex: 1 }}>
          {/* Sub-tab switcher */}
          <View style={[styles.subTabRow, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            {(["mine", "store"] as const).map((tab) => {
              const active = templateTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setTemplateTab(tab)}
                  style={[styles.subTab, { borderBottomColor: active ? colors.primary : "transparent" }]}
                >
                  <Feather
                    name={tab === "mine" ? "layout" : "download-cloud"}
                    size={14}
                    color={active ? colors.primary : colors.mutedForeground}
                  />
                  <Text style={{ fontSize: 13, fontWeight: active ? "600" : "400", color: active ? colors.primary : colors.mutedForeground, fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular" }}>
                    {tab === "mine" ? "My templates" : "Template store"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* My templates */}
          {templateTab === "mine" && (
            <ScrollView
              contentContainerStyle={[styles.templatesContent, { paddingBottom: bottomPad + 20 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.storeBuilderEyebrow, { color: colors.mutedForeground }]}>Store builder</Text>
                  <Text style={[styles.storeBuilderTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Templates</Text>
                  <Text style={[styles.storeBuilderSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    Choose a preset to customise, or create a new one.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowCreateModal(true)}
                  style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 }}
                >
                  <Feather name="plus" size={14} color="#fff" />
                  <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>New</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, marginTop: 16 }]}>
                <Feather name="search" size={16} color={colors.mutedForeground} />
                <TextInput
                  value={templateSearch}
                  onChangeText={setTemplateSearch}
                  placeholder="Search templates..."
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                />
                {templateSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setTemplateSearch("")}>
                    <Feather name="x" size={15} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>

              {/* All templates — 2-column grid */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
                {/* User-created templates */}
                {filteredTemplates.map((template) => (
                  <View key={template.id} style={{ width: "48%" }}>
                    <TemplateCard
                      compact
                      template={template}
                      active={template.id === activeTemplateId}
                      canDelete={templates.length > 1}
                      onEdit={() => openEditor(template.id)}
                      onDuplicate={() => duplicateTemplate(template.id)}
                      onDelete={() => deleteTemplate(template.id)}
                      onRename={(name) => renameTemplate(template.id, name)}
                      onThumbnailChange={(thumbnail) => patchTemplate(template.id, { thumbnail })}
                      onPreview={() => router.push(`/store-preview/${template.id}` as any)}
                    />
                  </View>
                ))}

                {/* Preset cards — only show presets not already in user's list */}
                {TEMPLATE_PRESETS.filter((p) => {
                  const nameMatch = !templateSearch.trim() || p.label.toLowerCase().includes(templateSearch.toLowerCase());
                  const alreadyCreated = templates.some((t) => t.name === p.label);
                  return nameMatch && !alreadyCreated;
                }).map((preset) => (
                  <View key={preset.key} style={{ width: "48%" }}>
                    <PresetTemplateCard
                      preset={preset}
                      onEdit={(p) => {
                        const id = newTemplate(p.label, p.create);
                        applyTemplate(id);
                        hapticNotification();
                        router.push(`/store-builder/${id}` as any);
                      }}
                      onDuplicate={(p) => {
                        newTemplate(p.label + " Copy", p.create);
                        hapticImpact();
                      }}
                    />
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Template store — coming soon */}
          {templateTab === "store" && (
            <ScrollView contentContainerStyle={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }} showsVerticalScrollIndicator={false}>
              <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: colors.primary + "12", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <Feather name="download-cloud" size={36} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 8 }}>
                Template Store
              </Text>
              <Text style={{ fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, marginBottom: 24, maxWidth: 300 }}>
                Browse and install ready-made storefront templates built by designers — one tap to apply and start customising.
              </Text>
              <View style={[styles.comingSoonBadge, { backgroundColor: colors.primary + "15", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 }]}>
                <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Coming soon</Text>
              </View>

              <View style={{ marginTop: 40, gap: 12, width: "100%", maxWidth: 320 }}>
                {["Fashion & Apparel", "Food & Grocery", "Beauty & Wellness", "Electronics", "Home & Lifestyle"].map((cat) => (
                  <View key={cat} style={[styles.storeCategory, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Feather name="tag" size={14} color={colors.mutedForeground} />
                    <Text style={{ flex: 1, color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 13 }}>{cat}</Text>
                    <View style={{ backgroundColor: colors.muted, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ fontSize: 11, color: colors.mutedForeground }}>Soon</Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {/* ── Create template modal ── */}
      <Modal visible={showCreateModal} transparent animationType="fade" onRequestClose={() => setShowCreateModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{ width: "100%", maxWidth: 360, backgroundColor: colors.card, borderRadius: 24, padding: 24, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 24, elevation: 20 }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground }}>New template</Text>
                <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 }}>Name it, then pick your starting point</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCreateModal(false)} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }}>
                <Feather name="x" size={15} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Name input */}
            <TextInput
              value={createName}
              onChangeText={setCreateName}
              placeholder="e.g. Main store, Summer drop…"
              placeholderTextColor={colors.mutedForeground}
              style={{ height: 46, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular", backgroundColor: colors.background, marginBottom: 14 }}
              autoFocus
              returnKeyType="done"
            />

            {/* Mode cards */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
              <TouchableOpacity
                onPress={() => setCreateMode("atelier")}
                style={{ flex: 1, borderWidth: 2, borderColor: createMode === "atelier" ? colors.primary : colors.border, borderRadius: 16, padding: 14, backgroundColor: createMode === "atelier" ? colors.primary + "0d" : colors.background }}
              >
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primary + "20", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                  <Feather name="zap" size={16} color={colors.primary} />
                </View>
                <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: colors.foreground }}>Atelier</Text>
                <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 3, lineHeight: 16 }}>Pre-styled with design tokens</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setCreateMode("blank")}
                style={{ flex: 1, borderWidth: 2, borderColor: createMode === "blank" ? colors.primary : colors.border, borderRadius: 16, padding: 14, backgroundColor: createMode === "blank" ? colors.primary + "0d" : colors.background }}
              >
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                  <Feather name="layers" size={16} color={colors.mutedForeground} />
                </View>
                <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: colors.foreground }}>Blank</Text>
                <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 3, lineHeight: 16 }}>Build from scratch in Studio</Text>
              </TouchableOpacity>
            </View>

            {/* Create button */}
            <TouchableOpacity
              onPress={handleCreateTemplate}
              disabled={!createName.trim()}
              style={{ height: 48, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, opacity: createName.trim() ? 1 : 0.4 }}
            >
              <Feather name="plus" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                {createMode === "blank" ? "Create & open Studio" : "Create & open Editor"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AddProductModal
        visible={addModalVisible}
        onClose={() => { setAddModalVisible(false); setEditProduct(undefined); }}
        onSave={(product) => {
          if (editProduct) {
            updateProduct(editProduct.id, product);
          } else {
            addProduct(product);
          }
        }}
        editProduct={editProduct}
      />

    </View>
  );
}

// ─── Professional Website Thumbnail ──────────────────────────────────────────

function ProfessionalThumbnail({
  accentColor,
  bgColor,
  textColor,
  mutedColor,
  category,
  storeName,
}: {
  accentColor: string;
  bgColor: string;
  textColor: string;
  mutedColor: string;
  category: string;
  storeName: string;
}) {
  return (
    <View style={[styles.thumbnail, { backgroundColor: bgColor }]}>
      {/* Browser chrome bar */}
      <View style={[styles.browserBar, { backgroundColor: "#F1F5F9" }]}>
        <View style={styles.browserDots}>
          <View style={[styles.dot, { backgroundColor: "#FC6C62" }]} />
          <View style={[styles.dot, { backgroundColor: "#FBBD28" }]} />
          <View style={[styles.dot, { backgroundColor: "#2AC84D" }]} />
        </View>
        <View style={[styles.urlBar, { backgroundColor: "#FFFFFF" }]}>
          <View style={[styles.urlLock, { backgroundColor: "#10B981" }]} />
          <Text style={[styles.urlText, { color: "#64748B" }]} numberOfLines={1}>
            {storeName.toLowerCase().replace(/\s/g, "")}.keeosk.app
          </Text>
        </View>
      </View>

      {/* Navbar */}
      <View style={[styles.navBar, { backgroundColor: accentColor }]}>
        <Text style={styles.navLogo} numberOfLines={1}>{storeName}</Text>
        <View style={styles.navLinks}>
          {["Shop", "About", "Cart"].map((link) => (
            <View key={link} style={styles.navLinkPill}>
              <Text style={styles.navLinkText}>{link}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Hero section */}
      <View style={[styles.heroSection, { backgroundColor: accentColor + "E8" }]}>
        <View style={styles.heroContent}>
          <View style={[styles.heroCategoryBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Text style={styles.heroCategoryText}>{category}</Text>
          </View>
          <View style={[styles.heroTitle, { backgroundColor: "rgba(255,255,255,0.92)", width: "68%" }]} />
          <View style={[styles.heroSubtitle, { backgroundColor: "rgba(255,255,255,0.55)", width: "50%" }]} />
          <View style={styles.heroButtons}>
            <View style={[styles.heroBtn, { backgroundColor: "rgba(255,255,255,0.95)" }]}>
              <Text style={[styles.heroBtnText, { color: accentColor }]}>Shop Now</Text>
            </View>
            <View style={[styles.heroBtn, { backgroundColor: "transparent", borderWidth: 1, borderColor: "rgba(255,255,255,0.6)" }]}>
              <Text style={[styles.heroBtnText, { color: "#FFFFFF" }]}>Learn More</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Products row */}
      <View style={[styles.productsRow, { backgroundColor: bgColor }]}>
        <View style={styles.productSectionHeader}>
          <View style={[styles.productSectionTitle, { backgroundColor: textColor + "30", width: "35%" }]} />
          <View style={[styles.viewAllBtn, { backgroundColor: accentColor + "15" }]}>
            <Text style={[styles.viewAllText, { color: accentColor }]}>View All</Text>
          </View>
        </View>
        <View style={styles.productCards}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.productCard, { backgroundColor: bgColor === "#FFFFFF" ? "#F8FAFC" : "rgba(255,255,255,0.85)", borderColor: accentColor + "18" }]}>
              <View style={[styles.productCardImg, { backgroundColor: accentColor + "18" }]}>
                <Feather name="image" size={8} color={accentColor + "60"} />
              </View>
              <View style={styles.productCardBody}>
                <View style={[styles.productCardLine, { backgroundColor: textColor + "35", width: "80%" }]} />
                <View style={[styles.productCardLine, { backgroundColor: mutedColor + "40", width: "55%", height: 3 }]} />
                <View style={styles.productCardFooter}>
                  <View style={[styles.productCardPrice, { backgroundColor: accentColor + "50" }]} />
                  <View style={[styles.productCardCart, { backgroundColor: accentColor }]}>
                    <Feather name="shopping-cart" size={5} color="#FFFFFF" />
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Footer bar */}
      <View style={[styles.footerBar, { backgroundColor: textColor }]}>
        <View style={styles.footerContent}>
          <View style={[styles.footerLogo, { backgroundColor: "rgba(255,255,255,0.25)" }]} />
          <View style={styles.footerLinks}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.footerLink, { backgroundColor: "rgba(255,255,255,0.18)" }]} />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}


// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center" },
  title: { fontSize: 24, letterSpacing: -0.5, flex: 1 },
  tabsRow: { flexDirection: "row", padding: 4, gap: 2 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9 },
  tabLabel: { fontSize: 13 },

  // Products
  gridRow: { paddingHorizontal: 12, gap: 10 },
  gridContent: { paddingTop: 12, paddingHorizontal: 0 },
  gridCell: { flex: 1, marginBottom: 10 },
  emptyProducts: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 12 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },

  // FAB (bottom-left)
  fab: {
    position: "absolute",
    left: 20,
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1A1C4B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },

  // Templates
  templatesContent: { padding: 16, gap: 16 },
  storeBuilderEyebrow: { fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 },
  storeBuilderTitle: { fontSize: 28, marginBottom: 6 },
  storeBuilderSub: { fontSize: 14, lineHeight: 20 },
  newTemplatePill: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  templatesNote: { fontSize: 13, lineHeight: 18 },
  templateCard: { borderWidth: 1, overflow: "hidden" },

  // Professional thumbnail
  thumbnail: { height: 240, overflow: "hidden" },

  // Browser chrome
  browserBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 5, gap: 6 },
  browserDots: { flexDirection: "row", gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  urlBar: { flex: 1, flexDirection: "row", alignItems: "center", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, gap: 4 },
  urlLock: { width: 4, height: 4, borderRadius: 1 },
  urlText: { fontSize: 7, fontFamily: "Inter_400Regular" },

  // Nav bar
  navBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 5 },
  navLogo: { color: "#FFFFFF", fontSize: 8, fontFamily: "Inter_700Bold" },
  navLinks: { flexDirection: "row", gap: 4 },
  navLinkPill: {},
  navLinkText: { color: "rgba(255,255,255,0.8)", fontSize: 6, fontFamily: "Inter_400Regular" },

  // Hero
  heroSection: { paddingHorizontal: 12, paddingVertical: 10 },
  heroContent: { gap: 4 },
  heroCategoryBadge: { alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  heroCategoryText: { color: "rgba(255,255,255,0.85)", fontSize: 5, fontFamily: "Inter_500Medium" },
  heroTitle: { height: 8, borderRadius: 4 },
  heroSubtitle: { height: 5, borderRadius: 3 },
  heroButtons: { flexDirection: "row", gap: 5, marginTop: 4 },
  heroBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  heroBtnText: { fontSize: 5, fontFamily: "Inter_600SemiBold" },

  // Products section
  productsRow: { paddingHorizontal: 10, paddingTop: 7, paddingBottom: 4 },
  productSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5 },
  productSectionTitle: { height: 5, borderRadius: 3 },
  viewAllBtn: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  viewAllText: { fontSize: 5, fontFamily: "Inter_500Medium" },
  productCards: { flexDirection: "row", gap: 5 },
  productCard: { flex: 1, borderRadius: 4, overflow: "hidden", borderWidth: 0.5 },
  productCardImg: { height: 28, alignItems: "center", justifyContent: "center" },
  productCardBody: { padding: 5, gap: 3 },
  productCardLine: { height: 4, borderRadius: 2 },
  productCardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  productCardPrice: { width: "45%", height: 5, borderRadius: 2 },
  productCardCart: { width: 12, height: 12, borderRadius: 3, alignItems: "center", justifyContent: "center" },

  // Footer
  footerBar: { paddingHorizontal: 10, paddingVertical: 6 },
  footerContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  footerLogo: { width: 24, height: 6, borderRadius: 2 },
  footerLinks: { flexDirection: "row", gap: 4 },
  footerLink: { width: 16, height: 4, borderRadius: 2 },

  // Sub-tabs (my templates / store)
  subTabRow: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 16 },
  subTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderBottomWidth: 2 },
  storeCategory: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderWidth: 1, borderRadius: 12 },

  // Search & marketplace
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  marketplaceBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderWidth: 1 },
  marketplaceTitle: { fontSize: 13 },
  marketplaceSub: { fontSize: 12 },
  comingSoonBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  comingSoonText: { fontSize: 11 },

  // Template card body
  templateBody: { padding: 14, gap: 10 },
  templateNameRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  templateName: { fontSize: 16 },
  templateTagline: { fontSize: 12, marginTop: 2 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 11 },
  templateGateways: { flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "center" },
  gwChip: { paddingHorizontal: 8, paddingVertical: 4 },
  gwText: { fontSize: 11 },
  gwLogoBox: { height: 28, paddingHorizontal: 10, borderRadius: 7, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  gwLogo: { height: 18, width: 72 },
  templateIconBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  launchInfo: { flexDirection: "row", alignItems: "center", gap: 6, padding: 8 },
  launchUrl: { flex: 1, fontSize: 11 },
  templateActions: { flexDirection: "row", gap: 8 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10, flex: 1 },
  actionBtnText: { fontSize: 12 },

  // New store button
  newStoreBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7 },
  newStoreBtnText: { color: "#FFFFFF", fontSize: 13 },

  // Modals
  modalOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)" },
  bottomSheet: { position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 12 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 },
  sheetTitle: { flex: 1, fontSize: 17 },
  sheetClose: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  fieldLabel: { fontSize: 13, marginBottom: 2 },
  modalInput: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },

  // Create template kinds
  kindCard: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, padding: 14 },
  kindIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  kindLabel: { fontSize: 14 },
  kindDesc: { fontSize: 12, marginTop: 1 },

  createBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, marginTop: 4 },
  createBtnText: { color: "#FFFFFF", fontSize: 16 },
});
