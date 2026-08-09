import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function KYCScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, profile } = useApp();
  const [agreedCompliance, setAgreedCompliance] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    await login({
      name: profile?.name ?? "My Business",
      username: profile?.username ?? "mybusiness",
      industry: profile?.industry ?? "Retail",
      email: profile?.email ?? "",
    });
    setLoading(false);
    router.replace("/(tabs)");
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20),
          paddingBottom: insets.bottom + 40,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {Platform.OS !== "web" && <StatusBar barStyle="dark-content" />}

      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Feather name="arrow-left" size={22} color={colors.foreground} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={[styles.step, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
          Step 3 of 3
        </Text>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Confirm Compliance
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Please review and accept our terms to start using Kiosk
        </Text>
      </View>

      <View style={[styles.complianceCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius + 4 }]}>
        <View style={[styles.complianceIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="shield" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.complianceTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Kiosk Merchant Agreement
        </Text>
        <Text style={[styles.complianceBody, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          By proceeding you confirm that you operate a legitimate business in Nigeria and agree to Kiosk's Terms of Service, Privacy Policy, and Escrow Operating Rules. You also confirm compliance with Nigerian consumer protection standards and the CBN's guidelines for digital commerce.
        </Text>

        <View style={[styles.bulletList, { borderTopColor: colors.border }]}>
          {[
            "No fraudulent or counterfeit goods",
            "Accurate product descriptions and pricing",
            "Timely fulfilment of orders via escrow",
            "Compliance with CBN digital commerce rules",
          ].map((point) => (
            <View key={point} style={styles.bullet}>
              <View style={[styles.bulletDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.bulletText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {point}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        onPress={() => setAgreedCompliance(!agreedCompliance)}
        style={[styles.checkRow, { backgroundColor: agreedCompliance ? colors.secondary : "transparent", borderColor: agreedCompliance ? colors.primary : colors.border, borderRadius: colors.radius }]}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: agreedCompliance ? colors.primary : "transparent",
              borderColor: agreedCompliance ? colors.primary : colors.border,
            },
          ]}
        >
          {agreedCompliance && <Feather name="check" size={13} color="#FFFFFF" />}
        </View>
        <Text style={[styles.checkText, { color: colors.foreground, fontFamily: agreedCompliance ? "Inter_500Medium" : "Inter_400Regular" }]}>
          I have read and agree to the Kiosk Merchant Agreement and Terms of Service
        </Text>
      </TouchableOpacity>

      <Button
        label="Complete Setup"
        onPress={handleComplete}
        loading={loading}
        disabled={!agreedCompliance}
        fullWidth
        size="lg"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, gap: 24 },
  backBtn: { padding: 4, alignSelf: "flex-start" },
  header: { gap: 6 },
  step: { fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase" },
  title: { fontSize: 26, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  complianceCard: { borderWidth: 1, padding: 20, gap: 14, alignItems: "center" },
  complianceIcon: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  complianceTitle: { fontSize: 17, textAlign: "center" },
  complianceBody: { fontSize: 13, lineHeight: 20, textAlign: "center" },
  bulletList: { alignSelf: "stretch", borderTopWidth: 1, paddingTop: 14, gap: 10 },
  bullet: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  bulletText: { flex: 1, fontSize: 13, lineHeight: 18 },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderWidth: 1.5 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  checkText: { fontSize: 13, lineHeight: 19, flex: 1 },
});
