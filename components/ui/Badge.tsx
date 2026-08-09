import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

type BadgeVariant = "bot" | "human" | "paused" | "success" | "warning" | "error" | "default" | "indigo";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  style?: ViewStyle;
  dot?: boolean;
}

export function Badge({
  label,
  variant = "default",
  size = "sm",
  style,
  dot = false,
}: BadgeProps) {
  const colors = useColors();

  const config: Record<BadgeVariant, { bg: string; text: string; dotColor: string }> = {
    bot: { bg: "#EEF2FF", text: "#4338CA", dotColor: "#6366F1" },
    human: { bg: "#FFFBEB", text: "#B45309", dotColor: colors.warning },
    paused: { bg: "#F1F5F9", text: "#64748B", dotColor: "#94A3B8" },
    success: { bg: "#ECFDF5", text: "#065F46", dotColor: colors.success },
    warning: { bg: "#FFFBEB", text: "#92400E", dotColor: colors.warning },
    error: { bg: "#FEF2F2", text: "#991B1B", dotColor: colors.destructive },
    default: { bg: colors.muted, text: colors.mutedForeground, dotColor: colors.mutedForeground },
    indigo: { bg: "#EEF2FF", text: colors.primary, dotColor: colors.primary },
  };

  const { bg, text, dotColor } = config[variant];
  const padH = size === "sm" ? 8 : 12;
  const padV = size === "sm" ? 3 : 5;
  const fs = size === "sm" ? 11 : 13;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bg,
          paddingHorizontal: padH,
          paddingVertical: padV,
          borderRadius: 999,
        },
        style,
      ]}
    >
      {dot && (
        <View
          style={[styles.dot, { backgroundColor: dotColor }]}
        />
      )}
      <Text
        style={[
          styles.label,
          { color: text, fontSize: fs, fontFamily: "Inter_500Medium" },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    letterSpacing: 0.1,
  },
});
