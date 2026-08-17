import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { hapticNotification } from "@/hooks/useHapticsStore";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useRef, useState } from "react";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { shopUrl, shopBaseHostname } from "@/lib/shopConfig";
import {
  Alert,
  Animated,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  SECTION_LABELS,
  getPageUrl,
  reIdBlocks,
  useStorefront,
  type SectionType,
} from "@/lib/storefront";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { products as demoProducts } from "@/lib/storefront/products";
import { InspectorPanel } from "./InspectorPanel";
import {
  AddSectionPickerFull,
  GlobalPanelFull,
  PagesPanel,
  PaymentsPanelFull,
  SectionsPanel,
  TemplatesPanelInEditor,
  ThemePanelFull,
} from "./editor-panels";
import { SectionRenderer } from "./SectionRenderer";
import { StoreFooter, StoreNavbar } from "./SiteChrome";

type ToolTab = "sections" | "pages" | "global" | "theme" | "payments";

const TOOL_TABS: { id: ToolTab; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { id: "sections", label: "Page Blocks", icon: "layers" },
  { id: "pages", label: "Pages", icon: "file-text" },
  { id: "global", label: "Menu & Footer", icon: "layout" },
  { id: "theme", label: "Theme", icon: "droplet" },
  { id: "payments", label: "Payments", icon: "credit-card" },
];

type Props = { templateId: string };

const TEMPLATE_PAGE_BG: Record<string, string> = {
  light: "#ffffff",
  dark:  "#111111",
  matte: "#0d0d0d",
  glass: "#0f1117",
};

export function StoreEditor({ templateId }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, subscription } = useApp();
  const sf = useStorefront();
  const template = sf.getTemplate(templateId);

  const {
    sections,
    add,
    update,
    remove,
    duplicate,
    reset,
    theme,
    setTheme,
    navbar,
    footer,
    activePage,
    pages,
    setActivePageId,
    applyTemplate,
    launchTemplate,
    deactivateTemplate,
    canUndo,
    canRedo,
    undo,
    redo,
    exportJson,
    importJson,
  } = sf;

  const [toolTab, setToolTab] = useState<ToolTab>("sections");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(sections[0]?.id ?? null);
  const [chromeSel, setChromeSel] = useState<"header" | "footer" | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [subscribeGateOpen, setSubscribeGateOpen] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKbHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKbHeight(0),
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    applyTemplate(templateId);
  }, [templateId]);

  useEffect(() => {
    if (sections.length && !sections.find((s) => s.id === selectedId)) {
      setSelectedId(sections[0]?.id ?? null);
    }
  }, [sections, selectedId]);

  if (!template) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={{ color: colors.mutedForeground }}>Template not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.primary }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const selected = sections.find((s) => s.id === selectedId) ?? null;

  const openSectionInspector = (id: string) => {
    setChromeSel(null);
    setSelectedId(id);
    setInspectorOpen(true);
  };

  const openChromeInspector = (which: "header" | "footer") => {
    setChromeSel(which);
    setSelectedId(null);
    setInspectorOpen(true);
    setToolTab("global");
  };

  const handleLaunch = () => {
    if (!profile?.username) {
      Alert.alert("Profile required", "Complete your business profile before launching.");
      return;
    }
    const subscriptionExpired =
      subscription?.expiryDate && new Date(subscription.expiryDate) < new Date();
    if (!subscription?.active || subscriptionExpired) {
      setSubscribeGateOpen(true);
      return;
    }
    launchTemplate(templateId, profile.username);
    hapticNotification();
    setLaunchOpen(true);
  };

  const handleDeactivate = () => {
    Alert.alert(
      "Deactivate store?",
      "Visitors will see a maintenance page while your store is offline. You can relaunch anytime.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: () => {
            deactivateTemplate(templateId);
            setLaunchOpen(false);
          },
        },
      ],
    );
  };

  const shareStore = async () => {
    const url = template.launchUrl ?? shopUrl(profile?.username ?? "shop");
    await Share.share({ message: `Visit my store: ${url}`, url });
  };

  const handleExport = async () => {
    const json = exportJson();
    try {
      await Share.share({ message: json, title: "Store export" });
    } catch {
      Alert.alert("Export", "Copy failed â€” try again.");
    }
  };

  const handleImport = () => {
    const ok = importJson(importText);
    if (ok) {
      setImportOpen(false);
      setImportText("");
      hapticNotification();
    } else {
      Alert.alert("Import failed", "Invalid JSON. Check the file and try again.");
    }
  };

  const renderToolsContent = () => {
    switch (toolTab) {
      case "sections":
        return (
          <SectionsPanel
            colors={colors}
            selectedId={selectedId}
            onSelect={(id) => {
              openSectionInspector(id);
              setToolsOpen(false);
            }}
            onAdd={() => setShowAddSection(true)}
          />
        );
      case "pages":
        return <PagesPanel colors={colors} />;
      case "global":
        return <GlobalPanelFull colors={colors} mode="both" />;
      case "theme":
        return <ThemePanelFull colors={colors} />;
      // templates tab removed
      case "payments":
        return <PaymentsPanelFull colors={colors} />;
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Toolbar */}
      <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.toolBtn} accessibilityLabel="Back">
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.toolbarPageName, { color: colors.foreground }]} numberOfLines={1}>
          {activePage.name}
        </Text>
        <TouchableOpacity onPress={() => undo()} disabled={!canUndo} style={styles.toolBtn}>
          <Feather name="rotate-ccw" size={18} color={canUndo ? colors.foreground : colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => redo()} disabled={!canRedo} style={styles.toolBtn}>
          <Feather name="rotate-cw" size={18} color={canRedo ? colors.foreground : colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setToolTab("theme"); setToolsOpen(true); }}
          style={[styles.toolBtn, styles.themeBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme === "light" ? "#f8fafc" : theme === "dark" ? "#1e293b" : theme === "matte" ? "#0a0a0a" : "#1e293b", borderWidth: 1, borderColor: colors.border }} />
          <Text style={{ fontSize: 10, color: colors.foreground, fontWeight: "600", marginLeft: 4, textTransform: "capitalize" }}>{theme}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push(`/store-preview/${templateId}` as any)} style={styles.toolBtn}>
          <Feather name="eye" size={18} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setHelpOpen(true)} style={styles.toolBtn}>
          <Feather name="help-circle" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setAdvancedOpen(true)} style={styles.toolBtn}>
          <Feather name="more-horizontal" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Page switcher — View wrapper enforces height; horizontal ScrollView never constrains itself */}
      <View style={[styles.pageBar, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pageBarContent}
        >
          {pages.map((page) => {
            const active = page.id === activePage.id;
            const isDynamic = page.slug === "/product/:slug" || page.slug === "/checkout";
            return (
              <TouchableOpacity
                key={page.id}
                onPress={() => setActivePageId(page.id)}
                style={[styles.pageChip, {
                  backgroundColor: active ? colors.primary : isDynamic ? colors.muted : "transparent",
                }]}
              >
                {isDynamic && <Feather name="layers" size={10} color={active ? "#fff" : colors.mutedForeground} style={{ marginRight: 3 }} />}
                <Text style={{ fontSize: 11, fontWeight: active ? "700" : "400", color: active ? "#fff" : isDynamic ? colors.mutedForeground : colors.foreground }}>
                  {page.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Live preview — background uses the template's own theme, not the app's dark mode */}
      <ScrollView style={[styles.preview, { backgroundColor: TEMPLATE_PAGE_BG[theme] ?? "#ffffff" }]} contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <Text style={[styles.previewHint, { color: colors.mutedForeground }]}>Tap any block to edit it · Use the Tools button for pages, colors & more</Text>
        <View style={activePage.hideNavbar ? { opacity: 0.3 } : undefined}>
          <StoreNavbar
            config={navbar}
            theme={theme}
            selected={chromeSel === "header"}
            onPress={() => openChromeInspector("header")}
            onMenuOpen={() => openChromeInspector("header")}
            onSearchPress={() => { setSearchQ(""); setSearchOpen(true); }}
          />
        </View>
        {/* Announcement bars always sit directly below the navbar in preview */}
        {sections.filter((s) => s.type === "announcement").map((s) => {
          const isSelected = selectedId === s.id && !chromeSel;
          return (
            <View key={`ann-${s.id}`} style={[{ position: "relative" }, isSelected ? [styles.blockSelected, { borderColor: colors.primary }] : undefined]}>
              <View pointerEvents="none">
                <SectionRenderer section={s} theme={theme} compact />
              </View>
              <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={0.85} onPress={() => openSectionInspector(s.id)} />
            </View>
          );
        })}
        {sections.filter((s) => s.type !== "announcement").map((s) => {
          const isSelected = selectedId === s.id && !chromeSel;
          const isHidden = s.visible === false;
          return (
            <View key={s.id} style={[{ position: "relative" }, isSelected ? [styles.blockSelected, { borderColor: colors.primary }] : undefined]}>
              <View pointerEvents="none" style={isHidden ? { opacity: 0.35 } : undefined}>
                <SectionRenderer section={s} theme={theme} compact />
              </View>
              {isHidden && (
                <View style={[StyleSheet.absoluteFillObject, styles.hiddenOverlay]} pointerEvents="none">
                  <View style={[styles.hiddenBadge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                    <Feather name="eye-off" size={12} color={colors.mutedForeground} />
                    <Text style={{ fontSize: 11, color: colors.mutedForeground, marginLeft: 4 }}>Hidden</Text>
                  </View>
                </View>
              )}
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                activeOpacity={0.85}
                onPress={() => openSectionInspector(s.id)}
              />
            </View>
          );
        })}
        {sections.filter((s) => s.type !== "announcement").length === 0 && (
          <BeginnerSetupGuide
            colors={colors}
            onAddSection={(type) => {
              const id = add(type as any);
              setSelectedId(id);
              setInspectorOpen(true);
            }}
            onOpenTemplates={() => { setToolsOpen(true); }}
            onOpenTheme={() => { setToolTab("theme"); setToolsOpen(true); }}
          />
        )}
        <View style={activePage.hideFooter ? { opacity: 0.3 } : undefined}>
          <StoreFooter
            config={footer}
            theme={theme}
            selected={chromeSel === "footer"}
            onPress={() => openChromeInspector("footer")}
          />
        </View>
      </ScrollView>

      {/* Floating tools */}
      <TouchableOpacity
        onPress={() => setToolsOpen(true)}
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 72 }]}
      >
        <Feather name="sliders" size={22} color="#fff" />
        <Text style={styles.fabText}>Tools</Text>
      </TouchableOpacity>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8, backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={() =>
            Alert.alert("Clear all edits?", "This will remove all your changes on this page and start fresh. This cannot be undone.", [
              { text: "Cancel", style: "cancel" },
              { text: "Clear & restart", style: "destructive", onPress: reset },
            ])
          }
          style={styles.bottomBtn}
        >
          <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />
          <Text style={{ fontSize: 11, color: colors.mutedForeground }}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setToolTab("sections"); setShowAddSection(true); }} style={styles.bottomBtn}>
          <Feather name="plus" size={16} color={colors.primary} />
          <Text style={{ fontSize: 11, color: colors.primary }}>Section</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={template.launched ? handleDeactivate : handleLaunch}
          style={[styles.launchBtn, { backgroundColor: template.launched ? "#ef4444" : colors.primary }]}
        >
          <Feather name={template.launched ? "slash" : "zap"} size={16} color="#fff" />
          <Text style={styles.launchText}>{template.launched ? "Deactivate" : "Launch Store"}</Text>
        </TouchableOpacity>
      </View>

      {/* Tools modal */}
      <Modal visible={toolsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setToolsOpen(false)}>
        <View style={[styles.toolsRoot, { backgroundColor: colors.background, paddingTop: insets.top }]}>
          <View style={[styles.toolsHeader, { borderBottomColor: colors.border }]}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>Store tools</Text>
            <TouchableOpacity onPress={() => setToolsOpen(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.toolTabs, { borderBottomColor: colors.border }]}>
            {TOOL_TABS.map((t) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => setToolTab(t.id)}
                style={[styles.toolTab, toolTab === t.id && { backgroundColor: colors.primary }]}
              >
                <Feather name={t.icon} size={14} color={toolTab === t.id ? "#fff" : colors.mutedForeground} />
                <Text style={{ fontSize: 11, color: toolTab === t.id ? "#fff" : colors.foreground, marginLeft: 4 }}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={{ flex: 1 }}>{renderToolsContent()}</View>
        </View>
      </Modal>

      {/* Inspector sheet â€” absolute overlay so the live preview repaints in real time */}
      {inspectorOpen && (
        <InspectorSheetOverlay
          selected={selected}
          chromeSel={chromeSel}
          navbar={navbar}
          footer={footer}
          colors={colors}
          insets={insets}
          theme={theme}
          kbHeight={kbHeight}
          onClose={() => setInspectorOpen(false)}
          onUpdate={(patch) => selected && update(selected.id, patch)}
          onDelete={selected ? () => { remove(selected.id); setInspectorOpen(false); } : undefined}
          onDuplicate={selected ? () => duplicate(selected.id) : undefined}
        />
      )}

      {/* Add section */}
      <Modal visible={showAddSection} animationType="slide" transparent>
        <TouchableOpacity style={styles.sheetBackdrop} onPress={() => setShowAddSection(false)} />
        <View style={[styles.addSheet, { backgroundColor: colors.background, maxHeight: "75%", marginBottom: insets.bottom }]}>
          <AddSectionPickerFull
            colors={colors}
            onAdd={(type: SectionType) => {
              const id = add(type);
              setSelectedId(id);
              setShowAddSection(false);
              setInspectorOpen(true);
            }}
            onAddSaved={(s) => {
              const id = add("custom");
              const copy = JSON.parse(JSON.stringify(s.section));
              copy.id = id;
              copy.blocks = reIdBlocks(copy.blocks ?? []);
              update(id, copy);
              setSelectedId(id);
              setShowAddSection(false);
              setInspectorOpen(true);
            }}
            onClose={() => setShowAddSection(false)}
          />
        </View>
      </Modal>

      {/* Advanced menu */}
      <Modal visible={advancedOpen} animationType="slide" transparent onRequestClose={() => setAdvancedOpen(false)}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setAdvancedOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHeader}>
            <Text style={{ fontWeight: "700", fontSize: 17, color: colors.foreground }}>Advanced</Text>
            <TouchableOpacity onPress={() => setAdvancedOpen(false)}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 16, gap: 10 }}>
            <TouchableOpacity
              onPress={() => { setAdvancedOpen(false); handleExport(); }}
              style={[styles.primaryBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
            >
              <Feather name="share" size={16} color={colors.foreground} />
              <Text style={{ color: colors.foreground, fontWeight: "600", marginLeft: 8 }}>Export store (JSON)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setAdvancedOpen(false); setImportOpen(true); }}
              style={[styles.primaryBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
            >
              <Feather name="download" size={16} color={colors.foreground} />
              <Text style={{ color: colors.foreground, fontWeight: "600", marginLeft: 8 }}>Import store (JSON)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Import */}
      <Modal visible={importOpen} animationType="slide" transparent>
        <View style={[styles.importModal, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: colors.foreground }}>Import store JSON</Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 6 }}>
            Paste a full store export, a template, a page, or a single section. Sections are added to the current page; pages/templates replace this template's pages.
          </Text>
          <TextInput
            value={importText}
            onChangeText={setImportText}
            multiline
            placeholder='{ "version": 3, ... }'
            placeholderTextColor={colors.mutedForeground}
            style={[styles.importInput, { borderColor: colors.border, color: colors.foreground }]}
          />
          <TouchableOpacity onPress={handleImport} style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 12 }]}>
            <Text style={{ color: "#fff", fontWeight: "600" }}>Import</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setImportOpen(false)} style={{ marginTop: 12, alignItems: "center" }}>
            <Text style={{ color: colors.primary }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Help guide */}
      <Modal visible={helpOpen} animationType="slide" transparent onRequestClose={() => setHelpOpen(false)}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setHelpOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16, maxHeight: "85%" }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHeader}>
            <Text style={{ fontWeight: "700", fontSize: 17, color: colors.foreground }}>How to use the editor</Text>
            <TouchableOpacity onPress={() => setHelpOpen(false)}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 24 }}>
            {[
              { icon: "eye", title: "Live preview", body: "The canvas above is a live preview of your store. Any change you make appears instantly â€” you don't need to save or refresh." },
              { icon: "hand", title: "Tap a section to edit", body: "Tap any block in the preview to open its settings panel at the bottom. Change text, colors, images and spacing right there." },
              { icon: "layers", title: "Sections", body: "Your page is made of stacked sections (hero, product grid, text, etc.). Use the + Section button to add more, or the Sections tool to reorder and delete them." },
              { icon: "layout", title: "Navbar & footer", body: "The navbar (top) and footer (bottom) are shared across all pages. Tap them in the preview to edit the brand name, links, and layout." },
              { icon: "file-text", title: "Pages", body: "Add multiple pages (Home, Shop, About, Contactâ€¦) using the Pages tool. Each page has its own set of sections. Links you add to pages appear automatically in the navbar." },
              { icon: "droplet", title: "Theme", body: "Set your brand colors, fonts, button shapes, and card styles from the Theme tool. These apply across all sections." },
              { icon: "rotate-ccw", title: "Undo / redo", body: "The â† â†’ arrows at the top undo or redo any change. Nothing is permanent until you launch." },
              { icon: "zap", title: "Launch your store", body: `When you're happy, tap Launch. Your store goes live at ${shopBaseHostname()}/@yourname and anyone can visit it.` },
              { icon: "monitor", title: "Mobile & web", body: "Your store works on both mobile and web browsers automatically. No extra setup needed." },
            ].map((item) => (
              <View key={item.icon} style={[helpStyle.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[helpStyle.iconWrap, { backgroundColor: colors.secondary }]}>
                  <Feather name={item.icon as any} size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>{item.title}</Text>
                  <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>{item.body}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Subscription gate */}
      <Modal visible={subscribeGateOpen} animationType="fade" transparent onRequestClose={() => setSubscribeGateOpen(false)}>
        <View style={[styles.sheetBackdrop, { alignItems: "center", justifyContent: "center" }]}>
          <View style={[styles.gateModal, { backgroundColor: colors.background }]}>
            <View style={[styles.gateIconWrap, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="zap" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.gateTitle, { color: colors.foreground }]}>
              {template.launchUrl ? "Subscription required" : "Subscribe to launch"}
            </Text>
            <Text style={[styles.gateBody, { color: colors.mutedForeground }]}>
              {template.launchUrl
                ? "Your subscription has expired or is inactive. Renew a plan to bring your store back online."
                : "Your store needs an active subscription to go live and accept orders from customers."}
            </Text>
            <View style={[styles.gatePriceRow, { backgroundColor: colors.secondary, borderRadius: 12 }]}>
              <Text style={[styles.gatePrice, { color: colors.primary }]}>From ₦1,500</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>for 3 months</Text>
            </View>
            <TouchableOpacity
              onPress={() => { setSubscribeGateOpen(false); router.push("/subscription" as any); }}
              style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 4 }]}
            >
              <Feather name="award" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700", marginLeft: 6 }}>See Plans & Subscribe</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSubscribeGateOpen(false)} style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={{ color: colors.primary }}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Launch success */}
      <Modal visible={launchOpen} animationType="slide" transparent>
        <View style={[styles.launchModal, { backgroundColor: colors.background, paddingBottom: insets.bottom + 20 }]}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>ðŸŽ‰ Store is live!</Text>
          {template.launchUrl ? (
            <View style={{ alignSelf: "center", marginTop: 12, width: 180, height: 180 }}>
              <Image
                source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(template.launchUrl)}&ecc=H&qzone=1&color=000000&bgcolor=FFFFFF` }}
                style={{ width: 180, height: 180, borderRadius: 8 }}
                contentFit="contain"
              />
              {/* Logo overlay in center */}
              <View style={[styles.qrLogoWrap, { backgroundColor: "#fff" }]}>
                <Image
                  source={require("../../assets/images/logo-badge.png")}
                  style={{ width: 30, height: 30 }}
                  contentFit="contain"
                />
              </View>
            </View>
          ) : null}
          <TouchableOpacity
            onPress={() => Clipboard.setStringAsync(template.launchUrl ?? "")}
            style={[styles.urlBox, { borderColor: colors.border }]}
          >
            <Text style={{ flex: 1, color: colors.foreground, fontSize: 13 }} numberOfLines={1}>{template.launchUrl}</Text>
            <Feather name="copy" size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => template.launchUrl && WebBrowser.openBrowserAsync(template.launchUrl)}
            style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
          >
            <Feather name="globe" size={16} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "600", marginLeft: 6 }}>Open live store</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={shareStore} style={[styles.primaryBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginTop: 8 }]}>
            <Feather name="share-2" size={16} color={colors.foreground} />
            <Text style={{ color: colors.foreground, fontWeight: "600", marginLeft: 6 }}>Share store link</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeactivate}
            style={[styles.primaryBtn, { backgroundColor: "#ef4444", marginTop: 8 }]}
          >
            <Feather name="slash" size={16} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "600", marginLeft: 6 }}>Deactivate store</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setLaunchOpen(false)} style={{ marginTop: 12, alignItems: "center" }}>
            <Text style={{ color: colors.primary }}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Search preview modal — shows while editing so vendor can test search */}
      <Modal visible={searchOpen} animationType="fade" transparent onRequestClose={() => setSearchOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setSearchOpen(false)} />
          <View style={{ flex: 1, backgroundColor: colors.background, marginTop: insets.top + 60, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" }}>
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
              <Feather name="search" size={18} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              <TextInput
                autoFocus
                value={searchQ}
                onChangeText={setSearchQ}
                placeholder="Search products…"
                placeholderTextColor={colors.mutedForeground}
                style={{ flex: 1, fontSize: 15, color: colors.foreground }}
              />
              <TouchableOpacity onPress={() => setSearchOpen(false)} style={{ marginLeft: 10 }}>
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
              {(() => {
                const { products: inv } = profile ? { products: [] } : { products: [] };
                const allProds = demoProducts.filter((p) =>
                  !searchQ.trim() || (p.name + " " + (p.category ?? "")).toLowerCase().includes(searchQ.toLowerCase())
                );
                if (allProds.length === 0) {
                  return (
                    <View style={{ padding: 32, alignItems: "center", gap: 8 }}>
                      <Feather name="search" size={36} color={colors.mutedForeground} />
                      <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "600", marginTop: 4 }}>No results for "{searchQ}"</Text>
                    </View>
                  );
                }
                return allProds.map((p) => (
                  <View key={p.slug} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
                    {p.image ? (
                      <Image source={{ uri: p.image }} style={{ width: 44, height: 44, borderRadius: 8 }} contentFit="cover" />
                    ) : (
                      <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" }}>
                        <Feather name="package" size={18} color={colors.mutedForeground} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }} numberOfLines={1}>{p.name}</Text>
                      {p.category ? <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{p.category}</Text> : null}
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>₦{Number(p.price).toLocaleString("en-NG")}</Text>
                  </View>
                ));
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type SetupStep = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  desc: string;
  action: string;
  color: string;
  bg: string;
  onPress: () => void;
};

function BeginnerSetupGuide({
  colors,
  onAddSection,
  onOpenTemplates,
  onOpenTheme,
}: {
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  onAddSection: (type: string) => void;
  onOpenTemplates: () => void;
  onOpenTheme: () => void;
}) {
  const steps: SetupStep[] = [
    {
      icon: "grid",
      title: "1. Pick a style",
      desc: "Choose from ready-made templates so you're not starting from scratch.",
      action: "Browse templates",
      color: "#4338CA",
      bg: "#EEF2FF",
      onPress: onOpenTemplates,
    },
    {
      icon: "image",
      title: "2. Add a hero banner",
      desc: "Your first impression â€” a big image or headline that grabs attention.",
      action: "Add hero",
      color: "#0F766E",
      bg: "#F0FDFA",
      onPress: () => onAddSection("hero"),
    },
    {
      icon: "shopping-bag",
      title: "3. Show your products",
      desc: "Add a product grid â€” it will pull directly from your inventory.",
      action: "Add shop grid",
      color: "#C2410C",
      bg: "#FFF7ED",
      onPress: () => onAddSection("shop-grid"),
    },
    {
      icon: "droplet",
      title: "4. Pick your colors",
      desc: "Set your brand colors and fonts in the Theme panel.",
      action: "Open theme",
      color: "#7C3AED",
      bg: "#F5F3FF",
      onPress: onOpenTheme,
    },
  ];

  return (
    <View style={guide.root}>
      <View style={guide.header}>
        <Text style={[guide.headingMain, { color: colors.foreground }]}>Build your store in 4 steps</Text>
        <Text style={[guide.subMain, { color: colors.mutedForeground }]}>
          Tap any step below to get started. You can always change things later.
        </Text>
      </View>
      {steps.map((step) => (
        <TouchableOpacity
          key={step.title}
          onPress={step.onPress}
          style={[guide.stepCard, { backgroundColor: step.bg, borderColor: step.color + "30" }]}
          activeOpacity={0.85}
        >
          <View style={[guide.stepIcon, { backgroundColor: step.color + "18" }]}>
            <Feather name={step.icon} size={22} color={step.color} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[guide.stepTitle, { color: colors.foreground }]}>{step.title}</Text>
            <Text style={[guide.stepDesc, { color: colors.mutedForeground }]}>{step.desc}</Text>
          </View>
          <View style={[guide.stepAction, { backgroundColor: step.color }]}>
            <Text style={guide.stepActionText}>{step.action}</Text>
          </View>
        </TouchableOpacity>
      ))}
      <Text style={[guide.tip, { color: colors.mutedForeground }]}>
        ðŸ’¡ Tap any section in the preview to edit it. Tap the Tools button for more options.
      </Text>
    </View>
  );
}

// â”€â”€â”€ Inspector sheet overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type InspectorOverlayProps = {
  selected: ReturnType<typeof useStorefront>["sections"][number] | null;
  chromeSel: "header" | "footer" | null;
  navbar: ReturnType<typeof useStorefront>["navbar"];
  footer: ReturnType<typeof useStorefront>["footer"];
  colors: ReturnType<typeof useColors>;
  insets: { top: number; bottom: number };
  theme: ReturnType<typeof useStorefront>["theme"];
  kbHeight: number;
  onClose: () => void;
  onUpdate: (patch: any) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
};

function InspectorSheetOverlay({ selected, chromeSel, navbar, footer, colors, insets, theme, kbHeight, onClose, onUpdate, onDelete, onDuplicate }: InspectorOverlayProps) {
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderMove: (_, g) => {
        // Only allow downward drag (positive dy)
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 60 || g.vy > 0.5) {
          // Flick or drag far enough â€” slide out then close
          Animated.timing(translateY, {
            toValue: 700,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            onClose();
          });
        } else {
          // Not far enough â€” spring back to resting position
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    })
  ).current;

  const title = chromeSel === "header" ? "Top Menu" : chromeSel === "footer" ? "Footer" : selected ? SECTION_LABELS[selected.type] : "Edit";

  const showPreview = selected || chromeSel;

  return (
    <>
      {/* Tap-away backdrop */}
      <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />

      {/* Floating preview â€” native only (not web/desktop) */}
      {Platform.OS !== "web" && showPreview && (
        <View style={[iStyles.floatPreview, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[iStyles.floatLabelTop, { backgroundColor: colors.background + "f0", borderBottomColor: colors.border }]}>
            <Feather name="eye" size={11} color={colors.primary} />
            <Text style={{ fontSize: 11, color: colors.primary, marginLeft: 4, fontWeight: "600" }}>{title} Â· live preview</Text>
            <Text style={{ fontSize: 10, color: colors.mutedForeground, marginLeft: "auto" }}>scroll â†•</Text>
          </View>
          <ScrollView
            style={iStyles.floatContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {chromeSel === "header" && (
              <StoreNavbar config={navbar} theme={theme} selected={false} onPress={() => {}} onMenuOpen={() => {}} />
            )}
            {chromeSel === "footer" && (
              <StoreFooter config={footer} theme={theme} selected={false} onPress={() => {}} />
            )}
            {selected && !chromeSel && (
              <SectionRenderer section={selected} theme={theme} compact />
            )}
          </ScrollView>
        </View>
      )}

      {/* Editor sheet */}
      <Animated.View style={[iStyles.sheet, { backgroundColor: colors.background, paddingBottom: kbHeight > 0 ? 8 : insets.bottom + 12, bottom: Platform.OS === "ios" ? kbHeight : 0, transform: [{ translateY }] }]}>
        {/* Drag handle â€” pan to dismiss */}
        <View {...panResponder.panHandlers} style={iStyles.handleZone}>
          <View style={[iStyles.handle, { backgroundColor: colors.border }]} />
        </View>
        {/* Header */}
        <View style={iStyles.header}>
          <Text style={{ fontWeight: "700", fontSize: 16, color: colors.foreground }}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={iStyles.closeBtn}>
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
        {/* Content */}
        {selected && !chromeSel ? (
          <InspectorPanel
            key={selected.id}
            section={selected}
            onChange={onUpdate}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
          />
        ) : (
          <GlobalPanelFull colors={colors} mode={chromeSel === "footer" ? "footer" : "navbar"} />
        )}
      </Animated.View>
    </>
  );
}

const iStyles = StyleSheet.create({
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: "62%",
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    elevation: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.14, shadowRadius: 10,
  },
  handleZone: { paddingVertical: 10, alignItems: "center" },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 8 },
  closeBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  floatPreview: {
    position: "absolute",
    left: 0, right: 0,
    bottom: "63%",
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.15, shadowRadius: 10,
  },
  floatLabelTop: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 7,
    borderBottomWidth: 1,
  },
  floatContent: { height: 200 },
});

const guide = StyleSheet.create({
  root: { padding: 16, gap: 12 },
  header: { marginBottom: 4, gap: 4 },
  headingMain: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  subMain: { fontSize: 13, lineHeight: 20 },
  stepCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  stepIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepTitle: { fontSize: 14, fontWeight: "700" },
  stepDesc: { fontSize: 12, lineHeight: 18 },
  stepAction: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexShrink: 0 },
  stepActionText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  tip: { fontSize: 12, textAlign: "center", lineHeight: 18, marginTop: 4 },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  toolbar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, paddingVertical: 4, borderBottomWidth: 1, elevation: 2, zIndex: 2 },
  toolbarTitle: { fontSize: 15, fontWeight: "700" },
  toolbarPageName: { fontSize: 14, fontWeight: "600", flex: 1, marginHorizontal: 4 },
  toolBtn: { padding: 8 },
  themeBtn: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 4, marginHorizontal: 2 },
  pageBar: { borderBottomWidth: 1, height: 40 },
  pageBarContent: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 6, height: 40 },
  pageChip: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, flexDirection: "row", alignItems: "center" },
  preview: { flex: 1 },
  previewHint: { fontSize: 11, textAlign: "center", paddingVertical: 8 },
  blockSelected: { borderWidth: 2 },
  hiddenOverlay: { alignItems: "center", justifyContent: "center" },
  hiddenBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  fab: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 28,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  bottomBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, gap: 8 },
  bottomBtn: { alignItems: "center", gap: 2, padding: 6, minWidth: 56 },
  launchBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12 },
  launchText: { color: "#fff", fontWeight: "700" },
  toolsRoot: { flex: 1 },
  toolsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  toolTabs: { borderBottomWidth: 1, maxHeight: 48 },
  toolTab: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 4, borderRadius: 8 },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheetBackdropTransparent: { flex: 1, backgroundColor: "transparent" },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 6 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10, paddingTop: 4 },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, flex: 1 },
  addSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: "auto" },
  importModal: { margin: 16, marginTop: "auto", borderRadius: 16, padding: 20 },
  importInput: { borderWidth: 1, borderRadius: 10, marginTop: 12, padding: 12, minHeight: 160, fontSize: 12, textAlignVertical: "top" },
  primaryBtn: { flexDirection: "row", padding: 14, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  launchModal: { margin: 20, marginTop: "auto", borderRadius: 16, padding: 24 },
  qrLogoWrap: { position: "absolute", top: "50%", left: "50%", width: 40, height: 40, borderRadius: 8, marginTop: -20, marginLeft: -20, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 },
  urlBox: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 10, gap: 8 },
  gateModal: { margin: 24, borderRadius: 20, padding: 24, alignItems: "center", gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 12 },
  gateIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  gateTitle: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  gateBody: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  gatePriceRow: { paddingHorizontal: 20, paddingVertical: 12, alignItems: "center", gap: 2 },
  gatePrice: { fontSize: 22, fontWeight: "800" },
});

const helpStyle = StyleSheet.create({
  card: { flexDirection: "row", gap: 12, borderWidth: 1, borderRadius: 12, padding: 14, alignItems: "flex-start" },
  iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
});

