import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { SECTION_LABELS, SECTION_VARIANTS, type Section } from "@/lib/storefront";
import { useColors } from "@/hooks/useColors";
import { LayoutControls } from "./LayoutControls";
import { renderInspectorFields } from "./inspector-fields";

type Props = {
  section: Section;
  onChange: (patch: Partial<Section>) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
};

type Tab = "content" | "style";

export function InspectorPanel({ section, onChange, onDelete, onDuplicate }: Props) {
  const colors = useColors();
  const [tab, setTab] = useState<Tab>("content");
  const variants = SECTION_VARIANTS[section.type];

  const handleDelete = () => {
    if (!onDelete) return;
    if (Platform.OS !== "web") {
      Alert.alert(
        "Remove section",
        `Remove "${SECTION_LABELS[section.type]}" from your store?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: onDelete },
        ]
      );
    } else {
      onDelete();
    }
  };

  return (
    <View style={styles.root}>
      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.muted, borderBottomColor: colors.border }]}>
        {(["content", "style"] as Tab[]).map((t) => {
          const active = tab === t;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tabBtn, active && { backgroundColor: colors.background }]}
            >
              <Feather
                name={t === "content" ? "edit-3" : "sliders"}
                size={14}
                color={active ? colors.primary : colors.mutedForeground}
              />
              <Text style={[styles.tabLabel, { color: active ? colors.primary : colors.mutedForeground, fontWeight: active ? "600" : "400" }]}>
                {t === "content" ? "Edit" : "Design"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Quick actions — only on Content tab */}
        {tab === "content" && (
          <View style={[styles.quickRow, { borderBottomColor: colors.border }]}>
            {/* Visible toggle */}
            <TouchableOpacity
              onPress={() => onChange({ visible: !section.visible })}
              style={[styles.quickBtn, { borderColor: colors.border }]}
            >
              <Feather
                name={section.visible !== false ? "eye" : "eye-off"}
                size={14}
                color={section.visible !== false ? colors.primary : colors.mutedForeground}
              />
              <Text style={[styles.quickLabel, { color: section.visible !== false ? colors.primary : colors.mutedForeground }]}>
                {section.visible !== false ? "Visible" : "Hidden"}
              </Text>
            </TouchableOpacity>

            {onDuplicate && (
              <TouchableOpacity
                onPress={onDuplicate}
                style={[styles.quickBtn, { borderColor: colors.border }]}
              >
                <Feather name="copy" size={14} color={colors.foreground} />
                <Text style={[styles.quickLabel, { color: colors.foreground }]}>Duplicate</Text>
              </TouchableOpacity>
            )}

            {onDelete && (
              <TouchableOpacity
                onPress={handleDelete}
                style={[styles.quickBtn, { borderColor: colors.destructive + "40" }]}
              >
                <Feather name="trash-2" size={14} color={colors.destructive} />
                <Text style={[styles.quickLabel, { color: colors.destructive }]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {tab === "content" ? (
          <>
            {/* Variant picker */}
            {variants && variants.length > 0 && !["hero", "about", "featured-products", "pricing-plans", "stats", "team", "countdown"].includes(section.type) ? (
              <View style={[styles.group, { borderColor: colors.border }]}>
                <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>Block layout</Text>
                <View style={styles.chipRow}>
                  {variants.map((v) => {
                    const active = (section as any).variant === v;
                    return (
                      <TouchableOpacity
                        key={v}
                        onPress={() => onChange({ variant: v } as any)}
                        style={[styles.chip, {
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? colors.primary : "transparent",
                        }]}
                      >
                        <Text style={{ fontSize: 12, color: active ? "#fff" : colors.foreground, fontWeight: active ? "600" : "400" }}>{v}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Section-specific fields */}
            {renderInspectorFields(section, onChange, colors)}
          </>
        ) : (
          <LayoutControls section={section} onChange={onChange} colors={colors} />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    padding: 3,
    gap: 3,
    borderBottomWidth: 1,
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 10,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 6,
    borderRadius: 7,
  },
  tabLabel: { fontSize: 13 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 28 },

  quickRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    flexWrap: "wrap",
  },
  quickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickLabel: { fontSize: 12, fontWeight: "500" },

  group: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  groupLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5, marginBottom: 8, textTransform: "uppercase" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
});
