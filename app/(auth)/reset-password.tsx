import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Keyboard,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OTPInput } from "@/components/ui/OTPInput";
import { authApi } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

const RESEND_SECONDS = 60;

export default function ResetPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [countdown, setCountdown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleResend = async () => {
    if (countdown > 0 || !email) return;
    try {
      await authApi.forgotPassword(email);
      setCountdown(RESEND_SECONDS);
      setOtp("");
    } catch {
      // silent — server never reveals if email exists
    }
  };

  const handleReset = async () => {
    Keyboard.dismiss();
    const errs: Record<string, string> = {};
    if (otp.length < 6) errs.otp = "Enter the 6-digit code from your email";
    if (newPassword.length < 8) errs.newPassword = "Password must be at least 8 characters";
    if (newPassword !== confirmPassword) errs.confirmPassword = "Passwords do not match";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setErrors({});
    setLoading(true);
    try {
      await authApi.resetPassword(email ?? "", otp, newPassword);
      router.replace("/(auth)/signin" as any);
    } catch (e: any) {
      setErrors({ submit: e.message ?? "Reset failed. Check the code and try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20),
            paddingBottom: insets.bottom + 40,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={80}
      >
        {Platform.OS !== "web" && <StatusBar barStyle="dark-content" />}

        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.body}>
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name="lock" size={28} color={colors.primary} />
          </View>

          <View style={styles.heading}>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Reset password
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Enter the 6-digit code sent to{"\n"}
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
                {email ?? "your email"}
              </Text>
            </Text>
          </View>

          <OTPInput
            length={6}
            value={otp}
            onChange={(v) => { setOtp(v); setErrors((e) => ({ ...e, otp: "" })); }}
          />
          {errors.otp ? (
            <Text style={[styles.fieldError, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
              {errors.otp}
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

          <Input
            label="New Password"
            value={newPassword}
            onChangeText={(t) => { setNewPassword(t); setErrors((e) => ({ ...e, newPassword: "" })); }}
            placeholder="Min. 8 characters"
            secureTextEntry={!showPassword}
            error={errors.newPassword}
            leftIcon={<Feather name="lock" size={17} color={colors.mutedForeground} />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={17} color={colors.mutedForeground} />
              </TouchableOpacity>
            }
          />

          <Input
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={(t) => { setConfirmPassword(t); setErrors((e) => ({ ...e, confirmPassword: "" })); }}
            placeholder="Re-enter your new password"
            secureTextEntry={!showPassword}
            error={errors.confirmPassword}
            leftIcon={<Feather name="lock" size={17} color={colors.mutedForeground} />}
          />

          {errors.submit ? (
            <Text style={[styles.fieldError, { color: colors.destructive, fontFamily: "Inter_400Regular", textAlign: "center" }]}>
              {errors.submit}
            </Text>
          ) : null}

          <Button
            label="Reset Password"
            onPress={handleReset}
            loading={loading}
            disabled={otp.length < 6 || !newPassword || !confirmPassword}
            fullWidth
            size="lg"
          />
        </View>
      </KeyboardAwareScrollViewCompat>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24 },
  backBtn: { padding: 4, alignSelf: "flex-start", marginBottom: 8 },
  body: { flex: 1, justifyContent: "center", gap: 20, paddingVertical: 24 },
  iconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  heading: { gap: 10 },
  title: { fontSize: 26, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  resendRow: { alignItems: "center", marginTop: -8 },
  resendText: { fontSize: 14 },
  fieldError: { fontSize: 13, marginTop: -12 },
});
