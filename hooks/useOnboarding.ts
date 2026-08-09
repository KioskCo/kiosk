import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const KEY = "kiosk_onboarding_done";

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((val) => {
      if (!val) setShowOnboarding(true);
      setChecked(true);
    });
  }, []);

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(KEY, "1");
    setShowOnboarding(false);
  }, []);

  return { showOnboarding: checked && showOnboarding, completeOnboarding };
}
