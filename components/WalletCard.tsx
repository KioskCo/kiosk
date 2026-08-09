import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { hapticImpact } from "@/hooks/useHapticsStore";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function formatNaira(amount: number | undefined): string {
  const n = typeof amount === "number" ? amount : 0;
  return "₦" + n.toLocaleString("en-NG");
}

export function WalletCard() {
  const colors = useColors();
  const router = useRouter();
  const { escrowBalance, availableBalance } = useApp();
  const [balanceVisible, setBalanceVisible] = useState(true);

  const toggle = () => {
    hapticImpact();
    setBalanceVisible((v) => !v);
  };

  const handleWithdraw = () => {
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/withdraw" as any);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.primary, borderRadius: colors.radius + 4 }]}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <MaterialCommunityIcons name="wallet" size={18} color="rgba(255,255,255,0.7)" />
          <Text style={styles.cardTitle}>Kiosk Wallet</Text>
        </View>
        <TouchableOpacity onPress={toggle} style={styles.eyeBtn}>
          <Feather name={balanceVisible ? "eye" : "eye-off"} size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      <View style={styles.balances}>
        <View style={styles.balanceItem}>
          <View style={styles.balanceLabelRow}>
            <View style={[styles.dot, { backgroundColor: "#F59E0B" }]} />
            <Text style={styles.balanceLabel}>Escrow Balance</Text>
          </View>
          <Text style={styles.balanceAmount}>
            {balanceVisible ? formatNaira(escrowBalance) : "₦ ••••"}
          </Text>
          <Text style={styles.balanceNote}>Locked · awaiting delivery</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.balanceItem}>
          <View style={styles.balanceLabelRow}>
            <View style={[styles.dot, { backgroundColor: "#10B981" }]} />
            <Text style={styles.balanceLabel}>Available Balance</Text>
          </View>
          <Text style={[styles.balanceAmount, { color: "#6EE7B7" }]}>
            {balanceVisible ? formatNaira(availableBalance) : "₦ ••••"}
          </Text>
          <Text style={styles.balanceNote}>Ready to withdraw</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.withdrawBtn} activeOpacity={0.8} onPress={handleWithdraw}>
        <Feather name="arrow-up-right" size={16} color={colors.primary} />
        <Text style={[styles.withdrawLabel, { color: colors.primary }]}>
          Withdraw to Bank Account
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, gap: 18, shadowColor: "#1A1C4B", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  cardTitle: { fontSize: 14, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
  eyeBtn: { padding: 4 },
  balances: { flexDirection: "row", gap: 16 },
  balanceItem: { flex: 1, gap: 4 },
  balanceLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  balanceLabel: { fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular" },
  balanceAmount: { fontSize: 22, color: "#FFFFFF", fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  balanceNote: { fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "Inter_400Regular" },
  divider: { width: 1, backgroundColor: "rgba(255,255,255,0.15)", marginVertical: 2 },
  withdrawBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "#FFFFFF", borderRadius: 10, paddingVertical: 12 },
  withdrawLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
