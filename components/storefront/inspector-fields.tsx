import { Feather } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { Align9, Section, HeroSection, VideoHeroSection, SocialFeedSection, MapLocationSection, SizeGuideSection, PortfolioSection } from "@/lib/storefront";
import { SECTION_VARIANTS } from "@/lib/storefront/data";
import { RADIUS_PRESETS } from "./editor-constants";
import { products as mockProducts } from "@/lib/storefront/products";
import { useApp } from "@/context/AppContext";
import { CustomSectionEditor } from "./CustomSectionEditor";
import {
  ChipRow,
  Field,
  ImageField,
  LinkField,
  ProductSelect,
  SwitchRow,
  TextField,
  type ColorScheme,
} from "./editor-fields";

function InventoryProductPicker({
  selected,
  onToggle,
  onSelectAll,
  onClear,
  colors,
}: {
  selected: string[];
  onToggle: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClear: () => void;
  colors: ColorScheme;
}) {
  const { products: inventory } = useApp();

  const allItems: { id: string; name: string; source: "inventory" | "demo" }[] = [
    ...inventory.map((p) => ({ id: p.id, name: p.name, source: "inventory" as const })),
    ...mockProducts.map((p) => ({ id: p.slug, name: p.name + " (demo)", source: "demo" as const })),
  ];

  return (
    <View>
      <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {allItems.map((item) => {
            const active = selected.includes(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => onToggle(item.id)}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1,
                  borderColor: active ? colors.primary : item.source === "inventory" ? colors.border : "#ccc",
                  backgroundColor: active ? colors.primary + "18" : item.source === "inventory" ? "transparent" : colors.card + "66",
                }}
              >
                <Text style={{ fontSize: 11, color: active ? colors.primary : colors.foreground }}>
                  {item.source === "inventory" ? "📦 " : ""}{item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
        <TouchableOpacity onPress={() => onSelectAll(inventory.map((p) => p.id))}>
          <Text style={{ color: colors.primary, fontSize: 12 }}>Add all inventory</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClear}>
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const InventoryProductPickerWrapper = InventoryProductPicker;

function Align9Grid({ value, onChange, colors }: { value: Align9; onChange: (v: Align9) => void; colors: ColorScheme }) {
  const cells: Align9[] = [
    "top-left", "top-center", "top-right",
    "middle-left", "middle-center", "middle-right",
    "bottom-left", "bottom-center", "bottom-right",
  ];
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, width: 140 }}>
      {cells.map((c) => (
        <TouchableOpacity
          key={c}
          onPress={() => onChange(c)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: value === c ? colors.primary : colors.border,
            backgroundColor: value === c ? colors.primary + "25" : colors.card,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 8, color: colors.foreground }}>{c.split("-").map((w) => w[0].toUpperCase()).join("")}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function HeroSlidesEditor({
  slides,
  onChange,
  colors,
}: {
  slides: NonNullable<HeroSection["slides"]>;
  onChange: (next: NonNullable<HeroSection["slides"]>) => void;
  colors: ColorScheme;
}) {
  const set = (i: number, patch: Partial<NonNullable<HeroSection["slides"]>[number]>) =>
    onChange(slides.map((sl, j) => (j === i ? { ...sl, ...patch } : sl)));
  return (
    <View style={{ gap: 10 }}>
      {slides.map((slide, i) => (
        <View key={i} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: colors.foreground }}>Slide {i + 1}</Text>
            <TouchableOpacity onPress={() => onChange(slides.filter((_, j) => j !== i))}>
              <Feather name="trash-2" size={16} color={colors.destructive ?? "#ef4444"} />
            </TouchableOpacity>
          </View>
          <Field label="Eyebrow" colors={colors}>
            <TextField value={slide.eyebrow ?? ""} onChangeText={(t) => set(i, { eyebrow: t })} colors={colors} />
          </Field>
          <Field label="Heading" colors={colors}>
            <TextField value={slide.heading ?? ""} onChangeText={(t) => set(i, { heading: t })} colors={colors} />
          </Field>
          <Field label="Body" colors={colors}>
            <TextField value={slide.body ?? ""} onChangeText={(t) => set(i, { body: t })} multiline colors={colors} />
          </Field>
          <Field label="Image" colors={colors}>
            <ImageField value={slide.image ?? ""} onChange={(v) => set(i, { image: v })} colors={colors} />
          </Field>
          <Field label="Button label" colors={colors}>
            <TextField value={slide.ctaLabel ?? ""} onChangeText={(t) => set(i, { ctaLabel: t })} colors={colors} />
          </Field>
          <Field label="Button link" colors={colors}>
            <LinkField value={slide.ctaLink} onChange={(v) => set(i, { ctaLink: v || undefined })} colors={colors} />
          </Field>
        </View>
      ))}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() =>
          onChange([...slides, { heading: `Slide ${slides.length + 1}`, image: "", ctaLabel: "" }])
        }
        style={{ borderWidth: 1, borderStyle: "dashed", borderColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: "center" }}
      >
        <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>+ Add slide</Text>
      </TouchableOpacity>
    </View>
  );
}

export function renderInspectorFields(s: Section, on: (patch: Partial<Section>) => void, colors: ColorScheme) {
  switch (s.type) {
    case "announcement":
      return (
        <>
          <Field label="Text" colors={colors}><TextField value={s.text} onChangeText={(t) => on({ text: t })} colors={colors} /></Field>
          <Field label="Link" colors={colors}><LinkField value={s.link} onChange={(v) => on({ link: v || undefined })} colors={colors} /></Field>
        </>
      );
    case "hero": {
      const heroVariant = s.variant ?? "overlay";
      const isOverlay = heroVariant === "overlay" || heroVariant === "fullscreen";
      const isSplit = heroVariant === "split-right" || heroVariant === "split-left" || heroVariant === "split";
      const isBoxed = heroVariant === "boxed-right" || heroVariant === "boxed-left";
      const isTextOnly = heroVariant === "text-only";
      const isCarousel = heroVariant === "carousel";
      const needsImage = !isTextOnly && !isCarousel;

      const HERO_LAYOUTS: { value: string; label: string; preview: React.ReactNode }[] = [
        {
          value: "overlay",
          label: "Overlay",
          preview: (
            <View style={{ width: 60, height: 40, borderRadius: 6, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flex: 1, backgroundColor: "#6b7280" }} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)", padding: 5, justifyContent: "flex-end" }]}>
                <View style={{ width: "70%", height: 4, backgroundColor: "#fff", borderRadius: 2, marginBottom: 3 }} />
                <View style={{ width: "45%", height: 3, backgroundColor: "rgba(255,255,255,0.6)", borderRadius: 2 }} />
              </View>
            </View>
          ),
        },
        {
          value: "split-right",
          label: "Split →",
          preview: (
            <View style={{ width: 60, height: 40, borderRadius: 6, overflow: "hidden", borderWidth: 1, borderColor: colors.border, flexDirection: "row" }}>
              <View style={{ flex: 1, backgroundColor: colors.card, padding: 5, justifyContent: "center", gap: 3 }}>
                <View style={{ width: "80%", height: 3, backgroundColor: colors.foreground + "80", borderRadius: 2 }} />
                <View style={{ width: "60%", height: 2, backgroundColor: colors.mutedForeground + "60", borderRadius: 2 }} />
                <View style={{ width: 16, height: 5, backgroundColor: colors.primary, borderRadius: 2, marginTop: 2 }} />
              </View>
              <View style={{ flex: 1, backgroundColor: "#9ca3af" }} />
            </View>
          ),
        },
        {
          value: "split-left",
          label: "← Split",
          preview: (
            <View style={{ width: 60, height: 40, borderRadius: 6, overflow: "hidden", borderWidth: 1, borderColor: colors.border, flexDirection: "row" }}>
              <View style={{ flex: 1, backgroundColor: "#9ca3af" }} />
              <View style={{ flex: 1, backgroundColor: colors.card, padding: 5, justifyContent: "center", gap: 3 }}>
                <View style={{ width: "80%", height: 3, backgroundColor: colors.foreground + "80", borderRadius: 2 }} />
                <View style={{ width: "60%", height: 2, backgroundColor: colors.mutedForeground + "60", borderRadius: 2 }} />
                <View style={{ width: 16, height: 5, backgroundColor: colors.primary, borderRadius: 2, marginTop: 2 }} />
              </View>
            </View>
          ),
        },
        {
          value: "stacked",
          label: "Stacked",
          preview: (
            <View style={{ width: 60, height: 40, borderRadius: 6, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
              <View style={{ height: 20, backgroundColor: "#9ca3af" }} />
              <View style={{ flex: 1, backgroundColor: colors.card, paddingHorizontal: 5, paddingVertical: 3, gap: 2 }}>
                <View style={{ width: "70%", height: 3, backgroundColor: colors.foreground + "80", borderRadius: 2 }} />
                <View style={{ width: 14, height: 4, backgroundColor: colors.primary, borderRadius: 2 }} />
              </View>
            </View>
          ),
        },
        {
          value: "text-only",
          label: "Text only",
          preview: (
            <View style={{ width: 60, height: 40, borderRadius: 6, overflow: "hidden", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.primary + "18", padding: 8, justifyContent: "center", alignItems: "center", gap: 3 }}>
              <View style={{ width: "80%", height: 4, backgroundColor: colors.primary + "90", borderRadius: 2 }} />
              <View style={{ width: "60%", height: 3, backgroundColor: colors.mutedForeground + "60", borderRadius: 2 }} />
              <View style={{ width: 20, height: 5, backgroundColor: colors.primary, borderRadius: 2, marginTop: 2 }} />
            </View>
          ),
        },
        {
          value: "fullscreen",
          label: "Fullscreen",
          preview: (
            <View style={{ width: 60, height: 40, borderRadius: 6, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flex: 1, backgroundColor: "#374151" }} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)", padding: 5, justifyContent: "center", alignItems: "center", gap: 3 }]}>
                <View style={{ width: "75%", height: 5, backgroundColor: "#fff", borderRadius: 2 }} />
                <View style={{ width: "50%", height: 3, backgroundColor: "rgba(255,255,255,0.55)", borderRadius: 2 }} />
                <View style={{ width: 24, height: 6, backgroundColor: "#fff", borderRadius: 2, marginTop: 2 }} />
              </View>
            </View>
          ),
        },
        {
          value: "boxed-right",
          label: "Box →",
          preview: (
            <View style={{ width: 60, height: 40, borderRadius: 6, overflow: "hidden", borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", backgroundColor: colors.card, paddingHorizontal: 6, gap: 5 }}>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ width: "90%", height: 4, backgroundColor: colors.foreground + "70", borderRadius: 2 }} />
                <View style={{ width: "70%", height: 3, backgroundColor: colors.mutedForeground + "50", borderRadius: 2 }} />
                <View style={{ width: 18, height: 4, backgroundColor: colors.primary, borderRadius: 2, marginTop: 1 }} />
              </View>
              <View style={{ width: 16, height: 28, borderRadius: 4, backgroundColor: "#9ca3af", overflow: "hidden" }} />
            </View>
          ),
        },
        {
          value: "boxed-left",
          label: "← Box",
          preview: (
            <View style={{ width: 60, height: 40, borderRadius: 6, overflow: "hidden", borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", backgroundColor: colors.card, paddingHorizontal: 6, gap: 5 }}>
              <View style={{ width: 16, height: 28, borderRadius: 4, backgroundColor: "#9ca3af", overflow: "hidden" }} />
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ width: "90%", height: 4, backgroundColor: colors.foreground + "70", borderRadius: 2 }} />
                <View style={{ width: "70%", height: 3, backgroundColor: colors.mutedForeground + "50", borderRadius: 2 }} />
                <View style={{ width: 18, height: 4, backgroundColor: colors.primary, borderRadius: 2, marginTop: 1 }} />
              </View>
            </View>
          ),
        },
        {
          value: "carousel",
          label: "Carousel",
          preview: (
            <View style={{ width: 60, height: 40, borderRadius: 6, overflow: "hidden", borderWidth: 1, borderColor: colors.border, backgroundColor: "#6b7280" }}>
              <View style={{ flex: 1, backgroundColor: "#4b5563", justifyContent: "flex-end", padding: 4 }}>
                <View style={{ width: "75%", height: 4, backgroundColor: "#fff", borderRadius: 2, marginBottom: 2 }} />
                <View style={{ width: "45%", height: 3, backgroundColor: "rgba(255,255,255,0.6)", borderRadius: 2 }} />
              </View>
              <View style={[StyleSheet.absoluteFill, { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", paddingBottom: 3, gap: 3 }]}>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "#fff" }} />
                <View style={{ width: 5, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.5)" }} />
                <View style={{ width: 5, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.5)" }} />
              </View>
            </View>
          ),
        },
      ];

      return (
        <>
          {/* Layout picker */}
          <Field label="Layout" colors={colors}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {HERO_LAYOUTS.map((opt) => {
                const active = heroVariant === opt.value || (opt.value === "split-right" && heroVariant === "split");
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      const patch: any = { variant: opt.value };
                      if (opt.value === "carousel" && !(s.slides && s.slides.length)) {
                        patch.slides = [{ eyebrow: s.eyebrow, heading: s.heading, body: s.body, image: s.image, ctaLabel: s.ctaLabel, ctaLink: s.ctaLink }];
                      }
                      on(patch);
                    }}
                    style={{ alignItems: "center", gap: 4 }}
                    activeOpacity={0.8}
                  >
                    <View style={{ borderWidth: active ? 2 : 1, borderColor: active ? colors.primary : colors.border, borderRadius: 8, padding: 2 }}>
                      {opt.preview}
                    </View>
                    <Text style={{ fontSize: 10, color: active ? colors.primary : colors.mutedForeground, fontWeight: active ? "600" : "400" }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Field>

          {/* Slides — only for carousel variant */}
          {isCarousel && (
            <>
              <Field label="Slides" colors={colors}>
                <HeroSlidesEditor slides={s.slides ?? []} onChange={(slides) => on({ slides } as any)} colors={colors} />
              </Field>
              <SwitchRow
                label="Show prev / next arrows"
                value={s.showCarouselArrows !== false}
                onValueChange={(v) => on({ showCarouselArrows: v })}
                colors={colors}
              />
              <Field label="Overlay colour" colors={colors}>
                <TextField value={s.overlayColor ?? "#000000"} onChangeText={(v) => on({ overlayColor: v })} placeholder="#000000" colors={colors} />
              </Field>
              <Field label={`Overlay opacity — ${s.overlayOpacity ?? 40}%`} colors={colors}>
                <ChipRow
                  options={[
                    { value: "10", label: "10%" }, { value: "25", label: "25%" }, { value: "40", label: "40%" },
                    { value: "55", label: "55%" }, { value: "70", label: "70%" },
                  ]}
                  value={String(s.overlayOpacity ?? 40)}
                  onChange={(v) => on({ overlayOpacity: Number(v) })}
                  colors={colors}
                />
              </Field>
            </>
          )}

          {!isCarousel && (
            <>
              {/* Content */}
              <Field label="Eyebrow" colors={colors}><TextField value={s.eyebrow ?? ""} onChangeText={(t) => on({ eyebrow: t })} colors={colors} /></Field>
              <Field label="Heading" colors={colors}><TextField value={s.heading} onChangeText={(t) => on({ heading: t })} colors={colors} /></Field>
              <Field label="Body" colors={colors}><TextField value={s.body ?? ""} onChangeText={(t) => on({ body: t })} multiline colors={colors} /></Field>

              {/* Image — not shown for text-only */}
              {needsImage && <Field label="Image" colors={colors}><ImageField value={s.image ?? ""} onChange={(v) => on({ image: v })} colors={colors} /></Field>}

              {/* Boxed image toggle — only for boxed variants */}
              {isBoxed && (
                <SwitchRow
                  label="Show image in a card box"
                  value={s.imageBoxed !== false}
                  onValueChange={(v) => on({ imageBoxed: v })}
                  colors={colors}
                />
              )}

              {/* Panel / background color */}
              {(isSplit || heroVariant === "stacked" || isTextOnly || isBoxed) && (
                <Field label={isBoxed ? "Section background" : "Text panel background"} colors={colors}>
                  <TextField value={s.textBg ?? ""} onChangeText={(v) => on({ textBg: v || undefined })} placeholder="#ffffff or leave blank" colors={colors} />
                </Field>
              )}

              {/* Overlay controls */}
              {isOverlay && (
                <>
                  <Field label="Overlay colour" colors={colors}>
                    <TextField value={s.overlayColor ?? "#000000"} onChangeText={(v) => on({ overlayColor: v })} placeholder="#000000" colors={colors} />
                  </Field>
                  <Field label={`Overlay opacity — ${s.overlayOpacity ?? 40}%`} colors={colors}>
                    <ChipRow
                      options={[
                        { value: "10", label: "10%" }, { value: "25", label: "25%" }, { value: "40", label: "40%" },
                        { value: "55", label: "55%" }, { value: "70", label: "70%" },
                      ]}
                      value={String(s.overlayOpacity ?? 40)}
                      onChange={(v) => on({ overlayOpacity: Number(v) })}
                      colors={colors}
                    />
                  </Field>
                </>
              )}

              {/* Content position — for overlay / fullscreen / text-only */}
              {(isOverlay || isTextOnly) && (
                <Field label="Content position" colors={colors}>
                  <Align9Grid value={s.align} onChange={(v) => on({ align: v })} colors={colors} />
                </Field>
              )}
            </>
          )}

          {/* Height */}
          <Field label="Height" colors={colors}>
            <ChipRow
              options={[{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }, { value: "full", label: "Full screen" }]}
              value={s.height ?? "md"}
              onChange={(v) => on({ height: v })}
              colors={colors}
            />
          </Field>

          {/* Content position — for overlay / fullscreen / text-only */}
          {(isOverlay || isTextOnly) && (
            <Field label="Content position" colors={colors}>
              <Align9Grid value={s.align} onChange={(v) => on({ align: v })} colors={colors} />
            </Field>
          )}

          {!isCarousel && (
            <>
              {/* CTA 1 */}
              <Field label="Button 1 — label" colors={colors}><TextField value={s.ctaLabel ?? ""} onChangeText={(t) => on({ ctaLabel: t })} colors={colors} /></Field>
              <Field label="Button 1 — link" colors={colors}><LinkField value={s.ctaLink} onChange={(v) => on({ ctaLink: v })} colors={colors} /></Field>
              <Field label="Button 1 — style" colors={colors}>
                <ChipRow options={[{ value: "solid", label: "Solid" }, { value: "outline", label: "Outline" }, { value: "ghost", label: "Ghost" }]}
                  value={s.ctaStyle ?? "solid"} onChange={(v) => on({ ctaStyle: v as any })} colors={colors} />
              </Field>

              {/* CTA 2 */}
              <Field label="Button 2 — label (optional)" colors={colors}><TextField value={s.ctaLabel2 ?? ""} onChangeText={(t) => on({ ctaLabel2: t || undefined })} colors={colors} /></Field>
              {s.ctaLabel2 ? (
                <>
                  <Field label="Button 2 — link" colors={colors}><LinkField value={s.ctaLink2} onChange={(v) => on({ ctaLink2: v })} colors={colors} /></Field>
                  <Field label="Button 2 — style" colors={colors}>
                    <ChipRow options={[{ value: "solid", label: "Solid" }, { value: "outline", label: "Outline" }, { value: "ghost", label: "Ghost" }]}
                      value={s.ctaStyle2 ?? "outline"} onChange={(v) => on({ ctaStyle2: v as any })} colors={colors} />
                  </Field>
                </>
              ) : null}
            </>
          )}
        </>
      );
    }
    case "featured-products": {
      const variants = SECTION_VARIANTS["featured-products"] ?? [];
      const isInventoryMode = s.sourceMode === "inventory";
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={s.heading} onChangeText={(t) => on({ heading: t })} colors={colors} /></Field>
          <Field label="Subheading" colors={colors}><TextField value={s.subheading ?? ""} onChangeText={(t) => on({ subheading: t })} colors={colors} /></Field>
          {variants.length > 0 && (
            <Field label="Variant" colors={colors}>
              <ChipRow options={variants.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))} value={s.variant as any} onChange={(v) => on({ variant: v })} colors={colors} clearable />
            </Field>
          )}
          <Field label="Columns" colors={colors}>
            <ChipRow options={[{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }]} value={String(s.columns)} onChange={(v) => on({ columns: Number(v) as 2 | 3 | 4 })} colors={colors} />
          </Field>
          <SwitchRow
            label="Use all in-stock inventory products"
            value={isInventoryMode}
            onValueChange={(v) => on({ sourceMode: v ? "inventory" : "manual" } as any)}
            colors={colors}
          />
          <Field label="Product detail page URL" colors={colors}>
            <TextField
              value={s.productLink ?? "/product/:slug"}
              onChangeText={(t) => on({ productLink: t })}
              placeholder="/product/:slug"
              colors={colors}
            />
          </Field>
          {!isInventoryMode && (
            <Field label="Products — tap to add (📦 = your inventory)" colors={colors}>
              <InventoryProductPickerWrapper
                selected={s.productSlugs}
                onToggle={(id) => on({ productSlugs: s.productSlugs.includes(id) ? s.productSlugs.filter((x) => x !== id) : [...s.productSlugs, id] })}
                onSelectAll={(ids) => on({ productSlugs: ids })}
                onClear={() => on({ productSlugs: [] })}
                colors={colors}
              />
            </Field>
          )}
          <Field label="Add-to-cart button style" colors={colors}>
            <ChipRow
              options={[
                { value: "plus", label: "+" },
                { value: "cart", label: "🛒" },
                { value: "text", label: "Text" },
                { value: "plus-text", label: "+ Text" },
                { value: "cart-text", label: "🛒 Text" },
              ]}
              value={s.cartBtnStyle ?? "plus"}
              onChange={(v) => on({ cartBtnStyle: v as any })}
              colors={colors}
            />
          </Field>
          {(s.cartBtnStyle === "text" || s.cartBtnStyle === "plus-text" || s.cartBtnStyle === "cart-text") && (
            <Field label="Button label" colors={colors}>
              <TextField value={s.cartBtnLabel ?? "Add to cart"} onChangeText={(t) => on({ cartBtnLabel: t })} placeholder="Add to cart" colors={colors} />
            </Field>
          )}
          <Field label="Button background" colors={colors}>
            <TextField value={s.cartBtnBg ?? ""} onChangeText={(t) => on({ cartBtnBg: t || undefined })} placeholder="e.g. #000000 (leave blank for accent)" colors={colors} />
          </Field>
          <Field label="Button text/icon color" colors={colors}>
            <TextField value={s.cartBtnColor ?? ""} onChangeText={(t) => on({ cartBtnColor: t || undefined })} placeholder="e.g. #ffffff (leave blank for white)" colors={colors} />
          </Field>
          <Field label="Button position" colors={colors}>
            <ChipRow
              options={[
                { value: "below", label: "Below info" },
                { value: "right", label: "Right side" },
              ]}
              value={(s as any).cartBtnLayout ?? "below"}
              onChange={(v) => on({ cartBtnLayout: v as any })}
              colors={colors}
            />
          </Field>
          <Field label="Card style" colors={colors}>
            <ChipRow
              options={[
                { value: "classic", label: "Classic" },
                { value: "minimal", label: "Minimal" },
                { value: "overlay", label: "Overlay" },
                { value: "horizontal", label: "Horiz." },
                { value: "compact", label: "Compact" },
                { value: "bordered", label: "Bordered" },
                { value: "floating", label: "Float" },
                { value: "editorial", label: "Editorial" },
                { value: "chip", label: "Chip" },
              ]}
              value={(s as any).cardVariant ?? "classic"}
              onChange={(v) => on({ cardVariant: v as any })}
              colors={colors}
            />
          </Field>
          <Field label="Card corner radius" colors={colors}>
            <ChipRow
              options={RADIUS_PRESETS.map((r) => ({ value: String(r), label: r >= 9999 ? "Full" : `${r}px` }))}
              value={s.borderRadius != null ? String(s.borderRadius) : "0"}
              onChange={(v) => on({ borderRadius: v ? Number(v) : undefined })}
              colors={colors}
            />
          </Field>
        </>
      );
    }
    case "image-text":
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={s.heading} onChangeText={(t) => on({ heading: t })} colors={colors} /></Field>
          <Field label="Body" colors={colors}><TextField value={s.body} onChangeText={(t) => on({ body: t })} multiline colors={colors} /></Field>
          <Field label="Image" colors={colors}><ImageField value={s.image} onChange={(v) => on({ image: v })} colors={colors} /></Field>
          <Field label="Image side" colors={colors}>
            <ChipRow options={[{ value: "left", label: "Left" }, { value: "right", label: "Right" }]} value={s.imageSide} onChange={(v) => on({ imageSide: v as "left" | "right" })} colors={colors} />
          </Field>
          <Field label="CTA label" colors={colors}><TextField value={s.ctaLabel ?? ""} onChangeText={(t) => on({ ctaLabel: t })} colors={colors} /></Field>
          <Field label="CTA link" colors={colors}><LinkField value={s.ctaLink} onChange={(v) => on({ ctaLink: v })} colors={colors} /></Field>
        </>
      );
    case "rich-text":
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={s.heading ?? ""} onChangeText={(t) => on({ heading: t })} colors={colors} /></Field>
          <Field label="Body" colors={colors}><TextField value={s.body} onChangeText={(t) => on({ body: t })} multiline colors={colors} /></Field>
          <Field label="Align" colors={colors}>
            <ChipRow options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} value={s.align} onChange={(v) => on({ align: v as "left" | "center" | "right" })} colors={colors} />
          </Field>
        </>
      );
    case "gallery":
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={s.heading ?? ""} onChangeText={(t) => on({ heading: t })} colors={colors} /></Field>
          <Field label="Columns" colors={colors}>
            <ChipRow options={[{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }]} value={String(s.columns ?? 3)} onChange={(v) => on({ columns: Number(v) as 2 | 3 | 4 })} colors={colors} />
          </Field>
          {s.images.map((src, i) => (
            <View key={i} style={{ marginBottom: 10, gap: 6 }}>
              <ImageField value={src} onChange={(v) => on({ images: s.images.map((x, j) => (j === i ? v : x)) })} colors={colors} />
              <TouchableOpacity onPress={() => on({ images: s.images.filter((_, j) => j !== i) })}><Text style={{ color: colors.destructive, fontSize: 12 }}>Remove</Text></TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => on({ images: [...s.images, mockProducts[0].image] })} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Feather name="plus" size={14} color={colors.primary} /><Text style={{ color: colors.primary }}>Add image</Text>
          </TouchableOpacity>
        </>
      );
    case "collection-list":
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={s.heading} onChangeText={(t) => on({ heading: t })} colors={colors} /></Field>
          <SwitchRow label="Use live inventory categories" value={s.useLiveCategories ?? false} onValueChange={(v) => on({ useLiveCategories: v })} colors={colors} />
          <Field label="Card corner radius" colors={colors}>
            <ChipRow
              options={RADIUS_PRESETS.map((r) => ({ value: String(r), label: r >= 9999 ? "Full" : `${r}px` }))}
              value={s.borderRadius != null ? String(s.borderRadius) : "10"}
              onChange={(v) => on({ borderRadius: v ? Number(v) : undefined })}
              colors={colors}
            />
          </Field>
          {!s.useLiveCategories && (
            <>
              {s.items.map((it, i) => (
                <View key={i} style={{ gap: 6, marginBottom: 10, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
                  <TextField value={it.label} onChangeText={(t) => on({ items: s.items.map((x, j) => (j === i ? { ...x, label: t } : x)) })} placeholder="Label" colors={colors} />
                  <LinkField value={it.link} onChange={(v) => on({ items: s.items.map((x, j) => (j === i ? { ...x, link: v } : x)) })} colors={colors} />
                  <ImageField value={it.image} onChange={(v) => on({ items: s.items.map((x, j) => (j === i ? { ...x, image: v } : x)) })} colors={colors} />
                  <TouchableOpacity onPress={() => on({ items: s.items.filter((_, j) => j !== i) })}><Text style={{ color: colors.destructive, fontSize: 12 }}>Remove</Text></TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity onPress={() => on({ items: [...s.items, { label: "New", image: mockProducts[0].image, link: "/shop" }] })}>
                <Text style={{ color: colors.primary }}>+ Add item</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      );
    case "newsletter":
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={s.heading} onChangeText={(t) => on({ heading: t })} colors={colors} /></Field>
          <Field label="Body" colors={colors}><TextField value={s.body ?? ""} onChangeText={(t) => on({ body: t })} multiline colors={colors} /></Field>
          <Field label="Button label" colors={colors}><TextField value={s.buttonLabel} onChangeText={(t) => on({ buttonLabel: t })} colors={colors} /></Field>
          <Field label="Webhook URL (optional)" colors={colors}><TextField value={s.webhookUrl ?? ""} onChangeText={(t) => on({ webhookUrl: t || undefined })} colors={colors} /></Field>
          <Field label="Success message" colors={colors}><TextField value={s.successMessage ?? ""} onChangeText={(t) => on({ successMessage: t || undefined })} colors={colors} /></Field>
        </>
      );
    case "cta-banner":
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={s.heading} onChangeText={(t) => on({ heading: t })} colors={colors} /></Field>
          <Field label="Body" colors={colors}><TextField value={s.body ?? ""} onChangeText={(t) => on({ body: t })} multiline colors={colors} /></Field>
          <Field label="Image (split variant)" colors={colors}><ImageField value={s.image ?? ""} onChange={(v) => on({ image: v || undefined })} colors={colors} /></Field>
          <Field label="CTA label" colors={colors}><TextField value={s.ctaLabel} onChangeText={(t) => on({ ctaLabel: t })} colors={colors} /></Field>
          <Field label="CTA link" colors={colors}><LinkField value={s.ctaLink} onChange={(v) => on({ ctaLink: v })} colors={colors} /></Field>
        </>
      );
    case "text-columns":
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={s.heading ?? ""} onChangeText={(t) => on({ heading: t })} colors={colors} /></Field>
          {s.columns.map((c, i) => (
            <View key={i} style={{ gap: 6, marginBottom: 10, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
              <TextField value={c.title} onChangeText={(t) => on({ columns: s.columns.map((x, j) => (j === i ? { ...x, title: t } : x)) })} placeholder="Title" colors={colors} />
              <TextField value={c.body} onChangeText={(t) => on({ columns: s.columns.map((x, j) => (j === i ? { ...x, body: t } : x)) })} multiline placeholder="Body" colors={colors} />
              <ImageField value={c.icon ?? ""} onChange={(v) => on({ columns: s.columns.map((x, j) => (j === i ? { ...x, icon: v || undefined } : x)) })} colors={colors} />
              <TouchableOpacity onPress={() => on({ columns: s.columns.filter((_, j) => j !== i) })}><Text style={{ color: colors.destructive, fontSize: 12 }}>Remove</Text></TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => on({ columns: [...s.columns, { title: "New", body: "" }] })}><Text style={{ color: colors.primary }}>+ Add column</Text></TouchableOpacity>
        </>
      );
    case "testimonials":
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={s.heading ?? ""} onChangeText={(t) => on({ heading: t })} colors={colors} /></Field>
          {s.items.map((it, i) => (
            <View key={i} style={{ gap: 6, marginBottom: 10, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
              <TextField value={it.quote} onChangeText={(t) => on({ items: s.items.map((x, j) => (j === i ? { ...x, quote: t } : x)) })} multiline placeholder="Quote" colors={colors} />
              <TextField value={it.author} onChangeText={(t) => on({ items: s.items.map((x, j) => (j === i ? { ...x, author: t } : x)) })} placeholder="Author" colors={colors} />
              <TextField value={it.role ?? ""} onChangeText={(t) => on({ items: s.items.map((x, j) => (j === i ? { ...x, role: t } : x)) })} placeholder="Role" colors={colors} />
              <ImageField value={it.avatar ?? ""} onChange={(v) => on({ items: s.items.map((x, j) => (j === i ? { ...x, avatar: v || undefined } : x)) })} colors={colors} />
              <TouchableOpacity onPress={() => on({ items: s.items.filter((_, j) => j !== i) })}><Text style={{ color: colors.destructive, fontSize: 12 }}>Remove</Text></TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => on({ items: [...s.items, { quote: "", author: "" }] })}><Text style={{ color: colors.primary }}>+ Add testimonial</Text></TouchableOpacity>
        </>
      );
    case "logo-bar":
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={s.heading ?? ""} onChangeText={(t) => on({ heading: t })} colors={colors} /></Field>
          {s.logos.map((l, i) => (
            <View key={i} style={{ gap: 6, marginBottom: 10, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
              <ImageField value={l.src} onChange={(v) => on({ logos: s.logos.map((x, j) => (j === i ? { ...x, src: v } : x)) })} colors={colors} />
              <TextField value={l.alt} onChangeText={(t) => on({ logos: s.logos.map((x, j) => (j === i ? { ...x, alt: t } : x)) })} placeholder="Alt text" colors={colors} />
              <TouchableOpacity onPress={() => on({ logos: s.logos.filter((_, j) => j !== i) })}><Text style={{ color: colors.destructive, fontSize: 12 }}>Remove</Text></TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => on({ logos: [...s.logos, { src: "", alt: "" }] })}><Text style={{ color: colors.primary }}>+ Add logo</Text></TouchableOpacity>
        </>
      );
    case "faq":
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={s.heading} onChangeText={(t) => on({ heading: t })} colors={colors} /></Field>
          {s.items.map((it, i) => (
            <View key={i} style={{ gap: 6, marginBottom: 10, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
              <TextField value={it.question} onChangeText={(t) => on({ items: s.items.map((x, j) => (j === i ? { ...x, question: t } : x)) })} placeholder="Question" colors={colors} />
              <TextField value={it.answer} onChangeText={(t) => on({ items: s.items.map((x, j) => (j === i ? { ...x, answer: t } : x)) })} multiline placeholder="Answer" colors={colors} />
              <TouchableOpacity onPress={() => on({ items: s.items.filter((_, j) => j !== i) })}><Text style={{ color: colors.destructive, fontSize: 12 }}>Remove</Text></TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => on({ items: [...s.items, { question: "", answer: "" }] })}><Text style={{ color: colors.primary }}>+ Add FAQ</Text></TouchableOpacity>
        </>
      );
    case "video":
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={s.heading ?? ""} onChangeText={(t) => on({ heading: t })} colors={colors} /></Field>
          <Field label="Embed URL" colors={colors}><TextField value={s.url} onChangeText={(t) => on({ url: t })} placeholder="https://youtube.com/embed/..." colors={colors} /></Field>
        </>
      );
    case "spacer":
      return (
        <Field label="Size" colors={colors}>
          <ChipRow options={[{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }, { value: "xl", label: "XL" }]} value={s.size} onChange={(v) => on({ size: v as "sm" | "md" | "lg" | "xl" })} colors={colors} />
        </Field>
      );
    case "related-products":
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={s.heading} onChangeText={(t) => on({ heading: t })} colors={colors} /></Field>
          <Field label="Subheading (optional)" colors={colors}><TextField value={(s as any).subheading ?? ""} onChangeText={(t) => on({ subheading: t || undefined } as any)} colors={colors} /></Field>
          <SwitchRow
            label="Fetch from my inventory"
            value={s.useInventory ?? false}
            onValueChange={(v) => on({ useInventory: v })}
            colors={colors}
          />
          {!s.useInventory && (
            <Field label="Source product (demo)" colors={colors}><ProductSelect value={s.sourceSlug} onChange={(v) => on({ sourceSlug: v })} colors={colors} /></Field>
          )}
          <Field label="How many to show" colors={colors}>
            <ChipRow options={[{ value: "3", label: "3" }, { value: "4", label: "4" }, { value: "6", label: "6" }, { value: "8", label: "8" }]} value={String(s.limit)} onChange={(v) => on({ limit: Number(v) })} colors={colors} />
          </Field>
        </>
      );
    case "search":
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={s.heading ?? ""} onChangeText={(t) => on({ heading: t })} colors={colors} /></Field>
          <Field label="Placeholder text" colors={colors}><TextField value={s.placeholder ?? ""} onChangeText={(t) => on({ placeholder: t })} placeholder="Search products…" colors={colors} /></Field>

          <Text style={{ fontSize: 11, fontWeight: "700", color: colors.mutedForeground, marginTop: 10, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Search bar appearance</Text>
          <Field label="Bar shape" colors={colors}>
            <ChipRow
              options={[{ value: "pill", label: "Pill" }, { value: "sharp", label: "Sharp" }, { value: "underline", label: "Underline" }]}
              value={(s as any).barStyle ?? "pill"}
              onChange={(v) => on({ barStyle: v } as any)}
              colors={colors}
            />
          </Field>
          <Field label="Bar icon" colors={colors}>
            <ChipRow
              options={[{ value: "search", label: "Search" }, { value: "sparkles", label: "Sparkle" }, { value: "sliders", label: "Filter" }, { value: "none", label: "None" }]}
              value={(s as any).searchIcon ?? "search"}
              onChange={(v) => on({ searchIcon: v } as any)}
              colors={colors}
            />
          </Field>
          <Field label="Bar background" colors={colors}><TextField value={(s as any).barBg ?? ""} onChangeText={(t) => on({ barBg: t || undefined } as any)} placeholder="e.g. #f5f5f5 (auto)" colors={colors} /></Field>
          <Field label="Bar border colour" colors={colors}><TextField value={(s as any).barBorderColor ?? ""} onChangeText={(t) => on({ barBorderColor: t || undefined } as any)} placeholder="e.g. #cccccc (auto)" colors={colors} /></Field>
          <Field label="Bar text colour" colors={colors}><TextField value={(s as any).barTextColor ?? ""} onChangeText={(t) => on({ barTextColor: t || undefined } as any)} placeholder="e.g. #111111 (auto)" colors={colors} /></Field>

          <SwitchRow label="Show category filters" value={s.showFilters} onValueChange={(v) => on({ showFilters: v })} colors={colors} />
          {s.showFilters && (
            <>
              <Field label="Filter chip shape" colors={colors}>
                <ChipRow
                  options={[{ value: "pill", label: "Pill" }, { value: "tag", label: "Tag" }, { value: "square", label: "Square" }]}
                  value={(s as any).filterChipStyle ?? "pill"}
                  onChange={(v) => on({ filterChipStyle: v } as any)}
                  colors={colors}
                />
              </Field>
              <Field label="Active chip colour" colors={colors}><TextField value={(s as any).filterActiveBg ?? ""} onChangeText={(t) => on({ filterActiveBg: t || undefined } as any)} placeholder="e.g. #000000 (accent)" colors={colors} /></Field>
              <Field label="Active chip text" colors={colors}><TextField value={(s as any).filterActiveColor ?? ""} onChangeText={(t) => on({ filterActiveColor: t || undefined } as any)} placeholder="e.g. #ffffff" colors={colors} /></Field>
            </>
          )}

          <SwitchRow
            label="Fetch from my inventory"
            value={(s as any).useInventory !== false}
            onValueChange={(v) => on({ useInventory: v } as any)}
            colors={colors}
          />
          <View style={{ padding: 10, backgroundColor: colors.secondary, borderRadius: 8 }}>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
              When enabled, category filters auto-populate from your real product categories. When off, uses demo catalog.
            </Text>
          </View>
        </>
      );
    case "product-detail":
      return (
        <>
          <Field label="Default product (preview)" colors={colors}>
            <ProductSelect value={s.productSlug} onChange={(v) => on({ productSlug: v })} colors={colors} />
          </Field>
          <Field label="Layout" colors={colors}>
            <ChipRow
              options={[
                { value: "stacked", label: "Stacked" },
                { value: "split",   label: "Split" },
                { value: "hero",    label: "Hero" },
              ]}
              value={s.layout ?? "stacked"}
              onChange={(v) => on({ layout: v as any })}
              colors={colors}
            />
          </Field>
          <Field label="Image ratio" colors={colors}>
            <ChipRow
              options={[
                { value: "portrait",  label: "Portrait" },
                { value: "square",    label: "Square" },
                { value: "landscape", label: "Landscape" },
              ]}
              value={s.imageRatio ?? "square"}
              onChange={(v) => on({ imageRatio: v as any })}
              colors={colors}
            />
          </Field>
          <Field label="Add-to-cart button label" colors={colors}>
            <TextField value={s.addToCartLabel ?? ""} onChangeText={(t) => on({ addToCartLabel: t || undefined })} placeholder="Add to bag" colors={colors} />
          </Field>
          <SwitchRow label="Show quantity stepper" value={s.showQty !== false} onValueChange={(v) => on({ showQty: v })} colors={colors} />
          <SwitchRow label="Show description" value={s.showDescription !== false} onValueChange={(v) => on({ showDescription: v })} colors={colors} />
          <SwitchRow label="Show share button" value={s.showShareBtn === true} onValueChange={(v) => on({ showShareBtn: v })} colors={colors} />
          <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 8, marginBottom: 4 }}>Extra gallery images:</Text>
          {(s.extraImages ?? []).map((img, i) => (
            <View key={i} style={{ marginBottom: 8 }}>
              <ImageField value={img} onChange={(v) => on({ extraImages: (s.extraImages ?? []).map((x, j) => (j === i ? v : x)) })} colors={colors} />
              <TouchableOpacity onPress={() => on({ extraImages: (s.extraImages ?? []).filter((_, j) => j !== i) })}>
                <Text style={{ color: colors.destructive, fontSize: 12 }}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
          {(s.extraImages ?? []).length < 4 && (
            <TouchableOpacity onPress={() => on({ extraImages: [...(s.extraImages ?? []), ""] })}>
              <Text style={{ color: colors.primary }}>+ Add image</Text>
            </TouchableOpacity>
          )}
        </>
      );
    case "checkout-form":
      return <Field label="Heading (optional)" colors={colors}><TextField value={s.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined })} colors={colors} /></Field>;
    case "contact-form":
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={s.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined })} colors={colors} /></Field>
          <Field label="Subheading" colors={colors}><TextField value={s.subheading ?? ""} onChangeText={(t) => on({ subheading: t || undefined })} colors={colors} /></Field>
        </>
      );
    case "columns": {
      const items = s.items ?? [];
      return (
        <>
          <Field label="Section heading (optional)" colors={colors}>
            <TextField value={s.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined })} placeholder="Leave empty to hide" colors={colors} />
          </Field>
          <Field label="Subheading (optional)" colors={colors}>
            <TextField value={s.subheading ?? ""} onChangeText={(t) => on({ subheading: t || undefined })} colors={colors} />
          </Field>
          <Field label="Number of columns" colors={colors}>
            <ChipRow
              options={[{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }]}
              value={String(s.count ?? 2)}
              onChange={(v) => {
                const n = Number(v) as 2 | 3 | 4;
                const newItems = Array.from({ length: n }, (_, i) => items[i] ?? { heading: "", body: "", imageUri: "", ctaLabel: "", ctaHref: "" });
                on({ count: n, items: newItems } as any);
              }}
              colors={colors}
            />
          </Field>
          <Field label="Gap" colors={colors}>
            <ChipRow options={[{ value: "sm", label: "Tight" }, { value: "md", label: "Normal" }, { value: "lg", label: "Wide" }]} value={s.gap ?? "md"} onChange={(v) => on({ gap: v as any })} colors={colors} />
          </Field>
          <Field label="Vertical align" colors={colors}>
            <ChipRow options={[{ value: "top", label: "Top" }, { value: "center", label: "Center" }, { value: "bottom", label: "Bottom" }]} value={s.verticalAlign ?? "top"} onChange={(v) => on({ verticalAlign: v as any })} colors={colors} />
          </Field>
          <Field label="Image aspect ratio" colors={colors}>
            <ChipRow
              options={[{ value: "0.75", label: "Portrait" }, { value: "1", label: "Square" }, { value: "1.33", label: "Landscape" }, { value: "1.78", label: "Wide" }]}
              value={String(s.imgAspectRatio ?? 1)}
              onChange={(v) => on({ imgAspectRatio: Number(v) })}
              colors={colors}
            />
          </Field>
          <SwitchRow label="Stack on mobile" value={s.stackOnMobile !== false} onValueChange={(v) => on({ stackOnMobile: v } as any)} colors={colors} />

          {/* Per-column content */}
          {items.slice(0, s.count ?? 2).map((col, i) => (
            <View key={i} style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
              <Text style={{ fontWeight: "700", color: colors.foreground, marginBottom: 8 }}>Column {i + 1}</Text>
              <Field label="Image URL" colors={colors}>
                <TextField value={col.imageUri ?? ""} onChangeText={(t) => on({ items: items.map((c, j) => j === i ? { ...c, imageUri: t || undefined } : c) } as any)} placeholder="https://... or leave empty" colors={colors} />
              </Field>
              <Field label="Icon (Feather name, optional)" colors={colors}>
                <TextField value={col.iconName ?? ""} onChangeText={(t) => on({ items: items.map((c, j) => j === i ? { ...c, iconName: t || undefined } : c) } as any)} placeholder="e.g. star, check, heart" colors={colors} />
              </Field>
              <Field label="Heading" colors={colors}>
                <TextField value={col.heading ?? ""} onChangeText={(t) => on({ items: items.map((c, j) => j === i ? { ...c, heading: t || undefined } : c) } as any)} colors={colors} />
              </Field>
              <Field label="Body" colors={colors}>
                <TextField value={col.body ?? ""} onChangeText={(t) => on({ items: items.map((c, j) => j === i ? { ...c, body: t || undefined } : c) } as any)} colors={colors} />
              </Field>
              <Field label="Button label (optional)" colors={colors}>
                <TextField value={col.ctaLabel ?? ""} onChangeText={(t) => on({ items: items.map((c, j) => j === i ? { ...c, ctaLabel: t || undefined } : c) } as any)} placeholder="e.g. Learn more" colors={colors} />
              </Field>
              {col.ctaLabel ? (
                <Field label="Button link" colors={colors}>
                  <TextField value={col.ctaHref ?? ""} onChangeText={(t) => on({ items: items.map((c, j) => j === i ? { ...c, ctaHref: t || undefined } : c) } as any)} placeholder="/shop" colors={colors} />
                </Field>
              ) : null}
            </View>
          ))}
        </>
      );
    }
    case "shop-grid":
      return (
        <>
          <Field label="Heading (optional)" colors={colors}><TextField value={s.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined })} colors={colors} /></Field>
          <SwitchRow
            label="Use live inventory products"
            value={s.sourceMode === "inventory"}
            onValueChange={(v) => on({ sourceMode: v ? "inventory" : "manual" } as any)}
            colors={colors}
          />
          <Field label="Columns" colors={colors}>
            <ChipRow options={[{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }]} value={String(s.columns ?? 3)} onChange={(v) => on({ columns: Number(v) as 2 | 3 | 4 })} colors={colors} />
          </Field>
          <SwitchRow label="Show search bar" value={s.showSearch ?? false} onValueChange={(v) => on({ showSearch: v })} colors={colors} />
          {(s.showSearch ?? false) && (
            <>
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.mutedForeground, marginTop: 6, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Search bar style</Text>
              <Field label="Bar shape" colors={colors}>
                <ChipRow
                  options={[{ value: "pill", label: "Pill" }, { value: "sharp", label: "Sharp" }, { value: "underline", label: "Underline" }]}
                  value={(s as any).barStyle ?? "pill"}
                  onChange={(v) => on({ barStyle: v } as any)}
                  colors={colors}
                />
              </Field>
              <Field label="Bar icon" colors={colors}>
                <ChipRow
                  options={[{ value: "search", label: "Search" }, { value: "sparkles", label: "Sparkle" }, { value: "sliders", label: "Filter" }, { value: "none", label: "None" }]}
                  value={(s as any).searchIcon ?? "search"}
                  onChange={(v) => on({ searchIcon: v } as any)}
                  colors={colors}
                />
              </Field>
              <Field label="Placeholder" colors={colors}><TextField value={(s as any).searchPlaceholder ?? ""} onChangeText={(t) => on({ searchPlaceholder: t || undefined } as any)} placeholder="Search products…" colors={colors} /></Field>
              <Field label="Bar background" colors={colors}><TextField value={(s as any).barBg ?? ""} onChangeText={(t) => on({ barBg: t || undefined } as any)} placeholder="#f5f5f5 (auto)" colors={colors} /></Field>
              <Field label="Bar border" colors={colors}><TextField value={(s as any).barBorderColor ?? ""} onChangeText={(t) => on({ barBorderColor: t || undefined } as any)} placeholder="#cccccc (auto)" colors={colors} /></Field>
              <Field label="Bar text" colors={colors}><TextField value={(s as any).barTextColor ?? ""} onChangeText={(t) => on({ barTextColor: t || undefined } as any)} placeholder="#111111 (auto)" colors={colors} /></Field>
            </>
          )}
          <SwitchRow label="Show category filters" value={s.showFilters ?? true} onValueChange={(v) => on({ showFilters: v })} colors={colors} />
          {(s.showFilters ?? true) && (
            <>
              <Field label="Filter chip shape" colors={colors}>
                <ChipRow
                  options={[{ value: "pill", label: "Pill" }, { value: "tag", label: "Tag" }, { value: "square", label: "Square" }]}
                  value={(s as any).filterChipStyle ?? "pill"}
                  onChange={(v) => on({ filterChipStyle: v } as any)}
                  colors={colors}
                />
              </Field>
              <Field label="Active chip colour" colors={colors}>
                <TextField value={(s as any).filterActiveBg ?? ""} onChangeText={(t) => on({ filterActiveBg: t || undefined } as any)} placeholder="e.g. #000000 (accent = default)" colors={colors} />
              </Field>
              <Field label="Active chip text" colors={colors}>
                <TextField value={(s as any).filterActiveColor ?? ""} onChangeText={(t) => on({ filterActiveColor: t || undefined } as any)} placeholder="e.g. #ffffff (white = default)" colors={colors} />
              </Field>
            </>
          )}
          <Field label="Add-to-cart button style" colors={colors}>
            <ChipRow
              options={[
                { value: "plus", label: "+" },
                { value: "cart", label: "🛒" },
                { value: "text", label: "Text" },
                { value: "plus-text", label: "+ Text" },
                { value: "cart-text", label: "🛒 Text" },
              ]}
              value={s.cartBtnStyle ?? "plus"}
              onChange={(v) => on({ cartBtnStyle: v as any })}
              colors={colors}
            />
          </Field>
          {(s.cartBtnStyle === "text" || s.cartBtnStyle === "plus-text" || s.cartBtnStyle === "cart-text") && (
            <Field label="Button label" colors={colors}>
              <TextField value={s.cartBtnLabel ?? "Add to cart"} onChangeText={(t) => on({ cartBtnLabel: t })} placeholder="Add to cart" colors={colors} />
            </Field>
          )}
          <Field label="Button background" colors={colors}>
            <TextField value={s.cartBtnBg ?? ""} onChangeText={(t) => on({ cartBtnBg: t || undefined })} placeholder="e.g. #000000 (accent = default)" colors={colors} />
          </Field>
          <Field label="Button text/icon color" colors={colors}>
            <TextField value={s.cartBtnColor ?? ""} onChangeText={(t) => on({ cartBtnColor: t || undefined })} placeholder="e.g. #ffffff (white = default)" colors={colors} />
          </Field>
          <Field label="Button position" colors={colors}>
            <ChipRow
              options={[
                { value: "below", label: "Below info" },
                { value: "right", label: "Right side" },
              ]}
              value={(s as any).cartBtnLayout ?? "below"}
              onChange={(v) => on({ cartBtnLayout: v as any })}
              colors={colors}
            />
          </Field>
          <Field label="Card style" colors={colors}>
            <ChipRow
              options={[
                { value: "classic", label: "Classic" },
                { value: "minimal", label: "Minimal" },
                { value: "overlay", label: "Overlay" },
                { value: "horizontal", label: "Horiz." },
                { value: "compact", label: "Compact" },
                { value: "bordered", label: "Bordered" },
                { value: "floating", label: "Float" },
                { value: "editorial", label: "Editorial" },
                { value: "chip", label: "Chip" },
              ]}
              value={(s as any).cardVariant ?? "classic"}
              onChange={(v) => on({ cardVariant: v as any })}
              colors={colors}
            />
          </Field>
          <Field label="Card corner radius" colors={colors}>
            <ChipRow
              options={RADIUS_PRESETS.map((r) => ({ value: String(r), label: r >= 9999 ? "Full" : `${r}px` }))}
              value={s.borderRadius != null ? String(s.borderRadius) : "0"}
              onChange={(v) => on({ borderRadius: v ? Number(v) : undefined })}
              colors={colors}
            />
          </Field>
        </>
      );
    case "pricing-plans": {
      const variants = SECTION_VARIANTS["pricing-plans"] ?? [];
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={s.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined })} colors={colors} /></Field>
          <Field label="Subheading" colors={colors}><TextField value={s.subheading ?? ""} onChangeText={(t) => on({ subheading: t || undefined })} colors={colors} /></Field>
          {variants.length > 0 && (
            <Field label="Variant" colors={colors}>
              <ChipRow options={variants.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))} value={s.variant as any} onChange={(v) => on({ variant: v })} colors={colors} clearable />
            </Field>
          )}
          {s.plans.map((plan, i) => (
            <View key={i} style={{ gap: 6, marginBottom: 12, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Plan {i + 1}{plan.highlighted ? " ⭐ Highlighted" : ""}</Text>
              <TextField value={plan.name} onChangeText={(t) => on({ plans: s.plans.map((p, j) => j === i ? { ...p, name: t } : p) })} placeholder="Plan name" colors={colors} />
              <TextField value={plan.price} onChangeText={(t) => on({ plans: s.plans.map((p, j) => j === i ? { ...p, price: t } : p) })} placeholder="Price (e.g. ₦5,000)" colors={colors} />
              <TextField value={plan.period ?? ""} onChangeText={(t) => on({ plans: s.plans.map((p, j) => j === i ? { ...p, period: t || undefined } : p) })} placeholder="Period (e.g. /month)" colors={colors} />
              <TextField value={plan.features.join("\n")} onChangeText={(t) => on({ plans: s.plans.map((p, j) => j === i ? { ...p, features: t.split("\n").filter(Boolean) } : p) })} multiline placeholder="Features (one per line)" colors={colors} />
              <TextField value={plan.ctaLabel} onChangeText={(t) => on({ plans: s.plans.map((p, j) => j === i ? { ...p, ctaLabel: t } : p) })} placeholder="Button label" colors={colors} />
              <TextField value={(plan as any).paystackLink ?? ""} onChangeText={(t) => on({ plans: s.plans.map((p, j) => j === i ? { ...p, paystackLink: t || undefined } : p) })} placeholder="Paystack link (https://paystack.com/pay/...)" colors={colors} />
              <SwitchRow label="Highlight this plan" value={plan.highlighted ?? false} onValueChange={(v) => on({ plans: s.plans.map((p, j) => j === i ? { ...p, highlighted: v } : p) })} colors={colors} />
              <TouchableOpacity onPress={() => on({ plans: s.plans.filter((_, j) => j !== i) })}><Text style={{ color: colors.destructive, fontSize: 12 }}>Remove plan</Text></TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => on({ plans: [...s.plans, { name: "New plan", price: "₦0", features: ["Feature 1"], ctaLabel: "Get started", ctaLink: "/shop" }] })}>
            <Text style={{ color: colors.primary }}>+ Add plan</Text>
          </TouchableOpacity>
        </>
      );
    }
    case "countdown":
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={s.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined })} colors={colors} /></Field>
          <Field label="Body" colors={colors}><TextField value={s.body ?? ""} onChangeText={(t) => on({ body: t || undefined })} multiline colors={colors} /></Field>
          <Field label="Target date (ISO)" colors={colors}>
            <TextField value={s.targetDate} onChangeText={(t) => on({ targetDate: t })} placeholder="2025-12-31T23:59:59Z" colors={colors} />
          </Field>
          <Field label="CTA label" colors={colors}><TextField value={s.ctaLabel ?? ""} onChangeText={(t) => on({ ctaLabel: t || undefined })} colors={colors} /></Field>
          <Field label="CTA link" colors={colors}><LinkField value={s.ctaLink} onChange={(v) => on({ ctaLink: v })} colors={colors} /></Field>
          <Field label="Variant" colors={colors}>
            <ChipRow options={[{ value: "banner", label: "Banner" }, { value: "box", label: "Box" }]} value={s.variant as any} onChange={(v) => on({ variant: v })} colors={colors} clearable />
          </Field>
        </>
      );
    case "stats": {
      const variants = SECTION_VARIANTS.stats ?? [];
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={s.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined })} colors={colors} /></Field>
          {variants.length > 0 && (
            <Field label="Variant" colors={colors}>
              <ChipRow options={variants.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))} value={s.variant as any} onChange={(v) => on({ variant: v })} colors={colors} clearable />
            </Field>
          )}
          {s.items.map((item, i) => (
            <View key={i} style={{ gap: 6, marginBottom: 10, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
              <TextField value={item.value} onChangeText={(t) => on({ items: s.items.map((x, j) => j === i ? { ...x, value: t } : x) })} placeholder="Value (e.g. 50,000+)" colors={colors} />
              <TextField value={item.label} onChangeText={(t) => on({ items: s.items.map((x, j) => j === i ? { ...x, label: t } : x) })} placeholder="Label (e.g. Happy customers)" colors={colors} />
              <TextField value={item.description ?? ""} onChangeText={(t) => on({ items: s.items.map((x, j) => j === i ? { ...x, description: t || undefined } : x) })} placeholder="Description (optional)" colors={colors} />
              <TouchableOpacity onPress={() => on({ items: s.items.filter((_, j) => j !== i) })}><Text style={{ color: colors.destructive, fontSize: 12 }}>Remove</Text></TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => on({ items: [...s.items, { value: "0", label: "New stat" }] })}><Text style={{ color: colors.primary }}>+ Add stat</Text></TouchableOpacity>
        </>
      );
    }
    case "team": {
      const variants = SECTION_VARIANTS.team ?? [];
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={s.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined })} colors={colors} /></Field>
          <Field label="Subheading" colors={colors}><TextField value={s.subheading ?? ""} onChangeText={(t) => on({ subheading: t || undefined })} colors={colors} /></Field>
          {variants.length > 0 && (
            <Field label="Variant" colors={colors}>
              <ChipRow options={variants.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))} value={s.variant as any} onChange={(v) => on({ variant: v })} colors={colors} clearable />
            </Field>
          )}
          {s.members.map((m, i) => (
            <View key={i} style={{ gap: 6, marginBottom: 10, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
              <TextField value={m.name} onChangeText={(t) => on({ members: s.members.map((x, j) => j === i ? { ...x, name: t } : x) })} placeholder="Name" colors={colors} />
              <TextField value={m.role} onChangeText={(t) => on({ members: s.members.map((x, j) => j === i ? { ...x, role: t } : x) })} placeholder="Role / Title" colors={colors} />
              <TextField value={m.bio ?? ""} onChangeText={(t) => on({ members: s.members.map((x, j) => j === i ? { ...x, bio: t || undefined } : x) })} multiline placeholder="Short bio" colors={colors} />
              <ImageField value={m.avatar ?? ""} onChange={(v) => on({ members: s.members.map((x, j) => j === i ? { ...x, avatar: v || undefined } : x) })} colors={colors} />
              <TouchableOpacity onPress={() => on({ members: s.members.filter((_, j) => j !== i) })}><Text style={{ color: colors.destructive, fontSize: 12 }}>Remove</Text></TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => on({ members: [...s.members, { name: "New member", role: "Role" }] })}><Text style={{ color: colors.primary }}>+ Add member</Text></TouchableOpacity>
        </>
      );
    }
    case "auth-login":
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={s.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined })} colors={colors} /></Field>
          <Field label="Subheading" colors={colors}><TextField value={s.subheading ?? ""} onChangeText={(t) => on({ subheading: t || undefined })} multiline colors={colors} /></Field>
          <Field label="Page image" colors={colors}><ImageField value={s.image ?? ""} onChange={(v) => on({ image: v || undefined })} colors={colors} /></Field>
          <Field label="Image position" colors={colors}>
            <ChipRow options={[{ value: "left", label: "Left" }, { value: "right", label: "Right" }, { value: "background", label: "Background" }]} value={(s.imageSide ?? "right") as any} onChange={(v) => on({ imageSide: v as any })} colors={colors} />
          </Field>
          <Field label="Signup page link" colors={colors}><LinkField value={s.signupLink ?? ""} onChange={(v) => on({ signupLink: v || undefined })} colors={colors} /></Field>
        </>
      );
    case "auth-signup":
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={s.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined })} colors={colors} /></Field>
          <Field label="Subheading" colors={colors}><TextField value={s.subheading ?? ""} onChangeText={(t) => on({ subheading: t || undefined })} multiline colors={colors} /></Field>
          <Field label="Page image" colors={colors}><ImageField value={s.image ?? ""} onChange={(v) => on({ image: v || undefined })} colors={colors} /></Field>
          <Field label="Image position" colors={colors}>
            <ChipRow options={[{ value: "left", label: "Left" }, { value: "right", label: "Right" }, { value: "background", label: "Background" }]} value={(s.imageSide ?? "right") as any} onChange={(v) => on({ imageSide: v as any })} colors={colors} />
          </Field>
          <Field label="Login page link" colors={colors}><LinkField value={s.loginLink ?? ""} onChange={(v) => on({ loginLink: v || undefined })} colors={colors} /></Field>
        </>
      );
    case "buyer-orders":
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={s.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined })} colors={colors} /></Field>
          <Field label="Subheading" colors={colors}><TextField value={s.subheading ?? ""} onChangeText={(t) => on({ subheading: t || undefined })} colors={colors} /></Field>
        </>
      );
    case "buyer-referrals":
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={s.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined })} colors={colors} /></Field>
          <Field label="Subheading" colors={colors}><TextField value={s.subheading ?? ""} onChangeText={(t) => on({ subheading: t || undefined })} colors={colors} /></Field>
          <Field label="Reward label" colors={colors}><TextField value={s.rewardLabel ?? ""} onChangeText={(t) => on({ rewardLabel: t || undefined })} placeholder="e.g. ₦500" colors={colors} /></Field>
        </>
      );
    case "about":
      return (
        <>
          <Field label="Layout" colors={colors}>
            <ChipRow
              options={[
                { value: "story",    label: "Story" },
                { value: "split",    label: "Split" },
                { value: "magazine", label: "Magazine" },
                { value: "team",     label: "Team" },
              ]}
              value={s.variant ?? "story"}
              onChange={(v) => on({ variant: v as any })}
              colors={colors}
            />
          </Field>
          <Field label="Heading" colors={colors}><TextField value={s.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined })} colors={colors} /></Field>
          <Field label="Subheading (accent line)" colors={colors}><TextField value={s.subheading ?? ""} onChangeText={(t) => on({ subheading: t || undefined })} colors={colors} /></Field>
          <Field label="Body text" colors={colors}><TextField value={s.body ?? ""} onChangeText={(t) => on({ body: t || undefined })} multiline colors={colors} /></Field>
          <Field label="Image" colors={colors}><ImageField value={s.image ?? ""} onChange={(v) => on({ image: v || undefined })} colors={colors} /></Field>
          <Field label="CTA button label" colors={colors}><TextField value={s.ctaLabel ?? ""} onChangeText={(t) => on({ ctaLabel: t || undefined })} colors={colors} /></Field>
          <Field label="CTA link" colors={colors}><LinkField value={s.ctaLink} onChange={(v) => on({ ctaLink: v })} colors={colors} /></Field>
          {(s.variant ?? "story") === "team" && (
            <>
              {(s.team ?? []).map((m, i) => (
                <View key={i} style={{ gap: 6, marginBottom: 10, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
                  <TextField value={m.name} onChangeText={(t) => on({ team: (s.team ?? []).map((x, j) => j === i ? { ...x, name: t } : x) })} placeholder="Name" colors={colors} />
                  <TextField value={m.role} onChangeText={(t) => on({ team: (s.team ?? []).map((x, j) => j === i ? { ...x, role: t } : x) })} placeholder="Role" colors={colors} />
                  <TextField value={m.bio ?? ""} onChangeText={(t) => on({ team: (s.team ?? []).map((x, j) => j === i ? { ...x, bio: t || undefined } : x) })} placeholder="Bio (optional)" multiline colors={colors} />
                  <ImageField value={m.image ?? ""} onChange={(v) => on({ team: (s.team ?? []).map((x, j) => j === i ? { ...x, image: v || undefined } : x) })} colors={colors} />
                  <TouchableOpacity onPress={() => on({ team: (s.team ?? []).filter((_, j) => j !== i) })}>
                    <Text style={{ color: colors.destructive, fontSize: 12 }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity onPress={() => on({ team: [...(s.team ?? []), { name: "Team member", role: "Role" }] })}>
                <Text style={{ color: colors.primary }}>+ Add team member</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      );
    case "contact":
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={s.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined })} colors={colors} /></Field>
          <Field label="Subheading" colors={colors}><TextField value={s.subheading ?? ""} onChangeText={(t) => on({ subheading: t || undefined })} colors={colors} /></Field>
          <Field label="Email" colors={colors}><TextField value={s.email ?? ""} onChangeText={(t) => on({ email: t || undefined })} colors={colors} /></Field>
          <Field label="Phone" colors={colors}><TextField value={s.phone ?? ""} onChangeText={(t) => on({ phone: t || undefined })} colors={colors} /></Field>
          <Field label="Address" colors={colors}><TextField value={s.address ?? ""} onChangeText={(t) => on({ address: t || undefined })} colors={colors} /></Field>
          <Field label="Opening hours" colors={colors}><TextField value={s.hours ?? ""} onChangeText={(t) => on({ hours: t || undefined })} colors={colors} /></Field>
          <SwitchRow label="Show contact form" value={s.showForm ?? false} onValueChange={(v) => on({ showForm: v })} colors={colors} />
        </>
      );
    case "video-hero": {
      const vh = s as VideoHeroSection;
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={vh.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined } as any)} colors={colors} /></Field>
          <Field label="Subheading" colors={colors}><TextField value={vh.subheading ?? ""} onChangeText={(t) => on({ subheading: t || undefined } as any)} colors={colors} /></Field>
          <Field label="Poster image" colors={colors}><ImageField value={vh.posterImage ?? ""} onChange={(v) => on({ posterImage: v || undefined } as any)} colors={colors} /></Field>
          <Field label="CTA label" colors={colors}><TextField value={vh.ctaLabel ?? ""} onChangeText={(t) => on({ ctaLabel: t || undefined } as any)} colors={colors} /></Field>
          <Field label="CTA link" colors={colors}><LinkField value={vh.ctaLink ?? ""} onChange={(v) => on({ ctaLink: v || undefined } as any)} colors={colors} /></Field>
          <Field label="Overlay opacity" colors={colors}>
            <ChipRow options={[{ value: "0", label: "None" }, { value: "25", label: "25%" }, { value: "40", label: "40%" }, { value: "55", label: "55%" }, { value: "70", label: "70%" }]} value={String(vh.overlayOpacity ?? 40)} onChange={(v) => on({ overlayOpacity: Number(v) } as any)} colors={colors} />
          </Field>
          <Field label="Height" colors={colors}>
            <ChipRow options={[{ value: "sm", label: "SM" }, { value: "md", label: "MD" }, { value: "lg", label: "LG" }, { value: "full", label: "Full" }]} value={vh.height ?? "md"} onChange={(v) => on({ height: v } as any)} colors={colors} />
          </Field>
          <Field label="Text alignment" colors={colors}>
            <ChipRow options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} value={vh.align ?? "center"} onChange={(v) => on({ align: v } as any)} colors={colors} />
          </Field>
        </>
      );
    }
    case "social-feed": {
      const sf = s as SocialFeedSection;
      const posts = sf.posts ?? [];
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={sf.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined } as any)} colors={colors} /></Field>
          <Field label="Handle" colors={colors}><TextField value={sf.handle ?? ""} onChangeText={(t) => on({ handle: t || undefined } as any)} placeholder="e.g. @yourstore" colors={colors} /></Field>
          <SwitchRow label="Show handle" value={sf.showHandle ?? false} onValueChange={(v) => on({ showHandle: v } as any)} colors={colors} />
          <Field label="Columns" colors={colors}>
            <ChipRow options={[{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }, { value: "5", label: "5" }, { value: "6", label: "6" }]} value={String(sf.columns ?? 3)} onChange={(v) => on({ columns: Number(v) } as any)} colors={colors} />
          </Field>
          {posts.map((post, i) => (
            <View key={i} style={{ gap: 6, marginBottom: 10, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
              <ImageField value={post.imageUri ?? ""} onChange={(v) => on({ posts: posts.map((x, j) => j === i ? { ...x, imageUri: v } : x) } as any)} colors={colors} />
              <TextField value={post.caption ?? ""} onChangeText={(t) => on({ posts: posts.map((x, j) => j === i ? { ...x, caption: t || undefined } : x) } as any)} placeholder="Caption (optional)" colors={colors} />
              <TextField value={post.link ?? ""} onChangeText={(t) => on({ posts: posts.map((x, j) => j === i ? { ...x, link: t || undefined } : x) } as any)} placeholder="Link (optional)" colors={colors} />
              <TouchableOpacity onPress={() => on({ posts: posts.filter((_, j) => j !== i) } as any)}>
                <Text style={{ color: colors.destructive, fontSize: 12 }}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => on({ posts: [...posts, { imageUri: "" }] } as any)}>
            <Text style={{ color: colors.primary }}>+ Add post</Text>
          </TouchableOpacity>
        </>
      );
    }
    case "map-location": {
      const ml = s as MapLocationSection;
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={ml.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined } as any)} colors={colors} /></Field>
          <Field label="Address" colors={colors}><TextField value={ml.address ?? ""} onChangeText={(t) => on({ address: t || undefined } as any)} colors={colors} /></Field>
          <Field label="Phone" colors={colors}><TextField value={ml.phone ?? ""} onChangeText={(t) => on({ phone: t || undefined } as any)} colors={colors} /></Field>
          <Field label="Email" colors={colors}><TextField value={ml.email ?? ""} onChangeText={(t) => on({ email: t || undefined } as any)} colors={colors} /></Field>
          <Field label="Hours" colors={colors}><TextField value={ml.hours ?? ""} onChangeText={(t) => on({ hours: t || undefined } as any)} colors={colors} /></Field>
          <Field label="Map embed URL" colors={colors}><TextField value={ml.mapEmbedUrl ?? ""} onChangeText={(t) => on({ mapEmbedUrl: t || undefined } as any)} placeholder="https://maps.google.com/maps?q=..." colors={colors} /></Field>
          <Field label="CTA label" colors={colors}><TextField value={ml.ctaLabel ?? ""} onChangeText={(t) => on({ ctaLabel: t || undefined } as any)} colors={colors} /></Field>
          <Field label="CTA link" colors={colors}><LinkField value={ml.ctaLink ?? ""} onChange={(v) => on({ ctaLink: v || undefined } as any)} colors={colors} /></Field>
        </>
      );
    }
    case "size-guide": {
      const sg = s as SizeGuideSection;
      const cols = sg.columns ?? [];
      const rows = sg.rows ?? [];
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={sg.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined } as any)} colors={colors} /></Field>
          <Field label="Subheading" colors={colors}><TextField value={sg.subheading ?? ""} onChangeText={(t) => on({ subheading: t || undefined } as any)} colors={colors} /></Field>
          <Field label="Unit" colors={colors}>
            <ChipRow
              options={[{ value: "cm", label: "cm" }, { value: "inches", label: "Inches" }]}
              value={sg.unit ?? "cm"}
              onChange={(v) => on({ unit: v } as any)}
              colors={colors}
            />
          </Field>
          <Field label="Note" colors={colors}><TextField value={sg.note ?? ""} onChangeText={(t) => on({ note: t || undefined } as any)} multiline colors={colors} /></Field>
          <Field label="Columns" colors={colors}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {cols.map((col, i) => (
                <View key={i} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.secondary }}>
                  <Text style={{ fontSize: 13, color: colors.foreground }}>{col}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
              <TouchableOpacity onPress={() => on({ columns: [...cols, `Col ${cols.length + 1}`] } as any)}>
                <Text style={{ color: colors.primary, fontSize: 13 }}>+ Add column</Text>
              </TouchableOpacity>
              {cols.length > 0 && (
                <TouchableOpacity onPress={() => on({ columns: cols.slice(0, -1) } as any)}>
                  <Text style={{ color: colors.destructive, fontSize: 13 }}>Remove last</Text>
                </TouchableOpacity>
              )}
            </View>
          </Field>
          {rows.map((row, i) => (
            <View key={i} style={{ gap: 6, marginBottom: 10, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
              <TextField value={row.size} onChangeText={(t) => on({ rows: rows.map((x, j) => j === i ? { ...x, size: t } : x) } as any)} placeholder="Size (e.g. S, M, L)" colors={colors} />
              {cols.map((col) => (
                <TextField key={col} value={(row as any)[col] ?? ""} onChangeText={(t) => on({ rows: rows.map((x, j) => j === i ? { ...x, [col]: t } : x) } as any)} placeholder={col} colors={colors} />
              ))}
              <TouchableOpacity onPress={() => on({ rows: rows.filter((_, j) => j !== i) } as any)}>
                <Text style={{ color: colors.destructive, fontSize: 12 }}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => on({ rows: [...rows, { size: "" }] } as any)}>
            <Text style={{ color: colors.primary }}>+ Add row</Text>
          </TouchableOpacity>
        </>
      );
    }
    case "portfolio": {
      const pf = s as PortfolioSection;
      const items = pf.items ?? [];
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={pf.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined } as any)} colors={colors} /></Field>
          <Field label="Subheading" colors={colors}><TextField value={pf.subheading ?? ""} onChangeText={(t) => on({ subheading: t || undefined } as any)} colors={colors} /></Field>
          <Field label="Columns" colors={colors}>
            <ChipRow
              options={[{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }]}
              value={String(pf.columns ?? 3)}
              onChange={(v) => on({ columns: Number(v) } as any)}
              colors={colors}
            />
          </Field>
          {items.map((item, i) => (
            <View key={i} style={{ gap: 6, marginBottom: 10, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
              <TextField value={item.title} onChangeText={(t) => on({ items: items.map((x, j) => j === i ? { ...x, title: t } : x) } as any)} placeholder="Title" colors={colors} />
              <TextField value={item.category ?? ""} onChangeText={(t) => on({ items: items.map((x, j) => j === i ? { ...x, category: t || undefined } : x) } as any)} placeholder="Category (optional)" colors={colors} />
              <TextField value={item.description ?? ""} onChangeText={(t) => on({ items: items.map((x, j) => j === i ? { ...x, description: t || undefined } : x) } as any)} placeholder="Description (optional)" multiline colors={colors} />
              <ImageField value={item.image ?? ""} onChange={(v) => on({ items: items.map((x, j) => j === i ? { ...x, image: v || undefined } : x) } as any)} colors={colors} />
              <TextField value={item.link ?? ""} onChangeText={(t) => on({ items: items.map((x, j) => j === i ? { ...x, link: t || undefined } : x) } as any)} placeholder="Link (optional)" colors={colors} />
              <TouchableOpacity onPress={() => on({ items: items.filter((_, j) => j !== i) } as any)}>
                <Text style={{ color: colors.destructive, fontSize: 12 }}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => on({ items: [...items, { title: "New item" }] } as any)}>
            <Text style={{ color: colors.primary }}>+ Add item</Text>
          </TouchableOpacity>
        </>
      );
    }
    case "reviews": {
      const rs = s as any;
      const items = rs.testimonials ?? [];
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={rs.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined } as any)} colors={colors} /></Field>
          <Field label="Subheading" colors={colors}><TextField value={rs.subheading ?? ""} onChangeText={(t) => on({ subheading: t || undefined } as any)} colors={colors} /></Field>
          <SwitchRow
            label="Use real customer reviews"
            value={rs.useRealReviews ?? false}
            onValueChange={(v) => on({ useRealReviews: v } as any)}
            colors={colors}
          />
          <Field label="Min rating to show" colors={colors}>
            <ChipRow
              options={[{ value: "3", label: "3★+" }, { value: "4", label: "4★+" }, { value: "5", label: "5★ only" }]}
              value={String(rs.minRating ?? 4)}
              onChange={(v) => on({ minRating: Number(v) } as any)}
              colors={colors}
            />
          </Field>
          {!rs.useRealReviews && (
            <>
              {items.map((item: any, i: number) => (
                <View key={i} style={{ gap: 6, marginBottom: 10, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
                  <Text style={{ fontSize: 11, color: colors.mutedForeground }}>Reviewer photo (optional)</Text>
                  <ImageField value={item.avatar ?? ""} onChange={(v) => on({ testimonials: items.map((x: any, j: number) => j === i ? { ...x, avatar: v || undefined } : x) } as any)} colors={colors} />
                  <TextField value={item.name} onChangeText={(t) => on({ testimonials: items.map((x: any, j: number) => j === i ? { ...x, name: t } : x) } as any)} placeholder="Reviewer name" colors={colors} />
                  <ChipRow options={[{value:"1",label:"1★"},{value:"2",label:"2★"},{value:"3",label:"3★"},{value:"4",label:"4★"},{value:"5",label:"5★"}]} value={String(item.rating ?? 5)} onChange={(v) => on({ testimonials: items.map((x: any, j: number) => j === i ? { ...x, rating: Number(v) } : x) } as any)} colors={colors} />
                  <TextField value={item.text} onChangeText={(t) => on({ testimonials: items.map((x: any, j: number) => j === i ? { ...x, text: t } : x) } as any)} placeholder="Review text" multiline colors={colors} />
                  <TextField value={item.productName ?? ""} onChangeText={(t) => on({ testimonials: items.map((x: any, j: number) => j === i ? { ...x, productName: t || undefined } : x) } as any)} placeholder="Product name (optional)" colors={colors} />
                  <TouchableOpacity onPress={() => on({ testimonials: items.filter((_: any, j: number) => j !== i) } as any)}><Text style={{ color: colors.destructive, fontSize: 12 }}>Remove</Text></TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity onPress={() => on({ testimonials: [...items, { name: "Happy Customer", rating: 5, text: "Great product!" }] } as any)}><Text style={{ color: colors.primary }}>+ Add review</Text></TouchableOpacity>
            </>
          )}
        </>
      );
    }
    case "custom":
      return (
        <CustomSectionEditor
          section={s as any}
          onChange={(patch) => on(patch as any)}
          colors={colors}
        />
      );
    case "lookbook": {
      const lb = s as any;
      const items = lb.items ?? [];
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={lb.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined } as any)} colors={colors} /></Field>
          <Field label="Subheading" colors={colors}><TextField value={lb.subheading ?? ""} onChangeText={(t) => on({ subheading: t || undefined } as any)} colors={colors} /></Field>
          {items.map((item: any, i: number) => (
            <View key={i} style={{ gap: 6, marginBottom: 10, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
              <ImageField value={item.image ?? ""} onChange={(v) => on({ items: items.map((x: any, j: number) => j === i ? { ...x, image: v } : x) } as any)} colors={colors} />
              <TextField value={item.title ?? ""} onChangeText={(t) => on({ items: items.map((x: any, j: number) => j === i ? { ...x, title: t || undefined } : x) } as any)} placeholder="Look title" colors={colors} />
              <TextField value={item.description ?? ""} onChangeText={(t) => on({ items: items.map((x: any, j: number) => j === i ? { ...x, description: t || undefined } : x) } as any)} placeholder="Description (optional)" multiline colors={colors} />
              <TextField value={item.link ?? ""} onChangeText={(t) => on({ items: items.map((x: any, j: number) => j === i ? { ...x, link: t || undefined } : x) } as any)} placeholder="Link (optional)" colors={colors} />
              <TouchableOpacity onPress={() => on({ items: items.filter((_: any, j: number) => j !== i) } as any)}>
                <Text style={{ color: colors.destructive, fontSize: 12 }}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => on({ items: [...items, { image: "" }] } as any)}>
            <Text style={{ color: colors.primary }}>+ Add look</Text>
          </TouchableOpacity>
        </>
      );
    }
    case "timeline": {
      const tl = s as any;
      const milestones = tl.milestones ?? [];
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={tl.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined } as any)} colors={colors} /></Field>
          <Field label="Subheading" colors={colors}><TextField value={tl.subheading ?? ""} onChangeText={(t) => on({ subheading: t || undefined } as any)} colors={colors} /></Field>
          {milestones.map((m: any, i: number) => (
            <View key={i} style={{ gap: 6, marginBottom: 10, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
              <TextField value={m.year} onChangeText={(t) => on({ milestones: milestones.map((x: any, j: number) => j === i ? { ...x, year: t } : x) } as any)} placeholder="Year (e.g. 2022)" colors={colors} />
              <TextField value={m.title} onChangeText={(t) => on({ milestones: milestones.map((x: any, j: number) => j === i ? { ...x, title: t } : x) } as any)} placeholder="Milestone title" colors={colors} />
              <TextField value={m.description ?? ""} onChangeText={(t) => on({ milestones: milestones.map((x: any, j: number) => j === i ? { ...x, description: t || undefined } : x) } as any)} placeholder="Description (optional)" multiline colors={colors} />
              <ImageField value={m.image ?? ""} onChange={(v) => on({ milestones: milestones.map((x: any, j: number) => j === i ? { ...x, image: v || undefined } : x) } as any)} colors={colors} />
              <TouchableOpacity onPress={() => on({ milestones: milestones.filter((_: any, j: number) => j !== i) } as any)}>
                <Text style={{ color: colors.destructive, fontSize: 12 }}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => on({ milestones: [...milestones, { year: "", title: "" }] } as any)}>
            <Text style={{ color: colors.primary }}>+ Add milestone</Text>
          </TouchableOpacity>
        </>
      );
    }
    case "before-after": {
      const ba = s as any;
      const pairs = ba.pairs ?? [];
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={ba.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined } as any)} colors={colors} /></Field>
          <Field label="Subheading" colors={colors}><TextField value={ba.subheading ?? ""} onChangeText={(t) => on({ subheading: t || undefined } as any)} colors={colors} /></Field>
          {pairs.map((pair: any, i: number) => (
            <View key={i} style={{ gap: 6, marginBottom: 10, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground }}>Pair {i + 1}</Text>
              <Text style={{ fontSize: 11, color: colors.mutedForeground }}>Before image</Text>
              <ImageField value={pair.beforeImage ?? ""} onChange={(v) => on({ pairs: pairs.map((x: any, j: number) => j === i ? { ...x, beforeImage: v } : x) } as any)} colors={colors} />
              <Text style={{ fontSize: 11, color: colors.mutedForeground }}>After image</Text>
              <ImageField value={pair.afterImage ?? ""} onChange={(v) => on({ pairs: pairs.map((x: any, j: number) => j === i ? { ...x, afterImage: v } : x) } as any)} colors={colors} />
              <TextField value={pair.label ?? ""} onChangeText={(t) => on({ pairs: pairs.map((x: any, j: number) => j === i ? { ...x, label: t || undefined } : x) } as any)} placeholder="Label (e.g. Skin transformation)" colors={colors} />
              <TextField value={pair.description ?? ""} onChangeText={(t) => on({ pairs: pairs.map((x: any, j: number) => j === i ? { ...x, description: t || undefined } : x) } as any)} placeholder="Description (optional)" multiline colors={colors} />
              <TouchableOpacity onPress={() => on({ pairs: pairs.filter((_: any, j: number) => j !== i) } as any)}>
                <Text style={{ color: colors.destructive, fontSize: 12 }}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => on({ pairs: [...pairs, { beforeImage: "", afterImage: "" }] } as any)}>
            <Text style={{ color: colors.primary }}>+ Add pair</Text>
          </TouchableOpacity>
        </>
      );
    }
    case "bundle-offer": {
      const bo = s as any;
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={bo.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined } as any)} colors={colors} /></Field>
          <Field label="Subheading" colors={colors}><TextField value={bo.subheading ?? ""} onChangeText={(t) => on({ subheading: t || undefined } as any)} colors={colors} /></Field>
          <Field label="Bundle label" colors={colors}><TextField value={bo.bundleLabel ?? ""} onChangeText={(t) => on({ bundleLabel: t || undefined } as any)} placeholder="e.g. Complete set" colors={colors} /></Field>
          <Field label="Bundle price" colors={colors}><TextField value={bo.bundlePrice ?? ""} onChangeText={(t) => on({ bundlePrice: t || undefined } as any)} placeholder="₦12,000" colors={colors} /></Field>
          <Field label="Original price" colors={colors}><TextField value={bo.originalPrice ?? ""} onChangeText={(t) => on({ originalPrice: t || undefined } as any)} placeholder="₦18,000" colors={colors} /></Field>
          <Field label="Savings label" colors={colors}><TextField value={bo.savingsLabel ?? ""} onChangeText={(t) => on({ savingsLabel: t || undefined } as any)} placeholder="Save 33%" colors={colors} /></Field>
          <Field label="CTA label" colors={colors}><TextField value={bo.ctaLabel ?? ""} onChangeText={(t) => on({ ctaLabel: t || undefined } as any)} placeholder="Shop bundle" colors={colors} /></Field>
          <Field label="CTA link" colors={colors}><LinkField value={bo.ctaLink ?? ""} onChange={(v) => on({ ctaLink: v || undefined } as any)} colors={colors} /></Field>
        </>
      );
    }
    case "whatsapp-cta": {
      const wa = s as any;
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={wa.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined } as any)} colors={colors} /></Field>
          <Field label="Subheading" colors={colors}><TextField value={wa.subheading ?? ""} onChangeText={(t) => on({ subheading: t || undefined } as any)} colors={colors} /></Field>
          <Field label="WhatsApp number" colors={colors}><TextField value={wa.phone ?? ""} onChangeText={(t) => on({ phone: t || undefined } as any)} placeholder="+2348012345678" colors={colors} /></Field>
          <Field label="Button label" colors={colors}><TextField value={wa.buttonLabel ?? ""} onChangeText={(t) => on({ buttonLabel: t || undefined } as any)} placeholder="Chat on WhatsApp" colors={colors} /></Field>
          <Field label="Pre-filled message" colors={colors}><TextField value={wa.prefilledMessage ?? ""} onChangeText={(t) => on({ prefilledMessage: t || undefined } as any)} placeholder="Hi! I'd like to know more..." multiline colors={colors} /></Field>
        </>
      );
    }
    case "trust-badges": {
      const tb = s as any;
      const badges: any[] = tb.badges ?? [];
      const ICON_OPTIONS = ["shield", "truck", "refresh-ccw", "award", "star", "zap", "lock", "heart", "package", "check-circle"];
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={tb.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined } as any)} placeholder="(optional heading)" colors={colors} /></Field>
          {badges.map((b, i) => (
            <View key={i} style={{ gap: 6, marginBottom: 10, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
              <TextField value={b.label} onChangeText={(t) => on({ badges: badges.map((x, j) => j === i ? { ...x, label: t } : x) } as any)} placeholder="Label (e.g. Secure payment)" colors={colors} />
              <TextField value={b.description ?? ""} onChangeText={(t) => on({ badges: badges.map((x, j) => j === i ? { ...x, description: t || undefined } : x) } as any)} placeholder="Description (optional)" colors={colors} />
              <Field label="Icon" colors={colors}>
                <ChipRow options={ICON_OPTIONS.slice(0, 4).map((ic) => ({ value: ic, label: ic.split("-")[0] }))} value={b.icon ?? "shield"} onChange={(v) => on({ badges: badges.map((x, j) => j === i ? { ...x, icon: v } : x) } as any)} colors={colors} />
              </Field>
              <TouchableOpacity onPress={() => on({ badges: badges.filter((_, j) => j !== i) } as any)}>
                <Text style={{ color: colors.destructive, fontSize: 12 }}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => on({ badges: [...badges, { icon: "shield", label: "New badge", description: "" }] } as any)}>
            <Text style={{ color: colors.primary }}>+ Add badge</Text>
          </TouchableOpacity>
        </>
      );
    }
    case "payment-methods": {
      const pm = s as any;
      const methods: any[] = pm.methods ?? [];
      return (
        <>
          <Field label="Heading" colors={colors}><TextField value={pm.heading ?? ""} onChangeText={(t) => on({ heading: t || undefined } as any)} placeholder="We accept" colors={colors} /></Field>
          {methods.map((m, i) => (
            <SwitchRow key={m.id} label={m.label} value={m.enabled} onValueChange={(v) => on({ methods: methods.map((x, j) => j === i ? { ...x, enabled: v } : x) } as any)} colors={colors} />
          ))}
        </>
      );
    }
    default:
      return null;
  }
}
