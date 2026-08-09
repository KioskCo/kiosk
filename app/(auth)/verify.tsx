/**
 * Email OTP verification screen — used after signup.
 * Reads `email` from route params and calls /auth/verify-email.
 */
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { OTPInput } from "@/components/ui/OTPInput";
import { authApi } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

const RESEND_SECONDS = 60;

export default function VerifyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerify = async () => {
    if (otp.length < 6) return;
    setLoading(true);
    setError("");
    try {
      await authApi.verifyEmail(email ?? "", otp);
      // Token is saved by authApi.verifyEmail; go to profile setup
      router.replace("/(auth)/profile");
    } catch (e: any) {
      setError(e.message ?? "Invalid or expired code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      await authApi.resendOtp(email ?? "");
      setCountdown(RESEND_SECONDS);
      setOtp("");
      setError("");
    } catch {
      // silent
    }
  };

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20),
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 40),
        },
      ]}
    >
      {Platform.OS !== "web" && <StatusBar barStyle="dark-content" />}

      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Feather name="arrow-left" size={22} color={colors.foreground} />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Feather name="mail" size={32} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Check your email
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          We sent a 6-digit code to{"\n"}
          <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
            {email ?? "your email"}
          </Text>
        </Text>

        <OTPInput length={6} value={otp} onChange={(v) => { setOtp(v); setError(""); }} />

        {error ? (
          <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
            {error}
          </Text>
        ) : null}

        <View style={styles.resendRow}>
          {countdown > 0 ? (
            <Text style={[styles.resendText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Resend code in{" "}
              <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{countdown}s</Text>
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend}>
              <Text style={[styles.resendText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                Resend Code
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Button
          label="Verify & Continue"
          onPress={handleVerify}
          loading={loading}
          disabled={otp.length < 6}
          fullWidth
          size="lg"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, gap: 24 },
  backBtn: { padding: 4, alignSelf: "flex-start" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20, paddingBottom: 40 },
  iconWrap: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  title: { fontSize: 26, letterSpacing: -0.5, textAlign: "center" },
  subtitle: { fontSize: 15, lineHeight: 22, textAlign: "center", maxWidth: 300 },
  errorText: { fontSize: 13, textAlign: "center" },
  resendRow: { alignItems: "center", marginVertical: 4 },
  resendText: { fontSize: 14 },
});
