import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRouter } from "expo-router";

import { ChatListItem } from "@/components/ChatListItem";
import { ChatThread, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { Badge } from "@/components/ui/Badge";

const FILTERS: { label: string; value: ChatThread["status"] | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Bot Active", value: "bot" },
  { label: "Human Needed", value: "human" },
  { label: "Paused", value: "paused" },
];

export default function InboxScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { chats, whatsappConnected } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ChatThread["status"] | "all">("all");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  if (!whatsappConnected) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.topBar, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Inbox</Text>
          </View>
        </View>
        <View style={[styles.emptyContainer, styles.empty]}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
            <Feather name="message-circle" size={34} color="#25D366" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            Connect WhatsApp Business
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Link your WhatsApp Business number to start receiving and managing customer conversations here.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/settings" as any)}
            style={{ marginTop: 8, backgroundColor: "#25D366", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 8 }}
            activeOpacity={0.85}
          >
            <Feather name="link" size={16} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Go to Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const filtered = chats.filter((c) => {
    const matchSearch =
      !search ||
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || c.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.topBar,
          {
            paddingTop: topPad + 12,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.title,
              { color: colors.foreground, fontFamily: "Inter_700Bold" },
            ]}
          >
            Inbox
          </Text>
          <View style={[styles.countBadge, { backgroundColor: colors.secondary }]}>
            <Text
              style={[
                styles.countText,
                { color: colors.primary, fontFamily: "Inter_700Bold" },
              ]}
            >
              {chats.length}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.muted,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search conversations..."
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.searchInput,
              { color: colors.foreground, fontFamily: "Inter_400Regular" },
            ]}
          />
          {search.length > 0 && (
            <Feather
              name="x"
              size={16}
              color={colors.mutedForeground}
              onPress={() => setSearch("")}
            />
          )}
        </View>

        <View style={styles.filtersRow}>
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <View
                key={f.value}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                    borderRadius: 999,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: active ? "#FFFFFF" : colors.mutedForeground,
                      fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                    },
                  ]}
                  onPress={() => setFilter(f.value)}
                >
                  {f.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatListItem chat={item} />}
        scrollEnabled={!!filtered.length}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          { paddingBottom: insets.bottom + 100 },
          !filtered.length && styles.emptyContainer,
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="message-circle" size={44} color={colors.mutedForeground} />
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              No conversations
            </Text>
            <Text
              style={[
                styles.emptyDesc,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              Customer chats from your WhatsApp will appear here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 24,
    letterSpacing: -0.5,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  countText: {
    fontSize: 14,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filtersRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
