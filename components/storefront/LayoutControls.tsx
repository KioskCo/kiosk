import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { SECTION_VARIANTS, type FontHeading, type Padding, type Section } from "@/lib/storefront";
import {
  DEFAULT_ELEMENT_TARGETS,
  GRADIENT_PRESETS,
  RADIUS_PRESETS,
  SECTION_ELEMENT_TARGETS,
  SHADOW_PRESETS,
  SELF_PADDED_TYPES,
  type StyleTarget,
} from "./editor-constants";
import {
  ChipRow,
  ColorField,
  Field,
  FontSelect,
  FONT_OPTIONS,
  ImageField,
  PxStepper,
  SwitchRow,
  TextField,
  type ColorScheme,
} from "./editor-fields";

// Element-level font options (superset of heading fonts + Inter variants + mono)
const ELEMENT_FONT_OPTIONS: Array<{ key: string | undefined; label: string; sub?: string; fontFamily?: string }> = [
  { key: undefined,               label: "Inherit",              sub: "Use global heading/body font",          fontFamily: undefined },
  { key: "Inter_400Regular",      label: "Inter",                sub: "Clean default UI font",                 fontFamily: "Inter_400Regular" },
  { key: "Inter_700Bold",         label: "Inter Bold",           sub: "Same as Inter but heavier",             fontFamily: "Inter_700Bold" },
  { key: "serif",                 label: "System Serif",         sub: "Device default serif",                  fontFamily: undefined },
  { key: "monospace",             label: "Monospace",            sub: "Device default monospace",              fontFamily: undefined },
  { key: "PlayfairDisplay_700Bold",  label: "Playfair Display",  sub: "Luxury editorial serif",                fontFamily: "PlayfairDisplay_700Bold" },
  { key: "Lora_400Regular",          label: "Lora",              sub: "Literary, warm serif",                  fontFamily: "Lora_400Regular" },
  { key: "CormorantGaramond_700Bold",label: "Cormorant Garamond",sub: "Ultra-elegant, high fashion",           fontFamily: "CormorantGaramond_700Bold" },
  { key: "Cinzel_700Bold",           label: "Cinzel",            sub: "Roman-inspired, premium",               fontFamily: "Cinzel_700Bold" },
  { key: "Poppins_600SemiBold",      label: "Poppins",           sub: "Geometric, friendly",                   fontFamily: "Poppins_600SemiBold" },
  { key: "Raleway_600SemiBold",      label: "Raleway",           sub: "Thin, fashion-forward",                 fontFamily: "Raleway_600SemiBold" },
  { key: "JosefinSans_600SemiBold",  label: "Josefin Sans",      sub: "Geometric, stylish",                    fontFamily: "JosefinSans_600SemiBold" },
  { key: "Oswald_700Bold",           label: "Oswald",            sub: "Condensed strong display",              fontFamily: "Oswald_700Bold" },
  { key: "Montserrat_700Bold",       label: "Montserrat",        sub: "Clean versatile modern",                fontFamily: "Montserrat_700Bold" },
  { key: "DancingScript_700Bold",    label: "Dancing Script",    sub: "Flowing handwriting / calligraphy",     fontFamily: "DancingScript_700Bold" },
  { key: "GreatVibes_400Regular",    label: "Great Vibes",       sub: "Formal calligraphy script",             fontFamily: "GreatVibes_400Regular" },
  { key: "Pacifico_400Regular",      label: "Pacifico",          sub: "Fun rounded script",                    fontFamily: "Pacifico_400Regular" },
  { key: "AbrilFatface_400Regular",  label: "Abril Fatface",     sub: "Bold editorial display",                fontFamily: "AbrilFatface_400Regular" },
];

// Curated Ionicons for section elements
const KIOSK_ICONS = [
  "arrow-forward", "arrow-back", "arrow-up", "arrow-down", "chevron-forward",
  "star", "heart", "bag", "cart", "checkmark-circle", "close-circle",
  "flash", "flame", "trophy", "gift", "ribbon", "sparkles",
  "home", "search", "mail", "call", "location", "globe",
  "play", "camera", "musical-notes", "cube", "car", "pricetag",
  "person", "people", "lock-open", "shield-checkmark", "key",
  "sunny", "moon", "leaf", "cafe",
] as const;

type KioskIconDef = { name: string; lib: "ionicon"; pos: "left" | "right"; size?: number };

export function LayoutControls({
  section,
  onChange,
  colors,
}: {
  section: Section;
  onChange: (patch: Partial<Section>) => void;
  colors: ColorScheme;
}) {
  const [target, setTarget] = useState<StyleTarget>("section");
  const variants = SECTION_VARIANTS[section.type];
  const elStyles = (section.elStyles ?? {}) as Record<string, Record<string, string | number>>;
  const elCustomCss = (section.elCustomCss ?? {}) as Record<string, string>;
  const elIcons = (section.elIcons ?? {}) as Record<string, KioskIconDef | undefined>;

  const elementTargets = SECTION_ELEMENT_TARGETS[section.type] ?? DEFAULT_ELEMENT_TARGETS;
  const targets: { id: StyleTarget; label: string }[] = [{ id: "section", label: "Section" }, ...elementTargets];

  const patchEl = (el: string, patch: Record<string, string | number>) =>
    onChange({ elStyles: { ...elStyles, [el]: { ...(elStyles[el] ?? {}), ...patch } } });

  const patchElIcon = (el: string, icon: KioskIconDef | undefined) =>
    onChange({ elIcons: { ...elIcons, [el]: icon } });

  return (
    <View style={{ gap: 0 }}>
      {/* Element selector — horizontal tab bar */}
      <Text style={[lc.head, { color: colors.mutedForeground, marginBottom: 8 }]}>Which part to style</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={lc.targetScroll} contentContainerStyle={lc.targetScrollContent}>
        {targets.map(({ id, label }) => {
          const active = target === id;
          return (
            <TouchableOpacity
              key={id}
              onPress={() => setTarget(id)}
              style={[lc.targetTab, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : "transparent" }]}
            >
              <Text style={{ fontSize: 12, color: active ? "#fff" : colors.foreground, fontWeight: active ? "600" : "400" }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[lc.panel, { borderColor: colors.border }]}>
        {target === "section" ? (
          <SectionLayoutControls section={section} onChange={onChange} variants={variants} colors={colors} />
        ) : (
          <ElementStyleControls
            elKey={target}
            styles={elStyles[target]}
            customCss={elCustomCss[target]}
            onPatch={(p) => patchEl(target, p)}
            onCss={(css) => onChange({ elCustomCss: { ...elCustomCss, [target]: css || undefined } })}
            onClearAll={() =>
              onChange({
                elStyles: { ...elStyles, [target]: undefined },
                elCustomCss: { ...elCustomCss, [target]: undefined },
              })
            }
            icon={elIcons[target]}
            onIconChange={(ic) => patchElIcon(target, ic)}
            colors={colors}
          />
        )}
      </View>
    </View>
  );
}

function SectionLayoutControls({
  section,
  onChange,
  variants,
  colors,
}: {
  section: Section;
  onChange: (patch: Partial<Section>) => void;
  variants?: string[];
  colors: ColorScheme;
}) {
  const [showCss, setShowCss] = useState(false);
  return (
    <View style={{ gap: 4 }}>
      {variants && variants.length > 0 ? (
        <Field label="Block layout" colors={colors}>
          <ChipRow
            options={variants.map((v) => ({ value: v, label: v }))}
            value={section.variant}
            onChange={(v) => onChange({ variant: v })}
            colors={colors}
          />
        </Field>
      ) : null}

      {!SELF_PADDED_TYPES.has(section.type) ? (
        <>
          <Field label="Padding preset" colors={colors}>
            <ChipRow
              options={[
                { value: "none" as Padding, label: "None" },
                { value: "sm" as Padding, label: "Small" },
                { value: "md" as Padding, label: "Medium" },
                { value: "lg" as Padding, label: "Large" },
              ]}
              value={section.padding ?? "md"}
              onChange={(v) => onChange({ padding: v })}
              colors={colors}
            />
          </Field>
          <Field label="Background preset" colors={colors}>
            <ChipRow
              options={[
                { value: "default", label: "Default" },
                { value: "muted", label: "Muted" },
                { value: "primary", label: "Primary" },
              ]}
              value={section.background ?? "default"}
              onChange={(v) => onChange({ background: v === "default" ? undefined : (v as "muted" | "primary") })}
              colors={colors}
            />
          </Field>
        </>
      ) : null}

      <Field label="Text size" colors={colors}>
        <ChipRow
          options={[
            { value: "sm", label: "Small" },
            { value: "md", label: "Medium" },
            { value: "lg", label: "Large" },
            { value: "xl", label: "Extra large" },
          ]}
          value={section.fontSize ?? "md"}
          onChange={(v) => onChange({ fontSize: v === "md" ? undefined : v })}
          colors={colors}
        />
      </Field>

      <Text style={[lc.sub, { color: colors.mutedForeground }]}>Fine-tune spacing inside</Text>
      <PxStepper label="Top" value={section.paddingTopPx} onChange={(v) => onChange({ paddingTopPx: v || undefined })} onClear={() => onChange({ paddingTopPx: undefined })} colors={colors} />
      <PxStepper label="Bottom" value={section.paddingBottomPx} onChange={(v) => onChange({ paddingBottomPx: v || undefined })} onClear={() => onChange({ paddingBottomPx: undefined })} colors={colors} />
      <PxStepper label="Left" value={section.paddingLeftPx} onChange={(v) => onChange({ paddingLeftPx: v || undefined })} onClear={() => onChange({ paddingLeftPx: undefined })} colors={colors} />
      <PxStepper label="Right" value={section.paddingRightPx} onChange={(v) => onChange({ paddingRightPx: v || undefined })} onClear={() => onChange({ paddingRightPx: undefined })} colors={colors} />

      <Text style={[lc.sub, { color: colors.mutedForeground }]}>Gap around block</Text>
      <PxStepper label="Top" value={section.marginTopPx} onChange={(v) => onChange({ marginTopPx: v || undefined })} onClear={() => onChange({ marginTopPx: undefined })} colors={colors} />
      <PxStepper label="Bottom" value={section.marginBottomPx} onChange={(v) => onChange({ marginBottomPx: v || undefined })} onClear={() => onChange({ marginBottomPx: undefined })} colors={colors} />

      <PxStepper label="Block height" value={section.minHeight} max={800} step={20} onChange={(v) => onChange({ minHeight: v || undefined })} onClear={() => onChange({ minHeight: undefined })} colors={colors} />

      <Field label="Text alignment" colors={colors}>
        <ChipRow
          options={[
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ]}
          value={section.textAlign}
          onChange={(v) => onChange({ textAlign: v })}
          colors={colors}
        />
      </Field>

      <ColorField label="Background" value={section.bgColor} onChange={(v) => onChange({ bgColor: v })} colors={colors} />
      <ColorField label="Text" value={section.textColor} onChange={(v) => onChange({ textColor: v })} colors={colors} />
      <ColorField label="Heading" value={section.headingColor} onChange={(v) => onChange({ headingColor: v })} colors={colors} />
      <ColorField label="Accent / buttons" value={section.accentColor} onChange={(v) => onChange({ accentColor: v })} colors={colors} />

      <Field label="Background gradient" colors={colors}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {GRADIENT_PRESETS.map((g) => (
            <TouchableOpacity key={g.label} onPress={() => onChange({ bgGradient: g.v || undefined })} style={[lc.gradChip, { borderColor: (section.bgGradient ?? "") === g.v ? colors.primary : colors.border }]}>
              <Text style={{ fontSize: 10 }}>{g.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextField value={section.bgGradient ?? ""} onChangeText={(t) => onChange({ bgGradient: t || undefined })} placeholder="Custom gradient code" colors={colors} />
      </Field>

      <Field label="Background image" colors={colors}>
        <ImageField value={section.bgImage ?? ""} onChange={(v) => onChange({ bgImage: v || undefined })} colors={colors} />
      </Field>
      {section.bgImage ? (
        <Field label={`Overlay darkness: ${section.bgOpacity ?? 0}%`} colors={colors}>
          <PxStepper label="Opacity" value={section.bgOpacity ?? 0} max={100} step={5} onChange={(v) => onChange({ bgOpacity: v })} colors={colors} />
        </Field>
      ) : null}

      <Field label="Rounded corners" colors={colors}>
        <ChipRow
          options={RADIUS_PRESETS.map((r) => ({ value: String(r), label: r >= 9999 ? "Full" : `${r}px` }))}
          value={section.borderRadius != null ? String(section.borderRadius) : "0"}
          onChange={(v) => onChange({ borderRadius: v ? Number(v) : undefined })}
          colors={colors}
        />
      </Field>

      <Field label="Shadow" colors={colors}>
        <ChipRow
          options={SHADOW_PRESETS.map((s) => ({ value: s.v ?? "none", label: s.label }))}
          value={section.shadow ?? "none"}
          onChange={(v) => onChange({ shadow: v === "none" ? undefined : (v as Section["shadow"]) })}
          colors={colors}
        />
      </Field>

      <Field label={`Transparency: ${section.sectionOpacity ?? 100}%`} colors={colors}>
        <PxStepper
          label="Opacity"
          value={section.sectionOpacity ?? 100}
          max={100}
          step={5}
          onChange={(v) => onChange({ sectionOpacity: v === 100 ? undefined : v })}
          colors={colors}
        />
      </Field>

      <Field label="Heading font (this section only)" colors={colors}>
        <FontSelect
          value={(section as any).headingFont ?? ""}
          onChange={(v) => onChange({ headingFont: (v || undefined) as FontHeading | undefined } as any)}
          options={[{ key: "", label: "Inherit global font", sub: "Uses the Typography setting", fontFamily: undefined }, ...FONT_OPTIONS.slice(1)]}
          colors={colors}
          nullable
        />
      </Field>

      <Field label="Entrance animation" colors={colors}>
        <ChipRow
          options={[
            { value: "none", label: "None" },
            { value: "fadeIn", label: "Fade" },
            { value: "slideUp", label: "Rise" },
            { value: "slideLeft", label: "← Slide" },
            { value: "slideRight", label: "Slide →" },
            { value: "zoomIn", label: "Zoom" },
          ]}
          value={section.animation ?? "none"}
          onChange={(v) => onChange({ animation: v === "none" ? undefined : (v as any) })}
          colors={colors}
        />
        <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 6 }}>
          Reveals on scroll-down · resets when you scroll back up
        </Text>
      </Field>

      <SwitchRow
        label="Parallax depth"
        value={(section as any).parallax === true}
        onValueChange={(v) => onChange({ parallax: v || undefined } as any)}
        colors={colors}
      />

      <Field label="Borders" colors={colors}>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <TouchableOpacity onPress={() => onChange({ borderTop: !section.borderTop })} style={lc.borderToggle}>
            <Feather name={section.borderTop ? "check-square" : "square"} size={16} color={colors.primary} />
            <Text style={{ color: colors.foreground, fontSize: 13 }}>Top</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onChange({ borderBottom: !section.borderBottom })} style={lc.borderToggle}>
            <Feather name={section.borderBottom ? "check-square" : "square"} size={16} color={colors.primary} />
            <Text style={{ color: colors.foreground, fontSize: 13 }}>Bottom</Text>
          </TouchableOpacity>
        </View>
        {(section.borderTop || section.borderBottom) && (
          <ColorField label="Border color" value={section.borderColor} onChange={(v) => onChange({ borderColor: v })} colors={colors} />
        )}
      </Field>

      <TouchableOpacity onPress={() => setShowCss(!showCss)} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
        <Feather name={showCss ? "chevron-down" : "chevron-right"} size={14} color={colors.mutedForeground} />
        <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Advanced CSS</Text>
      </TouchableOpacity>
      {showCss && (
        <Field label="Custom CSS" colors={colors}>
          <TextField
            value={section.customCss ?? ""}
            onChangeText={(t) => onChange({ customCss: t || undefined })}
            multiline
            placeholder="display: flex;&#10;gap: 16px;"
            colors={colors}
          />
          {section.customCss ? (
            <TouchableOpacity onPress={() => onChange({ customCss: undefined })}>
              <Text style={{ color: colors.destructive, fontSize: 12 }}>Clear custom CSS</Text>
            </TouchableOpacity>
          ) : null}
        </Field>
      )}
    </View>
  );
}

function ElementStyleControls({
  elKey, styles, customCss, onPatch, onCss, onClearAll, icon, onIconChange, colors,
}: {
  elKey: string;
  styles?: Record<string, string | number>;
  customCss?: string;
  onPatch: (p: Record<string, string | number>) => void;
  onCss: (css: string) => void;
  onClearAll: () => void;
  icon?: KioskIconDef;
  onIconChange?: (ic: KioskIconDef | undefined) => void;
  colors: ColorScheme;
}) {
  const [showElCss, setShowElCss] = useState(false);
  const s = styles ?? {};
  const isTextEl = ["heading", "body", "button", "subheading", "eyebrow", "price", "productTitle"].includes(elKey);
  const isButtonEl = elKey === "button";
  const isHeadingEl = ["heading", "eyebrow", "subheading", "productTitle"].includes(elKey);
  const isContainerEl = ["productCard", "card", "image"].includes(elKey);

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Style overrides for <Text style={{ fontWeight: "600" }}>{elKey}</Text></Text>

      {/* Font family */}
      {isTextEl && (
        <Field label="Font family" colors={colors}>
          <FontSelect
            value={(s.fontFamily ?? undefined) as string | undefined}
            onChange={(v) => onPatch({ fontFamily: v ?? "" })}
            options={ELEMENT_FONT_OPTIONS}
            colors={colors}
            nullable
          />
        </Field>
      )}

      {/* Container elements (cards, images) — show background / border controls */}
      {isContainerEl ? (
        <>
          <ColorField label="Background color" value={String(s.backgroundColor ?? "")} onChange={(v) => onPatch({ backgroundColor: v ?? "" })} colors={colors} />
          <ColorField label="Text color" value={String(s.color ?? "")} onChange={(v) => onPatch({ color: v ?? "" })} colors={colors} />
          <Field label="Rounded corners" colors={colors}>
            <ChipRow
              options={[{ value: "0", label: "None" }, { value: "6", label: "Small" }, { value: "12", label: "Medium" }, { value: "20", label: "Large" }, { value: "9999", label: "Pill" }]}
              value={s.borderRadius != null ? String(s.borderRadius) : undefined}
              onChange={(v) => onPatch({ borderRadius: v ? Number(v) : 0 })}
              colors={colors}
            />
          </Field>
          <ColorField label="Border color" value={String(s.borderColor ?? "")} onChange={(v) => onPatch({ borderColor: v ?? "" })} colors={colors} />
          <Field label="Border width" colors={colors}>
            <ChipRow
              options={[{ value: "0", label: "None" }, { value: "1", label: "1px" }, { value: "2", label: "2px" }, { value: "3", label: "3px" }]}
              value={s.borderWidth != null ? String(s.borderWidth) : "0"}
              onChange={(v) => onPatch({ borderWidth: Number(v) || 0 })}
              colors={colors}
            />
          </Field>
          <Field label="Padding" colors={colors}>
            <ChipRow
              options={[{ value: "0", label: "None" }, { value: "8", label: "8px" }, { value: "12", label: "12px" }, { value: "16", label: "16px" }, { value: "24", label: "24px" }]}
              value={s.padding != null ? String(s.padding) : "0"}
              onChange={(v) => onPatch({ padding: Number(v) || 0 })}
              colors={colors}
            />
          </Field>
          <Field label="Shadow" colors={colors}>
            <ChipRow
              options={[{ value: "none", label: "None" }, { value: "sm", label: "Soft" }, { value: "md", label: "Medium" }, { value: "lg", label: "Strong" }]}
              value={String(s._shadow ?? "none")}
              onChange={(v) => {
                const shadowMap: Record<string, Record<string, any>> = {
                  none: { elevation: 0, shadowOpacity: 0 },
                  sm: { elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
                  md: { elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8 },
                  lg: { elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 16 },
                };
                if (v) onPatch({ ...(shadowMap[v] ?? {}), _shadow: v });
              }}
              colors={colors}
            />
          </Field>
        </>
      ) : isButtonEl ? (
        <>
          <ColorField label="Button background" value={String(s.backgroundColor ?? "")} onChange={(v) => onPatch({ backgroundColor: v ?? "" })} colors={colors} />
          <ColorField label="Button text color" value={String(s.color ?? "")} onChange={(v) => onPatch({ color: v ?? "" })} colors={colors} />
          <Field label="Rounded corners" colors={colors}>
            <ChipRow
              options={[{ value: "0", label: "Sharp" }, { value: "6", label: "Small" }, { value: "12", label: "Medium" }, { value: "24", label: "Large" }, { value: "9999", label: "Pill" }]}
              value={s.borderRadius != null ? String(s.borderRadius) : undefined}
              onChange={(v) => onPatch({ borderRadius: v ? Number(v) : 0 })}
              colors={colors}
            />
          </Field>
          <ColorField label="Border color" value={String(s.borderColor ?? "")} onChange={(v) => onPatch({ borderColor: v ?? "" })} colors={colors} />
        </>
      ) : (
        <ColorField label="Color" value={String(s.color ?? "")} onChange={(v) => onPatch({ color: v ?? "" })} colors={colors} />
      )}

      {/* Typography controls for text elements */}
      {isTextEl && (
        <>
          <Field label="Font size (px)" colors={colors}>
            <TextField value={String(s.fontSize ?? "")} onChangeText={(t) => onPatch({ fontSize: t ? Number(t) : "" })} keyboardType="numeric" colors={colors} />
          </Field>
          <Field label="Font weight" colors={colors}>
            <ChipRow
              options={["400", "500", "600", "700", "800"].map((w) => ({ value: w, label: w }))}
              value={String(s.fontWeight ?? "")}
              onChange={(v) => onPatch({ fontWeight: v ?? "" })}
              colors={colors}
            />
          </Field>
        </>
      )}

      {/* Icon picker */}
      {(isButtonEl || isHeadingEl) && onIconChange && (
        <Field label={`Icon (${isButtonEl ? "CTA button" : "heading"})`} colors={colors}>
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", flexWrap: "nowrap", gap: 6, paddingVertical: 2 }}>
                {KIOSK_ICONS.map((name) => {
                  const active = icon?.name === name;
                  return (
                    <TouchableOpacity key={name} onPress={() => onIconChange({ name, lib: "ionicon", pos: icon?.pos ?? "right", size: icon?.size })}
                      style={{ width: 36, height: 36, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center",
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primary + "20" : "transparent" }}>
                      <Ionicons name={name as any} size={16} color={active ? colors.primary : colors.mutedForeground} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            {icon && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
                <Text style={{ fontSize: 10, color: colors.mutedForeground }}>Position:</Text>
                {(["left", "right"] as const).map((pos) => (
                  <TouchableOpacity key={pos} onPress={() => onIconChange({ ...icon, pos })}
                    style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1,
                      borderColor: icon.pos === pos ? colors.primary : colors.border,
                      backgroundColor: icon.pos === pos ? colors.primary + "20" : "transparent" }}>
                    <Text style={{ fontSize: 11, color: icon.pos === pos ? colors.primary : colors.foreground }}>{pos}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => onIconChange(undefined)} style={{ marginLeft: 4 }}>
                  <Text style={{ fontSize: 10, color: colors.destructive }}>Remove icon</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Field>
      )}

      <TouchableOpacity onPress={() => setShowElCss(!showElCss)} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
        <Feather name={showElCss ? "chevron-down" : "chevron-right"} size={14} color={colors.mutedForeground} />
        <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Advanced CSS</Text>
      </TouchableOpacity>
      {showElCss && (
        <Field label="Element custom CSS" colors={colors}>
          <TextField value={customCss ?? ""} onChangeText={onCss} multiline colors={colors} />
        </Field>
      )}
      <TouchableOpacity onPress={onClearAll} style={{ marginTop: 4 }}>
        <Text style={{ color: colors.destructive, fontSize: 12 }}>Clear all {elKey} overrides</Text>
      </TouchableOpacity>
    </View>
  );
}

const lc = StyleSheet.create({
  head: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8 },
  sub: { fontSize: 11, fontWeight: "600", marginTop: 8, marginBottom: 4, color: "#888" },
  targetScroll: { marginBottom: 12 },
  targetScrollContent: { flexDirection: "row", gap: 6, paddingVertical: 2, paddingHorizontal: 0 },
  targetTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  panel: { borderWidth: 1, borderRadius: 12, padding: 12 },
  gradChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  borderToggle: { flexDirection: "row", alignItems: "center", gap: 6 },
});
