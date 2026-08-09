import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

const KEY = "kiosk_dark_mode";

let globalIsDark: boolean | null = null;
const listeners = new Set<(v: boolean) => void>();

function notify(val: boolean) {
  globalIsDark = val;
  listeners.forEach((fn) => fn(val));
}

export function useColorSchemeStore() {
  const system = useColorScheme();
  const [isDark, setIsDark] = useState<boolean>(globalIsDark ?? system === "dark");

  useEffect(() => {
    if (globalIsDark === null) {
      AsyncStorage.getItem(KEY).then((val) => {
        const resolved = val !== null ? val === "true" : system === "dark";
        notify(resolved);
      });
    }

    const handler = (v: boolean) => setIsDark(v);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, [system]);

  const toggleDark = useCallback(() => {
    const next = !isDark;
    notify(next);
    AsyncStorage.setItem(KEY, String(next));
  }, [isDark]);

  return { isDark, toggleDark };
}
