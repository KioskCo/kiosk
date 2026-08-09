import type { Padding, Section, SectionBase, Theme } from "@/lib/storefront";
import { SELF_PADDED_TYPES } from "./editor-constants";

export const PADDING_PX: Record<Padding, number> = {
  none: 0,
  sm: 12,
  md: 24,
  lg: 40,
};

export function sectionPadding(s: SectionBase): { paddingTop: number; paddingBottom: number; paddingHorizontal: number } {
  const preset = PADDING_PX[s.padding ?? "md"];
  return {
    paddingTop: s.paddingTopPx ?? preset,
    paddingBottom: s.paddingBottomPx ?? preset,
    paddingHorizontal: s.paddingXPx ?? 16,
  };
}

const THEME_PALETTES: Record<Theme, {
  bg: string; mutedBg: string; primaryBg: string;
  fg: string; heading: string; accent: string;
}> = {
  light:  { bg: "#ffffff",  mutedBg: "#f4f4f5",  primaryBg: "#f0f0f0",  fg: "#171717",  heading: "#0a0a0a",  accent: "#171717" },
  dark:   { bg: "#111111",  mutedBg: "#1c1c1c",  primaryBg: "#1a1a2e",  fg: "#e8e8e8",  heading: "#f5f5f5",  accent: "#7c6af7" },
  matte:  { bg: "#0d0d0d",  mutedBg: "#141414",  primaryBg: "#1a1a1a",  fg: "#d4d4d4",  heading: "#ffffff",  accent: "#e84545" },
  glass:  { bg: "#0f1117",  mutedBg: "#161b27",  primaryBg: "#1e1a3a",  fg: "#dde4f0",  heading: "#ffffff",  accent: "#7c6af7" },
};

export function sectionColors(s: SectionBase, theme: Theme) {
  const pal = THEME_PALETTES[theme] ?? THEME_PALETTES.light;
  return {
    backgroundColor:
      s.bgColor ??
      (s.background === "primary"
        ? pal.primaryBg
        : s.background === "muted"
          ? pal.mutedBg
          : pal.bg),
    color: s.textColor ?? pal.fg,
    headingColor: s.headingColor ?? s.textColor ?? pal.heading,
    accent: s.accentColor ?? pal.accent,
  };
}

export function sectionCount(template: { pages: { sections: Section[] }[] }) {
  return template.pages.reduce((n, p) => n + p.sections.length, 0);
}

function shadowStyle(s: SectionBase): Record<string, unknown> | undefined {
  const sh = s.shadow;
  if (!sh) return undefined;
  const map: Record<string, { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number }> = {
    sm: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
    md: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
    lg: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 16, elevation: 8 },
    xl: { shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 12 },
  };
  return map[sh];
}

export function sectionWrapperStyle(section: SectionBase, theme: Theme) {
  const pad = sectionPadding(section);
  const colors = sectionColors(section, theme);
  const selfPadded = SELF_PADDED_TYPES.has((section as unknown as Section).type);

  const style: Record<string, unknown> = {
    backgroundColor: section.bgColor ?? colors.backgroundColor,
    opacity: (section.sectionOpacity ?? 100) / 100,
    borderRadius: section.borderRadius,
    borderTopWidth: section.borderTop ? 1 : 0,
    borderBottomWidth: section.borderBottom ? 1 : 0,
    borderColor: section.borderColor ?? "transparent",
    marginTop: section.marginTopPx,
    marginBottom: section.marginBottomPx,
    minHeight: section.minHeight,
    overflow: section.borderRadius ? "hidden" : undefined,
  };

  if (!selfPadded) {
    style.paddingTop = pad.paddingTop;
    style.paddingBottom = pad.paddingBottom;
    // Use independent left/right if either is explicitly set; otherwise use symmetric paddingHorizontal
    if (section.paddingLeftPx !== undefined || section.paddingRightPx !== undefined) {
      style.paddingLeft = section.paddingLeftPx ?? pad.paddingHorizontal;
      style.paddingRight = section.paddingRightPx ?? pad.paddingHorizontal;
    } else {
      style.paddingHorizontal = pad.paddingHorizontal;
    }
  } else {
    // Self-padded sections handle internal layout themselves — only apply explicit px overrides
    if (section.paddingTopPx !== undefined) style.paddingTop = section.paddingTopPx;
    if (section.paddingBottomPx !== undefined) style.paddingBottom = section.paddingBottomPx;
    if (section.paddingLeftPx !== undefined) style.paddingLeft = section.paddingLeftPx;
    if (section.paddingRightPx !== undefined) style.paddingRight = section.paddingRightPx;
  }

  const shadow = shadowStyle(section);
  if (shadow) Object.assign(style, shadow);

  return { style, colors, pad, selfPadded };
}
