import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

const KEY = "kiosk_haptics_enabled";

let globalEnabled: boolean | null = null;
const listeners = new Set<(v: boolean) => void>();

function notify(val: boolean) {
  globalEnabled = val;
  listeners.forEach((fn) => fn(val));
}

export function hapticImpact(style = Haptics.ImpactFeedbackStyle.Light) {
  if (globalEnabled !== false && Platform.OS !== "web") {
    Haptics.impactAsync(style);
  }
}

export function hapticNotification(type = Haptics.NotificationFeedbackType.Success) {
  if (globalEnabled !== false && Platform.OS !== "web") {
    Haptics.notificationAsync(type);
  }
}

export function useHapticsStore() {
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(globalEnabled ?? true);

  useEffect(() => {
    if (globalEnabled === null) {
      AsyncStorage.getItem(KEY).then((val) => {
        notify(val !== null ? val === "true" : true);
      });
    }
    const handler = (v: boolean) => setHapticsEnabled(v);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  const toggleHaptics = useCallback(() => {
    const next = !hapticsEnabled;
    notify(next);
    AsyncStorage.setItem(KEY, String(next));
  }, [hapticsEnabled]);

  return { hapticsEnabled, toggleHaptics };
}
