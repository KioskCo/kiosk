import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Image, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useColorSchemeStore } from "@/hooks/useColorSchemeStore";
import { useEscrowNotifications } from "@/hooks/useEscrowNotifications";
import { OfflineBanner } from "@/components/OfflineBanner";

export default function TabLayout() {
  const colors = useColors();
  const { isDark } = useColorSchemeStore();
  const { profile } = useApp();
  const insets = useSafeAreaInsets();
  useEscrowNotifications();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const tabBarHeight = isWeb ? 64 : 62 + insets.bottom;
  const tabBarPaddingBottom = isWeb ? 12 : insets.bottom + 12;

  return (
    <View style={{ flex: 1 }}>
    <OfflineBanner />
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 0,
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 10,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
            />
          ),
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={24} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="message" tintColor={color} size={24} />
            ) : (
              <Feather name="message-circle" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="square.grid.2x2" tintColor={color} size={24} />
            ) : (
              <Feather name="package" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="marketing"
        options={{
          title: "Ads",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="megaphone" tintColor={color} size={24} />
            ) : (
              <Feather name="trending-up" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Account",
          tabBarIcon: ({ color, focused }) => {
            if (profile?.avatarUri) {
              return (
                <View style={[styles.avatarTab, { borderColor: focused ? colors.primary : colors.border }]}>
                  <Image source={{ uri: profile.avatarUri }} style={styles.avatarImg} />
                </View>
              );
            }
            if (isIOS) {
              return <SymbolView name="person.circle" tintColor={color} size={24} />;
            }
            const initials = profile?.name?.slice(0, 2).toUpperCase() ?? "KS";
            return (
              <View style={[styles.initialsTab, {
                backgroundColor: focused ? colors.primary : colors.muted,
                borderColor: focused ? colors.primary : colors.border,
              }]}>
                <Text style={[styles.initialsText, { color: focused ? "#fff" : colors.mutedForeground, fontFamily: "Inter_700Bold" }]}>
                  {initials}
                </Text>
              </View>
            );
          },
        }}
      />
    </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarTab: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 2,
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  initialsTab: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  initialsText: {
    fontSize: 9,
  },
});
