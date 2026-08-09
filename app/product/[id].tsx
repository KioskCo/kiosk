import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { hapticImpact, hapticNotification } from "@/hooks/useHapticsStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddProductModal } from "@/components/AddProductModal";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { flashSaleApi } from "@/lib/api";

const { width: SCREEN_W } = Dimensions.get("window");

function formatNaira(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products, updateProduct, deleteProduct, templates, profile } = useApp();

  const product = products.find((p) => p.id === id);
  const [editVisible, setEditVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [shareVisible, setShareVisible] = useState(false);
  const [saleVisible, setSaleVisible] = useState(false);
  const [salePriceInput, setSalePriceInput] = useState("");
  const [saleDuration, setSaleDuration] = useState<"1h" | "3h" | "6h" | "24h">("3h");

  const launchedTemplate = templates.find((t) => t.launched);
  const storeUrl = launchedTemplate?.launchUrl ?? `https://kiosk.store/@${profile?.username ?? ""}`;
  const productUrl = product ? `${storeUrl}/product/${product.id}` : storeUrl;
  const defaultCaption = product
    ? `${product.name}\n\nPrice: ₦${product.price.toLocaleString("en-NG")}\n\nOrder here: ${productUrl}`
    : "";
  const [shareCaption, setShareCaption] = useState(defaultCaption);
  const [linkCopied, setLinkCopied] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  if (!product) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <Feather name="package" size={40} color={colors.mutedForeground} />
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 12 }}>Product not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const allImages: string[] = [
    ...(product.imageUri ? [product.imageUri] : []),
    ...(product.images ?? []),
  ];

  const handleDelete = () => {
    if (Platform.OS !== "web") {
      Alert.alert("Delete Product", `Remove "${product.name}" from your inventory?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteProduct(product.id);
            hapticNotification(Haptics.NotificationFeedbackType.Warning);
            router.back();
          },
        },
      ]);
    } else {
      deleteProduct(product.id);
      router.back();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>
          {product.name}
        </Text>
        <TouchableOpacity
          onPress={() => { setSalePriceInput(""); setSaleVisible(true); }}
          style={[styles.shareBtn, { backgroundColor: "#FEF3C7", borderRadius: 10 }]}
        >
          <Feather name="zap" size={16} color="#D97706" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setShareCaption(defaultCaption); setShareVisible(true); }}
          style={[styles.shareBtn, { backgroundColor: colors.secondary, borderRadius: 10 }]}
        >
          <Feather name="share-2" size={16} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setEditVisible(true)} style={[styles.editBtn, { backgroundColor: colors.secondary, borderRadius: 10 }]}>
          <Feather name="edit-2" size={16} color={colors.primary} />
          <Text style={[styles.editBtnText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>

        {/* Image gallery */}
        {allImages.length > 0 ? (
          <View style={styles.gallerySection}>
            {/* Main image */}
            <TouchableOpacity
              onPress={() => setLightboxIndex(0)}
              activeOpacity={0.92}
              style={[styles.mainImageWrap, { borderRadius: 16, borderColor: colors.border }]}
            >
              <Image source={{ uri: allImages[0] }} style={styles.mainImage} resizeMode="cover" />
              {allImages.length > 1 && (
                <View style={[styles.imageCountBadge, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
                  <Feather name="image" size={12} color="#FFFFFF" />
                  <Text style={styles.imageCountText}>{allImages.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 2 }}>
                {allImages.map((uri, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setLightboxIndex(idx)}
                    activeOpacity={0.8}
                    style={[styles.thumb, { borderRadius: 10, borderColor: idx === 0 ? colors.primary : colors.border, borderWidth: idx === 0 ? 2 : 1 }]}
                  >
                    <Image source={{ uri }} style={styles.thumbImg} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        ) : (
          <View style={[styles.noImageBox, { backgroundColor: colors.muted, borderRadius: 16 }]}>
            <Feather name="image" size={40} color={colors.mutedForeground} />
            <Text style={[styles.noImageText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>No product photo</Text>
            <TouchableOpacity onPress={() => setEditVisible(true)} style={[styles.addPhotoBtn, { backgroundColor: colors.secondary, borderRadius: 8 }]}>
              <Feather name="camera" size={14} color={colors.primary} />
              <Text style={[styles.addPhotoBtnText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>Add Photos</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status + price row */}
        <View style={[styles.statusRow, { backgroundColor: colors.card, borderRadius: 14, borderColor: colors.border }]}>
          <View style={styles.priceBlock}>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Price</Text>
            <Text style={[styles.price, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{formatNaira(product.price)}</Text>
          </View>
          <View style={[styles.dividerV, { backgroundColor: colors.border }]} />
          <View style={styles.stockBlock}>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Stock</Text>
            <View style={styles.stockStatusRow}>
              <View style={[styles.stockDot, { backgroundColor: product.inStock ? "#10B981" : "#F43F5E" }]} />
              <Text style={[styles.stockStatus, { color: product.inStock ? "#065F46" : "#BE123C", fontFamily: "Inter_600SemiBold" }]}>
                {product.inStock ? "In Stock" : "Out of Stock"}
              </Text>
            </View>
            {product.stockQuantity != null && (
              <Text style={[styles.stockQty, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {product.stockQuantity} units
              </Text>
            )}
          </View>
          <View style={[styles.dividerV, { backgroundColor: colors.border }]} />
          <View style={styles.categoryBlock}>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Category</Text>
            <Text style={[styles.categoryText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{product.category}</Text>
          </View>
        </View>

        {/* Product name */}
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: 14, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>PRODUCT NAME</Text>
          <Text style={[styles.productName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{product.name}</Text>
        </View>

        {/* Description */}
        {!!product.description && (
          <View style={[styles.card, { backgroundColor: colors.card, borderRadius: 14, borderColor: colors.border }]}>
            <Text style={[styles.cardLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>DESCRIPTION</Text>
            <Text style={[styles.description, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{product.description}</Text>
          </View>
        )}

        {/* Delete */}
        <TouchableOpacity
          onPress={handleDelete}
          style={[styles.deleteBtn, { borderColor: colors.destructive, borderRadius: 14 }]}
          activeOpacity={0.8}
        >
          <Feather name="trash-2" size={18} color={colors.destructive} />
          <Text style={[styles.deleteBtnText, { color: colors.destructive, fontFamily: "Inter_600SemiBold" }]}>Delete Product</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Lightbox */}
      <Modal visible={lightboxIndex !== null} animationType="fade" transparent onRequestClose={() => setLightboxIndex(null)}>
        <View style={styles.lightboxBg}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxIndex(null)}>
            <Feather name="x" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          {lightboxIndex !== null && (
            <FlatList
              data={allImages}
              horizontal
              pagingEnabled
              initialScrollIndex={lightboxIndex}
              getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => (
                <View style={{ width: SCREEN_W, alignItems: "center", justifyContent: "center" }}>
                  <Image source={{ uri: item }} style={{ width: SCREEN_W, height: SCREEN_W }} resizeMode="contain" />
                </View>
              )}
            />
          )}
          <Text style={styles.lightboxCounter}>
            {lightboxIndex != null ? lightboxIndex + 1 : 1} / {allImages.length}
          </Text>
        </View>
      </Modal>

      {/* Edit modal */}
      <AddProductModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        onSave={(updates) => updateProduct(product.id, updates)}
        editProduct={product}
      />

      {/* Flash sale modal */}
      <Modal visible={saleVisible} animationType="slide" transparent onRequestClose={() => setSaleVisible(false)}>
        <View style={styles.shareOverlay}>
          <View style={[styles.shareSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.shareHandle} />
            <Text style={[styles.shareTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              ⚡ Flash Sale
            </Text>
            <Text style={[styles.shareSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Set a discounted price. Buyers on your shop see a countdown timer.
            </Text>

            <Text style={[{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 6, letterSpacing: 0.5 }]}>SALE PRICE (₦)</Text>
            <TextInput
              style={[styles.shareCaptionInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted, fontFamily: "Inter_400Regular", minHeight: 48, fontSize: 18 }]}
              value={salePriceInput}
              onChangeText={setSalePriceInput}
              keyboardType="numeric"
              placeholder={`Max ${formatNaira(product.price - 1)}`}
              placeholderTextColor={colors.mutedForeground}
              numberOfLines={1}
              multiline={false}
            />

            <Text style={[{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 8, marginTop: 12, letterSpacing: 0.5 }]}>DURATION</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              {(["1h", "3h", "6h", "24h"] as const).map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setSaleDuration(d)}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center",
                    backgroundColor: saleDuration === d ? colors.primary : colors.secondary,
                    borderWidth: 1, borderColor: saleDuration === d ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ color: saleDuration === d ? "#FFFFFF" : colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.shareAction, { backgroundColor: "#D97706", borderRadius: 14 }]}
              onPress={async () => {
                const sp = parseFloat(salePriceInput);
                if (!sp || sp <= 0 || sp >= product.price) {
                  Alert.alert("Invalid price", "Sale price must be lower than the original price.");
                  return;
                }
                const hours = parseInt(saleDuration);
                const endsAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
                setSaleVisible(false);
                await flashSaleApi.set(product.id, sp, endsAt);
                hapticNotification();
              }}
              activeOpacity={0.85}
            >
              <Feather name="zap" size={16} color="#FFFFFF" />
              <Text style={[styles.shareActionText, { fontFamily: "Inter_600SemiBold" }]}>Start Flash Sale</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setSaleVisible(false)} style={styles.shareCancelBtn}>
              <Text style={[styles.shareCancelText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Share modal */}
      <Modal visible={shareVisible} animationType="slide" transparent onRequestClose={() => setShareVisible(false)}>
        <View style={styles.shareOverlay}>
          <View style={[styles.shareSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.shareHandle} />

            <Text style={[styles.shareTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Share product
            </Text>
            <Text style={[styles.shareSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Edit the caption below or use the default.
            </Text>

            <TextInput
              style={[styles.shareCaptionInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted, fontFamily: "Inter_400Regular" }]}
              value={shareCaption}
              onChangeText={setShareCaption}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              placeholder="Write a caption…"
              placeholderTextColor={colors.mutedForeground}
            />

            {/* Quick-share targets */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              <TouchableOpacity
                style={[styles.quickShareBtn, { backgroundColor: "#25D366", borderRadius: 12, flex: 1 }]}
                onPress={async () => {
                  const waUrl = `whatsapp://send?text=${encodeURIComponent(shareCaption)}`;
                  const supported = await Linking.canOpenURL(waUrl);
                  if (supported) {
                    setShareVisible(false);
                    await Linking.openURL(waUrl);
                  } else {
                    Alert.alert("WhatsApp not found", "Please install WhatsApp to share directly.");
                  }
                }}
                activeOpacity={0.85}
              >
                <Feather name="message-circle" size={16} color="#fff" />
                <Text style={[styles.quickShareText, { fontFamily: "Inter_600SemiBold" }]}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickShareBtn, { backgroundColor: colors.secondary, borderRadius: 12, flex: 1, borderWidth: 1, borderColor: colors.border }]}
                onPress={async () => {
                  await Clipboard.setStringAsync(productUrl);
                  setLinkCopied(true);
                  hapticImpact();
                  setTimeout(() => setLinkCopied(false), 2000);
                }}
                activeOpacity={0.85}
              >
                <Feather name={linkCopied ? "check" : "link"} size={16} color={linkCopied ? "#10B981" : colors.foreground} />
                <Text style={[styles.quickShareText, { fontFamily: "Inter_600SemiBold", color: linkCopied ? "#10B981" : colors.foreground }]}>
                  {linkCopied ? "Copied!" : "Copy Link"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.shareAction, { backgroundColor: colors.primary, borderRadius: 14 }]}
              onPress={async () => {
                setShareVisible(false);
                await Share.share({ message: shareCaption, url: productUrl });
                hapticImpact();
              }}
              activeOpacity={0.85}
            >
              <Feather name="share-2" size={16} color="#FFFFFF" />
              <Text style={[styles.shareActionText, { fontFamily: "Inter_600SemiBold" }]}>Share to other apps</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShareVisible(false)} style={styles.shareCancelBtn}>
              <Text style={[styles.shareCancelText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 17, letterSpacing: -0.3 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  editBtnText: { fontSize: 13 },
  content: { padding: 16, gap: 14 },
  gallerySection: { gap: 12 },
  mainImageWrap: { height: 280, borderWidth: 1, overflow: "hidden", position: "relative" },
  mainImage: { width: "100%", height: "100%" },
  imageCountBadge: { position: "absolute", bottom: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  imageCountText: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  thumb: { width: 70, height: 70, overflow: "hidden" },
  thumbImg: { width: "100%", height: "100%" },
  noImageBox: { height: 200, alignItems: "center", justifyContent: "center", gap: 12 },
  noImageText: { fontSize: 14 },
  addPhotoBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
  addPhotoBtnText: { fontSize: 13 },
  statusRow: { flexDirection: "row", padding: 16, borderWidth: 1, gap: 0 },
  priceBlock: { flex: 1, gap: 4 },
  stockBlock: { flex: 1, gap: 4, paddingHorizontal: 12 },
  categoryBlock: { flex: 1, gap: 4, paddingLeft: 12 },
  dividerV: { width: 1, marginVertical: -2 },
  priceLabel: { fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase" },
  price: { fontSize: 20 },
  stockStatusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  stockDot: { width: 7, height: 7, borderRadius: 4 },
  stockStatus: { fontSize: 13 },
  stockQty: { fontSize: 11 },
  categoryText: { fontSize: 13 },
  card: { padding: 16, borderWidth: 1, gap: 8 },
  cardLabel: { fontSize: 10, letterSpacing: 0.8 },
  productName: { fontSize: 22, letterSpacing: -0.4, lineHeight: 28 },
  description: { fontSize: 15, lineHeight: 23 },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, paddingVertical: 16 },
  deleteBtnText: { fontSize: 15 },
  lightboxBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center" },
  lightboxClose: { position: "absolute", top: 60, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", zIndex: 10 },
  lightboxCounter: { position: "absolute", bottom: 60, alignSelf: "center", color: "rgba(255,255,255,0.7)", fontSize: 14, fontFamily: "Inter_500Medium" },
  shareBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  shareOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  shareSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, padding: 24, paddingBottom: 40 },
  shareHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 20 },
  shareTitle: { fontSize: 18, marginBottom: 4 },
  shareSubtitle: { fontSize: 13, marginBottom: 16 },
  shareCaptionInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, lineHeight: 21, minHeight: 130, marginBottom: 16 },
  shareAction: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, marginBottom: 10 },
  shareActionText: { color: "#FFFFFF", fontSize: 15 },
  shareCancelBtn: { alignItems: "center", paddingVertical: 10 },
  shareCancelText: { fontSize: 14 },
  quickShareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13 },
  quickShareText: { color: "#fff", fontSize: 14 },
});
