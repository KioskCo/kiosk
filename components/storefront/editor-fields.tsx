import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import { FlatList, Modal, PanResponder, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useLinkOptions } from "@/lib/storefront";
import { products } from "@/lib/storefront/products";
import { useColors } from "@/hooks/useColors";

export type ColorScheme = ReturnType<typeof useColors>;

export function Field({ label, children, colors }: { label: string; children: React.ReactNode; colors: ColorScheme }) {
  return (
    <View style={ef.field}>
      <Text style={[ef.label, { color: colors.mutedForeground }]}>{label}</Text>
      {children}
    </View>
  );
}

export function TextField({
  value,
  onChangeText,
  multiline,
  placeholder,
  colors,
  keyboardType,
}: {
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  colors: ColorScheme;
  keyboardType?: "default" | "numeric" | "email-address" | "url" | "phone-pad";
}) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync if parent value changes externally (e.g. undo/redo)
  useEffect(() => { setLocal(value); }, [value]);

  const handleChange = (t: string) => {
    setLocal(t);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChangeText(t), 180);
  };

  return (
    <TextInput
      value={local}
      onChangeText={handleChange}
      multiline={multiline}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground}
      keyboardType={keyboardType}
      style={[ef.input, { color: colors.foreground, borderColor: colors.border, minHeight: multiline ? 80 : 44 }]}
    />
  );
}

export function ChipRow<T extends string>({
  options,
  value,
  onChange,
  colors,
  clearable = false,
}: {
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (v: T | undefined) => void;
  colors: ColorScheme;
  /**
   * Whether tapping the already-active chip clears it back to undefined.
   * Default false: nearly every call site resolves its value with
   * `value={x ?? "default"}`, so clearing to undefined was invisible — the
   * fallback just re-displayed the same chip as active — meaning a re-tap
   * silently no-op'd instead of landing the change, which read as "I need to
   * tap this multiple times." Pass true for genuinely optional fields with NO
   * fallback default (e.g. Text alignment, where unset means "inherit") —
   * those need this to reach the unset state at all.
   */
  clearable?: boolean;
}) {
  return (
    <View style={ef.chipRow}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <TouchableOpacity
            key={o.value}
            onPress={() => { if (!active) onChange(o.value); else if (clearable) onChange(undefined); }}
            style={[ef.chip, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + "18" : "transparent" }]}
          >
            <Text style={{ fontSize: 12, color: colors.foreground, fontWeight: active ? "600" : "400" }}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function ImageField({ value, onChange, colors }: { value: string; onChange: (v: string) => void; colors: ColorScheme }) {
  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, base64: true });
    if (!res.canceled && res.assets[0]?.base64) {
      const mime = res.assets[0].mimeType ?? "image/jpeg";
      onChange(`data:${mime};base64,${res.assets[0].base64}`);
    }
  };
  return (
    <View style={{ gap: 8 }}>
      {value ? <Text style={{ fontSize: 11, color: colors.mutedForeground }} numberOfLines={1}>Image set</Text> : null}
      <TextField value={value} onChangeText={onChange} placeholder="https:// or upload" colors={colors} />
      <TouchableOpacity onPress={pick} style={[ef.chip, { borderColor: colors.border, alignSelf: "flex-start" }]}>
        <Feather name="upload" size={14} color={colors.primary} />
        <Text style={{ color: colors.primary, fontSize: 13 }}>Upload image</Text>
      </TouchableOpacity>
    </View>
  );
}

export function LinkField({ value, onChange, colors }: { value?: string; onChange: (v: string) => void; colors: ColorScheme }) {
  const opts = useLinkOptions();
  const [open, setOpen] = useState(false);
  const selected = opts.find((o) => o.value === value);
  return (
    <View style={{ gap: 8 }}>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[ef.selectBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}
      >
        <Text style={{ flex: 1, fontSize: 12, color: selected ? colors.foreground : colors.mutedForeground }} numberOfLines={1}>
          {selected ? selected.label : value ? value : "Select a page or product…"}
        </Text>
        <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={[ef.selectSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground, padding: 12, paddingBottom: 8 }}>Link destination</Text>
          <FlatList
            data={opts}
            keyExtractor={(o) => o.value}
            style={{ maxHeight: 280 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => { onChange(item.value); setOpen(false); }}
                style={[ef.selectItem, { borderBottomColor: colors.border, backgroundColor: item.value === value ? colors.primary + "14" : "transparent" }]}
              >
                <Text style={{ fontSize: 13, color: item.value === value ? colors.primary : colors.foreground }}>{item.label}</Text>
                {item.value === value && <Feather name="check" size={14} color={colors.primary} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
      <TextField value={value ?? ""} onChangeText={onChange} placeholder="Or type a custom path, e.g. /shop" colors={colors} />
    </View>
  );
}

export function ProductSelect({ value, onChange, colors }: { value: string; onChange: (v: string) => void; colors: ColorScheme }) {
  return (
    <View style={ef.chipRow}>
      {products.map((p) => (
        <TouchableOpacity
          key={p.slug}
          onPress={() => onChange(p.slug)}
          style={[ef.chip, { borderColor: value === p.slug ? colors.primary : colors.border }]}
        >
          <Text style={{ fontSize: 11, color: colors.foreground }}>{p.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function SwitchRow({ label, value, onValueChange, colors }: { label: string; value: boolean; onValueChange: (v: boolean) => void; colors: ColorScheme }) {
  return (
    <View style={ef.switchRow}>
      <Text style={{ color: colors.foreground, fontSize: 14 }}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

export function PxStepper({
  label,
  value,
  max = 160,
  step = 4,
  onChange,
  onClear,
  colors,
}: {
  label: string;
  value?: number;
  max?: number;
  step?: number;
  onChange: (v: number | undefined) => void;
  onClear?: () => void;
  colors: ColorScheme;
}) {
  const v = value ?? 0;
  return (
    <View style={ef.pxRow}>
      <Text style={[ef.pxLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={ef.pxControls}>
        <TouchableOpacity onPress={() => onChange(Math.max(0, v - step))} style={[ef.pxBtn, { borderColor: colors.border }]}>
          <Feather name="minus" size={14} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[ef.pxVal, { color: colors.foreground }]}>{value != null ? `${value}px` : "—"}</Text>
        <TouchableOpacity onPress={() => onChange(Math.min(max, v + step))} style={[ef.pxBtn, { borderColor: colors.border }]}>
          <Feather name="plus" size={14} color={colors.foreground} />
        </TouchableOpacity>
        {value != null && onClear ? (
          <TouchableOpacity onPress={onClear}>
            <Feather name="x" size={14} color={colors.destructive} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

/**
 * A draggable slider for any "pick a number in a range" control — corner
 * radius, opacity, spacing, etc. Built on the same bare PanResponder pattern
 * already used for the inspector sheet's drag-to-close gesture (StoreEditor.tsx)
 * rather than a dedicated slider library, since this app ships JS-only updates
 * via `eas update` — a new native dependency would force a full rebuild instead.
 */
export function SliderControl({
  label,
  value,
  min = 0,
  max = 60,
  step = 1,
  unit = "px",
  formatValue,
  onChange,
  colors,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** Overrides the default `${value}${unit}` display, e.g. to show "Full" at the top of the range. */
  formatValue?: (v: number) => string;
  onChange: (v: number) => void;
  colors: ColorScheme;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragValue, setDragValue] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const trackWidthRef = useRef(0);
  const displayValue = dragValue ?? value;

  const valueFromX = (x: number, w: number) => {
    const ratio = Math.max(0, Math.min(1, x / w));
    const raw = min + ratio * (max - min);
    const stepped = Math.round(raw / step) * step;
    return Math.max(min, Math.min(max, stepped));
  };

  const handleTouch = (locationX: number) => {
    const w = trackWidthRef.current;
    if (!w) return;
    const v = valueFromX(locationX, w);
    setDragValue(v);
    onChange(v);
  };

  // This lives inside ScrollViews throughout the editor. Claiming the responder
  // on touch-down (onStartShouldSetResponder: true) meant a scroll gesture that
  // merely started on top of the slider got hijacked the instant the finger
  // landed, before any movement direction was known — the scroll stopped and
  // the slider silently jumped to wherever the touch happened to be. Only
  // claiming once the move is clearly more horizontal than vertical (a real
  // drag along the track) lets an accidental touch-during-scroll pass through
  // to the ScrollView untouched, the way a native slider would behave.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderGrant: (e) => { setDragging(true); handleTouch(e.nativeEvent.locationX); },
      onPanResponderMove: (e) => handleTouch(e.nativeEvent.locationX),
      onPanResponderRelease: () => { setDragValue(null); setDragging(false); },
      onPanResponderTerminate: () => { setDragValue(null); setDragging(false); },
    })
  ).current;

  const pct = max > min ? ((displayValue - min) / (max - min)) * 100 : 0;

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={[ef.pxLabel, { color: colors.mutedForeground, marginBottom: 0 }]}>{label}</Text>
        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground, fontVariant: ["tabular-nums"] }}>
          {formatValue ? formatValue(displayValue) : `${displayValue}${unit}`}
        </Text>
      </View>
      <View
        onLayout={(e) => { setTrackWidth(e.nativeEvent.layout.width); trackWidthRef.current = e.nativeEvent.layout.width; }}
        {...panResponder.panHandlers}
        // A bigger invisible hit area than the visual track makes the thumb easier
        // to grab without enlarging the slider itself.
        hitSlop={{ top: 12, bottom: 12 }}
        style={{ height: 28, justifyContent: "center", opacity: dragging ? 0.9 : 1 }}
      >
        <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.border }}>
          <View style={{ height: 4, borderRadius: 2, width: `${pct}%`, backgroundColor: colors.primary }} />
        </View>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: `${pct}%`,
            marginLeft: -10,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: colors.primary,
            borderWidth: 2,
            borderColor: colors.card,
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          }}
        />
      </View>
    </View>
  );
}

/**
 * Corner-radius specific slider — 0..max px, plus a "Pill" toggle for the
 * fully-rounded case (a plain 0..max slider can't reach a meaningful "pill"
 * value since that depends on the element's own height). undefined reads as 0.
 */
export function RadiusSlider({
  label = "Rounded corners",
  value,
  max = 60,
  onChange,
  colors,
  /** Show an "Inherit" option that clears back to undefined — for fields where
   * unset has a real, distinct meaning ("use the theme default") rather than
   * just meaning 0. Off by default: most call sites treat unset as 0 anyway. */
  allowClear = false,
}: {
  label?: string;
  value: number | undefined;
  max?: number;
  onChange: (v: number | undefined) => void;
  colors: ColorScheme;
  allowClear?: boolean;
}) {
  const isPill = (value ?? 0) >= 9999;
  const isInherited = allowClear && value == null;
  return (
    <View style={{ gap: 8 }}>
      {isPill ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={[ef.pxLabel, { color: colors.mutedForeground, marginBottom: 0 }]}>{label}</Text>
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground }}>Pill</Text>
        </View>
      ) : (
        <SliderControl
          label={label}
          value={isInherited ? 0 : Math.min(max, value ?? 0)}
          min={0}
          max={max}
          onChange={onChange}
          colors={colors}
          formatValue={isInherited ? () => "Inherit" : undefined}
        />
      )}
      <View style={{ flexDirection: "row", gap: 6 }}>
        <TouchableOpacity
          onPress={() => onChange(isPill ? 0 : 9999)}
          style={[ef.chip, { borderColor: isPill ? colors.primary : colors.border, backgroundColor: isPill ? colors.primary + "18" : "transparent" }]}
        >
          <Text style={{ fontSize: 12, color: colors.foreground, fontWeight: isPill ? "600" : "400" }}>
            {isPill ? "✓ Pill (fully rounded)" : "Make it a pill"}
          </Text>
        </TouchableOpacity>
        {allowClear && (
          <TouchableOpacity
            onPress={() => onChange(undefined)}
            style={[ef.chip, { borderColor: isInherited ? colors.primary : colors.border, backgroundColor: isInherited ? colors.primary + "18" : "transparent" }]}
          >
            <Text style={{ fontSize: 12, color: colors.foreground, fontWeight: isInherited ? "600" : "400" }}>
              {isInherited ? "✓ Inherit" : "Reset to inherit"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export function ColorField({ label, value, onChange, colors }: { label: string; value?: string; onChange: (v: string | undefined) => void; colors: ColorScheme }) {
  const presets = ["#ffffff", "#000000", "#171717", "#6366f1", "#16a34a", "#dc2626", "#c9a96e", "#2563eb"];
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{label}</Text>
      <TextField value={value ?? ""} onChangeText={(t) => onChange(t || undefined)} placeholder="#hex" colors={colors} />
      <View style={ef.chipRow}>
        {presets.map((c) => (
          <TouchableOpacity key={c} onPress={() => onChange(c)} style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: c, borderWidth: value === c ? 2 : 1, borderColor: colors.primary }} />
        ))}
      </View>
    </View>
  );
}

// ─── FontSelect ───────────────────────────────────────────────────────────────
// Dropdown-style font picker. Each option is rendered in its own typeface so the
// vendor sees exactly what each font looks like before picking.

export const FONT_OPTIONS: Array<{ key: string; label: string; sub?: string; fontFamily?: string }> = [
  // System fallbacks
  { key: "sans",      label: "Sans-Serif",         sub: "Clean & modern (default)",          fontFamily: undefined },
  { key: "serif",     label: "Classic Serif",       sub: "Traditional elegance",              fontFamily: undefined },
  // Serifs — editorial / luxury
  { key: "playfair",  label: "Playfair Display",    sub: "Luxury editorial serif",            fontFamily: "PlayfairDisplay_700Bold" },
  { key: "lora",      label: "Lora",                sub: "Literary, warm serif",              fontFamily: "Lora_400Regular" },
  { key: "cormorant", label: "Cormorant Garamond",  sub: "Ultra-elegant, high fashion",       fontFamily: "CormorantGaramond_700Bold" },
  { key: "cinzel",    label: "Cinzel",              sub: "Roman-inspired, premium brands",    fontFamily: "Cinzel_700Bold" },
  // Sans-serifs — modern / fashion
  { key: "poppins",   label: "Poppins",             sub: "Geometric, friendly",               fontFamily: "Poppins_600SemiBold" },
  { key: "raleway",   label: "Raleway",             sub: "Thin, fashion-forward",             fontFamily: "Raleway_600SemiBold" },
  { key: "josefin",   label: "Josefin Sans",        sub: "Geometric, stylish",                fontFamily: "JosefinSans_600SemiBold" },
  { key: "oswald",    label: "Oswald",              sub: "Condensed, strong display",         fontFamily: "Oswald_700Bold" },
  { key: "montserrat",label: "Montserrat",          sub: "Clean, versatile modern",           fontFamily: "Montserrat_700Bold" },
  // Scripts / calligraphy
  { key: "dancing",   label: "Dancing Script",      sub: "Flowing handwriting",               fontFamily: "DancingScript_700Bold" },
  { key: "greatvibes",label: "Great Vibes",         sub: "Formal calligraphy",                fontFamily: "GreatVibes_400Regular" },
  { key: "satisfy",   label: "Satisfy",             sub: "Casual flowing script",             fontFamily: "Satisfy_400Regular" },
  { key: "sacramento",label: "Sacramento",          sub: "Ultra-thin elegant script",         fontFamily: "Sacramento_400Regular" },
  { key: "pacifico",  label: "Pacifico",            sub: "Fun rounded script",                fontFamily: "Pacifico_400Regular" },
  { key: "lobster",   label: "Lobster",             sub: "Retro bold script",                 fontFamily: "Lobster_400Regular" },
  // Fashion / condensed display
  { key: "bebas",     label: "Bebas Neue",          sub: "Condensed all-caps — streetwear",   fontFamily: "BebasNeue_400Regular" },
  { key: "barlow",    label: "Barlow Condensed",    sub: "Condensed editorial sans",          fontFamily: "BarlowCondensed_700Bold" },
  { key: "righteous", label: "Righteous",           sub: "Bold rounded display",              fontFamily: "Righteous_400Regular" },
  { key: "abril",     label: "Abril Fatface",       sub: "High-contrast bold display",        fontFamily: "AbrilFatface_400Regular" },
  // Rounded / friendly
  { key: "nunito",    label: "Nunito",              sub: "Rounded friendly geometric",        fontFamily: "Nunito_700Bold" },
];

export const BRAND_FONT_OPTIONS: Array<{ key: string | undefined; label: string; fontFamily?: string }> = [
  { key: undefined,    label: "Default (matches heading font)",  fontFamily: undefined },
  { key: "playfair",   label: "Playfair Display",               fontFamily: "PlayfairDisplay_700Bold" },
  { key: "lora",       label: "Lora",                           fontFamily: "Lora_700Bold" },
  { key: "cormorant",  label: "Cormorant Garamond",             fontFamily: "CormorantGaramond_700Bold" },
  { key: "cinzel",     label: "Cinzel",                         fontFamily: "Cinzel_700Bold" },
  { key: "poppins",    label: "Poppins",                        fontFamily: "Poppins_700Bold" },
  { key: "raleway",    label: "Raleway",                        fontFamily: "Raleway_700Bold" },
  { key: "josefin",    label: "Josefin Sans",                   fontFamily: "JosefinSans_700Bold" },
  { key: "oswald",     label: "Oswald",                         fontFamily: "Oswald_700Bold" },
  { key: "montserrat", label: "Montserrat",                     fontFamily: "Montserrat_700Bold" },
  { key: "dancing",    label: "Dancing Script",                 fontFamily: "DancingScript_700Bold" },
  { key: "greatvibes", label: "Great Vibes",                    fontFamily: "GreatVibes_400Regular" },
  { key: "satisfy",    label: "Satisfy",                        fontFamily: "Satisfy_400Regular" },
  { key: "sacramento", label: "Sacramento",                     fontFamily: "Sacramento_400Regular" },
  { key: "pacifico",   label: "Pacifico",                       fontFamily: "Pacifico_400Regular" },
  { key: "lobster",    label: "Lobster",                        fontFamily: "Lobster_400Regular" },
  { key: "bebas",      label: "Bebas Neue",                     fontFamily: "BebasNeue_400Regular" },
  { key: "barlow",     label: "Barlow Condensed",               fontFamily: "BarlowCondensed_700Bold" },
  { key: "righteous",  label: "Righteous",                      fontFamily: "Righteous_400Regular" },
  { key: "abril",      label: "Abril Fatface",                  fontFamily: "AbrilFatface_400Regular" },
  { key: "nunito",     label: "Nunito",                         fontFamily: "Nunito_700Bold" },
];

export function FontSelect({
  value,
  onChange,
  options = FONT_OPTIONS,
  colors,
  nullable,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  options?: Array<{ key: string | undefined; label: string; sub?: string; fontFamily?: string }>;
  colors: ColorScheme;
  nullable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const active = options.find((o) => o.key === (value ?? (nullable ? undefined : "sans"))) ?? options[0];

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[ef.selectBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
        activeOpacity={0.8}
      >
        <Text
          style={{
            flex: 1,
            fontSize: 15,
            color: colors.foreground,
            fontFamily: active.fontFamily ?? undefined,
            fontWeight: active.fontFamily ? "normal" : "400",
          }}
          numberOfLines={1}
        >
          {active.label}
        </Text>
        <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={[ef.selectSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>Choose font</Text>
          </View>
          <FlatList
            data={options}
            keyExtractor={(o, i) => `${i}-${String(o.key ?? "null")}`}
            style={{ maxHeight: 380 }}
            renderItem={({ item: o }) => {
              const sel = (value ?? (nullable ? undefined : "sans")) === o.key;
              return (
                <TouchableOpacity
                  onPress={() => { onChange(o.key); setOpen(false); }}
                  style={[ef.selectItem, { borderBottomColor: colors.border, backgroundColor: sel ? colors.primary + "12" : "transparent" }]}
                  activeOpacity={0.75}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        color: sel ? colors.primary : colors.foreground,
                        fontFamily: o.fontFamily ?? undefined,
                        fontWeight: o.fontFamily ? "normal" : sel ? "700" : "400",
                      }}
                    >
                      {o.label}
                    </Text>
                    {"sub" in o && (o as any).sub ? (
                      <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                        {(o as any).sub}
                      </Text>
                    ) : null}
                  </View>
                  {sel && <Feather name="check" size={16} color={colors.primary} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

const ef = StyleSheet.create({
  field: { marginBottom: 14 },
  label: { fontSize: 12, marginBottom: 6, fontWeight: "500" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  pxRow: { marginBottom: 8 },
  pxLabel: { fontSize: 11, marginBottom: 4 },
  pxControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  pxBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  pxVal: { minWidth: 48, textAlign: "center", fontSize: 12, fontVariant: ["tabular-nums"] },
  selectBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  selectSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTopWidth: 1, marginTop: "auto" },
  selectItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});
