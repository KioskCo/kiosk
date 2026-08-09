import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { hapticImpact, hapticNotification } from "@/hooks/useHapticsStore";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const KEYPAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
];

const CORRECT_CODE = "1234";

export default function OTPVerifyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const shakeX = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const handleKey = (key: string) => {
    if (status === "success") return;

    if (key === "⌫") {
      setCode((c) => c.slice(0, -1));
      setStatus("idle");
      return;
    }
    if (!key || code.length >= 4) return;

    hapticImpact();

    const newCode = code + key;
    setCode(newCode);

    if (newCode.length === 4) {
      if (newCode === CORRECT_CODE) {
        hapticNotification();
        setStatus("success");
        setTimeout(() => router.back(), 2000);
      } else {
        hapticNotification(Haptics.NotificationFeedbackType.Error);
        setStatus("error");
        shakeX.value = withSequence(
          withTiming(-8, { duration: 60 }),
          withTiming(8, { duration: 60 }),
          withTiming(-6, { duration: 60 }),
          withTiming(6, { duration: 60 }),
          withSpring(0)
        );
        setTimeout(() => {
          setCode("");
          setStatus("idle");
        }, 1200);
      }
    }
  };

  const dotColor =
    status === "success"
      ? colors.success
      : status === "error"
      ? colors.destructive
      : colors.primary;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0),
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor:
                status === "success" ? "#ECFDF5" : status === "error" ? "#FEF2F2" : colors.secondary,
            },
          ]}
        >
          <Feather
            name={status === "success" ? "check-circle" : status === "error" ? "x-circle" : "shield"}
            size={40}
            color={dotColor}
          />
        </View>

        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          {status === "success" ? "OTP Verified!" : "Enter Delivery OTP"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {status === "success"
            ? "₦45,000 has been released to your Available Balance"
            : "Ask the customer for their 4-digit delivery verification code"}
        </Text>

        <Animated.View style={[styles.dotsRow, shakeStyle]}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i < code.length
                      ? dotColor
                      : colors.border,
                  transform: [{ scale: i < code.length ? 1.2 : 1 }],
                },
              ]}
            />
          ))}
        </Animated.View>

        {status === "error" && (
          <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_500Medium" }]}>
            Incorrect code. Please try again.
          </Text>
        )}
      </View>

      <View style={styles.keypad}>
        {KEYPAD.map((row, ri) => (
          <View key={ri} style={styles.keypadRow}>
            {row.map((key, ki) => (
              <KeypadButton
                key={`${ri}-${ki}`}
                value={key}
                onPress={() => handleKey(key)}
                colors={colors}
                isEmpty={key === ""}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function KeypadButton({
  value,
  onPress,
  colors,
  isEmpty,
}: {
  value: string;
  onPress: () => void;
  colors: any;
  isEmpty: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.keyCell, animStyle]}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 400 });
        }}
        onPress={onPress}
        disabled={isEmpty}
        style={[
          styles.keyBtn,
          {
            backgroundColor: value === "⌫" ? colors.muted : isEmpty ? "transparent" : colors.card,
            borderColor: value === "⌫" || isEmpty ? "transparent" : colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.keyText,
            {
              color:
                value === "⌫"
                  ? colors.mutedForeground
                  : colors.foreground,
              fontFamily: "Inter_500Medium",
            },
          ]}
        >
          {value}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12 },
  backBtn: { padding: 4, alignSelf: "flex-start" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 24 },
  iconWrap: { width: 88, height: 88, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  title: { fontSize: 26, letterSpacing: -0.5, textAlign: "center" },
  subtitle: { fontSize: 15, lineHeight: 22, textAlign: "center", maxWidth: 300 },
  dotsRow: { flexDirection: "row", gap: 20, marginVertical: 8 },
  dot: { width: 18, height: 18, borderRadius: 9 },
  errorText: { fontSize: 14 },
  keypad: { paddingHorizontal: 40, paddingBottom: 16, gap: 10 },
  keypadRow: { flexDirection: "row", gap: 10, justifyContent: "center" },
  keyCell: { flex: 1 },
  keyBtn: { height: 64, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  keyText: { fontSize: 22 },
});
