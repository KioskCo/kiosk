import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";

const FEATURES = [
  {
    icon: "storefront" as const,
    title: "Your Online Shop",
    desc: "Share your store link on WhatsApp, Instagram, or anywhere — customers browse and order in seconds",
  },
  {
    icon: "shield-check" as const,
    title: "Get Paid Safely",
    desc: "Money is held securely until the buyer confirms delivery — no more 'pay first and disappear' scams",
  },
  {
    icon: "truck-delivery" as const,
    title: "Send with a Rider",
    desc: "Book a courier directly from the app — track your package in real time until it arrives",
  },
];

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // "Get Started" is for brand-new users only — returning users go straight to Login
  useEffect(() => {
    AsyncStorage.getItem("kiosk_onboarding_done").then((v) => {
      if (v) router.replace("/(auth)/login" as any);
    });
  }, [router]);

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24),
        },
      ]}
    >
      {Platform.OS !== "web" && <StatusBar barStyle="dark-content" />}

      <View style={styles.topSection}>
        <Image
          source={require("../../assets/images/logo-badge.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text
          style={[
            styles.tagline,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          Sell, deliver & get paid — all in one app.
        </Text>
      </View>

      <View style={styles.featuresSection}>
        {FEATURES.map((f) => (
          <View
            key={f.title}
            style={[
              styles.featureRow,
              { backgroundColor: colors.card, borderRadius: colors.radius },
            ]}
          >
            <View
              style={[styles.featureIcon, { backgroundColor: colors.secondary }]}
            >
              <MaterialCommunityIcons
                name={f.icon}
                size={22}
                color={colors.primary}
              />
            </View>
            <View style={styles.featureText}>
              <Text
                style={[
                  styles.featureTitle,
                  { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
                ]}
              >
                {f.title}
              </Text>
              <Text
                style={[
                  styles.featureDesc,
                  { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                ]}
              >
                {f.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.bottomSection}>
        <Button
          label="Get Started"
          onPress={() => router.push("/(auth)/login")}
          size="lg"
          fullWidth
        />
        <TouchableOpacity
          onPress={() => router.push("/(auth)/signin" as any)}
          style={styles.signinLink}
        >
          <Text
            style={[
              styles.signinText,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            Already have an account?{" "}
            <Text
              style={[
                styles.signinBold,
                { color: colors.primary, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              Sign in
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  topSection: {
    alignItems: "center",
    paddingTop: 24,
    gap: 8,
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 17,
    marginTop: 4,
  },
  featuresSection: {
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
    gap: 3,
  },
  featureTitle: {
    fontSize: 15,
  },
  featureDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  bottomSection: {
    gap: 16,
    paddingTop: 8,
  },
  signinLink: {
    alignItems: "center",
    padding: 4,
  },
  signinText: {
    fontSize: 14,
  },
  signinBold: {
    fontSize: 14,
  },
});
