import React from "react";
import { View } from "react-native";

import type { Template } from "@/lib/storefront";

export function DefaultThumbnail({ template, height = 140 }: { template: Template; height?: number }) {
  const hero = template.pages[0]?.sections.find((s) => s.type === "hero") as { bgColor?: string } | undefined;
  const accent = template.pages[0]?.sections.find((s) => s.type === "announcement") as { bgColor?: string } | undefined;
  const heroBg = hero?.bgColor ?? "#2c2c2c";
  const accentBg = accent?.bgColor ?? heroBg;
  const isDark = template.theme !== "light";
  const pageBg = isDark ? "#0f0f0f" : "#f8f6f2";

  return (
    <View style={{ height, backgroundColor: pageBg, overflow: "hidden" }}>
      <View style={{ height: 10, backgroundColor: accentBg }} />
      <View style={{ height: height * 0.45, backgroundColor: heroBg, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 80, height: 8, backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 4, marginBottom: 6 }} />
        <View style={{ width: 100, height: 6, backgroundColor: "rgba(255,255,255,0.4)", borderRadius: 3 }} />
      </View>
      <View style={{ flexDirection: "row", gap: 6, padding: 8 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, gap: 4 }}>
            <View style={{ aspectRatio: 1, backgroundColor: isDark ? "#2a2a2a" : "#e5e1d8", borderRadius: 4 }} />
            <View style={{ height: 4, width: "75%", backgroundColor: isDark ? "#333" : "#ccc", borderRadius: 2 }} />
          </View>
        ))}
      </View>
    </View>
  );
}
