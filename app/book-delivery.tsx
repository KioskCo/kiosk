import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { hapticImpact, hapticNotification } from "@/hooks/useHapticsStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { logisticsApi, ordersApi } from "@/lib/api";

const NIGERIAN_STATES = [
  "Lagos", "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa",
  "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Nasarawa", "Niger", "Ogun",
  "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara", "FCT - Abuja",
];

type Rate = { provider: "terminal_africa" | "sendbox" | "gig_logistics"; carrierId: string; carrierName: string; serviceCode: string; serviceName: string; estimatedDays: number; fee: number; currency: string };

type OrderOption = { id: string; orderNumber?: string | null; buyerName?: string | null; buyerAddress?: string | null; buyerCity?: string | null; buyerState?: string | null; buyerPhone?: string | null };

export default function BookDeliveryScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const { profile } = useApp();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  // Pickup (merchant) — prefill from profile
  const [pickupName, setPickupName] = useState("");
  const [pickupEmail, setPickupEmail] = useState("");
  const [pickupPhone, setPickupPhone] = useState("");
  const [pickupLine1, setPickupLine1] = useState("");
  const [pickupCity, setPickupCity] = useState("Lagos");
  const [pickupState, setPickupState] = useState("Lagos");
  const [pickupCityOpen, setPickupCityOpen] = useState(false);
  const [pickupStateOpen, setPickupStateOpen] = useState(false);

  // Delivery (buyer)
  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryEmail, setDeliveryEmail] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryLine1, setDeliveryLine1] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryState, setDeliveryState] = useState("Lagos");
  const [deliveryCityOpen, setDeliveryCityOpen] = useState(false);
  const [deliveryStateOpen, setDeliveryStateOpen] = useState(false);

  const [weightKg, setWeightKg] = useState("1");
  const [orderOptions, setOrderOptions] = useState<OrderOption[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState(orderId ?? "");
  const [orderOpen, setOrderOpen] = useState(false);

  const [loadingRates, setLoadingRates] = useState(false);
  const [rates, setRates] = useState<Rate[]>([]);
  const [selectedRate, setSelectedRate] = useState<Rate | null>(null);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState<{ trackingId: string; trackingUrl?: string | null; fee: number } | null>(null);

  useEffect(() => {
    setPickupName(profile?.name ?? "");
    setPickupEmail(profile?.email ?? "");
    setPickupPhone(profile?.phone ?? "");
    setPickupLine1(profile?.businessAddress ?? "");
  }, [profile]);

  useEffect(() => {
    ordersApi.list().then((res) => {
      const data = (res as any).data ?? (res as any).orders ?? [];
      if (Array.isArray(data)) setOrderOptions(data as OrderOption[]);
    }).catch(() => {});
  }, []);

  // Prefill delivery from the selected order
  useEffect(() => {
    const o = orderOptions.find((x) => x.id === selectedOrderId);
    if (o) {
      setDeliveryName(o.buyerName ?? "");
      setDeliveryPhone(o.buyerPhone ?? "");
      setDeliveryLine1(o.buyerAddress ?? "");
      setDeliveryCity(o.buyerCity ?? "");
      setDeliveryState(o.buyerState ?? "Lagos");
    }
  }, [selectedOrderId, orderOptions]);

  const validate = () => {
    if (!selectedOrderId) { setError("Select the order you're shipping."); return false; }
    if (!pickupName.trim() || !pickupPhone.trim() || !pickupLine1.trim() || !pickupCity.trim() || !pickupState.trim()) {
      setError("Complete the pickup details (name, phone, address, city, state)."); return false;
    }
    if (!deliveryName.trim() || !deliveryPhone.trim() || !deliveryLine1.trim() || !deliveryCity.trim() || !deliveryState.trim()) {
      setError("Complete the delivery details (recipient, phone, address, city, state)."); return false;
    }
    const w = parseFloat(weightKg);
    if (isNaN(w) || w <= 0) { setError("Enter a valid package weight."); return false; }
    setError(null);
    return true;
  };

  const handleGetRates = async () => {
    if (!validate()) return;
    setLoadingRates(true);
    setRates([]);
    setSelectedRate(null);
    try {
      const res = await logisticsApi.getRates({
        pickupFirstName: pickupName.split(" ")[0] ?? pickupName,
        pickupLastName: pickupName.split(" ").slice(1).join(" ") || "N/A",
        pickupEmail: pickupEmail || "no-email@kiosk.app",
        pickupPhone,
        pickupLine1,
        pickupCity,
        pickupState,
        deliveryFirstName: deliveryName.split(" ")[0] ?? deliveryName,
        deliveryLastName: deliveryName.split(" ").slice(1).join(" ") || "N/A",
        deliveryEmail: deliveryEmail || "no-email@kiosk.app",
        deliveryPhone,
        deliveryLine1,
        deliveryCity,
        deliveryState,
        weightKg: parseFloat(weightKg),
      });
      const data = (res as any).data ?? res;
      const ta = ((data?.terminal_africa ?? []) as any[]).map((r: any) => ({ ...r, provider: "terminal_africa" }));
      const sb = ((data?.sendbox ?? []) as any[]).map((r: any) => ({ ...r, provider: "sendbox" }));
      const gig = ((data?.gig_logistics ?? []) as any[]).map((r: any) => ({
        provider: "gig_logistics",
        carrierId: "gig",
        carrierName: "GIG Logistics",
        serviceCode: r.serviceType ?? "Regular",
        serviceName: r.serviceName,
        estimatedDays: r.estimatedDays,
        fee: r.fee,
        currency: r.currency ?? "NGN",
      }));
      const all = [...ta, ...sb, ...gig] as Rate[];
      setRates(all);
      if (all.length === 0) setError("No carriers available for this route. Try a different state or weight.");
      else { hapticNotification(); setError(null); }
    } catch {
      setError("Could not fetch rates. Check your connection and try again.");
    } finally {
      setLoadingRates(false);
    }
  };

  const handleBook = async () => {
    if (!selectedRate || !selectedOrderId) return;
    setBooking(true);
    setError(null);
    try {
      const provider = selectedRate.provider;
      const res = await logisticsApi.book({
        orderId: selectedOrderId,
        provider,
        carrierId: selectedRate.carrierId,
        serviceCode: selectedRate.serviceCode,
        estimatedFee: selectedRate.fee,
        parcels: [{ weightKg: parseFloat(weightKg), description: `Order ${selectedOrderId}` }],
        pickupAddress: pickupLine1,
        pickupCity,
        pickupState,
        deliveryAddress: deliveryLine1,
        deliveryCity,
        deliveryState,
        recipientName: deliveryName,
        recipientPhone: deliveryPhone,
        recipientEmail: deliveryEmail || undefined,
        merchantEmail: pickupEmail || undefined,
        merchantPhone: pickupPhone,
        merchantName: pickupName,
      });
      const data = (res as any).data ?? res;
      hapticNotification();
      setBooked({ trackingId: data.trackingId, trackingUrl: data.trackingUrl, fee: data.fee ?? selectedRate.fee });
    } catch (e: any) {
      setError(e?.message ?? "Booking failed. Check your wallet balance and try again.");
    } finally {
      setBooking(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Book Delivery</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {booked ? (
          <View style={[styles.successCard, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0", borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="check-circle" size={40} color="#10B981" />
            <Text style={[styles.successTitle, { color: "#065F46", fontFamily: "Inter_700Bold" }]}>Shipment booked!</Text>
            <Text style={[styles.successText, { color: "#047857", fontFamily: "Inter_400Regular" }]}>
              Tracking ID: {booked.trackingId}
            </Text>
            <Text style={[styles.successText, { color: "#047857", fontFamily: "Inter_400Regular" }]}>
              Fee: ₦{booked.fee.toLocaleString("en-NG")} · 1–3 day delivery.
            </Text>
            {booked.trackingUrl && (
              <Text style={[styles.successText, { color: "#0369A1", fontFamily: "Inter_500Medium" }]}>
                {booked.trackingUrl}
              </Text>
            )}
            <TouchableOpacity
              style={[styles.successBtn, { backgroundColor: colors.primary, borderRadius: 12 }]}
              onPress={() => router.push(`/tracking/${selectedOrderId}` as any)}
              activeOpacity={0.85}
            >
              <Feather name="map-pin" size={16} color="#fff" />
              <Text style={[styles.successBtnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>Track Shipment</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={[styles.infoCard, { backgroundColor: "#EFF6FF", borderRadius: colors.radius }]}>
              <MaterialCommunityIcons name="truck-fast" size={20} color="#1D4ED8" />
              <Text style={[styles.infoText, { color: "#1E3A5F", fontFamily: "Inter_400Regular" }]}>
                Inter-state delivery via Terminal Africa (GIG, DHL, FedEx etc.). Rates are compared across carriers for your route. The fee is deducted from your wallet.
              </Text>
            </View>

            {/* Order selector */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Order</Text>
              <TouchableOpacity
                style={[styles.select, { borderColor: colors.border, borderRadius: colors.radius }]}
                onPress={() => setOrderOpen(!orderOpen)}
                activeOpacity={0.7}
              >
                <Text style={[styles.selectText, { color: selectedOrderId ? colors.foreground : colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {orderOptions.find((o) => o.id === selectedOrderId)?.orderNumber ?? (selectedOrderId ? "Order selected" : "Select an order to ship")}
                </Text>
                <Feather name={orderOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
              {orderOpen && (
                <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                  {orderOptions.length === 0 && <Text style={[styles.dropdownEmpty, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>No orders yet</Text>}
                  {orderOptions.slice(0, 15).map((o) => (
                    <TouchableOpacity
                      key={o.id}
                      style={[styles.dropdownItem, { backgroundColor: o.id === selectedOrderId ? colors.secondary : "transparent" }]}
                      onPress={() => { setSelectedOrderId(o.id); setOrderOpen(false); }}
                    >
                      <Text style={[styles.dropdownItemText, { color: o.id === selectedOrderId ? colors.primary : colors.foreground, fontFamily: o.id === selectedOrderId ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                        {o.orderNumber ?? o.id.slice(0, 8)} — {o.buyerName ?? "Buyer"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Pickup */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Pickup (you)</Text>
              <Field label="Full name"><TextInput value={pickupName} onChangeText={setPickupName} style={inputStyle(colors)} /></Field>
              <Field label="Email"><TextInput value={pickupEmail} onChangeText={setPickupEmail} keyboardType="email-address" style={inputStyle(colors)} /></Field>
              <Field label="Phone"><TextInput value={pickupPhone} onChangeText={setPickupPhone} keyboardType="phone-pad" style={inputStyle(colors)} /></Field>
              <Field label="Street address"><TextInput value={pickupLine1} onChangeText={setPickupLine1} style={inputStyle(colors)} /></Field>
              <View style={styles.cityStateRow}>
                <View style={{ flex: 1 }}>
                  <Field label="City">
                    <TouchableOpacity style={[styles.select, { borderColor: colors.border, borderRadius: colors.radius }]} onPress={() => { setPickupCityOpen(!pickupCityOpen); setPickupStateOpen(false); }} activeOpacity={0.7}>
                      <Text style={[styles.selectText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{pickupCity}</Text>
                      <Feather name={pickupCityOpen ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="State">
                    <TouchableOpacity style={[styles.select, { borderColor: colors.border, borderRadius: colors.radius }]} onPress={() => { setPickupStateOpen(!pickupStateOpen); setPickupCityOpen(false); }} activeOpacity={0.7}>
                      <Text style={[styles.selectText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{pickupState}</Text>
                      <Feather name={pickupStateOpen ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </Field>
                </View>
              </View>
              {pickupCityOpen && <CityDropdown value={pickupCity} onSelect={(v) => { setPickupCity(v); setPickupCityOpen(false); }} />}
              {pickupStateOpen && <StateDropdown value={pickupState} onSelect={(v) => { setPickupState(v); setPickupStateOpen(false); }} />}
            </View>

            {/* Delivery */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Delivery (recipient)</Text>
              <Field label="Recipient name"><TextInput value={deliveryName} onChangeText={setDeliveryName} style={inputStyle(colors)} /></Field>
              <Field label="Recipient email (optional)"><TextInput value={deliveryEmail} onChangeText={setDeliveryEmail} keyboardType="email-address" style={inputStyle(colors)} /></Field>
              <Field label="Recipient phone"><TextInput value={deliveryPhone} onChangeText={setDeliveryPhone} keyboardType="phone-pad" style={inputStyle(colors)} /></Field>
              <Field label="Street address"><TextInput value={deliveryLine1} onChangeText={setDeliveryLine1} style={inputStyle(colors)} /></Field>
              <View style={styles.cityStateRow}>
                <View style={{ flex: 1 }}>
                  <Field label="City">
                    <TouchableOpacity style={[styles.select, { borderColor: colors.border, borderRadius: colors.radius }]} onPress={() => { setDeliveryCityOpen(!deliveryCityOpen); setDeliveryStateOpen(false); }} activeOpacity={0.7}>
                      <Text style={[styles.selectText, { color: deliveryCity ? colors.foreground : colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{deliveryCity || "Select city"}</Text>
                      <Feather name={deliveryCityOpen ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="State">
                    <TouchableOpacity style={[styles.select, { borderColor: colors.border, borderRadius: colors.radius }]} onPress={() => { setDeliveryStateOpen(!deliveryStateOpen); setDeliveryCityOpen(false); }} activeOpacity={0.7}>
                      <Text style={[styles.selectText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{deliveryState}</Text>
                      <Feather name={deliveryStateOpen ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </Field>
                </View>
              </View>
              {deliveryCityOpen && <CityDropdown value={deliveryCity} onSelect={(v) => { setDeliveryCity(v); setDeliveryCityOpen(false); }} />}
              {deliveryStateOpen && <StateDropdown value={deliveryState} onSelect={(v) => { setDeliveryState(v); setDeliveryStateOpen(false); }} />}
            </View>

            {/* Weight */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Package</Text>
              <Field label="Weight (kg)">
                <TextInput value={weightKg} onChangeText={setWeightKg} keyboardType="number-pad" style={inputStyle(colors)} />
              </Field>
            </View>

            {error && (
              <View style={[styles.errorBanner, { backgroundColor: "#FEF2F2", borderRadius: colors.radius }]}>
                <Feather name="alert-circle" size={16} color="#EF4444" />
                <Text style={[styles.errorText, { color: "#991B1B", fontFamily: "Inter_400Regular" }]}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: loadingRates ? colors.muted : colors.primary, borderRadius: colors.radius }]}
              onPress={handleGetRates}
              disabled={loadingRates}
              activeOpacity={0.85}
            >
              <Feather name="truck" size={18} color="#fff" />
              <Text style={[styles.primaryBtnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
                {loadingRates ? "Comparing carriers..." : "Get Delivery Rates"}
              </Text>
            </TouchableOpacity>

            {rates.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={[styles.listHeader, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                  {rates.length} carrier{rates.length === 1 ? "" : "s"} found
                </Text>
                {rates.map((r) => (
                  <TouchableOpacity
                    key={`${r.provider}-${r.carrierId}-${r.serviceCode}`}
                    style={[styles.rateCard, { backgroundColor: colors.card, borderColor: selectedRate?.carrierId === r.carrierId && selectedRate?.serviceCode === r.serviceCode && selectedRate?.provider === r.provider ? colors.primary : colors.border, borderRadius: colors.radius, borderWidth: selectedRate?.carrierId === r.carrierId && selectedRate?.serviceCode === r.serviceCode && selectedRate?.provider === r.provider ? 2 : 1 }]}
                    onPress={() => { setSelectedRate(r); hapticImpact(); }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.rateIcon, { backgroundColor: colors.secondary }]}>
                      <MaterialCommunityIcons name="truck-delivery" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={[styles.rateName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{r.carrierName}</Text>
                      <Text style={[styles.rateMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{r.serviceName} · {r.estimatedDays} day{r.estimatedDays === 1 ? "" : "s"}</Text>
                    </View>
                    <Text style={[styles.rateFee, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>₦{r.fee.toLocaleString("en-NG")}</Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: booking || !selectedRate ? colors.muted : "#0F766E", borderRadius: colors.radius }]}
                  onPress={handleBook}
                  disabled={booking || !selectedRate}
                  activeOpacity={0.85}
                >
                  <Feather name="check-circle" size={18} color="#fff" />
                  <Text style={[styles.primaryBtnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
                    {booking ? "Booking shipment..." : selectedRate ? `Confirm & Book — ₦${selectedRate.fee.toLocaleString("en-NG")}` : "Select a carrier to book"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  function inputStyle(colors: ReturnType<typeof useColors>) {
    return [styles.input, { borderColor: colors.border, borderRadius: colors.radius, color: colors.foreground, fontFamily: "Inter_400Regular" }, Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null] as any;
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>{label}</Text>
      {children}
    </View>
  );
}

function CityDropdown({ value, onSelect }: { value: string; onSelect: (v: string) => void }) {
  const colors = useColors();
  const cities = ["Lagos", "Ikeja", "Victoria Island", "Lekki", "Ajah", "Surulere", "Yaba", "Abuja", "Port Harcourt", "Ibadan", "Kano", "Enugu", "Aba", "Onitsha", "Benin City"];
  return (
    <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      {cities.map((c) => (
        <TouchableOpacity key={c} style={[styles.dropdownItem, { backgroundColor: c === value ? colors.secondary : "transparent" }]} onPress={() => onSelect(c)}>
          <Text style={[styles.dropdownItemText, { color: c === value ? colors.primary : colors.foreground, fontFamily: c === value ? "Inter_600SemiBold" : "Inter_400Regular" }]}>{c}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function StateDropdown({ value, onSelect }: { value: string; onSelect: (v: string) => void }) {
  const colors = useColors();
  return (
    <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      {NIGERIAN_STATES.map((s) => (
        <TouchableOpacity key={s} style={[styles.dropdownItem, { backgroundColor: s === value ? colors.secondary : "transparent" }]} onPress={() => onSelect(s)}>
          <Text style={[styles.dropdownItemText, { color: s === value ? colors.primary : colors.foreground, fontFamily: s === value ? "Inter_600SemiBold" : "Inter_400Regular" }]}>{s}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, letterSpacing: -0.3 },
  content: { padding: 16, gap: 14 },
  infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 },
  infoText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
  section: { borderWidth: 1, padding: 14, gap: 12 },
  sectionTitle: { fontSize: 14, marginBottom: 2 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  select: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13 },
  selectText: { fontSize: 14 },
  dropdown: { borderWidth: 1, maxHeight: 260, marginTop: -6 },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12 },
  dropdownItemText: { fontSize: 14 },
  dropdownEmpty: { padding: 14, fontSize: 13 },
  cityStateRow: { flexDirection: "row", gap: 10 },
  errorBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12 },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18 },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  primaryBtnText: { fontSize: 15 },
  listHeader: { fontSize: 12, letterSpacing: 0.5, marginTop: 4 },
  rateCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  rateIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  rateName: { fontSize: 14 },
  rateMeta: { fontSize: 11 },
  rateFee: { fontSize: 16 },
  successCard: { borderWidth: 1, padding: 24, alignItems: "center", gap: 8, marginTop: 8 },
  successTitle: { fontSize: 20, marginTop: 4 },
  successText: { fontSize: 13, textAlign: "center" },
  successBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, marginTop: 12 },
  successBtnText: { fontSize: 14 },
});
