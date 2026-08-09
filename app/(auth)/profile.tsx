import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
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
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useApp();
  const [businessName, setBusinessName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!businessName.trim()) errs.businessName = "Business name is required";
    if (!username.trim()) errs.username = "Username is required";
    if (username.includes(" ")) errs.username = "Username cannot contain spaces";
    return errs;
  };

  const handleContinue = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    await login({ name: businessName.trim(), username: username.trim().toLowerCase(), industry: "Retail", email: "" });
    setLoading(false);
    router.replace("/(tabs)");
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
        <Text style={[styles.step, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
          Step 3 of 4
        </Text>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Business Profile
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Set up your merchant identity and WhatsApp storefront
        </Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Business Name"
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="e.g. Mama Chisom Boutique"
          error={errors.businessName}
          leftIcon={<MaterialCommunityIcons name="store" size={18} color={colors.mutedForeground} />}
        />

        <Input
          label="Business Username"
          value={username}
          onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
          placeholder="e.g. mamachisomboutique"
          error={errors.username}
          leftIcon={
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 15 }}>@</Text>
          }
        />
        <Text style={[styles.usernameNote, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Your WhatsApp shortlink: wa.me/kiosk/
          <Text style={{ color: colors.primary }}>{username || "yourusername"}</Text>
        </Text>

        <Button label="Continue" onPress={handleContinue} loading={loading} fullWidth size="lg" />
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, gap: 28 },
  backBtn: { padding: 4, alignSelf: "flex-start" },
  header: { gap: 6 },
  step: { fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase" },
  title: { fontSize: 26, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  form: { gap: 20 },
  usernameNote: { fontSize: 12, lineHeight: 18, marginTop: -12 },
});
