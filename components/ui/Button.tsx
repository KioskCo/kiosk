import * as Haptics from "expo-haptics";
import { hapticImpact } from "@/hooks/useHapticsStore";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      if (Platform.OS !== "web") {
        hapticImpact();
      }
      onPress();
    }
  };

  const bgColor = {
    primary: colors.primary,
    secondary: colors.secondary,
    outline: "transparent",
    ghost: "transparent",
    danger: colors.destructive,
  }[variant];

  const textColor = {
    primary: colors.primaryForeground,
    secondary: colors.secondaryForeground,
    outline: colors.primary,
    ghost: colors.primary,
    danger: colors.destructiveForeground,
  }[variant];

  const borderColor = variant === "outline" ? colors.primary : "transparent";

  const paddingVertical = { sm: 8, md: 14, lg: 18 }[size];
  const paddingHorizontal = { sm: 16, md: 24, lg: 32 }[size];
  const fontSize = { sm: 13, md: 15, lg: 17 }[size];

  return (
    <Animated.View style={[animatedStyle, fullWidth && styles.fullWidth, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.base,
          {
            backgroundColor: disabled ? colors.muted : bgColor,
            borderColor: disabled ? colors.border : borderColor,
            borderWidth: variant === "outline" ? 1.5 : 0,
            borderRadius: colors.radius,
            paddingVertical,
            paddingHorizontal,
            opacity: disabled ? 0.6 : 1,
          },
          fullWidth && styles.fullWidth,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === "secondary" || variant === "ghost" ? colors.primary : colors.primaryForeground}
          />
        ) : (
          <Text
            style={[
              styles.label,
              {
                color: disabled ? colors.mutedForeground : textColor,
                fontSize,
                fontFamily: "Inter_600SemiBold",
              },
            ]}
          >
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  fullWidth: {
    width: "100%",
  },
  label: {
    letterSpacing: 0.1,
  },
});
