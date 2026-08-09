import AsyncStorage from "@react-native-async-storage/async-storage";
import { templatesApi } from "@/lib/api";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  CURRENT_MV,
  STOREFRONT_STORAGE_KEY,
  SECTION_LABELS,
  createBlankTemplate,
  createEmptyTemplate,
  createDefaultSection,
  defaultDesignTokens,
  defaultFooter,
  defaultNavbar,
  defaultPaymentConfig,
  defaultPages,
  getPageUrl,
  makeInitial,
  migratePersistedState,
  uid,
  type CustomBlock,
  type CustomSection,
  type DesignTokens,
  type FooterConfig,
  type NavbarConfig,
  type Page,
  type PaymentConfig,
  type Persisted,
  type Section,
  type SectionType,
  type SavedSection,
  type Template,
  type Theme,
} from "./data";
import { products } from "./products";

export type StorefrontContextValue = {
  pages: Page[];
  navbar: NavbarConfig;
  footer: FooterConfig;
  theme: Theme;
  setTheme: (t: Theme) => void;
  activePageId: string;
  setActivePageId: (id: string) => void;
  activePage: Page;
  addPage: (name: string, slug: string) => string;
  deletePage: (id: string) => void;
  updatePage: (id: string, patch: Partial<Pick<Page, "name" | "slug" | "hideNavbar" | "hideFooter">>) => void;
  sections: Section[];
  update: (id: string, patch: Partial<Section>) => void;
  add: (type: SectionType, index?: number) => string;
  remove: (id: string) => void;
  move: (id: string, dir: -1 | 1) => void;
  moveTo: (id: string, pos: "top" | "bottom") => void;
  duplicate: (id: string) => void;
  updateNavbar: (patch: Partial<NavbarConfig>) => void;
  updateFooter: (patch: Partial<FooterConfig>) => void;
  paymentConfig: PaymentConfig;
  updatePaymentConfig: (patch: Partial<PaymentConfig>) => void;
  referrals: import("./data").ReferralSettings;
  updateReferrals: (patch: Partial<import("./data").ReferralSettings>) => void;
  designTokens: DesignTokens;
  updateDesignTokens: (patch: Partial<DesignTokens>) => void;
  templates: Template[];
  activeTemplateId: string;
  getTemplate: (id: string) => Template | undefined;
  applyTemplate: (id: string) => void;
  saveAsTemplate: (name: string) => string;
  duplicateTemplate: (id: string) => string;
  deleteTemplate: (id: string) => void;
  renameTemplate: (id: string, name: string) => void;
  patchTemplate: (id: string, patch: Partial<Template>) => void;
  newTemplate: (name: string, factory?: (name: string) => Template) => string;
  newBlankTemplate: (name: string) => string;
  launchTemplate: (id: string, username?: string) => void;
  deactivateTemplate: (id: string) => void;
  savedSections: SavedSection[];
  saveSection: (name: string, section: CustomSection) => void;
  updateSavedSection: (id: string, patch: Partial<SavedSection>) => void;
  renameSavedSection: (id: string, name: string) => void;
  duplicateSavedSection: (id: string) => void;
  deleteSavedSection: (id: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: () => void;
  exportJson: () => string;
  importJson: (raw: string) => boolean;
  hydrated: boolean;
};

const StoreCtx = createContext<StorefrontContextValue | null>(null);
const DesignCtx = createContext<DesignTokens>(defaultDesignTokens);

export const useDesignTokens = () => useContext(DesignCtx);

export function useStorefront() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStorefront must be used within StorefrontProvider");
  return c;
}

export function useLinkOptions() {
  const { pages } = useStorefront();
  const opts: { label: string; value: string }[] = [];
  for (const p of pages) {
    if (p.slug.includes(":")) continue;
    opts.push({ label: `Page · ${p.name}`, value: getPageUrl(p.slug) });
  }
  for (const p of products) opts.push({ label: `Product · ${p.name}`, value: `/product/${p.slug}` });
  return opts;
}

export const LINK_OPTIONS: { label: string; value: string }[] = [
  { label: "Home", value: "/" },
  { label: "Shop", value: "/shop" },
  { label: "About", value: "/about" },
  ...products.map((p) => ({ label: `Product · ${p.name}`, value: `/product/${p.slug}` })),
];

/* ─── Import helpers ────────────────────────────────────────────────────────── */

/** Walk a section tree and assign fresh ids to every section, block, and nested item. */
function reIdSections(sections: Section[]): Section[] {
  return sections.map((s) => {
    const sec = { ...s, id: uid() } as Section;
    if (sec.type === "custom" && Array.isArray((sec as any).blocks)) {
      (sec as any).blocks = reIdBlocks((sec as any).blocks);
    }
    return sec;
  });
}

export function reIdBlocks(blocks: CustomBlock[]): CustomBlock[] {
  return blocks.map((b) => {
    const nb: any = { ...b, id: uid() };
    if (Array.isArray(nb.children)) nb.children = reIdBlocks(nb.children);
    if (Array.isArray(nb.cols)) nb.cols = nb.cols.map((col: any[]) => reIdBlocks(col));
    if (Array.isArray(nb.fields)) nb.fields = nb.fields.map((f: any) => ({ ...f, id: uid() }));
    if (Array.isArray(nb.items)) nb.items = nb.items.map((it: any) => (it && typeof it === "object" && "id" in it ? { ...it, id: uid() } : it));
    return nb as CustomBlock;
  });
}

export function StorefrontProvider({ children }: { children: ReactNode }) {
  const initial = makeInitial();
  const [state, setStateInternal] = useState<Persisted>(initial);
  // Ref mirrors state so undo/redo can read current value synchronously
  const stateRef = useRef<Persisted>(initial);
  const setState = useCallback((updater: Persisted | ((s: Persisted) => Persisted)) => {
    setStateInternal((s) => {
      const next = typeof updater === "function" ? updater(s) : updater;
      stateRef.current = next;
      return next;
    });
  }, []);
  const [activePageId, setActivePageIdState] = useState(initial.templates[0].pages[0]?.id ?? "");
  const [hydrated, setHydrated] = useState(false);
  const historyRef = useRef<Persisted[]>([]);
  const futureRef = useRef<Persisted[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  // Debounce: don't flood history with rapid text-field keystrokes
  const lastHistoryTimeRef = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STOREFRONT_STORAGE_KEY);
        if (raw) {
          const obj = JSON.parse(raw) as Persisted;
          if (obj?.templates?.length) {
            const migrated = migratePersistedState(obj);
            setState(migrated);
            const t =
              migrated.templates.find((x) => x.id === migrated.activeTemplateId) ??
              migrated.templates[0];
            setActivePageIdState(t.pages[0]?.id ?? "");
          }
        }
      } catch {
        /* keep defaults */
      }
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STOREFRONT_STORAGE_KEY, JSON.stringify(stateRef.current)).catch(() => {});
  }, [state, hydrated]);

  // Silent DB sync: when the active template is launched, push JSON 2 s after last change
  const lastSyncedJsonRef = useRef<string>("");
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    const activeTpl = state.templates.find((t) => t.id === state.activeTemplateId);
    if (!activeTpl?.launched) return;
    const json = JSON.stringify(activeTpl);
    if (json === lastSyncedJsonRef.current) return; // no real change
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      lastSyncedJsonRef.current = json;
      templatesApi.update(activeTpl.id, { settings: { templateJson: json } }).catch(() => {});
    }, 2000);
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [state, hydrated]);


  const active = state.templates.find((t) => t.id === state.activeTemplateId) ?? state.templates[0];
  const activePage = active.pages.find((p) => p.id === activePageId) ?? active.pages[0];

  const recordHistory = useCallback((prev: Persisted) => {
    const now = Date.now();
    // Debounce: rapid keystrokes (< 400ms apart) only create one history entry.
    // The first change in a burst captures the "before" state; subsequent ones skip.
    if (now - lastHistoryTimeRef.current < 400) return;
    lastHistoryTimeRef.current = now;
    historyRef.current = [...historyRef.current.slice(-29), prev];
    futureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const mutateActive = useCallback(
    (fn: (t: Template) => Template) => {
      setState((s) => {
        recordHistory(s);
        return {
          ...s,
          templates: s.templates.map((t) => (t.id === s.activeTemplateId ? fn(t) : t)),
        };
      });
    },
    [recordHistory],
  );

  const mutatePage = useCallback(
    (fn: (p: Page) => Page) => {
      mutateActive((t) => ({
        ...t,
        pages: t.pages.map((p) => (p.id === activePage.id ? fn(p) : p)),
      }));
    },
    [mutateActive, activePage.id],
  );

  const patchTemplateById = useCallback((id: string, patch: Partial<Template>) => {
    setState((s) => ({
      ...s,
      templates: s.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  }, []);

  const value = useMemo<StorefrontContextValue>(() => {
    const undo = () => {
      const prev = historyRef.current[historyRef.current.length - 1];
      if (!prev) return;
      // Push current state to future before overwriting
      futureRef.current = [stateRef.current, ...futureRef.current.slice(0, 29)];
      historyRef.current = historyRef.current.slice(0, -1);
      // Reset debounce timer so the next edit after undo records a fresh history entry
      lastHistoryTimeRef.current = 0;
      // Batch all state updates together — single render
      setState(prev);
      setCanUndo(historyRef.current.length > 0);
      setCanRedo(true);
    };

    const redo = () => {
      const next = futureRef.current[0];
      if (!next) return;
      historyRef.current = [...historyRef.current.slice(-29), stateRef.current];
      futureRef.current = futureRef.current.slice(1);
      lastHistoryTimeRef.current = 0;
      setState(next);
      setCanUndo(true);
      setCanRedo(futureRef.current.length > 0);
    };

    return {
      pages: active.pages,
      navbar: active.navbar,
      footer: active.footer,
      theme: active.theme ?? state.theme,
      setTheme: (t) => setState((s) => ({
        ...s,
        theme: t,
        templates: s.templates.map((tpl) =>
          tpl.id === s.activeTemplateId ? { ...tpl, theme: t } : tpl
        ),
      })),
      activePageId: activePage.id,
      setActivePageId: setActivePageIdState,
      activePage,
      hydrated,

      addPage: (name, slug) => {
        const id = uid();
        const raw = slug.trim() || name.trim().toLowerCase().replace(/\s+/g, "-");
        const normSlug = raw === "/" ? "/" : raw.startsWith("/") ? raw : `/${raw}`;
        mutateActive((t) => ({
          ...t,
          pages: [...t.pages, { id, name, slug: normSlug, sections: [] }],
          navbar: { ...t.navbar, links: [...t.navbar.links, { label: name, href: normSlug }] },
        }));
        setActivePageIdState(id);
        return id;
      },
      deletePage: (id) => {
        mutateActive((t) => {
          const target = t.pages.find((p) => p.id === id);
          if (!target || t.pages.length <= 1) return t;
          return { ...t, pages: t.pages.filter((p) => p.id !== id) };
        });
        if (activePageId === id) {
          setActivePageIdState(active.pages.find((p) => p.id !== id)?.id ?? "");
        }
      },
      updatePage: (id, patch) =>
        mutateActive((t) => ({
          ...t,
          pages: t.pages.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),

      sections: activePage.sections,
      update: (id, patch) =>
        mutatePage((p) => ({
          ...p,
          sections: p.sections.map((s) => (s.id === id ? ({ ...s, ...patch } as Section) : s)),
        })),
      add: (type, index) => {
        const sec = createDefaultSection(type);
        mutatePage((p) => {
          const next = [...p.sections];
          next.splice(index ?? next.length, 0, sec);
          return { ...p, sections: next };
        });
        return sec.id;
      },
      remove: (id) => mutatePage((p) => ({ ...p, sections: p.sections.filter((s) => s.id !== id) })),
      move: (id, dir) =>
        mutatePage((p) => {
          const i = p.sections.findIndex((s) => s.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= p.sections.length) return p;
          const next = [...p.sections];
          [next[i], next[j]] = [next[j], next[i]];
          return { ...p, sections: next };
        }),
      moveTo: (id, pos) =>
        mutatePage((p) => {
          const i = p.sections.findIndex((s) => s.id === id);
          if (i < 0) return p;
          const next = [...p.sections];
          const [item] = next.splice(i, 1);
          if (pos === "top") next.unshift(item);
          else next.push(item);
          return { ...p, sections: next };
        }),
      duplicate: (id) =>
        mutatePage((p) => {
          const i = p.sections.findIndex((s) => s.id === id);
          if (i < 0) return p;
          const copy = { ...p.sections[i], id: uid() } as Section;
          const next = [...p.sections];
          next.splice(i + 1, 0, copy);
          return { ...p, sections: next };
        }),

      updateNavbar: (patch) => mutateActive((t) => ({ ...t, navbar: { ...t.navbar, ...patch } })),
      updateFooter: (patch) => mutateActive((t) => ({ ...t, footer: { ...t.footer, ...patch } })),
      paymentConfig: active.paymentConfig ?? defaultPaymentConfig,
      updatePaymentConfig: (patch) =>
        mutateActive((t) => ({
          ...t,
          paymentConfig: { ...(t.paymentConfig ?? defaultPaymentConfig), ...patch },
        })),
      referrals: active.referrals ?? { enabled: false },
      updateReferrals: (patch) =>
        mutateActive((t) => ({
          ...t,
          referrals: { ...(t.referrals ?? { enabled: false }), ...patch },
        })),
      designTokens: active.designTokens ?? defaultDesignTokens,
      updateDesignTokens: (patch) =>
        mutateActive((t) => ({
          ...t,
          designTokens: { ...(t.designTokens ?? defaultDesignTokens), ...patch },
        })),

      templates: state.templates,
      activeTemplateId: state.activeTemplateId,
      getTemplate: (id) => state.templates.find((t) => t.id === id),
      applyTemplate: (id) => {
        setState((s) => {
          const t = s.templates.find((x) => x.id === id);
          if (t) setActivePageIdState(t.pages[0]?.id ?? "");
          return { ...s, activeTemplateId: id };
        });
      },
      saveAsTemplate: (name) => {
        const copy: Template = {
          ...active,
          id: uid(),
          name,
          pages: JSON.parse(JSON.stringify(active.pages)),
        };
        setState((s) => ({ ...s, templates: [...s.templates, copy] }));
        return copy.id;
      },
      duplicateTemplate: (id) => {
        const src = state.templates.find((t) => t.id === id);
        if (!src) return "";
        const copy: Template = JSON.parse(JSON.stringify(src));
        copy.id = uid();
        copy.name = `${src.name} copy`;
        setState((s) => ({ ...s, templates: [...s.templates, copy] }));
        return copy.id;
      },
      deleteTemplate: (id) => {
        setState((s) => {
          if (s.templates.length <= 1) return s;
          const templates = s.templates.filter((t) => t.id !== id);
          const activeTemplateId = s.activeTemplateId === id ? templates[0].id : s.activeTemplateId;
          return { ...s, templates, activeTemplateId };
        });
      },
      renameTemplate: (id, name) => patchTemplateById(id, { name }),
      patchTemplate: patchTemplateById,
      newTemplate: (name, factory) => {
        const t = (factory ?? createBlankTemplate)(name);
        setState((s) => ({ ...s, templates: [...s.templates, t], activeTemplateId: t.id }));
        setActivePageIdState(t.pages[0].id);
        return t.id;
      },
      newBlankTemplate: (name) => {
        const t = createEmptyTemplate(name);
        setState((s) => ({ ...s, templates: [...s.templates, t], activeTemplateId: t.id }));
        setActivePageIdState(t.pages[0].id);
        return t.id;
      },
      launchTemplate: (id, username) => {
        const slug = (username ?? "shop").toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9_]/g, "");
        const launchUrl = `https://kiosk.store/@${slug}`;
        setState((s) => ({
          ...s,
          templates: s.templates.map((t) =>
            t.id === id
              ? { ...t, launched: true, launchUrl }
              : { ...t, launched: false },
          ),
        }));
        // Sync the full template JSON into the backend `settings` column before activating
        const tpl = state.templates.find((t) => t.id === id);
        const publish = tpl
          ? templatesApi.update(id, { settings: { templateJson: JSON.stringify(tpl) } })
          : Promise.resolve();
        publish
          .catch(() => {})
          .finally(() => {
            templatesApi.activate(id, slug).catch(() => {});
          });
      },
      deactivateTemplate: (id) => {
        patchTemplateById(id, { launched: false });
        templatesApi.deactivate(id).catch(() => {});
      },

      savedSections: state.savedSections ?? [],
      saveSection: (name, section) => {
        const copy = JSON.parse(JSON.stringify(section)) as CustomSection;
        copy.id = uid();
        copy.blocks = reIdBlocks(copy.blocks ?? []);
        const entry: SavedSection = {
          id: uid(),
          name,
          section: copy,
          updatedAt: new Date().toISOString(),
        };
        setState((s) => ({ ...s, savedSections: [...(s.savedSections ?? []), entry] }));
      },
      updateSavedSection: (id, patch) =>
        setState((s) => ({
          ...s,
          savedSections: (s.savedSections ?? []).map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      renameSavedSection: (id, name) =>
        setState((s) => ({
          ...s,
          savedSections: (s.savedSections ?? []).map((x) =>
            x.id === id ? { ...x, name, updatedAt: new Date().toISOString() } : x
          ),
        })),
      duplicateSavedSection: (id) =>
        setState((s) => {
          const src = (s.savedSections ?? []).find((x) => x.id === id);
          if (!src) return s;
          const copy: SavedSection = JSON.parse(JSON.stringify(src));
          copy.id = uid();
          copy.name = `${src.name} copy`;
          copy.section.id = uid();
          copy.section.blocks = reIdBlocks(copy.section.blocks ?? []);
          return { ...s, savedSections: [...(s.savedSections ?? []), copy] };
        }),
      deleteSavedSection: (id) =>
        setState((s) => ({
          ...s,
          savedSections: (s.savedSections ?? []).filter((x) => x.id !== id),
        })),

      undo,
      redo,
      canUndo,
      canRedo,
      reset: () => {
        historyRef.current = [];
        futureRef.current = [];
        setCanUndo(false);
        setCanRedo(false);
        setState((s) => ({
          ...s,
          templates: s.templates.map((t) =>
            t.id === s.activeTemplateId
              ? {
                  ...t,
                  pages: defaultPages(),
                  navbar: { ...defaultNavbar },
                  footer: { ...defaultFooter },
                }
              : t,
          ),
        }));
      },
      exportJson: () => JSON.stringify({ version: CURRENT_MV, ...state }, null, 2),
      importJson: (raw) => {
        try {
          const obj = JSON.parse(raw);
          if (!obj || typeof obj !== "object") return false;
          historyRef.current = [];
          futureRef.current = [];
          setCanUndo(false);
          setCanRedo(false);

          // 1) Full store export { version, templates, activeTemplateId, theme }
          if (Array.isArray(obj.templates) && obj.templates.length) {
            const migrated = migratePersistedState({
              templates: obj.templates,
              activeTemplateId: obj.activeTemplateId ?? obj.templates[0].id,
              theme: obj.theme ?? "light",
              savedSections: Array.isArray(obj.savedSections) ? obj.savedSections : [],
              _mv: obj._mv ?? 0,
            });
            setState(migrated);
            setActivePageIdState(migrated.templates[0].pages[0]?.id ?? "");
            return true;
          }

          // 2) A whole Template — { pages, navbar, footer, theme, ... }
          if (Array.isArray(obj.pages)) {
            const newPages: Page[] = obj.pages.map((p: any) => ({
              id: uid(),
              name: p.name ?? "Untitled",
              slug: getPageUrl(p.slug ?? "/"),
              hideNavbar: p.hideNavbar,
              hideFooter: p.hideFooter,
              sections: Array.isArray(p.sections) ? reIdSections(p.sections) : [],
            }));
            mutateActive((t) => ({
              ...t,
              pages: newPages,
              navbar: obj.navbar ? { ...defaultNavbar, ...obj.navbar } : t.navbar,
              footer: obj.footer ? { ...defaultFooter, ...obj.footer } : t.footer,
              theme: obj.theme ?? t.theme,
              designTokens: obj.designTokens ? { ...defaultDesignTokens, ...obj.designTokens } : t.designTokens,
              paymentConfig: obj.paymentConfig ? { ...defaultPaymentConfig, ...obj.paymentConfig } : t.paymentConfig,
              referrals: obj.referrals ? { enabled: true, ...obj.referrals } : t.referrals,
            }));
            setActivePageIdState(newPages[0]?.id ?? "");
            return true;
          }

          // 3) Sections — { sections: [...] }, a bare array, or a single section object
          const isSingleSection =
            typeof obj.type === "string" &&
            obj.type in SECTION_LABELS &&
            !Array.isArray(obj.sections) &&
            !Array.isArray(obj);
          const sectionList: Section[] = Array.isArray(obj.sections)
            ? obj.sections
            : Array.isArray(obj)
              ? obj
              : isSingleSection
                ? [obj]
                : [];
          if (sectionList.length && sectionList.every((s: any) => s && typeof s === "object" && s.type)) {
            const imported = reIdSections(sectionList);
            mutatePage((p) => ({
              ...p,
              sections: isSingleSection ? [...p.sections, ...imported] : imported,
            }));
            return true;
          }

          return false;
        } catch {
          return false;
        }
      },
    };
  }, [
    active,
    activePage,
    activePageId,
    canRedo,
    canUndo,
    hydrated,
    mutateActive,
    mutatePage,
    patchTemplateById,
    state,
  ]);

  return (
    <StoreCtx.Provider value={value}>
      <DesignCtx.Provider value={active.designTokens ?? defaultDesignTokens}>
        {children}
      </DesignCtx.Provider>
    </StoreCtx.Provider>
  );
}
