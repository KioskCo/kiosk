import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { paymentsApi, ordersApi } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type State = "loading" | "ready" | "processing" | "success" | "failed" | "error";

export default function PaymentScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { orders } = useApp();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const order = orders.find((o) => o.id === orderId);

  const [state, setState] = useState<State>("loading");
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!orderId) return;
    paymentsApi
      .initialize({ orderId, provider: "paystack", callbackUrl: "kiosk://payment-callback" })
      .then((res) => {
        const data = (res as any).data ?? res;
        setPaymentUrl(data.paymentUrl);
        setReference(data.reference);
        setState("ready");
      })
      .catch(() => {
        setErrorMsg("Could not initialize payment. Check your connection and try again.");
        setState("error");
      });
  }, [orderId]);

  const handlePay = async () => {
    if (!paymentUrl) return;
    setState("processing");
    try {
      const result = await WebBrowser.openAuthSessionAsync(
        paymentUrl,
        "kiosk://payment-callback"
      );

      if (result.type === "success" || result.type === "dismiss") {
        // Verify payment status after browser closes
        if (reference) {
          try {
            const verifyRes = await paymentsApi.verify(reference);
            const data = (verifyRes as any).data ?? verifyRes;
            if (data?.paid) {
              setState("success");
              return;
            }
          } catch {
            // fall through to failed
          }
        }
        setState("failed");
      } else {
        setState("ready");
      }
    } catch {
      setState("error");
      setErrorMsg("Payment could not be opened. Try again.");
    }
  };

  const STATUS_ICON: Record<State, keyof typeof Feather.glyphMap> = {
    loading: "clock",
    ready: "credit-card",
    processing: "loader",
    success: "check-circle",
    failed: "x-circle",
    error: "alert-triangle",
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Payment</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        {/* Order summary card */}
        {order && (
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Order</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{order.orderNumber}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 8 }]}>Amount</Text>
            <Text style={[styles.amount, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
              ₦{order.total.toLocaleString("en-NG")}
            </Text>
          </View>
        )}

        {/* State display */}
        <View style={styles.stateBlock}>
          {state === "loading" || state === "processing" ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <View style={[styles.iconCircle, {
              backgroundColor:
                state === "success" ? "#ECFDF5" :
                state === "failed" || state === "error" ? "#FEF2F2" :
                colors.secondary,
            }]}>
              <Feather
                name={STATUS_ICON[state]}
                size={36}
                color={
                  state === "success" ? "#10B981" :
                  state === "failed" || state === "error" ? "#EF4444" :
                  colors.primary
                }
              />
            </View>
          )}

          <Text style={[styles.stateTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {state === "loading" && "Preparing payment…"}
            {state === "ready" && "Ready to pay"}
            {state === "processing" && "Opening payment page…"}
            {state === "success" && "Payment successful!"}
            {state === "failed" && "Payment not completed"}
            {state === "error" && "Something went wrong"}
          </Text>

          <Text style={[styles.stateBody, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {state === "ready" && "Tap below to open the secure Paystack checkout page."}
            {state === "processing" && "Complete payment in the browser window that opens."}
            {state === "success" && "Your payment has been verified and the order updated."}
            {state === "failed" && "Payment was not completed. You can try again."}
            {state === "error" && errorMsg}
          </Text>
        </View>

        {/* Actions */}
        {state === "ready" && (
          <TouchableOpacity onPress={handlePay} style={[styles.payBtn, { backgroundColor: colors.primary }]}>
            <Feather name="lock" size={18} color="#fff" />
            <Text style={[styles.payBtnText, { fontFamily: "Inter_700Bold" }]}>Pay securely with Paystack</Text>
          </TouchableOpacity>
        )}

        {state === "failed" && (
          <View style={{ gap: 10 }}>
            <TouchableOpacity onPress={handlePay} style={[styles.payBtn, { backgroundColor: colors.primary }]}>
              <Feather name="refresh-cw" size={18} color="#fff" />
              <Text style={[styles.payBtnText, { fontFamily: "Inter_700Bold" }]}>Try again</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={[styles.secondaryBtn, { borderColor: colors.border }]}>
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>Back to order</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === "success" && (
          <TouchableOpacity onPress={() => router.back()} style={[styles.payBtn, { backgroundColor: "#10B981" }]}>
            <Feather name="check" size={18} color="#fff" />
            <Text style={[styles.payBtnText, { fontFamily: "Inter_700Bold" }]}>Back to order</Text>
          </TouchableOpacity>
        )}

        {state === "error" && (
          <TouchableOpacity onPress={() => router.back()} style={[styles.secondaryBtn, { borderColor: colors.border }]}>
            <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>Go back</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.secureNote, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          🔒 Secured by Paystack · Your card details are never stored
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, letterSpacing: -0.3 },
  body: { flex: 1, padding: 20, gap: 20 },
  summaryCard: {
    borderWidth: 1, borderRadius: 14, padding: 16,
  },
  summaryLabel: { fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" },
  summaryValue: { fontSize: 18, marginTop: 2 },
  amount: { fontSize: 28, marginTop: 2 },
  stateBlock: { alignItems: "center", gap: 12, paddingVertical: 24 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center",
  },
  stateTitle: { fontSize: 20, textAlign: "center" },
  stateBody: { fontSize: 14, textAlign: "center", lineHeight: 22, maxWidth: 280 },
  payBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, padding: 16, borderRadius: 14,
  },
  payBtnText: { color: "#fff", fontSize: 16 },
  secondaryBtn: {
    padding: 16, borderRadius: 14, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  secureNote: { fontSize: 12, textAlign: "center", marginTop: 8 },
});
