import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { hapticImpact, hapticNotification } from "@/hooks/useHapticsStore";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Product } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { uploadsApi } from "@/lib/api";

const CATEGORIES = ["Fashion", "Footwear", "Accessories", "Jewelry", "Fragrance", "Electronics", "Food", "Other"];

interface AddProductModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, "id">) => void;
  editProduct?: Product;
}

export function AddProductModal({ visible, onClose, onSave, editProduct }: AddProductModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Fashion");
  const [inStock, setInStock] = useState(true);
  const [stockQuantity, setStockQuantity] = useState("");
  const [imageUri, setImageUri] = useState("");
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [orderType, setOrderType] = useState<"default" | "preorder">("default");
  const [preorderReleaseDate, setPreorderReleaseDate] = useState("");

  useEffect(() => {
    if (visible) {
      setName(editProduct?.name ?? "");
      setPrice(editProduct ? String(editProduct.price) : "");
      setDescription(editProduct?.description ?? "");
      setCategory(editProduct?.category ?? "Fashion");
      setInStock(editProduct?.inStock ?? true);
      setStockQuantity(editProduct?.stockQuantity != null ? String(editProduct.stockQuantity) : "");
      setImageUri(editProduct?.imageUri ?? "");
      setExtraImages(editProduct?.images ?? []);
      setUploadingMain(false);
      setErrors({});
      setCatOpen(false);
      setOrderType(editProduct?.preorder ? "preorder" : "default");
      setPreorderReleaseDate(editProduct?.preorderReleaseDate ? editProduct.preorderReleaseDate.slice(0, 10) : "");
    }
  }, [visible, editProduct]);

  const pickMainImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      hapticImpact();
      // Show immediately — no waiting
      setImageUri(asset.uri);
      // Upload to Cloudinary in background after product is saved
      if (asset.base64) {
        setUploadingMain(true);
        uploadsApi.uploadToCloudinary(asset.base64, asset.mimeType ?? "image/jpeg")
          .then((cloudUrl) => setImageUri(cloudUrl))
          .catch(() => {/* keep local URI */})
          .finally(() => setUploadingMain(false));
      }
    }
  };

  const pickExtraImages = async () => {
    if (extraImages.length >= 4) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const remaining = 4 - extraImages.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      hapticImpact();
      const assets = result.assets.slice(0, remaining);
      // Add local URIs immediately
      const localUris = assets.map((a) => a.uri);
      setExtraImages((prev) => [...prev, ...localUris].slice(0, 4));
      // Upload each in background and swap in Cloudinary URLs when done
      assets.forEach((asset) => {
        if (asset.base64) {
          uploadsApi.uploadToCloudinary(asset.base64, asset.mimeType ?? "image/jpeg")
            .then((cloudUrl) => {
              setExtraImages((prev) => prev.map((u) => (u === asset.uri ? cloudUrl : u)));
            })
            .catch(() => {/* keep local URI */});
        }
      });
    }
  };

  const removeExtraImage = (idx: number) => {
    setExtraImages((prev) => prev.filter((_, i) => i !== idx));
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Product name is required";
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) newErrors.price = "Enter a valid price";
    if (orderType === "preorder" && !preorderReleaseDate.trim()) {
      newErrors.preorderReleaseDate = "A release date is required for pre-orders";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    hapticNotification();
    onSave({
      name: name.trim(),
      price: Number(price),
      description: description.trim(),
      category,
      inStock,
      stockQuantity: stockQuantity ? Number(stockQuantity) : undefined,
      imageUri: imageUri || undefined,
      images: extraImages.length > 0 ? extraImages : undefined,
      preorder: orderType === "preorder",
      preorderReleaseDate: orderType === "preorder" ? new Date(preorderReleaseDate).toISOString() : null,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16, borderRadius: 24 }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {editProduct ? "Edit Product" : "Add Product"}
            </Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.muted }]}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
            {/* Main image */}
            <TouchableOpacity
              style={[styles.mainImageBox, { borderColor: imageUri ? colors.primary : colors.border, borderRadius: colors.radius }]}
              onPress={pickMainImage}
              activeOpacity={0.7}
            >
              {imageUri ? (
                <>
                  <Image source={{ uri: imageUri }} style={styles.mainPreview} />
                  {uploadingMain && (
                    <View style={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Feather name="upload-cloud" size={11} color="#fff" />
                      <Text style={{ color: "#fff", fontSize: 10, fontFamily: "Inter_500Medium" }}>Saving...</Text>
                    </View>
                  )}
                  <View style={[styles.imageEditBadge, { backgroundColor: colors.primary }]}>
                    <Feather name="camera" size={12} color="#FFFFFF" />
                    <Text style={[styles.imageEditText, { fontFamily: "Inter_600SemiBold" }]}>Change</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={[styles.imageIconBg, { backgroundColor: colors.secondary }]}>
                    <Feather name="camera" size={28} color={colors.primary} />
                  </View>
                  <Text style={[styles.imageText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    Tap to upload main product photo
                  </Text>
                  <Text style={[styles.imageHint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    This is the primary image customers see
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Extra images */}
            <View style={styles.extraImagesSection}>
              <View style={styles.extraImagesHeader}>
                <Text style={[styles.extraImagesLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                  Additional Photos
                </Text>
                <Text style={[styles.extraImagesCount, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {extraImages.length}/4
                </Text>
              </View>
              <View style={styles.extraImagesRow}>
                {extraImages.map((uri, i) => (
                  <View key={i} style={[styles.extraImageSlot, { borderColor: colors.primary, borderRadius: 10 }]}>
                    <Image source={{ uri }} style={styles.extraImagePreview} />
                    <TouchableOpacity
                      onPress={() => removeExtraImage(i)}
                      style={[styles.extraRemoveBtn, { backgroundColor: colors.destructive }]}
                    >
                      <Feather name="x" size={10} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                {extraImages.length < 4 && (
                  <TouchableOpacity
                    onPress={pickExtraImages}
                    style={[styles.extraImageSlot, styles.extraAddSlot, { borderColor: colors.border, borderRadius: 10 }]}
                    activeOpacity={0.7}
                  >
                    <Feather name="plus" size={20} color={colors.mutedForeground} />
                    <Text style={[styles.extraAddText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      Add up to {4 - extraImages.length} more
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <Field label="Product Name" error={errors.name}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Classic White Sneakers"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { borderColor: errors.name ? colors.destructive : colors.border, borderRadius: colors.radius, color: colors.foreground, fontFamily: "Inter_400Regular" }, Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null]}
              />
            </Field>

            <Field label="Price (₦)" error={errors.price}>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="e.g. 12500"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                style={[styles.input, { borderColor: errors.price ? colors.destructive : colors.border, borderRadius: colors.radius, color: colors.foreground, fontFamily: "Inter_400Regular" }, Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null]}
              />
            </Field>

            <Field label="Stock Quantity (optional)">
              <TextInput
                value={stockQuantity}
                onChangeText={setStockQuantity}
                placeholder="Leave empty for unlimited"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                style={[styles.input, { borderColor: colors.border, borderRadius: colors.radius, color: colors.foreground, fontFamily: "Inter_400Regular" }, Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null]}
              />
            </Field>

            <Field label="Description">
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Brief product description..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                style={[styles.textarea, { borderColor: colors.border, borderRadius: colors.radius, color: colors.foreground, fontFamily: "Inter_400Regular" }, Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null]}
              />
            </Field>

            <Field label="Category">
              <TouchableOpacity
                style={[styles.input, styles.catSelect, { borderColor: colors.border, borderRadius: colors.radius }]}
                onPress={() => setCatOpen(!catOpen)}
                activeOpacity={0.7}
              >
                <Text style={[styles.catText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{category}</Text>
                <Feather name={catOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
              {catOpen && (
                <View style={[styles.catDropdown, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                  {CATEGORIES.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.catOption, { backgroundColor: c === category ? colors.secondary : "transparent" }]}
                      onPress={() => { setCategory(c); setCatOpen(false); }}
                    >
                      <Text style={[styles.catOptionText, { color: c === category ? colors.primary : colors.foreground, fontFamily: c === category ? "Inter_600SemiBold" : "Inter_400Regular" }]}>{c}</Text>
                      {c === category && <Feather name="check" size={14} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Field>

            <View style={styles.stockRow}>
              <Text style={[styles.stockLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>In Stock</Text>
              <Switch
                value={inStock}
                onValueChange={setInStock}
                trackColor={{ false: colors.border, true: colors.primary + "60" }}
                thumbColor={inStock ? colors.primary : colors.mutedForeground}
                ios_backgroundColor={colors.border}
              />
            </View>

            <Field label="Order Type">
              <View style={[styles.segment, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
                <TouchableOpacity
                  style={[styles.segmentBtn, { backgroundColor: orderType === "default" ? colors.background : "transparent", borderRadius: colors.radius - 4 }]}
                  onPress={() => setOrderType("default")}
                  activeOpacity={0.7}
                >
                  <Feather name="package" size={14} color={orderType === "default" ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.segmentText, { color: orderType === "default" ? colors.foreground : colors.mutedForeground, fontFamily: orderType === "default" ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                    Default
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentBtn, { backgroundColor: orderType === "preorder" ? colors.background : "transparent", borderRadius: colors.radius - 4 }]}
                  onPress={() => setOrderType("preorder")}
                  activeOpacity={0.7}
                >
                  <Feather name="calendar" size={14} color={orderType === "preorder" ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.segmentText, { color: orderType === "preorder" ? colors.foreground : colors.mutedForeground, fontFamily: orderType === "preorder" ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                    Pre-order
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.typeHint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {orderType === "default"
                  ? "Ships right away. Full payment is escrowed until you confirm delivery with the PIN."
                  : "Ships on the release date. You receive 50% as working capital immediately; the rest releases on delivery."}
              </Text>
            </Field>

            {orderType === "preorder" && (
              <Field label="Release Date" error={errors.preorderReleaseDate}>
                <TextInput
                  value={preorderReleaseDate}
                  onChangeText={setPreorderReleaseDate}
                  placeholder="YYYY-MM-DD (e.g. 2026-09-15)"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.input, { borderColor: errors.preorderReleaseDate ? colors.destructive : colors.border, borderRadius: colors.radius, color: colors.foreground, fontFamily: "Inter_400Regular" }, Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null]}
                />
              </Field>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Feather name={editProduct ? "save" : "plus"} size={18} color="#FFFFFF" />
              <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                {editProduct ? "Save Changes" : "Add Product"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>{label}</Text>
      {children}
      {error && <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { maxHeight: "94%", paddingTop: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  sheetTitle: { fontSize: 20 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 20, gap: 16, paddingBottom: 8 },
  mainImageBox: { height: 180, borderWidth: 2, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 8, overflow: "hidden", position: "relative" },
  mainPreview: { width: "100%", height: "100%", resizeMode: "cover" },
  imageEditBadge: { position: "absolute", bottom: 10, right: 10, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  imageEditText: { fontSize: 11, color: "#FFFFFF" },
  imageIconBg: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  imageText: { fontSize: 14 },
  imageHint: { fontSize: 11 },
  extraImagesSection: { gap: 10 },
  extraImagesHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  extraImagesLabel: { fontSize: 14 },
  extraImagesCount: { fontSize: 12 },
  extraImagesRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  extraImageSlot: { width: 76, height: 76, borderWidth: 1.5, overflow: "hidden", position: "relative" },
  extraImagePreview: { width: "100%", height: "100%", resizeMode: "cover" },
  extraRemoveBtn: { position: "absolute", top: 4, right: 4, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  extraAddSlot: { borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4 },
  extraAddText: { fontSize: 9, textAlign: "center" },
  field: { gap: 6 },
  fieldLabel: { fontSize: 14 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  textarea: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 80, textAlignVertical: "top" },
  catSelect: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  catText: { fontSize: 15 },
  catDropdown: { borderWidth: 1, marginTop: -8, overflow: "hidden" },
  catOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 },
  catOptionText: { fontSize: 14 },
  errorText: { fontSize: 12 },
  stockRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stockLabel: { fontSize: 15 },
  segment: { flexDirection: "row", padding: 4 },
  segmentBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11 },
  segmentText: { fontSize: 14 },
  typeHint: { fontSize: 12, lineHeight: 16 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, marginTop: 4 },
  saveBtnText: { fontSize: 16, color: "#FFFFFF" },
});
