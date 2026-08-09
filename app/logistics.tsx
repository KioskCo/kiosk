import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { hapticImpact, hapticNotification } from "@/hooks/useHapticsStore";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Rider, useApp } from "@/context/AppContext";
import { logisticsApi } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

const VEHICLE_ICONS: Record<string, string> = {
  bike: "motorbike",
  car: "car",
  van: "van-utility",
};

const VEHICLE_LABELS: Record<string, string> = {
  bike: "Motorcycle",
  car: "Car",
  van: "Van",
};

const VEHICLE_RATES: Record<string, { base: number; perKm: number }> = {
  bike: { base: 500, perKm: 100 },
  car: { base: 1200, perKm: 180 },
  van: { base: 2000, perKm: 250 },
};

const PLATFORM_COLORS: Record<string, { bg: string; text: string }> = {
  Kwik:        { bg: "#EEF2FF", text: "#4338CA" },
  Gokada:      { bg: "#FEF9C3", text: "#854D0E" },
  Sendbox:     { bg: "#FDF4FF", text: "#7E22CE" },
  Independent: { bg: "#F1F5F9", text: "#475569" },
};

const PAGE_SIZE = 4;

function estimatedFee(vehicle: string, etaMinutes: number): number {
  const rate = VEHICLE_RATES[vehicle] ?? { base: 800, perKm: 150 };
  const estimatedKm = Math.max(1, Math.round(etaMinutes * 0.4));
  return rate.base + rate.perKm * estimatedKm;
}

function extractState(location: string): string {
  const parts = location.split(",");
  return parts.length > 1 ? parts[parts.length - 1].trim() : location.trim();
}

export default function LogisticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { riders, pingRider, markRiderBooked, profile } = useApp();
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<"mystate" | "all">("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  useEffect(() => {
    logisticsApi.getProviders().then((res) => {
      const data = (res as any).data ?? res;
      if (Array.isArray(data)) setProviders(data);
    }).catch(() => {});
  }, []);

  // Derive vendor's state from their business address � falls back to Lagos
  const merchantState = extractState(profile?.businessAddress ?? "Lagos");

  const filtered = useMemo(() => {
    let base = riders;
    if (stateFilter === "mystate") {
      // Show riders whose location contains the vendor's state/city
      const addrLower = (profile?.businessAddress ?? "Lagos").toLowerCase();
      const stateLower = merchantState.toLowerCase();
      base = riders.filter((r) => {
        const loc = r.location.toLowerCase();
        return loc.includes(stateLower) || addrLower.includes(extractState(r.location).toLowerCase());
      });
    }
    // Sort available riders first, then by ETA
    base = [...base].sort((a, b) => {
      if (a.status === "available" && b.status !== "available") return -1;
      if (b.status === "available" && a.status !== "available") return 1;
      return (a.eta ?? 99) - (b.eta ?? 99);
    });
    if (!search.trim()) return base;
    const q = search.trim().toLowerCase();
    return base.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.platform.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q) ||
      r.vehicle.toLowerCase().includes(q)
    );
  }, [riders, search, stateFilter, merchantState, profile?.businessAddress]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const handlePing = (rider: Rider) => {
    hapticNotification();
    pingRider(rider.id);
    markRiderBooked(rider.id);
    setSelectedRider(null);
    if (Platform.OS !== "web") {
      Alert.alert("Rider Booked!", `${rider.name} has been notified for pickup. They will reach out to confirm.`);
    }
  };

  const availableCount = riders.filter((r) => r.status === "available").length;
  const busyCount = riders.filter((r) => r.status === "busy").length;

  const statusColor = (s: string) =>
    s === "available" ? "#10B981" : s === "busy" ? "#F59E0B" : s === "booked" ? "#7C3AED" : "#94A3B8";
  const statusLabel = (s: string) =>
    s === "available" ? "Available" : s === "busy" ? "On Delivery" : s === "booked" ? "Booked" : "Offline";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Logistics</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Persistent info banner � always visible */}
      <View style={{ backgroundColor: "#EFF6FF", borderBottomWidth: 1, borderBottomColor: "#BFDBFE", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 12, color: "#1D4ED8", marginBottom: 6 }}>How each provider works</Text>
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 4 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#4338CA", marginTop: 5 }} />
          <Text style={{ flex: 1, fontSize: 12, color: "#1E3A5F", fontFamily: "Inter_400Regular", lineHeight: 18 }}>
            <Text style={{ fontFamily: "Inter_600SemiBold" }}>Kwik</Text> � Same-city only (bikes & cars). Best for Lagos, Abuja deliveries within hours. Rider is assigned nearby and comes to your pickup address.
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#0369A1", marginTop: 5 }} />
          <Text style={{ flex: 1, fontSize: 12, color: "#1E3A5F", fontFamily: "Inter_400Regular", lineHeight: 18 }}>
            <Text style={{ fontFamily: "Inter_600SemiBold" }}>Terminal Africa</Text> � Nationwide inter-city (GIG, DHL, Fedex NG etc.). Best for deliveries across states. 1�3 day delivery. Buyer gets a tracking link, no account needed.
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          <View style={[styles.statChip, { backgroundColor: "#ECFDF5", borderRadius: 10 }]}>
            <View style={[styles.statDot, { backgroundColor: "#10B981" }]} />
            <Text style={[styles.statText, { color: "#065F46", fontFamily: "Inter_600SemiBold" }]}>{availableCount} Available</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: "#FFF7ED", borderRadius: 10 }]}>
            <View style={[styles.statDot, { backgroundColor: "#F59E0B" }]} />
            <Text style={[styles.statText, { color: "#92400E", fontFamily: "Inter_600SemiBold" }]}>{busyCount} On Delivery</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: colors.secondary, borderRadius: 10 }]}>
            <Feather name="users" size={12} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>{riders.length} Total</Text>
          </View>
        </View>

        {/* State filter */}
        <View style={styles.stateFilterRow}>
          <TouchableOpacity
            onPress={() => { setStateFilter("mystate"); setVisibleCount(PAGE_SIZE); }}
            style={[styles.stateChip, { backgroundColor: stateFilter === "mystate" ? colors.primary : colors.card, borderColor: stateFilter === "mystate" ? colors.primary : colors.border, borderRadius: 20 }]}
            activeOpacity={0.8}
          >
            <Feather name="map-pin" size={12} color={stateFilter === "mystate" ? "#FFFFFF" : colors.primary} />
            <Text style={[styles.stateChipText, { color: stateFilter === "mystate" ? "#FFFFFF" : colors.foreground, fontFamily: stateFilter === "mystate" ? "Inter_700Bold" : "Inter_400Regular" }]}>
              {merchantState} Only
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setStateFilter("all"); setVisibleCount(PAGE_SIZE); }}
            style={[styles.stateChip, { backgroundColor: stateFilter === "all" ? colors.primary : colors.card, borderColor: stateFilter === "all" ? colors.primary : colors.border, borderRadius: 20 }]}
            activeOpacity={0.8}
          >
            <Feather name="globe" size={12} color={stateFilter === "all" ? "#FFFFFF" : colors.primary} />
            <Text style={[styles.stateChipText, { color: stateFilter === "all" ? "#FFFFFF" : colors.foreground, fontFamily: stateFilter === "all" ? "Inter_700Bold" : "Inter_400Regular" }]}>
              All Nigeria
            </Text>
          </TouchableOpacity>
          {stateFilter === "mystate" && (
            <Text style={[styles.stateNote, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Showing riders in {merchantState}
            </Text>
          )}
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={(t) => { setSearch(t); setVisibleCount(PAGE_SIZE); }}
            placeholder="Search riders, platform, location..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
            clearButtonMode="while-editing"
          />
          {search.length > 0 && Platform.OS !== "ios" && (
            <TouchableOpacity onPress={() => { setSearch(""); setVisibleCount(PAGE_SIZE); }}>
              <Feather name="x-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.tapHint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Tap a rider to view details before pinging
        </Text>

        {filtered.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border }]}>
            <Feather name="users" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {search ? `No riders match "${search}"` : stateFilter === "mystate" ? `No riders found in ${merchantState}` : "No riders available right now"}
            </Text>
            {(search || stateFilter === "mystate") && (
              <TouchableOpacity onPress={() => { setSearch(""); setStateFilter("all"); setVisibleCount(PAGE_SIZE); }}>
                <Text style={[styles.clearSearch, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>Show all riders</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <Text style={[styles.listHeader, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              {search ? `${filtered.length} rider${filtered.length === 1 ? "" : "s"} found` : "Nearby Riders"}
            </Text>

            {visible.map((rider) => (
              <RiderCard
                key={rider.id}
                rider={rider}
                onTap={() => setSelectedRider(rider)}
                onPing={() => handlePing(rider)}
              />
            ))}

            {hasMore && (
              <TouchableOpacity
                onPress={() => { setVisibleCount((prev) => prev + PAGE_SIZE); hapticImpact(); }}
                style={[styles.loadMoreBtn, { borderColor: colors.border, borderRadius: colors.radius }]}
                activeOpacity={0.8}
              >
                <Feather name="chevron-down" size={16} color={colors.primary} />
                <Text style={[styles.loadMoreText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                  Load More Riders ({filtered.length - visibleCount} remaining)
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Book inter-state delivery */}
        <View style={[styles.interstateCard, { backgroundColor: "#0F766E", borderRadius: colors.radius }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.interstateTitle, { color: "#FFFFFF", fontFamily: "Inter_700Bold" }]}>Book Inter-state Delivery</Text>
            <Text style={[styles.interstateSub, { color: "#CCFBF1", fontFamily: "Inter_400Regular" }]}>
              Ship nationwide via Terminal Africa. Compare DHL, GIG, FedEx rates, and give the buyer a live tracking link.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/book-delivery" as any)}
            style={[styles.interstateBtn, { backgroundColor: "#FFFFFF", borderRadius: 10 }]}
            activeOpacity={0.85}
          >
            <Feather name="arrow-right" size={16} color="#0F766E" />
            <Text style={[styles.interstateBtnText, { color: "#0F766E", fontFamily: "Inter_700Bold" }]}>Book Now</Text>
          </TouchableOpacity>
        </View>

        {/* Nationwide Carriers */}
        {providers.filter((p) => p.type !== "on_demand_rider").length > 0 && (
          <>
            <Text style={[styles.listHeader, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginTop: 16 }]}>
              Nationwide Carriers
            </Text>
            <Text style={[{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 10, paddingHorizontal: 2 }]}>
              Rates are shown per order when you book delivery. Compare DHL, GIG, Sendbox and more in one tap.
            </Text>
            {providers.filter((p) => p.type !== "on_demand_rider").map((p) => (
              <View key={p.id} style={[styles.carrierCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={[styles.carrierIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name="truck" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={[styles.carrierName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{p.name}</Text>
                    {p.id === "terminal_africa" && (
                      <View style={{ backgroundColor: "#EEF2FF", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 9, color: "#4338CA", fontFamily: "Inter_700Bold" }}>HUB</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{p.coverage}</Text>
                  <Text style={[{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{p.estimatedDays}</Text>
                </View>
                <View style={[{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: "#ECFDF5" }]}>
                  <Text style={{ fontSize: 10, color: "#065F46", fontFamily: "Inter_600SemiBold" }}>Active</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Rider Detail Modal */}
      {selectedRider && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setSelectedRider(null)}>
          <TouchableOpacity style={styles.overlay} onPress={() => setSelectedRider(null)} activeOpacity={1} />
          <View style={[styles.detailSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 20 }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            {/* Rider header */}
            <View style={styles.detailHeader}>
              <View style={[styles.detailAvatar, { backgroundColor: colors.secondary }]}>
                <MaterialCommunityIcons
                  name={VEHICLE_ICONS[selectedRider.vehicle] as any}
                  size={32}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {selectedRider.name}
                </Text>
                <View style={styles.detailMeta}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor(selectedRider.status) }]} />
                  <Text style={[styles.detailStatus, { color: statusColor(selectedRider.status), fontFamily: "Inter_600SemiBold" }]}>
                    {statusLabel(selectedRider.status)}
                  </Text>
                  <Text style={[styles.dotSep, { color: colors.border }]}>�</Text>
                  <View style={[styles.platformBadge, { backgroundColor: (PLATFORM_COLORS[selectedRider.platform] ?? { bg: colors.secondary }).bg, borderRadius: 6 }]}>
                    <Text style={[styles.platformText, { color: (PLATFORM_COLORS[selectedRider.platform] ?? { text: colors.primary }).text, fontFamily: "Inter_600SemiBold" }]}>
                      {selectedRider.platform}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Details grid */}
            <View style={[styles.detailGrid, { borderColor: colors.border }]}>
              <View style={[styles.detailCell, { borderRightColor: colors.border, borderBottomColor: colors.border }]}>
                <Text style={[styles.detailCellLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Vehicle</Text>
                <Text style={[styles.detailCellValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {VEHICLE_LABELS[selectedRider.vehicle] ?? selectedRider.vehicle}
                </Text>
              </View>
              <View style={[styles.detailCell, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailCellLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Rating</Text>
                <Text style={[styles.detailCellValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  ? {selectedRider.rating}/5.0
                </Text>
              </View>
              <View style={[styles.detailCell, { borderRightColor: colors.border }]}>
                <Text style={[styles.detailCellLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Deliveries</Text>
                <Text style={[styles.detailCellValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {selectedRider.completedDeliveries.toLocaleString()}
                </Text>
              </View>
              <View style={styles.detailCell}>
                <Text style={[styles.detailCellLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>ETA</Text>
                <Text style={[styles.detailCellValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {selectedRider.status === "available" ? `${selectedRider.eta} mins` : "N/A"}
                </Text>
              </View>
            </View>

            {/* Location & Dispatch fee */}
            <View style={[styles.detailInfoRow, { backgroundColor: colors.card, borderRadius: 12, borderColor: colors.border }]}>
              <Feather name="map-pin" size={16} color={colors.mutedForeground} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailInfoLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Current Location</Text>
                <Text style={[styles.detailInfoValue, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  {selectedRider.location}
                </Text>
              </View>
            </View>

            <View style={[styles.detailInfoRow, { backgroundColor: "#ECFDF5", borderRadius: 12, borderColor: "#A7F3D0" }]}>
              <Feather name="dollar-sign" size={16} color="#059669" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailInfoLabel, { color: "#065F46", fontFamily: "Inter_400Regular" }]}>Estimated Dispatch Fee</Text>
                <Text style={[styles.detailInfoValue, { color: "#047857", fontFamily: "Inter_700Bold" }]}>
                  ?{estimatedFee(selectedRider.vehicle, selectedRider.eta).toLocaleString("en-NG")}
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12 }}> (approx)</Text>
                </Text>
              </View>
            </View>

            <Text style={[styles.feeNote, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Final fee confirmed after booking. Based on estimated distance + vehicle type.
            </Text>

            {/* Action buttons */}
            <View style={styles.detailActions}>
              <TouchableOpacity
                style={[styles.detailCancelBtn, { borderColor: colors.border, borderRadius: 14 }]}
                onPress={() => setSelectedRider(null)}
                activeOpacity={0.8}
              >
                <Text style={[styles.detailCancelText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.detailPingBtn,
                  {
                    backgroundColor: selectedRider.pinged
                      ? "#ECFDF5"
                      : selectedRider.status === "offline"
                      ? colors.muted
                      : colors.primary,
                    borderRadius: 14,
                    opacity: selectedRider.status === "offline" ? 0.5 : 1,
                  },
                ]}
                onPress={selectedRider.status !== "offline" && !selectedRider.pinged ? () => handlePing(selectedRider) : undefined}
                disabled={selectedRider.pinged || selectedRider.status === "offline"}
                activeOpacity={0.85}
              >
                <Feather
                  name={selectedRider.pinged ? "check-circle" : "send"}
                  size={18}
                  color={selectedRider.pinged ? "#10B981" : selectedRider.status === "offline" ? colors.mutedForeground : "#FFFFFF"}
                />
                <Text style={[styles.detailPingText, { color: selectedRider.pinged ? "#10B981" : selectedRider.status === "offline" ? colors.mutedForeground : "#FFFFFF", fontFamily: "Inter_700Bold" }]}>
                  {selectedRider.pinged ? "Already Pinged" : selectedRider.status === "offline" ? "Offline" : `Ping ${selectedRider.name.split(" ")[0]}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function RiderCard({ rider, onTap, onPing }: { rider: Rider; onTap: () => void; onPing: () => void }) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const platform = PLATFORM_COLORS[rider.platform] ?? { bg: colors.secondary, text: colors.primary };

  const statusColor = rider.status === "available" ? "#10B981" : rider.status === "busy" ? "#F59E0B" : rider.status === "booked" ? "#7C3AED" : "#94A3B8";
  const statusLabel = rider.status === "available" ? "Available" : rider.status === "busy" ? "On Delivery" : rider.status === "booked" ? "Booked" : "Offline";

  return (
    <Animated.View style={[anim, styles.riderCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <TouchableOpacity
        style={styles.riderMain}
        onPress={onTap}
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 350 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 350 }); }}
        activeOpacity={1}
      >
        <View style={[styles.riderAvatar, { backgroundColor: colors.secondary }]}>
          <MaterialCommunityIcons name={VEHICLE_ICONS[rider.vehicle] as any} size={22} color={colors.primary} />
        </View>
        <View style={styles.riderInfo}>
          <View style={styles.riderNameRow}>
            <Text style={[styles.riderName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{rider.name}</Text>
            <View style={[styles.platformBadge, { backgroundColor: platform.bg, borderRadius: 6 }]}>
              <Text style={[styles.platformText, { color: platform.text, fontFamily: "Inter_600SemiBold" }]}>{rider.platform}</Text>
            </View>
          </View>
          <View style={styles.riderMeta}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.riderStatus, { color: statusColor, fontFamily: "Inter_500Medium" }]}>{statusLabel}</Text>
            <Text style={[styles.riderDot, { color: colors.mutedForeground }]}>�</Text>
            <Feather name="map-pin" size={10} color={colors.mutedForeground} />
            <Text style={[styles.riderLocation, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{rider.location}</Text>
          </View>
          <View style={styles.riderStats}>
            <Text style={[styles.riderStat, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              ? {rider.rating}
            </Text>
            <Text style={[styles.riderDot, { color: colors.border }]}>�</Text>
            <Text style={[styles.riderStat, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {rider.completedDeliveries} deliveries
            </Text>
            {rider.status === "available" && (
              <>
                <Text style={[styles.riderDot, { color: colors.border }]}>�</Text>
                <Text style={[styles.riderStat, { color: "#10B981", fontFamily: "Inter_600SemiBold" }]}>
                  �?{estimatedFee(rider.vehicle, rider.eta).toLocaleString("en-NG")}
                </Text>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={rider.status !== "offline" && rider.status !== "booked" && !rider.pinged ? onTap : undefined}
        disabled={rider.pinged || rider.status === "offline" || rider.status === "booked"}
        style={[
          styles.pingBtn,
          {
            backgroundColor: rider.status === "booked" ? "#EDE9FE" : rider.pinged ? "#ECFDF5" : rider.status === "offline" ? colors.muted : colors.primary,
            borderRadius: 8,
            opacity: rider.status === "offline" ? 0.5 : 1,
          },
        ]}
        activeOpacity={0.85}
      >
        <Text style={[styles.pingText, { color: rider.status === "booked" ? "#7C3AED" : rider.pinged ? "#10B981" : rider.status === "offline" ? colors.mutedForeground : "#FFFFFF", fontFamily: "Inter_600SemiBold" }]}>
          {rider.status === "booked" ? "Booked" : rider.pinged ? "Pinged ✓" : rider.status === "offline" ? "Offline" : "View"}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, letterSpacing: -0.3 },
  content: { padding: 16, gap: 14 },
  statsRow: { flexDirection: "row", gap: 8 },
  statChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 8, flex: 1 },
  statDot: { width: 7, height: 7, borderRadius: 4 },
  statText: { fontSize: 11 },
  stateFilterRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  stateChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  stateChipText: { fontSize: 13 },
  stateNote: { fontSize: 11, flex: 1 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  tapHint: { fontSize: 11, textAlign: "center", marginTop: -4 },
  listHeader: { fontSize: 12, letterSpacing: 0.5 },
  riderCard: { borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  riderMain: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  riderAvatar: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  riderInfo: { flex: 1, gap: 4 },
  riderNameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  riderName: { fontSize: 14, flex: 1 },
  platformBadge: { paddingHorizontal: 6, paddingVertical: 2 },
  platformText: { fontSize: 10 },
  riderMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  riderStatus: { fontSize: 12 },
  riderDot: { fontSize: 12 },
  riderLocation: { fontSize: 11 },
  riderStats: { flexDirection: "row", alignItems: "center", gap: 4 },
  riderStat: { fontSize: 11 },
  pingBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  pingText: { fontSize: 13 },
  loadMoreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, paddingVertical: 14 },
  loadMoreText: { fontSize: 14 },
  emptyState: { borderWidth: 1, padding: 32, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 14, textAlign: "center" },
  clearSearch: { fontSize: 14 },
  carrierCard: { borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  carrierIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  carrierName: { fontSize: 14 },
  interstateCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  interstateTitle: { fontSize: 15, marginBottom: 4 },
  interstateSub: { fontSize: 12, lineHeight: 17 },
  interstateBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 12 },
  interstateBtnText: { fontSize: 13 },
  // Detail modal
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  detailSheet: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 20 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  detailHeader: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 },
  detailAvatar: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  detailName: { fontSize: 20, marginBottom: 6 },
  detailMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailStatus: { fontSize: 13 },
  dotSep: { fontSize: 13 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", borderWidth: 1, borderRadius: 12, overflow: "hidden", marginBottom: 14 },
  detailCell: { width: "50%", padding: 14, borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, gap: 4 },
  detailCellLabel: { fontSize: 11 },
  detailCellValue: { fontSize: 16 },
  detailInfoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderWidth: 1, marginBottom: 10 },
  detailInfoLabel: { fontSize: 11, marginBottom: 2 },
  detailInfoValue: { fontSize: 15 },
  feeNote: { fontSize: 11, textAlign: "center", marginBottom: 20 },
  detailActions: { flexDirection: "row", gap: 12 },
  detailCancelBtn: { flex: 1, paddingVertical: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  detailCancelText: { fontSize: 15 },
  detailPingBtn: { flex: 2, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  detailPingText: { fontSize: 16 },
});
