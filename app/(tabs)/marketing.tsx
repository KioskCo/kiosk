import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function MarketingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Ads Manager</Text>
      </View>

      <View style={styles.center}>
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: 24, borderColor: colors.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
            <MaterialCommunityIcons name="chart-bar" size={40} color={colors.primary} />
          </View>

          <Text style={[styles.headline, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Reach a broader audience with ads and grow your business
          </Text>

          <Text style={[styles.sub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Run targeted campaigns across Instagram, Facebook, TikTok, and YouTube — and track leads, clicks, and revenue all in one place.
          </Text>

          <View style={[styles.comingSoonBadge, { backgroundColor: colors.primary }]}>
            <Feather name="clock" size={14} color="#FFFFFF" />
            <Text style={[styles.comingSoonText, { fontFamily: "Inter_700Bold" }]}>Coming Soon</Text>
          </View>

          <View style={styles.features}>
            {[
              { icon: "target", label: "Audience targeting by location & interest" },
              { icon: "trending-up", label: "Real-time ROI & lead tracking" },
              { icon: "zap", label: "One-click campaign launch" },
              { icon: "bar-chart-2", label: "Competitor benchmarking" },
            ].map((f) => (
              <View key={f.label} style={styles.featureRow}>
                <View style={[styles.featureIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name={f.icon as any} size={14} color={colors.primary} />
                </View>
                <Text style={[styles.featureLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{f.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 24, letterSpacing: -0.5 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 400, padding: 28, alignItems: "center", gap: 16, borderWidth: 1 },
  iconWrap: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  headline: { fontSize: 20, textAlign: "center", lineHeight: 28, letterSpacing: -0.3 },
  sub: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  comingSoonBadge: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 100 },
  comingSoonText: { fontSize: 15, color: "#FFFFFF" },
  features: { gap: 10, width: "100%", marginTop: 4 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  featureLabel: { fontSize: 13, flex: 1 },
});
