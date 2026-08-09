import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Keyboard,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useApp } from "@/context/AppContext";
import { authApi } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

const SAVED_ACCOUNTS_KEY = "kiosk_saved_accounts";

export default function SignInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedAccounts, setSavedAccounts] = useState<{ email: string; name: string }[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(SAVED_ACCOUNTS_KEY).then((v) => {
      if (v) { try { setSavedAccounts(JSON.parse(v)); } catch {} }
    });
  }, []);

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!email.trim() || !password) {
      setError("Please enter your email and password");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await authApi.login(email.trim().toLowerCase(), password);
      const user = (res as any).user;
      const profile = {
        name: user?.businessName ?? user?.name ?? "My Shop",
        username: user?.businessName?.toLowerCase().replace(/\s+/g, "") ?? "myshop",
        industry: "Retail" as const,
        email: user?.email ?? email.trim().toLowerCase(),
      };
      // Save this account for future suggestion
      const existing = savedAccounts.filter((a) => a.email !== profile.email);
      const updated = [{ email: profile.email, name: profile.name }, ...existing].slice(0, 3);
      await AsyncStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updated));
      await AsyncStorage.setItem("kiosk_onboarding_done", "1");
      await login(profile);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message ?? "Login failed. Check your email and password.");
    } finally {
      setLoading(false);
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

        <View style={styles.body}>
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name="user" size={28} color={colors.primary} />
          </View>

          <View style={styles.heading}>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Welcome back
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Sign in to your merchant account
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
          />
          {savedAccounts.length > 0 && !email && (
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11, color: colors.mutedForeground }}>Recent accounts</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {savedAccounts.map((acc) => (
                  <TouchableOpacity
                    key={acc.email}
                    onPress={() => setEmail(acc.email)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}
                  >
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>{acc.name[0]?.toUpperCase()}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.foreground }}>{acc.email}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <Input
            label="Password"
            value={password}
            onChangeText={(t) => { setPassword(t); setError(""); }}
            placeholder="Your password"
            secureTextEntry={!showPassword}
            leftIcon={<Feather name="lock" size={17} color={colors.mutedForeground} />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={17} color={colors.mutedForeground} />
              </TouchableOpacity>
            }
          />

          <TouchableOpacity
            onPress={() => router.push("/(auth)/forgot-password" as any)}
            style={styles.forgotRow}
          >
            <Text style={[styles.forgotText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
              Forgot password?
            </Text>
          </TouchableOpacity>

          {error ? (
            <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
              {error}
            </Text>
          ) : null}

          <Button
            label="Sign In"
            onPress={handleLogin}
            loading={loading}
            disabled={!email.trim() || !password}
            fullWidth
            size="lg"
          />
        </View>

        <TouchableOpacity onPress={() => router.push("/(auth)/login")} style={styles.switchRow}>
          <Text style={[styles.switchText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            New merchant?{" "}
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>Create account</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, gap: 0 },
  backBtn: { padding: 4, alignSelf: "flex-start", marginBottom: 8 },
  body: { gap: 20, paddingVertical: 24 },
  iconWrap: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  heading: { gap: 6 },
  title: { fontSize: 26, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  forgotRow: { alignSelf: "flex-end", marginTop: -8 },
  forgotText: { fontSize: 13 },
  errorText: { fontSize: 13, textAlign: "center" },
  switchRow: { alignItems: "center", paddingBottom: 8, paddingTop: 16 },
  switchText: { fontSize: 14 },
});
