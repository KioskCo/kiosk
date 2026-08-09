import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActivityItem, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const TYPE_FILTERS = [
  { key: "all", label: "All" },
  { key: "order", label: "Orders" },
  { key: "escrow", label: "Escrow" },
  { key: "transfer", label: "Transfers" },
  { key: "bot", label: "Bot" },
] as const;

function formatTime(date: Date): string {
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

const VARIANT_COLORS = {
  success: { bg: "#ECFDF5", icon: "#10B981", text: "#065F46" },
  warning: { bg: "#FFFBEB", icon: "#F59E0B", text: "#92400E" },
  error: { bg: "#FEF2F2", icon: "#EF4444", text: "#991B1B" },
  default: { bg: "#EEF2FF", icon: "#4338CA", text: "#3730A3" },
};

export default function ActivityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activity } = useApp();
  const [filter, setFilter] = useState<string>("all");
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const filtered = filter === "all" ? activity : activity.filter((a) => a.type === filter);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Activity</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {TYPE_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filter === f.key ? colors.primary : colors.card,
                  borderColor: filter === f.key ? colors.primary : colors.border,
                  borderRadius: 20,
                },
              ]}
            >
              <Text style={[styles.filterText, { color: filter === f.key ? "#FFFFFF" : colors.mutedForeground, fontFamily: filter === f.key ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="activity" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              No activity found
            </Text>
          </View>
        ) : (
          filtered.map((item) => (
            <ActivityRow
              key={item.id}
              item={item}
              onPress={() => {
                if (item.orderId) router.push(`/order/${item.orderId}` as any);
              }}
              tappable={!!item.orderId}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function ActivityRow({ item, onPress, tappable }: { item: ActivityItem; onPress: () => void; tappable: boolean }) {
  const colors = useColors();
  const variantKey = item.variant ?? "default";
  const vc = VARIANT_COLORS[variantKey as keyof typeof VARIANT_COLORS];
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={anim}>
      <TouchableOpacity
        onPress={tappable ? onPress : undefined}
        onPressIn={() => tappable && (scale.value = withSpring(0.97, { damping: 15, stiffness: 350 }))}
        onPressOut={() => tappable && (scale.value = withSpring(1, { damping: 15, stiffness: 350 }))}
        activeOpacity={tappable ? 1 : 0.9}
        style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
      >
        <View style={[styles.iconBg, { backgroundColor: vc.bg }]}>
          <Feather name={item.icon as any} size={18} color={vc.icon} />
        </View>
        <View style={styles.rowContent}>
          <View style={styles.rowTop}>
            <Text style={[styles.rowTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.rowTime, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {formatTime(item.timestamp)}
            </Text>
          </View>
          <Text style={[styles.rowSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
            {item.subtitle}
          </Text>
          {item.amount && (
            <Text style={[styles.rowAmount, { color: vc.icon, fontFamily: "Inter_700Bold" }]}>
              ₦{item.amount.toLocaleString("en-NG")}
            </Text>
          )}
        </View>
        {tappable && <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { borderBottomWidth: 1, gap: 12, paddingBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, letterSpacing: -0.5 },
  filterRow: { paddingHorizontal: 16, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1 },
  filterText: { fontSize: 13 },
  list: { padding: 16, gap: 10 },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14 },
  row: { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 12, borderWidth: 1 },
  iconBg: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  rowContent: { flex: 1, gap: 3 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowTitle: { fontSize: 14, flex: 1 },
  rowTime: { fontSize: 11, marginLeft: 8 },
  rowSubtitle: { fontSize: 12, lineHeight: 16 },
  rowAmount: { fontSize: 14, marginTop: 2 },
});
