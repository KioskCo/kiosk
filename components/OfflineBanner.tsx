import { Feather } from "@expo/vector-icons";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useRef, useEffect } from "react";

/**
 * Slim banner that slides in from the top when the device has no internet.
 * Mount it inside SafeAreaView on any screen that needs live data.
 */
export function OfflineBanner() {
  const { isOnline, checking } = useNetworkStatus();
  const slideY = useRef(new Animated.Value(-48)).current;
  const wasOffline = useRef(false);

  useEffect(() => {
    if (checking) return;
    const goingOffline = !isOnline;
    if (goingOffline === wasOffline.current) return;
    wasOffline.current = goingOffline;

    Animated.spring(slideY, {
      toValue: goingOffline ? 0 : -48,
      useNativeDriver: true,
      damping: 16,
      stiffness: 200,
    }).start();
  }, [isOnline, checking]);

  return (
    <Animated.View style={[s.wrap, { transform: [{ translateY: slideY }] }]} pointerEvents="none">
      <Feather name="wifi-off" size={13} color="#fff" />
      <Text style={s.text}>No internet — showing cached data</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    backgroundColor: "#B45309",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 8,
    zIndex: 999,
  },
  text: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
