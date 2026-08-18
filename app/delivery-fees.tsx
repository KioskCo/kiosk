import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
import { useHapticsStore } from "@/hooks/useHapticsStore";
import { hapticNotification } from "@/hooks/useHapticsStore";

const DEFAULT_LAGOS = 1500;
const DEFAULT_OTHER = 3500;
const DEFAULT_FREE_THRESHOLD = 15000;

export default function DeliveryFeesScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const { profile, updateProfile } = useApp();
  const { hapticsEnabled } = useHapticsStore();

  const [lagosFee, setLagosFee] = useState("");
  const [otherFee, setOtherFee] = useState("");
  const [freeThreshold, setFreeThreshold] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLagosFee(profile?.deliveryFeeLagos != null ? String(profile.deliveryFeeLagos) : String(DEFAULT_LAGOS));
    setOtherFee(profile?.deliveryFeeOther != null ? String(profile.deliveryFeeOther) : String(DEFAULT_OTHER));
    setFreeThreshold(
      profile?.freeDeliveryThreshold != null
        ? String(profile.freeDeliveryThreshold)
        : String(DEFAULT_FREE_THRESHOLD),
    );
  }, [profile]);

  const handleSave = async () => {
    const lagos = parseFloat(lagosFee);
    const other = parseFloat(otherFee);
    const threshold = parseFloat(freeThreshold);
    if (isNaN(lagos) || lagos < 0) { Alert.alert("Invalid fee", "Enter a valid Lagos delivery fee."); return; }
    if (isNaN(other) || other < 0) { Alert.alert("Invalid fee", "Enter a valid inter-state delivery fee."); return; }
    if (isNaN(threshold) || threshold < 0) { Alert.alert("Invalid threshold", "Enter a valid free-delivery threshold."); return; }

    setSaving(true);
    try {
      if (hapticsEnabled) hapticNotification();
      await updateProfile({
        deliveryFeeLagos: lagos,
        deliveryFeeOther: other,
        freeDeliveryThreshold: threshold,
      });
      Alert.alert("Saved", "Your delivery fees will be shown at checkout.");
    } catch {
      Alert.alert("Couldn't save", "Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPad + 12, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.header}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.muted }]} onPress={() => router.back()} activeOpacity={0.7}>
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Delivery & Fees</Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}>
          <Feather name="info" size={16} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            These are the delivery charges your customers see at checkout. Lagos (local) delivery is
            charged for addresses in Lagos; every other Nigerian state uses the inter-state rate.
            Orders equal to or above the free-delivery threshold ship free.
          </Text>
        </View>

        <Field label="Lagos delivery fee (₦)">
          <TextInput
            value={lagosFee}
            onChangeText={setLagosFee}
            placeholder={`e.g. ${DEFAULT_LAGOS}`}
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            style={[styles.input, { borderColor: colors.border, borderRadius: colors.radius, color: colors.foreground, fontFamily: "Inter_400Regular" }, Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null]}
          />
        </Field>

        <Field label="Inter-state delivery fee (₦)">
          <TextInput
            value={otherFee}
            onChangeText={setOtherFee}
            placeholder={`e.g. ${DEFAULT_OTHER}`}
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            style={[styles.input, { borderColor: colors.border, borderRadius: colors.radius, color: colors.foreground, fontFamily: "Inter_400Regular" }, Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null]}
          />
        </Field>

        <Field label="Free delivery threshold (₦)">
          <TextInput
            value={freeThreshold}
            onChangeText={setFreeThreshold}
            placeholder={`e.g. ${DEFAULT_FREE_THRESHOLD}`}
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            style={[styles.input, { borderColor: colors.border, borderRadius: colors.radius, color: colors.foreground, fontFamily: "Inter_400Regular" }, Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null]}
          />
        </Field>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Feather name="save" size={18} color="#FFFFFF" />
          <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>{saving ? "Saving..." : "Save Delivery Fees"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22 },
  infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14 },
  infoText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 14 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, marginTop: 4 },
  saveBtnText: { fontSize: 16, color: "#FFFFFF" },
});
