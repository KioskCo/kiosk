import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Notification, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(width * 0.88, 380);

interface NotificationDrawerProps {
  visible: boolean;
  onClose: () => void;
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotifIcon({ type }: { type: Notification["type"] }) {
  const colors = useColors();
  const config = {
    escrow: { icon: "shield-check", color: colors.success, bg: "#ECFDF5" },
    chat: { icon: "message-text", color: colors.warning, bg: "#FFFBEB" },
    logistics: { icon: "truck-delivery", color: colors.primary, bg: "#EEF2FF" },
    marketing: { icon: "trending-up", color: "#7C3AED", bg: "#F5F3FF" },
  }[type];

  return (
    <View style={[styles.iconBadge, { backgroundColor: config.bg }]}>
      <MaterialCommunityIcons name={config.icon as any} size={18} color={config.color} />
    </View>
  );
}

function NotifItem({ notif, onPress, onTrackPress }: { notif: Notification; onPress: () => void; onTrackPress?: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.notifItem,
        {
          backgroundColor: notif.read ? "transparent" : colors.secondary,
          borderLeftWidth: notif.read ? 0 : 3,
          borderLeftColor: notif.read ? "transparent" : colors.primary,
        },
      ]}
    >
      <NotifIcon type={notif.type} />
      <View style={styles.notifContent}>
        <Text
          style={[
            styles.notifTitle,
            { color: colors.foreground, fontFamily: notif.read ? "Inter_400Regular" : "Inter_600SemiBold" },
          ]}
        >
          {notif.title}
        </Text>
        <Text
          style={[styles.notifBody, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
          numberOfLines={2}
        >
          {notif.body}
        </Text>
        <Text style={[styles.notifTime, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {formatTime(notif.timestamp)}
        </Text>
        {onTrackPress && (
          <TouchableOpacity
            onPress={onTrackPress}
            style={[styles.trackBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Feather name="map-pin" size={12} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Track Order</Text>
          </TouchableOpacity>
        )}
      </View>
      {!notif.read && (
        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
      )}
    </TouchableOpacity>
  );
}

export function NotificationDrawer({ visible, onClose }: NotificationDrawerProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notifications, markNotificationRead, markAllNotificationsRead, orders } = useApp();

  const translateX = useSharedValue(DRAWER_WIDTH);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      translateX.value = withTiming(0, { duration: 280 });
    } else {
      opacity.value = withTiming(0, { duration: 180 });
      translateX.value = withTiming(DRAWER_WIDTH, { duration: 220 });
    }
  }, [visible]);

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleNotifPress = (notif: Notification) => {
    markNotificationRead(notif.id);
    onClose();
    if (notif.orderId) {
      router.push(`/order/${notif.orderId}?fromDrawer=1` as any);
    } else if (notif.actionScreen) {
      router.push(`${notif.actionScreen}?fromDrawer=1` as any);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.drawer,
            drawerStyle,
            {
              backgroundColor: colors.background,
              paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
              width: DRAWER_WIDTH,
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.drawerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Notifications
            </Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={markAllNotificationsRead}>
                <Text style={[styles.markAll, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                  Mark all read
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          >
            {notifications.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="bell-off" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  No notifications yet
                </Text>
              </View>
            ) : (
              notifications.map((n) => {
                const order = n.orderId ? orders.find((o) => o.id === n.orderId) : undefined;
                const hasTracking = !!(order as any)?.trackingId;
                return (
                  <NotifItem
                    key={n.id}
                    notif={n}
                    onPress={() => handleNotifPress(n)}
                    onTrackPress={hasTracking ? () => {
                      markNotificationRead(n.id);
                      onClose();
                      router.push(`/tracking/${n.orderId}` as any);
                    } : undefined}
                  />
                );
              })
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", justifyContent: "flex-end" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  drawer: {
    height: "100%",
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  drawerTitle: { fontSize: 20 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  markAll: { fontSize: 13 },
  closeBtn: { padding: 4 },
  list: { gap: 2 },
  notifItem: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
  iconBadge: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  notifContent: { flex: 1, gap: 3 },
  notifTitle: { fontSize: 14 },
  notifBody: { fontSize: 13, lineHeight: 18 },
  notifTime: { fontSize: 11, marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
  trackBtn: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginTop: 6 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15 },
});
