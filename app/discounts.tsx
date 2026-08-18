import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { hapticImpact, hapticNotification } from "@/hooks/useHapticsStore";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { discountsApi, type Discount } from "@/lib/api";

const DURATION_OPTIONS = [
  { label: "No expiry", value: "" },
  { label: "24 hours", value: "24h" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
];

function daysFromNow(opt: string): string | undefined {
  if (!opt) return undefined;
  const now = new Date();
  if (opt === "24h") return new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
  if (opt === "7d") return new Date(now.getTime() + 7 * 86400 * 1000).toISOString();
  if (opt === "30d") return new Date(now.getTime() + 30 * 86400 * 1000).toISOString();
  return undefined;
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "No expiry";
  return new Date(s).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export default function DiscountsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [createVisible, setCreateVisible] = useState(false);

  // Create form state
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiry, setExpiry] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await discountsApi.list();
    if (res.data) setDiscounts((res as any).data as Discount[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!code.trim() || !value.trim()) {
      Alert.alert("Missing fields", "Code and value are required.");
      return;
    }
    const numVal = parseFloat(value);
    if (isNaN(numVal) || numVal <= 0) {
      Alert.alert("Invalid value", "Enter a valid discount value.");
      return;
    }
    if (type === "percent" && numVal > 100) {
      Alert.alert("Invalid value", "Percent discount cannot exceed 100%.");
      return;
    }

    setSaving(true);
    try {
      const res = await discountsApi.create({
        code: code.trim().toUpperCase(),
        type,
        value: numVal,
        minOrder: minOrder ? parseFloat(minOrder) : undefined,
        maxUses: maxUses ? parseInt(maxUses) : undefined,
        expiresAt: daysFromNow(expiry),
      });
      if ((res as any).success) {
        setCreateVisible(false);
        setCode(""); setValue(""); setMinOrder(""); setMaxUses(""); setExpiry("");
        await load();
        hapticNotification();
      } else {
        Alert.alert("Error", (res as any).error ?? "Could not create discount");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await discountsApi.toggle(id, active);
    setDiscounts((prev) => prev.map((d) => d.id === id ? { ...d, active } : d));
  };

  const handleDelete = (id: string, code: string) => {
    Alert.alert("Delete discount?", `Remove "${code}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await discountsApi.remove(id);
          setDiscounts((prev) => prev.filter((d) => d.id !== id));
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Discount Codes</Text>
        <TouchableOpacity
          onPress={() => setCreateVisible(true)}
          style={[styles.newBtn, { backgroundColor: colors.primary, borderRadius: 10 }]}
        >
          <Feather name="plus" size={16} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>Loading…</Text>
        </View>
      ) : discounts.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}>
          <Feather name="tag" size={40} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 12, textAlign: "center" }}>
            No discount codes yet. Create one and share it with your customers.
          </Text>
          <TouchableOpacity
            onPress={() => setCreateVisible(true)}
            style={[styles.emptyBtn, { backgroundColor: colors.primary, borderRadius: 12, marginTop: 20 }]}
          >
            <Text style={{ color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Create first discount</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={discounts}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 40 }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14 }]}>
              <View style={styles.cardTop}>
                <View style={[styles.codePill, { backgroundColor: colors.primary + "15" }]}>
                  <Text style={[styles.codeText, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{item.code}</Text>
                </View>
                <View style={styles.cardActions}>
                  <Switch
                    value={item.active}
                    onValueChange={(v) => handleToggle(item.id, v)}
                    trackColor={{ false: colors.border, true: colors.primary + "60" }}
                    thumbColor={item.active ? colors.primary : colors.mutedForeground}
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                  />
                  <TouchableOpacity onPress={() => handleDelete(item.id, item.code)} style={styles.deleteBtn}>
                    <Feather name="trash-2" size={15} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                  <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>DISCOUNT</Text>
                  <Text style={[styles.metaVal, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                    {item.type === "percent" ? `${item.value}% off` : `₦${parseFloat(item.value).toLocaleString("en-NG")} off`}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>USES</Text>
                  <Text style={[styles.metaVal, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                    {item.usesCount ?? 0}{item.maxUses ? ` / ${item.maxUses}` : ""}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>EXPIRES</Text>
                  <Text style={[styles.metaVal, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                    {fmtDate(item.expiresAt)}
                  </Text>
                </View>
              </View>
              {item.minOrder && parseFloat(item.minOrder) > 0 && (
                <Text style={[styles.minOrder, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  Min. order: ₦{parseFloat(item.minOrder).toLocaleString("en-NG")}
                </Text>
              )}
            </View>
          )}
        />
      )}

      {/* Create modal */}
      <Modal visible={createVisible} animationType="slide" transparent onRequestClose={() => setCreateVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.handle} />
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
                <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>New Discount Code</Text>

                <Label text="CODE" colors={colors} />
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted, fontFamily: "Inter_700Bold", fontSize: 16, letterSpacing: 1 }]}
                  value={code}
                  onChangeText={(t) => setCode(t.toUpperCase())}
                  placeholder="e.g. SAVE10, SUMMER"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="characters"
                />

                <Label text="TYPE" colors={colors} />
                <View style={styles.typeRow}>
                  {(["percent", "fixed"] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setType(t)}
                      style={[styles.typeBtn, { borderColor: type === t ? colors.primary : colors.border, backgroundColor: type === t ? colors.primary + "12" : colors.muted }]}
                    >
                      <Text style={{ color: type === t ? colors.primary : colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                        {t === "percent" ? "% Percent off" : "₦ Fixed amount"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Label text={type === "percent" ? "DISCOUNT %" : "AMOUNT (₦)"} colors={colors} />
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted, fontFamily: "Inter_400Regular" }]}
                  value={value}
                  onChangeText={setValue}
                  keyboardType="numeric"
                  placeholder={type === "percent" ? "e.g. 10" : "e.g. 500"}
                  placeholderTextColor={colors.mutedForeground}
                />

                <Label text="MIN. ORDER (₦, optional)" colors={colors} />
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted, fontFamily: "Inter_400Regular" }]}
                  value={minOrder}
                  onChangeText={setMinOrder}
                  keyboardType="numeric"
                  placeholder="e.g. 5000"
                  placeholderTextColor={colors.mutedForeground}
                />

                <Label text="MAX USES (optional)" colors={colors} />
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted, fontFamily: "Inter_400Regular" }]}
                  value={maxUses}
                  onChangeText={setMaxUses}
                  keyboardType="numeric"
                  placeholder="Leave blank for unlimited"
                  placeholderTextColor={colors.mutedForeground}
                />

                <Label text="EXPIRES IN" colors={colors} />
                <View style={styles.typeRow}>
                  {DURATION_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setExpiry(opt.value)}
                      style={[styles.typeBtn, { borderColor: expiry === opt.value ? colors.primary : colors.border, backgroundColor: expiry === opt.value ? colors.primary + "12" : colors.muted }]}
                    >
                      <Text style={{ color: expiry === opt.value ? colors.primary : colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.createBtn, { backgroundColor: colors.primary, borderRadius: 14, marginTop: 8 }]}
                  onPress={handleCreate}
                  disabled={saving}
                >
                  <Text style={{ color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                    {saving ? "Creating…" : "Create Discount"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCreateVisible(false)} style={{ alignItems: "center", padding: 14 }}>
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Label({ text, colors }: { text: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_500Medium", letterSpacing: 0.8, marginBottom: 6, marginTop: 14 }}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 17, letterSpacing: -0.3 },
  newBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 14 },
  card: { borderWidth: 1, padding: 16, gap: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  codePill: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  codeText: { fontSize: 15, letterSpacing: 1.5 },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  deleteBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  cardMeta: { flexDirection: "row", gap: 0 },
  metaItem: { flex: 1, gap: 2 },
  metaLabel: { fontSize: 9, letterSpacing: 0.8 },
  metaVal: { fontSize: 13 },
  minOrder: { fontSize: 11 },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, padding: 24, paddingBottom: 40, maxHeight: "90%" },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 20 },
  sheetTitle: { fontSize: 18, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  createBtn: { paddingVertical: 16, alignItems: "center" },
});
