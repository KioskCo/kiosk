import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { hapticImpact } from "@/hooks/useHapticsStore";

import { ChatThread } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { Badge } from "./ui/Badge";

function formatTime(date: Date): string {
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return date.toLocaleDateString("en", { day: "numeric", month: "short" });
}

interface ChatListItemProps {
  chat: ChatThread;
}

export function ChatListItem({ chat }: ChatListItemProps) {
  const colors = useColors();
  const router = useRouter();

  const statusBadge: Record<ChatThread["status"], { label: string; variant: "bot" | "human" | "paused" }> = {
    bot: { label: "Bot Active", variant: "bot" },
    human: { label: "Human Needed", variant: "human" },
    paused: { label: "Paused", variant: "paused" },
  };

  const { label, variant } = statusBadge[chat.status];

  const statusIcon = {
    bot: <MaterialCommunityIcons name="robot" size={12} color="#4338CA" />,
    human: <Feather name="alert-triangle" size={12} color="#B45309" />,
    paused: <Feather name="pause-circle" size={12} color="#64748B" />,
  }[chat.status];

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") {
          hapticImpact();
        }
        router.push(`/chat/${chat.id}` as any);
      }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? colors.muted : "transparent",
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
        <Text
          style={[
            styles.avatarText,
            { color: colors.primary, fontFamily: "Inter_700Bold" },
          ]}
        >
          {chat.avatarInitials}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            style={[
              styles.name,
              {
                color: colors.foreground,
                fontFamily: chat.unreadCount > 0 ? "Inter_700Bold" : "Inter_600SemiBold",
              },
            ]}
            numberOfLines={1}
          >
            {chat.customerName}
          </Text>
          <Text
            style={[
              styles.time,
              {
                color: chat.unreadCount > 0 ? colors.primary : colors.mutedForeground,
                fontFamily: chat.unreadCount > 0 ? "Inter_600SemiBold" : "Inter_400Regular",
              },
            ]}
          >
            {formatTime(chat.timestamp)}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <Text
            style={[
              styles.preview,
              {
                color: chat.unreadCount > 0 ? colors.foreground : colors.mutedForeground,
                fontFamily: chat.unreadCount > 0 ? "Inter_500Medium" : "Inter_400Regular",
                flex: 1,
              },
            ]}
            numberOfLines={1}
          >
            {chat.lastMessage}
          </Text>
          <View style={styles.right}>
            {chat.unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeText}>{chat.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>

        <Badge label={label} variant={variant} dot size="sm" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 15,
  },
  content: {
    flex: 1,
    gap: 5,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    fontSize: 15,
    flex: 1,
  },
  time: {
    fontSize: 12,
    flexShrink: 0,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  preview: {
    fontSize: 13,
  },
  right: {
    flexShrink: 0,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
});
