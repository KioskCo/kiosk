import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import {
  createDefaultBlock,
  uid,
  type BlockAction,
  type BlockAnimation,
  type BlockType,
  type CustomBlock,
  type CustomSection,
} from "@/lib/storefront/data";
import { useStorefront } from "@/lib/storefront/context";
import {
  ChipRow,
  ColorField,
  Field,
  ImageField,
  LinkField,
  PxStepper,
  ProductSelect,
  SwitchRow,
  TextField,
  type ColorScheme,
} from "./editor-fields";

/* ─── Block metadata ───────────────────────────────────────────────────────── */

const BLOCK_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  text:          { label: "Text",          icon: "type",           color: "#2563eb", bg: "#eff6ff" },
  button:        { label: "Button",        icon: "mouse-pointer",  color: "#7c3aed", bg: "#f5f3ff" },
  icon:          { label: "Icon",          icon: "star",           color: "#f59e0b", bg: "#fffbeb" },
  image:         { label: "Image",         icon: "image",          color: "#0891b2", bg: "#ecfeff" },
  spacer:        { label: "Spacer",        icon: "move",           color: "#6b7280", bg: "#f3f4f6" },
  divider:       { label: "Divider",       icon: "minus",          color: "#6b7280", bg: "#f3f4f6" },
  badge:         { label: "Badge",         icon: "tag",            color: "#db2777", bg: "#fdf2f8" },
  list:          { label: "List",          icon: "list",           color: "#0f766e", bg: "#f0fdfa" },
  card:          { label: "Card",          icon: "credit-card",    color: "#9333ea", bg: "#faf5ff" },
  form:          { label: "Form",          icon: "edit-3",         color: "#0284c7", bg: "#f0f9ff" },
  row:           { label: "Row",           icon: "grid",           color: "#15803d", bg: "#f0fdf4" },
  video:         { label: "Video",         icon: "video",          color: "#dc2626", bg: "#fef2f2" },
  accordion:     { label: "Accordion",     icon: "chevrons-down",  color: "#b45309", bg: "#fffbeb" },
  countdown:     { label: "Countdown",     icon: "clock",          color: "#dc2626", bg: "#fef2f2" },
  slideshow:     { label: "Slideshow",     icon: "image",          color: "#7c3aed", bg: "#f5f3ff" },
  "product-embed": { label: "Product",     icon: "shopping-bag",   color: "#16a34a", bg: "#f0fdf4" },
  group:         { label: "Group",         icon: "box",            color: "#374151", bg: "#f9fafb" },
  "layout-box":  { label: "Layout box",    icon: "layout",         color: "#4f46e5", bg: "#eef2ff" },
};

const BLOCK_TYPES: BlockType[] = [
  "text", "button", "icon", "image", "spacer", "divider", "badge", "list", "card", "row",
  "video", "accordion", "countdown", "slideshow", "product-embed", "group", "layout-box", "form",
];

const ANIMATED_BLOCKS = new Set<BlockType>([
  "text", "button", "icon", "image", "badge", "list", "card", "form", "video", "accordion",
  "countdown", "slideshow", "product-embed", "group", "layout-box",
]);

/* ─── Tiny helpers ─────────────────────────────────────────────────────────── */

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function pxOf(v: unknown): string | undefined {
  if (v == null || v === "") return undefined;
  return `${num(v)}px`;
}
function unPx(v: unknown): number | undefined {
  if (v == null) return undefined;
  const s = String(v).replace(/px$/i, "").trim();
  if (s === "") return undefined;
  return num(s);
}

/** Walk down a `path` of container ids (row columns use "id:colIndex") to find the block list at that level. */
function descend(blocks: CustomBlock[], path: string[]): CustomBlock[] {
  let cur = blocks;
  for (const seg of path) {
    const [id, col] = seg.split(":");
    const node = cur.find((b) => b.id === id);
    if (!node) return cur;
    if (col !== undefined) {
      const cols: CustomBlock[][] = Array.isArray((node as any).cols) ? (node as any).cols : [];
      cur = cols[Number(col)] ?? [];
    } else {
      cur = Array.isArray((node as any).children) ? (node as any).children : [];
    }
  }
  return cur;
}

function writeChildren(blocks: CustomBlock[], path: string[], next: CustomBlock[]): CustomBlock[] {
  if (path.length === 0) return next;
  const [seg, ...rest] = path;
  const [id, col] = seg.split(":");
  return blocks.map((b) => {
    if (b.id !== id) return b;
    if (col !== undefined) {
      const cols: CustomBlock[][] = Array.isArray((b as any).cols) ? (b as any).cols : [];
      const idx = Number(col);
      return { ...b, cols: cols.map((c, i) => (i === idx ? writeChildren(c, rest, next) : c)) };
    }
    const children = Array.isArray((b as any).children) ? (b as any).children : [];
    return { ...b, children: writeChildren(children, rest, next) };
  });
}

function blockSummary(b: CustomBlock): string {
  const x = b as any;
  switch (b.type) {
    case "text": return String(x.content ?? "").slice(0, 30) || "Text";
    case "button": return x.label ?? "Button";
    case "icon": return x.name ?? "Icon";
    case "image": return x.src ? "Image" : "Image · no source yet";
    case "spacer": return `${x.height ?? 0}px tall`;
    case "divider": return "Divider line";
    case "badge": return x.text ?? "Badge";
    case "list": return `${(x.items ?? []).length} list items`;
    case "card": return x.title ?? "Card";
    case "form": return `${(x.fields ?? []).length} fields`;
    case "row": return `${x.colCount ?? (x.cols ?? []).length} columns`;
    case "video": return x.url ? "Video" : "Video · no URL yet";
    case "accordion": return `${(x.items ?? []).length} items`;
    case "countdown": return "Countdown timer";
    case "slideshow": return `${(x.slides ?? []).length} slides`;
    case "product-embed": return x.productSlug || "Product";
    case "group": return `${(x.children ?? []).length} blocks`;
    case "layout-box": return `${(x.children ?? []).length} blocks · ${x.layout ?? "grid"}`;
    default: return b.type;
  }
}

function isContainer(b: CustomBlock): boolean {
  return b.type === "group" || b.type === "layout-box" || b.type === "row";
}

/* ─── Preset layouts (quick "really nice" starts) ──────────────────────────── */

function makePresetBlocks(kind: string): CustomBlock[] {
  const id = uid;
  switch (kind) {
    case "hero": {
      const group: CustomBlock = {
        id: id(), type: "group", label: "Hero",
        children: [
          { id: id(), type: "text", tag: "h1", content: "New season, new you", styles: { fontSize: "34px", fontWeight: "700", textAlign: "center" } },
          { id: id(), type: "text", tag: "p", content: "Shop the latest drop with free delivery across the country.", styles: { textAlign: "center", color: "#6b7280" } },
          { id: id(), type: "button", label: "Shop now", action: { type: "navigate", href: "/shop" }, styles: { backgroundColor: "#111111", color: "#ffffff", padding: "14px 28px", borderRadius: "9999px" } },
        ],
        direction: "column", gap: "md", align: "center",
      };
      return [group];
    }
    case "features": {
      const col = (icon: string, title: string, body: string): CustomBlock[] => [
        { id: id(), type: "icon", name: icon, size: 32, color: "#6366f1" },
        { id: id(), type: "text", tag: "h4", content: title, styles: { fontWeight: "600" } },
        { id: id(), type: "text", tag: "p", content: body, styles: { color: "#6b7280" } },
      ];
      const row: CustomBlock = {
        id: id(), type: "row",
        cols: [
          col("truck", "Free shipping", "On all orders over $150."),
          col("shield", "Secure checkout", "Pay safely with Paystack or Flutterwave."),
          col("gift", "Easy returns", "Free returns within 30 days."),
        ],
        colCount: 3, gap: "md", stackOnMobile: true,
      };
      return [row];
    }
    case "testimonials": {
      const quote = (author: string, text: string): CustomBlock[] => [
        { id: id(), type: "icon", name: "star", size: 16, color: "#f59e0b" },
        { id: id(), type: "text", tag: "p", content: `"${text}"`, styles: { fontStyle: "italic" } },
        { id: id(), type: "text", tag: "label", content: `— ${author}` },
      ];
      const row: CustomBlock = {
        id: id(), type: "row",
        cols: [
          quote("Sara K.", "Beautifully made and arrived quickly. I'm in love."),
          quote("Marcus T.", "The quality is unreal for the price."),
        ],
        colCount: 2, gap: "md", stackOnMobile: true,
      };
      return [row];
    }
    case "cta": {
      const group: CustomBlock = {
        id: id(), type: "group", label: "CTA",
        children: [
          { id: id(), type: "text", tag: "h2", content: "Ready to get started?", styles: { textAlign: "center" } },
          { id: id(), type: "button", label: "Message us", action: { type: "whatsapp", number: "" } },
        ],
        direction: "column", gap: "md", align: "center",
      };
      return [group];
    }
  }
  return [];
}

const PRESET_LABELS: Record<string, string> = { hero: "Hero", features: "Features", testimonials: "Testimonials", cta: "CTA banner" };

/* ─── Main editor ──────────────────────────────────────────────────────────── */

type Props = {
  section: CustomSection;
  onChange: (patch: Partial<CustomSection>) => void;
  colors: ColorScheme;
};

export function CustomSectionEditor({ section, onChange, colors }: Props) {
  const { saveSection } = useStorefront();
  const [path, setPath] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  const blocks = descend(section.blocks ?? [], path);
  const selected = blocks.find((b) => b.id === selectedId) ?? null;

  const setBlocks = (next: CustomBlock[]) => onChange({ blocks: writeChildren(section.blocks ?? [], path, next) });

  const patchBlock = (id: string, patch: Partial<CustomBlock>) => {
    setBlocks(blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as CustomBlock) : b)));
  };

  const addBlock = (type: BlockType) => {
    const nb = createDefaultBlock(type);
    setBlocks([...blocks, nb]);
    setSelectedId(nb.id);
  };

  const insertPreset = (kind: string) => {
    const made = makePresetBlocks(kind);
    setBlocks([...blocks, ...made]);
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    const i = blocks.findIndex((b) => b.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next);
  };

  const duplicateBlock = (id: string) => {
    const i = blocks.findIndex((b) => b.id === id);
    if (i < 0) return;
    const copy = JSON.parse(JSON.stringify(blocks[i]));
    copy.id = uid();
    copy.children = Array.isArray(copy.children) ? copy.children.map(reIdDeep) : copy.children;
    copy.cols = Array.isArray(copy.cols) ? copy.cols.map((c: any[]) => c.map(reIdDeep)) : copy.cols;
    copy.fields = Array.isArray(copy.fields) ? copy.fields.map((f: any) => ({ ...f, id: uid() })) : copy.fields;
    const next = [...blocks];
    next.splice(i + 1, 0, copy);
    setBlocks(next);
  };

  const deleteBlock = (id: string) => {
    const confirm = () => setBlocks(blocks.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
    const target = blocks.find((b) => b.id === id);
    if (target && isContainer(target)) {
      Alert.alert("Remove block", "This will delete the container and everything inside it.", [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: confirm },
      ]);
    } else {
      confirm();
    }
  };

  const openContainer = (b: CustomBlock) => {
    setPath([...path, b.type === "row" ? `${b.id}:0` : b.id]);
    setSelectedId(null);
  };

  const inRow = path.length > 0 && path[path.length - 1].includes(":");
  const colIdx = inRow ? Number(path[path.length - 1].split(":")[1]) : 0;
  const rowId = inRow ? path[path.length - 1].split(":")[0] : null;

  const handleSave = () => {
    if (!saveName.trim()) return;
    saveSection(saveName.trim(), section);
    setSaveName("");
    setSaveOpen(false);
  };

  return (
    <View style={{ gap: 10 }}>
      {/* Section-level fields */}
      <Field label="Section label" colors={colors}>
        <TextField value={section.label ?? ""} onChangeText={(t) => onChange({ label: t || undefined })} placeholder="e.g. Hero row" colors={colors} />
      </Field>

      <Field label="Block direction" colors={colors}>
        <ChipRow<"column" | "row" | "row-wrap">
          options={[
            { value: "column", label: "Stack" },
            { value: "row", label: "Side by side" },
            { value: "row-wrap", label: "Wrap" },
          ]}
          value={section.direction}
          onChange={(v) => onChange({ direction: v ?? "column" })}
          colors={colors}
        />
      </Field>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label="Padding X" colors={colors}>
            <ChipRow<"none" | "sm" | "md" | "lg">
              options={[{ value: "none", label: "None" }, { value: "sm", label: "S" }, { value: "md", label: "M" }, { value: "lg", label: "L" }]}
              value={section.paddingX}
              onChange={(v) => onChange({ paddingX: v ?? "md" })}
              colors={colors}
            />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Padding Y" colors={colors}>
            <ChipRow<"none" | "sm" | "md" | "lg">
              options={[{ value: "none", label: "None" }, { value: "sm", label: "S" }, { value: "md", label: "M" }, { value: "lg", label: "L" }]}
              value={section.paddingY}
              onChange={(v) => onChange({ paddingY: v ?? "md" })}
              colors={colors}
            />
          </Field>
        </View>
      </View>

      {/* Save as section */}
      {saveOpen ? (
        <View style={[styles.saveBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.saveTitle, { color: colors.foreground }]}>Save this layout to your library</Text>
          <TextInput
            value={saveName}
            onChangeText={setSaveName}
            placeholder="e.g. Summer hero banner"
            placeholderTextColor={colors.mutedForeground}
            autoFocus
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity onPress={handleSave} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>Save section</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSaveOpen(false)} style={[styles.ghostBtn, { borderColor: colors.border }]}>
              <Text style={{ color: colors.foreground, fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => setSaveOpen(true)}
          style={[styles.saveChip, { borderColor: colors.primary + "55", backgroundColor: colors.primary + "10" }]}
        >
          <Feather name="bookmark" size={14} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>Save as library section</Text>
        </TouchableOpacity>
      )}

      {/* Breadcrumb / column switcher */}
      {path.length > 0 && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <TouchableOpacity
            onPress={() => { setPath(path.slice(0, -1)); setSelectedId(null); }}
            style={[styles.miniBtn, { borderColor: colors.border }]}
          >
            <Feather name="arrow-left" size={13} color={colors.foreground} />
            <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "600" }}>Back</Text>
          </TouchableOpacity>
          {inRow && rowId && (
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[0, 1, 2, 3].map((i) => {
                const active = i === colIdx;
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setPath([...path.slice(0, -1), `${rowId}:${i}`])}
                    style={[styles.miniBtn, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + "14" : "transparent" }]}
                  >
                    <Text style={{ color: active ? colors.primary : colors.foreground, fontSize: 12 }}>Col {i + 1}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Editing a single block OR the block list */}
      {selected ? (
        <View>
          <TouchableOpacity onPress={() => setSelectedId(null)} style={{ alignSelf: "flex-start", marginBottom: 8 }}>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>← Done editing</Text>
          </TouchableOpacity>
          <BlockInspector
            block={selected}
            onChange={(patch) => patchBlock(selected.id, patch)}
            colors={colors}
            onDelete={() => deleteBlock(selected.id)}
            onDuplicate={() => duplicateBlock(selected.id)}
          />
        </View>
      ) : (
        <>
          {blocks.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Feather name="layout" size={22} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign: "center", lineHeight: 19 }}>
                This section is empty. Start with a quick layout below, or add individual blocks.
              </Text>
            </View>
          ) : (
            blocks.map((b, i) => (
              <BlockRow
                key={b.id}
                block={b}
                index={i}
                count={blocks.length}
                onEdit={() => setSelectedId(b.id)}
                onOpen={isContainer(b) ? () => openContainer(b) : undefined}
                onMove={(dir) => moveBlock(b.id, dir)}
                onDuplicate={() => duplicateBlock(b.id)}
                onDelete={() => deleteBlock(b.id)}
                colors={colors}
              />
            ))
          )}

          {/* Quick layouts */}
          <View style={{ marginTop: 6 }}>
            <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>Quick layouts</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {Object.keys(PRESET_LABELS).map((k) => (
                <TouchableOpacity
                  key={k}
                  onPress={() => insertPreset(k)}
                  style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.secondary }]}
                >
                  <Feather name="zap" size={12} color={colors.primary} />
                  <Text style={{ color: colors.foreground, fontSize: 12 }}>{PRESET_LABELS[k]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Add block grid */}
          <View style={{ marginTop: 10 }}>
            <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>Add block</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {BLOCK_TYPES.map((t) => {
                const meta = BLOCK_META[t] ?? { label: t, icon: "box", color: "#6b7280", bg: "#f3f4f6" };
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => addBlock(t)}
                    style={[styles.addBlockChip, { borderColor: colors.border, backgroundColor: colors.card }]}
                    activeOpacity={0.75}
                  >
                    <Feather name={meta.icon as any} size={15} color={meta.color} />
                    <Text style={{ fontSize: 12, color: colors.foreground }}>{meta.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </>
      )}
    </View>
  );
}

/* Re-ID a deep block tree (used when duplicating containers). */
function reIdDeep(b: CustomBlock): CustomBlock {
  const nb: any = { ...b, id: uid() };
  if (Array.isArray(nb.children)) nb.children = nb.children.map(reIdDeep);
  if (Array.isArray(nb.cols)) nb.cols = nb.cols.map((c: any[]) => c.map(reIdDeep));
  if (Array.isArray(nb.fields)) nb.fields = nb.fields.map((f: any) => ({ ...f, id: uid() }));
  if (Array.isArray(nb.items)) nb.items = nb.items.map((it: any) => (it && typeof it === "object" && "id" in it ? { ...it, id: uid() } : it));
  return nb as CustomBlock;
}

/* ─── Block row ────────────────────────────────────────────────────────────── */

function BlockRow({
  block, index, count, onEdit, onOpen, onMove, onDuplicate, onDelete, colors,
}: {
  block: CustomBlock;
  index: number;
  count: number;
  onEdit: () => void;
  onOpen?: () => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  colors: ColorScheme;
}) {
  const meta = BLOCK_META[block.type] ?? { label: block.type, icon: "box", color: "#6b7280", bg: "#f3f4f6" };
  return (
    <View style={[styles.blockRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <TouchableOpacity onPress={onEdit} style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }} activeOpacity={0.7}>
        <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: meta.bg, alignItems: "center", justifyContent: "center" }}>
          <Feather name={meta.icon as any} size={17} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>{meta.label}</Text>
          <Text style={{ fontSize: 11, color: colors.mutedForeground }} numberOfLines={1}>{blockSummary(block)}</Text>
        </View>
        {isContainer(block) && <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
      </TouchableOpacity>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
        {onOpen && (
          <TouchableOpacity onPress={onOpen} style={[styles.rowAction, { borderColor: colors.border }]}>
            <Feather name="folder" size={13} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "600" }}>Open</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => onMove(-1)} disabled={index === 0} style={[styles.rowAction, { borderColor: colors.border, opacity: index === 0 ? 0.35 : 1 }]}>
          <Feather name="arrow-up" size={13} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onMove(1)} disabled={index === count - 1} style={[styles.rowAction, { borderColor: colors.border, opacity: index === count - 1 ? 0.35 : 1 }]}>
          <Feather name="arrow-down" size={13} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDuplicate} style={[styles.rowAction, { borderColor: colors.border }]}>
          <Feather name="copy" size={13} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={[styles.rowAction, { borderColor: colors.destructive + "44" }]}>
          <Feather name="trash-2" size={13} color={colors.destructive} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ─── Block inspector (content / style / behaviour) ────────────────────────── */

type Tab = "content" | "style" | "behaviour";

function BlockInspector({
  block, onChange, colors, onDelete, onDuplicate,
}: {
  block: CustomBlock;
  onChange: (patch: Partial<CustomBlock>) => void;
  colors: ColorScheme;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const [tab, setTab] = useState<Tab>("content");
  const meta = BLOCK_META[block.type] ?? { label: block.type, icon: "box", color: "#6b7280", bg: "#f3f4f6" };

  return (
    <View style={[styles.blockCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: meta.bg, alignItems: "center", justifyContent: "center" }}>
          <Feather name={meta.icon as any} size={15} color={meta.color} />
        </View>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground, flex: 1 }}>{meta.label}</Text>
        <TouchableOpacity onPress={onDuplicate} style={{ padding: 6 }}>
          <Feather name="copy" size={15} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={{ padding: 6 }}>
          <Feather name="trash-2" size={15} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <View style={[styles.tabBar, { backgroundColor: colors.muted, borderBottomColor: colors.border }]}>
        {([
          { key: "content", label: "Content" },
          { key: "style", label: "Style" },
          { key: "behaviour", label: "Behaviour" },
        ] as { key: Tab; label: string }[]).map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tabBtn, active && { backgroundColor: colors.background }]}
            >
              <Text style={{ fontSize: 12, color: active ? colors.primary : colors.mutedForeground, fontWeight: active ? "700" : "500" }}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ paddingTop: 10 }}>
        {tab === "content" && <BlockContentEditor block={block} onChange={onChange} colors={colors} />}
        {tab === "style" && <BlockStylePanel block={block} onChange={onChange} colors={colors} />}
        {tab === "behaviour" && <BlockBehaviourEditor block={block} onChange={onChange} colors={colors} />}
      </View>
    </View>
  );
}

/* ─── Content editor ───────────────────────────────────────────────────────── */

function BlockContentEditor({ block, onChange, colors }: { block: CustomBlock; onChange: (p: Partial<CustomBlock>) => void; colors: ColorScheme }) {
  const b = block as any;
  switch (block.type) {
    case "text":
      return (
        <>
          <Field label="Text style" colors={colors}>
            <ChipRow<"h1" | "h2" | "h3" | "h4" | "p" | "span" | "label">
              options={[
                { value: "h1", label: "H1" }, { value: "h2", label: "H2" }, { value: "h3", label: "H3" },
                { value: "h4", label: "H4" }, { value: "p", label: "Body" }, { value: "label", label: "Label" },
              ]}
              value={b.tag ?? "p"}
              onChange={(v) => onChange({ tag: v ?? "p" })}
              colors={colors}
            />
          </Field>
          <Field label="Content" colors={colors}>
            <TextField value={b.content ?? ""} onChangeText={(t) => onChange({ content: t })} multiline placeholder="Type your text…" colors={colors} />
          </Field>
          <Field label="Size" colors={colors}>
            <PxStepper label="Font size" value={unPx(b.styles?.fontSize)} max={96} step={2}
              onChange={(v) => onChange({ styles: { ...(b.styles ?? {}), fontSize: pxOf(v) } })} colors={colors} />
          </Field>
          <Field label="Alignment" colors={colors}>
            <ChipRow<"left" | "center" | "right">
              options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]}
              value={b.styles?.textAlign}
              onChange={(v) => onChange({ styles: { ...(b.styles ?? {}), textAlign: v } })}
              colors={colors}
            />
          </Field>
          <ColorField label="Text color" value={b.styles?.color} onChange={(v) => onChange({ styles: { ...(b.styles ?? {}), color: v } })} colors={colors} />
        </>
      );

    case "button":
      return (
        <>
          <Field label="Label" colors={colors}>
            <TextField value={b.label ?? ""} onChangeText={(t) => onChange({ label: t })} colors={colors} />
          </Field>
          <Field label="Icon" colors={colors}>
            <TextField value={b.iconName ?? ""} onChangeText={(t) => onChange({ iconName: t || undefined })} placeholder="e.g. shopping-cart" colors={colors} />
          </Field>
          <Field label="Icon position" colors={colors}>
            <ChipRow<"left" | "right">
              options={[{ value: "left", label: "Left" }, { value: "right", label: "Right" }]}
              value={b.iconPos}
              onChange={(v) => onChange({ iconPos: v ?? "left" })}
              colors={colors}
            />
          </Field>
          <SwitchRow label="Full width" value={(b.styles?.width ?? "") === "100%"} onValueChange={(v) => onChange({ styles: { ...(b.styles ?? {}), width: v ? "100%" : undefined } })} colors={colors} />
        </>
      );

    case "icon":
      return (
        <>
          <Field label="Icon name" colors={colors}>
            <TextField value={b.name ?? ""} onChangeText={(t) => onChange({ name: t })} placeholder="e.g. star, truck, heart" colors={colors} />
          </Field>
          <Field label="Size" colors={colors}>
            <PxStepper label="Size" value={b.size} max={96} step={4} onChange={(v) => onChange({ size: v ?? 24 })} colors={colors} />
          </Field>
          <ColorField label="Color" value={b.color} onChange={(v) => onChange({ color: v })} colors={colors} />
        </>
      );

    case "image":
      return (
        <>
          <Field label="Image" colors={colors}>
            <ImageField value={b.src ?? ""} onChange={(v) => onChange({ src: v })} colors={colors} />
          </Field>
          <Field label="Alt text" colors={colors}>
            <TextField value={b.alt ?? ""} onChangeText={(t) => onChange({ alt: t })} colors={colors} />
          </Field>
          <Field label="Rounded corners" colors={colors}>
            <PxStepper label="Radius" value={unPx(b.styles?.borderRadius)} max={48} step={4} onChange={(v) => onChange({ styles: { ...(b.styles ?? {}), borderRadius: pxOf(v) } })} colors={colors} />
          </Field>
          <Field label="Height" colors={colors}>
            <PxStepper label="Height" value={unPx(b.styles?.height)} max={600} step={8} onChange={(v) => onChange({ styles: { ...(b.styles ?? {}), height: pxOf(v) } })} colors={colors} />
          </Field>
        </>
      );

    case "spacer":
      return (
        <Field label="Height" colors={colors}>
          <PxStepper label="Height" value={b.height} max={160} step={8} onChange={(v) => onChange({ height: v ?? 32 })} colors={colors} />
        </Field>
      );

    case "divider":
      return (
        <>
          <ColorField label="Line color" value={b.color === "currentColor" ? undefined : b.color} onChange={(v) => onChange({ color: v ?? "currentColor" })} colors={colors} />
          <Field label="Thickness" colors={colors}>
            <PxStepper label="Thickness" value={b.thickness} max={8} step={1} onChange={(v) => onChange({ thickness: v ?? 1 })} colors={colors} />
          </Field>
          <Field label="Line style" colors={colors}>
            <ChipRow<"solid" | "dashed" | "dotted">
              options={[{ value: "solid", label: "Solid" }, { value: "dashed", label: "Dashed" }, { value: "dotted", label: "Dotted" }]}
              value={b.lineStyle ?? "solid"}
              onChange={(v) => onChange({ lineStyle: v ?? "solid" })}
              colors={colors}
            />
          </Field>
        </>
      );

    case "badge":
      return (
        <>
          <Field label="Text" colors={colors}>
            <TextField value={b.text ?? ""} onChangeText={(t) => onChange({ text: t })} colors={colors} />
          </Field>
          <Field label="Size" colors={colors}>
            <ChipRow<"sm" | "md" | "lg">
              options={[{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }]}
              value={b.size ?? "md"}
              onChange={(v) => onChange({ size: v ?? "md" })}
              colors={colors}
            />
          </Field>
          <ColorField label="Background" value={b.bgColor} onChange={(v) => onChange({ bgColor: v })} colors={colors} />
          <ColorField label="Text color" value={b.color} onChange={(v) => onChange({ color: v })} colors={colors} />
        </>
      );

    case "list":
      return (
        <>
          <StringListEditor
            value={b.items ?? []}
            onChange={(items) => onChange({ items })}
            placeholder="List item"
            colors={colors}
          />
          <SwitchRow label="Numbered list" value={!!b.ordered} onValueChange={(v) => onChange({ ordered: v })} colors={colors} />
          <Field label="Bullet icon (optional)" colors={colors}>
            <TextField value={b.iconName ?? ""} onChangeText={(t) => onChange({ iconName: t || undefined })} placeholder="e.g. check" colors={colors} />
          </Field>
        </>
      );

    case "card":
      return (
        <>
          <Field label="Title" colors={colors}>
            <TextField value={b.title ?? ""} onChangeText={(t) => onChange({ title: t })} colors={colors} />
          </Field>
          <Field label="Body" colors={colors}>
            <TextField value={b.body ?? ""} onChangeText={(t) => onChange({ body: t })} multiline colors={colors} />
          </Field>
          <Field label="Image" colors={colors}>
            <ImageField value={b.image ?? ""} onChange={(v) => onChange({ image: v })} colors={colors} />
          </Field>
          <Field label="Button label" colors={colors}>
            <TextField value={b.ctaLabel ?? ""} onChangeText={(t) => onChange({ ctaLabel: t || undefined })} placeholder="e.g. Shop now" colors={colors} />
          </Field>
          <Field label="Corner radius" colors={colors}>
            <ChipRow<"none" | "sm" | "md" | "lg">
              options={[{ value: "none", label: "None" }, { value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }]}
              value={b.radius ?? "md"}
              onChange={(v) => onChange({ radius: v ?? "md" })}
              colors={colors}
            />
          </Field>
          <Field label="Shadow" colors={colors}>
            <ChipRow<"none" | "sm" | "md" | "lg">
              options={[{ value: "none", label: "None" }, { value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }]}
              value={b.shadow ?? "sm"}
              onChange={(v) => onChange({ shadow: v ?? "sm" })}
              colors={colors}
            />
          </Field>
          <SwitchRow label="Bordered" value={!!b.bordered} onValueChange={(v) => onChange({ bordered: v })} colors={colors} />
        </>
      );

    case "form":
      return (
        <>
          <FormFieldsEditor value={b.fields ?? []} onChange={(fields) => onChange({ fields })} colors={colors} />
          <Field label="Submit button label" colors={colors}>
            <TextField value={b.submitLabel ?? ""} onChangeText={(t) => onChange({ submitLabel: t })} colors={colors} />
          </Field>
          <FormSubmitEditor block={block} onChange={onChange} colors={colors} />
          <Field label="Success message" colors={colors}>
            <TextField value={b.successMessage ?? ""} onChangeText={(t) => onChange({ successMessage: t || undefined })} placeholder="e.g. Thanks! We'll be in touch." colors={colors} />
          </Field>
        </>
      );

    case "row":
      return (
        <>
          <Field label="Columns" colors={colors}>
            <ChipRow<"2" | "3" | "4">
              options={[{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }]}
              value={String(b.colCount ?? 2) as "2" | "3" | "4"}
              onChange={(v) => {
                const n = Number(v ?? 2) as 2 | 3 | 4;
                const cols = Array.from({ length: n }, (_, i) => (b.cols?.[i] ?? []) as CustomBlock[]);
                onChange({ colCount: n, cols });
              }}
              colors={colors}
            />
          </Field>
          <Field label="Gap" colors={colors}>
            <ChipRow<"none" | "sm" | "md" | "lg">
              options={[{ value: "none", label: "None" }, { value: "sm", label: "S" }, { value: "md", label: "M" }, { value: "lg", label: "L" }]}
              value={b.gap ?? "md"}
              onChange={(v) => onChange({ gap: v ?? "md" })}
              colors={colors}
            />
          </Field>
          <SwitchRow label="Stack on mobile" value={b.stackOnMobile !== false} onValueChange={(v) => onChange({ stackOnMobile: v })} colors={colors} />
          <Text style={{ fontSize: 11, color: colors.mutedForeground, lineHeight: 16 }}>
            Tip: tap "Open" on the row to add blocks inside each column.
          </Text>
        </>
      );

    case "video":
      return (
        <>
          <Field label="Video URL (YouTube / Vimeo / mp4)" colors={colors}>
            <TextField value={b.url ?? ""} onChangeText={(t) => onChange({ url: t })} colors={colors} keyboardType="url" />
          </Field>
          <TouchableOpacity
            onPress={() => pickVideo(onChange)}
            style={[styles.chip, { borderColor: colors.border, alignSelf: "flex-start", marginBottom: 14 }]}
          >
            <Feather name="upload" size={14} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 13 }}>Upload video from device</Text>
          </TouchableOpacity>
          <Field label="Aspect ratio" colors={colors}>
            <ChipRow<"16:9" | "9:16" | "4:3" | "1:1">
              options={[{ value: "16:9", label: "16:9" }, { value: "9:16", label: "9:16" }, { value: "4:3", label: "4:3" }, { value: "1:1", label: "1:1" }]}
              value={b.ratio ?? "16:9"}
              onChange={(v) => onChange({ ratio: v ?? "16:9" })}
              colors={colors}
            />
          </Field>
          <Field label="Height" colors={colors}>
            <PxStepper label="Player height" value={unPx(b.styles?.height)} max={600} step={8} onChange={(v) => onChange({ styles: { ...(b.styles ?? {}), height: pxOf(v) } })} colors={colors} />
          </Field>
          <Field label="Corner radius" colors={colors}>
            <PxStepper label="Radius" value={unPx(b.styles?.borderRadius)} max={48} step={4} onChange={(v) => onChange({ styles: { ...(b.styles ?? {}), borderRadius: pxOf(v) } })} colors={colors} />
          </Field>
          <ColorField label="Player background" value={b.styles?.backgroundColor} onChange={(v) => onChange({ styles: { ...(b.styles ?? {}), backgroundColor: v } })} colors={colors} />
          <Field label="Caption" colors={colors}>
            <TextField value={b.caption ?? ""} onChangeText={(t) => onChange({ caption: t || undefined })} colors={colors} />
          </Field>
          <SwitchRow label="Autoplay" value={!!b.autoplay} onValueChange={(v) => onChange({ autoplay: v })} colors={colors} />
          <SwitchRow label="Muted" value={!!b.muted} onValueChange={(v) => onChange({ muted: v })} colors={colors} />
          <SwitchRow label="Loop" value={!!b.loop} onValueChange={(v) => onChange({ loop: v })} colors={colors} />
        </>
      );

    case "accordion":
      return (
        <>
          <AccordionItemsEditor value={b.items ?? []} onChange={(items) => onChange({ items })} colors={colors} />
          <SwitchRow label="Allow multiple open" value={!!b.allowMultiple} onValueChange={(v) => onChange({ allowMultiple: v })} colors={colors} />
        </>
      );

    case "countdown":
      return (
        <>
          <Field label="End date" colors={colors}>
            <TextField value={b.targetDate ?? ""} onChangeText={(t) => onChange({ targetDate: t })} placeholder="ISO date e.g. 2026-12-31T23:59:59" colors={colors} />
          </Field>
          <Field label="Quick set" colors={colors}>
            <ChipRow<"7" | "30" | "60">
              options={[{ value: "7", label: "+7 days" }, { value: "30", label: "+30 days" }, { value: "60", label: "+60 days" }]}
              value={undefined}
              onChange={(v) => { if (v) onChange({ targetDate: new Date(Date.now() + Number(v) * 86400000).toISOString() }); }}
              colors={colors}
            />
          </Field>
          <Field label="Label" colors={colors}>
            <TextField value={b.label ?? ""} onChangeText={(t) => onChange({ label: t || undefined })} placeholder="e.g. Sale ends in" colors={colors} />
          </Field>
          <SwitchRow label="Show labels" value={b.showLabels !== false} onValueChange={(v) => onChange({ showLabels: v })} colors={colors} />
        </>
      );

    case "slideshow":
      return (
        <>
          <SlideshowEditor value={b.slides ?? []} onChange={(slides) => onChange({ slides })} colors={colors} />
          <Field label="Aspect ratio" colors={colors}>
            <ChipRow<"16:9" | "4:3" | "1:1" | "3:2">
              options={[{ value: "16:9", label: "16:9" }, { value: "4:3", label: "4:3" }, { value: "3:2", label: "3:2" }, { value: "1:1", label: "1:1" }]}
              value={b.ratio ?? "16:9"}
              onChange={(v) => onChange({ ratio: v ?? "16:9" })}
              colors={colors}
            />
          </Field>
          <SwitchRow label="Autoplay" value={b.autoplay !== false} onValueChange={(v) => onChange({ autoplay: v })} colors={colors} />
          <SwitchRow label="Show dots" value={b.showDots !== false} onValueChange={(v) => onChange({ showDots: v })} colors={colors} />
          <SwitchRow label="Show arrows" value={b.showArrows !== false} onValueChange={(v) => onChange({ showArrows: v })} colors={colors} />
        </>
      );

    case "product-embed":
      return (
        <>
          <Field label="Product" colors={colors}>
            <ProductSelect value={b.productSlug ?? ""} onChange={(v) => onChange({ productSlug: v })} colors={colors} />
          </Field>
          <SwitchRow label="Show description" value={!!b.showDescription} onValueChange={(v) => onChange({ showDescription: v })} colors={colors} />
        </>
      );

    case "group":
    case "layout-box":
      return (
        <>
          <Field label="Name (for your reference)" colors={colors}>
            <TextField value={b.label ?? ""} onChangeText={(t) => onChange({ label: t })} colors={colors} />
          </Field>
          <Field label="Direction" colors={colors}>
            <ChipRow<"column" | "row" | "row-wrap">
              options={[{ value: "column", label: "Stack" }, { value: "row", label: "Side by side" }, { value: "row-wrap", label: "Wrap" }]}
              value={b.direction ?? "column"}
              onChange={(v) => onChange({ direction: v ?? "column" })}
              colors={colors}
            />
          </Field>
          {block.type === "layout-box" && (
            <Field label="Layout" colors={colors}>
              <ChipRow<"grid" | "flex">
                options={[{ value: "grid", label: "Grid" }, { value: "flex", label: "Flex" }]}
                value={b.layout ?? "grid"}
                onChange={(v) => onChange({ layout: v ?? "grid" })}
                colors={colors}
              />
            </Field>
          )}
          {block.type === "layout-box" && b.layout === "grid" && (
            <Field label="Columns" colors={colors}>
              <PxStepper label="Columns" value={b.columns} max={6} step={1} onChange={(v) => onChange({ columns: v ?? 2 })} colors={colors} />
            </Field>
          )}
          <Field label="Gap" colors={colors}>
            <ChipRow<"none" | "sm" | "md" | "lg">
              options={[{ value: "none", label: "None" }, { value: "sm", label: "S" }, { value: "md", label: "M" }, { value: "lg", label: "L" }]}
              value={b.gap ?? "md"}
              onChange={(v) => onChange({ gap: v ?? "md" })}
              colors={colors}
            />
          </Field>
          <Field label="Alignment" colors={colors}>
            <ChipRow<"start" | "center" | "end" | "stretch">
              options={[{ value: "start", label: "Start" }, { value: "center", label: "Center" }, { value: "end", label: "End" }, { value: "stretch", label: "Stretch" }]}
              value={b.align ?? "start"}
              onChange={(v) => onChange({ align: v ?? "start" })}
              colors={colors}
            />
          </Field>
          <Text style={{ fontSize: 11, color: colors.mutedForeground, lineHeight: 16 }}>
            Tip: tap "Open" on this container to add blocks inside it.
          </Text>
        </>
      );

    default:
      return <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>No content options for "{block.type}".</Text>;
  }
}

/* ─── Reusable list editors ────────────────────────────────────────────────── */

async function pickVideo(onChange: (p: Partial<CustomBlock>) => void) {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], quality: 0.5, base64: true });
  if (res.canceled || !res.assets[0]?.base64) return;
  const mime = res.assets[0].mimeType ?? "video/mp4";
  const dataUri = `data:${mime};base64,${res.assets[0].base64}`;
  if (dataUri.length > 11 * 1024 * 1024) {
    Alert.alert(
      "Large video",
      "This video is large and will make your store heavy. For long videos, use a YouTube link or a hosted mp4 URL instead."
    );
  }
  onChange({ url: dataUri });
}

/** Where form answers go when a customer hits submit. */
function FormSubmitEditor({ block, onChange, colors }: { block: CustomBlock; onChange: (p: Partial<CustomBlock>) => void; colors: ColorScheme }) {
  const b = block as any;
  const sa = b.submitAction;
  const dest = sa?.type ?? "none";
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontSize: 12, marginBottom: 6, fontWeight: "500", color: colors.mutedForeground }}>Where submissions go</Text>
      <ChipRow<string>
        options={[
          { value: "none", label: "Success message" },
          { value: "email", label: "Email" },
          { value: "webhook", label: "Webhook" },
          { value: "whatsapp", label: "WhatsApp" },
        ]}
        value={dest}
        onChange={(t) => {
          if (!t || t === "none") onChange({ submitAction: undefined });
          else if (t === "email") onChange({ submitAction: { type: "email", to: sa?.type === "email" ? sa.to : "" } });
          else if (t === "webhook") onChange({ submitAction: { type: "webhook", url: sa?.type === "webhook" ? sa.url : "" } });
          else onChange({ submitAction: { type: "whatsapp", number: sa?.type === "whatsapp" ? sa.number : "" } });
        }}
        colors={colors}
      />
      {dest === "email" && (
        <View style={{ marginTop: 8 }}>
          <TextField
            value={sa?.type === "email" ? sa.to : ""}
            onChangeText={(to) => onChange({ submitAction: { type: "email", to } })}
            placeholder="you@yourstore.com"
            colors={colors}
            keyboardType="email-address"
          />
          <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 4 }}>
            Opens the customer's email app with the answers pre-filled.
          </Text>
        </View>
      )}
      {dest === "webhook" && (
        <View style={{ marginTop: 8 }}>
          <TextField
            value={sa?.type === "webhook" ? sa.url : ""}
            onChangeText={(url) => onChange({ submitAction: { type: "webhook", url } })}
            placeholder="https://your-app.com/hook"
            colors={colors}
            keyboardType="url"
          />
          <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 4 }}>
            Posts the answers as JSON to your endpoint (e.g. Google Sheets, Zapier, your server).
          </Text>
        </View>
      )}
      {dest === "whatsapp" && (
        <View style={{ marginTop: 8 }}>
          <TextField
            value={sa?.type === "whatsapp" ? sa.number : ""}
            onChangeText={(number) => onChange({ submitAction: { type: "whatsapp", number } })}
            placeholder="+2348012345678"
            colors={colors}
            keyboardType="phone-pad"
          />
          <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 4 }}>
            Opens WhatsApp with all answers as a message to this number.
          </Text>
        </View>
      )}
    </View>
  );
}

function StringListEditor({ value, onChange, placeholder, colors }: {
  value: string[]; onChange: (v: string[]) => void; placeholder: string; colors: ColorScheme;
}) {
  return (
    <View style={{ gap: 6, marginBottom: 10 }}>
      {(value ?? []).map((item, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
          <TextInput
            value={item}
            onChangeText={(t) => onChange(value.map((x, j) => (j === i ? t : x)))}
            placeholder={placeholder}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { flex: 1, borderColor: colors.border, color: colors.foreground }]}
          />
          <TouchableOpacity onPress={() => onChange(value.filter((_, j) => j !== i))} style={{ padding: 6 }}>
            <Feather name="x" size={14} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity onPress={() => onChange([...(value ?? []), ""])} style={{ alignSelf: "flex-start" }}>
        <Text style={{ color: colors.primary, fontSize: 13 }}>+ Add item</Text>
      </TouchableOpacity>
    </View>
  );
}

function FormFieldsEditor({ value, onChange, colors }: {
  value: any[]; onChange: (v: any[]) => void; colors: ColorScheme;
}) {
  return (
    <View style={{ gap: 8, marginBottom: 8 }}>
      <Text style={{ fontSize: 12, marginBottom: 2, fontWeight: "500", color: colors.mutedForeground }}>Form fields</Text>
      {(value ?? []).map((f, i) => (
        <View key={f.id ?? i} style={{ gap: 6, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <TextInput
              value={f.label ?? ""}
              onChangeText={(t) => onChange(value.map((x, j) => (j === i ? { ...x, label: t } : x)))}
              placeholder="Label"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { flex: 1, borderColor: colors.border, color: colors.foreground }]}
            />
            <TouchableOpacity onPress={() => onChange(value.filter((_, j) => j !== i))} style={{ padding: 6 }}>
              <Feather name="x" size={14} color={colors.destructive} />
            </TouchableOpacity>
          </View>
          <ChipRow<"text" | "email" | "phone" | "textarea" | "select" | "checkbox" | "file">
            options={[
              { value: "text", label: "Text" }, { value: "email", label: "Email" }, { value: "phone", label: "Phone" },
              { value: "textarea", label: "Long text" }, { value: "select", label: "Dropdown" }, { value: "checkbox", label: "Checkbox" },
              { value: "file", label: "File" },
            ]}
            value={f.fieldType ?? "text"}
            onChange={(v) => onChange(value.map((x, j) => (j === i ? { ...x, fieldType: v ?? "text" } : x)))}
            colors={colors}
          />
          <SwitchRow label="Required" value={!!f.required} onValueChange={(v) => onChange(value.map((x, j) => (j === i ? { ...x, required: v } : x)))} colors={colors} />
        </View>
      ))}
      <TouchableOpacity onPress={() => onChange([...(value ?? []), { id: uid(), label: "New field", fieldType: "text", required: false }])} style={{ alignSelf: "flex-start" }}>
        <Text style={{ color: colors.primary, fontSize: 13 }}>+ Add field</Text>
      </TouchableOpacity>
    </View>
  );
}

function AccordionItemsEditor({ value, onChange, colors }: {
  value: any[]; onChange: (v: any[]) => void; colors: ColorScheme;
}) {
  return (
    <View style={{ gap: 8, marginBottom: 8 }}>
      {(value ?? []).map((it, i) => (
        <View key={it.id ?? i} style={{ gap: 6, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <TextInput
              value={it.title ?? ""}
              onChangeText={(t) => onChange(value.map((x, j) => (j === i ? { ...x, title: t } : x)))}
              placeholder="Question"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { flex: 1, borderColor: colors.border, color: colors.foreground }]}
            />
            <TouchableOpacity onPress={() => onChange(value.filter((_, j) => j !== i))} style={{ padding: 6 }}>
              <Feather name="x" size={14} color={colors.destructive} />
            </TouchableOpacity>
          </View>
          <TextInput
            value={it.body ?? ""}
            onChangeText={(t) => onChange(value.map((x, j) => (j === i ? { ...x, body: t } : x)))}
            placeholder="Answer"
            placeholderTextColor={colors.mutedForeground}
            multiline
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, minHeight: 60 }]}
          />
        </View>
      ))}
      <TouchableOpacity onPress={() => onChange([...(value ?? []), { id: uid(), title: "New question", body: "Answer goes here." }])} style={{ alignSelf: "flex-start" }}>
        <Text style={{ color: colors.primary, fontSize: 13 }}>+ Add item</Text>
      </TouchableOpacity>
    </View>
  );
}

function SlideshowEditor({ value, onChange, colors }: {
  value: any[]; onChange: (v: any[]) => void; colors: ColorScheme;
}) {
  return (
    <View style={{ gap: 8, marginBottom: 8 }}>
      <Text style={{ fontSize: 12, marginBottom: 2, fontWeight: "500", color: colors.mutedForeground }}>Slides</Text>
      {(value ?? []).map((s, i) => (
        <View key={i} style={{ gap: 6, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
          <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Slide {i + 1}</Text>
            <TouchableOpacity onPress={() => onChange(value.filter((_, j) => j !== i))} style={{ marginLeft: "auto", padding: 4 }}>
              <Feather name="x" size={14} color={colors.destructive} />
            </TouchableOpacity>
          </View>
          <ImageField value={s.src ?? ""} onChange={(v) => onChange(value.map((x, j) => (j === i ? { ...x, src: v } : x)))} colors={colors} />
          <TextInput
            value={s.caption ?? ""}
            onChangeText={(t) => onChange(value.map((x, j) => (j === i ? { ...x, caption: t || undefined } : x)))}
            placeholder="Caption (optional)"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
        </View>
      ))}
      <TouchableOpacity onPress={() => onChange([...(value ?? []), { src: "", alt: `Slide ${(value ?? []).length + 1}` }])} style={{ alignSelf: "flex-start" }}>
        <Text style={{ color: colors.primary, fontSize: 13 }}>+ Add slide</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ─── Style panel ──────────────────────────────────────────────────────────── */

const FONT_WEIGHTS = [
  { value: "400", label: "400" }, { value: "600", label: "600" }, { value: "700", label: "700" }, { value: "800", label: "800" },
];

function BlockStylePanel({ block, onChange, colors }: { block: CustomBlock; onChange: (p: Partial<CustomBlock>) => void; colors: ColorScheme }) {
  const b = block as any;
  const st: any = b.styles ?? {};
  const setStyle = (patch: Record<string, any>) => onChange({ styles: { ...st, ...patch } });
  const clear = () => {
    const { ...rest } = b;
    delete rest.styles;
    onChange(rest);
  };

  return (
    <View style={{ gap: 2 }}>
      <ColorField label="Text color" value={st.color} onChange={(v) => setStyle({ color: v })} colors={colors} />
      <ColorField label="Background" value={st.backgroundColor} onChange={(v) => setStyle({ backgroundColor: v })} colors={colors} />
      <Field label="Font size" colors={colors}>
        <PxStepper label="Font size" value={unPx(st.fontSize)} max={96} step={2} onChange={(v) => setStyle({ fontSize: pxOf(v) })} colors={colors} />
      </Field>
      <Field label="Font weight" colors={colors}>
        <ChipRow<string>
          options={FONT_WEIGHTS}
          value={st.fontWeight}
          onChange={(v) => setStyle({ fontWeight: v })}
          colors={colors}
        />
      </Field>
      <Field label="Text alignment" colors={colors}>
        <ChipRow<"left" | "center" | "right">
          options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]}
          value={st.textAlign}
          onChange={(v) => setStyle({ textAlign: v })}
          colors={colors}
        />
      </Field>
      <Field label="Padding" colors={colors}>
        <PxStepper label="Padding" value={unPx(st.padding)} max={80} step={4} onChange={(v) => setStyle({ padding: pxOf(v) })} colors={colors} />
      </Field>
      <Field label="Corner radius" colors={colors}>
        <PxStepper label="Radius" value={unPx(st.borderRadius)} max={48} step={4} onChange={(v) => setStyle({ borderRadius: pxOf(v) })} colors={colors} />
      </Field>
      <Field label="Max width" colors={colors}>
        <PxStepper label="Max width" value={unPx(st.maxWidth)} max={1200} step={20} onChange={(v) => setStyle({ maxWidth: pxOf(v) })} colors={colors} />
      </Field>
      <Field label="Alignment inside section" colors={colors}>
        <ChipRow<"start" | "center" | "end" | "stretch">
          options={[{ value: "start", label: "Start" }, { value: "center", label: "Center" }, { value: "end", label: "End" }, { value: "stretch", label: "Stretch" }]}
          value={st.alignSelf}
          onChange={(v) => setStyle({ alignSelf: v })}
          colors={colors}
        />
      </Field>
      <Field label="Opacity" colors={colors}>
        <PxStepper label="Opacity %" value={st.opacity != null ? num(st.opacity) * 100 : undefined} max={100} step={5} onChange={(v) => setStyle({ opacity: v != null ? v / 100 : undefined })} colors={colors} />
      </Field>
      {Object.keys(st).length > 0 && (
        <TouchableOpacity onPress={clear} style={{ alignSelf: "flex-start", marginTop: 4 }}>
          <Text style={{ color: colors.destructive, fontSize: 12 }}>Reset all styles</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ─── Behaviour panel (action + animation) ─────────────────────────────────── */

const ANIMATION_OPTIONS: { value: BlockAnimation; label: string }[] = [
  { value: "none", label: "None" },
  { value: "fadeIn", label: "Fade in" },
  { value: "slideUp", label: "Slide up" },
  { value: "slideLeft", label: "Slide left" },
  { value: "slideRight", label: "Slide right" },
  { value: "zoomIn", label: "Zoom in" },
  { value: "bounce", label: "Bounce" },
  { value: "pulse", label: "Pulse" },
];

const ACTION_OPTIONS = [
  { value: "none", label: "None" },
  { value: "navigate", label: "Open link" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "scroll-top", label: "Scroll to top" },
  { value: "open-cart", label: "Open cart" },
  { value: "open-search", label: "Open search" },
];

function BlockBehaviourEditor({ block, onChange, colors }: { block: CustomBlock; onChange: (p: Partial<CustomBlock>) => void; colors: ColorScheme }) {
  const b = block as any;
  const actionable = block.type === "button" || block.type === "icon" || block.type === "card";
  const action = block.type === "card" ? b.ctaAction : b.action;

  return (
    <View style={{ gap: 2 }}>
      {actionable && (
        <>
          <Text style={{ fontSize: 12, fontWeight: "500", color: colors.mutedForeground, marginBottom: 6 }}>On tap</Text>
          <ActionEditor
            value={action}
            onChange={(a) => {
              if (block.type === "card") onChange({ ctaAction: a });
              else onChange({ action: a });
            }}
            colors={colors}
          />
        </>
      )}
      {ANIMATED_BLOCKS.has(block.type) && (
        <Field label="Animation" colors={colors}>
          <ChipRow<BlockAnimation>
            options={ANIMATION_OPTIONS}
            value={b.animation ?? "none"}
            onChange={(v) => onChange({ animation: v ?? "none" })}
            colors={colors}
          />
        </Field>
      )}
      {!actionable && !ANIMATED_BLOCKS.has(block.type) && (
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>No behaviour options for this block.</Text>
      )}
    </View>
  );
}

function ActionEditor({ value, onChange, colors }: { value?: BlockAction; onChange: (a?: BlockAction) => void; colors: ColorScheme }) {
  const type = value?.type ?? "none";
  return (
    <>
      <ChipRow<string>
        options={ACTION_OPTIONS}
        value={type}
        onChange={(t) => {
          if (!t || t === "none") onChange({ type: "none" });
          else if (t === "navigate") onChange({ type: "navigate", href: value?.type === "navigate" ? value.href : "" });
          else if (t === "whatsapp") onChange({ type: "whatsapp", number: value?.type === "whatsapp" ? value.number : "" });
          else onChange({ type: t } as BlockAction);
        }}
        colors={colors}
      />
      {type === "navigate" && (
        <View style={{ marginTop: 8 }}>
          <LinkField value={value?.type === "navigate" ? value.href : ""} onChange={(href) => onChange({ type: "navigate", href })} colors={colors} />
        </View>
      )}
      {type === "whatsapp" && (
        <View style={{ gap: 8, marginTop: 8 }}>
          <TextField
            value={value?.type === "whatsapp" ? value.number : ""}
            onChangeText={(number) => onChange({ type: "whatsapp", number, message: value?.type === "whatsapp" ? value.message : undefined })}
            placeholder="+2348012345678"
            colors={colors}
            keyboardType="phone-pad"
          />
          <TextField
            value={value?.type === "whatsapp" ? (value.message ?? "") : ""}
            onChangeText={(message) => onChange({ type: "whatsapp", number: value?.type === "whatsapp" ? value.number : "", message: message || undefined })}
            placeholder="Pre-filled message (optional)"
            colors={colors}
          />
        </View>
      )}
    </>
  );
}

/* ─── Styles ───────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  saveBox: { padding: 12, borderRadius: 12, borderWidth: 1, gap: 10 },
  saveTitle: { fontSize: 14, fontWeight: "600" },
  saveChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, alignSelf: "flex-start" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  primaryBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, alignItems: "center" },
  ghostBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  miniBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1 },
  emptyBox: { padding: 20, borderRadius: 12, borderWidth: 1, alignItems: "center", gap: 8, borderStyle: "dashed" },
  groupLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  addBlockChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  blockRow: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 8 },
  rowAction: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, borderWidth: 1, paddingVertical: 5, paddingHorizontal: 8 },
  blockCard: { borderWidth: 1, borderRadius: 12, padding: 12 },
  tabBar: { flexDirection: "row", padding: 3, gap: 3, borderRadius: 10 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 7 },
});
