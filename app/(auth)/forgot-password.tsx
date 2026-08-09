import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
import { authApi } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    Keyboard.dismiss();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await authApi.forgotPassword(trimmed);
      // Always navigate — server never reveals if email exists
      router.push({ pathname: "/(auth)/reset-password" as any, params: { email: trimmed } });
    } catch (e: any) {
      setError(e.message ?? "Something went wrong. Please try again.");
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
            <Feather name="key" size={28} color={colors.primary} />
          </View>

          <View style={styles.heading}>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Forgot password?
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Enter your email and we'll send a 6-digit code to reset your password
            </Text>
          </View>

          <Input
            label="Email Address"
            value={email}
            onChangeText={(t) => { setEmail(t); setError(""); }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Feather name="mail" size={17} color={colors.mutedForeground} />}
            error={error}
          />

          <Button
            label="Send Reset Code"
            onPress={handleSubmit}
            loading={loading}
            disabled={!email.trim()}
            fullWidth
            size="lg"
          />

          <TouchableOpacity onPress={() => router.push("/(auth)/signin")} style={styles.backToLogin}>
            <Text style={[styles.backToLoginText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Remember it?{" "}
              <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>Sign in</Text>
            </Text>
          </TouchableOpacity>
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
  backToLogin: { alignItems: "center", paddingVertical: 4 },
  backToLoginText: { fontSize: 14 },
});
