/**
 * Order Detail Screen — shows a single order with:
 *  - Buyer info + order items
 *  - Escrow lock/release panel (4-digit delivery code)
 *  - Invoice modal (tap "Send Invoice" to open)
 *  - Book a rider shortcut
 *  - Reverse / refund option (with web confirmation popup)
 *  - Back-to-drawer support when opened from notifications
 */

import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { hapticImpact, hapticNotification } from "@/hooks/useHapticsStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated as RNAnimated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InvoiceModal, type InvoiceData } from "@/components/InvoiceModal";
import { useApp } from "@/context/AppContext";
import { ordersApi } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

function formatNaira(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}

const STATUS_CONFIG = {
  escrow_pending: { label: "Escrow Pending", color: "#F59E0B", bg: "#FFFBEB", icon: "clock" },
  delivered:      { label: "Delivered",       color: "#10B981", bg: "#ECFDF5", icon: "check-circle" },
  reversed:       { label: "Reversed",        color: "#EF4444", bg: "#FEF2F2", icon: "rotate-ccw" },
  disputed:       { label: "Disputed",        color: "#7C3AED", bg: "#F5F3FF", icon: "alert-circle" },
};

export default function OrderDetailScreen() {
  const { id, fromDrawer } = useLocalSearchParams<{ id: string; fromDrawer?: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { orders, releaseEscrow, reverseTransaction, sendInvoice, profile, openNotifDrawer, loadOrderItems } = useApp();

  const order = orders.find((o) => o.id === id);

  const [enteredCode, setEnteredCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [reverseModalVisible, setReverseModalVisible] = useState(false);

  useEffect(() => {
    if (id) loadOrderItems(id);
  }, [id]);

  const shakeAnim = useRef(new RNAnimated.Value(0)).current;
  const successScale = useSharedValue(1);
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  if (!order) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: "Inter_400Regular", color: "#64748B" }}>Order not found</Text>
      </View>
    );
  }

  const status = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.escrow_pending;

  const invoiceData: InvoiceData = {
    invoiceNumber: `INV-${order.id.slice(0, 8).toUpperCase()}`,
    issuedAt: order.timestamp.toISOString(),
    merchant: {
      name: profile?.name ?? "My Shop",
    },
    buyer: {
      name: order.buyerName,
      phone: order.buyerPhone,
    },
    items: order.items.map((i: any) => ({
      name: i.name,
      quantity: i.qty,
      unitPrice: i.price,
    })),
    totalAmount: order.total,
    status: order.status,
    escrowStatus:
      order.status === "delivered"
        ? "released"
        : order.status === "reversed"
        ? "refunded"
        : "locked",
    paymentLink: `https://pay.kiosk.app/INV-${order.id.slice(0, 8).toUpperCase()}`,
  };

  const handleBack = () => {
    if (fromDrawer === "1") {
      router.replace("/(tabs)");
      setTimeout(() => openNotifDrawer(), 100);
    } else {
      router.back();
    }
  };

  const shake = () => {
    RNAnimated.sequence([
      RNAnimated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      RNAnimated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      RNAnimated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      RNAnimated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      RNAnimated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const handleRelease = async () => {
    if (enteredCode.length !== 4) {
      setError("Enter the 4-digit delivery code");
      shake();
      hapticNotification(Haptics.NotificationFeedbackType.Error);
      return;
    }
    // Try local state first (fast)
    const ok = releaseEscrow(order.id, enteredCode);
    if (ok) {
      successScale.value = withSequence(withSpring(1.1, { damping: 10 }), withSpring(1, { damping: 15 }));
      setSuccess(true);
      setError("");
      hapticNotification();
    } else {
      // If local fails (OTP mismatch), try backend — backend has the real OTP
      try {
        await ordersApi.releaseEscrow(order.id, enteredCode);
        successScale.value = withSequence(withSpring(1.1, { damping: 10 }), withSpring(1, { damping: 15 }));
        setSuccess(true);
        setError("");
        hapticNotification();
      } catch {
        setError("Incorrect code. Ask your customer for the code sent to them.");
        shake();
        hapticNotification(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const handleReverse = () => {
    if (Platform.OS !== "web") {
      Alert.alert(
        "Reverse Transaction",
        `Reverse order ${order.orderNumber}? The buyer will be refunded ${formatNaira(order.total)} from escrow.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reverse",
            style: "destructive",
            onPress: () => {
              reverseTransaction(order.id);
              ordersApi.refundEscrow(order.id).catch(() => {});
              hapticNotification(Haptics.NotificationFeedbackType.Warning);
            },
          },
        ]
      );
    } else {
      setReverseModalVisible(true);
    }
  };

  const confirmReverse = () => {
    setReverseModalVisible(false);
    reverseTransaction(order.id);
    ordersApi.refundEscrow(order.id).catch(() => {});
  };

  const handleSendInvoice = () => {
    setInvoiceOpen(true);
    if (Platform.OS !== "web") {
      hapticImpact();
    }
  };

  const successStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      <InvoiceModal
        visible={invoiceOpen}
        invoice={invoiceData}
        onClose={() => setInvoiceOpen(false)}
      />

      {/* Web-only reverse confirmation modal */}
      <Modal visible={reverseModalVisible} transparent animationType="fade" onRequestClose={() => setReverseModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setReverseModalVisible(false)}>
          <Pressable style={[styles.confirmDialog, { backgroundColor: colors.card, borderRadius: colors.radius + 4, borderColor: colors.border }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.confirmIconWrap, { backgroundColor: "#FEE2E2" }]}>
              <Feather name="rotate-ccw" size={28} color="#EF4444" />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Reverse Transaction?
            </Text>
            <Text style={[styles.confirmBody, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              This will reverse order {order.orderNumber} and refund {formatNaira(order.total)} to the buyer from escrow. This action cannot be undone.
            </Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity
                style={[styles.confirmCancel, { backgroundColor: colors.muted, borderRadius: colors.radius }]}
                onPress={() => setReverseModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.confirmCancelText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDanger, { backgroundColor: colors.destructive, borderRadius: colors.radius }]}
                onPress={confirmReverse}
                activeOpacity={0.85}
              >
                <Feather name="rotate-ccw" size={15} color="#FFFFFF" />
                <Text style={[styles.confirmDangerText, { fontFamily: "Inter_600SemiBold" }]}>Reverse</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.orderNum, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Order {order.orderNumber}
          </Text>
          <Text style={[styles.orderDate, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {new Date(order.timestamp).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            {fromDrawer === "1" && (
              <Text style={{ color: colors.primary }}>{" · "}From notifications</Text>
            )}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Feather name={status.icon as any} size={12} color={status.color} />
          <Text style={[styles.statusText, { color: status.color, fontFamily: "Inter_600SemiBold" }]}>
            {status.label}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* Buyer card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.buyerRow}>
            <View style={[styles.buyerAvatar, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.buyerInitials, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                {order.buyerName.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[styles.buyerName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                {order.buyerName}
              </Text>
              <Text style={[styles.buyerPhone, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {order.buyerPhone}
              </Text>
            </View>
          </View>
        </View>

        {/* Order items */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            Order Items
          </Text>
          {order.items.map((item: any, idx: number) => (
            <View key={idx} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
              <View style={styles.itemLeft}>
                <Text style={[styles.itemName, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                  {item.name}
                </Text>
                <Text style={[styles.itemQty, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  ×{item.qty}
                </Text>
              </View>
              <Text style={[styles.itemPrice, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                {formatNaira(item.price * item.qty)}
              </Text>
            </View>
          ))}
          <View style={[styles.totalSection, { borderTopColor: colors.border }]}>
            <View style={styles.subtotalRow}>
              <Text style={[styles.subtotalLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Subtotal</Text>
              <Text style={[styles.subtotalValue, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                {formatNaira(order.subtotal)}
              </Text>
            </View>
            {order.deliveryFee > 0 && (
              <View style={styles.subtotalRow}>
                <Text style={[styles.subtotalLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Delivery</Text>
                <Text style={[styles.subtotalValue, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                  {formatNaira(order.deliveryFee)}
                </Text>
              </View>
            )}
            <View style={styles.subtotalRow}>
              <Text style={[styles.totalLabel, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Total</Text>
              <Text style={[styles.totalValue, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                {formatNaira(order.total)}
              </Text>
            </View>
          </View>
        </View>

        {/* Escrow lock panel */}
        {order.status === "escrow_pending" && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.escrowHeader}>
              <View style={[styles.escrowIconBg, { backgroundColor: "#FFFBEB" }]}>
                <MaterialCommunityIcons name="shield-lock" size={22} color="#F59E0B" />
              </View>
              <View>
                <Text style={[styles.escrowTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  Escrow Lock
                </Text>
                <Text style={[styles.escrowSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {formatNaira(order.total)} locked — release on delivery
                </Text>
              </View>
            </View>

            {/* Split escrow — pre-order working capital note */}
            {(order as any).isPreorder && (order as any).workingCapitalAmount != null && (
              <View style={[styles.escrowInfo, { backgroundColor: "#EFF6FF", borderRadius: 10, marginBottom: 8 }]}>
                <Text style={{ fontSize: 12, color: "#1D4ED8", fontFamily: "Inter_700Bold", marginBottom: 4 }}>
                  Split escrow (pre-order)
                </Text>
                <Text style={{ fontSize: 12, color: "#1E3A5F", fontFamily: "Inter_400Regular", lineHeight: 18 }}>
                  ₦{formatNaira(Number((order as any).workingCapitalAmount))} working capital was released to your wallet at payment to procure stock. ₦{formatNaira(Number((order as any).escrowAmount ?? 0))} stays held until the buyer confirms delivery.
                </Text>
              </View>
            )}

            <View style={[styles.escrowInfo, { backgroundColor: "#FFFBEB", borderRadius: 10, marginBottom: 8 }]}>
              <Text style={[styles.escrowInfoText, { color: "#92400E", fontFamily: "Inter_700Bold", marginBottom: 4 }]}>
                When rider comes for pickup — tell them:
              </Text>
              <Text style={[styles.escrowInfoText, { color: "#92400E", fontFamily: "Inter_400Regular" }]}>
                "Collect a 4-digit confirmation PIN from the customer on delivery and send it to me."
              </Text>
            </View>
            <View style={[styles.escrowInfo, { backgroundColor: "#F0FDF4", borderRadius: 10 }]}>
              <Text style={[styles.escrowInfoText, { color: "#166534", fontFamily: "Inter_400Regular" }]}>
                The customer already has their PIN in their email. Once they give it to the rider and the rider sends it to you, enter it below to release your funds.
              </Text>
            </View>

            <Text style={[styles.codeLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
              Enter Delivery Code
            </Text>

            <RNAnimated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <TextInput
                value={enteredCode}
                onChangeText={(t) => {
                  setEnteredCode(t.replace(/\D/g, "").slice(0, 4));
                  setError("");
                }}
                placeholder="_ _ _ _"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                maxLength={4}
                style={[
                  styles.codeInput,
                  {
                    borderColor: error
                      ? colors.destructive
                      : enteredCode.length === 4
                      ? colors.success
                      : colors.border,
                    borderRadius: colors.radius,
                    color: colors.foreground,
                    fontFamily: "Inter_700Bold",
                    backgroundColor: colors.background,
                  },
                ]}
              />
            </RNAnimated.View>

            {!!error && (
              <View style={styles.errorRow}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
                  {error}
                </Text>
              </View>
            )}

            <Animated.View style={successStyle}>
              <TouchableOpacity
                style={[
                  styles.releaseBtn,
                  {
                    backgroundColor: enteredCode.length === 4 ? colors.success : colors.muted,
                    borderRadius: colors.radius,
                  },
                ]}
                onPress={handleRelease}
                disabled={enteredCode.length !== 4}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name="shield-check"
                  size={20}
                  color={enteredCode.length === 4 ? "#FFFFFF" : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.releaseBtnText,
                    {
                      color: enteredCode.length === 4 ? "#FFFFFF" : colors.mutedForeground,
                      fontFamily: "Inter_600SemiBold",
                    },
                  ]}
                >
                  Release Escrow ({formatNaira(order.total)})
                </Text>
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity
              style={[styles.reverseBtn, { borderColor: colors.destructive, borderRadius: colors.radius }]}
              onPress={handleReverse}
              activeOpacity={0.8}
            >
              <Feather name="rotate-ccw" size={16} color={colors.destructive} />
              <Text style={[styles.reverseBtnText, { color: colors.destructive, fontFamily: "Inter_600SemiBold" }]}>
                Reverse Transaction
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Delivered state */}
        {order.status === "delivered" && (
          <View style={[styles.card, { backgroundColor: "#ECFDF5", borderColor: "#10B98130", borderRadius: colors.radius }]}>
            <View style={styles.escrowHeader}>
              <View style={[styles.escrowIconBg, { backgroundColor: "#D1FAE5" }]}>
                <Feather name="check-circle" size={22} color="#10B981" />
              </View>
              <View>
                <Text style={[styles.escrowTitle, { color: "#065F46", fontFamily: "Inter_700Bold" }]}>
                  Escrow Released!
                </Text>
                <Text style={[styles.escrowSubtitle, { color: "#059669", fontFamily: "Inter_400Regular" }]}>
                  {formatNaira(order.total)} moved to your Available Balance
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.reverseBtn, { borderColor: colors.destructive, borderRadius: colors.radius }]}
              onPress={handleReverse}
              activeOpacity={0.8}
            >
              <Feather name="rotate-ccw" size={16} color={colors.destructive} />
              <Text style={[styles.reverseBtnText, { color: colors.destructive, fontFamily: "Inter_600SemiBold" }]}>
                Reverse Transaction
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Reversed state */}
        {order.status === "reversed" && (
          <View style={[styles.card, { backgroundColor: "#FEF2F2", borderColor: "#EF444430", borderRadius: colors.radius }]}>
            <View style={styles.escrowHeader}>
              <View style={[styles.escrowIconBg, { backgroundColor: "#FEE2E2" }]}>
                <Feather name="rotate-ccw" size={22} color="#EF4444" />
              </View>
              <View>
                <Text style={[styles.escrowTitle, { color: "#991B1B", fontFamily: "Inter_700Bold" }]}>
                  Transaction Reversed
                </Text>
                <Text style={[styles.escrowSubtitle, { color: "#EF4444", fontFamily: "Inter_400Regular" }]}>
                  {formatNaira(order.total)} refunded to buyer
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Action row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#EEF2FF", borderRadius: colors.radius }]}
            onPress={handleSendInvoice}
            activeOpacity={0.85}
          >
            <Feather name="file-text" size={16} color="#4338CA" />
            <Text style={[styles.actionBtnText, { color: "#4338CA", fontFamily: "Inter_600SemiBold" }]}>
              {order.invoiceSent ? "View Invoice" : "Send Invoice"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#ECFDF5", borderRadius: colors.radius }]}
            onPress={() => router.push(`/book-delivery?orderId=${order.id}` as any)}
            activeOpacity={0.85}
          >
            <Feather name="truck" size={16} color="#0F766E" />
            <Text style={[styles.actionBtnText, { color: "#0F766E", fontFamily: "Inter_600SemiBold" }]}>
              Book Rider
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pay / Track buttons */}
        <View style={styles.actionRow}>
          {order.status === "escrow_pending" && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, flex: 1 }]}
              onPress={() => router.push(`/payment/${order.id}` as any)}
              activeOpacity={0.85}
            >
              <Feather name="credit-card" size={16} color="#fff" />
              <Text style={[styles.actionBtnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
                Pay with Paystack
              </Text>
            </TouchableOpacity>
          )}
          {(order as any).trackingId && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#FFF7ED", borderRadius: colors.radius, flex: 1 }]}
              onPress={() => router.push(`/tracking/${order.id}` as any)}
              activeOpacity={0.85}
            >
              <Feather name="map-pin" size={16} color="#C2410C" />
              <Text style={[styles.actionBtnText, { color: "#C2410C", fontFamily: "Inter_600SemiBold" }]}>
                Track Delivery
              </Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  orderNum: { fontSize: 18, letterSpacing: -0.5 },
  orderDate: { fontSize: 12, marginTop: 1 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  statusText: { fontSize: 11 },
  content: { padding: 16, gap: 14 },
  card: { borderWidth: 1, padding: 16, gap: 14 },
  buyerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  buyerAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  buyerInitials: { fontSize: 16 },
  buyerName: { fontSize: 15 },
  buyerPhone: { fontSize: 12, marginTop: 1 },
  cardTitle: { fontSize: 15, marginBottom: 4 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  itemLeft: { flex: 1, gap: 2 },
  itemName: { fontSize: 14 },
  itemQty: { fontSize: 12 },
  itemPrice: { fontSize: 14 },
  totalSection: { borderTopWidth: 1, paddingTop: 12, gap: 8 },
  subtotalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  subtotalLabel: { fontSize: 13 },
  subtotalValue: { fontSize: 13 },
  totalLabel: { fontSize: 16 },
  totalValue: { fontSize: 18 },
  escrowHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  escrowIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  escrowTitle: { fontSize: 16 },
  escrowSubtitle: { fontSize: 12, marginTop: 2 },
  escrowInfo: { padding: 12 },
  escrowInfoText: { fontSize: 13, lineHeight: 18 },
  codeLabel: { fontSize: 14 },
  codeInput: {
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 28,
    textAlign: "center",
    letterSpacing: 12,
  },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  errorText: { fontSize: 12, flex: 1, lineHeight: 16 },
  releaseBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  releaseBtnText: { fontSize: 16 },
  reverseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    paddingVertical: 13,
  },
  reverseBtnText: { fontSize: 14 },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  actionBtnText: { fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  confirmDialog: {
    width: "100%",
    maxWidth: 380,
    padding: 24,
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
  },
  confirmIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmTitle: { fontSize: 20, letterSpacing: -0.5, textAlign: "center" },
  confirmBody: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  confirmBtns: { flexDirection: "row", gap: 10, width: "100%" },
  confirmCancel: { flex: 1, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  confirmCancelText: { fontSize: 15 },
  confirmDanger: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  confirmDangerText: { fontSize: 15, color: "#FFFFFF" },
});
