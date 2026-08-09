import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import React, { useState, useRef, useEffect } from "react";
import {
  Alert,
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PlanType, useApp } from "@/context/AppContext";
import { subscriptionsApi } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

const PRICE_PER_MONTH = 1000; // N1000/month

function formatNaira(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}

function calcPrice(months: number) {
  return PRICE_PER_MONTH * months;
}

function calcExpiry(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
}

// Every plan includes ALL features — plans only differ in duration
const ALL_FEATURES = [
  "Full store builder & all section templates",
  "Unlimited products & categories",
  "Paystack & Flutterwave payment processing",
  "Escrow & buyer-protection order management",
  "Customer analytics & sales insights",
  "WhatsApp AI sales bot (auto-reply)",
  "SMS & email order notifications",
  "Custom domain for your store",
  "Abandoned cart recovery emails",
  "Referral rewards program",
  "Priority support & early feature access",
];

const FIXED_PLANS: Array<{
  type: "3months" | "6months" | "yearly";
  label: string;
  months: number;
  badge?: string;
  saving?: string;
}> = [
  { type: "3months", label: "3-Month Plan",  months: 3 },
  { type: "6months", label: "6-Month Plan",  months: 6,  badge: "Popular",    saving: "Pay once, relax for 6 months" },
  { type: "yearly",  label: "Annual Plan",   months: 12, badge: "Best Value", saving: "Best commitment — 12 months uninterrupted" },
];

export default function SubscriptionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { subscription, activateSubscription, cancelSubscription } = useApp();
  const isLocked = subscription.active;
  const [selected, setSelected] = useState<PlanType>("yearly");
  const [customMonths, setCustomMonths] = useState(3);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState<"paystack" | "flutterwave">("paystack");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [resultModal, setResultModal] = useState<{ visible: boolean; success: boolean; message: string }>({ visible: false, success: false, message: "" });
  const resultScale = useRef(new Animated.Value(0)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  useEffect(() => {
    if (resultModal.visible) {
      resultScale.setValue(0.6);
      resultOpacity.setValue(0);
      checkAnim.setValue(0);
      Animated.parallel([
        Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 180 }),
        Animated.timing(resultOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(checkAnim, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [resultModal.visible]);

  const activeMonths =
    selected === "custom" ? customMonths
    : selected === "3months" ? 3
    : selected === "6months" ? 6
    : 12;
  const activePrice = calcPrice(activeMonths);
  const activeLabel =
    selected === "custom" ? `${customMonths}-Month Custom Plan`
    : selected === "3months" ? "3-Month Plan"
    : selected === "6months" ? "6-Month Plan"
    : "Annual Plan";

  const handlePay = async () => {
    setPaying(true);
    setPayError(null);
    try {
      const { paymentUrl, reference } = await subscriptionsApi.initiatePay(
        selected === "custom" ? "custom" : (selected as "3months" | "6months" | "yearly"),
        payMethod,
        selected === "custom" ? customMonths : undefined,
      );
      await WebBrowser.openBrowserAsync(paymentUrl as string);
      await subscriptionsApi.activate({
        plan: (selected === "custom" ? "custom" : selected) as "3months" | "6months" | "yearly" | "custom",
        reference: reference as string,
        provider: payMethod,
        months: selected === "custom" ? customMonths : undefined,
      });
      activateSubscription(selected, selected === "custom" ? customMonths : undefined);
      setShowPayModal(false);
      setResultModal({ visible: true, success: true, message: `Your ${activeLabel} is now active until ${calcExpiry(activeMonths)}.` });
    } catch {
      setPayError("Payment could not be confirmed. Please complete the payment in the browser and try again.");
    } finally {
      setPaying(false);
    }
  };

  const adjustMonths = (delta: number) => {
    setCustomMonths((m) => Math.min(120, Math.max(1, m + delta)));
  };

  return (
    <>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Subscription</Text>
            {subscription.active && (
              <Text style={[styles.activeSub, { color: "#10B981", fontFamily: "Inter_500Medium" }]}>
                Active{" "}
                {subscription.type === "custom"
                  ? `${subscription.months ?? 1}-Month Custom`
                  : subscription.type === "6months"
                  ? "6-Month"
                  : "Annual"}{" "}
                plan
              </Text>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
          {!subscription.active && (
            <View style={[styles.expiredBanner, { backgroundColor: "#FFF7ED", borderRadius: 12, borderColor: "#FDE68A" }]}>
              <Feather name="alert-triangle" size={16} color="#B45309" />
              <Text style={[styles.expiredText, { color: "#92400E", fontFamily: "Inter_500Medium" }]}>
                Subscribe to keep your store live and accept orders from customers.
              </Text>
            </View>
          )}

          {subscription.active && subscription.expiryDate && (
            <View style={[styles.activeBanner, { backgroundColor: "#ECFDF5", borderRadius: 12, borderColor: "#A7F3D0" }]}>
              <Feather name="check-circle" size={16} color="#10B981" />
              <Text style={[styles.activeText, { color: "#065F46", fontFamily: "Inter_500Medium" }]}>
                Active until{" "}
                {new Date(subscription.expiryDate).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>
          )}

          {isLocked && (
            <View style={[styles.lockedNote, { backgroundColor: colors.muted, borderRadius: 10 }]}>
              <Feather name="lock" size={13} color={colors.mutedForeground} />
              <Text style={[styles.lockedNoteText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                You have an active plan. Cancel it below to switch plans.
              </Text>
            </View>
          )}

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>CHOOSE A PLAN</Text>

          {/* Fixed plans — all give FULL access, only duration differs */}
          {FIXED_PLANS.map((p) => {
            const isSel = selected === p.type;
            const price = calcPrice(p.months);
            return (
              <TouchableOpacity
                key={p.type}
                onPress={() => !isLocked && setSelected(p.type)}
                disabled={isLocked}
                style={[styles.planCard, { backgroundColor: colors.card, borderRadius: colors.radius + 4, borderColor: isSel ? colors.primary : colors.border, borderWidth: isSel ? 2 : 1, opacity: isLocked ? 0.45 : 1 }]}
                activeOpacity={0.85}
              >
                {p.badge && (
                  <View style={[styles.planBadge, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.planBadgeText, { fontFamily: "Inter_700Bold" }]}>{p.badge}</Text>
                  </View>
                )}
                <View style={styles.planTop}>
                  <View style={styles.planRadioWrap}>
                    <View style={[styles.planRadioOuter, { borderColor: isSel ? colors.primary : colors.border }]}>
                      {isSel && <View style={[styles.planRadioInner, { backgroundColor: colors.primary }]} />}
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{p.label}</Text>
                    <View style={styles.planPriceRow}>
                      <Text style={[styles.planPrice, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{formatNaira(price)}</Text>
                      <Text style={[styles.planPeriod, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                        {p.months === 12 ? "/year" : p.months === 6 ? "/6 months" : "/3 months"}
                      </Text>
                    </View>
                    <Text style={[styles.planPerMonth, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      {formatNaira(PRICE_PER_MONTH)}/month
                    </Text>
                    {p.saving && (
                      <Text style={[styles.planPerMonth, { color: colors.primary, fontFamily: "Inter_500Medium", marginTop: 2 }]}>
                        {p.saving}
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Custom plan */}
          {(() => {
            const isSel = selected === "custom";
            return (
              <TouchableOpacity
                onPress={() => !isLocked && setSelected("custom")}
                disabled={isLocked}
                style={[styles.planCard, { backgroundColor: colors.card, borderRadius: colors.radius + 4, borderColor: isSel ? colors.primary : colors.border, borderWidth: isSel ? 2 : 1, opacity: isLocked ? 0.45 : 1 }]}
                activeOpacity={0.85}
              >
                <View style={styles.planTop}>
                  <View style={styles.planRadioWrap}>
                    <View style={[styles.planRadioOuter, { borderColor: isSel ? colors.primary : colors.border }]}>
                      {isSel && <View style={[styles.planRadioInner, { backgroundColor: colors.primary }]} />}
                    </View>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.planName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Custom Plan</Text>
                    <Text style={[styles.planPerMonth, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      Pick any duration — {formatNaira(PRICE_PER_MONTH)}/month
                    </Text>
                  </View>
                </View>

                {isSel && (
                  <View style={styles.customBox}>
                    <Text style={[styles.customLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                      Duration
                    </Text>
                    <View style={styles.customStepper}>
                      <TouchableOpacity
                        onPress={() => adjustMonths(-1)}
                        disabled={customMonths <= 1}
                        style={[styles.stepperBtn, { backgroundColor: customMonths <= 1 ? colors.muted : colors.secondary, borderRadius: 10 }]}
                        activeOpacity={0.7}
                      >
                        <Feather name="minus" size={16} color={customMonths <= 1 ? colors.mutedForeground : colors.primary} />
                      </TouchableOpacity>
                      <View style={[styles.stepperValue, { borderColor: colors.primary, borderRadius: 10 }]}>
                        <Text style={[styles.stepperNum, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{customMonths}</Text>
                        <Text style={[styles.stepperUnit, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                          month{customMonths !== 1 ? "s" : ""}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => adjustMonths(1)}
                        disabled={customMonths >= 120}
                        style={[styles.stepperBtn, { backgroundColor: customMonths >= 120 ? colors.muted : colors.secondary, borderRadius: 10 }]}
                        activeOpacity={0.7}
                      >
                        <Feather name="plus" size={16} color={customMonths >= 120 ? colors.mutedForeground : colors.primary} />
                      </TouchableOpacity>
                      <View style={styles.stepperBulk}>
                        {[3, 6, 12, 24, 36, 60, 120].map((m) => (
                          <TouchableOpacity
                            key={m}
                            onPress={() => setCustomMonths(m)}
                            style={[styles.bulkBtn, { backgroundColor: customMonths === m ? colors.primary : colors.muted, borderRadius: 6 }]}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.bulkBtnText, { color: customMonths === m ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                              {m}mo
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={[styles.customPriceBox, { backgroundColor: colors.secondary, borderRadius: 10 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.customPriceLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Total</Text>
                        <Text style={[styles.customPrice, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                          {formatNaira(calcPrice(customMonths))}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[styles.customPriceLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Expires</Text>
                        <Text style={[styles.customExpiry, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                          {calcExpiry(customMonths)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })()}

          {/* Unified feature list — every plan includes everything */}
          <View style={[styles.planCard, { backgroundColor: colors.card, borderRadius: colors.radius + 4, borderColor: colors.border, borderWidth: 1 }]}>
            <Text style={[styles.planName, { color: colors.foreground, fontFamily: "Inter_700Bold", marginBottom: 14 }]}>
              Everything included in every plan
            </Text>
            <View style={styles.featureList}>
              {ALL_FEATURES.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <View style={[styles.featureCheck, { backgroundColor: colors.primary + "15" }]}>
                    <Feather name="check" size={11} color={colors.primary} />
                  </View>
                  <Text style={[styles.featureText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{f}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.planDivider, { backgroundColor: colors.border, marginTop: 14 }]} />
            <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 10, lineHeight: 17 }}>
              Your store stays live for the full period you subscribed to. If you don't renew before expiry, your store is automatically taken offline. You won't be able to re-activate it until a new payment is made.
            </Text>
          </View>

          <View style={[styles.paymentNote, { backgroundColor: colors.card, borderRadius: 12, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="shield-check" size={16} color="#10B981" />
            <Text style={[styles.paymentNoteText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Payments processed securely by{" "}
              <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.foreground }}>Paystack</Text> or{" "}
              <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.foreground }}>Flutterwave</Text>. Kiosk does not store card details.
            </Text>
          </View>

          {isLocked ? (
            <TouchableOpacity
              style={[styles.subscribeBtn, { backgroundColor: "#FEF2F2", borderRadius: colors.radius + 4, borderWidth: 1.5, borderColor: "#FCA5A5" }]}
              onPress={() => {
                if (Platform.OS !== "web") {
                  Alert.alert(
                    "Cancel Plan",
                    "Are you sure you want to cancel your subscription? Your store will stop accepting orders when the plan expires.",
                    [
                      { text: "Keep Plan", style: "cancel" },
                      { text: "Cancel Plan", style: "destructive", onPress: cancelSubscription },
                    ]
                  );
                } else {
                  setShowCancelConfirm(true);
                }
              }}
              activeOpacity={0.88}
            >
              <Feather name="x-circle" size={20} color="#DC2626" />
              <Text style={[styles.subscribeBtnText, { color: "#DC2626", fontFamily: "Inter_700Bold" }]}>
                Cancel Plan
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.subscribeBtn, { backgroundColor: colors.primary, borderRadius: colors.radius + 4 }]}
              onPress={() => setShowPayModal(true)}
              activeOpacity={0.88}
            >
              <MaterialCommunityIcons name="crown" size={20} color="#FFFFFF" />
              <Text style={[styles.subscribeBtnText, { fontFamily: "Inter_700Bold" }]}>
                {`Subscribe — ${formatNaira(activePrice)}`}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      <Modal visible={showCancelConfirm} animationType="fade" transparent onRequestClose={() => setShowCancelConfirm(false)}>
        <View style={[styles.overlay, { alignItems: "center", justifyContent: "center" }]}>
          <View style={[styles.cancelDialog, { backgroundColor: colors.background, borderRadius: 20 }]}>
            <Feather name="alert-triangle" size={32} color="#DC2626" style={{ alignSelf: "center", marginBottom: 12 }} />
            <Text style={[styles.cancelDialogTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Cancel Plan?</Text>
            <Text style={[styles.cancelDialogBody, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Are you sure you want to cancel? Your store will stop accepting orders once the current plan expires.
            </Text>
            <View style={styles.cancelDialogBtns}>
              <TouchableOpacity
                style={[styles.cancelDialogBtn, { backgroundColor: colors.muted, borderRadius: 12, flex: 1 }]}
                onPress={() => setShowCancelConfirm(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelDialogBtnText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Keep Plan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelDialogBtn, { backgroundColor: "#FEF2F2", borderRadius: 12, flex: 1 }]}
                onPress={() => { setShowCancelConfirm(false); cancelSubscription(); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelDialogBtnText, { color: "#DC2626", fontFamily: "Inter_600SemiBold" }]}>Yes, Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment result modal */}
      <Modal visible={resultModal.visible} animationType="none" transparent onRequestClose={() => { setResultModal(r => ({ ...r, visible: false })); if (resultModal.success) router.back(); }}>
        <Animated.View style={[styles.overlay, { alignItems: "center", justifyContent: "center", opacity: resultOpacity }]}>
          <Animated.View style={[styles.resultCard, { backgroundColor: colors.background, transform: [{ scale: resultScale }] }]}>
            {resultModal.success ? (
              <>
                <View style={[styles.resultIconWrap, { backgroundColor: "#ECFDF5" }]}>
                  <Animated.View style={{ transform: [{ scale: checkAnim }] }}>
                    <Feather name="check-circle" size={52} color="#10B981" />
                  </Animated.View>
                </View>
                <Text style={[styles.resultTitle, { color: colors.foreground }]}>Subscription Active!</Text>
                <Text style={[styles.resultBody, { color: colors.mutedForeground }]}>{resultModal.message}</Text>
                <TouchableOpacity
                  style={[styles.resultBtn, { backgroundColor: "#10B981" }]}
                  onPress={() => { setResultModal(r => ({ ...r, visible: false })); router.back(); }}
                >
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={styles.resultBtnText}>Let's go!</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={[styles.resultIconWrap, { backgroundColor: "#FEF2F2" }]}>
                  <Animated.View style={{ transform: [{ scale: checkAnim }] }}>
                    <Feather name="x-circle" size={52} color="#EF4444" />
                  </Animated.View>
                </View>
                <Text style={[styles.resultTitle, { color: colors.foreground }]}>Payment Failed</Text>
                <Text style={[styles.resultBody, { color: colors.mutedForeground }]}>{resultModal.message}</Text>
                <TouchableOpacity
                  style={[styles.resultBtn, { backgroundColor: "#EF4444" }]}
                  onPress={() => setResultModal(r => ({ ...r, visible: false }))}
                >
                  <Text style={styles.resultBtnText}>Try Again</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>

      <Modal visible={showPayModal} animationType="slide" transparent onRequestClose={() => { setShowPayModal(false); setPayError(null); }}>
        <TouchableOpacity style={styles.overlay} onPress={() => { setShowPayModal(false); setPayError(null); }} activeOpacity={1} />
        <View style={[styles.sheet, { backgroundColor: colors.background, borderRadius: 24, paddingBottom: insets.bottom + 20 }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Complete Payment</Text>

          <View style={styles.payDetails}>
            <View style={[styles.payRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.payLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Plan</Text>
              <Text style={[styles.payValue, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{activeLabel}</Text>
            </View>
            <View style={[styles.payRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.payLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Duration</Text>
              <Text style={[styles.payValue, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                {activeMonths} month{activeMonths !== 1 ? "s" : ""}
              </Text>
            </View>
            <View style={[styles.payRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.payLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Expires</Text>
              <Text style={[styles.payValue, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>{calcExpiry(activeMonths)}</Text>
            </View>
            <View style={[styles.payRow, { borderBottomColor: "transparent" }]}>
              <Text style={[styles.payLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Amount</Text>
              <Text style={[styles.payValue, { color: colors.primary, fontFamily: "Inter_700Bold", fontSize: 18 }]}>{formatNaira(activePrice)}</Text>
            </View>
          </View>

          <Text style={[styles.gatewayLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Pay with</Text>
          <View style={styles.gatewayRow}>
            {(["paystack", "flutterwave"] as const).map((gw) => {
              const sel = payMethod === gw;
              return (
                <TouchableOpacity
                  key={gw}
                  onPress={() => setPayMethod(gw)}
                  style={[styles.gatewayBtn, { backgroundColor: sel ? (gw === "paystack" ? "#ECFDF5" : "#EFF6FF") : colors.muted, borderColor: sel ? (gw === "paystack" ? "#10B981" : "#3B82F6") : "transparent", borderRadius: 12 }]}
                  activeOpacity={0.8}
                >
                  <Feather name="credit-card" size={20} color={gw === "paystack" ? "#10B981" : "#3B82F6"} />
                  <Text style={[styles.gatewayBtnText, { color: colors.foreground, fontFamily: sel ? "Inter_700Bold" : "Inter_400Regular" }]}>
                    {gw === "paystack" ? "Paystack" : "Flutterwave"}
                  </Text>
                  {sel && <Feather name="check-circle" size={14} color={gw === "paystack" ? "#10B981" : "#3B82F6"} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {payError && (
            <View style={{ backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <Text style={{ color: "#DC2626", fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 }}>{payError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.primary, borderRadius: 14, opacity: paying ? 0.7 : 1 }]}
            onPress={handlePay}
            disabled={paying}
            activeOpacity={0.85}
          >
            <Feather name={paying ? "loader" : "credit-card"} size={18} color="#FFFFFF" />
            <Text style={[styles.confirmBtnText, { fontFamily: "Inter_700Bold" }]}>
              {paying ? "Opening payment page..." : `Pay ${formatNaira(activePrice)} via ${payMethod === "paystack" ? "Paystack" : "Flutterwave"}`}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20 },
  activeSub: { fontSize: 12, marginTop: 2 },
  content: { padding: 16, gap: 18 },
  expiredBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderWidth: 1 },
  expiredText: { flex: 1, fontSize: 13, lineHeight: 19 },
  activeBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderWidth: 1 },
  activeText: { flex: 1, fontSize: 13 },
  sectionLabel: { fontSize: 11, letterSpacing: 1 },
  planCard: { padding: 18, gap: 14, position: "relative", overflow: "hidden" },
  planBadge: { position: "absolute", top: 0, right: 0, paddingHorizontal: 10, paddingVertical: 4, borderBottomLeftRadius: 10 },
  planBadgeText: { color: "#FFFFFF", fontSize: 11 },
  planTop: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  planRadioWrap: { paddingTop: 4 },
  planRadioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  planRadioInner: { width: 10, height: 10, borderRadius: 5 },
  planName: { fontSize: 17, marginBottom: 4 },
  planPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  planPrice: { fontSize: 26 },
  planPeriod: { fontSize: 14 },
  planPerMonth: { fontSize: 12, marginTop: 3 },
  planDivider: { height: 1 },
  featureList: { gap: 10 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureCheck: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  featureText: { fontSize: 13, flex: 1 },
  customBox: { gap: 14, marginTop: 4 },
  customLabel: { fontSize: 14 },
  customStepper: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  stepperBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  stepperValue: { flexDirection: "row", alignItems: "baseline", gap: 4, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1.5, minWidth: 80, justifyContent: "center" },
  stepperNum: { fontSize: 22 },
  stepperUnit: { fontSize: 13 },
  stepperBulk: { flexDirection: "row", gap: 6 },
  bulkBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  bulkBtnText: { fontSize: 12 },
  customPriceBox: { flexDirection: "row", alignItems: "center", padding: 14 },
  customPriceLabel: { fontSize: 11 },
  customPrice: { fontSize: 22 },
  customExpiry: { fontSize: 13 },
  lockedNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12 },
  lockedNoteText: { flex: 1, fontSize: 13, lineHeight: 18 },
  paymentNote: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderWidth: 1 },
  paymentNoteText: { flex: 1, fontSize: 13, lineHeight: 19 },
  subscribeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18 },
  subscribeBtnText: { color: "#FFFFFF", fontSize: 17 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  cancelDialog: { margin: 24, padding: 24, gap: 12, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  cancelDialogTitle: { fontSize: 20, textAlign: "center" },
  cancelDialogBody: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  cancelDialogBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelDialogBtn: { paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  cancelDialogBtnText: { fontSize: 15 },
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, paddingTop: 12, paddingHorizontal: 20 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 20, marginBottom: 18 },
  payDetails: { gap: 0, marginBottom: 22 },
  payRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1 },
  payLabel: { fontSize: 14 },
  payValue: { fontSize: 14 },
  gatewayLabel: { fontSize: 14, marginBottom: 10 },
  gatewayRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  gatewayBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderWidth: 1.5 },
  gatewayBtnText: { fontSize: 14 },
  confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 17 },
  confirmBtnText: { color: "#FFFFFF", fontSize: 16 },
  resultCard: { margin: 24, borderRadius: 24, padding: 28, alignItems: "center", gap: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 16, width: "85%" },
  resultIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  resultTitle: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  resultBody: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  resultBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 14, width: "100%", marginTop: 4 },
  resultBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
