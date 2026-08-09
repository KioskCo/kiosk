import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { logisticsApi } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type TrackingEvent = {
  status: string;
  description: string;
  timestamp: string;
  location?: string;
};

type RiderLocation = {
  riderName?: string;
  riderPhone?: string;
  vehicleType?: string;
  lat?: number;
  lng?: number;
  lastUpdated?: string;
  bookingId?: string;
  trackingUrl?: string;
};

type TrackingData = {
  trackingId: string;
  provider?: string;
  status: string;
  estimatedDelivery?: string;
  deliveryAddress?: string;
  destLat?: number;
  destLng?: number;
  events: TrackingEvent[];
  // Multiple riders support
  riders?: RiderLocation[];
};

const STATUS_ORDER = ["picked_up", "in_transit", "out_for_delivery", "delivered"];

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending pickup",
  picked_up: "Picked up",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  failed: "Delivery failed",
};

const STATUS_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  pending: "clock",
  picked_up: "package",
  in_transit: "truck",
  out_for_delivery: "navigation",
  delivered: "check-circle",
  failed: "x-circle",
};

// Opens Google Maps / Apple Maps at lat,lng with a label
function openRiderOnMaps(lat: number, lng: number, label = "Rider location") {
  const encoded = encodeURIComponent(label);
  const url = Platform.OS === "ios"
    ? `maps://?q=${encoded}&ll=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encoded}`;
  Linking.openURL(url).catch(() => {
    // Fallback to Google Maps web
    Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
  });
}

function openAddressOnMaps(address: string) {
  const encoded = encodeURIComponent(address);
  const url = Platform.OS === "ios"
    ? `maps://?q=${encoded}`
    : `https://www.google.com/maps/search/?api=1&query=${encoded}`;
  Linking.openURL(url).catch(() => {});
}

// Static map preview using OpenStreetMap (no API key, covers Nigeria fully)
function StaticMapPreview({ lat, lng, label }: { lat: number; lng: number; label?: string }) {
  const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=600x220&markers=${lat},${lng},red-pushpin`;
  return (
    <TouchableOpacity
      style={styles.mapPreview}
      onPress={() => openRiderOnMaps(lat, lng, label ?? "Delivery")}
      activeOpacity={0.88}
    >
      <Image
        source={{ uri: mapUrl }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <View style={styles.mapOverlay}>
        <View style={styles.mapPinBadge}>
          <Feather name="map-pin" size={14} color="#fff" />
          <Text style={styles.mapPinText}>{label ?? "Rider location"}</Text>
        </View>
        <View style={styles.mapOpenBtn}>
          <Feather name="external-link" size={12} color="#fff" />
          <Text style={styles.mapOpenBtnText}>Open in Maps</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Per-rider card shown in "Riders" section
function RiderCard({ rider, colors, index }: { rider: RiderLocation; colors: any; index: number }) {
  return (
    <View style={[styles.riderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.riderHeader}>
        <View style={[styles.riderAvatar, { backgroundColor: colors.primary + "20" }]}>
          <Feather name="user" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.riderName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {rider.riderName ?? `Rider ${index + 1}`}
          </Text>
          {rider.vehicleType && (
            <Text style={[styles.riderSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {rider.vehicleType}
            </Text>
          )}
        </View>
        {rider.riderPhone && (
          <TouchableOpacity
            onPress={() => Linking.openURL(`tel:${rider.riderPhone}`)}
            style={[styles.callBtn, { backgroundColor: "#10B98120" }]}
          >
            <Feather name="phone" size={16} color="#10B981" />
          </TouchableOpacity>
        )}
      </View>

      {/* GPS map preview if coordinates available */}
      {rider.lat != null && rider.lng != null ? (
        <>
          <StaticMapPreview lat={rider.lat} lng={rider.lng} label={rider.riderName ?? `Rider ${index + 1}`} />
          {rider.lastUpdated && (
            <Text style={[styles.lastUpdated, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Last seen: {new Date(rider.lastUpdated).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
            </Text>
          )}
        </>
      ) : null}

      {/* Kwik live tracking link */}
      {rider.trackingUrl ? (
        <TouchableOpacity
          onPress={() => WebBrowser.openBrowserAsync(rider.trackingUrl!)}
          style={[styles.trackBtn, { backgroundColor: "#065F46" }]}
          activeOpacity={0.85}
        >
          <Feather name="map" size={15} color="#fff" />
          <Text style={[styles.trackBtnText, { fontFamily: "Inter_700Bold" }]}>Track live on Kwik</Text>
        </TouchableOpacity>
      ) : rider.lat == null ? (
        <TouchableOpacity
          style={[styles.trackBtn, { backgroundColor: colors.secondary }]}
          onPress={() => {}}
          disabled
        >
          <Feather name="clock" size={15} color={colors.mutedForeground} />
          <Text style={[styles.trackBtnText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Waiting for GPS location…</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function TrackingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { orders } = useApp();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const order = orders.find((o) => o.id === orderId);
  const trackingId = (order as any)?.trackingId as string | undefined;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TrackingData | null>(null);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTracking = async (quiet = false) => {
    try {
      // Fetch all bookings (riders) for this order from the server
      const orderRes = await logisticsApi.getOrderRiders(orderId!).catch(() => null);
      const bookings: any[] = (orderRes as any)?.data ?? [];

      const riders: RiderLocation[] = bookings.map((b: any) => ({
        riderName:   b.riderName,
        riderPhone:  b.riderPhone,
        vehicleType: b.vehicleType,
        lat:         b.lat,
        lng:         b.lng,
        lastUpdated: b.lastUpdated,
        bookingId:   b.bookingId,
        trackingUrl: b.trackingUrl,
      }));

      // Also fetch tracking events if a trackingId exists
      let events: TrackingEvent[] = [];
      let status = bookings[0]?.status ?? "in_transit";
      let provider = bookings[0]?.provider;
      let deliveryAddress = bookings[0]?.deliveryAddress;

      if (trackingId) {
        try {
          const trackRes = await logisticsApi.track(trackingId);
          const d = (trackRes as any).data ?? trackRes;
          if (Array.isArray(d.events) && d.events.length > 0) events = d.events;
          if (d.status) status = d.status;
          if (d.provider) provider = d.provider;
          if (d.deliveryAddress) deliveryAddress = d.deliveryAddress;
        } catch { /* non-fatal */ }
      }

      setData({
        trackingId: trackingId ?? orderId!,
        provider,
        status,
        deliveryAddress,
        events: events.length > 0 ? events : [
          { status, description: "Shipment in progress", timestamp: new Date().toISOString() },
        ],
        riders: riders.length > 0 ? riders : undefined,
      });
    } catch {
      if (!quiet) setError("Could not load tracking information. Try again later.");
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    if (!orderId) {
      setError("No order ID provided.");
      setLoading(false);
      return;
    }
    fetchTracking();
    pollRef.current = setInterval(() => {
      if (data?.status === "delivered" || data?.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);
        return;
      }
      fetchTracking(true);
    }, 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [trackingId]);

  const currentStatus = data?.status ?? "in_transit";
  const currentStep = STATUS_ORDER.indexOf(currentStatus);
  const hasRiders = (data?.riders?.length ?? 0) > 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Track Delivery</Text>
        <TouchableOpacity onPress={() => fetchTracking()} style={styles.backBtn}>
          <Feather name="refresh-cw" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.mutedForeground, marginTop: 12, fontFamily: "Inter_400Regular" }}>Loading tracking info…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Feather name="alert-triangle" size={40} color={colors.mutedForeground} />
          <Text style={{ color: colors.foreground, marginTop: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" }}>{error}</Text>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backLink, { backgroundColor: colors.secondary }]}>
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>Back to order</Text>
          </TouchableOpacity>
        </View>
      ) : data ? (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          {/* Status banner */}
          <View style={[styles.statusBanner, {
            backgroundColor: currentStatus === "delivered" ? "#ECFDF5" : currentStatus === "failed" ? "#FEF2F2" : "#EFF6FF",
            borderColor: currentStatus === "delivered" ? "#10B98130" : currentStatus === "failed" ? "#EF444430" : "#3B82F630",
          }]}>
            <Feather
              name={STATUS_ICONS[currentStatus] ?? "package"}
              size={28}
              color={currentStatus === "delivered" ? "#10B981" : currentStatus === "failed" ? "#EF4444" : colors.primary}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusLabel, {
                color: currentStatus === "delivered" ? "#065F46" : currentStatus === "failed" ? "#991B1B" : colors.primary,
                fontFamily: "Inter_700Bold",
              }]}>
                {STATUS_LABELS[currentStatus] ?? currentStatus}
              </Text>
              {data.estimatedDelivery && (
                <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 }}>
                  Est. delivery: {new Date(data.estimatedDelivery).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </Text>
              )}
            </View>
          </View>

          {/* ── RIDERS SECTION ── */}
          {hasRiders && (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold", marginBottom: 10 }]}>
                {(data.riders?.length ?? 0) > 1 ? `${data.riders?.length} Riders` : "Rider"}
              </Text>
              {data.riders!.map((rider, i) => (
                <RiderCard key={i} rider={rider} colors={colors} index={i} />
              ))}
            </View>
          )}

          {/* Delivery destination map (if no rider GPS but address available) */}
          {!hasRiders && data.deliveryAddress && (
            <TouchableOpacity
              style={[styles.destCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => data.deliveryAddress && openAddressOnMaps(data.deliveryAddress)}
              activeOpacity={0.85}
            >
              <Feather name="map-pin" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>Delivering to</Text>
                <Text style={{ fontSize: 14, color: colors.foreground, fontFamily: "Inter_600SemiBold" }} numberOfLines={2}>{data.deliveryAddress}</Text>
              </View>
              <View style={[styles.mapChip, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="navigation" size={12} color={colors.primary} />
                <Text style={{ fontSize: 11, color: colors.primary, fontFamily: "Inter_600SemiBold" }}>Maps</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Tracking ID + provider */}
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Tracking ID</Text>
              <Text style={[styles.infoValue, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{data.trackingId}</Text>
            </View>
            {data.provider && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Carrier</Text>
                <Text style={[styles.infoValue, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{data.provider}</Text>
              </View>
            )}
          </View>

          {/* Progress stepper */}
          {currentStatus !== "failed" && (
            <View style={[styles.stepperCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Delivery Progress</Text>
              {STATUS_ORDER.map((step, i) => {
                const done = i <= currentStep;
                const active = i === currentStep;
                return (
                  <View key={step} style={styles.stepRow}>
                    <View style={styles.stepLeft}>
                      <View style={[styles.stepDot, {
                        backgroundColor: done ? colors.primary : colors.muted,
                        borderColor: active ? colors.primary : done ? colors.primary : colors.border,
                      }]}>
                        {done && <Feather name="check" size={10} color="#fff" />}
                      </View>
                      {i < STATUS_ORDER.length - 1 && (
                        <View style={[styles.stepLine, { backgroundColor: i < currentStep ? colors.primary : colors.border }]} />
                      )}
                    </View>
                    <Text style={[styles.stepLabel, {
                      color: done ? colors.foreground : colors.mutedForeground,
                      fontFamily: active ? "Inter_700Bold" : "Inter_400Regular",
                    }]}>
                      {STATUS_LABELS[step] ?? step}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Event log */}
          {data.events.length > 0 && (
            <View style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Timeline</Text>
              {data.events.map((ev, i) => (
                <View key={i} style={[styles.eventRow, { borderBottomColor: colors.border, borderBottomWidth: i < data.events.length - 1 ? 1 : 0 }]}>
                  <View style={[styles.eventDot, { backgroundColor: i === 0 ? colors.primary : colors.muted }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.eventStatus, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                      {STATUS_LABELS[ev.status] ?? ev.status}
                    </Text>
                    <Text style={[styles.eventDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{ev.description}</Text>
                    {ev.location && (
                      <TouchableOpacity onPress={() => ev.location && openAddressOnMaps(ev.location)}>
                        <Text style={[styles.eventLoc, { color: colors.primary, fontFamily: "Inter_400Regular" }]}>
                          📍 {ev.location}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <Text style={[styles.eventTime, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      {new Date(ev.timestamp).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : null}
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
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  backLink: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginTop: 8 },
  content: { padding: 16, gap: 14 },
  statusBanner: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 16, borderRadius: 14, borderWidth: 1,
  },
  statusLabel: { fontSize: 18 },
  sectionTitle: { fontSize: 14, marginBottom: 6 },

  // Rider card
  riderCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 4 },
  riderHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  riderAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  riderName: { fontSize: 15 },
  riderSub: { fontSize: 12, marginTop: 1 },
  callBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  lastUpdated: { fontSize: 11, textAlign: "center", paddingVertical: 6 },
  trackBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, margin: 12, borderRadius: 10 },
  trackBtnText: { color: "#fff", fontSize: 14 },

  // Map preview
  mapPreview: { height: 180, position: "relative" },
  mapOverlay: { ...StyleSheet.absoluteFillObject, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", padding: 10 },
  mapPinBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  mapPinText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  mapOpenBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  mapOpenBtnText: { color: "#fff", fontSize: 11 },

  // Destination card
  destCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  mapChip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },

  // Info card
  infoCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13, textAlign: "right", flex: 1, paddingLeft: 16 },

  // Stepper
  stepperCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 0 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 14, minHeight: 44 },
  stepLeft: { alignItems: "center", width: 20 },
  stepDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  stepLine: { width: 2, flex: 1, marginTop: 2, marginBottom: -2, minHeight: 20 },
  stepLabel: { fontSize: 14, paddingTop: 1, flex: 1 },

  // Events
  eventCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  eventRow: { flexDirection: "row", gap: 12, paddingVertical: 12 },
  eventDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  eventStatus: { fontSize: 13 },
  eventDesc: { fontSize: 12, marginTop: 2 },
  eventLoc: { fontSize: 11, marginTop: 2 },
  eventTime: { fontSize: 11, marginTop: 4 },
});
