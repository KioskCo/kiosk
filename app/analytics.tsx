import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Platform, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { analyticsApi, type AnalyticsSnapshot } from "@/lib/api";
import { useColors } from "@/hooks/useColors";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 1_000_000
    ? `₦${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `₦${(n / 1_000).toFixed(1)}k`
    : `₦${n.toLocaleString()}`;

const pctLabel = (v: number) => {
  if (v === 0) return null;
  return { label: `${v > 0 ? "+" : ""}${v}%`, up: v > 0 };
};

const SEGMENT_COLOR: Record<string, { bg: string; text: string }> = {
  vip:      { bg: "#FEF9C3", text: "#713F12" },
  returning:{ bg: "#EEF2FF", text: "#3730A3" },
  new:      { bg: "#ECFDF5", text: "#065F46" },
  inactive: { bg: "#F3F4F6", text: "#374151" },
};

type Tab = "revenue" | "products" | "customers" | "inventory";

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { isOnline } = useNetworkStatus();
  const [data, setData] = useState<AnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("revenue");
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await analyticsApi.getSnapshot() as any;
      const snap = res?.data ?? res;
      if (snap?.revenue) {
        setData(snap as AnalyticsSnapshot);
        setFromCache(false);
        AsyncStorage.setItem("kiosk_analytics", JSON.stringify({ data: snap, ts: Date.now() })).catch(() => {});
      }
    } catch {
      // Network failed — try cache
      try {
        const raw = await AsyncStorage.getItem("kiosk_analytics");
        if (raw) {
          const { data: cached, ts } = JSON.parse(raw);
          if (cached?.revenue) { setData(cached); setFromCache(true); setCachedAt(ts); }
        }
      } catch {}
    }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "revenue",   label: "Revenue",   icon: "trending-up" },
    { key: "products",  label: "Products",  icon: "package" },
    { key: "customers", label: "Customers", icon: "users" },
    { key: "inventory", label: "Inventory", icon: "archive" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Business Intelligence
        </Text>
        <TouchableOpacity onPress={() => load(true)} style={styles.refreshBtn}>
          <Feather name="refresh-cw" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Offline / cached-data notice */}
      {(!isOnline || fromCache) && (
        <View style={[styles.offlineBar, { backgroundColor: fromCache && !isOnline ? "#B45309" : "#92400E" }]}>
          <Feather name={isOnline ? "clock" : "wifi-off"} size={12} color="#fff" />
          <Text style={styles.offlineText}>
            {isOnline && fromCache
              ? `Cached data · last updated ${cachedAt ? new Date(cachedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}`
              : cachedAt
              ? `No internet · showing data from ${new Date(cachedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "No internet · no cached data yet"}
          </Text>
        </View>
      )}

      {/* Tab Bar */}
      <View style={{ height: 44, flexShrink: 0, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.tabBtn, tab === t.key && { backgroundColor: colors.primary, borderColor: colors.primary }, { borderColor: colors.border }]}
          >
            <Feather name={t.icon as any} size={13} color={tab === t.key ? "#fff" : colors.mutedForeground} />
            <Text style={[styles.tabLabel, { color: tab === t.key ? "#fff" : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadText, { color: colors.mutedForeground }]}>Loading insights…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
          showsVerticalScrollIndicator={false}
        >
          {tab === "revenue" && data && <RevenueTab data={data} colors={colors} />}
          {tab === "products" && data && <ProductsTab data={data} colors={colors} />}
          {tab === "customers" && data && <CustomersTab data={data} colors={colors} />}
          {tab === "inventory" && data && <InventoryTab data={data} colors={colors} />}
          {!data && (
            <View style={styles.center}>
              <Feather name={isOnline ? "bar-chart-2" : "wifi-off"} size={40} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {isOnline ? "No data yet — orders will appear here." : "No internet · no cached data available yet."}
              </Text>
              {!isOnline && (
                <TouchableOpacity onPress={() => load()} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
                  <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" }}>Try Again</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Revenue Tab ──────────────────────────────────────────────────────────────

function RevenueTab({ data, colors }: { data: AnalyticsSnapshot; colors: ReturnType<typeof useColors> }) {
  const { revenue, orders } = data;

  const cards = [
    { label: "Today",       value: revenue.today,   change: revenue.todayChange },
    { label: "This Week",   value: revenue.week,    change: revenue.weekChange },
    { label: "This Month",  value: revenue.month,   change: revenue.monthChange },
    { label: "This Year",   value: revenue.year,    change: revenue.yearChange },
  ];

  const BAR_TRACK_H = 90;
  const maxBarVal = Math.max(revenue.today, revenue.week / 7, revenue.month / 30, revenue.year / 365, 1);

  return (
    <>
      <SectionTitle title="Revenue Overview" colors={colors} />
      <View style={styles.revenueGrid}>
        {cards.map((c) => {
          const pct = pctLabel(c.change);
          return (
            <View key={c.label} style={[styles.revenueCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.revenueLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{c.label}</Text>
              <Text style={[styles.revenueValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{fmt(c.value)}</Text>
              {pct && (
                <View style={[styles.pctBadge, { backgroundColor: pct.up ? "#ECFDF5" : "#FEF2F2" }]}>
                  <Feather name={pct.up ? "trending-up" : "trending-down"} size={11} color={pct.up ? "#16A34A" : "#DC2626"} />
                  <Text style={[styles.pctText, { color: pct.up ? "#16A34A" : "#DC2626" }]}>{pct.label}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Bar chart — daily revenue comparison */}
      <SectionTitle title="Daily Revenue Comparison" subtitle="Each bar = average revenue per day" colors={colors} />
      <View style={[styles.barChart, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {cards.map((c, i) => {
          const dailyEq = i === 0 ? c.value : i === 1 ? c.value / 7 : i === 2 ? c.value / 30 : c.value / 365;
          const fillH = Math.max(Math.round((dailyEq / maxBarVal) * BAR_TRACK_H), 4);
          return (
            <View key={c.label} style={styles.barItem}>
              <Text style={[styles.barValueLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{fmt(dailyEq)}</Text>
              <View style={[styles.barTrack, { height: BAR_TRACK_H }]}>
                <View style={[styles.barFill, { height: fillH, backgroundColor: colors.primary }]} />
              </View>
              <Text style={[styles.barLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{c.label.split(" ")[1] ?? c.label}</Text>
            </View>
          );
        })}
      </View>

      <SectionTitle title="Order Breakdown" colors={colors} />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <OrderRow label="Total Orders" value={orders.total} colors={colors} />
        <OrderRow label="Paid" value={orders.paid} colors={colors} color="#16A34A" />
        <OrderRow label="Pending" value={orders.pending} colors={colors} color="#D97706" />
        <OrderRow label="Shipped" value={orders.shipped} colors={colors} color="#0369A1" />
        <OrderRow label="Delivered" value={orders.delivered} colors={colors} color="#7C3AED" />
        <OrderRow label="Cancelled" value={orders.cancelled} colors={colors} color="#DC2626" last />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.avgRow}>
          <Text style={[styles.avgLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Avg Order Value</Text>
          <Text style={[styles.avgValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{fmt(orders.avgOrderValue)}</Text>
        </View>
      </View>
    </>
  );
}

function OrderRow({ label, value, colors, color, last }: { label: string; value: number; colors: any; color?: string; last?: boolean }) {
  return (
    <>
      <View style={styles.orderRow}>
        <Text style={[styles.orderLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{label}</Text>
        <Text style={[styles.orderValue, { color: color ?? colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{value}</Text>
      </View>
      {!last && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
    </>
  );
}

// ─── Products Tab ─────────────────────────────────────────────────────────────

function ProductsTab({ data, colors }: { data: AnalyticsSnapshot; colors: ReturnType<typeof useColors> }) {
  const { bestSellers, worstPerformers, fastMoving, slowMoving } = data.products;

  return (
    <>
      <SectionTitle title="Best Sellers" subtitle="by units sold" colors={colors} />
      {bestSellers.length === 0
        ? <EmptyState icon="package" text="No sales data yet" colors={colors} />
        : bestSellers.map((p, i) => (
          <View key={p.productId ?? p.name} style={[styles.productRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.rank, { backgroundColor: i === 0 ? "#FEF9C3" : colors.secondary }]}>
              <Text style={[styles.rankText, { color: i === 0 ? "#713F12" : colors.mutedForeground, fontFamily: "Inter_700Bold" }]}>#{i + 1}</Text>
            </View>
            <View style={styles.productInfo}>
              <Text style={[styles.productName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>{p.name}</Text>
              <Text style={[styles.productMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{p.unitsSold} units sold · {p.orderCount} orders</Text>
            </View>
            <Text style={[styles.productRev, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{fmt(p.revenue)}</Text>
          </View>
        ))}

      <SectionTitle title="Fast Moving" subtitle="selling out soon" colors={colors} />
      {fastMoving.length === 0
        ? <EmptyState icon="zap" text="No fast movers this month" colors={colors} />
        : fastMoving.map((p) => (
          <View key={p.id} style={[styles.productRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.rank, { backgroundColor: "#FEF3C7" }]}>
              <Feather name="zap" size={14} color="#D97706" />
            </View>
            <View style={styles.productInfo}>
              <Text style={[styles.productName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>{p.name}</Text>
              <Text style={[styles.productMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{p.stock} left · {p.unitsSold30d} sold in 30d</Text>
            </View>
            <View style={[styles.daysTag, { backgroundColor: p.daysUntilDepletion != null && p.daysUntilDepletion <= 7 ? "#FEF2F2" : "#ECFDF5" }]}>
              <Text style={[styles.daysText, { color: p.daysUntilDepletion != null && p.daysUntilDepletion <= 7 ? "#DC2626" : "#16A34A" }]}>
                {p.daysUntilDepletion != null ? `${p.daysUntilDepletion}d left` : "—"}
              </Text>
            </View>
          </View>
        ))}

      <SectionTitle title="Slow Moving" subtitle="no sales in 30 days" colors={colors} />
      {slowMoving.length === 0
        ? <EmptyState icon="trending-down" text="All products moved this month" colors={colors} />
        : slowMoving.map((p) => (
          <View key={p.id} style={[styles.productRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.rank, { backgroundColor: "#F3F4F6" }]}>
              <Feather name="minus-circle" size={14} color="#6B7280" />
            </View>
            <View style={styles.productInfo}>
              <Text style={[styles.productName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>{p.name}</Text>
              <Text style={[styles.productMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{p.stock ?? 0} units in stock</Text>
            </View>
          </View>
        ))}
    </>
  );
}

// ─── Customers Tab ────────────────────────────────────────────────────────────

function CustomersTab({ data, colors }: { data: AnalyticsSnapshot; colors: ReturnType<typeof useColors> }) {
  const { customers } = data;

  const segments = [
    { key: "vip",      label: "VIP",       count: customers.vip,      icon: "star" },
    { key: "returning",label: "Returning", count: customers.returning, icon: "repeat" },
    { key: "new",      label: "New",       count: customers.new,       icon: "user-plus" },
    { key: "inactive", label: "Inactive",  count: customers.inactive,  icon: "user-x" },
  ];

  return (
    <>
      <SectionTitle title="Customer Segments" subtitle={`${customers.total} total customers`} colors={colors} />
      <View style={styles.segmentGrid}>
        {segments.map((s) => {
          const sc = SEGMENT_COLOR[s.key];
          return (
            <View key={s.key} style={[styles.segCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.segIcon, { backgroundColor: sc.bg }]}>
                <Feather name={s.icon as any} size={16} color={sc.text} />
              </View>
              <Text style={[styles.segCount, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{s.count}</Text>
              <Text style={[styles.segLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{s.label}</Text>
            </View>
          );
        })}
      </View>

      <SectionTitle title="Top Spenders" colors={colors} />
      {customers.topBySpend.length === 0
        ? <EmptyState icon="users" text="No customer data yet" colors={colors} />
        : customers.topBySpend.map((c, i) => (
          <View key={c.phone ?? i} style={[styles.customerRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.avatarText, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                {(c.name ?? "?").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.customerInfo}>
              <Text style={[styles.customerName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{c.name ?? "Unknown"}</Text>
              <Text style={[styles.customerMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{c.orders} orders · {c.phone}</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text style={[styles.customerSpent, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{fmt(c.spent)}</Text>
              <SegmentBadge segment={c.segment} />
            </View>
          </View>
        ))}

      <SectionTitle title="Most Orders" colors={colors} />
      {customers.topByOrders.map((c, i) => (
        <View key={(c.phone ?? i) + "_orders"} style={[styles.customerRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.avatarText, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
              {(c.name ?? "?").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.customerInfo}>
            <Text style={[styles.customerName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{c.name ?? "Unknown"}</Text>
            <Text style={[styles.customerMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{fmt(c.spent)} spent · {c.phone}</Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <Text style={[styles.customerSpent, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{c.orders} orders</Text>
            <SegmentBadge segment={c.segment} />
          </View>
        </View>
      ))}
    </>
  );
}

function SegmentBadge({ segment }: { segment: string }) {
  const sc = SEGMENT_COLOR[segment] ?? { bg: "#F3F4F6", text: "#374151" };
  return (
    <View style={[styles.segBadge, { backgroundColor: sc.bg }]}>
      <Text style={[styles.segBadgeText, { color: sc.text }]}>{segment.charAt(0).toUpperCase() + segment.slice(1)}</Text>
    </View>
  );
}

// ─── Inventory Tab ────────────────────────────────────────────────────────────

function InventoryTab({ data, colors }: { data: AnalyticsSnapshot; colors: ReturnType<typeof useColors> }) {
  const { inventory } = data;

  return (
    <>
      <View style={styles.invSummaryRow}>
        <InvStat label="Total Products" value={inventory.total} color={colors.foreground} bg={colors.secondary} colors={colors} />
        <InvStat label="Low Stock" value={inventory.lowStockCount} color="#D97706" bg="#FEF3C7" colors={colors} />
        <InvStat label="Out of Stock" value={inventory.outOfStockCount} color="#DC2626" bg="#FEF2F2" colors={colors} />
      </View>

      <SectionTitle title="Low Stock" subtitle="≤5 units remaining" colors={colors} />
      {inventory.lowStock.length === 0
        ? <EmptyState icon="check-circle" text="All products are well stocked" colors={colors} />
        : inventory.lowStock.map((p) => (
          <View key={p.id} style={[styles.invRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.invDot, { backgroundColor: "#FEF3C7" }]}>
              <Feather name="alert-triangle" size={14} color="#D97706" />
            </View>
            <View style={styles.productInfo}>
              <Text style={[styles.productName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>{p.name}</Text>
              {p.category && <Text style={[styles.productMeta, { color: colors.mutedForeground }]}>{p.category}</Text>}
            </View>
            <View style={[styles.stockTag, { backgroundColor: "#FEF3C7" }]}>
              <Text style={[styles.stockText, { color: "#D97706", fontFamily: "Inter_700Bold" }]}>{p.stock} left</Text>
            </View>
          </View>
        ))}

      <SectionTitle title="Out of Stock" colors={colors} />
      {inventory.outOfStock.length === 0
        ? <EmptyState icon="check-circle" text="No products are out of stock" colors={colors} />
        : inventory.outOfStock.map((p) => (
          <View key={p.id} style={[styles.invRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.invDot, { backgroundColor: "#FEF2F2" }]}>
              <Feather name="x-circle" size={14} color="#DC2626" />
            </View>
            <View style={styles.productInfo}>
              <Text style={[styles.productName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>{p.name}</Text>
              {p.category && <Text style={[styles.productMeta, { color: colors.mutedForeground }]}>{p.category}</Text>}
            </View>
            <View style={[styles.stockTag, { backgroundColor: "#FEF2F2" }]}>
              <Text style={[styles.stockText, { color: "#DC2626", fontFamily: "Inter_700Bold" }]}>0</Text>
            </View>
          </View>
        ))}
    </>
  );
}

function InvStat({ label, value, color, bg, colors }: { label: string; value: number; color: string; bg: string; colors: any }) {
  return (
    <View style={[styles.invStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.invStatDot, { backgroundColor: bg }]}>
        <Text style={[styles.invStatValue, { color, fontFamily: "Inter_700Bold" }]}>{value}</Text>
      </View>
      <Text style={[styles.invStatLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{label}</Text>
    </View>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionTitle({ title, subtitle, colors }: { title: string; subtitle?: string; colors: any }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={[styles.sectionTitleText, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{title}</Text>
      {subtitle && <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{subtitle}</Text>}
    </View>
  );
}

function EmptyState({ icon, text, colors }: { icon: string; text: string; colors: any }) {
  return (
    <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Feather name={icon as any} size={28} color={colors.border} />
      <Text style={[styles.emptyCardText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{text}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, letterSpacing: -0.4 },
  refreshBtn: { padding: 4 },
  offlineBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 7, paddingHorizontal: 12 },
  offlineText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  tabBar: { paddingHorizontal: 12, gap: 6, alignItems: "center" },
  tabBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, height: 28, borderRadius: 20, borderWidth: 1 },
  tabLabel: { fontSize: 12 },

  content: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadText: { fontSize: 14 },
  emptyText: { fontSize: 15, textAlign: "center" },
  retryBtn: { marginTop: 4, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },

  sectionTitle: { marginTop: 8, marginBottom: 4 },
  sectionTitleText: { fontSize: 15, letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 12, marginTop: 1 },

  revenueGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  revenueCard: { width: "47%", borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 },
  revenueLabel: { fontSize: 12 },
  revenueValue: { fontSize: 20, letterSpacing: -0.5 },
  pctBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, alignSelf: "flex-start" },
  pctText: { fontSize: 11 },

  barChart: { borderWidth: 1, borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  barItem: { flex: 1, alignItems: "center", gap: 4 },
  barValueLabel: { fontSize: 10, letterSpacing: -0.3 },
  barTrack: { width: "70%", justifyContent: "flex-end", borderRadius: 6, overflow: "hidden", backgroundColor: "#F3F4F6" },
  barFill: { width: "100%", borderRadius: 6 },
  barLabel: { fontSize: 10 },

  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 0 },
  orderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
  orderLabel: { fontSize: 14 },
  orderValue: { fontSize: 14 },
  divider: { height: StyleSheet.hairlineWidth },
  avgRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 12 },
  avgLabel: { fontSize: 14 },
  avgValue: { fontSize: 16 },

  productRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 6 },
  rank: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rankText: { fontSize: 12 },
  productInfo: { flex: 1, gap: 2 },
  productName: { fontSize: 14 },
  productMeta: { fontSize: 12 },
  productRev: { fontSize: 14 },
  daysTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  daysText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  segmentGrid: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginBottom: 4 },
  segCard: { width: "47%", borderWidth: 1, borderRadius: 12, padding: 14, alignItems: "center", gap: 6 },
  segIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  segCount: { fontSize: 22, letterSpacing: -0.5 },
  segLabel: { fontSize: 12 },

  customerRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 6 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16 },
  customerInfo: { flex: 1, gap: 2 },
  customerName: { fontSize: 14 },
  customerMeta: { fontSize: 12 },
  customerSpent: { fontSize: 14 },
  segBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  segBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  invSummaryRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  invStatCard: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: "center", gap: 6 },
  invStatDot: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  invStatValue: { fontSize: 18, letterSpacing: -0.5 },
  invStatLabel: { fontSize: 11, textAlign: "center" },

  invRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 6 },
  invDot: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  stockTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  stockText: { fontSize: 12 },

  emptyCard: { borderWidth: 1, borderRadius: 12, padding: 24, alignItems: "center", gap: 10, marginBottom: 6 },
  emptyCardText: { fontSize: 14, textAlign: "center" },
});
