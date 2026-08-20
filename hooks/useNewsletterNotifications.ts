/**
 * useNewsletterNotifications
 *
 * Mirrors useEscrowNotifications: watches for new newsletter subscribers and
 * adds them to the in-app notification centre (which plays the "notify" sound —
 * see AppContext's addNotification). Checks on mount and whenever the app
 * returns to the foreground, same cadence as AppContext's own data refresh.
 *
 * Newsletter subscribers aren't part of AppContext's global state (the list can
 * get large and is only otherwise needed on the Customers screen), so this hook
 * does its own lightweight fetch rather than piggybacking on loadApiData.
 *
 * A persisted "seen" set (AsyncStorage) means a fresh app install doesn't replay
 * every existing subscriber as a "new" notification — only signups that happen
 * after the set is first seeded ever fire one.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef } from "react";
import { AppState as RNAppState } from "react-native";

import { useApp } from "@/context/AppContext";
import { customersApi } from "@/lib/api";

const SEEN_KEY = "kiosk_newsletter_seen_ids";

export function useNewsletterNotifications() {
  const { addNotification, isAuthenticated } = useApp();
  const seenRef = useRef<Set<string> | null>(null);
  const checkingRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    const check = async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      try {
        const res = await customersApi.getNewsletter() as any;
        const list = (res?.data ?? res) as Array<{ id: string; email: string; name: string | null }>;
        if (!Array.isArray(list)) return;

        if (seenRef.current === null) {
          // First check this session — load what was already seen, or (first
          // run ever) seed with everyone currently subscribed so existing
          // subscribers don't all fire as "new" the moment this ships.
          const raw = await AsyncStorage.getItem(SEEN_KEY).catch(() => null);
          seenRef.current = raw ? new Set(JSON.parse(raw)) : new Set(list.map((s) => s.id));
          await AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...seenRef.current])).catch(() => {});
          return;
        }

        const newOnes = list.filter((s) => !seenRef.current!.has(s.id));
        if (newOnes.length === 0) return;

        newOnes.forEach((s) => {
          seenRef.current!.add(s.id);
          addNotification({
            type: "newsletter",
            sound: "notify",
            title: "New newsletter signup 📬",
            body: s.name ? `${s.name} (${s.email}) just joined your newsletter.` : `${s.email} just joined your newsletter.`,
            actionScreen: "/customers",
          });
        });
        await AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...seenRef.current])).catch(() => {});
      } catch {
        // Offline or request failed — just try again on the next foreground/interval tick.
      } finally {
        checkingRef.current = false;
      }
    };

    check();
    const sub = RNAppState.addEventListener("change", (next) => { if (next === "active") check(); });
    // Also poll every 2 minutes while the app is open and foregrounded — the
    // AppState listener alone only fires on background→foreground transitions.
    const interval = setInterval(check, 120_000);
    return () => { sub.remove(); clearInterval(interval); };
  }, [isAuthenticated, addNotification]);
}
