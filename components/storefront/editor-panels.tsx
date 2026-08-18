import { Feather, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import {
  SECTION_LABELS,
  getPageUrl,
  useStorefront,
  type CustomBlock,
  type DesignTokens,
  type FontHeading,
  type NavbarLayout,
  type NavbarLogoMode,
  type NavbarStyle,
  type PaymentProvider,
  type SavedSection,
  type SectionType,
} from "@/lib/storefront";
import { DefaultThumbnail } from "./DefaultThumbnail";
import { ALL_SECTION_TYPES } from "./editor-constants";
import { BRAND_FONT_OPTIONS, ChipRow, Field, FontSelect, FONT_OPTIONS, ImageField, SwitchRow, TextField, type ColorScheme } from "./editor-fields";
import { sectionCount } from "./section-utils";

/* ─── Sections panel ─── */

export function SectionsPanel({
  selectedId,
  onSelect,
  onAdd,
  colors,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  colors: ColorScheme;
}) {
  const { sections, move, moveTo, duplicate, remove, activePage, pages, setActivePageId, addPage, deletePage } = useStorefront();
  const [showNewPage, setShowNewPage] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");

  const derivedSlug = newPageSlug.trim()
    ? newPageSlug.trim().startsWith("/")
      ? newPageSlug.trim()
      : `/${newPageSlug.trim()}`
    : newPageName.trim()
      ? `/${newPageName.trim().toLowerCase().replace(/\s+/g, "-")}`
      : "";

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Text style={[ps.h2, { color: colors.foreground }]}>Page & sections</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
        {pages.map((page) => (
          <TouchableOpacity
            key={page.id}
            onPress={() => setActivePageId(page.id)}
            style={[ps.pageChip, { borderColor: page.id === activePage.id ? colors.primary : colors.border, backgroundColor: page.id === activePage.id ? colors.primary + "12" : colors.card }]}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: page.id === activePage.id ? colors.primary : colors.foreground }}>{page.name}</Text>
            <Text style={{ fontSize: 10, color: colors.mutedForeground }}>{getPageUrl(page.slug)}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={() => setShowNewPage(!showNewPage)} style={[ps.iconBtn, { borderColor: colors.border }]}>
          <Feather name="plus" size={18} color={colors.primary} />
        </TouchableOpacity>
      </ScrollView>

      {showNewPage && (
        <View style={[ps.card, { borderColor: colors.border, marginBottom: 12 }]}>
          <TextField value={newPageName} onChangeText={setNewPageName} placeholder="Page name (e.g. About Us)" colors={colors} />
          {derivedSlug ? <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>Web address: {derivedSlug}</Text> : null}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              onPress={() => {
                if (!newPageName.trim()) return;
                addPage(newPageName.trim(), newPageSlug.trim());
                setNewPageName("");
                setNewPageSlug("");
                setShowNewPage(false);
              }}
              style={[ps.primaryBtn, { backgroundColor: colors.primary, flex: 1 }]}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>Add page</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowNewPage(false)} style={[ps.ghostBtn, { borderColor: colors.border }]}>
              <Text style={{ color: colors.foreground }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity onPress={onAdd} style={[ps.primaryBtn, { backgroundColor: colors.primary, marginBottom: 16 }]}>
        <Feather name="plus" size={16} color="#fff" />
        <Text style={{ color: "#fff", fontWeight: "600", marginLeft: 8 }}>Add section</Text>
      </TouchableOpacity>

      {sections.map((s, i) => (
        <TouchableOpacity
          key={s.id}
          onPress={() => onSelect(s.id)}
          style={[ps.sectionRow, { borderColor: colors.border, backgroundColor: selectedId === s.id ? colors.secondary : colors.card }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "600", color: colors.foreground }}>{SECTION_LABELS[s.type]}</Text>
          </View>
          <TouchableOpacity onPress={() => moveTo(s.id, "top")} disabled={i === 0} hitSlop={8}>
            <Feather name="chevrons-up" size={16} color={i === 0 ? colors.mutedForeground : colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => move(s.id, -1)} disabled={i === 0} hitSlop={8}>
            <Feather name="chevron-up" size={16} color={i === 0 ? colors.mutedForeground : colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => move(s.id, 1)} disabled={i === sections.length - 1} hitSlop={8}>
            <Feather name="chevron-down" size={16} color={i === sections.length - 1 ? colors.mutedForeground : colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => moveTo(s.id, "bottom")} disabled={i === sections.length - 1} hitSlop={8}>
            <Feather name="chevrons-down" size={16} color={i === sections.length - 1 ? colors.mutedForeground : colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => duplicate(s.id)} hitSlop={8}>
            <Feather name="copy" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => remove(s.id)} hitSlop={8}>
            <Feather name="trash-2" size={15} color={colors.destructive} />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}

      {sections.length === 0 && (
        <Text style={{ color: colors.mutedForeground, textAlign: "center", marginTop: 24 }}>No sections yet. Tap Add section.</Text>
      )}
    </ScrollView>
  );
}

/* ─── Pages panel ─── */

export function PagesPanel({ colors }: { colors: ColorScheme }) {
  const { pages, addPage, deletePage, updatePage, setActivePageId, activePage } = useStorefront();
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");

  const saveEdit = (id: string) => {
    const raw = editSlug.trim();
    const normSlug = !raw || raw === "/" ? "/" : raw.startsWith("/") ? raw : `/${raw}`;
    updatePage(id, { name: editName.trim() || editName, slug: normSlug });
    setEditingId(null);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Text style={[ps.h2, { color: colors.foreground }]}>Pages</Text>
      <View style={[ps.card, { borderColor: colors.border, marginTop: 12 }]}>
        <Text style={{ fontWeight: "600", marginBottom: 8, color: colors.foreground }}>New page</Text>
        <TextField value={newName} onChangeText={setNewName} placeholder="Page name" colors={colors} />
        <TextField value={newSlug} onChangeText={setNewSlug} placeholder="/about" colors={colors} />
        <TouchableOpacity
          onPress={() => {
            if (!newName.trim()) return;
            addPage(newName.trim(), newSlug.trim());
            setNewName("");
            setNewSlug("");
          }}
          style={[ps.primaryBtn, { backgroundColor: colors.primary, marginTop: 8 }]}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Create page</Text>
        </TouchableOpacity>
      </View>

      {pages.map((pg) => (
        <View key={pg.id} style={[ps.card, { borderColor: pg.id === activePage.id ? colors.primary : colors.border, marginTop: 10 }]}>
          {editingId === pg.id ? (
            <>
              <TextField value={editName} onChangeText={setEditName} colors={colors} />
              <TextField value={editSlug} onChangeText={setEditSlug} colors={colors} />
              {pg.slug.includes(":") && <Text style={{ fontSize: 11, color: "#b45309" }}>Dynamic route — :param filled from URL</Text>}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <TouchableOpacity onPress={() => saveEdit(pg.id)} style={[ps.primaryBtn, { backgroundColor: colors.primary, flex: 1 }]}>
                  <Text style={{ color: "#fff" }}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingId(null)} style={[ps.ghostBtn, { borderColor: colors.border }]}>
                  <Text>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "600", color: colors.foreground }}>{pg.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>{getPageUrl(pg.slug)}{pg.slug.includes(":") ? " (dynamic)" : ""}</Text>
                </View>
                <TouchableOpacity onPress={() => { setEditingId(pg.id); setEditName(pg.name); setEditSlug(pg.slug); }} style={{ padding: 8 }}>
                  <Feather name="edit-2" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActivePageId(pg.id)} style={{ padding: 8 }}>
                  <Text style={{ color: colors.primary, fontSize: 12 }}>Edit</Text>
                </TouchableOpacity>
                {pages.length > 1 && pg.slug !== "/" && (
                  <TouchableOpacity
                    onPress={() => Alert.alert("Delete page?", `Remove "${pg.name}"?`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => deletePage(pg.id) },
                    ])}
                    style={{ padding: 8 }}
                  >
                    <Feather name="trash-2" size={16} color={colors.destructive} />
                  </TouchableOpacity>
                )}
              </View>
              {/* Per-page chrome visibility */}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <TouchableOpacity
                  onPress={() => updatePage(pg.id, { hideNavbar: !pg.hideNavbar })}
                  style={[ps.toggleBtn, { borderColor: pg.hideNavbar ? colors.primary : colors.border, backgroundColor: pg.hideNavbar ? colors.primary + "18" : "transparent" }]}
                >
                  <Feather name={pg.hideNavbar ? "eye-off" : "eye"} size={12} color={pg.hideNavbar ? colors.primary : colors.mutedForeground} />
                  <Text style={{ fontSize: 11, color: pg.hideNavbar ? colors.primary : colors.mutedForeground }}>
                    {pg.hideNavbar ? "Navbar hidden" : "Show navbar"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => updatePage(pg.id, { hideFooter: !pg.hideFooter })}
                  style={[ps.toggleBtn, { borderColor: pg.hideFooter ? colors.primary : colors.border, backgroundColor: pg.hideFooter ? colors.primary + "18" : "transparent" }]}
                >
                  <Feather name={pg.hideFooter ? "eye-off" : "eye"} size={12} color={pg.hideFooter ? colors.primary : colors.mutedForeground} />
                  <Text style={{ fontSize: 11, color: pg.hideFooter ? colors.primary : colors.mutedForeground }}>
                    {pg.hideFooter ? "Footer hidden" : "Show footer"}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      ))}

      <View style={[ps.helpBox, { backgroundColor: colors.secondary, marginTop: 16 }]}>
        <Text style={{ fontWeight: "600", color: colors.foreground, marginBottom: 6 }}>How URLs work</Text>
        <Text style={{ fontSize: 12, color: colors.mutedForeground, lineHeight: 18 }}>
          Use paths like /about or dynamic routes like /product/:slug. Add a Product detail section on dynamic product pages.
        </Text>
      </View>
    </ScrollView>
  );
}

/* ─── Global panel ─── */

export function GlobalPanelFull({ colors, mode }: { colors: ColorScheme; mode: "navbar" | "footer" | "both" }) {
  const { navbar, updateNavbar, footer, updateFooter } = useStorefront();

  const showNav = mode === "navbar" || mode === "both";
  const showFoot = mode === "footer" || mode === "both";

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      {showNav && (
        <>
          <Text style={[ps.h2, { color: colors.foreground }]}>Top Menu</Text>
          <Field label="Brand name" colors={colors}><TextField value={navbar.brand} onChangeText={(t) => updateNavbar({ brand: t })} colors={colors} /></Field>
          <Field label="Brand font — custom font for your shop name" colors={colors}>
            <FontSelect
              value={navbar.brandFont ?? undefined}
              onChange={(v) => updateNavbar({ brandFont: (v as FontHeading | undefined) })}
              options={BRAND_FONT_OPTIONS}
              colors={colors}
              nullable
            />
          </Field>
          <Field label="Logo image" colors={colors}><ImageField value={navbar.logoImage ?? ""} onChange={(v) => updateNavbar({ logoImage: v || undefined })} colors={colors} /></Field>
          <Field label="Logo display" colors={colors}>
            <ChipRow
              options={[
                { value: "text", label: "Text" },
                { value: "logo", label: "Logo" },
                { value: "both", label: "Both" },
              ]}
              value={navbar.logoMode ?? "text"}
              onChange={(v) => updateNavbar({ logoMode: v as NavbarLogoMode })}
              colors={colors}
            />
          </Field>
          <Field label="Logo position" colors={colors}>
            <ChipRow
              options={[
                { value: "logo-left", label: "Left" },
                { value: "logo-center", label: "Center" },
                { value: "logo-right", label: "Right" },
              ]}
              value={navbar.layout ?? "logo-left"}
              onChange={(v) => updateNavbar({ layout: v as NavbarLayout })}
              colors={colors}
            />
          </Field>
          <Field label="Menu style" colors={colors}>
            <ChipRow
              options={[
                { value: "default", label: "Default" },
                { value: "minimal", label: "Minimal" },
                { value: "bordered", label: "Bordered" },
                { value: "filled", label: "Filled" },
                { value: "transparent", label: "Glass" },
              ]}
              value={navbar.navbarStyle ?? "default"}
              onChange={(v) => updateNavbar({ navbarStyle: v as NavbarStyle })}
              colors={colors}
            />
          </Field>
          {(navbar.navbarStyle === "filled" || navbar.navbarStyle === "bordered") && (
            <Field label="Menu background colour" colors={colors}>
              <TextField
                value={navbar.navbarBg ?? ""}
                onChangeText={(v) => updateNavbar({ navbarBg: v || undefined })}
                placeholder={navbar.navbarStyle === "filled" ? "#111111" : ""}
                colors={colors}
              />
            </Field>
          )}
          {(navbar.logoMode === "logo" || navbar.logoMode === "both") && navbar.logoImage ? (
            <Field label={`Logo height: ${navbar.logoHeight ?? 28}px`} colors={colors}>
              <ChipRow
                options={[16, 24, 32, 48, 64].map((n) => ({ value: String(n), label: `${n}px` }))}
                value={String(navbar.logoHeight ?? 28)}
                onChange={(v) => updateNavbar({ logoHeight: Number(v) })}
                colors={colors}
              />
            </Field>
          ) : null}
          <Text style={{ fontWeight: "600", marginTop: 8, marginBottom: 8, color: colors.foreground }}>Links & buttons</Text>
          {navbar.links.map((l, i) => {
            const updateLink = (patch: Partial<typeof l>) =>
              updateNavbar({ links: navbar.links.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
            return (
              <View key={i} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, marginBottom: 10, gap: 8 }}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <View style={{ flex: 1 }}>
                    <TextField value={l.label} onChangeText={(t) => updateLink({ label: t })} placeholder="Label" colors={colors} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField value={l.href} onChangeText={(t) => updateLink({ href: t })} placeholder="e.g. /shop or /about" colors={colors} />
                  </View>
                  <TouchableOpacity onPress={() => updateNavbar({ links: navbar.links.filter((_, j) => j !== i) })} style={{ paddingTop: 10 }}>
                    <Feather name="trash-2" size={16} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <SwitchRow label="Show as button" value={l.isButton ?? false} onValueChange={(v) => updateLink({ isButton: v })} colors={colors} />
                </View>
                {l.isButton && (
                  <View style={{ gap: 6, marginTop: 4 }}>
                    <ChipRow
                      options={[{ value: "solid", label: "Solid" }, { value: "outline", label: "Outline" }, { value: "ghost", label: "Ghost" }]}
                      value={l.btnStyle ?? "solid"}
                      onChange={(v) => updateLink({ btnStyle: v as any })}
                      colors={colors}
                    />
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <View style={{ flex: 1 }}>
                        <TextField value={l.btnBg ?? ""} onChangeText={(v) => updateLink({ btnBg: v || undefined })} placeholder="Button color (e.g. #6366f1)" colors={colors} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <TextField value={l.btnColor ?? ""} onChangeText={(v) => updateLink({ btnColor: v || undefined })} placeholder="Text color (e.g. #ffffff)" colors={colors} />
                      </View>
                    </View>
                    <SwitchRow label="Show in mobile sidebar" value={l.showInSidebar !== false} onValueChange={(v) => updateLink({ showInSidebar: v })} colors={colors} />
                  </View>
                )}
              </View>
            );
          })}
          <TouchableOpacity onPress={() => updateNavbar({ links: [...navbar.links, { label: "New", href: "/" }] })}>
            <Text style={{ color: colors.primary }}>+ Add link</Text>
          </TouchableOpacity>
          <Text style={{ fontWeight: "600", marginTop: 12, marginBottom: 4, color: colors.foreground }}>Icons</Text>
          <SwitchRow label="Show search icon" value={navbar.showSearch} onValueChange={(v) => updateNavbar({ showSearch: v })} colors={colors} />
          {navbar.showSearch && (
            <>
              <Field label="Search icon" colors={colors}>
                <NavIconPicker icons={["search-outline","search","search-sharp","search-circle-outline","scan-outline","barcode-outline"]} value={navbar.searchIcon ?? "search-outline"} onChange={(v) => updateNavbar({ searchIcon: v })} colors={colors} />
              </Field>
              <Field label="Search style" colors={colors}>
                <ChipRow
                  options={[
                    { value: "bar-top", label: "Bar (top) ★" },
                    { value: "dropdown", label: "Dropdown" },
                    { value: "expand", label: "Full screen" },
                    { value: "slide", label: "Slide" },
                    { value: "overlay", label: "Overlay" },
                    { value: "drawer", label: "Drawer →" },
                  ]}
                  value={navbar.searchStyle ?? "dropdown"}
                  onChange={(v) => updateNavbar({ searchStyle: v as any })}
                  colors={colors}
                />
              </Field>
            </>
          )}
          <SwitchRow label="Show profile icon" value={navbar.showProfileIcon ?? false} onValueChange={(v) => updateNavbar({ showProfileIcon: v })} colors={colors} />
          {navbar.showProfileIcon && (
            <>
              <Field label="Profile icon" colors={colors}>
                <NavIconPicker icons={["person-circle-outline","person-circle","person-outline","person","contact-outline","people-outline"]} value={navbar.profileIcon ?? "person-circle-outline"} onChange={(v) => updateNavbar({ profileIcon: v })} colors={colors} />
              </Field>
              <Field label="Profile page link" colors={colors}>
                <TextField value={navbar.profileLink ?? "/login"} onChangeText={(v) => updateNavbar({ profileLink: v || "/login" })} placeholder="/login" colors={colors} />
              </Field>
            </>
          )}
          <SwitchRow label="Show cart icon" value={navbar.showCart} onValueChange={(v) => updateNavbar({ showCart: v })} colors={colors} />
          {navbar.showCart && (
            <>
              <Field label="Cart icon" colors={colors}>
                <NavIconPicker icons={["bag-outline","bag-handle-outline","bag-check-outline","bag-add-outline","cart-outline","cart","gift-outline","storefront-outline"]} value={navbar.cartIcon ?? "bag-outline"} onChange={(v) => updateNavbar({ cartIcon: v })} colors={colors} />
              </Field>
              <SwitchRow label="Show cart count badge" value={navbar.showCartCount !== false} onValueChange={(v) => updateNavbar({ showCartCount: v })} colors={colors} />
              {navbar.showCartCount !== false && (
                <Field label="Badge colour (hex)" colors={colors}>
                  <TextField value={navbar.cartBadgeColor ?? "#ef4444"} onChangeText={(v) => updateNavbar({ cartBadgeColor: v })} placeholder="#ef4444" colors={colors} />
                </Field>
              )}
            </>
          )}
          <Field label="Menu icon" colors={colors}>
            <NavIconPicker icons={["menu-outline","menu","reorder-three-outline","reorder-four-outline","grid-outline","apps-outline","ellipsis-horizontal-outline","ellipsis-vertical-outline"]} value={navbar.menuIcon ?? "menu-outline"} onChange={(v) => updateNavbar({ menuIcon: v })} colors={colors} />
          </Field>
          <SwitchRow label="Sticky header" value={navbar.sticky} onValueChange={(v) => updateNavbar({ sticky: v })} colors={colors} />
          <Field label="Sidebar open animation" colors={colors}>
            <ChipRow
              options={[
                { value: "slide", label: "Slide" },
                { value: "spring", label: "Spring" },
                { value: "bounce", label: "Bounce" },
                { value: "fade", label: "Fade" },
              ]}
              value={navbar.sidebarAnimation ?? "slide"}
              onChange={(v) => updateNavbar({ sidebarAnimation: v as any })}
              colors={colors}
            />
          </Field>
          <Field label="Sidebar link style" colors={colors}>
            <ChipRow
              options={[
                { value: "plain", label: "Plain" },
                { value: "chevron", label: "Chevron ›" },
                { value: "arrow", label: "Arrow →" },
                { value: "dot", label: "• Dot" },
                { value: "numbered", label: "1. Numbered" },
              ]}
              value={navbar.listStyle ?? "chevron"}
              onChange={(v) => updateNavbar({ listStyle: v as any })}
              colors={colors}
            />
          </Field>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, marginBottom: 4 }}>
            <Text style={{ fontWeight: "600", color: colors.foreground }}>Top Menu Buttons</Text>
            {(navbar.ctaButtons ?? []).length < 3 && (
              <TouchableOpacity onPress={() => updateNavbar({ ctaButtons: [...(navbar.ctaButtons ?? []), { label: "Order Now", href: "/shop", style: "solid" }] })}>
                <Text style={{ color: colors.primary, fontSize: 13 }}>+ Add button</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 8 }}>
            Extra buttons shown in the top menu &amp; sidebar. Up to 3.
          </Text>
          {(navbar.ctaButtons ?? []).map((btn, i) => (
            <View key={i} style={[ps.card, { borderColor: colors.border, marginBottom: 8 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground }}>Button {i + 1}</Text>
                <TouchableOpacity onPress={() => updateNavbar({ ctaButtons: (navbar.ctaButtons ?? []).filter((_, j) => j !== i) })}>
                  <Text style={{ color: colors.destructive, fontSize: 12 }}>Remove</Text>
                </TouchableOpacity>
              </View>
              <Field label="Label" colors={colors}>
                <TextField value={btn.label} onChangeText={(t) => updateNavbar({ ctaButtons: (navbar.ctaButtons ?? []).map((b, j) => j === i ? { ...b, label: t } : b) })} placeholder='e.g. "Order Now"' colors={colors} />
              </Field>
              <Field label="Link" colors={colors}>
                <TextField value={btn.href} onChangeText={(v) => updateNavbar({ ctaButtons: (navbar.ctaButtons ?? []).map((b, j) => j === i ? { ...b, href: v || "/shop" } : b) })} placeholder="/shop" colors={colors} />
              </Field>
              <Field label="Style" colors={colors}>
                <ChipRow
                  options={[
                    { value: "solid", label: "Solid" },
                    { value: "outline", label: "Outline" },
                    { value: "ghost", label: "Ghost" },
                  ]}
                  value={btn.style}
                  onChange={(v) => updateNavbar({ ctaButtons: (navbar.ctaButtons ?? []).map((b, j) => j === i ? { ...b, style: v as any } : b) })}
                  colors={colors}
                />
              </Field>
              <Field label="Background colour (leave blank for accent)" colors={colors}>
                <TextField value={btn.btnBg ?? ""} onChangeText={(v) => updateNavbar({ ctaButtons: (navbar.ctaButtons ?? []).map((b, j) => j === i ? { ...b, btnBg: v || undefined } : b) })} placeholder="#6366f1" colors={colors} />
              </Field>
              <Field label="Text colour (leave blank for auto)" colors={colors}>
                <TextField value={btn.btnColor ?? ""} onChangeText={(v) => updateNavbar({ ctaButtons: (navbar.ctaButtons ?? []).map((b, j) => j === i ? { ...b, btnColor: v || undefined } : b) })} placeholder="#ffffff" colors={colors} />
              </Field>
              <Field label="Position in navbar" colors={colors}>
                <ChipRow
                  options={[{ value: "right", label: "Right side" }, { value: "left", label: "Left side" }]}
                  value={btn.navPosition ?? "right"}
                  onChange={(v) => updateNavbar({ ctaButtons: (navbar.ctaButtons ?? []).map((b, j) => j === i ? { ...b, navPosition: v as any } : b) })}
                  colors={colors}
                />
              </Field>
              <SwitchRow
                label="Sidebar only (hide from navbar on mobile)"
                value={btn.showInSidebar === true}
                onValueChange={(v) => updateNavbar({ ctaButtons: (navbar.ctaButtons ?? []).map((b, j) => j === i ? { ...b, showInSidebar: v } : b) })}
                colors={colors}
              />
            </View>
          ))}
        </>
      )}

      {showFoot && (
        <>
          <Text style={[ps.h2, { color: colors.foreground, marginTop: showNav ? 24 : 0 }]}>Footer</Text>

          {/* Logo */}
          <Field label="Logo display" colors={colors}>
            <ChipRow
              options={[{ value: "text", label: "Text only" }, { value: "logo", label: "Logo only" }, { value: "both", label: "Logo + text" }]}
              value={footer.logoMode ?? "text"}
              onChange={(v) => updateFooter({ logoMode: v as any })}
              colors={colors}
            />
          </Field>
          {(footer.logoMode === "logo" || footer.logoMode === "both") && (
            <Field label="Logo image" colors={colors}>
              <ImageField value={footer.logoImage ?? ""} onChange={(v) => updateFooter({ logoImage: v || undefined })} colors={colors} />
            </Field>
          )}
          {(footer.logoMode === "logo" || footer.logoMode === "both") && (
            <Field label="Logo height (px)" colors={colors}>
              <ChipRow
                options={[{ value: "24", label: "24" }, { value: "32", label: "32" }, { value: "40", label: "40" }, { value: "48", label: "48" }]}
                value={String(footer.logoHeight ?? 32)}
                onChange={(v) => updateFooter({ logoHeight: Number(v) })}
                colors={colors}
              />
            </Field>
          )}

          <Field label="Brand name" colors={colors}><TextField value={footer.brand} onChangeText={(t) => updateFooter({ brand: t })} colors={colors} /></Field>
          <Field label="Tagline" colors={colors}><TextField value={footer.tagline} onChangeText={(t) => updateFooter({ tagline: t })} colors={colors} /></Field>
          <Field label="Text alignment" colors={colors}>
            <ChipRow
              options={[
                { value: "left", label: "Left" },
                { value: "center", label: "Center" },
                { value: "right", label: "Right" },
              ]}
              value={footer.textAlign ?? "left"}
              onChange={(v) => updateFooter({ textAlign: v as any })}
              colors={colors}
            />
          </Field>
          <SwitchRow label="Show social links" value={footer.showSocial} onValueChange={(v) => updateFooter({ showSocial: v })} colors={colors} />
          {footer.showSocial && (
            <>
              <Text style={{ fontWeight: "600", marginTop: 8, marginBottom: 4, color: colors.foreground }}>Social links</Text>
              {(footer.socialLinks ?? []).map((s, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 6, marginBottom: 6, alignItems: "center" }}>
                  <View style={{ width: 90 }}>
                    <ChipRow
                      options={[
                        { value: "instagram", label: "IG" },
                        { value: "twitter", label: "X" },
                        { value: "facebook", label: "FB" },
                        { value: "tiktok", label: "TK" },
                        { value: "whatsapp", label: "WA" },
                        { value: "youtube", label: "YT" },
                      ]}
                      value={s.platform}
                      onChange={(v) => updateFooter({ socialLinks: (footer.socialLinks ?? []).map((x, j) => j === i ? { ...x, platform: v as any } : x) })}
                      colors={colors}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField value={s.url} onChangeText={(t) => updateFooter({ socialLinks: (footer.socialLinks ?? []).map((x, j) => j === i ? { ...x, url: t } : x) })} placeholder="https://instagram.com/yourstore" colors={colors} />
                  </View>
                  <TouchableOpacity onPress={() => updateFooter({ socialLinks: (footer.socialLinks ?? []).filter((_, j) => j !== i) })}>
                    <Feather name="x" size={16} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              ))}
              {(footer.socialLinks ?? []).length < 6 && (
                <TouchableOpacity onPress={() => updateFooter({ socialLinks: [...(footer.socialLinks ?? []), { platform: "instagram" as const, url: "" }] })}>
                  <Text style={{ color: colors.primary, fontSize: 12 }}>+ Add social link</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Footer CTA buttons */}
          <Text style={{ fontWeight: "600", marginTop: 12, marginBottom: 4, color: colors.foreground }}>Footer buttons</Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 8 }}>Action buttons shown below the footer brand</Text>
          {(footer.ctaButtons ?? []).map((btn, i) => (
            <View key={i} style={[ps.card, { borderColor: colors.border, marginBottom: 8 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground }}>Button {i + 1}</Text>
                <TouchableOpacity onPress={() => updateFooter({ ctaButtons: (footer.ctaButtons ?? []).filter((_, j) => j !== i) })}>
                  <Text style={{ color: colors.destructive, fontSize: 12 }}>Remove</Text>
                </TouchableOpacity>
              </View>
              <Field label="Label" colors={colors}>
                <TextField value={btn.label} onChangeText={(t) => updateFooter({ ctaButtons: (footer.ctaButtons ?? []).map((b, j) => j === i ? { ...b, label: t } : b) })} placeholder='e.g. "Shop Now"' colors={colors} />
              </Field>
              <Field label="Link" colors={colors}>
                <TextField value={btn.href} onChangeText={(v) => updateFooter({ ctaButtons: (footer.ctaButtons ?? []).map((b, j) => j === i ? { ...b, href: v || "/" } : b) })} placeholder="/shop" colors={colors} />
              </Field>
              <Field label="Style" colors={colors}>
                <ChipRow
                  options={[{ value: "solid", label: "Solid" }, { value: "outline", label: "Outline" }, { value: "ghost", label: "Ghost" }]}
                  value={btn.style}
                  onChange={(v) => updateFooter({ ctaButtons: (footer.ctaButtons ?? []).map((b, j) => j === i ? { ...b, style: v as any } : b) })}
                  colors={colors}
                />
              </Field>
              <Field label="Background colour" colors={colors}>
                <TextField value={btn.btnBg ?? ""} onChangeText={(v) => updateFooter({ ctaButtons: (footer.ctaButtons ?? []).map((b, j) => j === i ? { ...b, btnBg: v || undefined } : b) })} placeholder="#6366f1" colors={colors} />
              </Field>
              <Field label="Text colour" colors={colors}>
                <TextField value={btn.btnColor ?? ""} onChangeText={(v) => updateFooter({ ctaButtons: (footer.ctaButtons ?? []).map((b, j) => j === i ? { ...b, btnColor: v || undefined } : b) })} placeholder="#ffffff" colors={colors} />
              </Field>
            </View>
          ))}
          {(footer.ctaButtons ?? []).length < 3 && (
            <TouchableOpacity onPress={() => updateFooter({ ctaButtons: [...(footer.ctaButtons ?? []), { label: "Shop Now", href: "/shop", style: "solid" }] })}>
              <Text style={{ color: colors.primary }}>+ Add footer button</Text>
            </TouchableOpacity>
          )}

          {footer.columns.map((c, i) => (
            <View key={i} style={[ps.card, { borderColor: colors.border, marginTop: 10 }]}>
              <TextField value={c.title} onChangeText={(t) => updateFooter({ columns: footer.columns.map((x, j) => (j === i ? { ...x, title: t } : x)) })} placeholder="Section heading (e.g. Help)" colors={colors} />
              {c.links.map((l, j) => (
                <View key={j} style={{ flexDirection: "row", gap: 4, marginTop: 6 }}>
                  <TextField value={l.label} onChangeText={(t) => updateFooter({ columns: footer.columns.map((col, ci) => ci === i ? { ...col, links: col.links.map((lk, lj) => lj === j ? { ...lk, label: t } : lk) } : col) })} colors={colors} />
                  <TextField value={l.href} onChangeText={(t) => updateFooter({ columns: footer.columns.map((col, ci) => ci === i ? { ...col, links: col.links.map((lk, lj) => lj === j ? { ...lk, href: t } : lk) } : col) })} colors={colors} />
                  <TouchableOpacity onPress={() => updateFooter({ columns: footer.columns.map((col, ci) => ci === i ? { ...col, links: col.links.filter((_, lj) => lj !== j) } : col) })}>
                    <Feather name="x" size={14} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity onPress={() => updateFooter({ columns: footer.columns.map((col, ci) => ci === i ? { ...col, links: [...col.links, { label: "Link", href: "/" }] } : col) })} style={{ marginTop: 6 }}>
                <Text style={{ fontSize: 12, color: colors.primary }}>+ Link</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

/* ─── Theme panel ─── */

export function ThemePanelFull({ colors }: { colors: ColorScheme }) {
  const { theme, setTheme, designTokens, updateDesignTokens } = useStorefront();
  const dt = designTokens;

  const tokenBtn = (active: boolean, onPress: () => void, label: string) => (
    <TouchableOpacity onPress={onPress} style={[ps.tokenBtn, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + "15" : "transparent" }]}>
      <Text style={{ fontSize: 12, fontWeight: active ? "600" : "400", color: colors.foreground }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Text style={[ps.h2, { color: colors.foreground }]}>Theme</Text>
      <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 12 }}>Colour mode</Text>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { id: "light" as const,  label: "Light",       bg: "#ffffff", fg: "#111111", accent: "#6366f1", desc: "Clean & bright" },
          { id: "dark" as const,   label: "Dark",        bg: "#111111", fg: "#ffffff", accent: "#818cf8", desc: "Modern & bold" },
          { id: "matte" as const,  label: "Matte Black", bg: "#0a0a0a", fg: "#f5f5f5", accent: "#e2e8f0", desc: "Luxury & premium" },
          { id: "glass" as const,  label: "Glass",       bg: "#1e293b", fg: "#e0e7ef", accent: "#60a5fa", desc: "Elegant & depth" },
        ].map((t) => {
          const active = theme === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTheme(t.id)}
              style={{ width: 140, borderRadius: 12, overflow: "hidden", borderWidth: active ? 2 : 1, borderColor: active ? colors.primary : colors.border }}
            >
              {/* Mini store preview */}
              <View style={{ backgroundColor: t.bg, padding: 8, gap: 4 }}>
                <View style={{ height: 4, width: "60%", borderRadius: 2, backgroundColor: t.fg + "dd" }} />
                <View style={{ height: 3, width: "40%", borderRadius: 2, backgroundColor: t.fg + "66" }} />
                <View style={{ height: 18, borderRadius: 4, backgroundColor: t.accent + "33", marginTop: 4, alignItems: "center", justifyContent: "center" }}>
                  <View style={{ height: 3, width: "50%", borderRadius: 2, backgroundColor: t.accent }} />
                </View>
              </View>
              <View style={{ backgroundColor: colors.card, padding: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: active ? colors.primary : colors.foreground }}>{t.label}</Text>
                <Text style={{ fontSize: 10, color: colors.mutedForeground, marginTop: 2 }}>{t.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Field label="Heading font — style of all titles and section headers" colors={colors}>
        <FontSelect
          value={dt.fontHeading ?? "sans"}
          onChange={(v) => updateDesignTokens({ fontHeading: (v ?? "sans") as FontHeading })}
          options={FONT_OPTIONS}
          colors={colors}
        />
      </Field>

      <Field label="Body font — paragraphs and descriptions" colors={colors}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(
            [
              { key: "inherit", label: "Same as Heading" },
              { key: "sans",    label: "Inter (default)" },
              { key: "poppins", label: "Poppins" },
              { key: "raleway", label: "Raleway" },
            ] as Array<{ key: NonNullable<DesignTokens["fontBody"]>; label: string }>
          ).map(({ key, label }) => (
            tokenBtn((dt.fontBody ?? "inherit") === key, () => updateDesignTokens({ fontBody: key }), label)
          ))}
        </View>
      </Field>

      <Field label="Heading case — how heading text is capitalised" colors={colors}>
        <ChipRow
          options={[{ value: "normal", label: "Normal (as typed)" }, { value: "uppercase", label: "UPPERCASE" }]}
          value={dt.headingCase ?? "normal"}
          onChange={(v) => updateDesignTokens({ headingCase: v as DesignTokens["headingCase"] })}
          colors={colors}
        />
      </Field>

      <Field label="Card radius" colors={colors}>
        <ChipRow
          options={(["none", "sm", "md", "lg", "full"] as const).map((v) => ({ value: v, label: v }))}
          value={dt.cardRadius}
          onChange={(v) => updateDesignTokens({ cardRadius: v as DesignTokens["cardRadius"] })}
          colors={colors}
        />
      </Field>

      <Field label="Button shape" colors={colors}>
        <ChipRow
          options={(["pill", "rounded", "square"] as const).map((v) => ({ value: v, label: v }))}
          value={dt.buttonShape}
          onChange={(v) => updateDesignTokens({ buttonShape: v as DesignTokens["buttonShape"] })}
          colors={colors}
        />
      </Field>

      <Field label="Product image ratio" colors={colors}>
        <ChipRow
          options={[{ value: "portrait", label: "Portrait" }, { value: "square", label: "Square" }]}
          value={dt.productImageRatio}
          onChange={(v) => updateDesignTokens({ productImageRatio: v as DesignTokens["productImageRatio"] })}
          colors={colors}
        />
      </Field>

      <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 12 }}>
        Tip: tap any block in the preview to override colours per section.
      </Text>
    </ScrollView>
  );
}

function SaveAsTemplateButton({ colors, onSave }: { colors: ColorScheme; onSave: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  if (!open) {
    return (
      <TouchableOpacity onPress={() => setOpen(true)} style={[ps.ghostBtn, { borderColor: colors.border, marginTop: 8, marginBottom: 12 }]}>
        <Text style={{ color: colors.foreground }}>Save current as new template</Text>
      </TouchableOpacity>
    );
  }
  return (
    <View style={[ps.card, { borderColor: colors.border, marginTop: 8, marginBottom: 12 }]}>
      <TextField value={name} onChangeText={setName} placeholder="Template name" colors={colors} />
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        <TouchableOpacity
          onPress={() => {
            if (name.trim()) {
              onSave(name.trim());
              setName("");
              setOpen(false);
            }
          }}
          style={[ps.primaryBtn, { backgroundColor: colors.primary, flex: 1 }]}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setOpen(false)} style={[ps.ghostBtn, { borderColor: colors.border }]}>
          <Text style={{ color: colors.foreground }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ─── Templates panel (in editor) ─── */

export function TemplatesPanelInEditor({ colors, onClose }: { colors: ColorScheme; onClose?: () => void }) {
  const router = useRouter();
  const { templates, activeTemplateId, applyTemplate, saveAsTemplate, duplicateTemplate, deleteTemplate, renameTemplate, patchTemplate, newTemplate } = useStorefront();
  const [name, setName] = useState("");

  const pickThumb = async (id: string) => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, base64: true });
    if (!res.canceled && res.assets[0]?.base64) {
      const mime = res.assets[0].mimeType ?? "image/jpeg";
      patchTemplate(id, { thumbnail: `data:${mime};base64,${res.assets[0].base64}` });
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={[ps.h2, { color: colors.foreground }]}>Templates</Text>
        {onClose ? (
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <TextField value={name} onChangeText={setName} placeholder="New template name" colors={colors} />
        <TouchableOpacity
          onPress={() => {
            if (!name.trim()) return;
            const id = newTemplate(name.trim());
            applyTemplate(id);
            setName("");
            router.push(`/store-builder/${id}` as any);
          }}
          style={[ps.primaryBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>New</Text>
        </TouchableOpacity>
      </View>

      <SaveAsTemplateButton colors={colors} onSave={saveAsTemplate} />

      {templates.map((t) => (
        <View key={t.id} style={[ps.card, { borderColor: t.id === activeTemplateId ? colors.primary : colors.border, marginBottom: 12 }]}>
          <TouchableOpacity onPress={() => pickThumb(t.id)} style={{ marginBottom: 8 }}>
            {t.thumbnail ? (
              <Image source={{ uri: t.thumbnail }} style={{ width: "100%", height: 72, borderRadius: 8 }} resizeMode="cover" />
            ) : (
              <DefaultThumbnail template={t} height={72} />
            )}
          </TouchableOpacity>
          <TextField value={t.name} onChangeText={(n) => renameTemplate(t.id, n)} colors={colors} />
          <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 4 }}>
            {t.pages.length} pages · {sectionCount(t)} sections
            {t.id === activeTemplateId ? " · Active" : ""}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {t.id !== activeTemplateId && (
              <TouchableOpacity onPress={() => applyTemplate(t.id)} style={[ps.miniBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: "#fff", fontSize: 11 }}>Apply</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => router.push(`/store-builder/${t.id}` as any)} style={[ps.miniBtn, { borderColor: colors.border, borderWidth: 1 }]}>
              <Text style={{ fontSize: 11, color: colors.foreground }}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => duplicateTemplate(t.id)} style={[ps.miniBtn, { borderColor: colors.border, borderWidth: 1 }]}>
              <Text style={{ fontSize: 11 }}>Duplicate</Text>
            </TouchableOpacity>
            {templates.length > 1 && (
              <TouchableOpacity
                onPress={() => Alert.alert("Delete?", `Delete "${t.name}"?`, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => deleteTemplate(t.id) },
                ])}
                style={[ps.miniBtn, { borderColor: colors.destructive + "55", borderWidth: 1 }]}
              >
                <Text style={{ fontSize: 11, color: colors.destructive }}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

/* ─── Payments panel ─── */

export function PaymentsPanelFull({ colors }: { colors: ColorScheme }) {
  const { paymentConfig, updatePaymentConfig, referrals, updateReferrals } = useStorefront();
  const currencies = ["USD", "NGN", "GHS", "KES", "ZAR", "GBP", "EUR"];

  const options: { id: PaymentProvider; label: string; desc: string }[] = [
    { id: "none", label: "Demo mode", desc: "Simulated checkout for testing." },
    { id: "paystack", label: "Paystack", desc: "Customer pays via Paystack." },
    { id: "flutterwave", label: "Flutterwave", desc: "Customer pays via Flutterwave." },
    { id: "both", label: "Both (customer picks)", desc: "Customer chooses Paystack or Flutterwave at checkout." },
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Text style={[ps.h2, { color: colors.foreground }]}>Payments</Text>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.id}
          onPress={() => updatePaymentConfig({ provider: opt.id })}
          style={[ps.payCard, { borderColor: paymentConfig.provider === opt.id ? colors.primary : colors.border, backgroundColor: paymentConfig.provider === opt.id ? colors.primary + "10" : colors.card }]}
        >
          <Text style={{ fontWeight: "600", color: colors.foreground }}>{opt.label}</Text>
          {paymentConfig.provider === opt.id && <Text style={{ fontSize: 10, color: colors.primary }}>Active</Text>}
          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4 }}>{opt.desc}</Text>
        </TouchableOpacity>
      ))}
      {paymentConfig.provider !== "none" && (
        <Field label="Currency" colors={colors}>
          <ChipRow
            options={currencies.map((c) => ({ value: c, label: c }))}
            value={paymentConfig.currency ?? "USD"}
            onChange={(v) => updatePaymentConfig({ currency: v })}
            colors={colors}
          />
        </Field>
      )}

      <Text style={[ps.h2, { color: colors.foreground, marginTop: 24 }]}>Referral program</Text>
      <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 12, lineHeight: 18 }}>
        When enabled, buyers get a unique referral link after ordering. Anyone who orders via that link is tracked — no login required.
      </Text>
      <SwitchRow
        label="Enable referral program"
        value={referrals.enabled}
        onValueChange={(v) => updateReferrals({ enabled: v })}
        colors={colors}
      />
      {referrals.enabled && (
        <Field label="Reward description shown to buyers" colors={colors}>
          <TextField
            value={referrals.rewardLabel ?? ""}
            onChangeText={(t) => updateReferrals({ rewardLabel: t || undefined })}
            placeholder="e.g. ₦500 off your next order"
            colors={colors}
          />
        </Field>
      )}
    </ScrollView>
  );
}

/* ─── Add section picker (visual grouped) ─── */

type SectionMeta = { type: SectionType; icon: string; desc: string; color: string; bg: string };

const SECTION_GROUPS: { label: string; items: SectionMeta[] }[] = [
  {
    label: "Layout",
    items: [
      { type: "hero", icon: "image", desc: "Big banner with headline + CTA", color: "#4338ca", bg: "#eef2ff" },
      { type: "columns", icon: "columns", desc: "2–4 free-form columns", color: "#0f766e", bg: "#f0fdfa" },
      { type: "image-text", icon: "align-left", desc: "Image beside text block", color: "#b45309", bg: "#fffbeb" },
      { type: "rich-text", icon: "type", desc: "Headings, body copy, alignment", color: "#374151", bg: "#f9fafb" },
      { type: "spacer", icon: "minus", desc: "Add vertical breathing room", color: "#9ca3af", bg: "#f3f4f6" },
    ],
  },
  {
    label: "Products",
    items: [
      { type: "shop-grid", icon: "grid", desc: "All products with filters", color: "#c2410c", bg: "#fff7ed" },
      { type: "featured-products", icon: "star", desc: "Curated product cards", color: "#d97706", bg: "#fffbeb" },
      { type: "product-detail", icon: "package", desc: "Full product page block", color: "#7c3aed", bg: "#f5f3ff" },
      { type: "related-products", icon: "refresh-cw", desc: "Auto-matched upsells", color: "#0284c7", bg: "#f0f9ff" },
      { type: "search", icon: "search", desc: "Search bar with results", color: "#059669", bg: "#ecfdf5" },
    ],
  },
  {
    label: "Media & Content",
    items: [
      { type: "gallery", icon: "grid", desc: "Photo grid layout", color: "#db2777", bg: "#fdf2f8" },
      { type: "video", icon: "play-circle", desc: "Embed a YouTube / Vimeo", color: "#dc2626", bg: "#fef2f2" },
      { type: "video-hero", icon: "film", desc: "Cinematic video background hero", color: "#be185d", bg: "#fdf2f8" },
      { type: "social-feed", icon: "instagram", desc: "Instagram-style photo grid", color: "#c026d3", bg: "#fdf4ff" },
      { type: "collection-list", icon: "layers", desc: "Scrollable category pills", color: "#7c3aed", bg: "#f5f3ff" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { type: "cta-banner", icon: "zap", desc: "Attention-grabbing call to action", color: "#ea580c", bg: "#fff7ed" },
      { type: "newsletter", icon: "mail", desc: "Email capture form", color: "#0891b2", bg: "#ecfeff" },
      { type: "testimonials", icon: "message-circle", desc: "Static testimonial quotes", color: "#16a34a", bg: "#f0fdf4" },
      { type: "reviews", icon: "star", desc: "Live or manual customer reviews with star ratings", color: "#f59e0b", bg: "#fffbeb" },
      { type: "before-after", icon: "sliders", desc: "Before & after transformation comparison", color: "#be185d", bg: "#fdf2f8" },
      { type: "bundle-offer", icon: "package", desc: "Bundle deal: group products + special price", color: "#15803d", bg: "#f0fdf4" },
      { type: "text-columns", icon: "list", desc: "Features / why-choose-us", color: "#2563eb", bg: "#eff6ff" },
      { type: "pricing-plans", icon: "credit-card", desc: "Pricing tiers", color: "#9333ea", bg: "#faf5ff" },
      { type: "countdown", icon: "clock", desc: "Urgency timer", color: "#dc2626", bg: "#fef2f2" },
      { type: "stats", icon: "bar-chart-2", desc: "Key numbers & social proof", color: "#0f766e", bg: "#f0fdfa" },
    ],
  },
  {
    label: "Auth pages",
    items: [
      { type: "auth-login", icon: "log-in", desc: "Customer login form with optional image", color: "#2563eb", bg: "#eff6ff" },
      { type: "auth-signup", icon: "user-plus", desc: "Customer sign-up form with optional image", color: "#0891b2", bg: "#ecfeff" },
    ],
  },
  {
    label: "Buyer dashboard",
    items: [
      { type: "buyer-orders", icon: "package", desc: "Buyer order history & tracking", color: "#16a34a", bg: "#f0fdf4" },
      { type: "buyer-referrals", icon: "gift", desc: "Referral code & earnings dashboard", color: "#9333ea", bg: "#faf5ff" },
    ],
  },
  {
    label: "Business",
    items: [
      { type: "about", icon: "info", desc: "Brand story with image & CTA", color: "#b45309", bg: "#fffbeb" },
      { type: "contact", icon: "map-pin", desc: "Contact info: email, phone, address", color: "#0284c7", bg: "#f0f9ff" },
      { type: "contact-form", icon: "send", desc: "Contact enquiry form", color: "#0284c7", bg: "#f0f9ff" },
      { type: "team", icon: "users", desc: "Team member profiles", color: "#b45309", bg: "#fffbeb" },
      { type: "logo-bar", icon: "award", desc: "Press / brand logos", color: "#4b5563", bg: "#f9fafb" },
      { type: "map-location", icon: "map-pin", desc: "Map, address & opening hours", color: "#16a34a", bg: "#f0fdf4" },
      { type: "size-guide", icon: "sliders", desc: "Measurement table for clothing", color: "#7c3aed", bg: "#f5f3ff" },
      { type: "portfolio", icon: "briefcase", desc: "Work/project showcase grid", color: "#0f766e", bg: "#f0fdfa" },
      { type: "lookbook", icon: "camera", desc: "Outfit / style gallery with shop-the-look", color: "#db2777", bg: "#fdf2f8" },
      { type: "timeline", icon: "clock", desc: "Brand story milestones", color: "#b45309", bg: "#fffbeb" },
    ],
  },
  {
    label: "Trust & contact",
    items: [
      { type: "whatsapp-cta", icon: "message-circle", desc: "WhatsApp chat button — customers contact you instantly", color: "#25D366", bg: "#f0fdf4" },
      { type: "trust-badges", icon: "shield", desc: "Trust signals: secure payment, fast delivery, returns", color: "#0369a1", bg: "#f0f9ff" },
      { type: "payment-methods", icon: "credit-card", desc: "Show accepted payment options (Paystack, OPay, etc.)", color: "#7c3aed", bg: "#f5f3ff" },
    ],
  },
  {
    label: "Other",
    items: [
      { type: "faq", icon: "help-circle", desc: "Accordion Q&A", color: "#374151", bg: "#f9fafb" },
      { type: "announcement", icon: "speaker", desc: "Top-of-page banner strip", color: "#7c3aed", bg: "#f5f3ff" },
      { type: "checkout-form", icon: "shopping-cart", desc: "Full checkout page block", color: "#16a34a", bg: "#f0fdf4" },
      { type: "custom", icon: "layout", desc: "Free block canvas from web editor", color: "#6366f1", bg: "#eef2ff" },
    ],
  },
];

export function AddSectionPickerFull({ onAdd, onAddSaved, onClose, colors }: {
  onAdd: (type: SectionType) => void;
  onAddSaved?: (s: SavedSection) => void;
  onClose: () => void;
  colors: ColorScheme;
}) {
  const { savedSections, renameSavedSection, deleteSavedSection, duplicateSavedSection } = useStorefront();
  const [manageOpen, setManageOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const startRename = (s: SavedSection) => {
    setRenamingId(s.id);
    setRenameValue(s.name);
  };
  const commitRename = () => {
    if (renamingId && renameValue.trim()) renameSavedSection(renamingId, renameValue.trim());
    setRenamingId(null);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Text style={[ps.h2, { color: colors.foreground }]}>{manageOpen ? "Saved sections" : "Add section"}</Text>
        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}><Feather name="x" size={22} color={colors.mutedForeground} /></TouchableOpacity>
      </View>

      {manageOpen ? (
        <>
          {savedSections.length === 0 ? (
            <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign: "center", marginTop: 20 }}>
              No saved sections yet. Open a custom section and tap "Save as library section".
            </Text>
          ) : savedSections.map((s) => (
            <View key={s.id} style={[ps.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {renamingId === s.id ? (
                <TextInput
                  value={renameValue}
                  onChangeText={setRenameValue}
                  autoFocus
                  style={[ps.textInput, { borderColor: colors.border, color: colors.foreground, flex: 1 }]}
                  onSubmitEditing={commitRename}
                />
              ) : (
                <Text style={{ fontWeight: "600", fontSize: 14, color: colors.foreground, flex: 1 }}>{s.name}</Text>
              )}
              {renamingId === s.id ? (
                <TouchableOpacity onPress={commitRename} style={{ padding: 6 }}>
                  <Feather name="check" size={16} color={colors.primary} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => startRename(s)} style={{ padding: 6 }}>
                  <Feather name="edit-3" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => duplicateSavedSection(s.id)} style={{ padding: 6 }}>
                <Feather name="copy" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                if (Platform.OS !== "web") {
                  Alert.alert("Delete section", `Delete "${s.name}" from your library? Sections already placed on pages keep their content.`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => deleteSavedSection(s.id) },
                  ]);
                } else {
                  deleteSavedSection(s.id);
                }
              }} style={{ padding: 6 }}>
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => setManageOpen(false)} style={[ps.ghostBtn, { borderColor: colors.border, marginTop: 8 }]}>
            <Text style={{ color: colors.foreground, fontSize: 14 }}>Done</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {savedSections.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 1 }}>
                  My sections
                </Text>
                <TouchableOpacity onPress={() => setManageOpen(true)}>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "600" }}>Manage</Text>
                </TouchableOpacity>
              </View>
              {savedSections.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => { onAddSaved?.(s); onClose(); }}
                  style={[ps.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.8}
                >
                  <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: "#eef2ff", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Feather name="layout" size={18} color="#6366f1" />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontWeight: "600", fontSize: 14, color: colors.foreground }}>{s.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{countBlocks(s.section.blocks)} blocks</Text>
                  </View>
                  <Feather name="plus" size={16} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          {SECTION_GROUPS.map((group) => (
            <View key={group.label} style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                {group.label}
              </Text>
              {group.items.map((meta) => (
                <TouchableOpacity
                  key={meta.type}
                  onPress={() => { onAdd(meta.type); onClose(); }}
                  style={[ps.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.8}
                >
                  <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: meta.bg, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Feather name={meta.icon as any} size={18} color={meta.color} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontWeight: "600", fontSize: 14, color: colors.foreground }}>{SECTION_LABELS[meta.type]}</Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{meta.desc}</Text>
                  </View>
                  <Feather name="plus" size={16} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function countBlocks(blocks: CustomBlock[]): number {
  let n = 0;
  for (const b of blocks) {
    n += 1;
    const x = b as any;
    if (Array.isArray(x.children)) n += countBlocks(x.children);
    if (Array.isArray(x.cols)) for (const c of x.cols) n += countBlocks(c);
  }
  return n;
}

function NavIconPicker({ icons, value, onChange, colors }: { icons: string[]; value: string; onChange: (v: string) => void; colors: ColorScheme }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {icons.map((icon) => {
        const active = value === icon;
        return (
          <TouchableOpacity
            key={icon}
            onPress={() => onChange(icon)}
            style={{ width: 44, height: 44, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center", borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + "15" : colors.card }}
          >
            <Ionicons name={icon as any} size={20} color={active ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const ps = StyleSheet.create({
  h2: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12 },
  pageChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginRight: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10 },
  ghostBtn: { paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: "center", paddingHorizontal: 16 },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 6, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  helpBox: { padding: 12, borderRadius: 10 },
  tokenBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: "center" },
  miniBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  payCard: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  addRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderWidth: 1, borderRadius: 10, marginBottom: 8 },
  sectionCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderWidth: 1, borderRadius: 12, marginBottom: 8 },
  toggleBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
});
