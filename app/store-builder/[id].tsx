import { useLocalSearchParams } from "expo-router";
import React from "react";

import { StoreEditor } from "@/components/storefront/StoreEditor";

export default function StoreBuilderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <StoreEditor templateId={id} />;
}
