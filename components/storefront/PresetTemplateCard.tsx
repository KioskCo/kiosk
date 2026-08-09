import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { TemplatePreset } from "@/lib/storefront";
import { useColors } from "@/hooks/useColors";

type Props = {
  preset: TemplatePreset;
  onEdit: (preset: TemplatePreset) => void;
  onDuplicate: (preset: TemplatePreset) => void;
};

export function PresetTemplateCard({ preset, onEdit, onDuplicate }: Props) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.thumbWrap}>
        <Image source={{ uri: preset.thumbnail }} style={styles.thumb} contentFit="cover" />
        <View style={[styles.badge, { backgroundColor: colors.primary + "cc" }]}>
          <Text style={styles.badgeText}>Preset</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{preset.label}</Text>
        <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }} numberOfLines={2}>
          {preset.description}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => onEdit(preset)}
            style={[styles.editBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="edit-2" size={13} color="#fff" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDuplicate(preset)}
            style={[styles.iconBtn, { borderColor: colors.border }]}
          >
            <Feather name="copy" size={13} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 2, overflow: "hidden" },
  thumbWrap: { position: "relative", height: 88 },
  thumb: { width: "100%", height: "100%" },
  badge: { position: "absolute", top: 8, right: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  body: { padding: 10 },
  name: { fontSize: 13, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 6, marginTop: 8 },
  editBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 7, borderRadius: 9 },
  editBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  iconBtn: { width: 32, height: 32, borderRadius: 9, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
