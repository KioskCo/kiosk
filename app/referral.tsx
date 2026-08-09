import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { hapticImpact, hapticNotification } from "@/hooks/useHapticsStore";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { referralApi, buyerReferralsApi, type ReferralStats, type ReferredVendor, type BuyerReferrer } from "@/lib/api";

export default function ReferralScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [activeTab, setActiveTab] = useState<"vendor" | "customer">("vendor");
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Customer referral stats
  const [custLoading, setCustLoading] = useState(false);
  const [custTotalReferrers, setCustTotalReferrers] = useState(0);
  const [custTotalOrders, setCustTotalOrders] = useState(0);
  const [custReferrers, setCustReferrers] = useState<BuyerReferrer[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await referralApi.getStats();
      if (res.success && res.data) setStats(res.data as ReferralStats);
    } catch {
      // Network error — keep existing stats, don't crash
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadCustomerReferrals = useCallback(async () => {
    setCustLoading(true);
    try {
      const res = await buyerReferralsApi.stats();
      const d = (res as any).data?.data;
      if (d) {
        setCustTotalReferrers(d.totalReferrers ?? 0);
        setCustTotalOrders(d.totalReferredOrders ?? 0);
        setCustReferrers(d.referrers ?? []);
      }
    } catch { }
    finally { setCustLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (activeTab === "customer") loadCustomerReferrals(); }, [activeTab, loadCustomerReferrals]);

  const copyLink = async () => {
    if (!stats?.referralLink) return;
    await Clipboard.setStringAsync(stats.referralLink);
    hapticNotification();
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWithdraw = () => {
    if (!stats || stats.referralBalance <= 0) return;
    Alert.alert(
      "Withdraw Referral Earnings",
      `Withdraw ₦${stats.referralBalance.toLocaleString()} to your bank account?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Withdraw",
          onPress: async () => {
            setWithdrawing(true);
            const res = await referralApi.withdraw(stats.referralBalance);
            setWithdrawing(false);
            if (res.success) {
              hapticNotification();
              Alert.alert("Done", (res as any).message ?? "Withdrawal processed successfully.");
              load();
            } else {
              Alert.alert("Failed", res.error ?? "Withdrawal failed. Try again.");
            }
          },
        },
      ]
    );
  };

  const statusColor = (status: ReferredVendor["status"]) =>
    status === "rewarded" ? colors.success : "#F59E0B";

  const statusLabel = (status: ReferredVendor["status"]) =>
    status === "rewarded" ? "Subscribed" : "Pending";

  if (loading) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Referral Program
        </Text>
        <View style={{ width: 40 }} />
      </View>
      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["vendor", "customer"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabBtn, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Text style={{ fontSize: 13, fontFamily: activeTab === tab ? "Inter_600SemiBold" : "Inter_400Regular", color: activeTab === tab ? colors.primary : colors.mutedForeground }}>
              {tab === "vendor" ? "My Referrals" : "Customer Sharing"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "customer" && (
        <FlatList
          data={custReferrers}
          keyExtractor={(r) => r.id}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          ListHeaderComponent={
            <>
              <View style={[styles.infoBox, { backgroundColor: "#EDE9FE", borderColor: "#C4B5FD" }]}>
                <Feather name="gift" size={16} color="#6D28D9" style={{ marginTop: 2 }} />
                <Text style={[styles.infoText, { color: "#3B0764", fontFamily: "Inter_400Regular" }]}>
                  After each purchase, your buyers automatically receive a link to share your store. When a friend orders using that link, the original buyer gets a{" "}
                  <Text style={{ fontFamily: "Inter_600SemiBold" }}>10% discount code via SMS</Text> — no app needed for customers. This screen shows you how many buyers are spreading the word.
                </Text>
              </View>
              <View style={styles.statsRow}>
                <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.statVal, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{custTotalReferrers}</Text>
                  <Text style={[styles.statLbl, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Buyers sharing</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.statVal, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{custTotalOrders}</Text>
                  <Text style={[styles.statLbl, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Orders from referrals</Text>
                </View>
              </View>
              {custReferrers.length > 0 && (
                <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Active Referrers</Text>
              )}
            </>
          }
          ListEmptyComponent={
            custLoading ? (
              <View style={styles.emptyWrap}><ActivityIndicator color={colors.primary} /></View>
            ) : (
              <View style={styles.emptyWrap}>
                <Feather name="gift" size={40} color={colors.border} />
                <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>No customer referrals yet</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  Once buyers share their links and someone orders, they'll appear here automatically.
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <View style={[styles.referralRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: "#EDE9FE" }]}>
                <Text style={[styles.avatarText, { color: "#6D28D9", fontFamily: "Inter_700Bold" }]}>
                  {item.buyerName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{item.buyerName}</Text>
                <Text style={[styles.rowPhone, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{item.buyerPhone}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: item.timesUsed > 0 ? "#ECFDF5" : colors.secondary }]}>
                <Text style={[styles.statusText, { color: item.timesUsed > 0 ? "#059669" : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                  {item.timesUsed > 0 ? `${item.timesUsed} referred` : "No orders yet"}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      {activeTab === "vendor" && <FlatList
        data={stats?.referred ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <>
            {/* Referral wallet balance card */}
            <View style={[styles.balanceCard, { backgroundColor: colors.primary, borderRadius: 20 }]}>
              <Text style={[styles.balanceLabel, { fontFamily: "Inter_400Regular" }]}>Referral Wallet</Text>
              <Text style={[styles.balanceAmount, { fontFamily: "Inter_700Bold" }]}>
                ₦{(stats?.referralBalance ?? 0).toLocaleString()}
              </Text>
              <Text style={[styles.balanceSub, { fontFamily: "Inter_400Regular" }]}>
                ₦{stats?.rewardPerReferral ?? 200} per vendor who pays a plan
              </Text>
              <TouchableOpacity
                style={[
                  styles.withdrawBtn,
                  { opacity: (stats?.referralBalance ?? 0) > 0 && !withdrawing ? 1 : 0.5 },
                ]}
                onPress={handleWithdraw}
                disabled={(stats?.referralBalance ?? 0) <= 0 || withdrawing}
                activeOpacity={0.8}
              >
                {withdrawing
                  ? <ActivityIndicator color={colors.primary} size="small" />
                  : <Text style={[styles.withdrawBtnText, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                      Withdraw
                    </Text>
                }
              </TouchableOpacity>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statVal, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {stats?.paidReferrals ?? 0}
                </Text>
                <Text style={[styles.statLbl, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  Subscribed
                </Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statVal, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {stats?.pendingReferrals ?? 0}
                </Text>
                <Text style={[styles.statLbl, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  Pending
                </Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statVal, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {stats?.totalReferrals ?? 0}
                </Text>
                <Text style={[styles.statLbl, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  Total
                </Text>
              </View>
            </View>

            {/* Referral link */}
            <View style={[styles.linkCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.linkLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                Your referral link
              </Text>
              <View style={styles.linkRow}>
                <Text
                  numberOfLines={1}
                  style={[styles.linkText, { color: colors.foreground, fontFamily: "Inter_400Regular", flex: 1 }]}
                >
                  {stats?.referralLink ?? "—"}
                </Text>
                <TouchableOpacity
                  style={[styles.copyBtn, { backgroundColor: copied ? colors.success : colors.primary }]}
                  onPress={copyLink}
                  activeOpacity={0.8}
                >
                  <Feather name={copied ? "check" : "copy"} size={14} color="#FFFFFF" />
                  <Text style={[styles.copyBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                    {copied ? "Copied" : "Copy"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Info note */}
            <View style={[styles.infoBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="info" size={14} color={colors.primary} style={{ marginTop: 2 }} />
              <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Earnings only appear here once the vendor you invited pays for a plan. You can withdraw immediately — it comes from a separate wallet, not your main balance.
              </Text>
            </View>

            {stats && stats.totalReferrals > 0 && (
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                People you invited
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Feather name="users" size={40} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              No referrals yet
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Share your link above and earn ₦200 for every vendor who subscribes.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.referralRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.avatarText, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                {(item.name ?? "?")[0]?.toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                {item.name}
              </Text>
              {item.phone && (
                <Text style={[styles.rowPhone, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {item.phone}
                </Text>
              )}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + "22" }]}>
              <Text style={[styles.statusText, { color: statusColor(item.status), fontFamily: "Inter_600SemiBold" }]}>
                {statusLabel(item.status)}
              </Text>
            </View>
            {item.status === "rewarded" && (
              <Text style={[styles.reward, { color: colors.success, fontFamily: "Inter_700Bold" }]}>
                +₦{stats?.rewardPerReferral ?? 200}
              </Text>
            )}
          </View>
        )}
      />}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, letterSpacing: -0.3 },
  content: { padding: 16, gap: 14 },
  balanceCard: { padding: 24, alignItems: "center", gap: 8 },
  balanceLabel: { fontSize: 13, color: "rgba(255,255,255,0.75)" },
  balanceAmount: { fontSize: 38, color: "#FFFFFF", letterSpacing: -1 },
  balanceSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", textAlign: "center" },
  withdrawBtn: {
    marginTop: 8, backgroundColor: "#FFFFFF",
    paddingHorizontal: 32, paddingVertical: 12, borderRadius: 100,
    minWidth: 120, alignItems: "center",
  },
  withdrawBtnText: { fontSize: 15 },
  statsRow: { flexDirection: "row", gap: 10 },
  statBox: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 14, alignItems: "center", gap: 4 },
  statVal: { fontSize: 22, letterSpacing: -0.5 },
  statLbl: { fontSize: 11 },
  linkCard: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 10 },
  linkLabel: { fontSize: 12 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  linkText: { fontSize: 13 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  copyBtnText: { fontSize: 13, color: "#FFFFFF" },
  infoBox: { flexDirection: "row", gap: 10, borderWidth: 1, borderRadius: 12, padding: 14 },
  infoText: { fontSize: 13, lineHeight: 19, flex: 1 },
  sectionTitle: { fontSize: 16, letterSpacing: -0.3, marginTop: 4 },
  referralRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderRadius: 14, padding: 14,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16 },
  rowName: { fontSize: 14 },
  rowPhone: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  statusText: { fontSize: 11 },
  reward: { fontSize: 14, marginLeft: 4 },
  emptyWrap: { alignItems: "center", gap: 10, paddingTop: 48, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16 },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
});
