import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { OnboardingModal } from "@/components/OnboardingModal";
import { useOnboarding } from "@/hooks/useOnboarding";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { ActivityFeedItem } from "@/components/ActivityFeedItem";
import { NotificationDrawer } from "@/components/NotificationDrawer";
import { WalletCard } from "@/components/WalletCard";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, activity, unreadCount, notifDrawerVisible, openNotifDrawer, closeNotifDrawer, orders, chats, ads } = useApp();
  const { showOnboarding, completeOnboarding } = useOnboarding();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const recentActivity = activity.slice(0, 5);

  const today = new Date();
  const ordersToday = orders.filter((o) => {
    const d = new Date(o.timestamp);
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }).length;
  const totalAdLeads = ads.reduce((sum, a) => sum + (a.leads ?? 0), 0);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <>
      <OnboardingModal visible={showOnboarding} onDone={completeOnboarding} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoSide}>
            <Image
              source={require("../../assets/images/logo-badge.png")}
              style={styles.logoMark}
              resizeMode="contain"
            />
            <Text style={[styles.logoText, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>Kiosk</Text>
          </View>
          <PressScale onPress={openNotifDrawer}>
            <View style={[styles.bellBtn, { backgroundColor: colors.card, borderRadius: 21, borderColor: colors.border }]}>
              <Feather name="bell" size={19} color={colors.foreground} />
              {unreadCount > 0 && (
                <View style={[styles.bellBadge, { backgroundColor: colors.destructive }]}>
                  <Text style={styles.bellBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                </View>
              )}
            </View>
          </PressScale>
        </View>

        <View style={styles.greetRow}>
          <Text style={[styles.greeting, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {greeting()},
          </Text>
          <Text style={[styles.shopName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {profile?.name || profile?.username || "My Shop"} 👋
          </Text>
        </View>

        <WalletCard />

        <View style={styles.statsRow}>
          <StatCard icon="message-circle" label="Active Chats" value={String(chats.length)} color="#4338CA" bg="#EEF2FF" onPress={() => router.push("/(tabs)/inbox" as any)} />
          <StatCard icon="package" label="Orders Today" value={String(ordersToday)} color={colors.success} bg="#ECFDF5" onPress={() => router.push("/activity" as any)} />
          <StatCard icon="trending-up" label="Ad Leads" value={String(totalAdLeads)} color="#7C3AED" bg="#F5F3FF" onPress={() => router.push("/(tabs)/marketing" as any)} />
        </View>

        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Recent Activity
            </Text>
            <TouchableOpacity onPress={() => router.push("/activity" as any)}>
              <Text style={[styles.sectionLink, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                See all
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.activityCard, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border }]}>
            {recentActivity.map((item, idx) => (
              <View key={item.id}>
                <TouchableOpacity
                  onPress={() => {
                    if (item.orderId) router.push(`/order/${item.orderId}` as any);
                  }}
                  activeOpacity={item.orderId ? 0.7 : 1}
                >
                  <ActivityFeedItem item={item} />
                </TouchableOpacity>
                {idx < recentActivity.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.quickActions, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border }]}>
          <Text style={[styles.quickTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            <View style={styles.quickRow}>
              <QuickBtn icon="truck" label="Logistics" onPress={() => router.push("/logistics" as any)} color="#0F766E" bg="#ECFDF5" />
              <QuickBtn icon="bar-chart-2" label="Analytics" onPress={() => router.push("/analytics" as any)} color="#7C3AED" bg="#F5F3FF" />
              <QuickBtn icon="layout" label="Store" onPress={() => router.push("/(tabs)/inventory" as any)} color={colors.primary} bg={colors.secondary} />
              <QuickBtn icon="users" label="Customers" onPress={() => router.push("/customers" as any)} color="#0369A1" bg="#EFF6FF" />
            </View>
            <View style={styles.quickRow}>
              <QuickBtn icon="star" label="Reviews" onPress={() => router.push("/reviews" as any)} color="#D97706" bg="#FEF3C7" />
              <QuickBtn icon="tag" label="Discounts" onPress={() => router.push("/discounts" as any)} color="#059669" bg="#ECFDF5" />
              <QuickBtn icon="gift" label="Referral" onPress={() => router.push("/referral" as any)} color="#6D28D9" bg="#EDE9FE" />
              <QuickBtn icon="arrow-up-right" label="Withdraw" onPress={() => router.push("/withdraw" as any)} color="#B45309" bg="#FFF7ED" />
            </View>
          </View>
        </View>
      </ScrollView>

      <NotificationDrawer visible={notifDrawerVisible} onClose={closeNotifDrawer} />
    </>
  );
}

function PressScale({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.88, { damping: 15, stiffness: 350 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 350 }); }}
        activeOpacity={1}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

function StatCard({ icon, label, value, color, bg, onPress }: { icon: string; label: string; value: string; color: string; bg: string; onPress?: () => void }) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[animStyle, styles.statCardWrapper]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.94, { damping: 15, stiffness: 350 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 350 }); }}
        style={[styles.statCard, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border }]}
        activeOpacity={1}
      >
        <View style={[styles.statIcon, { backgroundColor: bg }]}>
          <Feather name={icon as any} size={16} color={color} />
        </View>
        <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function QuickBtn({ icon, label, onPress, color, bg }: { icon: string; label: string; onPress: () => void; color: string; bg: string }) {
  const colors = useColors();
  return (
    <TouchableOpacity onPress={onPress} style={styles.quickBtn} activeOpacity={0.75}>
      <View style={[styles.quickIcon, { backgroundColor: bg }]}>
        <Feather name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.quickLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logoSide: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoMark: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 22, letterSpacing: -0.5 },
  bellBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center", position: "relative", borderWidth: 1 },
  bellBadge: { position: "absolute", top: 7, right: 7, minWidth: 15, height: 15, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  bellBadgeText: { fontSize: 9, color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  greetRow: { gap: 2 },
  greeting: { fontSize: 14 },
  shopName: { fontSize: 22, letterSpacing: -0.5 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCardWrapper: { flex: 1 },
  statCard: { borderWidth: 1, padding: 14, alignItems: "center", gap: 6 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 18, letterSpacing: -0.5 },
  statLabel: { fontSize: 10, textAlign: "center" },
  activitySection: { gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 17, letterSpacing: -0.3 },
  sectionLink: { fontSize: 14 },
  activityCard: { borderWidth: 1, overflow: "hidden", marginHorizontal: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  quickActions: { borderWidth: 1, padding: 16, gap: 14 },
  quickTitle: { fontSize: 15, letterSpacing: -0.3 },
  quickGrid: { gap: 14 },
  quickRow: { flexDirection: "row", justifyContent: "space-between" },
  quickBtn: { alignItems: "center", gap: 6, flex: 1 },
  quickIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 11, textAlign: "center" },
});
