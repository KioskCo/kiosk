import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { hapticImpact, hapticNotification } from "@/hooks/useHapticsStore";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function formatNaira(n: number, compact = false) {
  if (compact || n >= 1_000_000) {
    if (n >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000)     return `₦${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 10_000)        return `₦${(n / 1_000).toFixed(1)}k`;
  }
  return "₦" + n.toLocaleString("en-NG");
}

const QUICK_AMOUNTS = [10000, 25000, 50000, 100000];

export default function WithdrawScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { availableBalance, bankAccounts, withdrawals, withdraw } = useApp();

  const [amount, setAmount] = useState("");
  const [selectedBankId, setSelectedBankId] = useState(bankAccounts.find((b) => b.isPrimary)?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<"success" | "error" | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const numAmount = Number(amount.replace(/,/g, ""));
  const transferFee = numAmount > 5000 ? 10 : 0;
  const totalDebit = numAmount + transferFee;
  const isValid = numAmount > 0 && totalDebit <= availableBalance && selectedBankId;
  const selectedBank = bankAccounts.find((b) => b.id === selectedBankId);

  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const handleWithdraw = () => {
    if (!isValid) return;
    if (Platform.OS !== "web") {
      Alert.alert(
        "Confirm Withdrawal",
        `Transfer ${formatNaira(numAmount)} to ${selectedBank?.bankName} — ${selectedBank?.accountNumber}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm",
            onPress: () => processWithdraw(),
          },
        ]
      );
    } else {
      processWithdraw();
    }
  };

  const processWithdraw = () => {
    setLoading(true);
    btnScale.value = withSequence(withSpring(0.94, { damping: 15 }), withSpring(1, { damping: 15 }));

    setTimeout(() => {
      const result = withdraw(numAmount, selectedBankId);
      setLoading(false);
      if (result) {
        setLastResult("success");
        setAmount("");
        hapticNotification();
      } else {
        setLastResult("error");
      }
    }, 1200);
  };

  const setQuick = (val: number) => {
    if (val <= availableBalance) {
      setAmount(val.toLocaleString("en-NG"));
      hapticImpact();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Withdraw</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={[styles.balanceCard, { backgroundColor: colors.primary, borderRadius: colors.radius + 4 }]}>
          <MaterialCommunityIcons name="wallet" size={20} color="rgba(255,255,255,0.65)" />
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.55}>
            {formatNaira(availableBalance, availableBalance >= 1_000_000)}
          </Text>
          <Text style={styles.balanceNote}>Cleared funds ready to withdraw</Text>
        </View>

        {lastResult === "success" && (
          <View style={[styles.successBanner, { backgroundColor: "#ECFDF5", borderRadius: colors.radius }]}>
            <Feather name="check-circle" size={18} color="#10B981" />
            <Text style={[styles.successText, { color: "#065F46", fontFamily: "Inter_500Medium" }]}>
              Withdrawal successful! Funds are being transferred.
            </Text>
          </View>
        )}

        {lastResult === "error" && (
          <View style={[styles.errorBanner, { backgroundColor: "#FEF2F2", borderRadius: colors.radius }]}>
            <Feather name="alert-circle" size={18} color="#EF4444" />
            <Text style={[styles.errorText, { color: "#991B1B", fontFamily: "Inter_500Medium" }]}>
              Insufficient balance or invalid amount.
            </Text>
          </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Amount</Text>

          <View style={[styles.amountBox, { borderColor: totalDebit > availableBalance ? colors.destructive : numAmount > 0 ? colors.success : colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.nairaSymbol, { color: numAmount > 0 ? colors.primary : colors.mutedForeground, fontFamily: "Inter_700Bold" }]}>₦</Text>
            <TextInput
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^\d]/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ","))}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              style={[styles.amountInput, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}
            />
          </View>

          {totalDebit > availableBalance && (
            <Text style={[styles.overError, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
              Amount + transfer fee exceeds available balance
            </Text>
          )}

          <View style={styles.quickRow}>
            {QUICK_AMOUNTS.map((qa) => (
              <TouchableOpacity
                key={qa}
                onPress={() => setQuick(qa)}
                style={[
                  styles.quickBtn,
                  {
                    backgroundColor: numAmount === qa ? colors.primary : colors.secondary,
                    borderRadius: 8,
                    opacity: qa > availableBalance ? 0.4 : 1,
                  },
                ]}
              >
                <Text style={[styles.quickText, { color: numAmount === qa ? "#FFFFFF" : colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                  {formatNaira(qa)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => {
              if (availableBalance > 0) {
                setAmount(availableBalance.toLocaleString("en-NG"));
                hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
              }
            }}
            style={[
              styles.allBtn,
              {
                backgroundColor: numAmount === availableBalance && availableBalance > 0 ? colors.primary : colors.secondary,
                borderRadius: 10,
                opacity: availableBalance <= 0 ? 0.4 : 1,
                borderWidth: 1.5,
                borderColor: numAmount === availableBalance && availableBalance > 0 ? colors.primary : colors.primary + "40",
              },
            ]}
            activeOpacity={0.8}
          >
            <Feather
              name="arrow-up-circle"
              size={16}
              color={numAmount === availableBalance && availableBalance > 0 ? "#fff" : colors.primary}
            />
            <Text style={[styles.allBtnText, { color: numAmount === availableBalance && availableBalance > 0 ? "#FFFFFF" : colors.primary, fontFamily: "Inter_700Bold" }]}>
              Withdraw All — {formatNaira(availableBalance)}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Settlement Account</Text>
          <Text style={[styles.sectionNote, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Funds are processed through Kiosk's settlement system and credited within 24 hours.
          </Text>

          {bankAccounts.filter((b) => b.verified).map((bank) => (
            <TouchableOpacity
              key={bank.id}
              onPress={() => { setSelectedBankId(bank.id); hapticImpact(); }}
              style={[
                styles.bankRow,
                {
                  backgroundColor: selectedBankId === bank.id ? colors.secondary : "transparent",
                  borderRadius: 10,
                  borderColor: selectedBankId === bank.id ? colors.primary : "transparent",
                  borderWidth: selectedBankId === bank.id ? 1.5 : 0,
                },
              ]}
              activeOpacity={0.7}
            >
              <View style={[styles.bankIcon, { backgroundColor: colors.muted }]}>
                <MaterialCommunityIcons name="bank" size={18} color={colors.primary} />
              </View>
              <View style={styles.bankInfo}>
                <Text style={[styles.bankName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{bank.bankName}</Text>
                <Text style={[styles.bankNum, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {bank.accountNumber} · {bank.accountName}
                </Text>
              </View>
              <View style={[styles.radioOuter, { borderColor: selectedBankId === bank.id ? colors.primary : colors.border }]}>
                {selectedBankId === bank.id && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.feeNote, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}>
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <Text style={[styles.feeText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Paystack transfer fee: ₦10 on withdrawals above ₦5,000 (free below). Processing time: instant – 24 hours.
          </Text>
        </View>

        {numAmount > 0 && isValid && (
          <View style={[styles.feeNote, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}>
            <Feather name="trending-up" size={14} color={colors.mutedForeground} />
            <Text style={[styles.feeText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {transferFee > 0
                ? `₦${transferFee} transfer fee · total deducted from balance: ${formatNaira(totalDebit)}`
                : `No transfer fee · total deducted from balance: ${formatNaira(totalDebit)}`}
            </Text>
          </View>
        )}

        <Animated.View style={btnStyle}>
          <TouchableOpacity
            style={[styles.withdrawBtn, { backgroundColor: isValid && !loading ? colors.primary : colors.muted, borderRadius: colors.radius }]}
            onPress={handleWithdraw}
            disabled={!isValid || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <Text style={[styles.withdrawBtnText, { color: "#FFFFFF", fontFamily: "Inter_600SemiBold" }]}>Processing...</Text>
            ) : (
              <>
                <Feather name="arrow-up-right" size={20} color={isValid ? "#FFFFFF" : colors.mutedForeground} />
                <Text style={[styles.withdrawBtnText, { color: isValid ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                  {numAmount > 0 ? `Withdraw ${formatNaira(numAmount)}` : "Enter Amount"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {withdrawals.length > 0 && (
          <View style={styles.historySection}>
            <Text style={[styles.historyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Recent Withdrawals</Text>
            {withdrawals.slice(0, 5).map((wd) => (
              <View key={wd.id} style={[styles.historyRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={[styles.historyIcon, { backgroundColor: wd.status === "success" ? "#ECFDF5" : "#FEF2F2" }]}>
                  <Feather name={wd.status === "success" ? "check-circle" : "x-circle"} size={16} color={wd.status === "success" ? "#10B981" : "#EF4444"} />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={[styles.historyBank, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>{wd.bankName}</Text>
                  <Text style={[styles.historyDate, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {wd.timestamp.toLocaleDateString("en-NG", { day: "numeric", month: "short" })} · Ref: {wd.reference}
                  </Text>
                </View>
                <Text style={[styles.historyAmount, { color: wd.status === "success" ? colors.success : colors.destructive, fontFamily: "Inter_700Bold" }]}>
                  -{formatNaira(wd.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20 },
  content: { padding: 16, gap: 16 },
  balanceCard: { padding: 20, gap: 6, alignItems: "center" },
  balanceLabel: { fontSize: 13, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular" },
  balanceAmount: { fontSize: 36, color: "#FFFFFF", fontFamily: "Inter_700Bold", letterSpacing: -1 },
  balanceNote: { fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular" },
  successBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  successText: { flex: 1, fontSize: 13 },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  errorText: { flex: 1, fontSize: 13 },
  section: { borderWidth: 1, padding: 16, gap: 14 },
  sectionTitle: { fontSize: 15 },
  sectionNote: { fontSize: 12, lineHeight: 18, marginTop: -6 },
  amountBox: { flexDirection: "row", alignItems: "center", borderWidth: 2, paddingHorizontal: 16, paddingVertical: 8 },
  nairaSymbol: { fontSize: 28, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 36, paddingVertical: 8 },
  overError: { fontSize: 12, marginTop: -8 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickBtn: { paddingHorizontal: 14, paddingVertical: 9 },
  quickText: { fontSize: 13 },
  bankRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  bankIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  bankInfo: { flex: 1, gap: 2 },
  bankName: { fontSize: 14 },
  bankNum: { fontSize: 12 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  feeNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12 },
  feeText: { flex: 1, fontSize: 12, lineHeight: 17 },
  withdrawBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18 },
  withdrawBtnText: { fontSize: 17 },
  historySection: { gap: 10 },
  historyTitle: { fontSize: 16 },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderWidth: 1 },
  historyIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  historyInfo: { flex: 1, gap: 3 },
  historyBank: { fontSize: 13 },
  historyDate: { fontSize: 11 },
  historyAmount: { fontSize: 14 },
  allBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  allBtnText: { fontSize: 15 },
});
