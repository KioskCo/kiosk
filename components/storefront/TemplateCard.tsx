import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import type { Template } from "@/lib/storefront";
import { sectionCount } from "./section-utils";
import { DefaultThumbnail } from "./DefaultThumbnail";
import { useColors } from "@/hooks/useColors";

type Props = {
  template: Template;
  active: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete?: () => void;
  onRename: (name: string) => void;
  onThumbnailChange: (uri: string) => void;
  onPreview?: () => void;
  compact?: boolean;
};

export function TemplateCard({
  template,
  active,
  canDelete,
  onEdit,
  onDuplicate,
  onDelete,
  onRename,
  onThumbnailChange,
  onPreview,
  compact,
}: Props) {
  const colors = useColors();
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(template.name);
  const count = sectionCount(template);

  const pickThumb = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, base64: true });
    if (!res.canceled && res.assets[0]?.base64) {
      const mime = res.assets[0].mimeType ?? "image/jpeg";
      onThumbnailChange(`data:${mime};base64,${res.assets[0].base64}`);
    }
  };

  const saveName = () => {
    if (draftName.trim()) onRename(draftName.trim());
    setEditingName(false);
  };

  const thumbH = compact ? 88 : 140;
  const bodyPad = compact ? 10 : 14;
  const nameSz = compact ? 13 : 16;
  const btnPy = compact ? 7 : 10;
  const iconSz = compact ? 32 : 40;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: active ? colors.primary : colors.border }]}>
      <TouchableOpacity onPress={pickThumb} activeOpacity={0.9}>
        <View style={[styles.thumbWrap, { height: thumbH }]}>
          {template.thumbnail ? (
            <Image source={{ uri: template.thumbnail }} style={styles.thumb} contentFit="cover" />
          ) : (
            <DefaultThumbnail template={template} />
          )}
          {active && (
            <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.activeText}>Active</Text>
            </View>
          )}
          {template.launched && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          )}
          <View style={styles.thumbOverlay}>
            <Feather name="upload" size={16} color="#fff" />
            <Text style={styles.thumbOverlayText}>Thumbnail</Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={[styles.body, { padding: bodyPad }]}>
        {editingName ? (
          <TextInput
            value={draftName}
            onChangeText={setDraftName}
            onBlur={saveName}
            autoFocus
            style={[styles.nameInput, { color: colors.foreground, borderColor: colors.primary }]}
          />
        ) : (
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.foreground, fontSize: nameSz }]} numberOfLines={1}>{template.name}</Text>
            <TouchableOpacity onPress={() => { setDraftName(template.name); setEditingName(true); }}>
              <Feather name="edit-2" size={compact ? 12 : 14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}
        <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>
          {template.pages.length}p · {count} sections
        </Text>

        <View style={[styles.actions, { marginTop: compact ? 8 : 12 }]}>
          <TouchableOpacity onPress={onEdit} style={[styles.editBtn, { backgroundColor: colors.primary, paddingVertical: btnPy }]}>
            <Feather name="edit-2" size={13} color="#fff" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDuplicate} style={[styles.iconBtn, { borderColor: colors.border, width: iconSz, height: iconSz }]}>
            <Feather name="copy" size={13} color={colors.foreground} />
          </TouchableOpacity>
          {onPreview && (
            <TouchableOpacity onPress={onPreview} style={[styles.iconBtn, { borderColor: colors.border, width: iconSz, height: iconSz }]}>
              <Feather name="eye" size={13} color={colors.primary} />
            </TouchableOpacity>
          )}
          {canDelete && onDelete ? (
            <TouchableOpacity
              onPress={() => Alert.alert("Delete template?", `"${template.name}" will be permanently deleted.`, [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: onDelete },
              ])}
              style={[styles.iconBtn, { borderColor: colors.destructive + "55", width: iconSz, height: iconSz }]}
            >
              <Feather name="trash-2" size={13} color={colors.destructive} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 2, overflow: "hidden", marginBottom: 0 },
  thumbWrap: { position: "relative" },
  thumb: { width: "100%", height: "100%" },
  activeBadge: { position: "absolute", top: 8, right: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  activeText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  liveBadge: { position: "absolute", top: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#ECFDF5", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" },
  liveText: { fontSize: 10, fontWeight: "600", color: "#065F46" },
  thumbOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", opacity: 0 },
  thumbOverlayText: { color: "#fff", fontSize: 11, marginTop: 4 },
  body: {},
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  name: { flex: 1, fontWeight: "700" },
  nameInput: { borderWidth: 1, borderRadius: 8, padding: 6, fontSize: 13, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 6 },
  editBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 9 },
  editBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  iconBtn: { borderRadius: 9, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
