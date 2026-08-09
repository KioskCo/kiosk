/**
 * Signup screen — new merchant creates an account with email + password.
 * After submitting, a 6-digit OTP is emailed; user is routed to /verify.
 */
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authApi } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

export default function SignupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submitting = React.useRef(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Enter a valid email address";
    if (password.length < 8)
      errs.password = "Password must be at least 8 characters";
    if (password !== confirmPassword)
      errs.confirmPassword = "Passwords do not match";
    return errs;
  };

  const handleSignup = async () => {
    if (submitting.current) return;
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    submitting.current = true;
    setLoading(true);
    try {
      await authApi.signup(email.trim().toLowerCase(), password);
      router.push({ pathname: "/(auth)/verify", params: { email: email.trim().toLowerCase() } });
    } catch (e: any) {
      setErrors({ submit: e.message ?? "Signup failed. Please try again." });
    } finally {
      setLoading(false);
      submitting.current = false;
    }
  };

  return (
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

      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Feather name="user-plus" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Create your account
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Enter your email and a password — we'll send a code to verify your email
        </Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Email Address"
          value={email}
          onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: "" })); }}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          error={errors.email}
          leftIcon={<Feather name="mail" size={17} color={colors.mutedForeground} />}
        />

        <Input
          label="Password"
          value={password}
          onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: "" })); }}
          placeholder="Min. 8 characters"
          secureTextEntry={!showPassword}
          autoComplete="new-password"
          textContentType="newPassword"
          error={errors.password}
          leftIcon={<Feather name="lock" size={17} color={colors.mutedForeground} />}
          rightIcon={
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={17} color={colors.mutedForeground} />
            </TouchableOpacity>
          }
        />

        <Input
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={(t) => { setConfirmPassword(t); setErrors((e) => ({ ...e, confirmPassword: "" })); }}
          placeholder="Re-enter your password"
          secureTextEntry={!showPassword}
          autoComplete="new-password"
          textContentType="newPassword"
          error={errors.confirmPassword}
          leftIcon={<Feather name="lock" size={17} color={colors.mutedForeground} />}
        />

        {errors.submit ? (
          <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
            {errors.submit}
          </Text>
        ) : null}

        <Button
          label="Create Account"
          onPress={handleSignup}
          loading={loading}
          fullWidth
          size="lg"
        />

        <TouchableOpacity onPress={() => router.push("/(auth)/signin")} style={styles.switchRow}>
          <Text style={[styles.switchText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Already have an account?{" "}
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, gap: 32 },
  backBtn: { padding: 4, alignSelf: "flex-start" },
  header: { gap: 10, alignItems: "flex-start" },
  iconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontSize: 26, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  form: { gap: 16 },
  errorText: { fontSize: 13, textAlign: "center", marginTop: -4 },
  switchRow: { alignItems: "center", paddingVertical: 4 },
  switchText: { fontSize: 14 },
});
