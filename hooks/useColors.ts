import colors from "@/constants/colors";
import { useColorSchemeStore } from "./useColorSchemeStore";

/**
 * Returns the design tokens for the current color scheme.
 * Supports both system-level and user-toggled dark mode.
 */
export function useColors() {
  const { isDark } = useColorSchemeStore();
  const palette = isDark ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
