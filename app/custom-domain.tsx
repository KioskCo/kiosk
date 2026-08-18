import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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
import { api } from "@/lib/api";
import { shopUrl, shopBaseHostname } from "@/lib/shopConfig";

export default function CustomDomainScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useApp();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [domain, setDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const username = profile?.username ?? "";
  const kioskDomain = shopBaseHostname();
  const cname = `@${username}.${kioskDomain}`;

  const saveDomain = async () => {
    const d = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!d || !d.includes(".")) {
      Alert.alert("Invalid domain", "Enter a valid domain like shop.mybrand.com");
      return;
    }
    setSaving(true);
    try {
      await api.patch("/auth/profile", { customDomain: d });
      setSaved(true);
      Alert.alert(
        "Domain saved",
        `Add the DNS record below to your domain provider, then it can take up to 48 hours to activate.`,
      );
    } catch {
      Alert.alert("Error", "Could not save domain. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const copy = (text: string) => {
    Clipboard.setStringAsync(text).catch(() => null);
    Alert.alert("Copied", `"${text}" copied to clipboard`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topPad + 10, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Custom Domain</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        {/* Current domain */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>YOUR CURRENT STORE URL</Text>
          <View style={styles.urlRow}>
            <Text style={[styles.urlText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
              {shopUrl(username)}
            </Text>
            <TouchableOpacity onPress={() => copy(shopUrl(username))}>
              <Feather name="copy" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Explainer */}
        <View style={[styles.infoBox, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
          <Feather name="globe" size={18} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
            Connect your own domain so customers visit{" "}
            <Text style={{ fontFamily: "Inter_600SemiBold" }}>shop.yourbrand.com</Text> instead of the Kiosk URL.{"\n\n"}
            You'll need to purchase a domain from a registrar like{" "}
            <Text style={{ fontFamily: "Inter_600SemiBold" }}>Namecheap, GoDaddy, or Whogohost</Text> (Nigerian registrar), then follow the steps below.
          </Text>
        </View>

        {/* Step 1 */}
        <View style={[styles.stepCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
            <Text style={styles.stepNumText}>1</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.stepTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Enter your domain</Text>
            <Text style={[styles.stepSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>The domain or subdomain you want to use</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted, fontFamily: "Inter_400Regular", marginTop: 12 }]}
              value={domain}
              onChangeText={setDomain}
              placeholder="e.g. shop.mybrand.com"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="url"
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: 12, marginTop: 12 }]}
              onPress={saveDomain}
              disabled={saving}
            >
              <Text style={{ color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                {saving ? "Saving…" : saved ? "Saved ✓" : "Save Domain"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Step 2 — DNS record */}
        <View style={[styles.stepCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
            <Text style={styles.stepNumText}>2</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.stepTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Add CNAME in your DNS settings</Text>
            <Text style={[styles.stepSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Go to your domain registrar's DNS settings and add this record:
            </Text>
            <View style={[styles.dnsTable, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              {[
                { field: "Type", value: "CNAME" },
                { field: "Name / Host", value: domain ? domain.split(".")[0]! : "shop" },
                { field: "Value / Points to", value: kioskDomain },
                { field: "TTL", value: "Auto (3600)" },
              ].map(({ field, value }) => (
                <View key={field} style={[styles.dnsRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.dnsField, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{field}</Text>
                  <View style={styles.dnsValRow}>
                    <Text style={[styles.dnsVal, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{value}</Text>
                    <TouchableOpacity onPress={() => copy(value)}>
                      <Feather name="copy" size={12} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Step 3 */}
        <View style={[styles.stepCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
            <Text style={styles.stepNumText}>3</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.stepTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Wait for DNS to propagate</Text>
            <Text style={[styles.stepSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              DNS changes take between 30 minutes and 48 hours. Once active, your store will be accessible at your custom domain. Contact support if you need help.
            </Text>
          </View>
        </View>

        {/* Whogohost tip */}
        <View style={[styles.infoBox, { backgroundColor: "#FFF7ED", borderColor: "#FDE68A" }]}>
          <Feather name="info" size={16} color="#D97706" />
          <Text style={[styles.infoText, { color: "#92400E", fontFamily: "Inter_400Regular" }]}>
            <Text style={{ fontFamily: "Inter_600SemiBold" }}>Nigerian tip:</Text> Buy domains from{" "}
            <Text style={{ fontFamily: "Inter_600SemiBold" }}>Whogohost.com</Text> — they're ₦3,000–5,000/year, support local payment, and have great customer service.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 17, letterSpacing: -0.3 },
  content: { padding: 16, gap: 14 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 8 },
  cardLabel: { fontSize: 10, letterSpacing: 0.8 },
  urlRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  urlText: { fontSize: 14, flex: 1 },
  infoBox: { flexDirection: "row", borderWidth: 1, borderRadius: 14, padding: 16, gap: 10 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 20 },
  stepCard: { borderWidth: 1, borderRadius: 14, padding: 16, flexDirection: "row", gap: 14 },
  stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepNumText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_700Bold" },
  stepTitle: { fontSize: 14, marginBottom: 3 },
  stepSub: { fontSize: 12, lineHeight: 18 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  saveBtn: { paddingVertical: 12, alignItems: "center" },
  dnsTable: { marginTop: 12, borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  dnsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1 },
  dnsField: { fontSize: 12, flex: 1 },
  dnsValRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dnsVal: { fontSize: 12 },
});
