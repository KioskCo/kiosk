import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { ActivityItem } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

interface ActivityFeedItemProps {
  item: ActivityItem;
}

export function ActivityFeedItem({ item }: ActivityFeedItemProps) {
  const colors = useColors();

  const variantColor = {
    success: colors.success,
    warning: colors.warning,
    error: colors.destructive,
    default: colors.primary,
  }[item.variant ?? "default"];

  const variantBg = {
    success: "#ECFDF5",
    warning: "#FFFBEB",
    error: "#FEF2F2",
    default: colors.secondary,
  }[item.variant ?? "default"];

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: variantBg },
        ]}
      >
        <Feather
          name={item.icon as any}
          size={15}
          color={variantColor}
        />
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            style={[
              styles.title,
              { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            {item.title}
          </Text>
          <Text
            style={[
              styles.time,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            {formatRelativeTime(item.timestamp)}
          </Text>
        </View>
        <Text
          style={[
            styles.subtitle,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
          numberOfLines={2}
        >
          {item.subtitle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    fontSize: 13,
    flex: 1,
  },
  time: {
    fontSize: 11,
    flexShrink: 0,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
});
